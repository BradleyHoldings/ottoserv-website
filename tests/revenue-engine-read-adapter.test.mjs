import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  readAutonomousRevenueState,
  readImplementationWorkOrders,
  readRevenueDashboardReadModel,
  redactWorkOrder,
} from "../src/lib/revenueEngineReadAdapter.mjs";

function makeDir(files = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "rev-read-"));
  if (files.latest) writeFileSync(path.join(dir, "latest.json"), JSON.stringify(files.latest));
  if (files.workOrders) writeFileSync(path.join(dir, "implementation-work-orders.json"), JSON.stringify(files.workOrders));
  return dir;
}

const SAMPLE_LATEST = {
  status: "repair_first",
  schedule: "Monday-Saturday morning and afternoon",
  volume_policy: "repair-before-scale",
  generated_at: "2026-06-03T09:00:00.000Z",
  plan: {
    run_date: "2026-06-03",
    revenue_risks: ["Cold-lead pipeline is empty — run lead discovery/import."],
    broken_execution_rails: ["lead_discovery_rail"],
  },
  health: {
    status: "degraded",
    repair_count: 1,
    evidence_gap_count: 0,
    queue_counts: { content: 1, calls: 0, codexRepair: 1 },
    errors: ["1 repair item open."],
  },
  repairPackets: [
    {
      id: "repair-lead-discovery-rail",
      owner: "Codex",
      category: "Missing data",
      what_failed: "lead_discovery_rail",
      expected_behavior: "Cold-lead pipeline has fresh leads daily.",
      actual_behavior: "No leads found — pipeline is empty.",
      verification_steps: ["Run revenue engine tests."],
      status: "open",
    },
  ],
};

const SAMPLE_WO = {
  id: "WO-2026-00046",
  title: "Implementation: front office automation pilot — Harbor Point PM",
  client: "Harbor Point PM",
  status: "needs_approval",
  priority: "high",
  engagement_type: "automation_implementation",
  implementation_stage: "awaiting_pilot_scope_or_proposal",
  recommended_actor: "Jonathan → Codex",
  risk_level: "medium",
  next_action: "Scope a 30-day pilot.",
  main_leak: "missed_calls",
  report_url: "https://ottoserv.com/r/abc",
  approvalRequired: true,
  approvalStatus: "pending",
  automation_opportunities: ["missed-call recovery"],
  success_criteria: ["Pilot booked."],
  required_evidence: ["Report delivery proof."],
  gated_actions: [{ action: "payment_link", approval_required: true, reason: "x" }],
  contactName: "Maya Ellis",
  contactEmail: "maya@harborpoint.com",
  contactPhone: "555-184-3301",
  createdAt: "2026-06-03T09:00:00.000Z",
  updatedAt: "2026-06-03T09:00:00.000Z",
};

test("reads autonomous revenue state with health, broken rails, repair packets, next action", async () => {
  const dataDir = makeDir({ latest: SAMPLE_LATEST });
  const state = await readAutonomousRevenueState({ dataDir });

  assert.equal(state.available, true);
  assert.equal(state.status, "repair_first");
  assert.equal(state.health.status, "degraded");
  assert.equal(state.health.repair_count, 1);
  assert.deepEqual(state.queueCounts, { content: 1, calls: 0, codexRepair: 1 });
  assert.ok(state.revenueRisks[0].includes("Cold-lead pipeline is empty"));
  assert.ok(state.brokenRails.some((rail) => rail.id === "lead_discovery_rail"));
  assert.equal(state.repairPackets[0].owner, "Codex");
  assert.match(state.nextAction, /repair/i);
});

test("missing latest.json returns a safe, non-crashing empty state", async () => {
  const dataDir = makeDir({});
  const state = await readAutonomousRevenueState({ dataDir });
  assert.equal(state.available, false);
  assert.equal(state.status, "unknown");
  assert.deepEqual(state.repairPackets, []);
  assert.match(state.nextAction, /revenue:daily-loop/);
});

test("implementation work orders are redacted of contact PII by default", async () => {
  const dataDir = makeDir({ workOrders: [SAMPLE_WO] });
  const state = await readImplementationWorkOrders({ dataDir });

  assert.equal(state.available, true);
  assert.equal(state.contactRedacted, true);
  assert.equal(state.summary.total, 1);
  assert.equal(state.summary.needs_approval, 1);

  const wo = state.workOrders[0];
  // PII redacted...
  assert.equal(wo.contactName, "[redacted]");
  assert.equal(wo.contactEmail, "[redacted]");
  assert.equal(wo.contactPhone, "[redacted]");
  // ...but operational + approval/evidence fields preserved.
  assert.equal(wo.client, "Harbor Point PM");
  assert.equal(wo.approvalRequired, true);
  assert.equal(wo.approvalStatus, "pending");
  assert.equal(wo.implementation_stage, "awaiting_pilot_scope_or_proposal");
  assert.ok(wo.required_evidence.length >= 1);
  assert.ok(wo.gated_actions.some((g) => g.action === "payment_link"));
});

test("redaction can be disabled for trusted machine consumers", async () => {
  const dataDir = makeDir({ workOrders: [SAMPLE_WO] });
  const state = await readImplementationWorkOrders({ dataDir, redactContacts: false });
  assert.equal(state.contactRedacted, false);
  assert.equal(state.workOrders[0].contactEmail, "maya@harborpoint.com");
});

test("redactWorkOrder leaves no raw email/phone strings", () => {
  const wo = redactWorkOrder(SAMPLE_WO);
  const serialized = JSON.stringify(wo);
  assert.ok(!serialized.includes("maya@harborpoint.com"));
  assert.ok(!serialized.includes("555-184-3301"));
  assert.ok(!serialized.includes("Maya Ellis"));
});

test("work orders fall back to the snapshot embedded in latest.json", async () => {
  const dataDir = makeDir({
    latest: { ...SAMPLE_LATEST, implementationWorkOrders: { orders: [SAMPLE_WO] } },
  });
  const state = await readImplementationWorkOrders({ dataDir });
  assert.equal(state.available, true);
  assert.equal(state.workOrders.length, 1);
  assert.equal(state.workOrders[0].contactEmail, "[redacted]");
});

test("combined read model returns both surfaces and is read-only", async () => {
  const dataDir = makeDir({ latest: SAMPLE_LATEST, workOrders: [SAMPLE_WO] });
  const model = await readRevenueDashboardReadModel({ dataDir });
  assert.equal(model.readOnly, true);
  assert.equal(model.revenue.available, true);
  assert.equal(model.implementation.available, true);
});
