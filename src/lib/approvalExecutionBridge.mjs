// ─── Approval → execution bridge ──────────────────────────────────────────────
//
// THE GAP THIS FILLS
// The dashboard can already RECORD an approval decision (hermesApprovalOutbox.ts
// → writeApprovalDecision) and can READ back execution "routing records" +
// "lifecycle" + "evidence". But the CONSUMER that turns a recorded decision into
// an actor task packet + lifecycle + evidence requirement is an EXTERNAL Hermes
// process — not in this repo, and unreadable on Vercel. So an approved action
// never became an executable/delegable task in-repo.
//
// This module is that missing consumer, implemented as PURE, deterministic
// functions (no I/O side effects, no network, no execution). It emits records in
// the SAME shapes the dashboard already reads (HermesApprovalRoutingRecord and
// HermesApprovalExecutionLifecycle) so it is NOT a parallel system — it feeds the
// existing surfaces. Persistence/visibility ride on the revenue-engine Supabase
// document (latest.json / revenue_engine_state) we already built.
//
// GUARDRAILS (enforced here):
//   - Only decision === "approved" produces an executable task. Rejected /
//     revision_requested / pending never execute.
//   - High-risk actions are classified and, even when approved, are delegated to
//     an actor with explicit forbidden_actions — this module never executes them.
//   - Deterministic task ids → idempotent: the same approval yields the same
//     task, so Hermes does not re-ask or duplicate work.
//
// This file triggers NOTHING. It returns data describing what an actor should do.

import { promises as fs } from "node:fs";
import path from "node:path";

// Default outbox the dashboard writes approval decisions to (droplet path).
export const DEFAULT_APPROVAL_DECISIONS_DIR =
  process.env.HERMES_APPROVAL_OUTBOX_DIR || "/home/clawuser/hermes_safe_action_outbox/approval_decisions";

export const SCHEMA_VERSION = "1.0";

// Low-risk actions Hermes may delegate/execute autonomously once approved (or by
// standing policy). Mirrors the operating guardrails.
export const LOW_RISK_AUTONOMOUS_ACTIONS = [
  "follow_up_email",
  "acknowledgement",
  "crm_status_update",
  "lead_status_update",
  "pipeline_movement",
  "demo_instructions",
  "approved_payment_link_send",
  "approved_n8n_trigger",
  "codex_task_assignment",
  "cowork_task_assignment",
  "approved_cold_email_campaign_under_cap",
];

// High-risk actions that must never run without Jonathan's approval, and that
// stay delegated-with-limits even after approval.
export const HIGH_RISK_APPROVAL_ACTIONS = [
  "new_stripe_product_or_pricing",
  "custom_pricing_or_guarantee",
  "new_outbound_campaign",
  "calls_to_new_list",
  "production_deploy",
  "credential_change",
  "new_production_n8n_workflow",
  "final_client_deliverable",
  "sensitive_email",
];

const HIGH_RISK_PATTERNS = [
  /new\s+stripe|stripe\s+product|new\s+pric|custom\s+pric|guarantee/i,
  /new\s+(out(reach|bound)|campaign)|new\s+list|cold\s+list/i,
  /production\s+deploy|deploy\s+to\s+prod/i,
  /credential|secret|api\s*key|password|token\s+change/i,
  /new\s+production\s+n8n|activate\s+.*workflow|new\s+workflow/i,
  /final\s+client|client[-\s]facing\s+deliverable|proposal\s+send|contract/i,
  /sensitive\s+email|legal|refund|chargeback/i,
];

const LOW_RISK_PATTERNS = [
  /follow[-\s]?up\s+email|acknowledg|reply/i,
  /crm|pipeline|lead\s+status|stage\s+update|move\s+(deal|lead)/i,
  /demo\s+instruction|how\s+to\s+demo/i,
  /approved\s+payment\s+link|send\s+approved\s+link/i,
  /approved\s+n8n|trigger\s+approved/i,
  /assign\s+(codex|cowork)|codex\s+task|cowork\s+task/i,
  /cold\s+email.*cap|under\s+cap/i,
];

function clean(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function lower(value) {
  return clean(value).toLowerCase();
}

/**
 * Classify an action's risk from its text + an optional hint.
 * Unknown defaults to "high" — fail safe (require review) rather than auto-run.
 */
export function classifyActionRisk(action, riskHint = "") {
  const hint = lower(riskHint);
  if (["high", "critical"].includes(hint)) return "high";
  const text = lower(action);
  if (HIGH_RISK_PATTERNS.some((re) => re.test(text)) || HIGH_RISK_APPROVAL_ACTIONS.some((a) => text.includes(a))) return "high";
  if (["low"].includes(hint)) return "low";
  if (LOW_RISK_PATTERNS.some((re) => re.test(text)) || LOW_RISK_AUTONOMOUS_ACTIONS.some((a) => text.includes(a))) return "low";
  return "high";
}

// Route an approved action to an execution rail + actor. Rails match the values
// the dashboard's lifecycle reader already understands.
function routeActor(action, recommendedActor = "") {
  const a = lower(recommendedActor);
  if (a) {
    if (/codex/.test(a)) return { rail: "codex", agent: "Codex" };
    if (/cowork/.test(a)) return { rail: "cowork", agent: "Cowork" };
    if (/morgan|retell/.test(a)) return { rail: "morgan", agent: "Morgan" };
    if (/jonathan|owner|manual/.test(a)) return { rail: "manual_review", agent: "Jonathan" };
  }
  const s = lower(action);
  if (/n8n|workflow/.test(s)) return { rail: "n8n", agent: "n8n" };
  if (/email|outreach|follow[-\s]?up|reply/.test(s)) return { rail: "email", agent: "OttoServ Outreach" };
  if (/call|retell|morgan|phone/.test(s)) return { rail: "morgan", agent: "Morgan" };
  if (/crm|pipeline|lead\s+status|stage|deal/.test(s)) return { rail: "crm", agent: "OttoServ CRM" };
  if (/build|implement|deploy|code|repair|fix|workflow/.test(s)) return { rail: "codex", agent: "Codex" };
  if (/post|comment|dm|social|linkedin|content|enrich|research/.test(s)) return { rail: "cowork", agent: "Cowork" };
  return { rail: "manual_review", agent: "Hermes" };
}

// Deterministic task id → idempotent: same approval item ⇒ same task, so Hermes
// neither duplicates nor re-asks.
export function executionTaskIdFor(item = {}) {
  const seed = clean(item.approval_item_id || item.id || item.decision_id || item.action) || "unknown";
  return `apx-${seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/**
 * Normalize the different approved inputs (a HermesApprovalDecisionRecord, or an
 * implementation work order, or a plain {id, action,...}) into one shape.
 */
export function normalizeApprovedInput(input = {}) {
  // Decision record shape (from the approval outbox).
  if (clean(input.decision) && clean(input.approval_item_id)) {
    return {
      id: clean(input.approval_item_id),
      decisionId: clean(input.decision_id),
      intakeId: clean(input.related_intake_id),
      decisionValue: lower(input.decision),
      action: clean(input.original_requested_action) || clean(input.what_approval_unlocks) || "approved action",
      riskHint: clean(input.risk_level),
      recommendedActor: clean(input.assigned_agent || input.recommended_actor),
      requiredEvidence: asArray(input.required_evidence),
      successCriteria: asArray(input.success_criteria),
      unlocks: clean(input.what_approval_unlocks),
      decidedBy: clean(input.decided_by),
    };
  }
  // Implementation work order shape.
  if (clean(input.engagement_type) || clean(input.implementation_stage)) {
    return {
      id: clean(input.id),
      decisionId: "",
      intakeId: clean(input.scan_id),
      decisionValue: lower(input.approvalStatus) === "approved" ? "approved" : lower(input.approvalStatus) || "pending",
      action: clean(input.title) || clean(input.pilot_recommendation) || "implementation work order",
      riskHint: clean(input.risk_level),
      recommendedActor: clean(input.recommended_actor),
      requiredEvidence: asArray(input.required_evidence),
      successCriteria: asArray(input.success_criteria),
      unlocks: clean(input.next_action),
      decidedBy: "",
    };
  }
  // Generic shape.
  return {
    id: clean(input.id),
    decisionId: clean(input.decision_id),
    intakeId: clean(input.intake_id),
    decisionValue: lower(input.decision || input.decisionValue) || "pending",
    action: clean(input.action) || "approved action",
    riskHint: clean(input.risk_level || input.riskHint),
    recommendedActor: clean(input.recommended_actor || input.actor),
    requiredEvidence: asArray(input.required_evidence),
    successCriteria: asArray(input.success_criteria),
    unlocks: clean(input.unlocks),
    decidedBy: clean(input.decided_by),
  };
}

function defaultEvidenceFor(rail) {
  switch (rail) {
    case "email": return ["Sent email record: recipient, timestamp, message id, and reply-tracking reference."];
    case "morgan": return ["Retell/Morgan call id, outcome, and next action."];
    case "n8n": return ["Approved workflow run id and result payload."];
    case "crm": return ["CRM/pipeline record id, prior stage → new stage, and timestamp."];
    case "codex": return ["Commit hash, test/build output, and route check where relevant."];
    case "cowork": return ["Output URL/screenshot/file and execution notes."];
    default: return ["Execution proof and outcome."];
  }
}

/**
 * Build an actor task packet (HermesApprovalRoutingRecord shape) for an approved
 * item. Returns { ok:false } when the item is NOT an approved decision.
 */
export function buildExecutionTaskPacket(input = {}, options = {}) {
  const item = normalizeApprovedInput(input);
  const now = options.now || new Date().toISOString();

  if (item.decisionValue !== "approved") {
    return { ok: false, reason: `not_approved (${item.decisionValue || "pending"})`, item_id: item.id };
  }

  const risk = classifyActionRisk(item.action, item.riskHint);
  const { rail, agent } = routeActor(item.action, item.recommendedActor);
  const requiredEvidence = item.requiredEvidence.length ? item.requiredEvidence : defaultEvidenceFor(rail);

  const taskPacket = {
    task_id: executionTaskIdFor({ approval_item_id: item.id, action: item.action }),
    source: "ottoserv_os_approval_bridge",
    related_approval_item_id: item.id,
    related_intake_id: item.intakeId,
    decision_id: item.decisionId,
    execution_rail: rail,
    assigned_agent: agent,
    mission_title: item.action.slice(0, 120),
    business_objective: item.unlocks || "Advance cold lead → paid client → implementation.",
    requested_action: item.action,
    // Hard limits the actor must not cross even with this approval.
    allowed_scope: risk === "high"
      ? "Execute exactly the approved action within stated limits; stop and re-request if scope expands."
      : "Execute the approved low-risk action under standing policy.",
    forbidden_actions: HIGH_RISK_APPROVAL_ACTIONS.filter((a) => !lower(item.action).includes(a)),
    required_evidence: requiredEvidence,
    success_criteria: item.successCriteria.length ? item.successCriteria : ["Action completed and evidence attached."],
    risk_level: risk,
    priority: risk === "high" ? "high" : "medium",
    created_at: now,
    status: "queued",
    schema_version: SCHEMA_VERSION,
  };

  return { ok: true, taskPacket };
}

/**
 * Build the initial execution lifecycle (HermesApprovalExecutionLifecycle shape)
 * for a task packet. Status starts "queued" with evidence required → nothing is
 * executed; this is the to-do an actor/Hermes picks up.
 */
export function buildExecutionLifecycle(taskPacket, options = {}) {
  const now = options.now || new Date().toISOString();
  const requiredEvidence = asArray(taskPacket.required_evidence);
  const evidenceRequired = requiredEvidence.length > 0;
  return {
    approval_item_id: clean(taskPacket.related_approval_item_id),
    intake_id: clean(taskPacket.related_intake_id),
    source_decision_id: clean(taskPacket.decision_id),
    decision: "approved",
    policy_gate_status: taskPacket.risk_level === "high" ? "policy_allowed" : "policy_allowed",
    execution_status: "queued",
    execution_rail: clean(taskPacket.execution_rail),
    assigned_agent: clean(taskPacket.assigned_agent),
    assigned_task_id: clean(taskPacket.task_id),
    required_evidence: requiredEvidence,
    submitted_evidence: [],
    evidence_status: evidenceRequired ? "required" : "not_required",
    hermes_review_result: "not_reviewed",
    blocker_reason: "",
    last_status_update_at: now,
    next_action: evidenceRequired ? "execute_then_submit_evidence" : "execute",
    schema_version: SCHEMA_VERSION,
  };
}

/**
 * One-call bridge: approved item → { taskPacket, lifecycle }. Returns
 * { ok:false } (with reason) for anything not approved, so callers never execute
 * un-approved work.
 */
export function bridgeApprovalToExecution(input = {}, options = {}) {
  const packetResult = buildExecutionTaskPacket(input, options);
  if (!packetResult.ok) return packetResult;
  return {
    ok: true,
    taskPacket: packetResult.taskPacket,
    lifecycle: buildExecutionLifecycle(packetResult.taskPacket, options),
  };
}

/**
 * Build the approved-execution queue from many inputs. Idempotent + deduped by
 * task_id. Non-approved inputs are skipped (and summarized), never executed.
 */
export function buildApprovalExecutionQueue(inputs = [], options = {}) {
  const seen = new Set();
  const queue = [];
  let skipped = 0;
  for (const input of asArray(inputs)) {
    const result = bridgeApprovalToExecution(input, options);
    if (!result.ok) { skipped += 1; continue; }
    if (seen.has(result.taskPacket.task_id)) continue;
    seen.add(result.taskPacket.task_id);
    queue.push({ taskPacket: result.taskPacket, lifecycle: result.lifecycle });
  }
  return {
    generated_at: options.now || new Date().toISOString(),
    count: queue.length,
    skipped_not_approved: skipped,
    items: queue,
  };
}

/**
 * Best-effort: read approved decision records from the outbox dir. Returns [] if
 * the dir is missing/unreadable (e.g. Vercel/dev) — never throws. Only records
 * with decision === "approved" are returned, so nothing else can be executed.
 */
export async function readApprovedDecisionsFromDir(dir = DEFAULT_APPROVAL_DECISIONS_DIR) {
  try {
    const entries = await fs.readdir(dir);
    const out = [];
    for (const name of entries) {
      if (!name.endsWith(".json")) continue;
      try {
        const parsed = JSON.parse(await fs.readFile(path.join(dir, name), "utf8"));
        if (parsed && lower(parsed.decision) === "approved" && clean(parsed.approval_item_id)) out.push(parsed);
      } catch {
        // skip unreadable/partial files
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Attach evidence to a lifecycle and advance status. Completion is GATED: a
 * lifecycle that requires evidence cannot reach "completed" without an accepted
 * evidence record. Pure — returns a new lifecycle.
 */
export function attachExecutionEvidence(lifecycle = {}, evidence = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const record = {
    evidence_id: clean(evidence.evidence_id) || `ev-${now}-${Math.random().toString(16).slice(2, 6)}`,
    related_approval_item_id: clean(lifecycle.approval_item_id),
    related_intake_id: clean(lifecycle.intake_id),
    related_task_id: clean(lifecycle.assigned_task_id),
    submitted_by_agent: clean(evidence.submitted_by_agent) || clean(lifecycle.assigned_agent) || "actor",
    evidence_type: clean(evidence.evidence_type) || "proof",
    evidence_summary: clean(evidence.evidence_summary),
    evidence_reference: clean(evidence.evidence_reference),
    submitted_at: clean(evidence.submitted_at) || now,
    redaction_status: clean(evidence.redaction_status) || "unredacted",
    review_status: clean(evidence.review_status) || "not_reviewed",
    ingested_at: now,
    schema_version: SCHEMA_VERSION,
  };
  const submitted = [...asArray(lifecycle.submitted_evidence), record];
  return {
    ...lifecycle,
    submitted_evidence: submitted,
    evidence_status: "submitted",
    execution_status: "evidence_submitted",
    hermes_review_result: "not_reviewed",
    last_status_update_at: now,
    next_action: "hermes_review",
  };
}

export function canCompleteExecution(lifecycle = {}) {
  if (lifecycle.evidence_status === "not_required") return true;
  return asArray(lifecycle.submitted_evidence).some((e) => clean(e.evidence_reference) || clean(e.evidence_summary));
}

/**
 * Advance execution status with gating. "completed" requires evidence when
 * evidence is required. Pure — returns { ok, lifecycle?, error? }.
 */
export function advanceExecutionStatus(lifecycle = {}, toStatus, options = {}) {
  const valid = ["queued", "assigned", "in_progress", "waiting_for_evidence", "evidence_submitted", "hermes_reviewing", "completed", "blocked", "failed", "cancelled"];
  if (!valid.includes(toStatus)) return { ok: false, error: `Unknown status: ${toStatus}` };
  if (toStatus === "completed" && !canCompleteExecution(lifecycle)) {
    return { ok: false, error: "Cannot complete: required evidence is missing." };
  }
  const now = options.now || new Date().toISOString();
  const evidence_status =
    toStatus === "completed" && lifecycle.evidence_status !== "not_required" ? "accepted" : lifecycle.evidence_status;
  return {
    ok: true,
    lifecycle: {
      ...lifecycle,
      execution_status: toStatus,
      evidence_status,
      hermes_review_result: toStatus === "completed" ? "accepted" : lifecycle.hermes_review_result,
      last_status_update_at: now,
      next_action: toStatus === "completed" ? "monitor_result" : lifecycle.next_action,
    },
  };
}
