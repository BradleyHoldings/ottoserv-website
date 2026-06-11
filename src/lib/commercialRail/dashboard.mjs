function asArray(value) { return Array.isArray(value) ? value : []; }
function clean(v) { return String(v ?? "").trim(); }

function normalizeIntent(row) {
  return row?.raw_intent && typeof row.raw_intent === "object" ? row.raw_intent : row;
}

export function buildCommercialDashboard(input = {}) {
  const intents = asArray(input.intents || input.rows).map(normalizeIntent).filter(Boolean);
  const summary = {
    total: intents.length,
    approved_offer_selected: 0,
    approval_required: 0,
    payment_link_created: 0,
    checkout_started_unpaid: 0,
    paid_verified: 0,
    client_onboarding_created: 0,
    onboarding_invited: 0,
    payment_link_expired: 0,
    payment_failed: 0,
    refund_review_required: 0,
    dispute_review_required: 0,
    blocked: 0,
    failed: 0,
    approvals_required: 0,
  };

  for (const intent of intents) {
    const state = clean(intent.lifecycle_state);
    if (Object.hasOwn(summary, state)) summary[state] += 1;
    if (state === "approval_required" || asArray(intent.blockers).some((b) => /approval|required|custom|guarantee|contract|refund|dispute/.test(clean(b)))) summary.approvals_required += 1;
  }

  return {
    summary,
    intents: intents.map((intent) => ({
      intent_id: intent.intent_id,
      lead_id: intent.lead_ref?.lead_id,
      lead_version: intent.lead_ref?.version,
      lifecycle_state: intent.lifecycle_state,
      offer_name: intent.selected_offer?.name,
      offer_id: intent.selected_offer?.offer_id,
      amount_total: intent.selected_offer?.amount_total,
      currency: intent.selected_offer?.currency,
      payment_status: intent.payment?.status || null,
      stripe_link_id: intent.payment?.provider_link_id || null,
      stripe_session_id: intent.payment?.provider_session_id || null,
      stripe_payment_intent_id: intent.payment?.provider_payment_intent_id || null,
      onboarding_invitation: intent.onboarding?.invitation_id || intent.onboarding?.invitation_provider_message_id || null,
      onboarding_invitation_status: intent.onboarding?.invitation_status || null,
      blockers: asArray(intent.blockers),
      failures: asArray(intent.failures),
      retries: intent.retries || null,
    })),
    offer_evidence: intents.map((intent) => ({
      intent_id: intent.intent_id,
      offer_id: intent.selected_offer?.offer_id,
      source_ref: intent.selected_offer?.source_ref,
      stripe_product_id: intent.selected_offer?.stripe_product_id,
      stripe_price_id: intent.selected_offer?.stripe_price_id,
    })),
    payment_evidence: intents.filter((intent) => intent.payment).map((intent) => ({
      intent_id: intent.intent_id,
      status: intent.payment.status,
      amount_total: intent.payment.amount_total,
      currency: intent.payment.currency,
      provider_link_id: intent.payment.provider_link_id,
      provider_session_id: intent.payment.provider_session_id,
      provider_payment_intent_id: intent.payment.provider_payment_intent_id,
      customer_id: intent.payment.customer_id,
      verified_paid_at: intent.payment.verified_paid_at,
    })),
    onboarding: intents.filter((intent) => intent.onboarding).map((intent) => ({
      intent_id: intent.intent_id,
      client_id: intent.onboarding.client_id,
      project_id: intent.onboarding.project_id,
      work_order_id: intent.onboarding.work_order_id,
      invitation_id: intent.onboarding.invitation_id,
      invitation_status: intent.onboarding.invitation_status,
      invitation_provider: intent.onboarding.invitation_provider,
      invitation_provider_message_id: intent.onboarding.invitation_provider_message_id,
    })),
    approvals: intents.filter((intent) => clean(intent.lifecycle_state) === "approval_required" || asArray(intent.blockers).length),
    failures: intents.filter((intent) => /failed|expired|refund|dispute/.test(clean(intent.lifecycle_state)) || asArray(intent.failures).length),
    retries: intents.filter((intent) => Number(intent.retries?.attempt || 0) > 0),
  };
}
