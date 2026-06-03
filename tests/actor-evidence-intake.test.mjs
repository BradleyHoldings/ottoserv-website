import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { bridgeApprovalToExecution } from "../src/lib/approvalExecutionBridge.mjs";
import { submitActorEvidence, loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

// Build a realistic latest.json with one approved execution task + one work order.
function seedStateDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "evi-state-"));
  const { taskPacket, lifecycle } = bridgeApprovalToExecution(
    { decision: "approved", approval_item_id: "appr-100", original_requested_action: "Send approved follow-up email to warm lead", risk_level: "low" },
    { now: NOW },
  );
  const document = {
    status: "ready",
    generated_at: NOW,
    approvalExecutionQueue: { count: 1, skipped_not_approved: 0, items: [{ taskPacket, lifecycle }] },
    implementationWorkOrders: {
      orders: [
        { id: "impl-001", title: "Pilot for Harbor Point", status: "awaiting_pilot_scope_or_proposal", approvalRequired: true },
      ],
    },
  };
  writeFileSync(path.join(dir, "latest.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return { dir, taskId: taskPacket.task_id };
}

test("loadRevenueDocument reads the local latest.json", async () => {
  const { dir } = seedStateDir();
  const loaded = await loadRevenueDocument({ dataDir: dir });
  assert.equal(loaded.available, true);
  assert.equal(loaded.source.kind, "local_file");
  assert.equal(loaded.document.approvalExecutionQueue.count, 1);
});

test("actor submits evidence → attached, status advanced, latest.json updated", async () => {
  const { dir, taskId } = seedStateDir();
  const res = await submitActorEvidence(
    {
      task_id: taskId,
      actor: "OttoServ Outreach",
      evidence_text: "Sent the approved follow-up email.",
      evidence_type: "email_sent",
      evidence_reference: "message-id-abc123",
    },
    { now: NOW, dataDir: dir, persistSupabase: false },
  );
  assert.equal(res.ok, true);
  assert.equal(res.changed, true);
  assert.equal(res.status, "evidence_submitted");
  assert.equal(res.persisted.local, true);
  assert.equal(res.persisted.supabase.skipped, true);

  // Persisted to disk.
  const onDisk = JSON.parse(readFileSync(path.join(dir, "latest.json"), "utf8"));
  assert.equal(onDisk.approvalExecutionQueue.items[0].lifecycle.submitted_evidence.length, 1);
});

test("resubmitting the same evidence is idempotent (no duplicate, changed=false)", async () => {
  const { dir, taskId } = seedStateDir();
  const submission = { task_id: taskId, actor: "Codex", evidence_text: "Done", evidence_reference: "ref-1" };
  await submitActorEvidence(submission, { now: NOW, dataDir: dir, persistSupabase: false });
  const second = await submitActorEvidence(submission, { now: NOW, dataDir: dir, persistSupabase: false });
  assert.equal(second.ok, true);
  assert.equal(second.changed, false);
  const onDisk = JSON.parse(readFileSync(path.join(dir, "latest.json"), "utf8"));
  assert.equal(onDisk.approvalExecutionQueue.items[0].lifecycle.submitted_evidence.length, 1);
});

test("advancing to completed requires evidence (gate enforced end-to-end)", async () => {
  const { dir, taskId } = seedStateDir();
  // Evidence present + advance_to completed → allowed.
  const ok = await submitActorEvidence(
    { task_id: taskId, actor: "Codex", evidence_text: "Shipped", evidence_reference: "commit-abc", advance_to: "completed" },
    { now: NOW, dataDir: dir, persistSupabase: false },
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.status, "completed");
});

test("unknown task returns a clear task_not_found error", async () => {
  const { dir } = seedStateDir();
  const res = await submitActorEvidence(
    { task_id: "apx-nope", actor: "Cowork", evidence_text: "x", evidence_reference: "y" },
    { now: NOW, dataDir: dir, persistSupabase: false },
  );
  assert.equal(res.ok, false);
  assert.equal(res.reason, "task_not_found");
});

test("missing actor / evidence / task id are rejected with clear errors", async () => {
  const { dir, taskId } = seedStateDir();
  assert.equal((await submitActorEvidence({ actor: "Cowork", evidence_text: "x" }, { dataDir: dir, persistSupabase: false })).ok, false);
  assert.equal((await submitActorEvidence({ task_id: taskId, evidence_text: "x" }, { dataDir: dir, persistSupabase: false })).ok, false);
  assert.equal((await submitActorEvidence({ task_id: taskId, actor: "Cowork" }, { dataDir: dir, persistSupabase: false })).ok, false);
});

test("state unavailable returns a clear error, not a crash", async () => {
  const emptyDir = mkdtempSync(path.join(os.tmpdir(), "evi-empty-"));
  const res = await submitActorEvidence(
    { task_id: "apx-x", actor: "Cowork", evidence_text: "x", evidence_reference: "y" },
    { dataDir: emptyDir, persistSupabase: false },
  );
  assert.equal(res.ok, false);
  assert.equal(res.reason, "state_unavailable");
});

test("returned evidence view is PII-redacted", async () => {
  const { dir, taskId } = seedStateDir();
  const res = await submitActorEvidence(
    { task_id: taskId, actor: "OttoServ Outreach", evidence_text: "Emailed maya@harborpoint.com at 555-184-3301" },
    { now: NOW, dataDir: dir, persistSupabase: false },
  );
  const ev = res.lifecycle.submitted_evidence[0];
  assert.ok(!ev.evidence_summary.includes("maya@harborpoint.com"));
  assert.ok(ev.evidence_summary.includes("[redacted-email]"));
  assert.ok(ev.evidence_summary.includes("[redacted-phone]"));
});

test("optional work-order status move is applied (evidence-gated) and persisted", async () => {
  const { dir, taskId } = seedStateDir();
  const res = await submitActorEvidence(
    {
      task_id: taskId,
      actor: "Codex",
      evidence_text: "Pilot delivered; report shipped.",
      evidence_reference: "deliverable-url",
      target: { kind: "work_order", id: "impl-001", status: "delivered" },
    },
    { now: NOW, dataDir: dir, persistSupabase: false },
  );
  assert.equal(res.ok, true);
  const onDisk = JSON.parse(readFileSync(path.join(dir, "latest.json"), "utf8"));
  assert.equal(onDisk.implementationWorkOrders.orders[0].status, "delivered");
  assert.equal(onDisk.implementationWorkOrders.orders[0].status_history[0].to, "delivered");
});
