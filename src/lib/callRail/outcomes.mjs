import { CALL_OUTCOME } from "./intent.mjs";

function clean(v) { return String(v ?? "").trim(); }
function lower(v) { return clean(v).toLowerCase(); }

const TERMINAL_STATUSES = new Set(["ended", "completed", "done", "failed", "voicemail", "no_answer", "busy"]);

export function isTerminalProviderStatus(status) {
  return TERMINAL_STATUSES.has(lower(status));
}

export function classifyProviderOutcome(provider = {}) {
  const raw = lower(provider.outcome || provider.disposition || provider.status);
  const text = `${raw} ${lower(provider.summary)} ${lower(provider.transcript_summary)}`;
  let outcome = CALL_OUTCOME.AMBIGUOUS;
  if (/do[_\s-]?not[_\s-]?call|dnc|stop calling/.test(text)) outcome = CALL_OUTCOME.DO_NOT_CALL;
  else if (/wrong[_\s-]?number|bad[_\s-]?number|invalid[_\s-]?number/.test(text)) outcome = CALL_OUTCOME.WRONG_NUMBER;
  else if (/meeting|demo|calendar|booked/.test(text)) outcome = CALL_OUTCOME.MEETING_REQUESTED;
  else if (/callback|call back|later/.test(text)) outcome = CALL_OUTCOME.CALLBACK_REQUESTED;
  else if (/not[_\s-]?interested|no thanks|pass/.test(text)) outcome = CALL_OUTCOME.NOT_INTERESTED;
  else if (/interested|tell me more|sounds good|positive/.test(text)) outcome = CALL_OUTCOME.INTERESTED;
  else if (/voicemail|left message/.test(text)) outcome = CALL_OUTCOME.VOICEMAIL;
  else if (/no[_\s-]?answer|unanswered/.test(text)) outcome = CALL_OUTCOME.NO_ANSWER;
  else if (/busy/.test(text)) outcome = CALL_OUTCOME.BUSY;
  else if (/fail|error|timeout|rejected/.test(text)) outcome = CALL_OUTCOME.FAILED;
  else if (/connected|human|answered/.test(text)) outcome = CALL_OUTCOME.CONNECTED;
  return {
    outcome,
    terminal: isTerminalProviderStatus(provider.status) || Object.values(CALL_OUTCOME).includes(outcome),
    confidence: outcome === CALL_OUTCOME.AMBIGUOUS ? "low" : "high",
  };
}

export function nextActionForOutcome(outcome, ctx = {}) {
  const preferred = clean(ctx.preferredOffer) || "human_review";
  switch (clean(outcome)) {
    case CALL_OUTCOME.MEETING_REQUESTED:
      return { next_action: "book_meeting", pipeline_stage: "meeting_requested", eligibility: "engaged", stop_follow_up: true };
    case CALL_OUTCOME.INTERESTED:
      return {
        next_action: preferred === "process_audit" ? "route_to_process_audit" : preferred === "proposal" ? "prepare_proposal" : "route_to_leak_check",
        pipeline_stage: "engaged",
        eligibility: "engaged",
        stop_follow_up: true,
      };
    case CALL_OUTCOME.CALLBACK_REQUESTED:
      return { next_action: "schedule_callback", pipeline_stage: "callback_requested", eligibility: "engaged", stop_follow_up: true };
    case CALL_OUTCOME.DO_NOT_CALL:
      return { next_action: "stop_all_contact", pipeline_stage: "do_not_contact", eligibility: "rejected", stop_follow_up: true };
    case CALL_OUTCOME.WRONG_NUMBER:
      return { next_action: "stop_and_reverify_phone", pipeline_stage: "invalid_contact", eligibility: "enrich", stop_follow_up: true };
    case CALL_OUTCOME.NOT_INTERESTED:
      return { next_action: "stop_follow_up", pipeline_stage: "not_interested", eligibility: "rejected", stop_follow_up: true };
    case CALL_OUTCOME.VOICEMAIL:
    case CALL_OUTCOME.NO_ANSWER:
    case CALL_OUTCOME.BUSY:
      return { next_action: "retry_with_spacing", pipeline_stage: "attempted", eligibility: "call", stop_follow_up: false };
    case CALL_OUTCOME.FAILED:
      return { next_action: "provider_reconcile_or_retry", pipeline_stage: "call_failed", eligibility: "call", stop_follow_up: false };
    case CALL_OUTCOME.CONNECTED:
    case CALL_OUTCOME.AMBIGUOUS:
    default:
      return { next_action: "human_review", pipeline_stage: "review_required", eligibility: "engaged", stop_follow_up: true };
  }
}

export function buildCallEvidence(intent = {}, provider = {}, now = new Date().toISOString()) {
  const callId = clean(provider.provider_call_id) || clean(provider.call_id) || clean(provider.id);
  if (!callId) return null;
  const classified = classifyProviderOutcome(provider);
  const route = nextActionForOutcome(classified.outcome, provider);
  return {
    provider_call_id: callId,
    execution_id: clean(intent.execution_id),
    lead_id: clean(intent.lead_id),
    provider: "retell",
    provider_status: clean(provider.status),
    outcome: classified.outcome,
    outcome_confidence: classified.confidence,
    duration_seconds: Number(provider.duration_seconds || provider.duration || 0),
    started_at: clean(provider.started_at),
    ended_at: clean(provider.ended_at) || now,
    recording_url: clean(provider.recording_url),
    transcript_url: clean(provider.transcript_url),
    transcript_summary: clean(provider.summary || provider.transcript_summary).slice(0, 1000),
    next_action: route.next_action,
    sanitized_error: clean(provider.sanitized_error || provider.error).slice(0, 300),
    raw_receipt: {
      id: callId,
      status: clean(provider.status),
      outcome: classified.outcome,
      has_recording: Boolean(clean(provider.recording_url)),
      has_transcript: Boolean(clean(provider.transcript_url)),
    },
    received_at: now,
  };
}
