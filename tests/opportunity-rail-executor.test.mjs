import assert from "node:assert/strict";
import test from "node:test";

import { executeOpportunityIntent, reconcileBookingEvidence, reconcileOpportunityTimeouts } from "../src/lib/opportunityRail/executor.mjs";
import { evaluateOpportunityPolicy } from "../src/lib/opportunityRail/policy.mjs";

const NOW = "2026-06-09T14:00:00.000Z";

const lead = {
  lead_id: "lead-1",
  version: 3,
  email: "jonathan+phase4@example.com",
  normalized_phone: "+14075550100",
  timezone: "America/New_York",
  pipeline_stage: "meeting_requested",
  eligibility: "engaged",
  next_action: "book_meeting",
};

const meetingLinkIntent = {
  intent_id: "oppact_meeting",
  idempotency_key: "lead-1:v3:gmail-1:send_meeting_link",
  lead_ref: { lead_id: "lead-1", version: 3 },
  lifecycle_state: "approved",
  selected_action: "send_meeting_link",
  source_evidence: { source_type: "email_reply", provider_event_id: "gmail-1" },
  target: { email: "jonathan+phase4@example.com" },
  attempts: 0,
  version: 1,
};

function leadStore(initialLead = lead) {
  let row = { ...initialLead };
  return {
    client: {
      async readAll() { return [row]; },
      async read(id) { return row.lead_id === id ? row : null; },
      async atomicWrite(nextRow, expectedVersion) {
        const next = nextRow.raw_payload || nextRow;
        if (Number(row.version) !== expectedVersion) {
          return { ok: false, status: "conflict", current_version: row.version };
        }
        row = next;
        return { ok: true };
      },
      async readBack(id) { return row.lead_id === id ? row : null; },
    },
    current: () => row,
  };
}

test("policy blocks stale lead version, DNC, quiet hours, active duplicates, unresolved approval, and invalid contact path", () => {
  assert.equal(evaluateOpportunityPolicy(meetingLinkIntent, { lead: { ...lead, version: 4 } }).allowed, false);
  assert.equal(evaluateOpportunityPolicy(meetingLinkIntent, { lead, suppressions: { dnc: true } }).blocked_reasons.includes("suppression_dnc"), true);
  assert.equal(evaluateOpportunityPolicy(meetingLinkIntent, { lead, localHour: 22 }).blocked_reasons.includes("quiet_hours"), true);
  assert.equal(evaluateOpportunityPolicy(meetingLinkIntent, { lead, activeIntents: [{ ...meetingLinkIntent, lifecycle_state: "sent_unverified" }] }).blocked_reasons.includes("duplicate_action"), true);
  assert.equal(evaluateOpportunityPolicy(meetingLinkIntent, { lead, activePositiveReply: true }).blocked_reasons.includes("active_positive_reply"), true);
  assert.equal(evaluateOpportunityPolicy({ ...meetingLinkIntent, selected_action: "prepare_human_review_packet", approval_boundary: "jonathan_required" }, { lead }).blocked_reasons.includes("unresolved_approval"), true);
  assert.equal(evaluateOpportunityPolicy({ ...meetingLinkIntent, target: {} }, { lead }).blocked_reasons.includes("invalid_contact_path"), true);
});

test("sending a meeting link does not mark a lead booked without calendar evidence", async () => {
  const sends = [];
  const store = leadStore();
  const result = await executeOpportunityIntent(meetingLinkIntent, {
    now: NOW,
    lead,
    leadStore: store,
    transport: { send: async (payload) => { sends.push(payload); return { ok: true, provider_message_id: "msg_1" }; } },
  });

  assert.equal(result.ok, true);
  assert.equal(result.intent.lifecycle_state, "sent_unverified");
  assert.equal(result.lead_updated, false);
  assert.equal(store.current().pipeline_stage, "meeting_requested");
  assert.equal(sends.length, 1);
});

test("verified booking evidence advances canonical lead with optimistic concurrency", async () => {
  const store = leadStore();
  const result = await reconcileBookingEvidence({
    ...meetingLinkIntent,
    lifecycle_state: "sent_unverified",
    action_receipt: { provider_message_id: "msg_1" },
  }, {
    now: "2026-06-09T14:10:00.000Z",
    leadStore: store,
    bookingEvidence: {
      provider_event_id: "cal_evt_1",
      scheduled_start_at: "2026-06-10T15:00:00.000Z",
      attendee: "jonathan+phase4@example.com",
      status: "confirmed",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.intent.lifecycle_state, "booked");
  assert.equal(result.lead_updated, true);
  assert.equal(store.current().pipeline_stage, "booked_next_step");
  assert.equal(store.current().next_action, "prepare_meeting");
  assert.equal(store.current().version, 4);
});

test("no-connect recovery schedules retry, email fallback, or escalation without prospect contact", async () => {
  const retry = await executeOpportunityIntent({
    ...meetingLinkIntent,
    selected_action: "recover_no_connect",
    recovery_plan: { next_action: "retry_later", retry_after: "2026-06-09T18:00:00.000Z" },
  }, { now: NOW, lead, transport: { send: async () => { throw new Error("must_not_send"); } } });

  assert.equal(retry.ok, true);
  assert.equal(retry.intent.lifecycle_state, "retry_waiting");
  assert.equal(retry.contacted, false);
  assert.equal(retry.intent.next_attempt_at, "2026-06-09T18:00:00.000Z");
});

test("timeout reconciliation releases expired claims and escalates stale unverified actions", () => {
  const result = reconcileOpportunityTimeouts([
    {
      ...meetingLinkIntent,
      intent_id: "oppact_expired_claim",
      lifecycle_state: "claimed",
      lease_owner: "worker-a",
      lease_expires_at: "2026-06-09T13:59:00.000Z",
    },
    {
      ...meetingLinkIntent,
      intent_id: "oppact_stale_link",
      lifecycle_state: "sent_unverified",
      action_receipt: { sent_at: "2026-06-09T12:00:00.000Z", provider_message_id: "msg_1" },
    },
    {
      ...meetingLinkIntent,
      intent_id: "oppact_fresh_link",
      lifecycle_state: "sent_unverified",
      action_receipt: { sent_at: "2026-06-09T13:55:00.000Z", provider_message_id: "msg_2" },
    },
  ], { now: NOW, unverifiedTimeoutMinutes: 60 });

  const released = result.updated.find((intent) => intent.intent_id === "oppact_expired_claim");
  const escalated = result.updated.find((intent) => intent.intent_id === "oppact_stale_link");

  assert.equal(released.lifecycle_state, "approved");
  assert.equal(released.lease_owner, "");
  assert.equal(escalated.lifecycle_state, "human_review");
  assert.equal(escalated.blockers.includes("booking_evidence_timeout"), true);
  assert.equal(result.unchanged.find((intent) => intent.intent_id === "oppact_fresh_link").lifecycle_state, "sent_unverified");
  assert.equal(result.summary.expired_claims_released, 1);
  assert.equal(result.summary.unverified_escalated, 1);
});
