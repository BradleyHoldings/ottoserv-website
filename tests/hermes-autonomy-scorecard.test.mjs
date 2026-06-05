import assert from "node:assert/strict";
import test from "node:test";

import { bridgeApprovalToExecution } from "../src/lib/approvalExecutionBridge.mjs";
import { makeLedgerEntry, summarizeLedger } from "../src/lib/hermesOperatingLedger.mjs";
import { computeScorecard, SCORECARD_THRESHOLDS } from "../src/lib/hermesAutonomyScorecard.mjs";

const NOW = "2026-06-03T12:00:00.000Z";
const daysAgo = (n) => new Date(Date.parse(NOW) - n * 86_400_000).toISOString();

function task(id, status, { evidence = false, requiresEvidence = true } = {}) {
  const { taskPacket, lifecycle } = bridgeApprovalToExecution(
    { decision: "approved", approval_item_id: id, original_requested_action: "Send approved follow-up email", risk_level: "low" },
    { now: NOW },
  );
  lifecycle.execution_status = status;
  if (!requiresEvidence) lifecycle.required_evidence = [];
  if (evidence) lifecycle.submitted_evidence = [{ evidence_id: `e-${id}`, evidence_reference: "ref", evidence_summary: "done" }];
  return { taskPacket, lifecycle };
}

test("empty state → blocked, empty pipeline flagged", () => {
  const sc = computeScorecard({ document: {}, leads: [], now: NOW });
  assert.equal(sc.autonomy_status, "blocked");
  assert.equal(sc.dimensions.lead_pipeline.status, "empty");
  assert.ok(sc.top_blockers.some((b) => b.type === "empty_pipeline"));
});

test("healthy state → operating with passing grades", () => {
  const document = {
    approvalExecutionQueue: { items: [task("t1", "completed", { evidence: true }), task("t2", "completed", { evidence: true })] },
    implementationWorkOrders: { orders: [] },
    repairPackets: [],
  };
  const leads = [{ lead_id: "li-1", tier: "A-tier", created_at: NOW, normalized_phone: "1", source_url: "u" }];
  const sc = computeScorecard({ document, leads, now: NOW });
  assert.equal(sc.dimensions.execution.loop_closure_rate, 1);
  assert.equal(sc.dimensions.execution.evidence_rate, 1);
  assert.equal(sc.grades.loop_closure, "pass");
  assert.equal(sc.grades.evidence_discipline, "pass");
  assert.equal(sc.autonomy_status, "operating");
  assert.ok(sc.autonomy_score >= 70);
});

test("GENUINE failures fail loop/evidence — but only attempted work counts", () => {
  // 2 live attempts FAILED + 1 completed → loop closure 1/3 over TERMINAL attempts.
  // A claimed (evidence_submitted) task with NO evidence → missing-evidence penalty.
  // Queued/never-attempted packets are excluded (waiting), not counted as failures.
  const document = {
    approvalExecutionQueue: { items: [
      task("t1", "failed"),
      task("t2", "failed"),
      task("t3", "completed", { evidence: true }),
      task("t4", "evidence_submitted", { evidence: false }),
      task("t5", "queued"), // waiting — must NOT drag the grade
    ] },
  };
  const leads = [{ lead_id: "li", tier: "B-tier", created_at: NOW }];
  const sc = computeScorecard({ document, leads, now: NOW });
  assert.ok(sc.dimensions.execution.loop_closure_rate < SCORECARD_THRESHOLDS.loop_closure_min, "1 completed / 3 terminal attempts");
  assert.equal(sc.grades.loop_closure, "fail");
  assert.ok(sc.dimensions.execution.evidence_rate < SCORECARD_THRESHOLDS.evidence_rate_min, "claimed-without-evidence penalty");
  assert.equal(sc.grades.evidence_discipline, "fail");
  assert.ok(["degraded", "blocked"].includes(sc.autonomy_status));
});

test("RECONCILIATION: queued/no-attempt packets are waiting, not failures", () => {
  // 3 queued packets that were never attempted (no_send/no_transport) → loop and
  // evidence are WAITING/n-a, NOT fail. This is the core score/state fix.
  const document = { approvalExecutionQueue: { items: [task("t1", "queued"), task("t2", "queued"), task("t3", "queued")] } };
  const sc = computeScorecard({ document, leads: [{ lead_id: "li", tier: "B-tier", created_at: NOW }], now: NOW });
  assert.equal(sc.dimensions.execution.loop_closure_rate, null, "no attempt → null");
  assert.equal(sc.dimensions.execution.evidence_rate, null);
  assert.equal(sc.grades.loop_closure, "waiting");
  assert.equal(sc.grades.evidence_discipline, "waiting");
  assert.equal(sc.dimensions.execution.waiting, 3);
  // No false jonathan_approval blocker when nothing is truly gated.
  assert.ok(!sc.top_blockers.some((b) => b.type === "jonathan_approval"));
});

test("pending Jonathan approvals raise the bottleneck rate and surface as a blocker", () => {
  const document = {
    approvalExecutionQueue: { items: [task("t1", "queued")] },
    implementationWorkOrders: { orders: [{ id: "impl-1", implementation_stage: "awaiting_pilot_scope_or_proposal", approvalRequired: true, approvalStatus: "pending" }] },
  };
  const sc = computeScorecard({ document, leads: [{ lead_id: "l", created_at: NOW }], now: NOW });
  assert.ok(sc.dimensions.jonathan_bottleneck.pending_approvals >= 1);
  assert.ok(sc.dimensions.jonathan_bottleneck.work_orders_awaiting_approval.includes("impl-1"));
  assert.ok(sc.top_blockers.some((b) => b.type === "jonathan_approval"));
});

test("aging open repair fails repair_aging and is a critical blocker → blocked", () => {
  const document = {
    repairPackets: [{ id: "repair-leads", owner: "Cowork", status: "open", created_at: daysAgo(5), actual_behavior: "Pipeline empty" }],
  };
  const sc = computeScorecard({ document, leads: [{ lead_id: "l", created_at: NOW }], now: NOW });
  assert.equal(sc.grades.repair_aging, "fail");
  assert.ok(sc.dimensions.repair.oldest_open_repair_days >= 5);
  assert.equal(sc.autonomy_status, "blocked");
  assert.ok(sc.top_blockers[0].type === "broken_rail");
});

test("rail reliability + MTTR computed from ledger broken→repaired pairs", () => {
  const ledger = [
    makeLedgerEntry({ event_type: "rail_broken", source_type: "repair_packet", source_id: "rail-x", ts: daysAgo(2), dedupe_key: "b1" }),
    makeLedgerEntry({ event_type: "rail_repaired", source_type: "repair_packet", source_id: "rail-x", ts: daysAgo(1), dedupe_key: "r1" }),
  ];
  const sc = computeScorecard({ document: {}, leads: [{ lead_id: "l", created_at: NOW }], ledger, now: NOW });
  assert.equal(sc.dimensions.repair.rails_broken, 1);
  assert.equal(sc.dimensions.repair.rails_repaired, 1);
  assert.equal(sc.dimensions.repair.rail_reliability, 1);
  assert.equal(sc.dimensions.repair.mttr_days, 1);
});

test("actor reliability is surfaced from the ledger summary", () => {
  const ledger = [
    makeLedgerEntry({ event_type: "action_proposed", actor: "Cowork", source_id: "s", dedupe_key: "p" }),
    makeLedgerEntry({ event_type: "evidence_submitted", actor: "Cowork", source_id: "t", dedupe_key: "e" }),
    makeLedgerEntry({ event_type: "status_changed", actor: "Cowork", source_id: "t", to_status: "completed", outcome: "success", dedupe_key: "s2" }),
  ];
  const sc = computeScorecard({ document: {}, leads: [{ lead_id: "l", created_at: NOW }], ledgerSummary: summarizeLedger(ledger), now: NOW });
  assert.equal(sc.actor_reliability.Cowork.completed, 1);
  assert.equal(sc.actor_reliability.Cowork.completion_rate, 1);
});

test("scorecard always carries status, score, grades, dimensions, and blockers", () => {
  const sc = computeScorecard({ document: {}, leads: [], now: NOW });
  for (const k of ["autonomy_status", "autonomy_score", "grades", "dimensions", "actor_reliability", "top_blockers", "thresholds"]) {
    assert.ok(k in sc, `missing ${k}`);
  }
  assert.ok(typeof sc.autonomy_score === "number");
});
