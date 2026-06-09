import { CALL_STATES } from "./intent.mjs";

export const CALL_WATCHDOG_ACTION = {
  RELEASE_LEASE: "release_lease",
  RECONCILE: "reconcile_provider",
  RETRY: "retry",
  DEAD_LETTER: "dead_letter",
  ESCALATE: "escalate",
  REQUEUE: "requeue_scheduled",
  NONE: "none",
};

function clean(v) { return String(v ?? "").trim(); }

export function evaluateCallIntent(intent = {}, ctx = {}) {
  const now = ctx.now || new Date().toISOString();
  const nowMs = Date.parse(now);
  const state = clean(intent.state);
  const id = clean(intent.execution_id);
  const retries = Number(intent.retry_count || 0);
  const maxRetries = Number(ctx.max_retries ?? 3);

  if ((state === CALL_STATES.CLAIMED || state === CALL_STATES.EXECUTING) && clean(intent.lease_expires_at)) {
    const exp = Date.parse(intent.lease_expires_at);
    if (!Number.isNaN(exp) && exp < nowMs) return { action: CALL_WATCHDOG_ACTION.RELEASE_LEASE, reason: "lease_expired", safe: true, intent_id: id };
  }

  if (state === CALL_STATES.STARTED_UNVERIFIED) {
    return { action: CALL_WATCHDOG_ACTION.RECONCILE, reason: "provider_timeout_needs_reconciliation", safe: true, intent_id: id };
  }

  if (state === CALL_STATES.COMPLETED && !clean(intent.provider_call_id)) {
    return { action: CALL_WATCHDOG_ACTION.ESCALATE, reason: "completed_without_provider_evidence", safe: false, intent_id: id };
  }

  if (state === CALL_STATES.RETRY_WAITING || state === CALL_STATES.FAILED) {
    if (retries >= maxRetries) return { action: CALL_WATCHDOG_ACTION.DEAD_LETTER, reason: "retry_cap_exhausted", safe: true, intent_id: id };
    return { action: CALL_WATCHDOG_ACTION.RETRY, reason: "retry_eligible", safe: true, intent_id: id };
  }

  if (state === CALL_STATES.SCHEDULED && clean(intent.scheduled_at)) {
    const sched = Date.parse(intent.scheduled_at);
    if (!Number.isNaN(sched) && (nowMs - sched) > 24 * 3600 * 1000) {
      return { action: CALL_WATCHDOG_ACTION.REQUEUE, reason: "stale_scheduled_call", safe: true, intent_id: id };
    }
  }

  return { action: CALL_WATCHDOG_ACTION.NONE, reason: "healthy", safe: true, intent_id: id };
}

export function sweepCallIntents(intents = [], ctx = {}) {
  const actions = [];
  const escalations = [];
  for (const intent of Array.isArray(intents) ? intents : []) {
    const result = evaluateCallIntent(intent, ctx);
    if (result.action === CALL_WATCHDOG_ACTION.NONE) continue;
    if (result.safe) actions.push(result);
    else escalations.push(result);
  }

  if (ctx.replyLookup && ctx.replyLookup.ok === false) {
    escalations.push({ action: CALL_WATCHDOG_ACTION.ESCALATE, reason: "failed_reply_lookup", safe: false, intent_id: "reply_lookup" });
  }
  for (const leadId of Array.isArray(ctx.pipelineConflicts) ? ctx.pipelineConflicts : []) {
    escalations.push({ action: CALL_WATCHDOG_ACTION.ESCALATE, reason: "pipeline_conflict", safe: false, lead_id: leadId });
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
