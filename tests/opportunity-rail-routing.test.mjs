import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTION_KIND,
  LIFECYCLE_STATE,
  createOpportunityIntent,
  routeOpportunityAction,
} from "../src/lib/opportunityRail/intent.mjs";

const NOW = "2026-06-09T14:00:00.000Z";

const lead = {
  lead_id: "lead-controlled-jonathan",
  version: 7,
  company_name: "Jonathan Controlled HVAC",
  email: "jonathan+phase4@example.com",
  normalized_phone: "+14075550100",
  timezone: "America/New_York",
  pipeline_stage: "engaged",
  eligibility: "engaged",
  next_action: "book_meeting",
  fit_validation: { leak_check_fit: true, process_audit_fit: false },
};

test("routes meeting requests to one approved meeting-link action with deterministic id", () => {
  const source = {
    source_type: "email_reply",
    provider_event_id: "gmail_reply_phase4_1",
    classification: "meeting_requested",
    confidence: "high",
    received_at: NOW,
    thread_id: "thread-1",
  };

  const first = createOpportunityIntent({ lead, source }, { now: NOW });
  const second = createOpportunityIntent({ lead, source }, { now: NOW });

  assert.equal(first.intent_id, second.intent_id);
  assert.equal(first.idempotency_key, second.idempotency_key);
  assert.equal(first.selected_action, ACTION_KIND.SEND_MEETING_LINK);
  assert.equal(first.lifecycle_state, LIFECYCLE_STATE.APPROVED);
  assert.equal(first.lead_ref.lead_id, "lead-controlled-jonathan");
  assert.equal(first.lead_ref.version, 7);
  assert.equal(first.source_evidence.provider_event_id, "gmail_reply_phase4_1");
  assert.equal(first.policy_receipt.requires_jonathan_approval, false);
});

test("routes positive interest by offer fit without creating pricing or payment actions", () => {
  const leakCheck = routeOpportunityAction({
    lead,
    source: { source_type: "call_outcome", outcome: "interested", confidence: "high" },
  });
  assert.equal(leakCheck.selected_action, ACTION_KIND.SEND_LEAK_CHECK_INVITATION);

  const auditFit = routeOpportunityAction({
    lead: { ...lead, fit_validation: { process_audit_fit: true, leak_check_fit: false } },
    source: { source_type: "email_reply", classification: "positive_interest", confidence: "medium" },
  });
  assert.equal(auditFit.selected_action, ACTION_KIND.SEND_FULL_PROCESS_AUDIT_INVITATION);

  const proposal = routeOpportunityAction({
    lead: { ...lead, next_action: "prepare_proposal" },
    source: { source_type: "call_outcome", outcome: "interested", confidence: "high" },
  });
  assert.equal(proposal.selected_action, ACTION_KIND.PREPARE_HUMAN_REVIEW_PACKET);
  assert.equal(proposal.approval_boundary, "jonathan_required");
});

test("routes callback, question, ambiguous, and no-connect outcomes to safe next actions", () => {
  assert.equal(routeOpportunityAction({
    lead,
    source: { source_type: "call_outcome", outcome: "callback_requested", confidence: "high" },
  }).selected_action, ACTION_KIND.SCHEDULE_APPROVED_CALLBACK);

  assert.equal(routeOpportunityAction({
    lead,
    source: { source_type: "email_reply", classification: "question", confidence: "medium" },
  }).selected_action, ACTION_KIND.PREPARE_HUMAN_REVIEW_PACKET);

  const ambiguous = routeOpportunityAction({
    lead,
    source: { source_type: "call_outcome", outcome: "ambiguous", confidence: "low" },
  });
  assert.equal(ambiguous.selected_action, ACTION_KIND.RECOVER_NO_CONNECT);
  assert.equal(ambiguous.recovery_plan.next_action, "retry_later");

  const noAnswer = routeOpportunityAction({
    lead,
    source: { source_type: "call_outcome", outcome: "no_answer", confidence: "high" },
  });
  assert.equal(noAnswer.selected_action, ACTION_KIND.RECOVER_NO_CONNECT);
  assert.equal(noAnswer.recovery_plan.next_action, "retry_later");
});
