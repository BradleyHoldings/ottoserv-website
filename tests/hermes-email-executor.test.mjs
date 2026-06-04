// Sprint priority 1: live email execution adapter.
//   - no-send test: default mode sends NOTHING and fabricates NO evidence.
//   - evidence closes outbound packet: live mode + a STUB transport (no network)
//     records real message-id evidence and completes the lifecycle.
//   - guardrails (blocked/gated), no-transport, and idempotency are honored.
// DO NOT SEND IN TESTS: no real transport is ever used; live tests inject a stub.

import assert from "node:assert/strict";
import test from "node:test";

import {
  executeEmailQueue,
  EMAIL_EXECUTOR_DEFAULT_MODE,
} from "../src/lib/hermesEmailExecutor.mjs";

const NOW = "2026-06-04T15:00:00.000Z";

function queuedEmailItem(over = {}) {
  const ap = {
    task_id: "apx-b1",
    action_id: "na-b1",
    channel: "email",
    lead_id: "li-b1",
    company: "Bravo Plumbing",
    contact: { email: "owner@bravo.example" },
    packet: { kind: "email_packet", offer: "AI Receptionist" },
    evidence: { source_url: "https://reddit.com/x/b1", snippet: "missing after-hours calls", pain_point: "after-hours misses", offer_angle: "AI Receptionist" },
    policy: { materialized_via: "standing_outbound_policy", daily_cap: 50, tier: "B-tier" },
    required_evidence: ["Outbound email evidence: message id, timestamp, disposition/outcome, and next action."],
    mode: "no_send_no_call", no_send: true, no_call: true, status: "queued",
    ...over.actor_packet,
  };
  return {
    taskPacket: { task_id: ap.task_id, actor_packet: ap },
    lifecycle: {
      assigned_task_id: ap.task_id,
      execution_status: "queued",
      evidence_status: "required",
      required_evidence: ap.required_evidence,
      submitted_evidence: [],
      ...over.lifecycle,
    },
  };
}

function docWith(items) {
  return { approvalExecutionQueue: { count: items.length, items } };
}

test("no-send default: prepares the draft, sends nothing, writes NO evidence", async () => {
  const doc = docWith([queuedEmailItem()]);
  const out = await executeEmailQueue(doc, { now: NOW });

  assert.equal(EMAIL_EXECUTOR_DEFAULT_MODE, "no_send");
  assert.equal(out.summary.sent, 0);
  assert.equal(out.summary.prepared, 1);
  const r = out.results[0];
  assert.equal(r.status, "prepared");
  assert.equal(r.sent, false);
  // The packet must remain queued with no fabricated evidence (no score inflation).
  const lc = out.document.approvalExecutionQueue.items[0].lifecycle;
  assert.equal(lc.execution_status, "queued");
  assert.equal(lc.submitted_evidence.length, 0);
});

test("evidence closes outbound packet: live + stub transport records message id and completes", async () => {
  const doc = docWith([queuedEmailItem()]);
  const sentDrafts = [];
  const transport = (draft) => {
    sentDrafts.push(draft);
    return { message_id: "msg-abc-123", status: "sent", to: draft.to, provider: "stub", sent_at: NOW };
  };
  const out = await executeEmailQueue(doc, { now: NOW, mode: "live", transport });

  assert.equal(sentDrafts.length, 1, "exactly one send");
  assert.equal(out.summary.sent, 1);
  const r = out.results[0];
  assert.equal(r.status, "sent");
  assert.equal(r.message_id, "msg-abc-123");
  assert.equal(r.lifecycle_status, "completed");

  const lc = out.document.approvalExecutionQueue.items[0].lifecycle;
  assert.equal(lc.execution_status, "completed");
  assert.equal(lc.evidence_status, "accepted");
  assert.equal(lc.submitted_evidence.length, 1);
  assert.equal(lc.submitted_evidence[0].evidence_reference, "msg-abc-123");
  assert.equal(lc.submitted_evidence[0].evidence_type, "email_sent");
  // Ledger event emitted for the close.
  assert.ok(out.ledgerEvents.some((e) => e.source_id === "apx-b1" && e.to_status === "completed"));
});

test("live mode without a wired transport sends nothing (real credentials required)", async () => {
  const doc = docWith([queuedEmailItem()]);
  const out = await executeEmailQueue(doc, { now: NOW, mode: "live", transport: null });
  assert.equal(out.summary.sent, 0);
  assert.equal(out.summary.no_transport, 1);
  assert.equal(out.results[0].status, "no_transport");
  assert.equal(out.document.approvalExecutionQueue.items[0].lifecycle.execution_status, "queued");
});

test("guardrail: missing contact path is blocked and never sent, even live", async () => {
  const item = queuedEmailItem({ actor_packet: { contact: {} } });
  let called = false;
  const transport = () => { called = true; return { message_id: "x" }; };
  const out = await executeEmailQueue(docWith([item]), { now: NOW, mode: "live", transport });
  assert.equal(called, false, "transport never invoked for a blocked packet");
  assert.equal(out.results[0].status, "blocked");
  assert.equal(out.summary.sent, 0);
});

test("guardrail: DNC recipient is blocked and never sent", async () => {
  const out = await executeEmailQueue(docWith([queuedEmailItem()]), {
    now: NOW, mode: "live", transport: () => ({ message_id: "x" }), dnc: ["owner@bravo.example"],
  });
  assert.equal(out.results[0].status, "blocked");
  assert.equal(out.results[0].reason, "dnc_or_blacklist");
  assert.equal(out.summary.sent, 0);
});

test("over-cap is gated (needs a limit increase), not silently sent", async () => {
  const out = await executeEmailQueue(docWith([queuedEmailItem()]), {
    now: NOW, mode: "live", transport: () => ({ message_id: "x" }), sentToday: { email: 50 },
  });
  assert.equal(out.results[0].status, "gated");
  assert.equal(out.summary.sent, 0);
});

test("idempotent: an already-completed packet is skipped, never re-sent", async () => {
  const item = queuedEmailItem({ lifecycle: { execution_status: "completed", evidence_status: "accepted", submitted_evidence: [{ evidence_reference: "old" }] } });
  let called = false;
  const out = await executeEmailQueue(docWith([item]), { now: NOW, mode: "live", transport: () => { called = true; return { message_id: "y" }; } });
  assert.equal(called, false);
  assert.equal(out.results[0].status, "skipped");
  assert.equal(out.summary.sent, 0);
});

test("transport failure marks the packet failed and records no false success", async () => {
  const out = await executeEmailQueue(docWith([queuedEmailItem()]), {
    now: NOW, mode: "live", transport: () => { throw new Error("smtp_down"); },
  });
  assert.equal(out.results[0].status, "failed");
  assert.equal(out.summary.sent, 0);
  const lc = out.document.approvalExecutionQueue.items[0].lifecycle;
  assert.equal(lc.execution_status, "failed");
  assert.equal((lc.submitted_evidence || []).length, 0);
});
