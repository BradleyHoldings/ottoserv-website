// Priority 3: durable actor queue. Materialized outbound packets persist into the
// revenue document's approvalExecutionQueue with a rich actor_packet, idempotently,
// in no-send/no-call mode by default. Internal coordination tasks are NOT queued.

import assert from "node:assert/strict";
import test from "node:test";

import { materializeActorPackets, DEFAULT_STANDING_OUTBOUND_POLICY } from "../src/lib/hermesApprovalThroughput.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";
import { mergeMaterializedIntoQueue, readActorQueue, ACTOR_QUEUE_DEFAULT_MODE } from "../src/lib/hermesActorQueue.mjs";

const NOW = "2026-06-04T12:00:00.000Z";

function leads() {
  return [
    { lead_id: "li-b1", company: "Bravo Plumbing", tier: "B-tier", email: "o@bravo.example", status: "ready_to_email", score: 66, source_url: "https://reddit.com/x/b1", notes: "missing calls", pain_signal: "after-hours misses", created_at: NOW, intent: { recommended_offer: "AI Receptionist", source_urls: ["https://reddit.com/x/b1"] } },
    { lead_id: "li-a1", company: "Acme Plumbing", tier: "A-tier", normalized_phone: "4075550111", status: "ready_to_call", score: 82, source_url: "https://reddit.com/x/a1", created_at: NOW, intent: { likely_ottoserv_angle: "AI Receptionist", source_urls: ["https://reddit.com/x/a1"] } },
  ];
}

function materializeFor(document = {}) {
  const actions = selectNextActions({ leads: leads(), document, now: NOW }).actions;
  const throughput = materializeActorPackets(actions, { document, now: NOW, standingOutboundPolicy: DEFAULT_STANDING_OUTBOUND_POLICY });
  return { actions, throughput };
}

test("durable queue persists materialized outbound packets with the full rich packet", () => {
  const { actions, throughput } = materializeFor({});
  const { document, added } = mergeMaterializedIntoQueue({}, actions, throughput, { now: NOW, leads: leads(), policy: DEFAULT_STANDING_OUTBOUND_POLICY });

  assert.ok(added >= 2, "outbound email + call packets queued");
  const queue = readActorQueue(document);
  const call = queue.find((e) => e.actor_packet.channel === "call");
  const email = queue.find((e) => e.actor_packet.channel === "email");
  assert.ok(call && email);

  for (const e of [call, email]) {
    const p = e.actor_packet;
    assert.ok(p.task_id && p.action_id && p.lead_id && p.company && p.channel, "identity fields present");
    assert.ok(p.packet && p.packet.kind, "email/call packet data present");
    assert.ok(p.evidence.source_url, "source/evidence attached");
    assert.ok(p.policy.materialized_via && p.policy.daily_cap, "policy + caps metadata present");
    assert.ok(p.required_evidence.length > 0, "evidence contract present");
    assert.equal(p.mode, ACTOR_QUEUE_DEFAULT_MODE);
    assert.equal(p.no_send, true);
    assert.equal(p.no_call, true);
    assert.equal(e.lifecycle.execution_status, "queued");
  }
});

test("persisting is idempotent: re-merging the same materialization adds nothing", () => {
  const first = materializeFor({});
  const r1 = mergeMaterializedIntoQueue({}, first.actions, first.throughput, { now: NOW, leads: leads(), policy: DEFAULT_STANDING_OUTBOUND_POLICY });

  // Re-run against the now-populated document (selector + throughput skip enqueued).
  const second = materializeFor(r1.document);
  const r2 = mergeMaterializedIntoQueue(r1.document, second.actions, second.throughput, { now: NOW, leads: leads(), policy: DEFAULT_STANDING_OUTBOUND_POLICY });
  assert.equal(r2.added, 0, "no duplicate packets");
  assert.equal(r2.document.approvalExecutionQueue.items.length, r1.document.approvalExecutionQueue.items.length);
});

test("internal coordination materializations are NOT persisted as outbound queue entries", () => {
  // Empty pipeline → research (internal standing) materializes, but it has no channel.
  const actions = selectNextActions({ leads: [], now: NOW }).actions;
  const throughput = materializeActorPackets(actions, { now: NOW, standingOutboundPolicy: DEFAULT_STANDING_OUTBOUND_POLICY });
  assert.ok(throughput.materialized.some((m) => !m.channel), "there is an internal standing materialization");
  const { added } = mergeMaterializedIntoQueue({}, actions, throughput, { now: NOW });
  assert.equal(added, 0, "no channel-less internal task is queued as an outbound actor packet");
});

test("an existing in-progress lifecycle is never regressed by a re-merge", () => {
  const { actions, throughput } = materializeFor({});
  const r1 = mergeMaterializedIntoQueue({}, actions, throughput, { now: NOW, leads: leads() });
  // Advance one entry to executing.
  r1.document.approvalExecutionQueue.items[0].lifecycle.execution_status = "executing";
  const second = materializeFor(r1.document);
  const r2 = mergeMaterializedIntoQueue(r1.document, second.actions, second.throughput, { now: NOW, leads: leads() });
  assert.equal(r2.added, 0);
  assert.equal(r2.document.approvalExecutionQueue.items[0].lifecycle.execution_status, "executing", "progress preserved");
});
