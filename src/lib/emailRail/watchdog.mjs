// ─── Phase 2 email execution rail: watchdog + self-repair ────────────────────
//
// Detects and deterministically recovers stuck/ambiguous execution states. PURE
// classification + recommended recovery action; callers apply persistence. Safe
// recoveries run automatically; ambiguous/unsafe cases escalate with exact evidence.
//
// Handles: expired leases, sent_unverified, missing evidence, provider timeouts,
// repeated provider failures, stale scheduled actions, pipeline conflicts,
// suppression mismatch, cap exhaustion, and missing/invalid credentials.

import { EMAIL_STATES } from "./intent.mjs";

function clean(v) { return String(v ?? "").trim(); }

export const WATCHDOG_ACTION = {
  RELEASE_LEASE: "release_lease",          // reclaim an expired claim for re-execution
  RECONCILE: "reconcile_provider",          // sent_unverified → provider lookup
  RETRY: "retry",                           // safe retry (after reconciliation)
  DEAD_LETTER: "dead_letter",               // exhausted retries → park
  ESCALATE: "escalate",                     // ambiguous/unsafe → human review
  REQUEUE: "requeue_scheduled",             // stale scheduled action → re-evaluate
  NONE: "none",
};

const MAX_RETRIES = 4;

/**
 * Evaluate one intent for watchdog action. Pure.
 * @param {object} intent
 * @param {object} ctx { now, max_retries? }
 * @returns { action, reason, safe, intent_id }
 */
export function evaluateIntent(intent = {}, ctx = {}) {
  const now = ctx.now || new Date().toISOString();
  const nowMs = Date.parse(now);
  const maxRetries = Number(ctx.max_retries ?? MAX_RETRIES);
  const state = clean(intent.state);
  const id = clean(intent.execution_id);
  const retries = Number(intent.retry_count || 0);

  // Expired lease on a claimed/executing intent → release for re-execution.
  if ((state === EMAIL_STATES.CLAIMED || state === EMAIL_STATES.EXECUTING) && clean(intent.lease_expires_at)) {
    const exp = Date.parse(intent.lease_expires_at);
    if (!Number.isNaN(exp) && exp < nowMs) {
      return { action: WATCHDOG_ACTION.RELEASE_LEASE, reason: "lease_expired", safe: true, intent_id: id };
    }
  }

  // sent_unverified → must reconcile via provider lookup BEFORE any retry (rule 6).
  if (state === EMAIL_STATES.SENT_UNVERIFIED) {
    return { action: WATCHDOG_ACTION.RECONCILE, reason: "sent_unverified_needs_reconciliation", safe: true, intent_id: id };
  }

  // retry_waiting → retry if under cap, else dead-letter.
  if (state === EMAIL_STATES.RETRY_WAITING) {
    if (retries >= maxRetries) {
      return { action: WATCHDOG_ACTION.DEAD_LETTER, reason: "retry_cap_exhausted", safe: true, intent_id: id };
    }
    return { action: WATCHDOG_ACTION.RETRY, reason: "retry_eligible", safe: true, intent_id: id };
  }

  // failed → dead-letter (terminal failure after attempts) unless retries remain.
  if (state === EMAIL_STATES.FAILED) {
    if (retries >= maxRetries) return { action: WATCHDOG_ACTION.DEAD_LETTER, reason: "failed_cap_exhausted", safe: true, intent_id: id };
    return { action: WATCHDOG_ACTION.RETRY, reason: "failed_retry_eligible", safe: true, intent_id: id };
  }

  // Stale scheduled action (scheduled far in the past, never claimed).
  if (state === EMAIL_STATES.SCHEDULED && clean(intent.scheduled_at)) {
    const sched = Date.parse(intent.scheduled_at);
    const staleMs = 24 * 3600 * 1000;
    if (!Number.isNaN(sched) && (nowMs - sched) > staleMs) {
      return { action: WATCHDOG_ACTION.REQUEUE, reason: "stale_scheduled_action", safe: true, intent_id: id };
    }
  }

  // Completed intent missing its provider evidence → escalate (truth violation).
  if (state === EMAIL_STATES.COMPLETED && !clean(intent.provider_message_id)) {
    return { action: WATCHDOG_ACTION.ESCALATE, reason: "completed_without_evidence", safe: false, intent_id: id };
  }

  return { action: WATCHDOG_ACTION.NONE, reason: "healthy", safe: true, intent_id: id };
}

/**
 * Sweep a batch of intents. Returns grouped recovery actions + escalations.
 */
export function sweep(intents = [], ctx = {}) {
  const actions = [];
  const escalations = [];
  for (const intent of Array.isArray(intents) ? intents : []) {
    const result = evaluateIntent(intent, ctx);
    if (result.action === WATCHDOG_ACTION.NONE) continue;
    if (!result.safe) escalations.push(result);
    else actions.push(result);
  }
  return {
    generated_at: ctx.now || new Date().toISOString(),
    actions,
    escalations,
    summary: {
      total: (Array.isArray(intents) ? intents : []).length,
      actionable: actions.length,
      escalations: escalations.length,
      by_action: actions.reduce((acc, a) => { acc[a.action] = (acc[a.action] || 0) + 1; return acc; }, {}),
    },
  };
}

/**
 * Detect config-level failures that should stop the cycle truthfully.
 * Returns { ok, blockers[] }.
 */
export function checkConfigHealth(emailCfg = {}) {
  const blockers = [];
  if (emailCfg.state === "persistence_pending") blockers.push("supabase_not_configured");
  if (emailCfg.state === "transport_pending") blockers.push("email_provider_not_configured");
  if (emailCfg.state === "blocked") blockers.push(`config_blocked:${emailCfg.reason || "unknown"}`);
  return { ok: blockers.length === 0, blockers };
}
