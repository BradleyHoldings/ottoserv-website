// ─── Phase 2 email execution rail: Hermes heartbeat integration ──────────────
//
// Wires the complete rail into the Hermes operating cycle. When email is disabled
// or misconfigured, the cycle STOPS TRUTHFULLY (returns a blocked result) and never
// uses local data as authority. This is the single entry the operating loop calls.
//
// Cycle phases:
//   1. load eligible canonical leads (Phase 1 authoritative read)
//   2. select permitted next actions
//   3. materialize durable email intents
//   4. claim approved work
//   5. execute email
//   6. reconcile provider evidence
//   7. detect replies
//   8. update canonical lead state
//   9. schedule or cancel next actions
//  10. run watchdog/recovery
//  11. summarize the operating result

import { readEmailConfig, EMAIL_MODE, EMAIL_CONFIG_STATE } from "./config.mjs";
import { readAuthoritativeLeads, AUTHORITATIVE_READ } from "../leadRail/store.mjs";
import { ELIGIBILITY } from "../leadRail/eligibility.mjs";
import { makeEmailClient } from "./store.mjs";
import { runEmailAction } from "./pipeline.mjs";
import { reconcileUnverified } from "./provider.mjs";
import { processReply } from "./reply.mjs";
import { evaluateFollowUp, selectIntentsToCancel } from "./scheduler.mjs";
import { sweep, checkConfigHealth, WATCHDOG_ACTION } from "./watchdog.mjs";
import { transitionEmail, EMAIL_STATES } from "./intent.mjs";

function clean(v) { return String(v ?? "").trim(); }

/**
 * Run one email-rail heartbeat cycle. Returns a truthful operating result.
 * No send happens unless mode === "live" AND a transport is supplied.
 *
 * @param {object} options {
 *   now, mode, transport, lookup (for reconciliation), worker_id,
 *   inboundReplies[], actions[] (pre-selected next actions), policyCtx,
 *   client, leadStore, max_to_send
 * }
 */
export async function runHeartbeat(options = {}) {
  const now = options.now || new Date().toISOString();
  const emailCfg = options.emailConfig || readEmailConfig();
  const phases = {};

  // Config gate — stop truthfully if email rail can't run.
  const health = checkConfigHealth(emailCfg);
  const live = (options.mode || emailCfg.mode) === EMAIL_MODE.LIVE;
  if (live && !health.ok) {
    return { ok: false, stopped: true, reason: "email_rail_unconfigured", blockers: health.blockers, no_transport: true, phases };
  }

  const client = options.client || makeEmailClient(options);

  // Phase 1: load eligible canonical leads (authoritative).
  let eligibleLeads = [];
  if (Array.isArray(options.leads)) {
    eligibleLeads = options.leads;
    phases.load_leads = { source: "injected", count: eligibleLeads.length };
  } else {
    const authRead = await readAuthoritativeLeads(options.leadStore || {});
    if (!authRead.ok && authRead.status === AUTHORITATIVE_READ.READ_FAILED && live) {
      return { ok: false, stopped: true, reason: "authoritative_lead_read_failed", no_transport: true, phases };
    }
    eligibleLeads = (authRead.rows || []).filter(l => clean(l.eligibility) === ELIGIBILITY.EMAIL);
    phases.load_leads = { source: "supabase", status: authRead.status, count: eligibleLeads.length };
  }

  // Phase 2+3+4+5: select actions, materialize, claim, execute.
  const sendResults = [];
  const maxToSend = Number(options.max_to_send ?? 1); // controlled: default 1 per cycle
  const actions = Array.isArray(options.actions) && options.actions.length
    ? options.actions
    : eligibleLeads.slice(0, maxToSend).map(lead => ({ lead, action_type: "outbound_email", template_ref: options.template_ref, subject: options.subject, body: options.body, sender: options.sender, policyCtx: options.policyCtx }));

  let sent = 0;
  for (const action of actions) {
    if (live && sent >= maxToSend) { sendResults.push({ lead_id: clean(action.lead?.lead_id), status: "skipped", reason: "cycle_cap_reached" }); continue; }
    const result = await runEmailAction(action, { ...options, now, client, transport: live ? options.transport : null, emailConfig: emailCfg });
    if (result.ok) sent += 1;
    sendResults.push({ lead_id: clean(action.lead?.lead_id), execution_id: clean(result.intent?.execution_id), status: result.ok ? "sent" : result.step, reason: result.reason, requires_approval: result.requires_approval });
  }
  phases.execute = { attempted: actions.length, sent, results: sendResults };

  // Phase 6: reconcile any sent_unverified intents.
  const reconciliations = [];
  if (typeof options.lookup === "function" && client) {
    let active = [];
    try { active = await client.listActiveIntents(); } catch (_) { active = []; }
    for (const row of active) {
      const intent = row.raw_intent || row;
      if (clean(intent.state) !== EMAIL_STATES.SENT_UNVERIFIED) continue;
      const rec = await reconcileUnverified(options.lookup, intent, { now });
      reconciliations.push({ execution_id: clean(intent.execution_id), outcome: rec.outcome, reconciled: rec.reconciled });
    }
  }
  phases.reconcile = { count: reconciliations.length, reconciliations };

  // Phase 7+8: detect + process replies.
  const replyResults = [];
  for (const inbound of Array.isArray(options.inboundReplies) ? options.inboundReplies : []) {
    const intent = inbound.intent || {};
    const r = await processReply(inbound, intent, { ...options, now, client });
    replyResults.push({ provider_event_id: r.provider_event_id, classification: r.classification, ok: r.ok, deduped: r.deduped, stops_sequence: r.stops_sequence });
  }
  phases.replies = { count: replyResults.length, results: replyResults };

  // Phase 9: schedule or cancel next actions.
  const scheduling = [];
  for (const r of replyResults) {
    if (r.stops_sequence) {
      const toCancel = selectIntentsToCancel(options.pendingIntents || [], r.classification);
      scheduling.push({ action: "cancel", classification: r.classification, cancelled: toCancel });
    }
  }
  phases.scheduling = { count: scheduling.length, scheduling };

  // Phase 10: watchdog sweep.
  let watchdogResult = { actions: [], escalations: [], summary: {} };
  if (Array.isArray(options.intentsForWatchdog)) {
    watchdogResult = sweep(options.intentsForWatchdog, { now });
  }
  phases.watchdog = watchdogResult.summary;

  // Phase 11: operating result.
  return {
    ok: true,
    stopped: false,
    mode: live ? EMAIL_MODE.LIVE : EMAIL_MODE.NO_SEND,
    no_transport: !live,
    generated_at: now,
    summary: {
      eligible_leads: eligibleLeads.length,
      attempted: actions.length,
      sent,
      replies: replyResults.length,
      reconciliations: reconciliations.length,
      watchdog_actions: watchdogResult.actions.length,
      watchdog_escalations: watchdogResult.escalations.length,
    },
    phases,
    escalations: watchdogResult.escalations,
  };
}
