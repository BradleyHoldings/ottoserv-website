import crypto from "node:crypto";

export const ACTION_KIND = {
  SEND_MEETING_LINK: "send_meeting_link",
  SEND_LEAK_CHECK_INVITATION: "send_leak_check_invitation",
  SEND_FULL_PROCESS_AUDIT_INVITATION: "send_full_process_audit_invitation",
  SCHEDULE_APPROVED_CALLBACK: "schedule_approved_callback",
  PREPARE_HUMAN_REVIEW_PACKET: "prepare_human_review_packet",
  RECOVER_NO_CONNECT: "recover_no_connect",
};

export const LIFECYCLE_STATE = {
  PROPOSED: "proposed",
  APPROVED: "approved",
  APPROVAL_REQUIRED: "approval_required",
  CLAIMED: "claimed",
  SENT_UNVERIFIED: "sent_unverified",
  SCHEDULED_UNVERIFIED: "scheduled_unverified",
  RETRY_WAITING: "retry_waiting",
  HUMAN_REVIEW: "human_review",
  BOOKED: "booked",
  BLOCKED: "blocked",
  FAILED: "failed",
};

const HUMAN_REVIEW_CLASSES = new Set(["question", "objection", "ambiguous"]);
const POSITIVE_CLASSES = new Set(["positive_interest", "interested"]);
const MEETING_CLASSES = new Set(["meeting_requested"]);
const CALLBACK_CLASSES = new Set(["callback_requested"]);
const NO_CONNECT_CLASSES = new Set(["no_answer", "voicemail", "busy", "failed", "ambiguous"]);

function clean(v) { return String(v ?? "").trim(); }
function lower(v) { return clean(v).toLowerCase(); }
function asObject(v) { return v && typeof v === "object" ? v : {}; }
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

function hashId(prefix, payload) {
  return `${prefix}_${crypto.createHash("sha256").update(stable(payload)).digest("hex").slice(0, 24)}`;
}

function sourceKey(source = {}) {
  return clean(source.provider_event_id)
    || clean(source.provider_call_id)
    || clean(source.execution_id)
    || clean(source.id)
    || hashId("source", source);
}

function signalOf(source = {}) {
  return lower(source.classification || source.outcome || source.intent || source.kind);
}

function recoveryPlan(source = {}, now = new Date().toISOString()) {
  const attempt = Number(source.attempt || 0);
  if (attempt >= 2 && clean(source.fallback_email)) {
    return { next_action: "approved_email_fallback", channel: "email", retry_after: source.retry_after || now };
  }
  if (attempt >= 3) {
    return { next_action: "escalate", channel: "human_review", retry_after: source.retry_after || now };
  }
  const retryAfter = source.retry_after || new Date(new Date(now).getTime() + 4 * 60 * 60 * 1000).toISOString();
  return { next_action: "retry_later", channel: "call", retry_after: retryAfter };
}

export function routeOpportunityAction({ lead = {}, source = {} } = {}, options = {}) {
  const signal = signalOf(source);
  const leadNext = lower(lead.next_action);
  const fit = asObject(lead.fit_validation);

  if (MEETING_CLASSES.has(signal)) {
    return { selected_action: ACTION_KIND.SEND_MEETING_LINK, lifecycle_state: LIFECYCLE_STATE.APPROVED, approval_boundary: "standing_policy" };
  }
  if (CALLBACK_CLASSES.has(signal)) {
    return { selected_action: ACTION_KIND.SCHEDULE_APPROVED_CALLBACK, lifecycle_state: LIFECYCLE_STATE.APPROVED, approval_boundary: "standing_policy" };
  }
  if (signal === "ambiguous" && lower(source.source_type) === "call_outcome") {
    return {
      selected_action: ACTION_KIND.RECOVER_NO_CONNECT,
      lifecycle_state: LIFECYCLE_STATE.APPROVED,
      approval_boundary: "standing_policy",
      recovery_plan: recoveryPlan(source, options.now),
    };
  }
  if (HUMAN_REVIEW_CLASSES.has(signal) || leadNext === "manual_review" || leadNext === "human_review") {
    return { selected_action: ACTION_KIND.PREPARE_HUMAN_REVIEW_PACKET, lifecycle_state: LIFECYCLE_STATE.HUMAN_REVIEW, approval_boundary: "jonathan_required" };
  }
  if (NO_CONNECT_CLASSES.has(signal)) {
    return {
      selected_action: ACTION_KIND.RECOVER_NO_CONNECT,
      lifecycle_state: LIFECYCLE_STATE.APPROVED,
      approval_boundary: "standing_policy",
      recovery_plan: recoveryPlan(source, options.now),
    };
  }
  if (leadNext === "prepare_proposal" || leadNext === "proposal") {
    return { selected_action: ACTION_KIND.PREPARE_HUMAN_REVIEW_PACKET, lifecycle_state: LIFECYCLE_STATE.HUMAN_REVIEW, approval_boundary: "jonathan_required" };
  }
  if (POSITIVE_CLASSES.has(signal) || leadNext === "route_to_leak_check" || leadNext === "route_to_process_audit") {
    if (fit.process_audit_fit === true || leadNext === "route_to_process_audit") {
      return { selected_action: ACTION_KIND.SEND_FULL_PROCESS_AUDIT_INVITATION, lifecycle_state: LIFECYCLE_STATE.APPROVED, approval_boundary: "standing_policy" };
    }
    if (fit.leak_check_fit !== false || leadNext === "route_to_leak_check") {
      return { selected_action: ACTION_KIND.SEND_LEAK_CHECK_INVITATION, lifecycle_state: LIFECYCLE_STATE.APPROVED, approval_boundary: "standing_policy" };
    }
  }
  if (leadNext === "book_meeting") {
    return { selected_action: ACTION_KIND.SEND_MEETING_LINK, lifecycle_state: LIFECYCLE_STATE.APPROVED, approval_boundary: "standing_policy" };
  }
  if (leadNext === "schedule_callback") {
    return { selected_action: ACTION_KIND.SCHEDULE_APPROVED_CALLBACK, lifecycle_state: LIFECYCLE_STATE.APPROVED, approval_boundary: "standing_policy" };
  }
  return { selected_action: ACTION_KIND.PREPARE_HUMAN_REVIEW_PACKET, lifecycle_state: LIFECYCLE_STATE.HUMAN_REVIEW, approval_boundary: "jonathan_required" };
}

export function createOpportunityIntent({ lead = {}, source = {} } = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const route = routeOpportunityAction({ lead, source }, { now });
  const leadId = clean(lead.lead_id);
  const leadVersion = Number(lead.version || 1);
  const key = `${leadId}:v${leadVersion}:${sourceKey(source)}:${route.selected_action}`;
  const intentId = hashId("oppact", key);
  return {
    intent_id: intentId,
    idempotency_key: key,
    lead_ref: { lead_id: leadId, version: leadVersion },
    source_evidence: {
      source_type: clean(source.source_type || source.provider || "unknown"),
      provider_event_id: clean(source.provider_event_id || source.message_id),
      provider_call_id: clean(source.provider_call_id || source.call_id),
      execution_id: clean(source.execution_id),
      classification: clean(source.classification),
      outcome: clean(source.outcome),
      confidence: clean(source.confidence),
      received_at: clean(source.received_at || source.ended_at || now),
      thread_id: clean(source.thread_id || source.provider_thread_id),
    },
    selected_action: route.selected_action,
    chosen_next_step: route.selected_action,
    approval_boundary: route.approval_boundary,
    policy_receipt: {
      policy_ref: "hermes_phase4_opportunity_progression_v1",
      requires_jonathan_approval: route.approval_boundary === "jonathan_required",
      forbids_stripe_payment: true,
      forbids_custom_pricing_or_terms_without_approval: true,
      evaluated_at: now,
    },
    recovery_plan: route.recovery_plan || null,
    lifecycle_state: route.lifecycle_state,
    retries: { attempt: 0, max_attempts: route.selected_action === ACTION_KIND.RECOVER_NO_CONNECT ? 3 : 2 },
    attempts: 0,
    blockers: [],
    failures: [],
    target: {
      email: clean(lead.email),
      phone: clean(lead.normalized_phone || lead.phone),
      timezone: clean(lead.timezone),
    },
    version: 1,
    created_at: now,
    updated_at: now,
  };
}
