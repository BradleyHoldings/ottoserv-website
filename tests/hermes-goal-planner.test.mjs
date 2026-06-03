import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { bridgeApprovalToExecution, attachExecutionEvidence } from "../src/lib/approvalExecutionBridge.mjs";
import { advanceExecutionStatus } from "../src/lib/approvalExecutionBridge.mjs";
import { deriveGoals, reconcileGoals, runGoalPlanning, isoWeekKey, DEFAULT_TARGETS } from "../src/lib/hermesGoalPlanner.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

function completedTask(id) {
  let { taskPacket, lifecycle } = bridgeApprovalToExecution(
    { decision: "approved", approval_item_id: id, original_requested_action: "Send approved follow-up email", risk_level: "low" },
    { now: NOW },
  );
  lifecycle = attachExecutionEvidence(lifecycle, { evidence_reference: "r", evidence_summary: "done" }, { now: NOW });
  lifecycle = advanceExecutionStatus(lifecycle, "completed", { now: NOW }).lifecycle;
  return { taskPacket, lifecycle };
}

test("isoWeekKey is stable for a given date", () => {
  assert.equal(isoWeekKey("2026-06-03T12:00:00.000Z"), isoWeekKey("2026-06-03T23:00:00.000Z"));
  assert.match(isoWeekKey(NOW), /^\d{4}-W\d{2}$/);
});

test("deriveGoals turns gaps into measurable goals with status", () => {
  const goals = deriveGoals({ document: {}, leads: [], now: NOW });
  const lead = goals.find((g) => g.metric === "high_intent_leads");
  assert.ok(lead);
  assert.equal(lead.target, DEFAULT_TARGETS.high_intent_leads_weekly);
  assert.equal(lead.current, 0);
  assert.equal(lead.status, "blocked"); // empty pipeline → scorecard blocked
  const repairs = goals.find((g) => g.metric === "open_repairs");
  assert.equal(repairs.direction, "reduce");
  assert.equal(repairs.status, "met"); // 0 open repairs
});

test("a met goal is reported when the metric reaches target", () => {
  const document = { approvalExecutionQueue: { items: [completedTask("t1"), completedTask("t2"), completedTask("t3"), completedTask("t4"), completedTask("t5")] } };
  const leads = [{ lead_id: "l", tier: "A-tier", created_at: NOW, normalized_phone: "1", source_url: "u" }];
  const goals = deriveGoals({ document, leads, now: NOW });
  const tasks = goals.find((g) => g.metric === "tasks_completed");
  assert.equal(tasks.current, 5);
  assert.equal(tasks.status, "met");
  assert.equal(tasks.progress, 1);
});

test("reconcileGoals keeps created_at and updates the measurement", () => {
  const existing = [{ goal_id: "goal-tasks_completed-2026-W23", metric: "tasks_completed", created_at: "2026-06-01T00:00:00.000Z", current: 1, status: "at_risk" }];
  const candidates = [{ goal_id: "goal-tasks_completed-2026-W23", metric: "tasks_completed", current: 4, progress: 0.8, status: "on_track", target: 5, next_action_hint: "x" }];
  const merged = reconcileGoals(existing, candidates, { now: NOW });
  const g = merged.find((x) => x.goal_id === "goal-tasks_completed-2026-W23");
  assert.equal(g.created_at, "2026-06-01T00:00:00.000Z", "created_at preserved");
  assert.equal(g.current, 4, "measurement updated");
  assert.equal(g.status, "on_track");
  assert.equal(g.updated_at, NOW);
});

test("runGoalPlanning persists goals + summary and tracks across runs", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "goals-"));
  const r1 = await runGoalPlanning({ document: {}, leads: [], now: NOW }, { dataDir: dir, persistSupabase: false });
  assert.equal(r1.ok, true);
  assert.ok(r1.goals.length >= 4);
  assert.ok(r1.summary.total >= 4);
  assert.equal(r1.persisted.local, true);

  const onDisk = JSON.parse(readFileSync(path.join(dir, "operating-goals.json"), "utf8"));
  assert.equal(onDisk.id, "operating_goals");
  assert.ok(onDisk.summary.attainment !== undefined);

  // Second run with progress made → same goal_id, improved measurement.
  const document = { approvalExecutionQueue: { items: [completedTask("t1"), completedTask("t2"), completedTask("t3"), completedTask("t4"), completedTask("t5")] } };
  const r2 = await runGoalPlanning({ document, leads: [{ lead_id: "l", tier: "A-tier", created_at: NOW, normalized_phone: "1", source_url: "u" }], now: NOW }, { dataDir: dir, persistSupabase: false });
  const tasks = r2.goals.find((g) => g.metric === "tasks_completed");
  assert.equal(tasks.status, "met");
});
