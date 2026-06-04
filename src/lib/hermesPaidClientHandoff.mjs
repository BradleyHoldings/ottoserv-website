// ─── Hermes paid-client handoff (Autonomy v2, sprint priority 4) ──────────────
//
// THE GAP THIS FILLS
// The implementation spine (implementationWorkOrders.mjs) is solid — seed → durable
// work order → gated proposal/payment ladder → build packet → evidence. But its
// ONLY entry point was a Front Office Leak Check report seed
// (revenueLoopSources.buildImplementationWorkOrders). An INTERESTED LEAD — e.g. the
// call rail (priority 1) just logged a `booked_demo`, or a lead replied
// "interested" — had NO path into the spine. So the moment a lead became a buyer,
// Hermes dropped it back to a human to remember to open a work order.
//
// This module is that missing bridge. It converts an interested lead / qualified
// call outcome / audit result into an implementation work-order SEED that is shape-
// compatible with `seedToImplementationWorkOrder`, landing at the
// `awaiting_pilot_scope_or_proposal` stage — i.e. straight onto the proposal/
// payment gate. From there the EXISTING ladder takes over (no rebuild).
//
// SAFETY: PURE. It produces seeds/descriptors only. It opens no payment link, sends
// no proposal, charges nothing, and builds nothing — every money/client-facing step
// stays gated by the work order's stage ladder + IMPLEMENTATION_GATED_ACTIONS.

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function lower(value) {
  return clean(value).toLowerCase();
}
function slug(value) {
  return lower(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

// Call dispositions that signal a buyer-ready handoff (from hermesCallRail).
export const INTERESTED_DISPOSITIONS = new Set(["booked_demo", "callback_scheduled"]);
// Lead statuses that signal interest (set by outreach/reply handling).
export const INTERESTED_LEAD_STATUSES = new Set([
  "interested", "booked", "demo_booked", "qualified", "audit_complete", "audit_booked",
]);

// Evidence/test-plan pointers every handoff carries into the spine.
function handoffRequiredEvidence() {
  return [
    "Interest proof: call id / reply / booking reference with timestamp.",
    "Signed pilot scope OR paid pilot (Stripe confirmation) before implementation opens.",
    "Codex commit hash + build/test/route-check output for each implemented automation.",
    "Final client-facing deliverable approved by Jonathan before send.",
  ];
}

/**
 * Build an implementation work-order SEED from an interest signal. Pure.
 *
 * @param {object} signal {
 *   lead?:    lead-intent / revenue-loop lead (company, contact, email, phone, intent),
 *   outcome?: { disposition, call_id, summary, recorded_at },  // optional call outcome
 *   kind?:    'call_outcome' | 'lead_status' | 'audit',
 * }
 * @param {object} options { now? }
 */
export function buildHandoffSeed(signal = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const lead = signal.lead || {};
  const outcome = signal.outcome || null;
  const id = clean(lead.lead_id) || slug(lead.company) || "lead";
  const company = clean(lead.company) || "Unknown company";
  const angle = clean(lead.intent?.likely_ottoserv_angle);
  const offer = clean(lead.intent?.recommended_offer);
  const kind = clean(signal.kind) || (outcome ? "call_outcome" : "lead_status");

  return {
    id: `handoff-${slug(id)}`,
    source: "interested_lead_handoff",
    handoff_kind: kind,
    scan_id: "",
    lead_id: id,
    company,
    contact: clean(lead.contact_name),
    email: clean(lead.email),
    main_leak: clean(lead.pain_point) || clean(lead.buying_signal) || "missed-call / slow-follow-up revenue leak",
    pilot_recommendation: offer || angle || "30-day AI Lead Handler pilot (answer calls, recover missed calls, qualify + book).",
    automation_opportunities: asArray(lead.intent?.automation_opportunities).length
      ? asArray(lead.intent?.automation_opportunities)
      : ["AI receptionist / missed-call recovery", "Lead qualification + booking", "Follow-up automation"],
    report_url: "",
    // Land straight on the proposal/payment gate — interest is already established.
    stage: "awaiting_pilot_scope_or_proposal",
    next_action: "Scope the pilot → send an APPROVED proposal/payment link → open the implementation work order on payment.",
    approval_required: true,
    approval_reason: "Pilot scope, pricing, proposal, and payment link are client-facing/financial and require Jonathan approval.",
    evidence_requirement: "Signed pilot scope or paid pilot (Stripe confirmation) before the implementation work order opens.",
    required_evidence: handoffRequiredEvidence(),
    interest_signal: {
      kind,
      disposition: outcome ? clean(outcome.disposition) : "",
      lead_status: clean(lead.status),
      call_id: outcome ? clean(outcome.call_id) : "",
      summary: outcome ? clean(outcome.summary) : clean(lead.intent?.intent_evidence_summary),
      source_url: clean(lead.source_url),
      recorded_at: outcome ? (clean(outcome.recorded_at) || now) : now,
    },
  };
}

// Is this lead/outcome an interested, buyer-ready signal?
function isInterestedLead(lead) {
  return INTERESTED_LEAD_STATUSES.has(lower(lead.status));
}
function isInterestedOutcome(outcome) {
  return INTERESTED_DISPOSITIONS.has(lower(outcome.disposition));
}

// Does an existing work order already cover this lead/company? (idempotency)
function alreadyHasWorkOrder(seed, existingWorkOrders) {
  const lid = lower(seed.lead_id);
  const co = lower(seed.company);
  return asArray(existingWorkOrders).some((wo) => {
    const sid = lower(wo.source_seed_id);
    const client = lower(wo.client);
    return (sid && (sid === lower(seed.id) || sid.includes(lid))) || (co && client === co);
  });
}

/**
 * Detect interested leads / qualified call outcomes / audits and produce
 * implementation work-order seeds, deduped against existing work orders. Pure.
 *
 * @param {object} input {
 *   leads?, callOutcomes?, existingWorkOrders?, now?
 * }
 * @returns { generated_at, seeds[], skipped_existing, summary }
 */
export function detectInterestedHandoffs(input = {}) {
  const now = input.now || new Date().toISOString();
  const leads = asArray(input.leads);
  const outcomes = asArray(input.callOutcomes);
  const existing = asArray(input.existingWorkOrders);
  const leadById = new Map();
  for (const l of leads) {
    const id = clean(l.lead_id) || slug(l.company);
    if (id) leadById.set(id, l);
  }

  const seeds = [];
  const seen = new Set();
  let skipped_existing = 0;

  const pushSeed = (signal) => {
    const seed = buildHandoffSeed(signal, { now });
    if (seen.has(seed.id)) return;
    if (alreadyHasWorkOrder(seed, existing)) { skipped_existing += 1; seen.add(seed.id); return; }
    seen.add(seed.id);
    seeds.push(seed);
  };

  // 1. Qualified call outcomes → handoff (joins to the lead when available).
  for (const o of outcomes) {
    if (!isInterestedOutcome(o)) continue;
    const lid = clean(o.lead_id);
    const lead = leadById.get(lid) || { lead_id: lid, company: clean(o.company) };
    pushSeed({ lead, outcome: o, kind: "call_outcome" });
  }

  // 2. Leads whose status indicates interest → handoff.
  for (const l of leads) {
    if (!isInterestedLead(l)) continue;
    pushSeed({ lead: l, kind: "lead_status" });
  }

  return {
    generated_at: now,
    seeds,
    skipped_existing,
    summary: {
      interested_signals: seeds.length + skipped_existing,
      new_handoff_seeds: seeds.length,
      skipped_existing,
    },
  };
}
