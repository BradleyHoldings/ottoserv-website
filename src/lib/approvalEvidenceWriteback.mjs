// ─── Approval evidence write-back + safe status-update adapter ────────────────
//
// THE GAP THIS FILLS
// The approval → execution queue is already built, persisted into the revenue
// document (latest.json + Supabase via revenueLoopRunner), and read back with
// evidence PII scrubbed (revenueEngineReadAdapter). The PURE lifecycle primitives
// also exist (approvalExecutionBridge: attachExecutionEvidence,
// canCompleteExecution, advanceExecutionStatus). What was MISSING is the
// write-back that closes the loop:
//
//   actor executes approved task → submits evidence → evidence attaches to the
//   matching lifecycle → status advances ONLY when required evidence is present →
//   updated document persists → Hermes reads the new state and the next action.
//
// This module is that write-back, implemented as PURE, deterministic functions
// that COMPOSE the existing bridge primitives (no parallel system, the tested
// bridge is left untouched). Idempotency is guaranteed by deterministic evidence
// ids, so a retry never duplicates evidence or double-advances status.
//
// SAFETY: this file triggers NOTHING external. It mutates only execution
// lifecycle status + evidence, or a lead/work-order `status` field. It NEVER
// sends an email, places a call, charges a card, activates an n8n workflow, or
// deploys. Durable persistence rides the existing best-effort upsert, which
// no-ops when Supabase isn't configured.

import {
  attachExecutionEvidence,
  advanceExecutionStatus,
  canCompleteExecution,
} from "./approvalExecutionBridge.mjs";
import { upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";

function clean(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

// Small, stable, non-crypto hash (djb2) → deterministic evidence ids so the same
// submission is idempotent across retries without needing the caller to supply one.
function stableHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

/**
 * Deterministic evidence id from the task + evidence content. Used when the
 * caller does not supply evidence.evidence_id, so resubmitting identical evidence
 * is a no-op rather than a duplicate.
 */
export function evidenceFingerprint(taskId, evidence = {}) {
  const seed = [
    clean(taskId),
    clean(evidence.evidence_type),
    clean(evidence.evidence_reference),
    clean(evidence.evidence_summary),
    clean(evidence.submitted_by_agent),
  ].join("|");
  return `evw-${stableHash(seed)}`;
}

// Match a queue item to a submission by any of the stable identifiers.
function matchesSubmission(item, submission) {
  const tp = item?.taskPacket || {};
  const lc = item?.lifecycle || {};
  const taskId = clean(submission.task_id);
  const approvalId = clean(submission.approval_item_id);
  if (taskId && (clean(tp.task_id) === taskId || clean(lc.assigned_task_id) === taskId)) return true;
  if (approvalId && (clean(tp.related_approval_item_id) === approvalId || clean(lc.approval_item_id) === approvalId)) return true;
  return false;
}

function hasEvidenceId(lifecycle, evidenceId) {
  return asArray(lifecycle.submitted_evidence).some((e) => clean(e.evidence_id) === evidenceId);
}

/**
 * Apply an actor's evidence submission to a single queue item ({ taskPacket,
 * lifecycle }). Pure: returns a NEW item plus { changed, evidence_id, status,
 * error }. Idempotent — resubmitting the same evidence does not duplicate it, and
 * re-advancing to the current status is a no-op.
 *
 * submission: { task_id|approval_item_id, evidence:{...}, advance_to? }
 */
export function applyEvidenceToItem(item = {}, submission = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const lifecycle = item.lifecycle || {};
  const evidenceInput = submission.evidence || {};
  const evidenceId = clean(evidenceInput.evidence_id) || evidenceFingerprint(lifecycle.assigned_task_id || submission.task_id, evidenceInput);

  let nextLifecycle = lifecycle;
  let changed = false;

  // 1. Attach evidence unless this exact evidence id is already present (idempotent).
  if (!hasEvidenceId(lifecycle, evidenceId)) {
    nextLifecycle = attachExecutionEvidence(lifecycle, { ...evidenceInput, evidence_id: evidenceId, submitted_at: clean(evidenceInput.submitted_at) || now }, { now });
    changed = true;
  }

  // 2. Optionally advance status, GATED: "completed" requires accepted evidence.
  const target = clean(submission.advance_to);
  if (target && target !== clean(nextLifecycle.execution_status)) {
    if (target === "completed" && !canCompleteExecution(nextLifecycle)) {
      return {
        ok: false,
        changed,
        evidence_id: evidenceId,
        error: "Cannot advance to completed: required evidence is missing.",
        item: { ...item, lifecycle: nextLifecycle },
      };
    }
    const advanced = advanceExecutionStatus(nextLifecycle, target, { now });
    if (!advanced.ok) {
      return { ok: false, changed, evidence_id: evidenceId, error: advanced.error, item: { ...item, lifecycle: nextLifecycle } };
    }
    nextLifecycle = advanced.lifecycle;
    changed = true;
  }

  return {
    ok: true,
    changed,
    evidence_id: evidenceId,
    status: nextLifecycle.execution_status,
    item: { ...item, lifecycle: nextLifecycle },
  };
}

/**
 * Apply a submission to the approval-execution queue. Pure: returns a NEW queue
 * (input untouched) plus result metadata. Returns { ok:false } when the task
 * cannot be found, so a stray submission never silently no-ops.
 */
export function applyEvidenceToQueue(queue = {}, submission = {}, options = {}) {
  const items = asArray(queue.items);
  const index = items.findIndex((item) => matchesSubmission(item, submission));
  if (index === -1) {
    return { ok: false, reason: "task_not_found", queue, changed: false };
  }
  const result = applyEvidenceToItem(items[index], submission, options);
  const nextItems = items.slice();
  nextItems[index] = result.item;
  return {
    ok: result.ok,
    changed: result.changed,
    evidence_id: result.evidence_id,
    status: result.status,
    error: result.error,
    queue: { ...queue, items: nextItems },
    item: result.item,
  };
}

/**
 * Apply a submission to a full revenue document (the latest.json shape). Pure:
 * returns { ok, changed, document, ... } with a NEW document. Does not persist.
 */
export function applyEvidenceToDocument(document = {}, submission = {}, options = {}) {
  const result = applyEvidenceToQueue(document.approvalExecutionQueue || {}, submission, options);
  if (!result.ok) return { ...result, document };
  return {
    ok: true,
    changed: result.changed,
    evidence_id: result.evidence_id,
    status: result.status,
    item: result.item,
    document: { ...document, approvalExecutionQueue: result.queue },
  };
}

/**
 * Write-back + durable persistence. Applies the submission to the document, then
 * (unless persistSupabase === false) rides the existing best-effort upsert, which
 * no-ops without Supabase config and never throws. Returns the updated document
 * and the persistence result. Callers that own the local latest.json file can
 * write `result.document` back themselves.
 */
export async function persistEvidenceWriteback(document = {}, submission = {}, options = {}) {
  const applied = applyEvidenceToDocument(document, submission, options);
  if (!applied.ok) return { ...applied, supabase: { ok: false, skipped: true, reason: "not_applied" } };

  let supabase = { ok: false, skipped: true, reason: "disabled" };
  // Only touch durable storage when something actually changed — idempotent
  // resubmissions don't generate writes.
  if (options.persistSupabase !== false && applied.changed) {
    supabase = await upsertRevenueState(applied.document);
  }
  return { ...applied, supabase };
}

// ─── Safe status-update adapter (lead / work-order status only) ───────────────
//
// The lowest-risk execution adapter: it moves ONLY a `status` field forward, and
// ONLY into an allow-listed value. It never sends, calls, charges, or deploys.
// Forward transitions into a terminal/committed status require evidence; the
// adapter is idempotent (re-applying the current status is a no-op).

export const ALLOWED_LEAD_STATUSES = [
  "new", "needs_enrichment", "ready_to_email", "ready_to_call",
  "contacted", "responded", "booked_meeting", "won", "lost", "rejected", "on_hold",
];

export const ALLOWED_WORK_ORDER_STATUSES = [
  "report_ready_awaiting_delivery", "awaiting_pilot_scope_or_proposal",
  "pilot_scoped", "proposal_sent", "won", "implementation_in_progress",
  "delivered", "completed", "on_hold", "cancelled",
];

// Statuses that represent a committed/terminal outcome and therefore require
// evidence before the adapter will set them (no unbacked "won"/"completed").
const EVIDENCE_REQUIRED_STATUSES = new Set([
  "won", "booked_meeting", "delivered", "completed", "implementation_in_progress", "proposal_sent",
]);

function allowedFor(kind) {
  if (kind === "lead") return ALLOWED_LEAD_STATUSES;
  if (kind === "work_order") return ALLOWED_WORK_ORDER_STATUSES;
  return null;
}

/**
 * Update a lead or work-order `status` safely. Pure — returns a NEW record.
 *
 * @param {object} record  the lead or work-order record
 * @param {object} opts    { kind:'lead'|'work_order', toStatus, hasEvidence?,
 *                           evidenceLifecycle?, statusField?, now? }
 * @returns { ok, changed, record?, error? }
 */
export function applySafeStatusUpdate(record = {}, opts = {}) {
  const { kind, toStatus, now } = opts;
  const statusField = opts.statusField || "status";
  const allowed = allowedFor(kind);
  if (!allowed) return { ok: false, error: `Unknown record kind: ${kind}` };

  const next = clean(toStatus);
  if (!allowed.includes(next)) {
    return { ok: false, error: `Status "${next}" is not an allowed ${kind} status.` };
  }

  const current = clean(record[statusField]);
  // Idempotent: setting the status it already has is a successful no-op.
  if (current === next) return { ok: true, changed: false, record };

  // Evidence gate for committed/terminal outcomes.
  if (EVIDENCE_REQUIRED_STATUSES.has(next)) {
    const evidencePresent =
      opts.hasEvidence === true ||
      (opts.evidenceLifecycle ? canCompleteExecution(opts.evidenceLifecycle) : false);
    if (!evidencePresent) {
      return { ok: false, error: `Status "${next}" requires evidence before it can be set.` };
    }
  }

  const ts = clean(now) || new Date().toISOString();
  const history = asArray(record.status_history);
  return {
    ok: true,
    changed: true,
    record: {
      ...record,
      [statusField]: next,
      last_status_update_at: ts,
      status_history: [...history, { from: current || null, to: next, at: ts }],
    },
  };
}
