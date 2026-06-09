import { createHash } from "node:crypto";

export const CALL_EXEC_SCHEMA_VERSION = "phase3.v1";

export const CALL_STATES = {
  PROPOSED: "proposed",
  APPROVAL_REQUIRED: "approval_required",
  APPROVED: "approved",
  SCHEDULED: "scheduled",
  CLAIMED: "claimed",
  EXECUTING: "executing",
  STARTED_UNVERIFIED: "started_unverified",
  COMPLETED: "completed",
  RETRY_WAITING: "retry_waiting",
  BLOCKED: "blocked",
  FAILED: "failed",
  CANCELLED: "cancelled",
  DEAD_LETTER: "dead_letter",
};

export const CALL_OUTCOME = {
  CONNECTED: "connected",
  VOICEMAIL: "voicemail",
  NO_ANSWER: "no_answer",
  BUSY: "busy",
  FAILED: "failed",
  WRONG_NUMBER: "wrong_number",
  CALLBACK_REQUESTED: "callback_requested",
  INTERESTED: "interested",
  NOT_INTERESTED: "not_interested",
  DO_NOT_CALL: "do_not_call",
  MEETING_REQUESTED: "meeting_requested",
  AMBIGUOUS: "ambiguous",
};

const ALLOWED = {
  proposed: ["approval_required", "approved", "scheduled", "blocked", "cancelled"],
  approval_required: ["approved", "blocked", "cancelled"],
  approved: ["scheduled", "claimed", "blocked", "cancelled"],
  scheduled: ["claimed", "blocked", "cancelled"],
  claimed: ["executing", "scheduled", "blocked", "failed", "retry_waiting", "cancelled"],
  executing: ["started_unverified", "completed", "blocked", "failed", "retry_waiting"],
  started_unverified: ["completed", "failed", "retry_waiting", "dead_letter"],
  completed: [],
  retry_waiting: ["scheduled", "claimed", "blocked", "failed", "dead_letter", "cancelled"],
  blocked: ["approved", "scheduled", "claimed", "retry_waiting", "failed", "cancelled"],
  failed: ["retry_waiting", "dead_letter", "cancelled"],
  cancelled: [],
  dead_letter: ["cancelled"],
};

function clean(v) { return String(v ?? "").trim(); }
function sha16(s) { return createHash("sha256").update(s).digest("hex").slice(0, 16); }

export function deriveCallExecutionId(input = {}) {
  const basis = [
    clean(input.lead_id),
    "outbound_call",
    clean(input.approved_script_ref),
    clean(input.scheduled_slot),
  ].join("|");
  return `cex_v1_${sha16(basis)}`;
}

export function deriveCallIdempotencyKey(input = {}) {
  const basis = [
    clean(input.lead_id),
    String(input.lead_version ?? 0),
    clean(input.phone),
    clean(input.approved_script_ref),
    clean(input.approved_angle),
  ].join("|");
  return `call_idem_v1_${sha16(basis)}`;
}

export function canTransitionCall(from, to) {
  return (ALLOWED[clean(from)] || []).includes(clean(to));
}

export function createCallIntent(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const execution_id = clean(input.execution_id) || deriveCallExecutionId(input);
  const idempotency_key = clean(input.idempotency_key) || deriveCallIdempotencyKey(input);
  return {
    execution_id,
    lead_id: clean(input.lead_id),
    lead_version: Number(input.lead_version ?? 0),
    correlation_id: clean(input.correlation_id) || execution_id,
    idempotency_key,
    action_type: "outbound_call",
    provider: "retell",
    phone: clean(input.phone),
    approved_script_ref: clean(input.approved_script_ref),
    approved_angle: clean(input.approved_angle),
    approval_id: clean(input.approval_id),
    policy_version: clean(input.policy_version) || CALL_EXEC_SCHEMA_VERSION,
    scheduled_at: clean(input.scheduled_at) || now,
    scheduled_slot: clean(input.scheduled_slot),
    state: CALL_STATES.PROPOSED,
    retry_count: 0,
    lease_owner: "",
    lease_expires_at: "",
    provider_call_id: "",
    provider_status: "",
    provider_outcome: "",
    duration_seconds: 0,
    recording_url: "",
    transcript_url: "",
    policy_receipt: null,
    provider_evidence: null,
    sanitized_error: "",
    next_action: "",
    schema_version: CALL_EXEC_SCHEMA_VERSION,
    version: 1,
    created_at: now,
    updated_at: now,
    history: [],
  };
}

export function transitionCall(intent, to, ctx = {}) {
  const from = clean(intent.state);
  to = clean(to);
  if (!Object.values(CALL_STATES).includes(to)) return { ok: false, error: `unknown_state:${to}` };
  if (from === to) return { ok: true, intent, noop: true };
  if (!canTransitionCall(from, to)) return { ok: false, error: `illegal_transition:${from}->${to}` };
  const now = ctx.now || new Date().toISOString();
  const rec = {
    from, to, at: now,
    actor: clean(ctx.actor) || "Hermes",
    reason: clean(ctx.reason),
    evidence_ref: clean(ctx.evidence_ref),
  };
  const next = {
    ...intent,
    state: to,
    retry_count: to === CALL_STATES.RETRY_WAITING ? Number(intent.retry_count || 0) + 1 : Number(intent.retry_count || 0),
    version: Number(intent.version || 1) + 1,
    updated_at: now,
    history: [...(Array.isArray(intent.history) ? intent.history : []), rec],
  };
  for (const k of [
    "lease_owner", "lease_expires_at", "provider_call_id", "provider_status",
    "provider_outcome", "duration_seconds", "recording_url", "transcript_url",
    "policy_receipt", "provider_evidence", "sanitized_error", "scheduled_at", "next_action",
  ]) {
    if (ctx[k] !== undefined) next[k] = ctx[k];
  }
  return { ok: true, intent: next, transition: rec };
}
