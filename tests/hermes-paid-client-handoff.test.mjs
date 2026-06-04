import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHandoffSeed,
  detectInterestedHandoffs,
  INTERESTED_DISPOSITIONS,
} from "../src/lib/hermesPaidClientHandoff.mjs";
import { seedToImplementationWorkOrder, IMPLEMENTATION_STAGES } from "../src/lib/implementationWorkOrders.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";

const NOW = "2026-06-04T12:00:00.000Z";

function lead(overrides = {}) {
  return {
    lead_id: "li-acme", company: "Acme Plumbing", contact_name: "Sam", email: "sam@acme.example.com",
    normalized_phone: "4075550101", tier: "A-tier", status: "ready_to_call", score: 81,
    source_url: "https://reddit.com/r/x/abc", pain_point: "Missed after-hours calls.",
    intent: { likely_ottoserv_angle: "AI Receptionist", recommended_offer: "AI Lead Handler pilot", source_urls: ["https://reddit.com/r/x/abc"] },
    ...overrides,
  };
}

test("a handoff seed lands on the proposal/payment gate and is spine-compatible", () => {
  const seed = buildHandoffSeed({ lead: lead(), outcome: { disposition: "booked_demo", call_id: "retell-1" }, kind: "call_outcome" }, { now: NOW });
  assert.equal(seed.stage, "awaiting_pilot_scope_or_proposal");
  assert.ok(IMPLEMENTATION_STAGES.includes(seed.stage));
  assert.equal(seed.approval_required, true);
  assert.equal(seed.interest_signal.disposition, "booked_demo");
  // The existing spine can consume it without modification.
  const wo = seedToImplementationWorkOrder(seed, { now: NOW });
  assert.equal(wo.implementation_stage, "awaiting_pilot_scope_or_proposal");
  assert.equal(wo.approvalRequired, true);
  assert.equal(wo.engagement_type, "automation_implementation");
  assert.ok(wo.gated_actions.some((g) => g.action === "payment_link" && g.approval_required));
});

test("booked_demo / callback dispositions are recognized as interested", () => {
  assert.ok(INTERESTED_DISPOSITIONS.has("booked_demo"));
  const r = detectInterestedHandoffs({
    leads: [lead()],
    callOutcomes: [{ lead_id: "li-acme", disposition: "booked_demo", call_id: "c1" }],
    now: NOW,
  });
  assert.equal(r.summary.new_handoff_seeds, 1);
  assert.equal(r.seeds[0].interest_signal.kind, "call_outcome");
});

test("not-interested / no-answer dispositions produce no handoff", () => {
  const r = detectInterestedHandoffs({
    leads: [lead()],
    callOutcomes: [{ lead_id: "li-acme", disposition: "no_answer" }, { lead_id: "li-acme", disposition: "not_interested" }],
    now: NOW,
  });
  assert.equal(r.summary.new_handoff_seeds, 0);
});

test("interested LEAD STATUS (no call) also triggers a handoff", () => {
  const r = detectInterestedHandoffs({ leads: [lead({ status: "interested" })], now: NOW });
  assert.equal(r.summary.new_handoff_seeds, 1);
  assert.equal(r.seeds[0].interest_signal.kind, "lead_status");
});

test("idempotent: an existing work order for the company is not re-handed-off", () => {
  const existingWorkOrders = [{ id: "wo-1", client: "Acme Plumbing", source_seed_id: "handoff-li-acme" }];
  const r = detectInterestedHandoffs({
    leads: [lead({ status: "interested" })],
    existingWorkOrders,
    now: NOW,
  });
  assert.equal(r.summary.new_handoff_seeds, 0);
  assert.equal(r.summary.skipped_existing, 1);
});

test("selector proposes open_implementation_work_order from a recorded booked_demo call outcome", () => {
  const document = {
    approvalExecutionQueue: { items: [{
      taskPacket: { task_id: "apx-call-acme", execution_rail: "morgan", assigned_agent: "Morgan", company: "Acme Plumbing", requested_action: "Approved call to Acme Plumbing" },
      lifecycle: { execution_status: "completed", execution_rail: "morgan", lead_id: "li-acme", last_status_update_at: NOW, submitted_evidence: [{ evidence_reference: "retell-1", evidence_summary: "[SIMULATED] booked demo on call to Acme Plumbing" }] },
    }] },
    implementationWorkOrders: { orders: [] },
  };
  const res = selectNextActions({ leads: [lead()], document, now: NOW });
  const a = res.actions.find((x) => x.action_type === "open_implementation_work_order");
  assert.ok(a, "expected a paid-client handoff action");
  assert.equal(a.required_approval, false);
  assert.equal(a.suggested_prompt_or_packet.seed.stage, "awaiting_pilot_scope_or_proposal");
  assert.ok(/payment-link/.test(a.suggested_prompt_or_packet.gate));
});
