import assert from "node:assert/strict";
import test from "node:test";
import { executeDmQueue } from "../src/lib/hermesDmExecutor.mjs";

const NOW = "2026-06-04T15:00:00.000Z";

function item(overrides = {}) {
  const actor_packet = {
    task_id: "apx-dm-1",
    channel: "social_dm",
    lead_id: "lead-1",
    company: "Example Service Co",
    packet: {
      platform: "linkedin",
      profile_url: "https://example.test/profile/owner",
      message: "Hello. Would a quick workflow review be useful?",
    },
    required_evidence: ["DM execution evidence"],
    ...overrides.actor_packet,
  };
  return {
    taskPacket: { task_id: actor_packet.task_id, actor_packet },
    lifecycle: {
      assigned_task_id: actor_packet.task_id,
      execution_status: "queued",
      evidence_status: "required",
      required_evidence: actor_packet.required_evidence,
      submitted_evidence: [],
      ...overrides.lifecycle,
    },
  };
}

function doc(entries) {
  return { approvalExecutionQueue: { count: entries.length, items: entries } };
}

test("default mode prepares only", async () => {
  const out = await executeDmQueue(doc([item()]), { now: NOW });
  assert.equal(out.summary.sent, 0);
  assert.equal(out.summary.prepared, 1);
  assert.equal(out.document.approvalExecutionQueue.items[0].lifecycle.execution_status, "queued");
});

test("live stub closes with evidence", async () => {
  const provider = { sendDm: async () => ({ message_id: "dm-123", sent_at: NOW, status: "sent" }) };
  const out = await executeDmQueue(doc([item()]), { now: NOW, mode: "live", provider });
  assert.equal(out.summary.sent, 1);
  const lifecycle = out.document.approvalExecutionQueue.items[0].lifecycle;
  assert.equal(lifecycle.execution_status, "completed");
  assert.equal(lifecycle.submitted_evidence[0].evidence_reference, "dm-123");
});

test("live without provider sends nothing", async () => {
  const out = await executeDmQueue(doc([item()]), { now: NOW, mode: "live" });
  assert.equal(out.summary.sent, 0);
  assert.equal(out.summary.no_browser_provider, 1);
});

test("missing profile URL is blocked", async () => {
  const out = await executeDmQueue(doc([item({ actor_packet: { packet: { platform: "linkedin", message: "Hello" } } })]), {
    now: NOW,
    mode: "live",
    provider: { sendDm: async () => ({ message_id: "never" }) },
  });
  assert.equal(out.results[0].status, "blocked");
  assert.equal(out.results[0].reason, "missing_verified_profile_url");
});

test("provider without evidence cannot close", async () => {
  const out = await executeDmQueue(doc([item()]), {
    now: NOW,
    mode: "live",
    provider: { sendDm: async () => ({ status: "sent" }) },
  });
  assert.equal(out.summary.sent, 0);
  assert.equal(out.results[0].status, "failed");
  assert.equal(out.document.approvalExecutionQueue.items[0].lifecycle.execution_status, "queued");
});
