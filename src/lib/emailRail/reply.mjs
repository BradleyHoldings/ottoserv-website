// ─── Phase 2 email execution rail: reply detection + classification ────────────
//
// Associates incoming replies with the correct outbound message/thread and lead,
// deduplicates them (via provider_event_id), classifies conservatively, persists
// the reply with evidence, and updates pipeline state. Low-confidence replies go
// to review — never auto-acted. Stops inappropriate future follow-ups.

import { makeEmailClient } from "./store.mjs";
import { readAuthoritativeLeads, upsertLeads } from "../leadRail/store.mjs";

export const REPLY_CLASS = {
  POSITIVE_INTEREST: "positive_interest",
  QUESTION: "question",
  MEETING_REQUESTED: "meeting_requested",
  NOT_INTERESTED: "not_interested",
  UNSUBSCRIBE: "unsubscribe",
  WRONG_PERSON: "wrong_person",
  OUT_OF_OFFICE: "out_of_office",
  BOUNCE: "bounce",
  AMBIGUOUS: "ambiguous",
};

// Classes where the sequence must be stopped immediately (no further follow-ups).
export const SEQUENCE_STOPPING_CLASSES = new Set([
  REPLY_CLASS.POSITIVE_INTEREST, REPLY_CLASS.MEETING_REQUESTED,
  REPLY_CLASS.UNSUBSCRIBE, REPLY_CLASS.NOT_INTERESTED, REPLY_CLASS.WRONG_PERSON,
  REPLY_CLASS.BOUNCE,
]);

// Classes that require human review before any action.
export const REVIEW_REQUIRED_CLASSES = new Set([
  REPLY_CLASS.QUESTION, REPLY_CLASS.AMBIGUOUS,
]);

// Classes eligible for an approved autonomous low-risk acknowledgment.
export const AUTONOMOUS_ACK_CLASSES = new Set([
  REPLY_CLASS.POSITIVE_INTEREST, REPLY_CLASS.MEETING_REQUESTED,
  REPLY_CLASS.UNSUBSCRIBE, REPLY_CLASS.OUT_OF_OFFICE,
]);

function clean(v) { return String(v ?? "").trim(); }
function lower(v) { return clean(v).toLowerCase(); }

const UNSUBSCRIBE_SIGNALS = ["unsubscribe", "remove me", "take me off", "stop emailing", "opt out", "opt-out", "do not contact", "remove from list"];
const OOO_SIGNALS = ["out of office", "out of the office", "on vacation", "on holiday", "away until", "will return", "auto-reply", "automatic reply"];
const POSITIVE_SIGNALS = ["interested", "sounds good", "tell me more", "yes", "love to", "let's connect", "looks good", "i'd like", "sign me up", "let me know more"];
const MEETING_SIGNALS = ["schedule", "book a call", "set up a meeting", "calendar", "availability", "demo", "free time", "hop on a call"];
const NOT_INTERESTED_SIGNALS = ["not interested", "no thanks", "not right now", "not for us", "no longer", "don't need", "already have", "pass"];
const WRONG_PERSON_SIGNALS = ["wrong person", "wrong email", "not the right", "not my department", "please contact"];
const QUESTION_SIGNALS = ["?", "how does", "what is", "what are", "can you", "do you", "how much", "pricing", "cost", "how long"];

/**
 * Classify a reply by body text + metadata. Conservative: ambiguous → review.
 * Returns { classification, confidence, stops_sequence, requires_review, reason }.
 */
export function classifyReply(reply = {}) {
  const body = lower(reply.body || reply.text || reply.snippet || "");
  const subject = lower(reply.subject || "");
  const full = `${subject} ${body}`;

  // Bounce / delivery failure — check headers first.
  if (reply.is_bounce || lower(reply.type) === "bounce" || full.includes("mail delivery") || full.includes("delivery failed") || full.includes("undeliverable") || full.includes("bounce") || full.includes("failed to deliver")) {
    return { classification: REPLY_CLASS.BOUNCE, confidence: "high", stops_sequence: true, requires_review: false, reason: "delivery_failure_signal" };
  }

  // Unsubscribe signals — stop immediately.
  if (UNSUBSCRIBE_SIGNALS.some(s => full.includes(s))) {
    return { classification: REPLY_CLASS.UNSUBSCRIBE, confidence: "high", stops_sequence: true, requires_review: false, reason: "unsubscribe_signal" };
  }

  // Out of office — low confidence by nature, don't stop sequence.
  if (OOO_SIGNALS.some(s => full.includes(s))) {
    return { classification: REPLY_CLASS.OUT_OF_OFFICE, confidence: "medium", stops_sequence: false, requires_review: false, reason: "ooo_signal" };
  }

  // Wrong person.
  if (WRONG_PERSON_SIGNALS.some(s => full.includes(s))) {
    return { classification: REPLY_CLASS.WRONG_PERSON, confidence: "high", stops_sequence: true, requires_review: false, reason: "wrong_person_signal" };
  }

  // Not interested.
  if (NOT_INTERESTED_SIGNALS.some(s => full.includes(s))) {
    return { classification: REPLY_CLASS.NOT_INTERESTED, confidence: "high", stops_sequence: true, requires_review: false, reason: "not_interested_signal" };
  }

  // Meeting request (check before positive so it's more specific).
  if (MEETING_SIGNALS.some(s => full.includes(s))) {
    return { classification: REPLY_CLASS.MEETING_REQUESTED, confidence: "high", stops_sequence: false, requires_review: false, reason: "meeting_signal" };
  }

  // Positive interest.
  if (POSITIVE_SIGNALS.some(s => full.includes(s))) {
    return { classification: REPLY_CLASS.POSITIVE_INTEREST, confidence: "medium", stops_sequence: false, requires_review: false, reason: "positive_signal" };
  }

  // Question — requires review (never auto-respond with custom content).
  if (QUESTION_SIGNALS.some(s => full.includes(s))) {
    return { classification: REPLY_CLASS.QUESTION, confidence: "medium", stops_sequence: false, requires_review: true, reason: "question_signal" };
  }

  // Nothing matched — ambiguous, send to review.
  return { classification: REPLY_CLASS.AMBIGUOUS, confidence: "low", stops_sequence: false, requires_review: true, reason: "no_clear_signal" };
}

/**
 * Build a durable reply row for persistence.
 */
export function buildReplyRow(inbound = {}, intent = {}, classification = {}, now) {
  return {
    provider_event_id: clean(inbound.provider_event_id) || clean(inbound.message_id),
    execution_id: clean(intent.execution_id),
    lead_id: clean(intent.lead_id) || clean(inbound.lead_id),
    in_reply_to_message_id: clean(inbound.in_reply_to) || clean(intent.provider_message_id) || clean(intent.provider_message_id),
    provider_thread_id: clean(inbound.thread_id) || clean(intent.provider_thread_id),
    from_address: clean(inbound.from),
    subject: clean(inbound.subject),
    body_snippet: (clean(inbound.body) || clean(inbound.snippet) || "").slice(0, 500),
    classification: classification.classification || REPLY_CLASS.AMBIGUOUS,
    confidence: classification.confidence || "low",
    stops_sequence: Boolean(classification.stops_sequence),
    requires_review: Boolean(classification.requires_review),
    provider_timestamp: clean(inbound.date) || clean(inbound.timestamp) || now,
    received_at: now,
  };
}

/**
 * Process one inbound reply: classify → deduplicate → persist → advance canonical
 * lead → stop sequence if required. Returns structured result with evidence.
 */
export async function processReply(inbound = {}, intent = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const client = options.client || makeEmailClient(options);
  if (!client) return { ok: false, reason: "supabase_not_configured" };

  const provider_event_id = clean(inbound.provider_event_id) || clean(inbound.message_id);
  if (!provider_event_id) return { ok: false, reason: "missing_provider_event_id" };

  const classification = classifyReply(inbound);
  const row = buildReplyRow(inbound, intent, classification, now);

  // Persist reply — deduplicated at DB on provider_event_id.
  const written = await client.writeReply(row);
  if (!written?.ok) return { ok: false, reason: written?.error || "reply_write_failed" };

  // If this was a deduped write (DB ignored it), the reply was already processed.
  const deduped = Boolean(written.deduped);

  // Advance canonical lead pipeline state based on classification.
  let leadAdvanced = false;
  if (!deduped && options.updateLead !== false && clean(intent.lead_id)) {
    leadAdvanced = await advanceLeadFromReply(intent.lead_id, classification, inbound, options);
  }

  return {
    ok: true,
    provider_event_id,
    classification: classification.classification,
    confidence: classification.confidence,
    stops_sequence: classification.stops_sequence,
    requires_review: classification.requires_review,
    deduped,
    lead_advanced: leadAdvanced,
    row,
  };
}

/**
 * Map reply classification to canonical lead pipeline state + next action, then
 * write via Phase 1 CAS. Uses optimistic concurrency — never overwrites a newer version.
 */
async function advanceLeadFromReply(lead_id, classification, inbound, options = {}) {
  try {
    const authRead = await readAuthoritativeLeads(options.leadStore || {});
    if (!authRead.ok) return false;
    const lead = (authRead.rows || []).find(r => clean(r.lead_id) === clean(lead_id));
    if (!lead) return false;

    const now = options.now || new Date().toISOString();
    let pipeline_stage = clean(lead.pipeline_stage);
    let eligibility = clean(lead.eligibility);
    let next_action = clean(lead.next_action);

    switch (classification.classification) {
      case REPLY_CLASS.POSITIVE_INTEREST:
        pipeline_stage = "engaged"; eligibility = "engaged"; next_action = "prepare_follow_up"; break;
      case REPLY_CLASS.MEETING_REQUESTED:
        pipeline_stage = "meeting_requested"; eligibility = "engaged"; next_action = "book_meeting"; break;
      case REPLY_CLASS.NOT_INTERESTED:
        pipeline_stage = "not_interested"; eligibility = "rejected"; next_action = "none"; break;
      case REPLY_CLASS.UNSUBSCRIBE:
        pipeline_stage = "do_not_contact"; eligibility = "rejected"; next_action = "none"; break;
      case REPLY_CLASS.WRONG_PERSON:
        pipeline_stage = "invalid_contact"; eligibility = "enrich"; next_action = "enrich_lead_contact"; break;
      case REPLY_CLASS.BOUNCE:
        pipeline_stage = "invalid_contact"; eligibility = "enrich"; next_action = "enrich_lead_contact"; break;
      case REPLY_CLASS.QUESTION:
      case REPLY_CLASS.AMBIGUOUS:
        pipeline_stage = "review_required"; next_action = "manual_review"; break;
      case REPLY_CLASS.OUT_OF_OFFICE:
        next_action = "schedule_follow_up"; break; // stage unchanged
      default:
        break;
    }

    const advanced = {
      ...lead,
      pipeline_stage,
      eligibility,
      next_action,
      last_validated_at: now,
      version: Number(lead.version || 1) + 1,
    };
    const result = await upsertLeads([advanced], options.leadStore || {});
    return result?.persisted > 0;
  } catch (_) { return false; }
}
