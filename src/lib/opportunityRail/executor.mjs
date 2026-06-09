import { upsertLeads } from "../leadRail/store.mjs";
import { ACTION_KIND, LIFECYCLE_STATE } from "./intent.mjs";
import { evaluateOpportunityPolicy } from "./policy.mjs";

function clean(v) { return String(v ?? "").trim(); }
function clone(v) { return JSON.parse(JSON.stringify(v)); }

function receiptFor(kind, result = {}, now) {
  return {
    kind,
    provider_message_id: clean(result.provider_message_id),
    provider_event_id: clean(result.provider_event_id),
    sent_at: now,
    status: result.ok === false ? "failed" : "sent",
  };
}

function validBookingEvidence(evidence = {}) {
  return Boolean(
    clean(evidence.provider_event_id)
    && clean(evidence.scheduled_start_at)
    && clean(evidence.attendee)
    && ["confirmed", "accepted", "booked"].includes(clean(evidence.status).toLowerCase())
  );
}

function asArray(v) { return Array.isArray(v) ? v : []; }

function minutesBetween(a, b) {
  const end = Date.parse(clean(a));
  const start = Date.parse(clean(b));
  if (Number.isNaN(end) || Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((end - start) / 60000));
}

async function updateLeadToBooked(intent, evidence, options = {}) {
  const leadStore = options.leadStore || {};
  const lead_id = clean(intent.lead_ref?.lead_id);
  if (!lead_id) return { ok: false, reason: "missing_lead_id" };
  const readAll = await (leadStore.client?.readAll ? leadStore.client.readAll() : []);
  const lead = readAll.find((row) => clean(row.lead_id) === lead_id);
  if (!lead) return { ok: false, reason: "lead_not_found" };
  if (Number(lead.version || 0) !== Number(intent.lead_ref?.version || 0)) {
    return { ok: false, reason: "stale_lead_version", current_version: lead.version };
  }
  const now = options.now || new Date().toISOString();
  const next = {
    ...lead,
    pipeline_stage: "booked_next_step",
    eligibility: "booked",
    next_action: "prepare_meeting",
    booking_evidence: {
      provider_event_id: evidence.provider_event_id,
      scheduled_start_at: evidence.scheduled_start_at,
      attendee: evidence.attendee,
      source_intent_id: intent.intent_id,
      status: evidence.status,
    },
    sequence_status: "stopped",
    last_validated_at: now,
    updated_at: now,
    version: Number(lead.version || 1) + 1,
  };
  const persisted = await upsertLeads([next], { ...leadStore, now });
  const result = persisted.results?.[0];
  if (result?.status !== "persisted") return { ok: false, reason: result?.reason || "lead_update_failed", persistence: persisted };
  return { ok: true, lead: next, persistence: persisted };
}

export async function executeOpportunityIntent(intent = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const lead = options.lead || {};
  const policy = evaluateOpportunityPolicy(intent, { ...options, lead });
  if (!policy.allowed) {
    return {
      ok: false,
      contacted: false,
      reason: "policy_blocked",
      policy,
      intent: { ...intent, lifecycle_state: LIFECYCLE_STATE.BLOCKED, blockers: policy.blocked_reasons, updated_at: now },
      lead_updated: false,
    };
  }

  const next = clone(intent);
  next.updated_at = now;
  next.policy_receipt = { ...(next.policy_receipt || {}), last_evaluated_at: now, blocked_reasons: [] };

  if (intent.selected_action === ACTION_KIND.RECOVER_NO_CONNECT) {
    const recovery = intent.recovery_plan || {};
    next.lifecycle_state = recovery.next_action === "approved_email_fallback" ? LIFECYCLE_STATE.APPROVED : LIFECYCLE_STATE.RETRY_WAITING;
    next.next_attempt_at = clean(recovery.retry_after) || new Date(new Date(now).getTime() + 4 * 60 * 60 * 1000).toISOString();
    next.retries = { ...(next.retries || {}), attempt: Number(next.retries?.attempt || 0) + 1 };
    return { ok: true, contacted: false, intent: next, lead_updated: false, recovery_plan: recovery };
  }

  if (intent.selected_action === ACTION_KIND.PREPARE_HUMAN_REVIEW_PACKET) {
    next.lifecycle_state = LIFECYCLE_STATE.HUMAN_REVIEW;
    next.human_review_packet = {
      lead_ref: intent.lead_ref,
      source_evidence: intent.source_evidence,
      selected_action: intent.selected_action,
      approval_boundary: intent.approval_boundary || "jonathan_required",
    };
    return { ok: true, contacted: false, intent: next, lead_updated: false };
  }

  const transport = options.transport;
  if (!transport || typeof transport.send !== "function") {
    next.lifecycle_state = LIFECYCLE_STATE.BLOCKED;
    next.blockers = [...(next.blockers || []), "transport_unavailable"];
    return { ok: false, contacted: false, reason: "transport_unavailable", intent: next, lead_updated: false };
  }

  const sendResult = await transport.send({
    to: intent.target?.email || lead.email,
    phone: intent.target?.phone || lead.normalized_phone || lead.phone,
    action: intent.selected_action,
    lead_ref: intent.lead_ref,
    source_intent_id: intent.intent_id,
  });
  next.action_receipt = receiptFor(intent.selected_action, sendResult, now);
  if (sendResult?.ok === false) {
    next.lifecycle_state = LIFECYCLE_STATE.FAILED;
    next.failures = [...(next.failures || []), { reason: sendResult.reason || "transport_failed", at: now }];
    return { ok: false, contacted: false, reason: sendResult.reason || "transport_failed", intent: next, lead_updated: false };
  }

  next.lifecycle_state = intent.selected_action === ACTION_KIND.SCHEDULE_APPROVED_CALLBACK
    ? LIFECYCLE_STATE.SCHEDULED_UNVERIFIED
    : LIFECYCLE_STATE.SENT_UNVERIFIED;
  next.attempts = Number(next.attempts || 0) + 1;
  return { ok: true, contacted: true, intent: next, lead_updated: false };
}

export async function reconcileBookingEvidence(intent = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const evidence = options.bookingEvidence || {};
  if (!validBookingEvidence(evidence)) {
    return { ok: false, reason: "booking_evidence_incomplete", intent, lead_updated: false };
  }
  const leadUpdate = await updateLeadToBooked(intent, evidence, { ...options, now });
  if (!leadUpdate.ok) return { ok: false, reason: leadUpdate.reason, intent, lead_updated: false, lead_persistence: leadUpdate.persistence };
  return {
    ok: true,
    intent: {
      ...intent,
      lifecycle_state: LIFECYCLE_STATE.BOOKED,
      booking_evidence: {
        provider_event_id: evidence.provider_event_id,
        scheduled_start_at: evidence.scheduled_start_at,
        attendee: evidence.attendee,
        source_action: intent.intent_id,
        status: evidence.status,
      },
      updated_at: now,
    },
    lead_updated: true,
    lead: leadUpdate.lead,
  };
}

export function reconcileOpportunityTimeouts(intents = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const unverifiedTimeoutMinutes = Number(options.unverifiedTimeoutMinutes || 120);
  const updated = [];
  const unchanged = [];
  const summary = { expired_claims_released: 0, unverified_escalated: 0 };

  for (const intent of asArray(intents)) {
    if (intent.lifecycle_state === LIFECYCLE_STATE.CLAIMED && clean(intent.lease_expires_at) && new Date(intent.lease_expires_at) <= new Date(now)) {
      updated.push({
        ...intent,
        lifecycle_state: LIFECYCLE_STATE.APPROVED,
        lease_owner: "",
        lease_expires_at: "",
        updated_at: now,
        version: Number(intent.version || 1) + 1,
      });
      summary.expired_claims_released += 1;
      continue;
    }

    if (
      [LIFECYCLE_STATE.SENT_UNVERIFIED, LIFECYCLE_STATE.SCHEDULED_UNVERIFIED].includes(intent.lifecycle_state)
      && minutesBetween(now, intent.action_receipt?.sent_at || intent.updated_at || intent.created_at) >= unverifiedTimeoutMinutes
    ) {
      updated.push({
        ...intent,
        lifecycle_state: LIFECYCLE_STATE.HUMAN_REVIEW,
        blockers: [...new Set([...(intent.blockers || []), "booking_evidence_timeout"])],
        updated_at: now,
        version: Number(intent.version || 1) + 1,
      });
      summary.unverified_escalated += 1;
      continue;
    }

    unchanged.push(intent);
  }

  return { updated, unchanged, summary };
}
