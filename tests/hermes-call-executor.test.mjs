// Sprint priority 3: live call execution adapter.
//   - no-dial test: default mode dials NOTHING and fabricates NO evidence.
//   - evidence closes the packet: live mode + a STUB dialer (no telephony) records
//     real call-id evidence and completes the lifecycle.
//   - guardrails (business hours, DNC, max attempts), no-dialer, idempotency.
// DO NOT DIAL IN TESTS: no real dialer is ever used; live tests inject a stub.

import assert from "node:assert/strict";
import test from "node:test";

import {
  executeCallQueue,
  CALL_EXECUTOR_DEFAULT_MODE,
} from "../src/lib/hermesCallExecutor.mjs";

const NOW = "2026-06-04T15:00:00.000Z";

function queuedCallItem(over = {}) {
  const ap = {
    task_id: "apx-a1", action_id: "na-a1", channel: "call", lead_id: "li-a1", company: "Acme Plumbing",
    contact: { phone: "14075550111" },
    packet: { kind: "call_packet", angle: "AI Receptionist" },
    evidence: { source_url: "https://reddit.com/x/a1", pain_point: "voicemail losses", offer_angle: "AI Receptionist" },
    policy: { materialized_via: "standing_outbound_policy", daily_cap: 20, tier: "A-tier" },
    required_evidence: ["Outbound call evidence: call id, timestamp, disposition/outcome, and next action."],
    mode: "no_send_no_call", no_send: true, no_call: true, status: "queued",
    ...over.actor_packet,
  };
  return {
    taskPacket: { task_id: ap.task_id, actor_packet: ap },
    lifecycle: {
      assigned_task_id: ap.task_id, execution_status: "queued", evidence_status: "required",
      required_evidence: ap.required_evidence, submitted_evidence: [],
      ...over.lifecycle,
    },
  };
}
function docWith(items) {
  return { approvalExecutionQueue: { count: items.length, items } };
}

test("no-dial default: prepares the call, dials nothing, writes NO evidence", async () => {
  const out = await executeCallQueue(docWith([queuedCallItem()]), { now: NOW, localHour: 10 });
  assert.equal(CALL_EXECUTOR_DEFAULT_MODE, "no_dial");
  assert.equal(out.summary.dialed, 0);
  assert.equal(out.summary.prepared, 1);
  assert.equal(out.results[0].status, "prepared");
  const lc = out.document.approvalExecutionQueue.items[0].lifecycle;
  assert.equal(lc.execution_status, "queued");
  assert.equal(lc.submitted_evidence.length, 0);
});

test("evidence closes the packet: live + stub dialer records call id and completes", async () => {
  const dialed = [];
  const dialer = (cr) => { dialed.push(cr); return { call_id: "call-xyz-9", disposition: "booked_audit", summary: "Owner interested; booked.", next_action: "send_calendar", to: cr.to, provider: "stub" }; };
  const out = await executeCallQueue(docWith([queuedCallItem()]), { now: NOW, mode: "live", dialer, localHour: 10 });

  assert.equal(dialed.length, 1);
  assert.equal(out.summary.dialed, 1);
  const r = out.results[0];
  assert.equal(r.status, "dialed");
  assert.equal(r.call_id, "call-xyz-9");
  assert.equal(r.disposition, "booked_audit");
  assert.equal(r.lifecycle_status, "completed");

  const lc = out.document.approvalExecutionQueue.items[0].lifecycle;
  assert.equal(lc.execution_status, "completed");
  assert.equal(lc.submitted_evidence[0].evidence_reference, "call-xyz-9");
  assert.equal(lc.submitted_evidence[0].evidence_type, "call_placed");
  assert.ok(out.ledgerEvents.some((e) => e.source_id === "apx-a1" && e.to_status === "completed"));
});

test("live mode without a wired dialer dials nothing (approved credentials required)", async () => {
  const out = await executeCallQueue(docWith([queuedCallItem()]), { now: NOW, mode: "live", dialer: null, localHour: 10 });
  assert.equal(out.summary.dialed, 0);
  assert.equal(out.summary.no_dialer, 1);
  assert.equal(out.document.approvalExecutionQueue.items[0].lifecycle.execution_status, "queued");
});

test("guardrail: outside business hours is blocked, never dialed", async () => {
  let called = false;
  const out = await executeCallQueue(docWith([queuedCallItem()]), {
    now: NOW, mode: "live", localHour: 22, dialer: () => { called = true; return { call_id: "x" }; },
  });
  assert.equal(called, false);
  assert.equal(out.results[0].status, "blocked");
  assert.equal(out.results[0].reason, "outside_business_hours");
});

test("guardrail: max attempts reached is blocked, never dialed", async () => {
  const out = await executeCallQueue(docWith([queuedCallItem()]), {
    now: NOW, mode: "live", localHour: 10, attempts: { "li-a1": 3 }, maxAttempts: 3, dialer: () => ({ call_id: "x" }),
  });
  assert.equal(out.results[0].status, "blocked");
  assert.equal(out.results[0].reason, "max_attempts_reached");
});

test("idempotent: an already-completed call packet is skipped, never re-dialed", async () => {
  const item = queuedCallItem({ lifecycle: { execution_status: "completed", evidence_status: "accepted", submitted_evidence: [{ evidence_reference: "old" }] } });
  let called = false;
  const out = await executeCallQueue(docWith([item]), { now: NOW, mode: "live", localHour: 10, dialer: () => { called = true; return { call_id: "y" }; } });
  assert.equal(called, false);
  assert.equal(out.results[0].status, "skipped");
});

test("dialer failure marks the packet failed and records no false success", async () => {
  const out = await executeCallQueue(docWith([queuedCallItem()]), {
    now: NOW, mode: "live", localHour: 10, dialer: () => { throw new Error("retell_down"); },
  });
  assert.equal(out.results[0].status, "failed");
  assert.equal(out.summary.dialed, 0);
  assert.equal((out.document.approvalExecutionQueue.items[0].lifecycle.submitted_evidence || []).length, 0);
});
