import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import { readApprovalExecutionQueue } from "../src/lib/revenueEngineReadAdapter.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

function emptySourceCwd() {
  return { cwd: mkdtempSync(path.join(os.tmpdir(), "apx-src-")) };
}
function tmpOut() {
  return mkdtempSync(path.join(os.tmpdir(), "apx-out-"));
}

test("runner embeds the approval execution queue and persists it to latest.json", async () => {
  const outputDir = tmpOut();
  const approvals = [
    {
      decision_id: "dec-1",
      approval_item_id: "appr-001",
      decision: "approved",
      original_requested_action: "Send approved follow-up email to warm lead",
      risk_level: "low",
    },
    {
      decision_id: "dec-2",
      approval_item_id: "appr-002",
      decision: "rejected",
      original_requested_action: "New outbound campaign",
      risk_level: "high",
    },
  ];
  const result = await runRevenueDailyLoop({ now: NOW, outputDir, sourceOptions: emptySourceCwd(), approvals, persistSupabase: false });

  assert.equal(result.summary.approval_execution_queue.count, 1, "1 approved → 1 task");
  assert.equal(result.summary.approval_execution_queue.skipped_not_approved, 1);

  const latest = JSON.parse(readFileSync(path.join(outputDir, "latest.json"), "utf8"));
  assert.equal(latest.approvalExecutionQueue.count, 1);
  assert.equal(latest.approvalExecutionQueue.items[0].taskPacket.related_approval_item_id, "appr-001");
});

test("no approvals → empty queue (no behavior change, nothing executed)", async () => {
  const outputDir = tmpOut();
  const result = await runRevenueDailyLoop({ now: NOW, outputDir, sourceOptions: emptySourceCwd(), approvals: [], persistSupabase: false });
  assert.equal(result.summary.approval_execution_queue.count, 0);
});

test("adapter reads the queue and scrubs PII from evidence", async () => {
  const outputDir = tmpOut();
  const approvals = [
    {
      decision_id: "dec-3",
      approval_item_id: "appr-003",
      decision: "approved",
      original_requested_action: "Update CRM lead status to contacted",
      risk_level: "low",
    },
  ];
  await runRevenueDailyLoop({ now: NOW, outputDir, sourceOptions: emptySourceCwd(), approvals, persistSupabase: false });

  // Simulate an actor having attached evidence with raw PII into the stored doc.
  const latestPath = path.join(outputDir, "latest.json");
  const doc = JSON.parse(readFileSync(latestPath, "utf8"));
  doc.approvalExecutionQueue.items[0].lifecycle.submitted_evidence = [
    { evidence_summary: "Emailed maya@harborpoint.com", evidence_reference: "called 555-184-3301" },
  ];
  writeFileSync(latestPath, JSON.stringify(doc));

  const queue = await readApprovalExecutionQueue({ dataDir: outputDir });
  assert.equal(queue.available, true);
  assert.equal(queue.count, 1);
  const ev = queue.items[0].lifecycle.submitted_evidence[0];
  assert.ok(!ev.evidence_summary.includes("maya@harborpoint.com"));
  assert.ok(ev.evidence_summary.includes("[redacted-email]"));
  assert.ok(!ev.evidence_reference.includes("555-184-3301"));
  assert.ok(ev.evidence_reference.includes("[redacted-phone]"));
});
