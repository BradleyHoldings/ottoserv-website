// Priority 6: evidence closure loop. A queued durable actor packet is completable
// through the evidence write-back, and the closure is reflected in the autonomy
// scorecard (loop closure + evidence discipline). No real send/call involved.

import assert from "node:assert/strict";
import test from "node:test";

import { materializeActorPackets, DEFAULT_STANDING_OUTBOUND_POLICY } from "../src/lib/hermesApprovalThroughput.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";
import { mergeMaterializedIntoQueue } from "../src/lib/hermesActorQueue.mjs";
import { applyEvidenceToDocument } from "../src/lib/approvalEvidenceWriteback.mjs";
import { computeScorecard } from "../src/lib/hermesAutonomyScorecard.mjs";

const NOW = "2026-06-04T12:00:00.000Z";

function leads() {
  return [
    { lead_id: "li-b1", company: "Bravo Plumbing", tier: "B-tier", email: "o@bravo.example", status: "ready_to_email", score: 66, source_url: "https://reddit.com/x/b1", notes: "missing calls", pain_signal: "after-hours misses", created_at: NOW, intent: { recommended_offer: "AI Receptionist", source_urls: ["https://reddit.com/x/b1"] } },
  ];
}

function queuedDocument() {
  const actions = selectNextActions({ leads: leads(), document: {}, now: NOW }).actions;
  const throughput = materializeActorPackets(actions, { now: NOW, standingOutboundPolicy: DEFAULT_STANDING_OUTBOUND_POLICY });
  const { document } = mergeMaterializedIntoQueue({}, actions, throughput, { now: NOW, leads: leads(), policy: DEFAULT_STANDING_OUTBOUND_POLICY });
  const taskId = document.approvalExecutionQueue.items.find((i) => i.taskPacket.actor_packet?.channel === "email").taskPacket.task_id;
  return { document, taskId };
}

test("a queued outbound packet requires evidence and cannot complete without it", () => {
  const { document, taskId } = queuedDocument();
  // Completing straight away is refused: evidence is required first.
  const premature = applyEvidenceToDocument(document, { task_id: taskId, advance_to: "completed", evidence: {} }, { now: NOW });
  assert.equal(premature.ok, false, "cannot complete without evidence");
});

test("submitting evidence closes the queued packet (queued → completed)", () => {
  const { document, taskId } = queuedDocument();
  const closed = applyEvidenceToDocument(
    document,
    { task_id: taskId, advance_to: "completed", evidence: { evidence_reference: "msg-001", evidence_summary: "message id msg-001; disposition delivered_no_reply; next: follow-up D+3" } },
    { now: NOW },
  );
  assert.equal(closed.ok, true);
  assert.equal(closed.status, "completed");
  const item = closed.document.approvalExecutionQueue.items.find((i) => i.taskPacket.task_id === taskId);
  assert.equal(item.lifecycle.execution_status, "completed");
  assert.ok(item.lifecycle.submitted_evidence.some((e) => e.evidence_reference === "msg-001"));
});

test("closure is reflected in the autonomy scorecard (loop closure + evidence rate)", () => {
  const { document, taskId } = queuedDocument();
  const before = computeScorecard({ document, leads: leads(), now: NOW });

  const closed = applyEvidenceToDocument(
    document,
    { task_id: taskId, advance_to: "completed", evidence: { evidence_reference: "msg-001", evidence_summary: "delivered; next: follow-up" } },
    { now: NOW },
  );
  const after = computeScorecard({ document: closed.document, leads: leads(), now: NOW });

  assert.ok(after.dimensions.execution.completed >= before.dimensions.execution.completed + 1, "a task moved to completed");
  assert.ok(after.dimensions.execution.loop_closure_rate >= before.dimensions.execution.loop_closure_rate, "loop closure reflects the completion");
  assert.ok(after.dimensions.execution.evidence_rate >= 0.5, "evidence discipline reflects the attached evidence");
});
