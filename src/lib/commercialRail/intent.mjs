import crypto from "node:crypto";

export const COMMERCIAL_SCHEMA_VERSION = "phase5.v1";

export const COMMERCIAL_STATES = {
  APPROVED_OFFER_SELECTED: "approved_offer_selected",
  APPROVAL_REQUIRED: "approval_required",
  PAYMENT_LINK_CREATED: "payment_link_created",
  CHECKOUT_STARTED_UNPAID: "checkout_started_unpaid",
  PAID_VERIFIED: "paid_verified",
  CLIENT_ONBOARDING_CREATED: "client_onboarding_created",
  ONBOARDING_INVITED: "onboarding_invited",
  PAYMENT_LINK_EXPIRED: "payment_link_expired",
  PAYMENT_FAILED: "payment_failed",
  REFUND_REVIEW_REQUIRED: "refund_review_required",
  DISPUTE_REVIEW_REQUIRED: "dispute_review_required",
  BLOCKED: "blocked",
  FAILED: "failed",
};

export const APPROVED_OFFERS = [
  {
    offer_id: "front_office_leak_check_pilot",
    name: "Front Office Leak Check Pilot",
    description: "Approved low-risk test offer for a controlled front-office leak check pilot.",
    approved: true,
    amount_total: 29900,
    currency: "usd",
    stripe_product_id: "prod_test_front_office_leak_check",
    stripe_price_id: "price_test_front_office_leak_check_pilot",
    source_ref: "data/visibility-kit/clients/ottoserv.json pricing.summary",
  },
  {
    offer_id: "starter_monthly",
    name: "Starter Monthly",
    description: "Approved Starter monthly plan.",
    approved: true,
    amount_total: 24900,
    currency: "usd",
    stripe_product_id: "prod_test_ottoserv_starter",
    stripe_price_id: "price_test_ottoserv_starter_monthly",
    source_ref: "data/visibility-kit/clients/ottoserv.json pricing.summary",
  },
  {
    offer_id: "core_monthly",
    name: "Core Monthly",
    description: "Approved Core monthly plan.",
    approved: true,
    amount_total: 49900,
    currency: "usd",
    stripe_product_id: "prod_test_ottoserv_core",
    stripe_price_id: "price_test_ottoserv_core_monthly",
    source_ref: "data/visibility-kit/clients/ottoserv.json pricing.summary",
  },
];

function clean(v) { return String(v ?? "").trim(); }
function lower(v) { return clean(v).toLowerCase(); }
function asObject(v) { return v && typeof v === "object" ? v : {}; }
function asArray(v) { return Array.isArray(v) ? v : []; }
function money(cents, currency) { return `${(Number(cents || 0) / 100).toFixed(2)} ${clean(currency || "usd").toUpperCase()}`; }
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
function hashId(prefix, payload) {
  return `${prefix}_${crypto.createHash("sha256").update(stable(payload)).digest("hex").slice(0, 20)}`;
}

export function selectApprovedOffer(offerId) {
  const offer = APPROVED_OFFERS.find((item) => item.offer_id === clean(offerId));
  if (!offer) throw new Error(`approved_offer_not_found:${clean(offerId)}`);
  return JSON.parse(JSON.stringify(offer));
}

function bookingEvidenceFromLead(lead = {}) {
  const ev = asObject(lead.booking_evidence);
  return {
    provider_event_id: clean(ev.provider_event_id),
    scheduled_start_at: clean(ev.scheduled_start_at),
    attendee: clean(ev.attendee),
    status: clean(ev.status),
  };
}

export function createCommercialIntent({ lead = {}, offer = {} } = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const selected = { ...offer };
  const leadId = clean(lead.lead_id);
  const leadVersion = Number(lead.version || 1);
  const booking = bookingEvidenceFromLead(lead);
  const idempotencyKey = [
    leadId,
    `v${leadVersion}`,
    booking.provider_event_id,
    clean(selected.offer_id),
    clean(selected.stripe_price_id),
  ].join("|");

  return {
    intent_id: hashId("comm_v1", idempotencyKey),
    idempotency_key: idempotencyKey,
    schema_version: COMMERCIAL_SCHEMA_VERSION,
    lead_ref: { lead_id: leadId, version: leadVersion },
    booking_evidence: booking,
    selected_offer: {
      offer_id: clean(selected.offer_id),
      name: clean(selected.name),
      description: clean(selected.description),
      amount_total: Number(selected.amount_total || 0),
      currency: lower(selected.currency || "usd"),
      stripe_product_id: clean(selected.stripe_product_id),
      stripe_price_id: clean(selected.stripe_price_id),
      source_ref: clean(selected.source_ref),
      approved: selected.approved === true,
    },
    requested_terms: {},
    approval_boundary: "standing_approved_offer_policy",
    policy_receipt: {
      policy_ref: "hermes_phase5_commercial_policy_v1",
      approved_offer_source_ref: clean(selected.source_ref),
      requires_jonathan_approval: false,
      forbids_custom_pricing_or_terms_without_approval: true,
      forbids_new_stripe_products_without_approval: true,
      requires_verified_stripe_payment_before_paid: true,
      evaluated_at: now,
    },
    lifecycle_state: COMMERCIAL_STATES.APPROVED_OFFER_SELECTED,
    retries: { attempt: 0, max_attempts: 2 },
    blockers: [],
    failures: [],
    payment: null,
    onboarding: null,
    provider_evidence: [],
    version: 1,
    created_at: now,
    updated_at: now,
  };
}

export function evaluateCommercialPolicy(intent = {}, ctx = {}) {
  const blockers = [];
  const offer = asObject(intent.selected_offer);
  const terms = asObject(intent.requested_terms);
  const lead = asObject(ctx.lead);
  const approvedPriceIds = new Set(asArray(ctx.approvedStripePriceIds).map(clean).filter(Boolean));
  const approvedOfferIds = new Set(APPROVED_OFFERS.map((item) => item.offer_id));

  if (!offer.approved || !approvedOfferIds.has(clean(offer.offer_id))) blockers.push("unapproved_offer");
  if (approvedPriceIds.size && !approvedPriceIds.has(clean(offer.stripe_price_id))) blockers.push("unapproved_stripe_price");
  if (Number(lead.version || 0) && Number(intent.lead_ref?.version || 0) && Number(lead.version) !== Number(intent.lead_ref.version)) blockers.push("stale_lead_version");
  if (!clean(intent.booking_evidence?.provider_event_id) || !["confirmed", "accepted", "booked"].includes(lower(intent.booking_evidence?.status))) blockers.push("missing_verified_booking_evidence");
  if (terms.discount_percent || terms.custom_price || terms.refund_terms) blockers.push("custom_pricing_or_discount_requires_approval");
  if (terms.custom_scope) blockers.push("custom_scope_requires_approval");
  if (terms.guarantee) blockers.push("guarantee_requires_approval");
  if (terms.contract || terms.nonstandard_terms) blockers.push("contract_or_nonstandard_terms_requires_approval");
  if (terms.new_stripe_product || terms.new_stripe_price) blockers.push("new_stripe_product_requires_approval");

  return {
    allowed: blockers.length === 0,
    blocked_reasons: [...new Set(blockers)],
    evaluated_at: ctx.now || new Date().toISOString(),
    policy_ref: "hermes_phase5_commercial_policy_v1",
  };
}

export function buildOrderSummary(intent = {}) {
  const offer = asObject(intent.selected_offer);
  const subject = `Order summary: ${clean(offer.name)}`;
  const body = [
    `Offer: ${clean(offer.name)}`,
    `Amount: ${money(offer.amount_total, offer.currency)}`,
    `Approved source: ${clean(offer.source_ref)}`,
    `Stripe product: ${clean(offer.stripe_product_id)}`,
    `Stripe price: ${clean(offer.stripe_price_id)}`,
    `Booked evidence: ${clean(intent.booking_evidence?.provider_event_id)}`,
    "",
    "This summary uses only approved offer data from the selected catalog item.",
  ].join("\n");
  return { subject, body, to: clean(intent.target?.email), offer_id: clean(offer.offer_id), amount_total: Number(offer.amount_total || 0), currency: lower(offer.currency) };
}
