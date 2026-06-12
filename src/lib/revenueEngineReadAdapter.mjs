// ─── Revenue engine read adapter (OS Dashboard / Hermes consumption) ──────────
//
// WHY THIS EXISTS
// The autonomous revenue loop (`scripts/revenue-daily-loop.mjs`) writes two
// source-of-truth files into `data/revenue-engine/`:
//   - latest.json                    → the most recent daily loop run
//   - implementation-work-orders.json → durable leak-check → implementation orders
//
// The existing OS Dashboard `/os/hermes/*` pages are server components that read
// server-side adapters directly (see `hermesReadOnlyAdapter`). This adapter
// follows that exact pattern: a READ-ONLY server-side reader that surfaces the
// new files to the dashboard. It performs NO writes and exposes NO actions, so
// every high-risk step stays approval-gated by construction — the dashboard can
// only display state.
//
// Security: implementation work orders carry client contact data (name, email,
// phone). This adapter REDACTS personal contact fields by default before the UI
// sees them, keeping only the business/operational fields Hermes needs to act.
// The business name (`client`) is retained as the operational subject; personal
// PII is masked.

import { promises as fs } from "node:fs";
import path from "node:path";

import { readRevenueState, REVENUE_STATE_TABLE } from "./revenueEngineSupabaseStore.mjs";
import { readLiveServiceDeliveryStatus } from "./serviceDeliveryPersistence.mjs";
import {
  buildVoiceServiceStatusRollup,
  generateVoiceSetupPacketsFromWorkOrders,
} from "./retellVoiceServiceAutomation.mjs";
import { buildFirstClientVoiceActivationStatuses } from "./retellFirstClientActivationPlaybook.mjs";

// Durable fallback used when no local file exists (e.g. Vercel's read-only fs).
// Returns { data, lastModified, available, source } or a not-available marker.
async function readRevenueStateFallback() {
  const result = await readRevenueState();
  if (!result || !result.document) return { data: null, lastModified: null, available: false };
  return {
    data: result.document,
    lastModified: result.document.generated_at || result.updated_at || null,
    available: true,
    source: `supabase:${REVENUE_STATE_TABLE}`,
  };
}

export function resolveRevenueEngineDir(options = {}) {
  if (options.dataDir) return options.dataDir;
  if (process.env.REVENUE_LOOP_OUTPUT_DIR) return process.env.REVENUE_LOOP_OUTPUT_DIR;
  const cwd = options.cwd || process.cwd();
  return path.join(cwd, "data", "revenue-engine");
}

async function readJsonWithMeta(filePath) {
  try {
    const [raw, stat] = await Promise.all([fs.readFile(filePath, "utf8"), fs.stat(filePath)]);
    return { data: JSON.parse(raw), lastModified: stat.mtime.toISOString(), available: true };
  } catch {
    return { data: null, lastModified: null, available: false };
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value ?? "").trim();
}

function emptyVoiceServiceStatus() {
  return {
    summary: { total: 0, approval_needed: 0, launch_ready: 0, active: 0 },
    items: [],
    packets: [],
  };
}

function emptyFirstClientVoiceActivation() {
  return {
    summary: { total: 0, production_launch_ready: 0, blocked: 0, needs_approval: 0 },
    items: [],
  };
}

function voiceStatusFromWorkOrders(workOrders = []) {
  const packets = generateVoiceSetupPacketsFromWorkOrders(workOrders);
  return { ...buildVoiceServiceStatusRollup(packets), packets };
}

function voiceStatusFromDeliverySummaries(summaries = []) {
  const workOrders = asArray(summaries).map((summary) => ({
    id: clean(summary.work_order_id),
    client: clean(summary.client),
    service_key: clean(summary.service_key),
    implementation: {
      monitoring_metrics: asArray(summary.monitoring_metrics),
      upsell_paths: asArray(summary.upsell_paths),
    },
  }));
  return voiceStatusFromWorkOrders(workOrders);
}

// ─── Autonomous revenue loop status (from latest.json) ────────────────────────

export async function readAutonomousRevenueState(options = {}) {
  const dir = resolveRevenueEngineDir(options);
  const file = path.join(dir, "latest.json");
  let { data, lastModified, available } = await readJsonWithMeta(file);
  let sourceFile = file;

  // No local file (e.g. Vercel) → durable Supabase fallback.
  if (!available || !data) {
    const fallback = await readRevenueStateFallback();
    if (fallback.available) {
      ({ data, lastModified } = fallback);
      available = true;
      sourceFile = fallback.source;
    }
  }

  if (!available || !data) {
    return {
      available: false,
      source: { file, lastModified: null },
      status: "unknown",
      health: null,
      nextAction: "Run `npm run revenue:daily-loop` to generate the source-of-truth file.",
      brokenRails: [],
      repairPackets: [],
      revenueRisks: [],
      queueCounts: {},
    };
  }

  const plan = data.plan || {};
  const health = data.health || {};
  const repairPackets = asArray(data.repairPackets).map((packet) => ({
    id: clean(packet.id),
    owner: clean(packet.owner),
    category: clean(packet.category),
    what_failed: clean(packet.what_failed),
    expected_behavior: clean(packet.expected_behavior),
    actual_behavior: clean(packet.actual_behavior),
    verification_steps: asArray(packet.verification_steps),
    status: clean(packet.status) || "open",
  }));

  const repairCount = Number(health.repair_count || repairPackets.length || 0);
  const nextAction = repairCount
    ? "Repair broken rails before scaling volume."
    : "Run the daily queue and verify evidence.";

  return {
    available: true,
    source: { file: sourceFile, lastModified },
    generatedAt: clean(data.generated_at),
    planDate: clean(plan.run_date),
    schedule: clean(data.schedule || plan.schedule),
    status: clean(data.status) || "unknown",
    volumePolicy: clean(data.volume_policy),
    health: {
      status: clean(health.status) || "unknown",
      repair_count: repairCount,
      evidence_gap_count: Number(health.evidence_gap_count || 0),
      queue_counts: health.queue_counts || {},
      errors: asArray(health.errors),
    },
    nextAction,
    brokenRails: [
      ...asArray(plan.broken_execution_rails).map((rail) => ({ id: clean(rail), category: "execution rail", owner: "Codex", status: "open" })),
      ...repairPackets.map((packet) => ({ id: packet.id, category: packet.category, owner: packet.owner, status: packet.status })),
    ],
    repairPackets,
    revenueRisks: asArray(plan.revenue_risks).map(clean).filter(Boolean),
    queueCounts: health.queue_counts || {},
    leadSupplyDailyLoop: data.leadSupplyDailyLoop || null,
    publicLeadDiscovery: data.publicLeadDiscovery || null,
    durableRevenueExecutionQueue: data.durableRevenueExecutionQueue || null,
    controlledEmailExecution: data.controlledEmailExecution || null,
    multiAgentCommandState: data.multiAgentCommandState || null,
    taskOwnershipLedger: data.taskOwnershipLedger || null,
  };
}

// ─── Implementation work orders (redacted for UI) ─────────────────────────────

const CONTACT_FIELDS = ["contactName", "contactPhone", "contactEmail", "email", "phone"];

export function redactWorkOrder(workOrder = {}) {
  const safe = { ...workOrder };
  for (const field of CONTACT_FIELDS) {
    if (field in safe && clean(safe[field])) safe[field] = "[redacted]";
  }
  return {
    id: clean(safe.id),
    title: clean(safe.title),
    client: clean(safe.client), // business name retained as the operational subject
    status: clean(safe.status),
    priority: clean(safe.priority),
    engagement_type: clean(safe.engagement_type),
    implementation_stage: clean(safe.implementation_stage),
    recommended_actor: clean(safe.recommended_actor),
    risk_level: clean(safe.risk_level),
    next_action: clean(safe.next_action),
    main_leak: clean(safe.main_leak),
    report_url: clean(safe.report_url),
    approvalRequired: Boolean(safe.approvalRequired),
    approvalStatus: clean(safe.approvalStatus),
    automation_opportunities: asArray(safe.automation_opportunities),
    success_criteria: asArray(safe.success_criteria),
    required_evidence: asArray(safe.required_evidence),
    gated_actions: asArray(safe.gated_actions),
    contactName: safe.contactName,
    contactEmail: safe.contactEmail,
    contactPhone: safe.contactPhone,
    createdAt: clean(safe.createdAt),
    updatedAt: clean(safe.updatedAt),
  };
}

function summarize(workOrders) {
  const byStage = {};
  const byStatus = {};
  let needsApproval = 0;
  for (const wo of workOrders) {
    const stage = clean(wo.implementation_stage) || "unknown";
    const status = clean(wo.status) || "unknown";
    byStage[stage] = (byStage[stage] || 0) + 1;
    byStatus[status] = (byStatus[status] || 0) + 1;
    if (status === "needs_approval" || wo.approvalStatus === "pending") needsApproval += 1;
  }
  return { total: workOrders.length, needs_approval: needsApproval, by_stage: byStage, by_status: byStatus };
}

export async function readImplementationWorkOrders(options = {}) {
  const { redactContacts = true } = options;
  const dir = resolveRevenueEngineDir(options);
  const file = path.join(dir, "implementation-work-orders.json");
  let { data, lastModified, available } = await readJsonWithMeta(file);

  // Fallback 1: durable store missing → use the snapshot embedded in latest.json.
  if (!available) {
    const latest = await readJsonWithMeta(path.join(dir, "latest.json"));
    const embedded = asArray(latest.data?.implementationWorkOrders?.orders);
    if (embedded.length) {
      data = embedded;
      lastModified = latest.lastModified;
      available = true;
    }
  }

  // Fallback 2: no local files (e.g. Vercel) → durable Supabase document, which
  // embeds the same orders. Contact PII is still redacted below.
  if (!available) {
    const fallback = await readRevenueStateFallback();
    const orders = asArray(fallback.data?.implementationWorkOrders?.orders);
    if (fallback.available && orders.length) {
      data = orders;
      lastModified = fallback.lastModified;
      available = true;
    }
  }

  const rawOrders = asArray(Array.isArray(data) ? data : data?.orders);
  const workOrders = redactContacts ? rawOrders.map(redactWorkOrder) : rawOrders;

  return {
    available,
    contactRedacted: Boolean(redactContacts),
    source: { file, lastModified },
    summary: summarize(workOrders),
    workOrders,
  };
}

// ─── Combined read model for a single page call ───────────────────────────────

// ─── Approval → execution queue (read-only, evidence PII scrubbed) ────────────

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;

function scrubText(value) {
  return clean(value).replace(EMAIL_RE, "[redacted-email]").replace(PHONE_RE, "[redacted-phone]");
}

function redactExecutionItem(item = {}) {
  const lifecycle = item.lifecycle || {};
  const submitted = asArray(lifecycle.submitted_evidence).map((ev) => ({
    ...ev,
    evidence_summary: scrubText(ev.evidence_summary),
    evidence_reference: scrubText(ev.evidence_reference),
  }));
  return {
    taskPacket: item.taskPacket || null,
    lifecycle: { ...lifecycle, submitted_evidence: submitted },
  };
}

/**
 * Read the approval → execution queue from the loop document (local file, else
 * Supabase fallback for Vercel). Read-only; evidence text is PII-scrubbed.
 */
export async function readApprovalExecutionQueue(options = {}) {
  const dir = resolveRevenueEngineDir(options);
  let { data, lastModified, available } = await readJsonWithMeta(path.join(dir, "latest.json"));
  let sourceFile = path.join(dir, "latest.json");

  if (!available || !data) {
    const fallback = await readRevenueStateFallback();
    if (fallback.available) {
      data = fallback.data;
      lastModified = fallback.lastModified;
      available = true;
      sourceFile = fallback.source;
    }
  }

  const queue = data?.approvalExecutionQueue || {};
  const items = asArray(queue.items).map(redactExecutionItem);
  return {
    available: Boolean(available && data),
    source: { file: sourceFile, lastModified: lastModified || null },
    count: items.length,
    skipped_not_approved: Number(queue.skipped_not_approved || 0),
    items,
  };
}

export async function readServiceDeliveryExecution(options = {}) {
  const live = await readLiveServiceDeliveryStatus(options);
  if (live.available) {
    return {
      available: true,
      source: { file: "live_supabase", lastModified: null },
      summary: live.summary,
      approval_cards: asArray(live.approval_cards),
      execution_packets: asArray(live.execution_packets),
      delivery_status_summaries: asArray(live.delivery_status_summaries),
      voice_service_status: voiceStatusFromDeliverySummaries(live.delivery_status_summaries),
      first_client_voice_activation: buildFirstClientVoiceActivationStatuses([]),
    };
  }

  const dir = resolveRevenueEngineDir(options);
  let { data, lastModified, available } = await readJsonWithMeta(path.join(dir, "latest.json"));
  let sourceFile = path.join(dir, "latest.json");

  if (!available || !data) {
    const fallback = await readRevenueStateFallback();
    if (fallback.available) {
      data = fallback.data;
      lastModified = fallback.lastModified;
      available = true;
      sourceFile = fallback.source;
    }
  }

  const execution = data?.serviceDeliveryExecution || {};
  const voiceServiceStatus =
    execution.voice_service_status || voiceStatusFromWorkOrders(execution.workOrders || execution.work_orders);
  return {
    available: Boolean(available && execution.summary),
    source: { file: sourceFile, lastModified: lastModified || null },
    summary: execution.summary || {
      records_seen: 0,
      opportunities: { total: 0, persisted: 0 },
      work_orders: { total: 0, persisted: 0 },
      approvals: { pending: 0 },
      execution_packets: { queue_ready: 0 },
      delivery_packages: { recoverable: 0 },
    },
    approval_cards: asArray(execution.approval_cards),
    execution_packets: asArray(execution.execution_packets),
    delivery_status_summaries: asArray(execution.delivery_status_summaries),
    voice_service_status: voiceServiceStatus || emptyVoiceServiceStatus(),
    first_client_voice_activation: execution.first_client_voice_activation || emptyFirstClientVoiceActivation(),
  };
}

export async function readRevenueDashboardReadModel(options = {}) {
  const [revenue, implementation, approvalExecution, serviceDeliveryExecution] = await Promise.all([
    readAutonomousRevenueState(options),
    readImplementationWorkOrders(options),
    readApprovalExecutionQueue(options),
    readServiceDeliveryExecution(options),
  ]);
  return { revenue, implementation, approvalExecution, serviceDeliveryExecution, readOnly: true };
}
