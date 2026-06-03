import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { bridgeApprovalToExecution } from "../src/lib/approvalExecutionBridge.mjs";
import { runOperatingCycle } from "../src/lib/hermesOrchestrator.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

function approvedTask(id = "appr-1") {
  return bridgeApprovalToExecution(
    { decision: "approved", approval_item_id: id, original_requested_action: "Send approved follow-up email", risk_level: "low" },
    { now: NOW },
  );
}

function seedDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "orch-"));
  const { taskPacket, lifecycle } = approvedTask();
  const document = {
    status: "ready",
    generated_at: NOW,
    approvalExecutionQueue: { count: 1, items: [{ taskPacket, lifecycle }] },
    implementationWorkOrders: { orders: [] },
    repairPackets: [{ id: "repair-leads", owner: "Cowork", status: "open", created_at: NOW, actual_behavior: "Only 1 high-intent lead" }],
  };
  writeFileSync(path.join(dir, "latest.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return { dir, taskPacket };
}

test("a cycle senses, decides, scores, records, and persists", async () => {
  const { dir } = seedDir();
  const res = await runOperatingCycle({ now: NOW, dataDir: dir, state: { leads: [] }, persistSupabase: false });
  assert.equal(res.ok, true);
  assert.ok(["operating", "degraded", "blocked"].includes(res.summary.autonomy_status));
  assert.ok(res.summary.next_actions >= 1, "emits next actions");
  assert.ok(res.summary.ledger_added >= 1, "records proposals to the ledger");

  // Cycle published locally for actors/dashboard/Hermes to read.
  const cycle = JSON.parse(readFileSync(path.join(dir, "operating-cycle.json"), "utf8"));
  assert.equal(cycle.id, "operating_cycle");
  assert.ok(Array.isArray(cycle.next_actions));
  assert.ok(cycle.scorecard.autonomy_status);

  // Operating ledger grew (memory persisted).
  const ledger = JSON.parse(readFileSync(path.join(dir, "operating-ledger.json"), "utf8"));
  assert.ok(ledger.entries.length >= 1);
});

test("a repair packet drives a critical action and a blocked/degraded status", async () => {
  const { dir } = seedDir();
  const res = await runOperatingCycle({ now: NOW, dataDir: dir, state: { leads: [] }, persistSupabase: false });
  const cycle = JSON.parse(readFileSync(path.join(dir, "operating-cycle.json"), "utf8"));
  assert.ok(cycle.next_actions.some((a) => a.source_type === "repair_packet" && a.priority === "critical"));
  assert.ok(cycle.top_blockers.length >= 1);
});

test("re-running the same cycle is idempotent in the ledger (deterministic ids)", async () => {
  const { dir } = seedDir();
  const r1 = await runOperatingCycle({ now: NOW, dataDir: dir, state: { leads: [] }, persistSupabase: false });
  const r2 = await runOperatingCycle({ now: NOW, dataDir: dir, state: { leads: [] }, persistSupabase: false });
  assert.ok(r1.summary.ledger_added >= 1);
  assert.equal(r2.summary.ledger_added, 0, "no duplicate proposals recorded");
});

test("learning actually weights the cycle: unreliable assigned actor is flagged + reroute proposed", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "orch-learn-"));
  const { taskPacket, lifecycle } = approvedTask();
  const document = { approvalExecutionQueue: { items: [{ taskPacket, lifecycle }] }, repairPackets: [] };
  writeFileSync(path.join(dir, "latest.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  // Pre-seed an operating ledger where the assigned actor has poor completion.
  const actor = lifecycle.assigned_agent;
  const ledgerDoc = {
    id: "operating_ledger",
    entries: [
      { entry_id: "x1", ts: NOW, event_type: "evidence_submitted", actor, source_id: "a", outcome: "pending", schema_version: "1.0" },
      { entry_id: "x2", ts: NOW, event_type: "evidence_submitted", actor, source_id: "b", outcome: "pending", schema_version: "1.0" },
    ],
  };
  writeFileSync(path.join(dir, "operating-ledger.json"), `${JSON.stringify(ledgerDoc, null, 2)}\n`, "utf8");

  const res = await runOperatingCycle({ now: NOW, dataDir: dir, state: { leads: [] }, persistSupabase: false });
  const taskAction = res.cycle.next_actions.find((a) => a.source_id === taskPacket.task_id);
  assert.ok(taskAction, "task action present");
  assert.ok("learning" in taskAction, "cycle output is learning-weighted");
  assert.equal(taskAction.learning.actor_status, "unreliable");
  assert.ok(taskAction.learning.reroute_to, "reroute proposed for unreliable actor");
});

test("missing state is safe: no document → blocked, no crash", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "orch-empty-"));
  const res = await runOperatingCycle({ now: NOW, dataDir: dir, state: { document: {}, leads: [] }, persistSupabase: false });
  assert.equal(res.ok, true);
  assert.equal(res.summary.autonomy_status, "blocked");
});
