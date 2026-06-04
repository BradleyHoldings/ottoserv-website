import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { bridgeApprovalToExecution, attachExecutionEvidence } from "../src/lib/approvalExecutionBridge.mjs";
import { executeSafeInternalActions, applySafeExecutions } from "../src/lib/hermesSafeExecutor.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

function task(id, { withEvidence = false, empty = false } = {}) {
  const { taskPacket, lifecycle } = bridgeApprovalToExecution(
    { decision: "approved", approval_item_id: id, original_requested_action: "Send approved follow-up email", risk_level: "low" },
    { now: NOW },
  );
  let lc = lifecycle;
  if (withEvidence) lc = attachExecutionEvidence(lifecycle, { evidence_reference: "ref-1", evidence_summary: "done", submitted_by_agent: "OttoServ Outreach" }, { now: NOW });
  if (empty) lc = attachExecutionEvidence(lifecycle, { evidence_reference: "", evidence_summary: "" }, { now: NOW });
  return { taskPacket, lifecycle: lc };
}

test("task with sufficient evidence is auto-completed", () => {
  const doc = { approvalExecutionQueue: { items: [task("t1", { withEvidence: true })] } };
  const res = executeSafeInternalActions(doc, { now: NOW });
  assert.equal(res.executed.length, 1);
  assert.equal(res.executed[0].to, "completed");
  assert.equal(res.document.approvalExecutionQueue.items[0].lifecycle.execution_status, "completed");
  assert.equal(res.document.approvalExecutionQueue.items[0].lifecycle.evidence_status, "accepted");
});

test("evidence_submitted but insufficient is NOT completed", () => {
  const doc = { approvalExecutionQueue: { items: [task("t2", { empty: true })] } };
  const res = executeSafeInternalActions(doc, { now: NOW });
  assert.equal(res.executed.length, 0);
  assert.ok(res.skipped.some((s) => s.reason === "evidence_insufficient"));
});

test("queued task without evidence is left for the proposal queue", () => {
  const doc = { approvalExecutionQueue: { items: [task("t3")] } };
  const res = executeSafeInternalActions(doc, { now: NOW });
  assert.equal(res.executed.length, 0);
  assert.ok(res.skipped[0].reason.startsWith("not_auto_executable"));
});

test("already-completed task is idempotent (no-op)", () => {
  const t = task("t4", { withEvidence: true });
  const once = executeSafeInternalActions({ approvalExecutionQueue: { items: [t] } }, { now: NOW });
  const twice = executeSafeInternalActions(once.document, { now: NOW });
  assert.equal(twice.executed.length, 0);
  assert.ok(twice.skipped.some((s) => s.reason === "already_completed"));
});

test("input document is not mutated", () => {
  const doc = { approvalExecutionQueue: { items: [task("t5", { withEvidence: true })] } };
  executeSafeInternalActions(doc, { now: NOW });
  assert.equal(doc.approvalExecutionQueue.items[0].lifecycle.execution_status, "evidence_submitted");
});

test("applySafeExecutions persists the completion to latest.json + records the ledger", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "safe-exec-"));
  const document = { status: "ready", approvalExecutionQueue: { items: [task("t6", { withEvidence: true })] } };
  writeFileSync(path.join(dir, "latest.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8");

  const res = await applySafeExecutions({ now: NOW, dataDir: dir, persistSupabase: false });
  assert.equal(res.ok, true);
  assert.equal(res.executed.length, 1);
  assert.equal(res.persisted.local, true);

  const onDisk = JSON.parse(readFileSync(path.join(dir, "latest.json"), "utf8"));
  assert.equal(onDisk.approvalExecutionQueue.items[0].lifecycle.execution_status, "completed");

  const ledger = JSON.parse(readFileSync(path.join(dir, "operating-ledger.json"), "utf8"));
  assert.ok(ledger.entries.some((e) => e.event_type === "status_changed" && e.to_status === "completed"));
});

test("state unavailable returns a clear error, not a crash", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "safe-exec-empty-"));
  const res = await applySafeExecutions({ now: NOW, dataDir: dir, persistSupabase: false });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "state_unavailable");
});
