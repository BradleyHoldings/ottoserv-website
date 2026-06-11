import { COMMERCIAL_STATES, evaluateCommercialPolicy } from "./intent.mjs";

function clean(v) { return String(v ?? "").trim(); }
function lower(v) { return clean(v).toLowerCase(); }
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function asArray(v) { return Array.isArray(v) ? v : []; }

function paymentFromLink(link = {}, intent = {}, now) {
  const offer = intent.selected_offer || {};
  return {
    provider: "stripe",
    mode: "test",
    provider_link_id: clean(link.id),
    provider_link_url: clean(link.url),
    provider_session_id: "",
    provider_payment_intent_id: "",
    status: "link_created",
    amount_total: Number(offer.amount_total || 0),
    currency: lower(offer.currency || "usd"),
    stripe_product_id: clean(offer.stripe_product_id),
    stripe_price_id: clean(offer.stripe_price_id),
    customer_id: "",
    customer_email: "",
    customer_name: "",
    created_at: now,
    verified_paid_at: "",
  };
}

export async function createStripePaymentRequest(intent = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const client = options.client;
  const stripe = options.stripe;
  if (!client) return { ok: false, reason: "commercial_store_unavailable", intent };
  if (!stripe || typeof stripe.createPaymentLink !== "function") return { ok: false, reason: "stripe_transport_unavailable", intent };

  const existing = await client.readPaymentLink?.(intent.intent_id);
  if (existing) {
    return {
      ok: true,
      idempotent: true,
      intent: { ...intent, lifecycle_state: COMMERCIAL_STATES.PAYMENT_LINK_CREATED, payment: existing, updated_at: now },
    };
  }

  const policy = evaluateCommercialPolicy(intent, {
    lead: options.lead || { version: intent.lead_ref?.version },
    approvedStripePriceIds: [intent.selected_offer?.stripe_price_id],
    now,
  });
  if (!policy.allowed) {
    const blocked = { ...intent, lifecycle_state: COMMERCIAL_STATES.APPROVAL_REQUIRED, blockers: policy.blocked_reasons, updated_at: now };
    await client.upsertIntent?.(blocked);
    return { ok: false, reason: "policy_blocked", policy, intent: blocked };
  }

  const initialWrite = await client.upsertIntent?.(intent);
  if (initialWrite && initialWrite.ok === false) {
    return { ok: false, reason: initialWrite.reason || initialWrite.error || "commercial_intent_initial_write_failed", intent };
  }

  const link = await stripe.createPaymentLink({
    line_items: [{ price: intent.selected_offer.stripe_price_id, quantity: 1 }],
    metadata: {
      commercial_intent_id: intent.intent_id,
      idempotency_key: intent.idempotency_key,
      lead_id: intent.lead_ref?.lead_id,
      offer_id: intent.selected_offer?.offer_id,
    },
  });
  const payment = paymentFromLink(link, intent, now);
  await client.writePaymentLink?.(intent.intent_id, payment);
  const next = { ...intent, lifecycle_state: COMMERCIAL_STATES.PAYMENT_LINK_CREATED, payment, updated_at: now, version: Number(intent.version || 1) + 1 };
  await client.upsertIntent?.(next);
  return { ok: true, intent: next, payment };
}

function stripeObject(event = {}) {
  return event?.data?.object && typeof event.data.object === "object" ? event.data.object : {};
}

export async function reconcileStripePaymentEvidence(intent = {}, event = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const obj = stripeObject(event);
  const basePayment = intent.payment || {};
  const evidence = {
    provider: "stripe",
    provider_event_id: clean(event.id),
    event_type: clean(event.type),
    received_at: now,
    raw_status: clean(obj.payment_status || obj.status),
  };
  let next = clone(intent);
  next.provider_evidence = [...asArray(next.provider_evidence), evidence];
  next.updated_at = now;

  if (clean(event.type) === "checkout.session.completed" && lower(obj.payment_status) === "paid") {
    next.lifecycle_state = COMMERCIAL_STATES.PAID_VERIFIED;
    next.payment = {
      ...basePayment,
      provider: "stripe",
      provider_session_id: clean(obj.id),
      provider_payment_intent_id: clean(obj.payment_intent),
      status: "paid",
      amount_total: Number(obj.amount_total || basePayment.amount_total || 0),
      currency: lower(obj.currency || basePayment.currency || "usd"),
      customer_id: clean(obj.customer),
      customer_email: clean(obj.customer_details?.email),
      customer_name: clean(obj.customer_details?.name),
      verified_paid_at: now,
      provider_event_id: clean(event.id),
    };
    next.version = Number(next.version || 1) + 1;
    await options.client?.upsertIntent?.(next);
    return { ok: true, intent: next, evidence };
  }

  if (clean(event.type) === "payment_intent.succeeded" && lower(obj.status) === "succeeded") {
    next.lifecycle_state = COMMERCIAL_STATES.PAID_VERIFIED;
    next.payment = {
      ...basePayment,
      provider: "stripe",
      provider_session_id: clean(basePayment.provider_session_id),
      provider_payment_intent_id: clean(obj.id),
      status: "paid",
      amount_total: Number(obj.amount_received || obj.amount || basePayment.amount_total || 0),
      currency: lower(obj.currency || basePayment.currency || "usd"),
      customer_id: clean(obj.customer),
      customer_email: clean(obj.receipt_email || basePayment.customer_email),
      customer_name: clean(basePayment.customer_name),
      verified_paid_at: now,
      provider_event_id: clean(event.id),
    };
    next.version = Number(next.version || 1) + 1;
    await options.client?.upsertIntent?.(next);
    return { ok: true, intent: next, evidence };
  }

  next.lifecycle_state = lower(obj.payment_status) === "unpaid"
    ? COMMERCIAL_STATES.CHECKOUT_STARTED_UNPAID
    : COMMERCIAL_STATES.PAYMENT_FAILED;
  next.payment = { ...basePayment, provider_session_id: clean(obj.id), status: lower(obj.payment_status || obj.status || "unpaid") };
  next.version = Number(next.version || 1) + 1;
  await options.client?.upsertIntent?.(next);
  return { ok: false, reason: "payment_not_verified_paid", intent: next, evidence };
}

export function reconcileCommercialFailures(intents = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const updated = [];
  const unchanged = [];
  for (const intent of intents || []) {
    const paymentStatus = lower(intent.payment?.status);
    if (intent.lifecycle_state === COMMERCIAL_STATES.PAYMENT_LINK_CREATED && clean(intent.expires_at) && new Date(intent.expires_at) <= new Date(now)) {
      updated.push({ ...intent, lifecycle_state: COMMERCIAL_STATES.PAYMENT_LINK_EXPIRED, updated_at: now, version: Number(intent.version || 1) + 1 });
    } else if (paymentStatus === "failed") {
      updated.push({ ...intent, lifecycle_state: COMMERCIAL_STATES.PAYMENT_FAILED, updated_at: now, version: Number(intent.version || 1) + 1 });
    } else if (paymentStatus === "refunded") {
      updated.push({ ...intent, lifecycle_state: COMMERCIAL_STATES.REFUND_REVIEW_REQUIRED, blockers: [...new Set([...(intent.blockers || []), "refund_signal"])], updated_at: now, version: Number(intent.version || 1) + 1 });
    } else if (paymentStatus === "disputed") {
      updated.push({ ...intent, lifecycle_state: COMMERCIAL_STATES.DISPUTE_REVIEW_REQUIRED, blockers: [...new Set([...(intent.blockers || []), "dispute_signal"])], updated_at: now, version: Number(intent.version || 1) + 1 });
    } else {
      unchanged.push(intent);
    }
  }
  return { updated, unchanged, summary: { updated: updated.length, unchanged: unchanged.length } };
}
