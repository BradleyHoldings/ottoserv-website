import "server-only";

import { appendFile, mkdir, readFile, readdir, rename, stat, writeFile } from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { hermesApprovals, HermesRiskLevel } from "@/lib/hermesCommandCenter";
import { formatTimestamp, HERMES_SAFE_EXPORT_DIR } from "@/lib/hermesReadOnlyAdapter";
import { readServiceDeliveryExecution } from "@/lib/revenueEngineReadAdapter.mjs";

export const HERMES_APPROVAL_OUTBOX_DIR = "/home/clawuser/hermes_safe_action_outbox/approval_decisions";
export const HERMES_APPROVAL_AUDIT_LOG = "/home/clawuser/hermes_safe_action_outbox/audit_log.jsonl";

const QUEUE_FILE = path.join(HERMES_SAFE_EXPORT_DIR, "jonathan_approval_queue.md");
const INTAKE_STATUS_FILE = path.join(HERMES_SAFE_EXPORT_DIR, "approval_intake_status.json");
const EXECUTION_STATUS_FILE = path.join(HERMES_SAFE_EXPORT_DIR, "approval_execution_status.json");
const ROUTING_STATUS_FILE = path.join(HERMES_SAFE_EXPORT_DIR, "approval_task_routing_status.json");
const DECISION_SCHEMA_VERSION = "1.0";
const DECISIONS = ["approved", "rejected", "revision_requested"] as const;
const MAX_NOTE_LENGTH = 1200;

export type HermesApprovalDecisionValue = (typeof DECISIONS)[number];
export type HermesDecisionStatus = "pending" | "approved" | "rejected" | "revision_requested";

export interface HermesApprovalItem {
  id: string;
  requestedAction: string;
  reason: string;
  riskLevel: HermesRiskLevel;
  unlocks: string;
  approvalType: "one_time" | "recurring_policy";
  source: "safe_approval_queue" | "phase_1_fixture" | "phase6b_service_delivery";
  importedAt: string | null;
}

export interface HermesApprovalDecisionRecord {
  decision_id: string;
  source: "ottoserv_os_dashboard";
  approval_item_id: string;
  decision: HermesApprovalDecisionValue;
  decided_by: string;
  decided_at: string;
  reason_or_note: string;
  requested_revision?: string;
  original_requested_action: string;
  risk_level: HermesRiskLevel;
  what_approval_unlocks: string;
  one_time_or_recurring: "one_time" | "recurring_policy";
  dashboard_route: "/os/hermes/approvals";
  schema_version: string;
  supersedes_decision_id?: string;
}

export interface ApprovalItemWithDecision {
  item: HermesApprovalItem;
  decision: HermesApprovalDecisionRecord | null;
  intakeResult: HermesApprovalIntakeResult | null;
  executionLifecycle: HermesApprovalExecutionLifecycle | null;
  routingRecord: HermesApprovalRoutingRecord | null;
  status: HermesDecisionStatus;
}

export interface HermesApprovalIntakeResult {
  intake_id: string;
  source_decision_id: string;
  approval_item_id: string;
  decision: HermesApprovalDecisionValue;
  decided_by: string;
  decided_at: string;
  intake_status: "consumed";
  policy_gate_status: "policy_allowed" | "policy_requires_additional_review" | "policy_denied" | "policy_unknown";
  allowed_next_action: string;
  required_evidence: string[];
  consumed_at: string;
  schema_version: string;
}

export interface HermesApprovalEvidenceRecord {
  evidence_id: string;
  related_approval_item_id: string;
  related_intake_id: string;
  related_task_id: string;
  submitted_by_agent: string;
  evidence_type: string;
  evidence_summary: string;
  evidence_reference: string;
  submitted_at: string;
  redaction_status: string;
  review_status: "not_reviewed" | "accepted" | "needs_revision" | "rejected";
  ingested_at: string;
  schema_version: string;
}

export interface HermesApprovalExecutionLifecycle {
  approval_item_id: string;
  intake_id: string;
  source_decision_id: string;
  decision: HermesApprovalDecisionValue;
  policy_gate_status: "policy_allowed" | "policy_requires_additional_review" | "policy_denied" | "policy_unknown";
  execution_status:
    | "not_started"
    | "queued"
    | "assigned"
    | "in_progress"
    | "waiting_for_evidence"
    | "evidence_submitted"
    | "hermes_reviewing"
    | "completed"
    | "blocked"
    | "failed"
    | "cancelled";
  execution_rail: "codex" | "cowork" | "morgan" | "n8n" | "email" | "stripe" | "crm" | "manual_review" | "none" | "unknown";
  assigned_agent: string;
  assigned_task_id: string;
  required_evidence: string[];
  submitted_evidence: HermesApprovalEvidenceRecord[];
  evidence_status: "not_required" | "required" | "submitted" | "accepted" | "rejected" | "missing";
  hermes_review_result: "not_reviewed" | "accepted" | "needs_revision" | "rejected";
  blocker_reason: string;
  last_status_update_at: string | null;
  next_action: string;
  schema_version: string;
}

export interface HermesApprovalRoutingRecord {
  task_id: string;
  source: "hermes_approval_routing";
  related_approval_item_id: string;
  related_intake_id: string;
  decision_id: string;
  execution_rail: "codex" | "cowork" | "morgan" | "manual_review";
  assigned_agent: string;
  mission_title: string;
  business_objective: string;
  requested_action: string;
  allowed_scope: string;
  forbidden_actions: string[];
  required_evidence: string[];
  success_criteria: string[];
  risk_level: HermesRiskLevel;
  priority: "low" | "medium" | "high" | "critical";
  created_at: string;
  status: "queued" | "assigned" | "in_progress" | "complete" | "blocked" | "superseded";
  route_status?: string;
  schema_version: string;
}

export interface ApprovalActionState {
  status: "idle" | "decision_written" | "write_failed";
  message: string;
}

export async function getApprovalItemsWithDecisions(): Promise<ApprovalItemWithDecision[]> {
  const [items, decisions, intakeResults, executionLifecycle, routingRecords] = await Promise.all([
    getTraceableApprovalItems(),
    readApprovalDecisions(),
    readApprovalIntakeResults(),
    readApprovalExecutionLifecycle(),
    readApprovalRoutingRecords(),
  ]);
  const latestByApproval = new Map<string, HermesApprovalDecisionRecord>();
  const latestIntakeByDecision = new Map<string, HermesApprovalIntakeResult>();
  const latestLifecycleByIntake = new Map<string, HermesApprovalExecutionLifecycle>();
  const latestLifecycleByApproval = new Map<string, HermesApprovalExecutionLifecycle>();
  const latestRouteByIntake = new Map<string, HermesApprovalRoutingRecord>();
  const latestRouteByApproval = new Map<string, HermesApprovalRoutingRecord>();

  for (const decision of decisions) {
    const existing = latestByApproval.get(decision.approval_item_id);
    if (!existing || decision.decided_at > existing.decided_at) {
      latestByApproval.set(decision.approval_item_id, decision);
    }
  }

  for (const result of intakeResults) {
    const existing = latestIntakeByDecision.get(result.source_decision_id);
    if (!existing || result.consumed_at > existing.consumed_at) {
      latestIntakeByDecision.set(result.source_decision_id, result);
    }
  }

  for (const lifecycle of executionLifecycle) {
    const existingByIntake = latestLifecycleByIntake.get(lifecycle.intake_id);
    if (!existingByIntake || (lifecycle.last_status_update_at || "") > (existingByIntake.last_status_update_at || "")) {
      latestLifecycleByIntake.set(lifecycle.intake_id, lifecycle);
    }

    const existingByApproval = latestLifecycleByApproval.get(lifecycle.approval_item_id);
    if (!existingByApproval || (lifecycle.last_status_update_at || "") > (existingByApproval.last_status_update_at || "")) {
      latestLifecycleByApproval.set(lifecycle.approval_item_id, lifecycle);
    }
  }

  for (const route of routingRecords) {
    const existingByIntake = latestRouteByIntake.get(route.related_intake_id);
    if (!existingByIntake || route.created_at > existingByIntake.created_at) {
      latestRouteByIntake.set(route.related_intake_id, route);
    }

    const existingByApproval = latestRouteByApproval.get(route.related_approval_item_id);
    if (!existingByApproval || route.created_at > existingByApproval.created_at) {
      latestRouteByApproval.set(route.related_approval_item_id, route);
    }
  }

  return items.map((item) => {
    const decision = latestByApproval.get(item.id) || null;
    const intakeResult = decision ? latestIntakeByDecision.get(decision.decision_id) || null : null;

    return {
      item,
      decision,
      intakeResult,
      executionLifecycle: intakeResult ? latestLifecycleByIntake.get(intakeResult.intake_id) || null : latestLifecycleByApproval.get(item.id) || null,
      routingRecord: intakeResult ? latestRouteByIntake.get(intakeResult.intake_id) || null : latestRouteByApproval.get(item.id) || null,
      status: decision?.decision || "pending",
    };
  });
}

export async function writeApprovalDecision(formData: FormData): Promise<ApprovalActionState> {
  try {
    const admin = await requireDashboardAdmin();
    const approvalItemId = getFormValue(formData, "approval_item_id");
    const decision = getFormValue(formData, "decision") as HermesApprovalDecisionValue;
    const note = sanitizePlainText(getFormValue(formData, "reason_or_note"));
    const requestedRevision = sanitizePlainText(getFormValue(formData, "requested_revision"));
    const supersedeDecisionId = sanitizeDecisionId(getFormValue(formData, "supersede_decision_id"));
    const supersedePrior = getFormValue(formData, "supersede_prior") === "yes";

    if (!DECISIONS.includes(decision)) {
      return failed("Decision must be approved, rejected, or revision_requested.");
    }

    if (decision === "revision_requested" && !requestedRevision) {
      return failed("Requested revision text is required for revision requests.");
    }

    const approvalItems = await getTraceableApprovalItems();
    const approvalItem = approvalItems.find((item) => item.id === approvalItemId);
    if (!approvalItem) {
      return failed("Approval item is not traceable to the current safe approval queue or imported fixtures.");
    }

    const existingDecision = (await readApprovalDecisions())
      .filter((record) => record.approval_item_id === approvalItemId)
      .sort((a, b) => b.decided_at.localeCompare(a.decided_at))[0];

    if (existingDecision && !supersedePrior) {
      return failed("A decision already exists for this approval item. Mark the new decision as superseding the prior decision to write another one.");
    }

    if (supersedePrior && existingDecision && supersedeDecisionId !== existingDecision.decision_id) {
      return failed("Supersede request did not match the latest decision ID.");
    }

    const record: HermesApprovalDecisionRecord = {
      decision_id: createDecisionId(approvalItem.id),
      source: "ottoserv_os_dashboard",
      approval_item_id: approvalItem.id,
      decision,
      decided_by: admin.email,
      decided_at: new Date().toISOString(),
      reason_or_note: note || defaultNoteForDecision(decision),
      ...(decision === "revision_requested" ? { requested_revision: requestedRevision } : {}),
      original_requested_action: sanitizeImportedText(approvalItem.requestedAction),
      risk_level: approvalItem.riskLevel,
      what_approval_unlocks: sanitizeImportedText(approvalItem.unlocks),
      one_time_or_recurring: approvalItem.approvalType,
      dashboard_route: "/os/hermes/approvals",
      schema_version: DECISION_SCHEMA_VERSION,
      ...(supersedePrior && existingDecision ? { supersedes_decision_id: existingDecision.decision_id } : {}),
    };

    const transport = await writeDecisionRecord(record);
    if (transport === "local") {
      await appendAuditLog(record);
    }

    return {
      status: "decision_written",
      message: `Decision written for ${approvalItem.id}: ${record.decision.replace(/_/g, " ")}.`,
    };
  } catch (error) {
    return failed(error instanceof Error ? error.message : "Decision write failed.");
  }
}

async function getTraceableApprovalItems(): Promise<HermesApprovalItem[]> {
  const [importedItems, serviceDeliveryExecution] = await Promise.all([
    readSafeApprovalQueueItems(),
    readServiceDeliveryExecution(),
  ]);
  const fixtureItems: HermesApprovalItem[] = hermesApprovals.map((approval) => ({
    id: approval.id,
    requestedAction: sanitizeImportedText(approval.requestedAction),
    reason: sanitizeImportedText(approval.reason),
    riskLevel: approval.riskLevel,
    unlocks: sanitizeImportedText(approval.unlocks),
    approvalType: approval.approvalType,
    source: "phase_1_fixture",
    importedAt: null,
  }));
  const serviceDeliveryItems: HermesApprovalItem[] = (serviceDeliveryExecution.approval_cards || []).map((card: {
    id: string;
    requestedAction?: string;
    reason?: string;
    riskLevel?: string;
    unlocks?: string;
    approvalType?: "one_time" | "recurring_policy";
    created_at?: string;
    payload?: { expected_execution_result?: string; risk_reason?: string };
  }) => ({
    id: sanitizeImportedText(card.id),
    requestedAction: sanitizeImportedText(card.requestedAction || "Approve service delivery work order"),
    reason: sanitizeImportedText(card.reason || card.payload?.risk_reason || "Service delivery work order requires approval."),
    riskLevel: normalizeRiskLevel(card.riskLevel || "high"),
    unlocks: sanitizeImportedText(card.unlocks || card.payload?.expected_execution_result || "Hermes can route the service delivery work after approval."),
    approvalType: card.approvalType || "one_time",
    source: "phase6b_service_delivery",
    importedAt: card.created_at || serviceDeliveryExecution.source?.lastModified || null,
  }));

  const byId = new Map<string, HermesApprovalItem>();
  for (const item of [...fixtureItems, ...importedItems, ...serviceDeliveryItems]) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}

async function readSafeApprovalQueueItems(): Promise<HermesApprovalItem[]> {
  try {
    const [raw, fileStat] = await Promise.all([readFile(QUEUE_FILE, "utf8"), stat(QUEUE_FILE)]);
    const rows = raw
      .split(/\r?\n/)
      .filter((line) => line.startsWith("|") && !line.includes("---"))
      .slice(1);

    return rows
      .map(parseApprovalTableRow)
      .filter((item): item is HermesApprovalItem => Boolean(item))
      .map((item) => ({
        ...item,
        importedAt: fileStat.mtime.toISOString(),
      }));
  } catch {
    return [];
  }
}

function parseApprovalTableRow(row: string): HermesApprovalItem | null {
  const cells = row
    .split("|")
    .slice(1, -1)
    .map((cell) => sanitizeImportedText(cell));

  const [id, system, severity, , revenueImpact, recommendedFix, approvalRequired, verification] = cells;
  if (!id || approvalRequired?.toLowerCase() !== "yes") return null;

  return {
    id,
    requestedAction: recommendedFix || `Review ${system}`,
    reason: `${system || "Hermes approval"}: ${revenueImpact || "Approval requested by Hermes."}`,
    riskLevel: normalizeRiskLevel(severity),
    unlocks: verification || recommendedFix || "Hermes can proceed only within approved policy.",
    approvalType: "one_time",
    source: "safe_approval_queue",
    importedAt: null,
  };
}

async function readApprovalDecisions(): Promise<HermesApprovalDecisionRecord[]> {
  const remoteDecisions = await readRemoteApprovalDecisions();
  if (remoteDecisions) return remoteDecisions;

  try {
    const names = await readdir(HERMES_APPROVAL_OUTBOX_DIR);
    const decisions = await Promise.all(
      names
        .filter((name) => name.endsWith(".json") && !name.startsWith("."))
        .map(async (name) => {
          try {
            const parsed = JSON.parse(await readFile(path.join(HERMES_APPROVAL_OUTBOX_DIR, name), "utf8")) as HermesApprovalDecisionRecord;
            return isDecisionRecord(parsed) ? parsed : null;
          } catch {
            return null;
          }
        }),
    );

    return decisions.filter((decision): decision is HermesApprovalDecisionRecord => Boolean(decision));
  } catch {
    return [];
  }
}

async function readRemoteApprovalDecisions(): Promise<HermesApprovalDecisionRecord[] | null> {
  const url = process.env.HERMES_APPROVAL_API_URL;
  const apiKey = process.env.HERMES_APPROVAL_API_KEY;
  if (!url || !apiKey) return null;

  try {
    const response = await fetch(url, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const parsed = (await response.json()) as { decisions?: unknown[] };
    return (parsed.decisions || []).filter(isDecisionRecord);
  } catch {
    return null;
  }
}

async function readApprovalIntakeResults(): Promise<HermesApprovalIntakeResult[]> {
  const remote = await readRemoteSafeExportJson("approval_intake_status.json") as {
    latest_results?: HermesApprovalIntakeResult[];
    processed_this_run?: HermesApprovalIntakeResult[];
  } | null;
  if (remote) {
    return [...(remote.latest_results || []), ...(remote.processed_this_run || [])].filter(isIntakeResult);
  }

  try {
    const parsed = JSON.parse(await readFile(INTAKE_STATUS_FILE, "utf8")) as {
      latest_results?: HermesApprovalIntakeResult[];
      processed_this_run?: HermesApprovalIntakeResult[];
    };
    return [...(parsed.latest_results || []), ...(parsed.processed_this_run || [])].filter(isIntakeResult);
  } catch {
    return [];
  }
}

export async function readApprovalExecutionLifecycle(): Promise<HermesApprovalExecutionLifecycle[]> {
  const remote = await readRemoteSafeExportJson("approval_execution_status.json") as {
    latest_lifecycle?: HermesApprovalExecutionLifecycle[];
  } | null;
  if (remote) {
    return (remote.latest_lifecycle || []).filter(isExecutionLifecycle);
  }

  try {
    const parsed = JSON.parse(await readFile(EXECUTION_STATUS_FILE, "utf8")) as {
      latest_lifecycle?: HermesApprovalExecutionLifecycle[];
    };
    return (parsed.latest_lifecycle || []).filter(isExecutionLifecycle);
  } catch {
    return [];
  }
}

export async function readApprovalRoutingRecords(): Promise<HermesApprovalRoutingRecord[]> {
  const remote = await readRemoteSafeExportJson("approval_task_routing_status.json") as {
    latest_routes?: HermesApprovalRoutingRecord[];
    routed_this_run?: HermesApprovalRoutingRecord[];
  } | null;
  if (remote) {
    return [...(remote.latest_routes || []), ...(remote.routed_this_run || [])].filter(isRoutingRecord);
  }

  try {
    const parsed = JSON.parse(await readFile(ROUTING_STATUS_FILE, "utf8")) as {
      latest_routes?: HermesApprovalRoutingRecord[];
      routed_this_run?: HermesApprovalRoutingRecord[];
    };
    return [...(parsed.latest_routes || []), ...(parsed.routed_this_run || [])].filter(isRoutingRecord);
  } catch {
    return [];
  }
}

interface RemoteSafeExportResponse {
  files?: Array<{
    file_name: string;
    status: "available" | "missing";
    content?: string;
  }>;
}

let remoteSafeExportPromise: Promise<RemoteSafeExportResponse | null> | null = null;

async function readRemoteSafeExportJson(fileName: string): Promise<unknown | null> {
  const apiKey = process.env.HERMES_APPROVAL_API_KEY;
  const url = process.env.HERMES_SAFE_EXPORT_API_URL || process.env.HERMES_APPROVAL_API_URL?.replace(/\/approval-decisions$/, "/safe-export");
  if (!apiKey || !url) return null;

  if (!remoteSafeExportPromise) {
    remoteSafeExportPromise = fetch(url, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as RemoteSafeExportResponse;
      })
      .catch(() => null);
  }

  const exportPayload = await remoteSafeExportPromise;
  const file = exportPayload?.files?.find((item) => item.file_name === fileName && item.status === "available");
  if (!file?.content) return null;

  try {
    return JSON.parse(file.content);
  } catch {
    return null;
  }
}

async function writeDecisionRecord(record: HermesApprovalDecisionRecord): Promise<"local" | "remote"> {
  const remoteResult = await writeRemoteDecision(record);
  if (remoteResult === "written") return "remote";

  await atomicWriteDecision(record);
  return "local";
}

async function writeRemoteDecision(record: HermesApprovalDecisionRecord): Promise<"written" | "unavailable"> {
  const url = process.env.HERMES_APPROVAL_API_URL;
  const apiKey = process.env.HERMES_APPROVAL_API_KEY;
  if (!url || !apiKey) return "unavailable";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(record),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(`Approval bridge write failed (${response.status}): ${body.detail || "safe queue rejected the decision"}. Safe queue: ${HERMES_APPROVAL_OUTBOX_DIR}`);
  }

  return "written";
}

async function atomicWriteDecision(record: HermesApprovalDecisionRecord) {
  await mkdir(HERMES_APPROVAL_OUTBOX_DIR, { recursive: true });
  const destination = path.join(HERMES_APPROVAL_OUTBOX_DIR, `${record.decision_id}.json`);
  const tempPath = path.join(HERMES_APPROVAL_OUTBOX_DIR, `.${record.decision_id}.tmp`);
  const serialized = `${JSON.stringify(record, null, 2)}\n`;

  JSON.parse(serialized);
  await writeFile(tempPath, serialized, { encoding: "utf8", mode: 0o640, flag: "wx" });
  await rename(tempPath, destination);
}

async function appendAuditLog(record: HermesApprovalDecisionRecord) {
  await mkdir(path.dirname(HERMES_APPROVAL_AUDIT_LOG), { recursive: true });
  const auditEntry = {
    event: "approval_decision_written",
    decision_id: record.decision_id,
    approval_item_id: record.approval_item_id,
    decision: record.decision,
    decided_by: record.decided_by,
    decided_at: record.decided_at,
    dashboard_route: record.dashboard_route,
    schema_version: record.schema_version,
  };

  await appendFile(HERMES_APPROVAL_AUDIT_LOG, `${JSON.stringify(auditEntry)}\n`, { encoding: "utf8", mode: 0o640 });
}

async function requireDashboardAdmin(): Promise<{ email: string; name: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ottoserv_token")?.value;
  const userRaw = cookieStore.get("ottoserv_current_user")?.value;

  if (token !== "super_admin_token" || !userRaw) {
    throw new Error("Admin session cookie is required to write approval decisions.");
  }

  const user = JSON.parse(userRaw) as { email?: string; name?: string; role?: string; isOttoServEmployee?: boolean };
  if (user.role !== "super_admin" || user.isOttoServEmployee !== true || !user.email) {
    throw new Error("Only OttoServ super admin users can write approval decisions.");
  }

  return {
    email: sanitizePlainText(user.email),
    name: sanitizePlainText(user.name || user.email),
  };
}

function sanitizePlainText(value: string): string {
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NOTE_LENGTH);

  if (/[<>]/.test(normalized)) {
    throw new Error("Notes must be plain text only.");
  }

  if (containsSecretLikeMaterial(normalized)) {
    throw new Error("Notes cannot include secrets, env vars, raw credentials, or sensitive token material.");
  }

  return normalized
    .replace(/\/home\/hermes-agent\/workspace\/[^\s`)]+/g, "[Hermes workspace path]")
    .replace(/\b[A-Z][A-Z0-9_]{7,}\b/g, "[redacted env var]");
}

function sanitizeImportedText(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NOTE_LENGTH)
    .replace(/[<>]/g, "")
    .replace(/\/home\/hermes-agent\/workspace\/[^\s`)]+/g, "[Hermes workspace path]")
    .replace(/\b[A-Z][A-Z0-9_]{7,}\b/g, "[redacted env var]")
    .replace(/\b(sk|pk|rk|whsec|xox[baprs])-?[A-Za-z0-9_=-]{12,}\b/gi, "[redacted credential]")
    .replace(/(access_token|refresh_token|client_secret|api_key|authorization|bearer)(["'=:\s]+)[^\s,)}]+/gi, "$1$2[redacted]")
    .replace(/https?:\/\/[^\s)]+(?:token|key|secret|signature|code)=[^\s)]+/gi, "[redacted URL]");
}

function containsSecretLikeMaterial(value: string): boolean {
  return (
    /\b[A-Z][A-Z0-9_]{7,}\b/.test(value) ||
    /\b(sk|pk|rk|whsec|xox[baprs])-?[A-Za-z0-9_=-]{12,}\b/i.test(value) ||
    /(access_token|refresh_token|client_secret|api_key|authorization|bearer)\s*[:=]/i.test(value) ||
    /https?:\/\/[^\s)]+(?:token|key|secret|signature|code)=/i.test(value)
  );
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function sanitizeDecisionId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 140);
}

function createDecisionId(approvalItemId: string): string {
  const safeId = sanitizeDecisionId(approvalItemId).toLowerCase();
  const stamp = new Date().toISOString().replace(/[-:.]/g, "").replace("T", "t").replace("Z", "z");
  return `decision_${safeId}_${stamp}`;
}

function defaultNoteForDecision(decision: HermesApprovalDecisionValue): string {
  if (decision === "approved") return "Approved from OttoServ OS dashboard. Execution remains delegated to Hermes policy intake.";
  if (decision === "rejected") return "Rejected from OttoServ OS dashboard.";
  return "Revision requested from OttoServ OS dashboard.";
}

function failed(message: string): ApprovalActionState {
  return {
    status: "write_failed",
    message,
  };
}

function normalizeRiskLevel(value: string): HermesRiskLevel {
  const normalized = value.toLowerCase();
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
}

function isDecisionRecord(value: HermesApprovalDecisionRecord): boolean {
  return (
    typeof value?.decision_id === "string" &&
    value.source === "ottoserv_os_dashboard" &&
    typeof value.approval_item_id === "string" &&
    DECISIONS.includes(value.decision) &&
    typeof value.decided_by === "string" &&
    typeof value.decided_at === "string" &&
    value.dashboard_route === "/os/hermes/approvals" &&
    value.schema_version === DECISION_SCHEMA_VERSION
  );
}

function isIntakeResult(value: HermesApprovalIntakeResult): boolean {
  return (
    typeof value?.intake_id === "string" &&
    typeof value.source_decision_id === "string" &&
    typeof value.approval_item_id === "string" &&
    DECISIONS.includes(value.decision) &&
    value.intake_status === "consumed" &&
    typeof value.policy_gate_status === "string" &&
    typeof value.consumed_at === "string"
  );
}

function isExecutionLifecycle(value: HermesApprovalExecutionLifecycle): boolean {
  return (
    typeof value?.approval_item_id === "string" &&
    typeof value.intake_id === "string" &&
    typeof value.source_decision_id === "string" &&
    DECISIONS.includes(value.decision) &&
    typeof value.policy_gate_status === "string" &&
    typeof value.execution_status === "string" &&
    typeof value.execution_rail === "string" &&
    typeof value.assigned_agent === "string" &&
    typeof value.assigned_task_id === "string" &&
    Array.isArray(value.required_evidence) &&
    Array.isArray(value.submitted_evidence) &&
    typeof value.evidence_status === "string" &&
    typeof value.hermes_review_result === "string" &&
    typeof value.next_action === "string"
  );
}

function isRoutingRecord(value: HermesApprovalRoutingRecord): boolean {
  return (
    typeof value?.task_id === "string" &&
    value.source === "hermes_approval_routing" &&
    typeof value.related_approval_item_id === "string" &&
    typeof value.related_intake_id === "string" &&
    typeof value.decision_id === "string" &&
    typeof value.execution_rail === "string" &&
    typeof value.assigned_agent === "string" &&
    typeof value.mission_title === "string" &&
    typeof value.business_objective === "string" &&
    typeof value.requested_action === "string" &&
    Array.isArray(value.forbidden_actions) &&
    Array.isArray(value.required_evidence) &&
    Array.isArray(value.success_criteria) &&
    typeof value.created_at === "string" &&
    typeof value.status === "string"
  );
}

export function intakeStatusLabel(result: HermesApprovalIntakeResult | null) {
  if (!result) return "Awaiting Hermes intake";
  return `${result.intake_status.replace(/_/g, " ")} · ${result.policy_gate_status.replace(/_/g, " ")}`;
}

export function decisionStatusLabel(status: HermesDecisionStatus) {
  if (status === "revision_requested") return "revision requested";
  return status;
}

export function decisionTimestampLabel(decision: HermesApprovalDecisionRecord | null) {
  return decision ? formatTimestamp(decision.decided_at) : "No decision yet";
}

export function lifecycleStatusLabel(lifecycle: HermesApprovalExecutionLifecycle | null) {
  if (!lifecycle) return "Awaiting execution lifecycle export";
  return `${lifecycle.execution_status.replace(/_/g, " ")} / ${lifecycle.evidence_status.replace(/_/g, " ")}`;
}

export function routingStatusLabel(route: HermesApprovalRoutingRecord | null) {
  if (!route) return "Not routed yet";
  return `${route.status.replace(/_/g, " ")} / ${route.execution_rail.replace(/_/g, " ")}`;
}
