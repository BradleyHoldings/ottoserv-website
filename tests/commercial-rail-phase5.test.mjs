import assert from "node:assert/strict";
import test from "node:test";

import {
  createCommercialIntent,
  selectApprovedOffer,
  evaluateCommercialPolicy,
  buildOrderSummary,
} from "../src/lib/commercialRail/intent.mjs";
import {
  createStripePaymentRequest,
  reconcileStripePaymentEvidence,
  reconcileCommercialFailures,
} from "../src/lib/commercialRail/executor.mjs";
import {
  atomicallyCreatePaidClientOnboarding,
} from "../src/lib/commercialRail/onboarding.mjs";
import { buildCommercialDashboard } from "../src/lib/commercialRail/dashboard.mjs";
import { buildCommandCenterData } from "../src/lib/commandCenter.mjs";

const NOW = "2026-06-09T15:00:00.000Z";
const BOOKED_LEAD = {
  lead_id: "lead_phase5_jonathan_controlled",
  version: 5,
  company_name: "Jonathan Controlled Phase 5 Co",
  contact_name: "Jonathan Test",
  email: "jonathan+phase5@example.com",
  pipeline_stage: "booked_next_step",
  booking_evidence: {
    provider_event_id: "cal_evt_phase4_controlled",
    scheduled_start_at: "2026-06-10T14:00:00.000Z",
    attendee: "jonathan+phase5@example.com",
    status: "confirmed",
  },
};

test("commercial intent uses deterministic IDs and only selected approved offers", () => {
  const offer = selectApprovedOffer("front_office_leak_check_pilot");
  const first = createCommercialIntent({ lead: BOOKED_LEAD, offer }, { now: NOW });
  const second = createCommercialIntent({ lead: BOOKED_LEAD, offer }, { now: NOW });

  assert.equal(offer.approved, true);
  assert.equal(first.intent_id, second.intent_id);
  assert.match(first.intent_id, /^comm_v1_/);
  assert.equal(first.lead_ref.lead_id, BOOKED_LEAD.lead_id);
  assert.equal(first.lead_ref.version, 5);
  assert.equal(first.booking_evidence.provider_event_id, "cal_evt_phase4_controlled");
  assert.equal(first.selected_offer.offer_id, "front_office_leak_check_pilot");
  assert.equal(first.selected_offer.stripe_price_id, "price_1TdCMP00uJ9dJLfUM8F9HYTi");
  assert.equal(first.policy_receipt.requires_jonathan_approval, false);
  assert.equal(first.lifecycle_state, "approved_offer_selected");
});

test("commercial policy blocks custom terms, stale lead versions, and nonstandard Stripe products", () => {
  const approved = createCommercialIntent({
    lead: BOOKED_LEAD,
    offer: selectApprovedOffer("front_office_leak_check_pilot"),
  }, { now: NOW });
  const custom = {
    ...approved,
    requested_terms: { discount_percent: 25, guarantee: "double revenue", custom_scope: "new integration" },
    selected_offer: { ...approved.selected_offer, stripe_price_id: "price_new_unapproved" },
  };

  const result = evaluateCommercialPolicy(custom, {
    lead: { ...BOOKED_LEAD, version: 6 },
    approvedStripePriceIds: ["price_1TdCMP00uJ9dJLfUM8F9HYTi"],
    now: NOW,
  });

  assert.equal(result.allowed, false);
  assert.deepEqual(result.blocked_reasons.sort(), [
    "custom_pricing_or_discount_requires_approval",
    "custom_scope_requires_approval",
    "guarantee_requires_approval",
    "stale_lead_version",
    "unapproved_stripe_price",
  ]);
});

test("order summary is truthful approved data and payment links are idempotent", async () => {
  const intent = createCommercialIntent({
    lead: BOOKED_LEAD,
    offer: selectApprovedOffer("front_office_leak_check_pilot"),
  }, { now: NOW });
  const summary = buildOrderSummary(intent);
  const client = fakeCommercialClient();
  const stripe = fakeStripe();

  const first = await createStripePaymentRequest(intent, { client, stripe, now: NOW });
  const rerun = await createStripePaymentRequest(intent, { client, stripe, now: NOW });

  assert.match(summary.subject, /Automation Audit/);
  assert.match(summary.body, /1\.00 USD/);
  assert.doesNotMatch(summary.body, /guarantee|discount|custom/i);
  assert.equal(first.ok, true);
  assert.equal(first.intent.lifecycle_state, "payment_link_created");
  assert.equal(first.intent.payment.provider_link_id, "plink_1");
  assert.equal(first.intent.payment.provider_session_id, "");
  assert.equal(first.intent.payment.amount_total, 100);
  assert.deepEqual(client.upserts.map((row) => row.version), [1, 2]);
  assert.equal(stripe.created.length, 1);
  assert.equal(rerun.idempotent, true);
  assert.equal(stripe.created.length, 1);
});

test("verified Stripe payment evidence is required before paid state and onboarding", async () => {
  const client = fakeCommercialClient();
  const intent = (await createStripePaymentRequest(createCommercialIntent({
    lead: BOOKED_LEAD,
    offer: selectApprovedOffer("front_office_leak_check_pilot"),
  }, { now: NOW }), { client, stripe: fakeStripe(), now: NOW })).intent;

  const checkoutStarted = await reconcileStripePaymentEvidence(intent, {
    type: "checkout.session.async_payment_pending",
    id: "evt_pending",
    data: { object: { id: "cs_test_pending", payment_status: "unpaid", amount_total: 100, currency: "usd" } },
  }, { client, now: NOW });
  assert.equal(checkoutStarted.ok, false);
  assert.equal(checkoutStarted.intent.lifecycle_state, "checkout_started_unpaid");

  const paid = await reconcileStripePaymentEvidence(intent, {
    type: "checkout.session.completed",
    id: "evt_paid",
    data: {
      object: {
        id: "cs_test_paid",
        payment_status: "paid",
        payment_intent: "pi_test_paid",
        amount_total: 100,
        currency: "usd",
        customer: "cus_test_phase5",
        customer_details: { email: "jonathan+phase5@example.com", name: "Jonathan Test" },
      },
    },
  }, { client, now: NOW });

  assert.equal(paid.ok, true);
  assert.equal(paid.intent.lifecycle_state, "paid_verified");
  assert.equal(paid.intent.payment.provider_payment_intent_id, "pi_test_paid");
  assert.equal(paid.intent.payment.status, "paid");

  const onboarding = await atomicallyCreatePaidClientOnboarding(paid.intent, { client, lead: BOOKED_LEAD, now: NOW });
  const rerun = await atomicallyCreatePaidClientOnboarding(paid.intent, { client, lead: BOOKED_LEAD, now: NOW });

  assert.equal(onboarding.ok, true);
  assert.equal(onboarding.client_record.client_id, "client_lead_phase5_jonathan_controlled");
  assert.equal(onboarding.project.id, "PRJ-PHASE5-JONATHAN-CONTROLLED");
  assert.equal(onboarding.work_order.id, "WO-PHASE5-JONATHAN-CONTROLLED");
  assert.equal(onboarding.intent.lifecycle_state, "client_onboarding_created");
  assert.equal(onboarding.onboarding_invitation.status, "pending_send");
  assert.equal(onboarding.onboarding_invitation.provider_message_id, "");
  assert.equal(onboarding.intent.onboarding.invitation_status, "pending_send");
  assert.equal(rerun.idempotent, true);
  assert.equal(client.clients.size, 1);
  assert.equal(client.projects.size, 1);
  assert.equal(client.workOrders.size, 1);
  assert.equal(client.onboardingInvites.size, 1);
});

test("real Stripe payment_intent.succeeded evidence can verify paid state", async () => {
  const client = fakeCommercialClient();
  const intent = (await createStripePaymentRequest(createCommercialIntent({
    lead: BOOKED_LEAD,
    offer: selectApprovedOffer("front_office_leak_check_pilot"),
  }, { now: NOW }), { client, stripe: fakeStripe(), now: NOW })).intent;

  const paid = await reconcileStripePaymentEvidence(intent, {
    type: "payment_intent.succeeded",
    id: "evt_pi_paid",
    data: {
      object: {
        id: "pi_test_paid",
        status: "succeeded",
        amount_received: 100,
        currency: "usd",
        customer: "cus_test_phase5",
        receipt_email: "jonathan+phase5@example.com",
      },
    },
  }, { client, now: NOW });

  assert.equal(paid.ok, true);
  assert.equal(paid.intent.lifecycle_state, "paid_verified");
  assert.equal(paid.intent.payment.provider_payment_intent_id, "pi_test_paid");
  assert.equal(paid.intent.payment.status, "paid");
  assert.equal(paid.intent.payment.amount_total, 100);
  assert.equal(paid.intent.payment.customer_email, "jonathan+phase5@example.com");
});

test("expired, failed, refund, and dispute signals truthfully remain unpaid or blocked", () => {
  const intent = createCommercialIntent({
    lead: BOOKED_LEAD,
    offer: selectApprovedOffer("front_office_leak_check_pilot"),
  }, { now: NOW });

  const reconciled = reconcileCommercialFailures([
    { ...intent, lifecycle_state: "payment_link_created", expires_at: "2026-06-09T14:00:00.000Z" },
    { ...intent, intent_id: "comm_v1_failed", lifecycle_state: "checkout_started_unpaid", payment: { status: "failed" } },
    { ...intent, intent_id: "comm_v1_refund", lifecycle_state: "paid_verified", payment: { status: "refunded" } },
    { ...intent, intent_id: "comm_v1_dispute", lifecycle_state: "paid_verified", payment: { status: "disputed" } },
  ], { now: NOW });

  assert.equal(reconciled.updated[0].lifecycle_state, "payment_link_expired");
  assert.equal(reconciled.updated[1].lifecycle_state, "payment_failed");
  assert.equal(reconciled.updated[2].lifecycle_state, "refund_review_required");
  assert.equal(reconciled.updated[3].lifecycle_state, "dispute_review_required");
});

test("admin command center exposes Phase 5 commercial states and hides them from clients", () => {
  const commercialRail = buildCommercialDashboard({
    intents: [
      { intent_id: "comm_approval", lifecycle_state: "approval_required", selected_offer: { name: "Custom" }, blockers: ["custom_scope_requires_approval"] },
      { intent_id: "comm_paid", lifecycle_state: "paid_verified", selected_offer: { name: "Automation Audit" }, payment: { status: "paid", amount_total: 100, currency: "usd" } },
      { intent_id: "comm_onboarding", lifecycle_state: "client_onboarding_created", onboarding: { invitation_status: "pending_send" } },
      { intent_id: "comm_failed", lifecycle_state: "payment_failed", failures: [{ reason: "card_declined" }] },
    ],
  });

  const admin = buildCommandCenterData({ commercialRail }, { role: "ottoserv_admin" });
  const client = buildCommandCenterData({ commercialRail }, { role: "client_owner" });

  assert.equal(admin.commercialRail.summary.total, 4);
  assert.equal(admin.commercialRail.summary.paid_verified, 1);
  assert.equal(admin.moduleCards.some((card) => card.id === "commercialRail" && card.value === 4), true);
  assert.equal(admin.alerts.some((alert) => alert.type === "commercial_rail_failure"), true);
  assert.equal(admin.alerts.some((alert) => alert.type === "commercial_rail_approval"), true);
  assert.equal(client.commercialRail, null);
});

function fakeStripe() {
  const created = [];
  return {
    created,
    async createPaymentLink(params) {
      created.push(params);
      return {
        id: `plink_${created.length}`,
        url: `https://pay.stripe.com/test/plink_${created.length}`,
        active: true,
        line_items: [{ price: params.line_items[0].price, quantity: 1 }],
        metadata: params.metadata,
      };
    },
  };
}

function fakeCommercialClient() {
  const intents = new Map();
  const linksByIntent = new Map();
  const clients = new Map();
  const projects = new Map();
  const workOrders = new Map();
  const onboardingInvites = new Map();
  const upserts = [];
  return {
    intents,
    linksByIntent,
    clients,
    projects,
    workOrders,
    onboardingInvites,
    upserts,
    async readIntent(id) { return intents.get(id) || null; },
    async upsertIntent(intent) { upserts.push(intent); intents.set(intent.intent_id, intent); return { ok: true, row: intent }; },
    async readPaymentLink(intentId) { return linksByIntent.get(intentId) || null; },
    async writePaymentLink(intentId, payment) { linksByIntent.set(intentId, payment); return { ok: true, row: payment }; },
    async atomicPaidClientOnboarding(payload) {
      const clientId = payload.client_record.client_id;
      const idempotent = clients.has(clientId);
      clients.set(clientId, payload.client_record);
      projects.set(payload.project.id, payload.project);
      workOrders.set(payload.work_order.id, payload.work_order);
      onboardingInvites.set(payload.onboarding_invitation.invitation_id, payload.onboarding_invitation);
      return { ok: true, idempotent, ...payload };
    },
  };
}
