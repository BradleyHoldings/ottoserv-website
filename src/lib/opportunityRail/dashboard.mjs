function asArray(value) { return Array.isArray(value) ? value : []; }
function clean(v) { return String(v ?? "").trim(); }

function normalizeIntent(row) {
  return row?.raw_intent && typeof row.raw_intent === "object" ? row.raw_intent : row;
}

export function buildOpportunityDashboard(input = {}) {
  const intents = asArray(input.intents || input.rows).map(normalizeIntent).filter(Boolean);
  const summary = {
    total: intents.length,
    approved: 0,
    sent_unverified: 0,
    scheduled_unverified: 0,
    retry_waiting: 0,
    human_review: 0,
    booked: 0,
    blocked: 0,
    failed: 0,
    approvals_required: 0,
  };
  for (const intent of intents) {
    const state = clean(intent.lifecycle_state);
    if (Object.hasOwn(summary, state)) summary[state] += 1;
    if (intent.approval_boundary === "jonathan_required" || asArray(intent.blockers).includes("unresolved_approval")) {
      summary.approvals_required += 1;
    }
  }

  const booking_evidence = intents
    .filter((intent) => intent.booking_evidence)
    .map((intent) => ({
      intent_id: intent.intent_id,
      lead_id: intent.lead_ref?.lead_id,
      provider_event_id: intent.booking_evidence.provider_event_id,
      scheduled_start_at: intent.booking_evidence.scheduled_start_at,
      attendee: intent.booking_evidence.attendee,
      status: intent.booking_evidence.status,
    }));

  const lead_next_actions = intents.map((intent) => ({
    intent_id: intent.intent_id,
    lead_id: intent.lead_ref?.lead_id,
    opportunity_stage: intent.lifecycle_state,
    selected_action: intent.selected_action,
    next_attempt_at: intent.next_attempt_at || null,
    blockers: asArray(intent.blockers),
    retries: intent.retries || null,
    booking_evidence_ref: intent.booking_evidence?.provider_event_id || null,
  }));

  return {
    summary,
    intents: intents.map((intent) => ({
      intent_id: intent.intent_id,
      lead_id: intent.lead_ref?.lead_id,
      lead_version: intent.lead_ref?.version,
      lifecycle_state: intent.lifecycle_state,
      selected_action: intent.selected_action,
      approval_boundary: intent.approval_boundary,
      blockers: asArray(intent.blockers),
      failures: asArray(intent.failures),
      retries: intent.retries || null,
      next_attempt_at: intent.next_attempt_at || null,
    })),
    booking_evidence,
    failures: intents.filter((intent) => intent.lifecycle_state === "failed" || asArray(intent.failures).length),
    blockers: intents.filter((intent) => intent.lifecycle_state === "blocked" || asArray(intent.blockers).length),
    approvals: intents.filter((intent) => intent.approval_boundary === "jonathan_required" || asArray(intent.blockers).includes("unresolved_approval")),
    retries: intents.filter((intent) => intent.lifecycle_state === "retry_waiting"),
    lead_next_actions,
  };
}
