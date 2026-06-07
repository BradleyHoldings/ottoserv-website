// ─── Phase 2 email execution rail: durable email intent + lifecycle ────────────
//
// One authoritative execution intent per email action. The intent is the single
// durable unit of email-execution truth (mirrors Phase 0 taskLifecycle). Its IDs
// are DETERMINISTIC so the same logical action never materializes twice and a
// restart re-derives the identical idempotency key (no duplicate sends).
//
// Reuses: Phase 1 deterministic-hash discipline (sha256[:16]) and the execution-
// truth principle that a state claiming work happened requires evidence.

import { createHash } from "node:crypto";

export const EMAIL_EXEC_SCHEMA_VERSION = "phase2.v1";

// Approved email action types. Only controlled outbound + approved follow-up and
// the approved low-risk auto-acknowledgment are in Phase 2 scope.
export const EMAIL_ACTION = {
  OUTBOUND: "outbound_email",
  FOLLOW_UP: "follow_up_email",
  ACK: "ack_email", // approved low-risk acknowledgment (reply)
};

// Lifecycle states. Truthfully distinguishes intent → approval → claim → send →
// verified evidence → completion, plus the failure/recovery branches.
export const EMAIL_STATES = {
  PROPOSED: "proposed",
  APPROVAL_REQUIRED: "approval_required",
  APPROVED: "approved",
  SCHEDULED: "scheduled",
  CLAIMED: "claimed",
  EXECUTING: "executing",
  SENT_UNVERIFIED: "sent_unverified", // provider call returned ambiguously / timed out
  COMPLETED: "completed",
  RETRY_WAITING: "retry_waiting",
  BLOCKED: "blocked",
  FAILED: "failed",
  CANCELLED: "cancelled",
  DEAD_LETTER: "dead_letter",
};

// Allowed transitions. Anything not listed is rejected — no silent jumps.
const ALLOWED = {
  proposed: ["approval_required", "approved", "scheduled", "blocked", "cancelled"],
  approval_required: ["approved", "blocked", "cancelled"],
  approved: ["scheduled", "claimed", "blocked", "cancelled"],
  scheduled: ["claimed", "blocked", "cancelled"],
  claimed: ["executing", "scheduled", "blocked", "failed", "retry_waiting", "cancelled"],
  executing: ["sent_unverified", "completed", "blocked", "failed", "retry_waiting"],
  sent_unverified: ["completed", "failed", "retry_waiting", "dead_letter"],
  completed: [], // terminal success
  retry_waiting: ["scheduled", "claimed", "blocked", "failed", "dead_letter", "cancelled"],
  blocked: ["approved", "scheduled", "claimed", "retry_waiting", "failed", "cancelled"],
  failed: ["retry_waiting", "dead_letter", "cancelled"],
  cancelled: [],
  dead_letter: ["cancelled"],
};

// States in which it is TRUE that a real send was at least attempted on the wire.
export const EMAIL_TRUTH = {
  sent_attempted: new Set(["sent_unverified", "completed"]),
  completed: new Set(["completed"]),
  not_sent: new Set(["proposed", "approval_required", "approved", "scheduled", "claimed", "blocked", "cancelled"]),
};

function clean(v) { return String(v ?? "").trim(); }
function sha16(s) { return createHash("sha256").update(s).digest("hex").slice(0, 16); }

export function canTransitionEmail(from, to) {
  return (ALLOWED[clean(from)] || []).includes(clean(to));
}

// Deterministic execution id: stable for one logical action against one lead at a
// given lead version + action type + scheduled slot. Same inputs → same id.
export function deriveExecutionId(input = {}) {
  const basis = [
    clean(input.lead_id),
    clean(input.action_type) || EMAIL_ACTION.OUTBOUND,
    clean(input.campaign_id),
    String(input.sequence_step ?? 0),
    clean(input.scheduled_slot), // e.g. a date bucket for follow-ups; empty for immediate
  ].join("|");
  return `eex_v1_${sha16(basis)}`;
}

// Deterministic idempotency key: binds the execution to the EXACT approved content
// and recipient and lead version. If any of these change, it is a different action
// and must not collide with a prior successful send.
export function deriveIdempotencyKey(input = {}) {
  const basis = [
    clean(input.lead_id),
    clean(input.action_type) || EMAIL_ACTION.OUTBOUND,
    clean(input.recipient).toLowerCase(),
    clean(input.template_ref),
    clean(input.content_hash),
    String(input.lead_version ?? 0),
  ].join("|");
  return `idem_v1_${sha16(basis)}`;
}

// Hash of the rendered, approved subject+body (lossless evidence the exact content
// that was approved is the exact content that will be sent).
export function contentHash(subject, body) {
  return `ch_${sha16(`${clean(subject)}\n\n${clean(body)}`)}`;
}

/**
 * Materialize a durable email intent. Pure. Starts in `proposed` (no send implied).
 * The caller decides approval routing via the policy gate.
 */
export function createEmailIntent(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const action_type = clean(input.action_type) || EMAIL_ACTION.OUTBOUND;
  const subject = clean(input.subject);
  const body = clean(input.body);
  const content_hash = clean(input.content_hash) || contentHash(subject, body);
  const recipient = clean(input.recipient);
  const lead_version = Number(input.lead_version ?? 0);

  const idBasis = {
    lead_id: input.lead_id, action_type, campaign_id: input.campaign_id,
    sequence_step: input.sequence_step, scheduled_slot: input.scheduled_slot,
  };
  const execution_id = clean(input.execution_id) || deriveExecutionId(idBasis);
  const idempotency_key = deriveIdempotencyKey({
    lead_id: input.lead_id, action_type, recipient, template_ref: input.template_ref,
    content_hash, lead_version,
  });

  return {
    execution_id,
    lead_id: clean(input.lead_id),
    lead_version,
    correlation_id: clean(input.correlation_id) || execution_id,
    idempotency_key,
    action_type,
    campaign_id: clean(input.campaign_id),
    sequence_step: Number(input.sequence_step ?? 0),
    sender: clean(input.sender),
    recipient,
    template_ref: clean(input.template_ref),
    content_hash,
    subject,
    body,
    policy_version: clean(input.policy_version) || "phase2.v1",
    reason: clean(input.reason),
    eligibility_evidence: input.eligibility_evidence || null,
    scheduled_at: clean(input.scheduled_at) || now,
    state: EMAIL_STATES.PROPOSED,
    retry_count: 0,
    lease_owner: "",
    lease_expires_at: "",
    provider_message_id: "",
    provider_thread_id: "",
    policy_receipt: null,
    provider_evidence: null,
    schema_version: EMAIL_EXEC_SCHEMA_VERSION,
    version: 1, // optimistic-concurrency version for the intent row itself
    created_at: now,
    updated_at: now,
    history: [],
  };
}

/**
 * Apply a lifecycle transition to an intent. Pure. Returns { ok, intent?, error? }.
 * Bumps the intent's own optimistic-concurrency `version` on every real change so
 * the durable store can enforce one-writer semantics.
 */
export function transitionEmail(intent, to, ctx = {}) {
  const from = clean(intent.state);
  to = clean(to);
  if (!Object.values(EMAIL_STATES).includes(to)) return { ok: false, error: `unknown_state:${to}` };
  if (from === to) return { ok: true, intent, noop: true };
  if (!canTransitionEmail(from, to)) return { ok: false, error: `illegal_transition:${from}->${to}` };

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
    retry_count: to === EMAIL_STATES.RETRY_WAITING ? Number(intent.retry_count || 0) + 1 : Number(intent.retry_count || 0),
    version: Number(intent.version || 1) + 1,
    updated_at: now,
    history: [...(Array.isArray(intent.history) ? intent.history : []), rec],
  };
  // Carry explicit context fields the caller set onto the intent.
  for (const k of ["lease_owner", "lease_expires_at", "provider_message_id", "provider_thread_id", "policy_receipt", "provider_evidence", "scheduled_at"]) {
    if (ctx[k] !== undefined) next[k] = ctx[k];
  }
  return { ok: true, intent: next, transition: rec };
}
