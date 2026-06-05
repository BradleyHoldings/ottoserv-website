// ─── Durable approval store (approval-durability fix) ─────────────────────────
//
// THE DEFECT THIS FIXES
// Jonathan said "yes, please start" and that confirmation never became a durable,
// machine-consumable approved execution request — it stayed as conversation. This
// module makes approval a DURABLE RECORD bound to a specific operation + task, with
// idempotent consumption, scope/expiry/policy, an audit trail (telegram msg →
// approval → task → receipt → evidence → outcome), and protection against asking
// again for something already authorized.

import { promises as fs } from "node:fs";
import path from "node:path";

function clean(v) { return String(v ?? "").trim(); }
function asArray(v) { return Array.isArray(v) ? v : []; }

export function approvalsDir(options = {}) {
  return options.approvalsDir || process.env.HERMES_APPROVALS_DIR || path.join(process.cwd(), "data", "revenue-engine", "approvals");
}
function approvalFile(id, options) { return path.join(approvalsDir(options), `${id}.json`); }

/**
 * Record a durable approval. Idempotent by (operation_type + correlation_id):
 * re-recording the same approval returns the existing record instead of creating a
 * duplicate — so duplicate Telegram confirmations do not double-authorize.
 *
 * @param {object} input {
 *   operation_type, task_id, correlation_id, approved_by, source_message_id,
 *   source_text, scope?, policy_ref?, expires_at?, inheritable? }
 */
export async function recordApproval(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const operation_type = clean(input.operation_type);
  const correlation_id = clean(input.correlation_id) || clean(input.task_id);
  const approval_id = `appr-${operation_type}-${correlation_id}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

  const existing = await loadApproval(approval_id, options);
  if (existing) {
    return { ok: true, approval: existing, created: false, idempotent: true };
  }
  const approval = {
    approval_id,
    operation_type,
    task_id: clean(input.task_id),
    correlation_id,
    approved_by: clean(input.approved_by) || "Jonathan",
    decision: "approved",
    scope: clean(input.scope) || `${operation_type}:single_run`,
    policy_ref: clean(input.policy_ref) || "standing_outbound_policy",
    inheritable: Boolean(input.inheritable),
    expires_at: clean(input.expires_at) || new Date(Date.parse(now) + 24 * 3600 * 1000).toISOString(),
    consumed: false,
    consumed_at: "",
    consumed_by_task: "",
    audit: [{ step: "approval_recorded", at: now, source_message_id: clean(input.source_message_id), source_text: clean(input.source_text).slice(0, 280) }],
    created_at: now,
    updated_at: now,
  };
  await saveApproval(approval, options);
  return { ok: true, approval, created: true, idempotent: false };
}

// Is this approval currently valid (approved, not expired, not consumed)?
export function isApprovalValid(approval, now = new Date().toISOString()) {
  if (!approval || approval.decision !== "approved") return { valid: false, reason: "not_approved" };
  if (approval.consumed) return { valid: false, reason: "already_consumed" };
  if (clean(approval.expires_at) && Date.parse(approval.expires_at) < Date.parse(now)) return { valid: false, reason: "expired" };
  return { valid: true, reason: "valid" };
}

/**
 * Idempotently consume an approval for a task. If already consumed BY THE SAME
 * task, it is a safe no-op (returns ok). If consumed by a different task, it is
 * rejected (prevents replay). Returns { ok, approval?, reason }.
 */
export async function consumeApproval(approval_id, task_id, options = {}) {
  const now = options.now || new Date().toISOString();
  const approval = await loadApproval(approval_id, options);
  if (!approval) return { ok: false, reason: "approval_not_found" };
  if (approval.consumed) {
    if (clean(approval.consumed_by_task) === clean(task_id)) return { ok: true, approval, reason: "already_consumed_by_same_task", idempotent: true };
    return { ok: false, reason: "already_consumed_by_other_task" };
  }
  const valid = isApprovalValid(approval, now);
  if (!valid.valid) return { ok: false, reason: valid.reason };
  const updated = {
    ...approval,
    consumed: true,
    consumed_at: now,
    consumed_by_task: clean(task_id),
    updated_at: now,
    audit: [...asArray(approval.audit), { step: "approval_consumed", at: now, task_id: clean(task_id) }],
  };
  await saveApproval(updated, options);
  return { ok: true, approval: updated, reason: "consumed" };
}

// Append an audit entry linking the chain (task → receipt → evidence → outcome).
export async function appendApprovalAudit(approval_id, entry, options = {}) {
  const approval = await loadApproval(approval_id, options);
  if (!approval) return { ok: false, reason: "not_found" };
  const now = options.now || new Date().toISOString();
  const updated = { ...approval, updated_at: now, audit: [...asArray(approval.audit), { at: now, ...entry }] };
  await saveApproval(updated, options);
  return { ok: true, approval: updated };
}

// Does a policy-covered action already have standing authorization (no re-ask)?
// Returns true when an inheritable, valid approval exists for the operation.
export async function hasStandingAuthorization(operation_type, options = {}) {
  const all = await loadAllApprovals(options);
  const now = options.now || new Date().toISOString();
  return all.some((a) => clean(a.operation_type) === clean(operation_type) && a.inheritable && isApprovalValid(a, now).valid);
}

export async function saveApproval(approval, options = {}) {
  const file = approvalFile(approval.approval_id, options);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(approval, null, 2)}\n`, "utf8");
  return file;
}
export async function loadApproval(approval_id, options = {}) {
  try { return JSON.parse(await fs.readFile(approvalFile(approval_id, options), "utf8")); }
  catch { return null; }
}
export async function loadAllApprovals(options = {}) {
  try {
    const names = await fs.readdir(approvalsDir(options));
    const out = [];
    for (const n of names) { if (n.endsWith(".json")) { try { out.push(JSON.parse(await fs.readFile(path.join(approvalsDir(options), n), "utf8"))); } catch { /* skip */ } } }
    return out;
  } catch { return []; }
}
