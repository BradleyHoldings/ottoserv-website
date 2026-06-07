// ─── Phase 2 controlled email execution rail — full contract proofs ───────────
// Deterministic IDs, idempotency, atomic one-winner claim, lease expiry/recovery,
// stale-worker rejection, policy gate (pass + every block), provider outcomes +
// timeout reconciliation, evidence persistence + read-after-write, no-completion-
// without-evidence, reply association/dedupe/classification, follow-up cancellation,
// restart recovery (no duplicate send), watchdog behavior, no-other-transport, and
// no-local-authority. The in-memory client models the Postgres CAS/claim RPCs
// exactly, so atomicity is enforced by the store contract, not a prior app read.

import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmailIntent, transitionEmail, deriveExecutionId, deriveIdempotencyKey,
  contentHash, EMAIL_STATES, EMAIL_ACTION, canTransitionEmail, EMAIL_TRUTH,
} from "../src/lib/emailRail/intent.mjs";
import { evaluatePolicy, AUTONOMOUS_TEMPLATE_CLASSES, APPROVED_TEMPLATE_CLASSES } from "../src/lib/emailRail/policy.mjs";
import { sendViaProvider, reconcileUnverified, evidenceFromResult, sanitizeError, SEND_OUTCOME } from "../src/lib/emailRail/provider.mjs";
import { classifyReply, REPLY_CLASS, SEQUENCE_STOPPING_CLASSES, buildReplyRow } from "../src/lib/emailRail/reply.mjs";
import { evaluateFollowUp, deriveNextScheduledAt, selectIntentsToCancel, SCHEDULE_POLICY } from "../src/lib/emailRail/scheduler.mjs";
import { evaluateIntent, sweep, checkConfigHealth, WATCHDOG_ACTION } from "../src/lib/emailRail/watchdog.mjs";
import { readEmailConfig, describeEmailConfig, assertNoLocalAuthorityInProduction, EMAIL_MODE, EMAIL_CONFIG_STATE } from "../src/lib/emailRail/config.mjs";
import { persistIntent, PERSISTENCE } from "../src/lib/emailRail/store.mjs";
import { materializeIntent, applyPolicyGate, claimIntent, executeIntent, runEmailAction } from "../src/lib/emailRail/pipeline.mjs";

const NOW = "2026-06-08T14:00:00.000Z"; // a Monday 14:00 UTC (send window)

// ─── In-memory email client modeling the DB CAS + claim RPCs exactly ─────────
function fakeEmailClient(opts = {}) {
  const intents = new Map();   // execution_id → { row, version }
  const idemKeys = new Set();  // enforce unique idempotency_key
  const evidence = new Map();  // provider_message_id → row
  const replies = new Map();   // provider_event_id → row

  return {
    configured: true, intents, evidence, replies,
    async readIntent(execution_id) {
      if (opts.failRead) throw new Error("intent_read_failed_500");
      const e = intents.get(execution_id);
      return e ? { raw_intent: e.row, version: e.version, state: e.row.state } : null;
    },
    async upsertIntent(intent, expectedVersion) {
      if (opts.failWrite) return { ok: false, error: "intent_write_failed_500" };
      const existing = intents.get(intent.execution_id);
      const target = Number(intent.version ?? 1);
      if (!existing) {
        if (expectedVersion !== 0 || target !== 1) return { ok: false, status: "conflict", reason: "first_insert_version_mismatch", current_version: 0 };
        if (idemKeys.has(intent.idempotency_key)) return { ok: false, status: "duplicate", reason: "duplicate_idempotency_key" };
        idemKeys.add(intent.idempotency_key);
        intents.set(intent.execution_id, { row: { ...intent }, version: 1 });
        return { ok: true, status: "inserted", version: 1 };
      }
      if (existing.version === target && JSON.stringify(existing.row.history) === JSON.stringify(intent.history)) {
        return { ok: true, status: "idempotent", version: existing.version };
      }
      if (existing.version !== expectedVersion) return { ok: false, status: "conflict", reason: "cas_version_mismatch", current_version: existing.version };
      if (target !== expectedVersion + 1) return { ok: false, status: "conflict", reason: "non_sequential_version", current_version: existing.version };
      intents.set(intent.execution_id, { row: { ...intent }, version: target });
      return { ok: true, status: "updated", version: target };
    },
    async claim(execution_id, owner, leaseSeconds, now) {
      const e = intents.get(execution_id);
      if (!e) return { ok: false, reason: "intent_not_found" };
      const row = e.row;
      if (!["approved", "scheduled", "retry_waiting", "claimed", "executing"].includes(row.state)) {
        return { ok: false, reason: "not_claimable_state", state: row.state };
      }
      const nowMs = Date.parse(now);
      const leaseLive = row.lease_owner && row.lease_expires_at && Date.parse(row.lease_expires_at) > nowMs;
      if (leaseLive && row.lease_owner !== owner) return { ok: false, reason: "lease_held_by_other", owner: row.lease_owner };
      const expires = new Date(nowMs + leaseSeconds * 1000).toISOString();
      row.lease_owner = owner; row.lease_expires_at = expires; e.version += 1; row.version = e.version;
      return { ok: true, status: "claimed", owner, lease_expires_at: expires };
    },
    async writeEvidence(row) {
      if (opts.failEvidenceWrite) return { ok: false, error: "evidence_write_failed_500" };
      if (evidence.has(row.provider_message_id)) return { ok: true, rows: [] }; // deduped
      evidence.set(row.provider_message_id, { ...row });
      return { ok: true, rows: [{ ...row }] };
    },
    async readEvidence(pmid) {
      if (opts.dropEvidenceReadBack) return null;
      return evidence.get(pmid) || null;
    },
    async writeReply(row) {
      if (opts.failReplyWrite) return { ok: false, error: "reply_write_failed_500" };
      if (replies.has(row.provider_event_id)) return { ok: true, rows: [], deduped: true };
      replies.set(row.provider_event_id, { ...row });
      return { ok: true, rows: [{ ...row }], deduped: false };
    },
    async listActiveIntents() {
      return [...intents.values()].filter(e => e.row.state !== "completed" && e.row.state !== "cancelled").map(e => ({ raw_intent: e.row, version: e.version, state: e.row.state }));
    },
  };
}

const LEAD = {
  lead_id: "lid_v1_acceptancehvac01", company_name: "Acceptance HVAC Services LLC",
  email: "owner@acceptance-hvac.acceptance-run.io", website: "acceptance-hvac.acceptance-run.io",
  record_status: "accepted", eligibility: "email_eligible", version: 3,
};

function baseAction(overrides = {}) {
  return {
    lead: LEAD, action_type: EMAIL_ACTION.OUTBOUND, template_ref: "intro_v1",
    sender: "hermes@ottoserv.com", subject: "Quick question about your front desk",
    body: "Hi — noticed you might be missing after-hours calls. Worth a quick look?",
    ...overrides,
  };
}
function intentFor(overrides = {}) {
  const a = baseAction(overrides);
  return createEmailIntent({
    lead_id: a.lead.lead_id, lead_version: a.lead.version, action_type: a.action_type,
    sender: a.sender, recipient: a.lead.email, template_ref: a.template_ref,
    subject: a.subject, body: a.body, ...overrides.intent,
  }, { now: NOW });
}
function passingPolicyCtx(extra = {}) {
  return { lead: LEAD, now: NOW, approvedSenders: ["hermes@ottoserv.com", "ottoserv.com"], approvalPresent: true, ...extra };
}

// Real (stub) transport that returns a real-shaped provider result.
function stubTransport(messageId = "prov_msg_0001", thread = "thr_0001") {
  return async (draft) => ({ message_id: messageId, thread_id: thread, to: draft.to, from: draft.from, status: "accepted", accepted: true, provider_timestamp: NOW });
}

// ─── 1. Deterministic execution id ───────────────────────────────────────────
test("deterministic execution id: same inputs → same id, different lead → different", () => {
  const a = deriveExecutionId({ lead_id: "L1", action_type: "outbound_email" });
  const b = deriveExecutionId({ lead_id: "L1", action_type: "outbound_email" });
  const c = deriveExecutionId({ lead_id: "L2", action_type: "outbound_email" });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^eex_v1_[0-9a-f]{16}$/);
});

// ─── 2. Deterministic idempotency key binds content + recipient + lead version ─
test("deterministic idempotency key: changes when content/recipient/version change", () => {
  const base = { lead_id: "L1", action_type: "outbound_email", recipient: "a@x.io", template_ref: "intro_v1", content_hash: contentHash("s", "b"), lead_version: 1 };
  const k1 = deriveIdempotencyKey(base);
  assert.equal(k1, deriveIdempotencyKey({ ...base }));
  assert.notEqual(k1, deriveIdempotencyKey({ ...base, recipient: "b@x.io" }));
  assert.notEqual(k1, deriveIdempotencyKey({ ...base, content_hash: contentHash("s2", "b") }));
  assert.notEqual(k1, deriveIdempotencyKey({ ...base, lead_version: 2 }));
  assert.match(k1, /^idem_v1_[0-9a-f]{16}$/);
});

// ─── 3. Duplicate materialization is rejected by unique idempotency ──────────
test("duplicate materialization: second persist with same idem key → duplicate", async () => {
  const client = fakeEmailClient();
  const r1 = await materializeIntent(baseAction(), { client, now: NOW });
  assert.equal(r1.ok, true);
  // Build an identical intent with a different execution_id but same idem inputs.
  const dupIntent = { ...r1.intent, execution_id: "eex_v1_forceddifferent" };
  const r2 = await persistIntent(dupIntent, { client });
  assert.equal(r2.status, PERSISTENCE.DUPLICATE);
});

// ─── 4. One-winner atomic claim ──────────────────────────────────────────────
test("atomic claim: exactly one of two concurrent workers wins", async () => {
  const client = fakeEmailClient();
  const mat = await materializeIntent(baseAction(), { client, now: NOW });
  const gate = await applyPolicyGate(mat.intent, passingPolicyCtx(), { client, now: NOW });
  assert.equal(gate.ok, true, gate.reason);
  const c1 = await claimIntent(gate.intent, "worker-A", { client, now: NOW });
  const c2 = await claimIntent(gate.intent, "worker-B", { client, now: NOW });
  const winners = [c1.ok, c2.ok].filter(Boolean);
  assert.equal(winners.length, 1, "exactly one winner");
});

// ─── 5. Lease expiry + recovery ──────────────────────────────────────────────
test("lease expiry: an expired lease can be reclaimed by another worker", async () => {
  const client = fakeEmailClient();
  const mat = await materializeIntent(baseAction(), { client, now: NOW });
  const gate = await applyPolicyGate(mat.intent, passingPolicyCtx(), { client, now: NOW });
  const c1 = await claimIntent(gate.intent, "worker-A", { client, now: NOW });
  assert.equal(c1.ok, true);
  // Long after the lease expired, worker-B reclaims.
  const later = new Date(Date.parse(NOW) + 10 * 60 * 1000).toISOString();
  const c2 = await claimIntent(c1.intent, "worker-B", { client, now: later });
  assert.equal(c2.ok, true, c2.reason);
});

// ─── 6. Stale-worker rejection ───────────────────────────────────────────────
test("stale-worker rejection: non-owner cannot claim a live lease", async () => {
  const client = fakeEmailClient();
  const mat = await materializeIntent(baseAction(), { client, now: NOW });
  const gate = await applyPolicyGate(mat.intent, passingPolicyCtx(), { client, now: NOW });
  await claimIntent(gate.intent, "worker-A", { client, now: NOW });
  const soon = new Date(Date.parse(NOW) + 30 * 1000).toISOString(); // within lease
  const c2 = await claimIntent(gate.intent, "worker-B", { client, now: soon });
  assert.equal(c2.ok, false);
  assert.match(c2.reason, /lease_held_by_other/);
});

// ─── 7. Policy pass ──────────────────────────────────────────────────────────
test("policy pass: eligible lead with approval → pass + receipt", () => {
  const res = evaluatePolicy(intentFor(), passingPolicyCtx());
  assert.equal(res.ok, true, res.reason);
  assert.equal(res.receipt.passed, true);
  assert.equal(res.receipt.decision, "pass");
});

// ─── 8. Approval-required block ──────────────────────────────────────────────
test("policy: non-autonomous template without approval → approval_required", () => {
  const res = evaluatePolicy(intentFor(), passingPolicyCtx({ approvalPresent: false }));
  assert.equal(res.ok, false);
  assert.equal(res.requires_approval, true);
  assert.equal(res.reason, "approval_required");
});

// ─── 9. Autonomous class needs no approval ───────────────────────────────────
test("policy: autonomous ack template proceeds without human approval", () => {
  const intent = intentFor({ intent: { template_ref: "ack_receipt_v1", action_type: EMAIL_ACTION.ACK } });
  const res = evaluatePolicy(intent, passingPolicyCtx({ approvalPresent: false }));
  assert.equal(res.ok, true, res.reason);
  assert.equal(res.requires_approval, false);
});

// ─── 10. DNC / suppression / blacklist blocks ────────────────────────────────
test("policy: DNC, suppression, and blacklist each block", () => {
  const intent = intentFor();
  assert.equal(evaluatePolicy(intent, passingPolicyCtx({ dnc: [LEAD.email] })).reason, "recipient_on_dnc");
  assert.equal(evaluatePolicy(intent, passingPolicyCtx({ suppression: [LEAD.email] })).reason, "recipient_suppressed");
  assert.equal(evaluatePolicy(intent, passingPolicyCtx({ blacklist: ["acceptance-hvac.acceptance-run.io"] })).reason, "recipient_blacklisted");
});

// ─── 11. Quarantined-lead block ──────────────────────────────────────────────
test("policy: quarantined or rejected lead is blocked", () => {
  const intent = intentFor();
  assert.equal(evaluatePolicy(intent, passingPolicyCtx({ lead: { ...LEAD, record_status: "quarantined" } })).reason, "lead_quarantined");
  assert.equal(evaluatePolicy(intent, passingPolicyCtx({ lead: { ...LEAD, record_status: "rejected" } })).reason, "lead_rejected");
});

// ─── 12. Stale lead-version block ────────────────────────────────────────────
test("policy: intent lead_version behind canonical lead → blocked", () => {
  const intent = intentFor(); // lead_version = 3
  const res = evaluatePolicy(intent, passingPolicyCtx({ lead: { ...LEAD, version: 5 } }));
  assert.equal(res.ok, false);
  assert.match(res.reason, /stale_lead_version/);
});

// ─── 13. Duplicate active intent block ───────────────────────────────────────
test("policy: an existing active intent for this lead blocks a new one", () => {
  const res = evaluatePolicy(intentFor(), passingPolicyCtx({ activeIntentExists: true }));
  assert.equal(res.reason, "duplicate_active_intent");
});

// ─── 14. Prior successful send (idempotency) block ───────────────────────────
test("policy: prior successful send with same idem key blocks re-send", () => {
  const intent = intentFor();
  const res = evaluatePolicy(intent, passingPolicyCtx({ priorSuccessIdemKeys: new Set([intent.idempotency_key]) }));
  assert.equal(res.reason, "prior_successful_send_exists");
});

// ─── 15. Cap enforcement (sender) ────────────────────────────────────────────
test("policy: sender daily cap blocks", () => {
  const res = evaluatePolicy(intentFor(), passingPolicyCtx({ sentTodayBySender: { "hermes@ottoserv.com": 999 } }));
  assert.equal(res.reason, "sender_daily_cap_reached");
});

// ─── 16. Quiet-hour scheduling block ─────────────────────────────────────────
test("policy: scheduled within quiet hours → blocked", () => {
  const intent = intentFor({ intent: { scheduled_at: "2026-06-08T23:00:00.000Z" } }); // 23:00 quiet
  const res = evaluatePolicy(intent, passingPolicyCtx());
  assert.equal(res.reason, "within_quiet_hours");
});

// ─── 17. Send-day block (weekend) ────────────────────────────────────────────
test("policy: scheduled on a weekend → not a send day", () => {
  const intent = intentFor({ intent: { scheduled_at: "2026-06-13T14:00:00.000Z" } }); // Saturday
  const res = evaluatePolicy(intent, passingPolicyCtx());
  assert.equal(res.reason, "not_a_send_day");
});

// ─── 18. Follow-up spacing block ─────────────────────────────────────────────
test("policy: follow-up too close to last contact → spacing block", () => {
  const intent = intentFor({ intent: { action_type: EMAIL_ACTION.FOLLOW_UP, template_ref: "follow_up_v1", scheduled_at: NOW } });
  const res = evaluatePolicy(intent, passingPolicyCtx({ lastContactAt: new Date(Date.parse(NOW) - 3600 * 1000).toISOString() }));
  assert.equal(res.reason, "follow_up_spacing_too_short");
});

// ─── 19. Provider success → real evidence ────────────────────────────────────
test("provider: a real result yields evidence with a real message id", async () => {
  const out = await sendViaProvider(stubTransport("prov_real_123"), intentFor(), { now: NOW });
  assert.equal(out.outcome, SEND_OUTCOME.ACCEPTED);
  assert.equal(out.evidence.provider_message_id, "prov_real_123");
  assert.equal(out.evidence.accepted_status, "accepted");
});

// ─── 20. Provider rejection ──────────────────────────────────────────────────
test("provider: explicit rejection is classified, not completed", async () => {
  const reject = async () => ({ message_id: "m1", status: "rejected", accepted: false, error_category: "invalid_recipient" });
  const out = await sendViaProvider(reject, intentFor(), { now: NOW });
  assert.equal(out.outcome, SEND_OUTCOME.REJECTED);
});

// ─── 21. Provider timeout → sent_unverified (not a clean failure) ────────────
test("provider: a timeout becomes sent_unverified (rule 6)", async () => {
  const timeout = async () => { throw new Error("ETIMEDOUT: provider timeout"); };
  const out = await sendViaProvider(timeout, intentFor(), { now: NOW });
  assert.equal(out.outcome, SEND_OUTCOME.UNVERIFIED);
  assert.equal(out.error_category, "provider_timeout");
});

// ─── 22. No message id → sent_unverified (never fabricate) ───────────────────
test("provider: result without message id → unverified, no evidence fabricated", async () => {
  const noId = async () => ({ status: "accepted" });
  const out = await sendViaProvider(noId, intentFor(), { now: NOW });
  assert.equal(out.outcome, SEND_OUTCOME.UNVERIFIED);
  assert.equal(out.evidence, undefined);
  assert.equal(evidenceFromResult({ status: "ok" }, intentFor(), NOW), null);
});

// ─── 23. Ambiguous timeout reconciliation ────────────────────────────────────
test("reconcile: provider lookup resolves a sent_unverified send to accepted", async () => {
  const lookup = async () => ({ message_id: "prov_found_999", status: "accepted", accepted: true, provider_timestamp: NOW });
  const rec = await reconcileUnverified(lookup, intentFor(), { now: NOW });
  assert.equal(rec.outcome, SEND_OUTCOME.ACCEPTED);
  assert.equal(rec.reconciled, true);
  assert.equal(rec.evidence.provider_message_id, "prov_found_999");
});
test("reconcile: no provider record → safe to retry", async () => {
  const rec = await reconcileUnverified(async () => null, intentFor(), { now: NOW });
  assert.equal(rec.retry_safe, true);
});

// ─── 24. Evidence persistence + read-after-write ─────────────────────────────
test("execute: full flow persists evidence and verifies read-back", async () => {
  const client = fakeEmailClient();
  const mat = await materializeIntent(baseAction(), { client, now: NOW });
  const gate = await applyPolicyGate(mat.intent, passingPolicyCtx(), { client, now: NOW });
  const claim = await claimIntent(gate.intent, "worker-A", { client, now: NOW });
  const exec = await executeIntent(claim.intent, stubTransport("prov_exec_1"), { client, now: NOW, updateLead: false });
  assert.equal(exec.ok, true, exec.reason);
  assert.equal(exec.intent.state, EMAIL_STATES.COMPLETED);
  assert.equal(exec.evidence.provider_message_id, "prov_exec_1");
  assert.ok(client.evidence.has("prov_exec_1"));
  assert.equal(Object.keys(exec.evidence_items).length, 9);
});

// ─── 25. Read-after-write mismatch blocks completion ─────────────────────────
test("execute: evidence read-back failure → sent_unverified, not completed", async () => {
  const client = fakeEmailClient({ dropEvidenceReadBack: true });
  const mat = await materializeIntent(baseAction(), { client, now: NOW });
  const gate = await applyPolicyGate(mat.intent, passingPolicyCtx(), { client, now: NOW });
  const claim = await claimIntent(gate.intent, "worker-A", { client, now: NOW });
  const exec = await executeIntent(claim.intent, stubTransport(), { client, now: NOW, updateLead: false });
  assert.equal(exec.ok, false);
  assert.equal(exec.intent.state, EMAIL_STATES.SENT_UNVERIFIED);
});

// ─── 26. Missing provider id → no completion ─────────────────────────────────
test("execute: provider returns no id → never completed", async () => {
  const client = fakeEmailClient();
  const mat = await materializeIntent(baseAction(), { client, now: NOW });
  const gate = await applyPolicyGate(mat.intent, passingPolicyCtx(), { client, now: NOW });
  const claim = await claimIntent(gate.intent, "worker-A", { client, now: NOW });
  const exec = await executeIntent(claim.intent, async () => ({ status: "accepted" }), { client, now: NOW, updateLead: false });
  assert.equal(exec.ok, false);
  assert.notEqual(exec.intent.state, EMAIL_STATES.COMPLETED);
});

// ─── 27. Evidence write failure → no completion ──────────────────────────────
test("execute: evidence write failure → sent_unverified, not completed", async () => {
  const client = fakeEmailClient({ failEvidenceWrite: true });
  const mat = await materializeIntent(baseAction(), { client, now: NOW });
  const gate = await applyPolicyGate(mat.intent, passingPolicyCtx(), { client, now: NOW });
  const claim = await claimIntent(gate.intent, "worker-A", { client, now: NOW });
  const exec = await executeIntent(claim.intent, stubTransport(), { client, now: NOW, updateLead: false });
  assert.equal(exec.ok, false);
  assert.equal(exec.intent.state, EMAIL_STATES.SENT_UNVERIFIED);
});

// ─── 28. Reply association + classification ──────────────────────────────────
test("reply: classifications cover all required categories", () => {
  assert.equal(classifyReply({ body: "Yes, I'm interested, tell me more" }).classification, REPLY_CLASS.POSITIVE_INTEREST);
  assert.equal(classifyReply({ body: "Can we schedule a demo call?" }).classification, REPLY_CLASS.MEETING_REQUESTED);
  assert.equal(classifyReply({ body: "How much does it cost?" }).classification, REPLY_CLASS.QUESTION);
  assert.equal(classifyReply({ body: "Not interested, no thanks" }).classification, REPLY_CLASS.NOT_INTERESTED);
  assert.equal(classifyReply({ body: "Please unsubscribe me" }).classification, REPLY_CLASS.UNSUBSCRIBE);
  assert.equal(classifyReply({ body: "You have the wrong person" }).classification, REPLY_CLASS.WRONG_PERSON);
  assert.equal(classifyReply({ body: "I am out of office until Monday" }).classification, REPLY_CLASS.OUT_OF_OFFICE);
  assert.equal(classifyReply({ body: "Mail delivery failed: undeliverable" }).classification, REPLY_CLASS.BOUNCE);
  assert.equal(classifyReply({ body: "ok" }).classification, REPLY_CLASS.AMBIGUOUS);
});

// ─── 29. Low-confidence reply routes to review ───────────────────────────────
test("reply: question + ambiguous require review", () => {
  assert.equal(classifyReply({ body: "what is your pricing?" }).requires_review, true);
  assert.equal(classifyReply({ body: "hmm" }).requires_review, true);
});

// ─── 30. Duplicate reply dedupe ──────────────────────────────────────────────
test("reply: second reply with same provider_event_id is deduped", async () => {
  const client = fakeEmailClient();
  const intent = intentFor();
  const inbound = { provider_event_id: "evt_1", body: "interested!", from: LEAD.email };
  const { processReply } = await import("../src/lib/emailRail/reply.mjs");
  const r1 = await processReply(inbound, intent, { client, now: NOW, updateLead: false });
  const r2 = await processReply(inbound, intent, { client, now: NOW, updateLead: false });
  assert.equal(r1.deduped, false);
  assert.equal(r2.deduped, true);
});

// ─── 31. Future follow-up cancellation on sequence stop ──────────────────────
test("scheduler: unsubscribe cancels pending follow-up intents", () => {
  const pending = [
    { execution_id: "e1", state: "scheduled" },
    { execution_id: "e2", state: "completed" },
    { execution_id: "e3", state: "approved" },
  ];
  const toCancel = selectIntentsToCancel(pending, REPLY_CLASS.UNSUBSCRIBE);
  assert.deepEqual(toCancel.sort(), ["e1", "e3"]);
  assert.deepEqual(selectIntentsToCancel(pending, REPLY_CLASS.POSITIVE_INTEREST), []);
});

// ─── 32. Follow-up scheduling: spacing + max attempts + determinism ──────────
test("scheduler: deterministic next slot, max attempts caps, reply stops", () => {
  const first = "2026-06-08T14:00:00.000Z";
  const s1 = deriveNextScheduledAt({ attempt_number: 1, first_sent_at: first });
  assert.equal(s1, deriveNextScheduledAt({ attempt_number: 1, first_sent_at: first })); // deterministic
  assert.equal(deriveNextScheduledAt({ attempt_number: 4, first_sent_at: first }), null); // exhausted
  assert.equal(evaluateFollowUp({ attempt_number: 1, first_sent_at: first, reply_classification: REPLY_CLASS.UNSUBSCRIBE }).should_schedule, false);
  assert.equal(evaluateFollowUp({ attempt_number: 1, first_sent_at: first }).should_schedule, true);
});

// ─── 33. Restart recovery: re-running the same action does not duplicate ─────
test("restart: same action re-run is idempotent (no duplicate intent or send)", async () => {
  const client = fakeEmailClient();
  const a = baseAction();
  const r1 = await materializeIntent(a, { client, now: NOW });
  const r2 = await materializeIntent(a, { client, now: NOW }); // simulates a restart re-run
  assert.equal(r1.intent.execution_id, r2.intent.execution_id); // deterministic id
  // Only one intent row exists.
  assert.equal(client.intents.size, 1);
});

test("restart: a completed intent is never re-sent", async () => {
  const client = fakeEmailClient();
  const mat = await materializeIntent(baseAction(), { client, now: NOW });
  const gate = await applyPolicyGate(mat.intent, passingPolicyCtx(), { client, now: NOW });
  const claim = await claimIntent(gate.intent, "worker-A", { client, now: NOW });
  let sends = 0;
  const counting = async (d) => { sends += 1; return { message_id: "pm_once", to: d.to, status: "accepted", accepted: true }; };
  await executeIntent(claim.intent, counting, { client, now: NOW, updateLead: false });
  // Re-materialize + policy with prior-success idem key blocks a second send.
  const re = await materializeIntent(baseAction(), { client, now: NOW });
  const reGate = evaluatePolicy(re.intent, passingPolicyCtx({ priorSuccessIdemKeys: new Set([re.intent.idempotency_key]) }));
  assert.equal(reGate.ok, false);
  assert.equal(reGate.reason, "prior_successful_send_exists");
  assert.equal(sends, 1);
});

// ─── 34. Watchdog behavior ───────────────────────────────────────────────────
test("watchdog: expired lease → release; sent_unverified → reconcile; retry cap → dead letter", () => {
  const expired = { execution_id: "e1", state: "claimed", lease_owner: "w", lease_expires_at: "2026-06-08T13:00:00.000Z" };
  assert.equal(evaluateIntent(expired, { now: NOW }).action, WATCHDOG_ACTION.RELEASE_LEASE);
  const unver = { execution_id: "e2", state: "sent_unverified" };
  assert.equal(evaluateIntent(unver, { now: NOW }).action, WATCHDOG_ACTION.RECONCILE);
  const exhausted = { execution_id: "e3", state: "retry_waiting", retry_count: 4 };
  assert.equal(evaluateIntent(exhausted, { now: NOW }).action, WATCHDOG_ACTION.DEAD_LETTER);
  const escalate = { execution_id: "e4", state: "completed", provider_message_id: "" };
  const ev = evaluateIntent(escalate, { now: NOW });
  assert.equal(ev.action, WATCHDOG_ACTION.ESCALATE);
  assert.equal(ev.safe, false);
});

test("watchdog: sweep groups actions + escalations", () => {
  const res = sweep([
    { execution_id: "e1", state: "claimed", lease_owner: "w", lease_expires_at: "2026-06-08T13:00:00.000Z" },
    { execution_id: "e2", state: "completed", provider_message_id: "pm" }, // healthy
    { execution_id: "e3", state: "completed", provider_message_id: "" },   // escalate
  ], { now: NOW });
  assert.equal(res.summary.actionable, 1);
  assert.equal(res.summary.escalations, 1);
});

// ─── 35. No local production authority ───────────────────────────────────────
test("config: live mode without Supabase throws (no local authority)", () => {
  const cfg = { mode: EMAIL_MODE.LIVE, state: EMAIL_CONFIG_STATE.PERSISTENCE_PENDING };
  assert.throws(() => assertNoLocalAuthorityInProduction(cfg), /local_authority_blocked/);
});
test("config: describe never leaks secret values", () => {
  const d = describeEmailConfig({});
  assert.equal(typeof d.configured, "boolean");
  assert.ok(!("api_key" in d));
  assert.ok(!JSON.stringify(d).includes("secret"));
});

// ─── 36. No completion without evidence (lifecycle invariant) ────────────────
test("lifecycle: cannot jump proposed → completed", () => {
  assert.equal(canTransitionEmail("proposed", "completed"), false);
  assert.equal(canTransitionEmail("executing", "completed"), true);
  assert.ok(EMAIL_TRUTH.not_sent.has("approved"));
  assert.ok(EMAIL_TRUTH.completed.has("completed"));
});

// ─── 37. No other transport: provider adapter only sends email ───────────────
test("no other transport: the rail exposes only email send, no call/DM/social/stripe", async () => {
  const mod = await import("../src/lib/emailRail/provider.mjs");
  const names = Object.keys(mod).join(" ").toLowerCase();
  for (const banned of ["call", "retell", "sms", "dm", "linkedin", "stripe", "payment"]) {
    assert.ok(!names.includes(banned), `provider must not expose ${banned}`);
  }
});

// ─── 38. End-to-end controlled action via runEmailAction ─────────────────────
test("runEmailAction: eligible lead → completed with full evidence (controlled)", async () => {
  const client = fakeEmailClient();
  const result = await runEmailAction(
    { ...baseAction(), policyCtx: passingPolicyCtx() },
    { client, now: NOW, worker_id: "Hermes-1", transport: stubTransport("prov_e2e_1"), updateLead: false },
  );
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.step, "completed");
  assert.equal(result.intent.state, EMAIL_STATES.COMPLETED);
  assert.equal(result.evidence.provider_message_id, "prov_e2e_1");
});
