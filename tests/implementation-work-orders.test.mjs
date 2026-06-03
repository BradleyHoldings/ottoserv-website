import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  seedToImplementationWorkOrder,
  promoteSeedsToWorkOrders,
  advanceImplementationStage,
  summarizeImplementationWorkOrders,
  IMPLEMENTATION_STAGES,
} from "../src/lib/implementationWorkOrders.mjs";
import { buildImplementationWorkOrders } from "../src/lib/revenueLoopSources.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

function sampleSeed(overrides = {}) {
  return {
    id: "impl-ps_1",
    source: "front_office_leak_check",
    scan_id: "ps_1",
    company: "Acme PM",
    contact: "Dana",
    email: "dana@acme.com",
    main_leak: "missed_calls",
    pilot_recommendation: "Start AI receptionist pilot for 30 days.",
    automation_opportunities: ["missed-call recovery", "after-hours coverage"],
    report_url: "https://ottoserv.com/r/abc",
    stage: "awaiting_pilot_scope_or_proposal",
    next_action: "Scope a 30-day pilot → send approved proposal/payment link → open implementation work order.",
    approval_required: true,
    evidence_requirement: "Signed pilot scope or paid pilot before an implementation work order is opened.",
    ...overrides,
  };
}

function tmpStore() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "impl-wo-"));
  return path.join(dir, "implementation-work-orders.json");
}

test("seed becomes an approval-gated work order built on the shared work-order model", () => {
  const wo = seedToImplementationWorkOrder(sampleSeed(), { now: NOW, sequence: 7 });

  // Reuses buildWorkOrder: gets a WO id, approval-aware status, activity log.
  assert.match(wo.id, /^WO-2026-\d{5}$/);
  assert.equal(wo.status, "needs_approval");
  assert.equal(wo.approvalRequired, true);
  assert.equal(wo.source, "ai_created");
  assert.ok(wo.activityLog.length >= 1);

  // Implementation extension fields.
  assert.equal(wo.engagement_type, "automation_implementation");
  assert.equal(wo.client, "Acme PM");
  assert.equal(wo.source_seed_id, "impl-ps_1");
  assert.equal(wo.scan_id, "ps_1");
  assert.equal(wo.implementation_stage, "awaiting_pilot_scope_or_proposal");
  assert.ok(wo.success_criteria.length >= 3);
  assert.ok(wo.required_evidence.length >= 3);
  assert.ok(wo.recommended_actor);
  assert.ok(["low", "medium", "high"].includes(wo.risk_level));
  assert.ok(wo.next_action);
  assert.deepEqual(wo.automation_opportunities, ["missed-call recovery", "after-hours coverage"]);
});

test("gated actions cover paid implementation, pricing, payment links, deliverables, production changes", () => {
  const wo = seedToImplementationWorkOrder(sampleSeed(), { now: NOW });
  const actions = wo.gated_actions.map((g) => g.action);
  for (const required of ["paid_implementation", "pricing", "payment_link", "final_client_deliverable", "production_automation_change"]) {
    assert.ok(actions.includes(required), `missing gate: ${required}`);
  }
  assert.ok(wo.gated_actions.every((g) => g.approval_required === true));
});

test("promoteSeedsToWorkOrders persists durable orders and is idempotent", async () => {
  const storePath = tmpStore();
  const seeds = [sampleSeed(), sampleSeed({ id: "impl-ps_2", scan_id: "ps_2", company: "Bolt HVAC" })];

  const first = await promoteSeedsToWorkOrders(seeds, { now: NOW, storePath });
  assert.equal(first.created, 2);
  assert.equal(first.workOrders.length, 2);

  // Durable: written to disk and reads back.
  const onDisk = JSON.parse(readFileSync(storePath, "utf8"));
  assert.equal(onDisk.length, 2);

  // Idempotent: re-running the same seeds creates nothing new.
  const second = await promoteSeedsToWorkOrders(seeds, { now: NOW, storePath });
  assert.equal(second.created, 0);
  assert.equal(second.skipped, 2);
  assert.equal(second.workOrders.length, 2);

  // A new seed appends without duplicating existing.
  const third = await promoteSeedsToWorkOrders(
    [...seeds, sampleSeed({ id: "impl-ps_3", scan_id: "ps_3", company: "Gray Co" })],
    { now: NOW, storePath },
  );
  assert.equal(third.created, 1);
  assert.equal(third.workOrders.length, 3);
});

test("end-to-end: real leak-check scan → seed → durable implementation work order", async () => {
  const storePath = tmpStore();
  const seeds = buildImplementationWorkOrders([
    {
      id: "ps_live",
      status: "report_ready",
      company_name: "Harbor Point PM",
      contact_name: "Maya",
      email: "maya@harbor.com",
      main_leak: "slow_follow_up",
      pilot_recommendation: "Pilot lead-response automation for 30 days.",
      automation_opportunities_json: ["lead response SLA", "follow-up sequencing"],
      public_report_url: "https://ottoserv.com/r/harbor",
      email_sent_at: "2026-06-02T10:00:00.000Z",
    },
  ]);
  assert.equal(seeds.length, 1);

  const result = await promoteSeedsToWorkOrders(seeds, { now: NOW, storePath });
  assert.equal(result.created, 1);
  assert.equal(result.workOrders[0].client, "Harbor Point PM");
  assert.equal(result.workOrders[0].implementation_stage, "awaiting_pilot_scope_or_proposal");
  assert.equal(result.summary.needs_approval, 1);
});

test("stage advance stays gated on paid/production steps until approved", () => {
  const wo = seedToImplementationWorkOrder(sampleSeed(), { now: NOW });

  // Moving into a paid/production stage without approval is rejected.
  const blocked = advanceImplementationStage(wo, "paid_awaiting_implementation");
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /approval/i);

  // With recorded approval it advances and keeps an audit trail.
  const ok = advanceImplementationStage(wo, "paid_awaiting_implementation", { approved: true, actor: "Jonathan" });
  assert.equal(ok.ok, true);
  assert.equal(ok.workOrder.implementation_stage, "paid_awaiting_implementation");
  assert.ok(ok.workOrder.activityLog[0].detail.includes("paid_awaiting_implementation"));

  // Completion sets the base status to completed.
  const done = advanceImplementationStage(ok.workOrder, "completed", { actor: "Codex" });
  assert.equal(done.ok, true);
  assert.equal(done.workOrder.status, "completed");
});

test("summary aggregates stage, status, and approval counts", () => {
  const orders = [
    seedToImplementationWorkOrder(sampleSeed(), { now: NOW }),
    seedToImplementationWorkOrder(sampleSeed({ id: "impl-ps_2", scan_id: "ps_2", stage: "report_ready_awaiting_delivery" }), { now: NOW }),
  ];
  const summary = summarizeImplementationWorkOrders(orders);
  assert.equal(summary.total, 2);
  assert.equal(summary.needs_approval, 2);
  assert.ok(summary.by_stage.awaiting_pilot_scope_or_proposal >= 1);
  assert.ok(IMPLEMENTATION_STAGES.includes("completed"));
});
