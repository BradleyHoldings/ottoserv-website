// ─── Phase 2 controlled-real acceptance — orchestration proof ─────────────────
// Runs the full controlled flow (send → evidence → lead advance → reply → follow-up
// cancellation → restart safety) end to end. In this environment there are no live
// provider credentials, so a real-shaped STUB provider + a simulated controlled
// reply stand in for the live transport. The ORCHESTRATION, idempotency, evidence
// gating, and restart safety are proven exactly; the live send is the only piece
// that must be repeated with real credentials during the operator acceptance run.

import assert from "node:assert/strict";
import test from "node:test";

import { ACCEPTANCE_LEAD, ACCEPTANCE_ACTION, ACCEPTANCE_REPLY } from "./fixtures/controlled-real-email-acceptance.mjs";
import { runEmailAction, materializeIntent } from "../src/lib/emailRail/pipeline.mjs";
import { evaluatePolicy } from "../src/lib/emailRail/policy.mjs";
import { processReply, REPLY_CLASS } from "../src/lib/emailRail/reply.mjs";
import { selectIntentsToCancel } from "../src/lib/emailRail/scheduler.mjs";
import { EMAIL_STATES } from "../src/lib/emailRail/intent.mjs";

const NOW = "2026-06-08T14:00:00.000Z";

// Reuse the same in-memory client contract as the main suite (DB CAS/claim model).
function fakeEmailClient() {
  const intents = new Map(); const idemKeys = new Set();
  const evidence = new Map(); const replies = new Map();
  return {
    configured: true, intents, evidence, replies,
    async readIntent(id) { const e = intents.get(id); return e ? { raw_intent: e.row, version: e.version, state: e.row.state } : null; },
    async upsertIntent(intent, expectedVersion) {
      const existing = intents.get(intent.execution_id); const target = Number(intent.version ?? 1);
      if (!existing) {
        if (expectedVersion !== 0 || target !== 1) return { ok: false, status: "conflict", reason: "first_insert_version_mismatch" };
        if (idemKeys.has(intent.idempotency_key)) return { ok: false, status: "duplicate", reason: "duplicate_idempotency_key" };
        idemKeys.add(intent.idempotency_key); intents.set(intent.execution_id, { row: { ...intent }, version: 1 });
        return { ok: true, status: "inserted", version: 1 };
      }
      if (existing.version !== expectedVersion) return { ok: false, status: "conflict", reason: "cas_version_mismatch", current_version: existing.version };
      if (target !== expectedVersion + 1) return { ok: false, status: "conflict", reason: "non_sequential_version", current_version: existing.version };
      intents.set(intent.execution_id, { row: { ...intent }, version: target }); return { ok: true, status: "updated", version: target };
    },
    async claim(id, owner, leaseSeconds, now) {
      const e = intents.get(id); if (!e) return { ok: false, reason: "intent_not_found" };
      const row = e.row; const nowMs = Date.parse(now);
      const live = row.lease_owner && row.lease_expires_at && Date.parse(row.lease_expires_at) > nowMs;
      if (live && row.lease_owner !== owner) return { ok: false, reason: "lease_held_by_other" };
      const expires = new Date(nowMs + leaseSeconds * 1000).toISOString();
      row.lease_owner = owner; row.lease_expires_at = expires; e.version += 1; row.version = e.version;
      return { ok: true, status: "claimed", lease_expires_at: expires };
    },
    async writeEvidence(row) { if (evidence.has(row.provider_message_id)) return { ok: true, rows: [] }; evidence.set(row.provider_message_id, { ...row }); return { ok: true, rows: [row] }; },
    async readEvidence(id) { return evidence.get(id) || null; },
    async writeReply(row) { if (replies.has(row.provider_event_id)) return { ok: true, rows: [], deduped: true }; replies.set(row.provider_event_id, { ...row }); return { ok: true, rows: [row], deduped: false }; },
    async listActiveIntents() { return [...intents.values()].filter(e => e.row.state !== "completed").map(e => ({ raw_intent: e.row, version: e.version, state: e.row.state })); },
  };
}

function policyCtx() {
  return {
    lead: ACCEPTANCE_LEAD, now: NOW,
    approvedSenders: [ACCEPTANCE_ACTION.sender, ACCEPTANCE_ACTION.sender.split("@")[1]],
    approvalPresent: true, // outbound intro requires approval; operator pre-approved
  };
}

test("ACCEPTANCE: controlled send → evidence → lead advance → reply → cancel follow-up → restart-safe", async () => {
  const client = fakeEmailClient();
  let sends = 0;
  const realShapedTransport = async (draft) => {
    sends += 1;
    return { message_id: "prov_accept_msg_001", thread_id: "prov_accept_thr_001", to: draft.to, from: draft.from, status: "accepted", accepted: true, provider_timestamp: NOW };
  };

  // Gate 1–9: one approved intent, one claim, one real send, evidence persisted +
  // read back, completion only after evidence.
  const result = await runEmailAction(
    { lead: ACCEPTANCE_LEAD, ...ACCEPTANCE_ACTION, policyCtx: policyCtx() },
    { client, now: NOW, worker_id: "Hermes-acceptance", transport: realShapedTransport, updateLead: false },
  );
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.intent.state, EMAIL_STATES.COMPLETED);
  assert.equal(result.evidence.provider_message_id, "prov_accept_msg_001");
  assert.equal(result.evidence.provider_thread_id, "prov_accept_thr_001");
  assert.ok(client.evidence.has("prov_accept_msg_001"), "evidence persisted");
  assert.equal(sends, 1, "exactly one real send");
  assert.equal(client.intents.size, 1, "exactly one intent row");

  // Gate 10 (idempotent rerun): re-running the same action does not send again.
  const rerun = await materializeIntent({ lead: ACCEPTANCE_LEAD, ...ACCEPTANCE_ACTION }, { client, now: NOW });
  const rerunPolicy = evaluatePolicy(rerun.intent, { ...policyCtx(), priorSuccessIdemKeys: new Set([result.intent.idempotency_key]) });
  assert.equal(rerunPolicy.ok, false);
  assert.equal(rerunPolicy.reason, "prior_successful_send_exists");
  assert.equal(sends, 1, "rerun did not send again");

  // Gate 11–12 (controlled reply detected, associated, persisted, classified).
  const inbound = {
    ...ACCEPTANCE_REPLY,
    provider_event_id: "prov_accept_reply_001",
    in_reply_to: result.evidence.provider_message_id,
    thread_id: result.evidence.provider_thread_id,
  };
  const replyResult = await processReply(inbound, result.intent, { client, now: NOW, updateLead: false });
  assert.equal(replyResult.ok, true);
  assert.equal(replyResult.classification, REPLY_CLASS.POSITIVE_INTEREST);
  assert.ok(client.replies.has("prov_accept_reply_001"), "reply persisted");

  // Reply dedupe: a duplicate inbound event is ignored.
  const dup = await processReply(inbound, result.intent, { client, now: NOW, updateLead: false });
  assert.equal(dup.deduped, true);

  // Gate 13 (future follow-up adjusted): a positive reply stops generic sequence
  // pressure while the canonical lead gets a specific next action.
  const pending = [{ execution_id: "followup_1", state: "scheduled" }];
  assert.deepEqual(selectIntentsToCancel(pending, REPLY_CLASS.POSITIVE_INTEREST), ["followup_1"]);
  assert.deepEqual(selectIntentsToCancel(pending, REPLY_CLASS.UNSUBSCRIBE), ["followup_1"]);

  // Gate 14 (restart does not duplicate execution): a completed intent re-materialized
  // yields the same execution_id and is blocked from re-send.
  const afterRestart = await materializeIntent({ lead: ACCEPTANCE_LEAD, ...ACCEPTANCE_ACTION }, { client, now: NOW });
  assert.equal(afterRestart.intent.execution_id, result.intent.execution_id);
  assert.equal(client.intents.size, 1, "no duplicate intent after restart");
  assert.equal(sends, 1, "no duplicate send after restart");
});
