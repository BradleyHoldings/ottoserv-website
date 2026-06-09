import { CALL_STATES } from "./intent.mjs";
import { describeCallStoreConfig, makeCallClient } from "./store.mjs";
import { readRetellConfig } from "./retell.mjs";
import { CALL_WATCHDOG_ACTION, evaluateCallIntent } from "./watchdog.mjs";

function clean(v) { return String(v ?? "").trim(); }
function maskPhone(phone) {
  const p = clean(phone);
  if (p.length < 4) return p ? "***" : "";
  return `***${p.slice(-4)}`;
}

const QUEUE_STATES = new Set([CALL_STATES.PROPOSED, CALL_STATES.APPROVED, CALL_STATES.SCHEDULED]);
const ACTIVE_STATES = new Set([CALL_STATES.CLAIMED, CALL_STATES.EXECUTING, CALL_STATES.STARTED_UNVERIFIED]);
const FAILURE_STATES = new Set([CALL_STATES.FAILED, CALL_STATES.RETRY_WAITING, CALL_STATES.STARTED_UNVERIFIED]);

function redactIntent(intent = {}) {
  return {
    execution_id: clean(intent.execution_id),
    lead_id: clean(intent.lead_id),
    state: clean(intent.state),
    phone: maskPhone(intent.phone),
    provider: clean(intent.provider),
    approved_script_ref: clean(intent.approved_script_ref),
    approved_angle: clean(intent.approved_angle),
    retry_count: Number(intent.retry_count || 0),
    lease_owner: clean(intent.lease_owner),
    lease_expires_at: clean(intent.lease_expires_at),
    provider_call_id: clean(intent.provider_call_id),
    provider_status: clean(intent.provider_status),
    provider_outcome: clean(intent.provider_outcome),
    duration_seconds: Number(intent.duration_seconds || 0),
    recording_ref: clean(intent.recording_url) ? "present" : "",
    transcript_ref: clean(intent.transcript_url) ? "present" : "",
    next_action: clean(intent.next_action),
    scheduled_at: clean(intent.scheduled_at),
    policy_passed: Boolean(intent.policy_receipt?.passed),
    policy_block_reason: clean(intent.policy_receipt?.block_reason),
    updated_at: clean(intent.updated_at),
  };
}

export function buildCallRailDashboard(input = {}, options = {}) {
  const now = options.now || input.now || new Date().toISOString();
  const intents = Array.isArray(input.intents) ? input.intents : [];
  const byState = {};
  for (const s of Object.values(CALL_STATES)) byState[s] = 0;
  for (const i of intents) byState[clean(i.state)] = (byState[clean(i.state)] || 0) + 1;

  const queued = intents.filter(i => QUEUE_STATES.has(clean(i.state))).map(redactIntent);
  const active = intents.filter(i => ACTIVE_STATES.has(clean(i.state))).map(redactIntent);
  const completed = intents.filter(i => clean(i.state) === CALL_STATES.COMPLETED).map(redactIntent);
  const failures = intents.filter(i => FAILURE_STATES.has(clean(i.state))).map(redactIntent);
  const deadLetters = intents.filter(i => clean(i.state) === CALL_STATES.DEAD_LETTER).map(redactIntent);
  const approvalRequired = intents.filter(i => clean(i.state) === CALL_STATES.APPROVAL_REQUIRED).map(redactIntent);
  const watchdogAlerts = intents
    .map(i => evaluateCallIntent(i, { now }))
    .filter(a => a.action !== CALL_WATCHDOG_ACTION.NONE)
    .map(a => ({ execution_id: a.intent_id, action: a.action, reason: a.reason, safe: a.safe }));

  return {
    generated_at: now,
    access: "admin_only",
    redacted: true,
    summary: {
      total_intents: intents.length,
      queued: queued.length,
      approval_required: approvalRequired.length,
      active_claims: active.length,
      completed: completed.length,
      failures: failures.length,
      dead_letters: deadLetters.length,
      watchdog_alerts: watchdogAlerts.length,
    },
    by_state: byState,
    queues: { queued, approval_required: approvalRequired, active_claims: active },
    completed,
    failures,
    dead_letters: deadLetters,
    watchdog_alerts: watchdogAlerts,
    lead_next_actions: buildLeadNextActions(intents),
  };
}

export async function readCallRailDashboardState(options = {}) {
  const now = options.now || new Date().toISOString();
  const client = options.client || makeCallClient(options);
  const config = readRetellConfig(options.env || process.env);
  const store = describeCallStoreConfig();
  if (!client) {
    return { available: false, reason: "supabase_not_configured", config, store, dashboard: buildCallRailDashboard({ intents: [], now }, { now }) };
  }
  try {
    const rows = typeof client.listDashboardIntents === "function" ? await client.listDashboardIntents(options.limit || 100) : await client.listActiveIntents();
    const intents = rows.map(row => row.raw_intent || row).filter(Boolean);
    return { available: true, reason: "supabase", config, store, dashboard: buildCallRailDashboard({ intents, now }, { now }) };
  } catch (err) {
    return { available: false, reason: clean(err?.message) || "call_rail_read_failed", config, store, dashboard: buildCallRailDashboard({ intents: [], now }, { now }) };
  }
}

function buildLeadNextActions(intents) {
  const latest = new Map();
  for (const i of intents) {
    const lead = clean(i.lead_id);
    if (!lead) continue;
    const prev = latest.get(lead);
    if (!prev || clean(i.updated_at) > clean(prev.updated_at)) latest.set(lead, i);
  }
  return [...latest.values()].map(i => ({
    lead_id: clean(i.lead_id),
    state: clean(i.state),
    provider_outcome: clean(i.provider_outcome),
    next_action: clean(i.next_action) || nextActionForState(clean(i.state)),
    scheduled_at: clean(i.scheduled_at),
  }));
}

function nextActionForState(state) {
  switch (state) {
    case CALL_STATES.PROPOSED: return "evaluate_policy";
    case CALL_STATES.APPROVAL_REQUIRED: return "await_human_approval";
    case CALL_STATES.APPROVED: return "claim_and_place_controlled_call";
    case CALL_STATES.SCHEDULED: return "await_scheduled_slot";
    case CALL_STATES.CLAIMED:
    case CALL_STATES.EXECUTING: return "executing";
    case CALL_STATES.STARTED_UNVERIFIED: return "reconcile_with_retell";
    case CALL_STATES.COMPLETED: return "progress_lead_from_verified_outcome";
    case CALL_STATES.RETRY_WAITING: return "retry_after_spacing";
    case CALL_STATES.DEAD_LETTER: return "manual_review";
    case CALL_STATES.BLOCKED: return "resolve_block";
    default: return "none";
  }
}
