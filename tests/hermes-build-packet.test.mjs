import assert from "node:assert/strict";
import test from "node:test";

import { buildServiceDeliveryPacket, buildPacketsForDocument } from "../src/lib/hermesBuildPacket.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

test("approved work order → ready_for_build packet with integrations + test plan", () => {
  const wo = {
    id: "impl-1", client: "Acme Plumbing", approvalStatus: "approved", implementation_stage: "paid_awaiting_implementation",
    automation_opportunities: ["Missed-call recovery with AI receptionist", "Sync booked jobs into the CRM"],
    required_evidence: ["Codex commit hash"],
  };
  const p = buildServiceDeliveryPacket(wo, { now: NOW });
  assert.equal(p.status, "ready_for_build");
  assert.equal(p.work_order_id, "impl-1");
  assert.ok(p.required_integrations.some((i) => /receptionist|Telephony/i.test(i)));
  assert.ok(p.required_integrations.some((i) => /CRM/i.test(i)));
  assert.ok(p.test_plan.length >= 3);
  assert.ok(p.visual_deliverable_requirements.length >= 1);
  assert.ok(p.approval_gates.length >= 1);
});

test("unapproved work order → blocked_awaiting_approval with the gate named", () => {
  const wo = { id: "impl-2", client: "PeakAir", approvalStatus: "pending", implementation_stage: "awaiting_pilot_scope_or_proposal", automation_opportunities: ["email follow-up"] };
  const p = buildServiceDeliveryPacket(wo, { now: NOW });
  assert.equal(p.status, "blocked_awaiting_approval");
  assert.match(p.blocking_gate, /approved|paid|Jonathan/i);
});

test("packet never includes client PII beyond business name", () => {
  const wo = { id: "impl-3", client: "Harbor Point", contactEmail: "maya@harborpoint.com", contactPhone: "555-184-3301", approvalStatus: "approved", implementation_stage: "paid_awaiting_implementation", automation_opportunities: ["scheduling"] };
  const p = buildServiceDeliveryPacket(wo, { now: NOW });
  const blob = JSON.stringify(p);
  assert.ok(!blob.includes("maya@harborpoint.com"));
  assert.ok(!blob.includes("555-184-3301"));
  assert.equal(p.client, "Harbor Point");
});

test("forbidden actions keep production/client/credentials gated", () => {
  const p = buildServiceDeliveryPacket({ id: "i", approvalStatus: "approved", implementation_stage: "paid_awaiting_implementation", automation_opportunities: ["n8n workflow"] }, { now: NOW });
  assert.ok(p.forbidden_actions.some((f) => /n8n|deploy/i.test(f)));
  assert.ok(p.forbidden_actions.some((f) => /client-facing|deliverable/i.test(f)));
  assert.ok(p.forbidden_actions.some((f) => /credential/i.test(f)));
});

test("buildPacketsForDocument splits ready vs blocked", () => {
  const document = {
    implementationWorkOrders: {
      orders: [
        { id: "a", approvalStatus: "approved", implementation_stage: "paid_awaiting_implementation", automation_opportunities: ["call"] },
        { id: "b", approvalStatus: "pending", implementation_stage: "awaiting_pilot_scope_or_proposal", automation_opportunities: ["email"] },
      ],
    },
  };
  const res = buildPacketsForDocument(document, { now: NOW });
  assert.equal(res.count, 2);
  assert.equal(res.ready_for_build.length, 1);
  assert.equal(res.blocked_awaiting_approval.length, 1);
  assert.equal(res.ready_for_build[0].work_order_id, "a");
});
