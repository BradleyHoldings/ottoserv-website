// ─── Hermes reply / outcome → lead-stage router (acquisition step 8) ──────────
//
// THE GAP THIS FILLS
// Calls and emails produce outcomes/replies, but nothing deterministically moved
// the lead to the right STAGE: booked audit/demo, not-interested, follow-up, DNC,
// or paid-client handoff. This module is that router. It is PURE and SAFE: it maps
// a recorded outcome/reply to a lead-stage decision + next action, and (for
// buyer-ready signals) emits a paid-client handoff SEED — it sends nothing, dials
// nothing, and never marks a stage without evidence (id + timestamp + outcome +
// next action). Sensitive/judgment cases route to human_review (gated).

import { buildHandoffSeed } from "./hermesPaidClientHandoff.mjs";

function clean(value) {
  return String(value ?? "").trim();
}
function lower(value) {
  return clean(value).toLowerCase();
}

// Canonical lead stages a reply/outcome can move a lead to.
export const LEAD_ROUTES = [
  "booked_audit_demo",
  "paid_client_handoff",
  "follow_up",
  "not_interested",
  "dnc",
  "disqualified",
  "human_review",
];

// Call-outcome status → route + the lead status to set. Mirrors callOutcomes.ts.
const CALL_STATUS_ROUTE = {
  booked_meeting: { route: "booked_audit_demo", status: "demo_booked", handoff: true },
  connected_interested: { route: "paid_client_handoff", status: "interested", handoff: true },
  call_back_requested: { route: "follow_up", status: "callback_scheduled" },
  needs_follow_up: { route: "follow_up", status: "needs_follow_up" },
  voicemail_left: { route: "follow_up", status: "attempted" },
  called_no_answer: { route: "follow_up", status: "attempted" },
  connected_not_interested: { route: "not_interested", status: "not_interested", terminal: true },
  do_not_contact: { route: "dnc", status: "do_not_contact", terminal: true },
  bad_number: { route: "disqualified", status: "disqualified", terminal: true },
  wrong_business: { route: "disqualified", status: "disqualified", terminal: true },
  needs_human_review: { route: "human_review", status: "needs_human_review", approval: true },
};

// Email-reply intent → route + lead status.
const REPLY_INTENT_ROUTE = {
  interested: { route: "paid_client_handoff", status: "interested", handoff: true },
  booked: { route: "booked_audit_demo", status: "demo_booked", handoff: true },
  not_interested: { route: "not_interested", status: "not_interested", terminal: true },
  unsubscribe: { route: "dnc", status: "do_not_contact", terminal: true },
  question: { route: "human_review", status: "needs_human_review", approval: true },
  objection: { route: "human_review", status: "needs_human_review", approval: true },
  negative: { route: "human_review", status: "needs_human_review", approval: true },
  auto_reply: { route: "follow_up", status: "needs_follow_up" },
  out_of_office: { route: "follow_up", status: "needs_follow_up" },
};

const NEXT_ACTION = {
  booked_audit_demo: "Confirm the audit/demo, prep the packet, and open the paid-client handoff at the proposal gate.",
  paid_client_handoff: "Open the implementation work order at the proposal/payment gate (Jonathan-approved proposal/pricing).",
  follow_up: "Queue the next approved-cadence touch within cooldown + attempt caps.",
  not_interested: "Close the lead as not interested; suppress from active cadence.",
  dnc: "Add to do-not-contact; never re-contact.",
  disqualified: "Mark disqualified (bad number / wrong business); remove from outreach.",
  human_review: "Escalate to Jonathan — needs human judgment before any further outreach.",
};

// Pull a stable evidence reference + timestamp from the outcome/reply payload.
function evidenceFrom(signal, now) {
  const id =
    clean(signal.call_id) || clean(signal.message_id) || clean(signal.outcome_id) ||
    clean(signal.reply_id) || clean(signal.evidence_reference);
  const ts = clean(signal.timestamp) || clean(signal.recorded_at) || clean(signal.received_at);
  return {
    reference: id,
    timestamp: ts,
    outcome: clean(signal.status) || clean(signal.intent) || clean(signal.disposition),
    summary: clean(signal.summary) || clean(signal.body) || "",
  };
}

/**
 * Route ONE reply/outcome to a lead stage. Pure.
 *
 * @param {object} input { lead?, outcome?, reply? }
 *   - outcome: { status (call-outcome status), call_id|outcome_id, timestamp, summary, disposition }
 *   - reply:   { intent, message_id, timestamp, body }
 * @param {object} options { now? }
 * @returns { ok, blocked_reason?, route, new_status, next_action, requires_approval,
 *            terminal, evidence, handoff_seed? }
 */
export function routeReplyOrOutcome(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const lead = input.lead || {};
  const signal = input.outcome || input.reply || {};
  const isReply = Boolean(input.reply) || Boolean(signal.intent);

  const key = isReply ? lower(signal.intent) : lower(signal.status);
  const mapping = (isReply ? REPLY_INTENT_ROUTE : CALL_STATUS_ROUTE)[key];
  if (!mapping) {
    return { ok: false, blocked_reason: `unknown_${isReply ? "reply_intent" : "call_status"}:${key || "(none)"}` };
  }

  // Evidence is mandatory before a stage move (id + timestamp + outcome + next action).
  const evidence = evidenceFrom(signal, now);
  if (!evidence.reference || !evidence.timestamp || !evidence.outcome) {
    return { ok: false, blocked_reason: "missing_evidence (need reference id + timestamp + outcome)" };
  }

  const route = mapping.route;
  const result = {
    ok: true,
    lead_id: clean(lead.lead_id) || clean(signal.lead_id),
    company: clean(lead.company),
    route,
    new_status: mapping.status,
    terminal: Boolean(mapping.terminal),
    requires_approval: Boolean(mapping.approval),
    next_action: NEXT_ACTION[route],
    evidence: { ...evidence, next_action: NEXT_ACTION[route] },
  };

  // Buyer-ready signals seed a paid-client handoff (still proposal/payment gated).
  if (mapping.handoff) {
    result.handoff_seed = buildHandoffSeed(
      { lead, outcome: { disposition: evidence.outcome, call_id: evidence.reference, summary: evidence.summary, recorded_at: evidence.timestamp }, kind: isReply ? "lead_status" : "call_outcome" },
      { now },
    );
  }
  return result;
}

/**
 * Route many outcomes/replies. `leadsById` maps lead_id → lead for enrichment.
 * Pure. Returns { routed[], blocked[], by_route, handoff_seeds[] }.
 */
export function routeOutcomes(signals = [], leadsById = new Map(), options = {}) {
  const routed = [];
  const blocked = [];
  const by_route = {};
  const handoff_seeds = [];
  for (const s of Array.isArray(signals) ? signals : []) {
    const lead = leadsById.get(clean(s.lead_id)) || {};
    const isReply = Boolean(s.intent) && !s.status;
    const res = routeReplyOrOutcome({ lead, [isReply ? "reply" : "outcome"]: s }, options);
    if (!res.ok) { blocked.push({ lead_id: clean(s.lead_id), blocked_reason: res.blocked_reason }); continue; }
    routed.push(res);
    by_route[res.route] = (by_route[res.route] || 0) + 1;
    if (res.handoff_seed) handoff_seeds.push(res.handoff_seed);
  }
  return { generated_at: options.now || new Date().toISOString(), routed, blocked, by_route, handoff_seeds };
}
