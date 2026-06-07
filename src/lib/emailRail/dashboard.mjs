// ─── Phase 2 email execution rail: dashboard data (admin-only, redacted) ──────
//
// Shapes email-rail execution state for the EXISTING Hermes/Agent Command Center.
// This is NOT a separate application — it is a pure data adapter the command center
// renders. It surfaces queues, approvals, scheduled actions, active claims, sends,
// replies, failures, dead letters, watchdog alerts, caps, sender health, evidence,
// and per-lead next action. It REDACTS message bodies and never exposes credentials.

import { EMAIL_STATES } from "./intent.mjs";
import { describeEmailConfig } from "./config.mjs";
import { makeEmailClient, describeStoreConfig } from "./store.mjs";
import { evaluateIntent, WATCHDOG_ACTION } from "./watchdog.mjs";

function clean(v) { return String(v ?? "").trim(); }

// Redact anything sensitive from an intent before it reaches a dashboard response.
// Body + subject are summarized to lengths/hashes; no credentials are ever present
// in an intent, but we defensively strip any key that looks secret.
function redactIntent(intent = {}) {
  return {
    execution_id: clean(intent.execution_id),
    lead_id: clean(intent.lead_id),
    state: clean(intent.state),
    action_type: clean(intent.action_type),
    campaign_id: clean(intent.campaign_id),
    recipient: maskEmail(intent.recipient),
    sender: maskEmail(intent.sender),
    template_ref: clean(intent.template_ref),
    content_hash: clean(intent.content_hash),
    subject_length: clean(intent.subject).length,
    body_length: clean(intent.body).length,
    retry_count: Number(intent.retry_count || 0),
    lease_owner: clean(intent.lease_owner),
    lease_expires_at: clean(intent.lease_expires_at),
    provider_message_id: clean(intent.provider_message_id),
    provider_thread_id: clean(intent.provider_thread_id),
    scheduled_at: clean(intent.scheduled_at),
    policy_passed: Boolean(intent.policy_receipt?.passed),
    policy_block_reason: clean(intent.policy_receipt?.block_reason),
    updated_at: clean(intent.updated_at),
  };
}

// Mask an email for display: keep first char + domain (admins can correlate without
// exposing the full PII in a shared view).
function maskEmail(email) {
  const e = clean(email);
  if (!e.includes("@")) return e ? "***" : "";
  const [local, domain] = e.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

const QUEUE_STATES = new Set([EMAIL_STATES.PROPOSED, EMAIL_STATES.APPROVED, EMAIL_STATES.SCHEDULED]);
const ACTIVE_CLAIM_STATES = new Set([EMAIL_STATES.CLAIMED, EMAIL_STATES.EXECUTING]);
const FAILURE_STATES = new Set([EMAIL_STATES.FAILED, EMAIL_STATES.RETRY_WAITING, EMAIL_STATES.SENT_UNVERIFIED]);

/**
 * Build the email-rail dashboard payload. Admin-only — callers MUST gate on an
 * admin check (e.g. isOttoServAdmin) before exposing this.
 *
 * @param {object} input { intents[], replies[], evidence[], caps?, now }
 */
export function buildEmailRailDashboard(input = {}, options = {}) {
  const now = options.now || input.now || new Date().toISOString();
  const intents = Array.isArray(input.intents) ? input.intents : [];
  const replies = Array.isArray(input.replies) ? input.replies : [];

  const byState = {};
  for (const s of Object.values(EMAIL_STATES)) byState[s] = 0;
  for (const i of intents) byState[clean(i.state)] = (byState[clean(i.state)] || 0) + 1;

  const queued = intents.filter(i => QUEUE_STATES.has(clean(i.state))).map(redactIntent);
  const approvalRequired = intents.filter(i => clean(i.state) === EMAIL_STATES.APPROVAL_REQUIRED).map(redactIntent);
  const activeClaims = intents.filter(i => ACTIVE_CLAIM_STATES.has(clean(i.state))).map(redactIntent);
  const completed = intents.filter(i => clean(i.state) === EMAIL_STATES.COMPLETED).map(redactIntent);
  const failures = intents.filter(i => FAILURE_STATES.has(clean(i.state))).map(redactIntent);
  const deadLetters = intents.filter(i => clean(i.state) === EMAIL_STATES.DEAD_LETTER).map(redactIntent);

  // Watchdog alerts derived from the current intent population.
  const watchdogAlerts = intents
    .map(i => evaluateIntent(i, { now }))
    .filter(a => a.action !== WATCHDOG_ACTION.NONE)
    .map(a => ({ execution_id: a.intent_id, action: a.action, reason: a.reason, safe: a.safe }));

  // Reply classification breakdown.
  const replyByClass = {};
  for (const r of replies) replyByClass[clean(r.classification)] = (replyByClass[clean(r.classification)] || 0) + 1;

  // Sender health: per-sender send + failure counts.
  const senderHealth = {};
  for (const i of intents) {
    const s = maskEmail(i.sender) || "(none)";
    senderHealth[s] = senderHealth[s] || { sent: 0, failed: 0, queued: 0 };
    if (clean(i.state) === EMAIL_STATES.COMPLETED) senderHealth[s].sent += 1;
    else if (FAILURE_STATES.has(clean(i.state)) || clean(i.state) === EMAIL_STATES.DEAD_LETTER) senderHealth[s].failed += 1;
    else if (QUEUE_STATES.has(clean(i.state))) senderHealth[s].queued += 1;
  }

  return {
    generated_at: now,
    access: "admin_only",
    redacted: true,
    summary: {
      total_intents: intents.length,
      queued: queued.length,
      approval_required: approvalRequired.length,
      active_claims: activeClaims.length,
      sent: completed.length,
      failures: failures.length,
      dead_letters: deadLetters.length,
      replies: replies.length,
      watchdog_alerts: watchdogAlerts.length,
    },
    by_state: byState,
    queues: { queued, approval_required: approvalRequired, active_claims: activeClaims },
    sent: completed,
    failures,
    dead_letters: deadLetters,
    replies: { by_class: replyByClass, total: replies.length },
    watchdog_alerts: watchdogAlerts,
    caps: input.caps || null,
    sender_health: senderHealth,
    // Per-lead next action (most recent intent per lead).
    lead_next_actions: buildLeadNextActions(intents),
  };
}

export async function readEmailRailDashboardState(options = {}) {
  const now = options.now || new Date().toISOString();
  const client = options.client || makeEmailClient(options);
  const config = describeEmailConfig(options.env || process.env);
  const store = describeStoreConfig();
  if (!client) {
    return {
      available: false,
      reason: "supabase_not_configured",
      config,
      store,
      dashboard: buildEmailRailDashboard({ intents: [], replies: [], now }, { now }),
    };
  }

  try {
    const [intentRows, replies] = await Promise.all([
      typeof client.listDashboardIntents === "function" ? client.listDashboardIntents(options.limit || 100) : client.listActiveIntents(),
      typeof client.listRecentReplies === "function" ? client.listRecentReplies(options.replyLimit || 100) : [],
    ]);
    const intents = intentRows.map((row) => row.raw_intent || row).filter(Boolean);
    return {
      available: true,
      reason: "supabase",
      config,
      store,
      dashboard: buildEmailRailDashboard({ intents, replies, now }, { now }),
    };
  } catch (err) {
    return {
      available: false,
      reason: clean(err?.message) || "email_rail_read_failed",
      config,
      store,
      dashboard: buildEmailRailDashboard({ intents: [], replies: [], now }, { now }),
    };
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
    next_action: nextActionForState(clean(i.state)),
    scheduled_at: clean(i.scheduled_at),
  }));
}

function nextActionForState(state) {
  switch (state) {
    case EMAIL_STATES.PROPOSED: return "evaluate_policy";
    case EMAIL_STATES.APPROVAL_REQUIRED: return "await_human_approval";
    case EMAIL_STATES.APPROVED: return "claim_and_execute";
    case EMAIL_STATES.SCHEDULED: return "await_scheduled_slot";
    case EMAIL_STATES.CLAIMED: case EMAIL_STATES.EXECUTING: return "executing";
    case EMAIL_STATES.SENT_UNVERIFIED: return "reconcile_with_provider";
    case EMAIL_STATES.COMPLETED: return "await_reply";
    case EMAIL_STATES.RETRY_WAITING: return "retry_after_backoff";
    case EMAIL_STATES.DEAD_LETTER: return "manual_review";
    case EMAIL_STATES.BLOCKED: return "resolve_block";
    default: return "none";
  }
}
