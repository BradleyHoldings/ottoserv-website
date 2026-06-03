import assert from "node:assert/strict";
import test from "node:test";

import { bridgeApprovalToExecution } from "../src/lib/approvalExecutionBridge.mjs";
import {
  evidenceFingerprint,
  applyEvidenceToItem,
  applyEvidenceToQueue,
  applyEvidenceToDocument,
  persistEvidenceWriteback,
  applySafeStatusUpdate,
  ALLOWED_LEAD_STATUSES,
} from "../src/lib/approvalEvidenceWriteback.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

// A realistic approved item → { taskPacket, lifecycle } via the existing bridge.
function approvedItem(action = "Send approved follow-up email to warm lead") {
  const { taskPacket, lifecycle } = bridgeApprovalToExecution(
    { decision: "approved", approval_item_id: "appr-001", original_requested_action: action, risk_level: "low" },
    { now: NOW },
  );
  return { taskPacket, lifecycle };
}

test("evidence fingerprint is deterministic for identical content", () => {
  const ev = { evidence_type: "proof", evidence_reference: "msg-123", evidence_summary: "sent", submitted_by_agent: "OttoServ Outreach" };
  assert.equal(evidenceFingerprint("task-1", ev), evidenceFingerprint("task-1", ev));
  assert.notEqual(evidenceFingerprint("task-1", ev), evidenceFingerprint("task-1", { ...ev, evidence_reference: "msg-999" }));
});

test("submitting evidence attaches it and moves status to evidence_submitted", () => {
  const item = approvedItem();
  const res = applyEvidenceToItem(item, {
    task_id: item.taskPacket.task_id,
    evidence: { evidence_type: "email_sent", evidence_reference: "message-id-42", evidence_summary: "Sent follow-up" },
  }, { now: NOW });
  assert.equal(res.ok, true);
  assert.equal(res.changed, true);
  assert.equal(res.item.lifecycle.submitted_evidence.length, 1);
  assert.equal(res.item.lifecycle.execution_status, "evidence_submitted");
  assert.equal(res.item.lifecycle.evidence_status, "submitted");
});

test("resubmitting identical evidence is idempotent (no duplicate, no change)", () => {
  const item = approvedItem();
  const submission = {
    task_id: item.taskPacket.task_id,
    evidence: { evidence_type: "email_sent", evidence_reference: "message-id-42", evidence_summary: "Sent follow-up" },
  };
  const first = applyEvidenceToItem(item, submission, { now: NOW });
  const second = applyEvidenceToItem(first.item, submission, { now: NOW });
  assert.equal(second.changed, false, "no change on resubmit");
  assert.equal(second.item.lifecycle.submitted_evidence.length, 1, "no duplicate evidence");
  assert.equal(second.evidence_id, first.evidence_id);
});

test("cannot advance to completed without evidence; can with evidence", () => {
  const item = approvedItem();
  // No evidence + advance_to completed → blocked by the gate.
  const blocked = applyEvidenceToItem(item, { task_id: item.taskPacket.task_id, evidence: {}, advance_to: "completed" }, { now: NOW });
  // Empty evidence has no reference/summary → canCompleteExecution false.
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /required evidence is missing/i);

  // Real evidence + advance_to completed → allowed and gated through.
  const ok = applyEvidenceToItem(item, {
    task_id: item.taskPacket.task_id,
    evidence: { evidence_reference: "message-id-42", evidence_summary: "Sent follow-up" },
    advance_to: "completed",
  }, { now: NOW });
  assert.equal(ok.ok, true);
  assert.equal(ok.item.lifecycle.execution_status, "completed");
  assert.equal(ok.item.lifecycle.evidence_status, "accepted");
});

test("applyEvidenceToQueue locates the item and leaves the input queue untouched", () => {
  const item = approvedItem();
  const queue = { count: 1, items: [item] };
  const res = applyEvidenceToQueue(queue, {
    task_id: item.taskPacket.task_id,
    evidence: { evidence_reference: "r1", evidence_summary: "done" },
  }, { now: NOW });
  assert.equal(res.ok, true);
  assert.equal(res.queue.items[0].lifecycle.submitted_evidence.length, 1);
  // Input not mutated.
  assert.equal(queue.items[0].lifecycle.submitted_evidence.length, 0);
});

test("unknown task is reported, never silently no-ops", () => {
  const queue = { count: 1, items: [approvedItem()] };
  const res = applyEvidenceToQueue(queue, { task_id: "does-not-exist", evidence: { evidence_reference: "r" } }, { now: NOW });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "task_not_found");
});

test("applyEvidenceToDocument returns a new document with the updated queue", () => {
  const item = approvedItem();
  const document = { status: "ready", approvalExecutionQueue: { count: 1, items: [item] }, generated_at: NOW };
  const res = applyEvidenceToDocument(document, {
    approval_item_id: "appr-001",
    evidence: { evidence_reference: "r1", evidence_summary: "ok" },
  }, { now: NOW });
  assert.equal(res.ok, true);
  assert.equal(res.document.approvalExecutionQueue.items[0].lifecycle.submitted_evidence.length, 1);
  assert.equal(document.approvalExecutionQueue.items[0].lifecycle.submitted_evidence.length, 0);
});

test("persistEvidenceWriteback no-ops Supabase when persistSupabase=false but still applies", async () => {
  const item = approvedItem();
  const document = { approvalExecutionQueue: { count: 1, items: [item] } };
  const res = await persistEvidenceWriteback(document, {
    task_id: item.taskPacket.task_id,
    evidence: { evidence_reference: "r1", evidence_summary: "ok" },
  }, { now: NOW, persistSupabase: false });
  assert.equal(res.ok, true);
  assert.equal(res.changed, true);
  assert.equal(res.supabase.ok, false);
  assert.equal(res.document.approvalExecutionQueue.items[0].lifecycle.submitted_evidence.length, 1);
});

// ─── Safe status-update adapter ───────────────────────────────────────────────

test("safe status update moves an allowed status and records history", () => {
  const lead = { lead_id: "li-1", status: "ready_to_email" };
  const res = applySafeStatusUpdate(lead, { kind: "lead", toStatus: "contacted", now: NOW });
  assert.equal(res.ok, true);
  assert.equal(res.changed, true);
  assert.equal(res.record.status, "contacted");
  assert.equal(res.record.status_history[0].from, "ready_to_email");
  assert.equal(res.record.status_history[0].to, "contacted");
  // Never invented contact/send fields.
  assert.equal(res.record.email, undefined);
});

test("safe status update is idempotent for the current status", () => {
  const lead = { lead_id: "li-1", status: "contacted" };
  const res = applySafeStatusUpdate(lead, { kind: "lead", toStatus: "contacted", now: NOW });
  assert.equal(res.ok, true);
  assert.equal(res.changed, false);
});

test("disallowed status and unknown kind are rejected", () => {
  assert.equal(applySafeStatusUpdate({ status: "new" }, { kind: "lead", toStatus: "nuke_everything" }).ok, false);
  assert.equal(applySafeStatusUpdate({ status: "new" }, { kind: "spaceship", toStatus: "new" }).ok, false);
  assert.ok(ALLOWED_LEAD_STATUSES.includes("won"));
});

test("committed/terminal statuses require evidence", () => {
  const lead = { lead_id: "li-1", status: "responded" };
  const blocked = applySafeStatusUpdate(lead, { kind: "lead", toStatus: "won", now: NOW });
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /requires evidence/i);

  const ok = applySafeStatusUpdate(lead, { kind: "lead", toStatus: "won", hasEvidence: true, now: NOW });
  assert.equal(ok.ok, true);
  assert.equal(ok.record.status, "won");
});
