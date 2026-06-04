import assert from "node:assert/strict";
import test from "node:test";

import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";
import { buildPacketsForDocument } from "../src/lib/hermesBuildPacket.mjs";

const NOW = "2026-06-04T12:00:00.000Z";

// An approved/paid implementation work order ready for build.
function approvedWorkOrder() {
  return {
    id: "impl-acme",
    client: "Acme Plumbing",
    company: "Acme Plumbing",
    engagement_type: "automation_implementation",
    implementation_stage: "paid_awaiting_implementation",
    approvalStatus: "approved",
    main_leak: "Missed after-hours calls go to voicemail.",
    pilot_recommendation: "AI receptionist + missed-call recovery + booking.",
    automation_opportunities: ["AI receptionist / missed-call recovery", "Calendar booking", "CRM sync"],
    required_evidence: ["Codex commit hash + build/test/route-check output per automation."],
    gated_actions: [{ action: "production_automation_change", approval_required: true }, { action: "final_client_deliverable", approval_required: true }],
  };
}

test("selector's create_build_packet now carries the FULL build spec (not a stub)", () => {
  const document = { implementationWorkOrders: { orders: [approvedWorkOrder()] } };
  const res = selectNextActions({ leads: [], document, now: NOW });
  const a = res.actions.find((x) => x.action_type === "create_build_packet");
  assert.ok(a, "expected a create_build_packet action");
  const p = a.suggested_prompt_or_packet;
  assert.equal(p.status, "ready_for_build");
  assert.ok(Array.isArray(p.required_integrations) && p.required_integrations.length >= 1);
  assert.ok(Array.isArray(p.client_inputs_needed) && p.client_inputs_needed.length >= 1);
  assert.ok(Array.isArray(p.ottoserv_steps) && p.ottoserv_steps.length >= 1);
  assert.ok(Array.isArray(p.test_plan) && p.test_plan.length >= 2);
  assert.ok(Array.isArray(p.visual_deliverable_requirements) && p.visual_deliverable_requirements.length >= 1);
  assert.ok(Array.isArray(p.approval_gates) && p.approval_gates.length >= 1);
  // Telephony + CRM + calendar opportunities should infer concrete integrations.
  assert.ok(p.required_integrations.some((i) => /receptionist|telephony/i.test(i)));
  assert.ok(p.test_plan.some((t) => /call flow/i.test(t)));
});

test("an unapproved work order yields a build packet blocked on the approval gate", () => {
  const wo = { ...approvedWorkOrder(), approvalStatus: "pending", implementation_stage: "awaiting_pilot_scope_or_proposal" };
  const document = { implementationWorkOrders: { orders: [wo] } };
  const result = buildPacketsForDocument(document, { now: NOW });
  assert.equal(result.ready_for_build.length, 0);
  assert.equal(result.blocked_awaiting_approval.length, 1);
  assert.ok(/not approved|paid/i.test(result.blocked_awaiting_approval[0].blocking_gate));
});
