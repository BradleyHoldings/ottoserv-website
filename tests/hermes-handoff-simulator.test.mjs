// Service-delivery step 5: simulate a paid-client handoff from a lead/audit and
// generate a complete work order + build packet + evidence requirements. The
// engagement stays proposal/payment gated; the build packet is blocked until the
// work order is approved/paid. No proposal/payment/n8n/deploy/client deliverable.

import assert from "node:assert/strict";
import test from "node:test";

import { simulatePaidHandoff } from "../src/lib/hermesHandoffSimulator.mjs";
import { buildServiceDeliveryPacket } from "../src/lib/hermesBuildPacket.mjs";

const NOW = "2026-06-04T12:00:00.000Z";

const lead = {
  lead_id: "li-acme", company: "Acme Plumbing", contact_name: "Sam", email: "ops@acme.example",
  pain_point: "missed after-hours calls; lost jobs to voicemail", status: "interested",
  source_url: "https://reddit.com/x/acme",
  intent: { recommended_offer: "AI Receptionist", likely_ottoserv_angle: "AI Receptionist", automation_opportunities: ["Missed-call recovery", "Booking + qualification"] },
};

test("simulate creates a work order + build packet + evidence from an interested lead", () => {
  const r = simulatePaidHandoff({ lead, outcome: { disposition: "booked_demo", call_id: "call-1", recorded_at: NOW } }, { now: NOW });
  assert.equal(r.ok, true);
  assert.ok(r.work_order.id);
  assert.ok(r.build_packet.packet_id);
  assert.ok(r.evidence_requirements.length >= 3, "evidence requirements collected");
});

test("work order carries client context, pain, opportunities, integrations, client inputs, risks, owner, stage, evidence, next action", () => {
  const { work_order: wo } = simulatePaidHandoff({ lead }, { now: NOW });
  assert.ok(wo.client_context && wo.client_context.company === "Acme Plumbing");
  assert.ok(wo.pain && /missed/.test(wo.pain));
  assert.ok(wo.automation_opportunities.length >= 1);
  assert.ok(wo.integration_needs.some((i) => /telephony|receptionist/i.test(i)));
  assert.ok(wo.client_inputs_needed.length >= 3);
  assert.ok(wo.risks.length >= 3);
  assert.ok(wo.recommended_actor, "owner");
  assert.equal(wo.implementation_stage, "awaiting_pilot_scope_or_proposal");
  assert.ok(wo.required_evidence.length >= 1);
  assert.ok(wo.next_action);
});

test("build packet carries scope, acceptance criteria, test plan, integrations, security notes, visual deliverable, rollback", () => {
  const { build_packet: bp } = simulatePaidHandoff({ lead }, { now: NOW });
  assert.ok(bp.scope.length >= 1);
  assert.ok(bp.acceptance_criteria.length >= 2);
  assert.ok(bp.test_plan.length >= 2);
  assert.ok(bp.required_integrations.length >= 1);
  assert.ok(bp.data_security_notes.length >= 3);
  assert.ok(bp.visual_deliverable_requirements.length >= 2);
  assert.ok(bp.rollback_plan.length >= 3);
});

test("engagement stays approval-gated; build packet blocked until approved/paid", () => {
  const r = simulatePaidHandoff({ lead }, { now: NOW });
  assert.equal(r.approval_gate.approval_required, true);
  assert.equal(r.build_packet.status, "blocked_awaiting_approval");
  assert.match(r.build_packet.blocking_gate, /approv|paid|pricing|proposal/i);

  // Once the work order is approved/paid, the SAME build packet becomes ready.
  const approvedWo = { ...r.work_order, approvalStatus: "approved" };
  const readyPacket = buildServiceDeliveryPacket(approvedWo, { now: NOW });
  assert.equal(readyPacket.status, "ready_for_build");
});

test("simulate refuses an empty lead (no company/lead_id)", () => {
  assert.equal(simulatePaidHandoff({ lead: {} }, { now: NOW }).ok, false);
});
