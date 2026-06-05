// Sprint priority 1: score/state reconciliation.
//   - zero truly-gated actions => zero Jonathan blockers, even if the append-only
//     ledger still shows stale pending approvals (superseded).
//   - no_send / no_transport / no attempt does NOT reduce reliability or fail
//     loop/evidence — those read waiting/n-a until an eligible live attempt occurs.
//   - genuine penalties (failed attempt, claimed-without-evidence, true gated) stay.

import assert from "node:assert/strict";
import test from "node:test";

import { computeScorecard } from "../src/lib/hermesAutonomyScorecard.mjs";

const NOW = "2026-06-04T15:00:00.000Z";

function emailPacket(id, status, { evidence = false } = {}) {
  return {
    taskPacket: { task_id: id, actor_packet: { task_id: id, channel: "email" } },
    lifecycle: {
      assigned_task_id: id, execution_status: status,
      required_evidence: ["Outbound email evidence: message id, timestamp, outcome."],
      submitted_evidence: evidence ? [{ evidence_reference: `msg-${id}`, evidence_summary: "sent" }] : [],
    },
  };
}

test("zero gated actions = zero Jonathan blockers (stale ledger pending superseded)", () => {
  const document = { approvalExecutionQueue: { items: [emailPacket("e1", "queued"), emailPacket("e2", "queued")] } };
  // Ledger still claims 3 pending approvals (append-only, stale/superseded).
  const ledgerSummary = { approvals: { pending: 3 }, actors: {} };
  const sc = computeScorecard({
    document, leads: [{ lead_id: "l", tier: "B-tier", created_at: NOW }],
    ledgerSummary, throughput: { gated: [] }, now: NOW,
  });
  assert.equal(sc.dimensions.jonathan_bottleneck.pending_approvals, 0, "no truly-gated items");
  assert.equal(sc.dimensions.jonathan_bottleneck.superseded_ledger_pending, 3, "stale pending surfaced, not counted");
  assert.equal(sc.grades.jonathan_bottleneck, "pass");
  assert.ok(!sc.top_blockers.some((b) => b.type === "jonathan_approval"), "no false Jonathan blocker");
});

test("a truly-gated action DOES count as a Jonathan blocker (genuine penalty preserved)", () => {
  const document = { approvalExecutionQueue: { items: [emailPacket("e1", "queued")] } };
  const sc = computeScorecard({
    document, leads: [{ lead_id: "l", tier: "B-tier", created_at: NOW }],
    throughput: { gated: [{ action_id: "g1", risk: "sensitive", reason: "custom_pricing" }] }, now: NOW,
  });
  assert.equal(sc.dimensions.jonathan_bottleneck.pending_approvals, 1);
  assert.ok(sc.top_blockers.some((b) => b.type === "jonathan_approval"));
});

test("no_transport / no attempt does not reduce reliability or score vs. an empty queue", () => {
  const leads = [{ lead_id: "l", tier: "B-tier", created_at: NOW }];
  // Baseline: no execution work at all.
  const base = computeScorecard({ document: {}, leads, throughput: { gated: [] }, now: NOW });
  // Same, but with 3 queued packets that were never attempted (no_send/no_transport).
  const withQueued = computeScorecard({
    document: { approvalExecutionQueue: { items: [emailPacket("e1", "queued"), emailPacket("e2", "queued"), emailPacket("e3", "queued")] } },
    leads, throughput: { gated: [] }, now: NOW,
  });
  // Queued-but-unattempted packets must not lower the score relative to baseline.
  assert.equal(withQueued.autonomy_score, base.autonomy_score, "no-attempt packets do not reduce score");
  assert.equal(withQueued.dimensions.repair.rail_reliability, null, "no broken rail from no-attempt");
  assert.equal(withQueued.grades.loop_closure, "waiting");
});

test("a real send that closes the packet lifts the score above the waiting baseline", () => {
  // Degraded pipeline (stale lead) gives headroom so the effect of closing the loop
  // is visible: while waiting, loop/evidence are excluded (no penalty, no credit);
  // once a real send records evidence, those passing dimensions raise the score.
  const staleLead = [{ lead_id: "l", tier: "B-tier", created_at: new Date(Date.parse(NOW) - 5 * 86_400_000).toISOString() }];
  const waiting = computeScorecard({
    document: { approvalExecutionQueue: { items: [emailPacket("e1", "queued")] } },
    leads: staleLead, throughput: { gated: [] }, now: NOW,
  });
  const closed = computeScorecard({
    document: { approvalExecutionQueue: { items: [emailPacket("e1", "completed", { evidence: true })] } },
    leads: staleLead, throughput: { gated: [] }, now: NOW,
  });
  assert.equal(waiting.grades.loop_closure, "waiting", "no credit while waiting");
  assert.equal(closed.grades.loop_closure, "pass");
  assert.equal(closed.grades.evidence_discipline, "pass");
  assert.ok(closed.autonomy_score > waiting.autonomy_score, "real evidence lifts the score");
});
