import assert from "node:assert/strict";
import test from "node:test";

import {
  CALL_STATES,
  CALL_OUTCOME,
  createCallIntent,
  transitionCall,
  deriveCallExecutionId,
  deriveCallIdempotencyKey,
} from "../src/lib/callRail/intent.mjs";
import { evaluateCallPolicy } from "../src/lib/callRail/policy.mjs";
import { claimCallIntent, completeCallIntent, reconcileProviderTimeout } from "../src/lib/callRail/pipeline.mjs";
import { classifyProviderOutcome, nextActionForOutcome } from "../src/lib/callRail/outcomes.mjs";
import { sweepCallIntents } from "../src/lib/callRail/watchdog.mjs";

const NOW = "2026-06-08T16:00:00.000Z";

function lead(overrides = {}) {
  return {
    lead_id: "lead-jonathan-controlled",
    version: 3,
    company: "Jonathan Controlled Acceptance",
    normalized_phone: "+14075550123",
    phone_verified: true,
    timezone: "America/New_York",
    eligibility: "call",
    pipeline_stage: "ready_to_call",
    next_action: "call",
    ...overrides,
  };
}

function intent(overrides = {}) {
  return createCallIntent({
    lead_id: "lead-jonathan-controlled",
    lead_version: 3,
    phone: "+14075550123",
    approved_script_ref: "phase3-controlled-script-v1",
    approved_angle: "Front Office Leak Check",
    scheduled_slot: "2026-06-08T16",
    approval_id: "approval-jonathan-one-call",
    ...overrides,
  }, { now: NOW });
}

test("call intent IDs and idempotency keys are deterministic and bind lead version/script/phone", () => {
  const a = intent();
  const b = intent();
  assert.equal(a.execution_id, b.execution_id);
  assert.equal(a.idempotency_key, b.idempotency_key);
  assert.equal(a.execution_id, deriveCallExecutionId(a));
  assert.equal(a.idempotency_key, deriveCallIdempotencyKey(a));

  const changedVersion = intent({ lead_version: 4 });
  assert.notEqual(a.idempotency_key, changedVersion.idempotency_key);
});

test("policy blocks unverified phone, suppression, quiet hours, stale lead version, active reply, caps, and missing approval", () => {
  const base = intent();
  const cases = [
    ["phone_unverified", { lead: lead({ phone_verified: false }) }],
    ["phone_on_dnc", { lead: lead(), dnc: ["+14075550123"] }],
    ["phone_suppressed", { lead: lead(), suppression: ["+14075550123"] }],
    ["within_quiet_hours", { lead: lead(), localHour: 21 }],
    ["stale_lead_version:3!=4", { lead: lead({ version: 4 }) }],
    ["active_positive_reply", { lead: lead(), activeReplyState: "positive_interest" }],
    ["attempt_cap_reached", { lead: lead(), attempts: { "lead-jonathan-controlled": 3 }, policy: { max_attempts: 3 } }],
    ["approval_required", { lead: lead(), approvalPresent: false }],
  ];

  for (const [reason, ctx] of cases) {
    const out = evaluateCallPolicy(base, { now: NOW, localHour: 11, approvalPresent: true, ...ctx });
    assert.equal(out.ok, false, reason);
    assert.equal(out.reason, reason);
    assert.equal(out.receipt.decision, reason === "approval_required" ? "approval_required" : "block");
  }
});

test("policy passes only inside approval boundary for verified current lead", () => {
  const out = evaluateCallPolicy(intent(), { now: NOW, lead: lead(), localHour: 11, approvalPresent: true });
  assert.equal(out.ok, true);
  assert.equal(out.receipt.decision, "pass");
  assert.equal(out.receipt.checks.retell_provider_approved, true);
});

test("atomic claim rejects stale workers and completed intent cannot be reclaimed", async () => {
  const row = { ...intent(), state: CALL_STATES.APPROVED };
  const client = {
    row,
    async claim(execution_id, owner) {
      if (this.row.lease_owner && this.row.lease_owner !== owner) return { ok: false, reason: "leased_by_other_worker" };
      this.row = { ...this.row, lease_owner: owner, lease_expires_at: "2026-06-08T16:02:00.000Z", version: this.row.version + 1 };
      return { ok: true, lease_expires_at: this.row.lease_expires_at };
    },
    async readIntent() { return { raw_intent: this.row, version: this.row.version, state: this.row.state }; },
    async upsertIntent(next) { this.row = next; return { ok: true }; },
  };

  const first = await claimCallIntent(row, "worker-a", { client, now: NOW });
  assert.equal(first.ok, true);
  const stale = await claimCallIntent(row, "worker-b", { client, now: NOW });
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, "leased_by_other_worker");

  const done = { ...first.intent, state: CALL_STATES.COMPLETED, provider_call_id: "call_done", provider_evidence: { provider_call_id: "call_done" } };
  const completed = await claimCallIntent(done, "worker-a", { client: { ...client, row: done }, now: NOW });
  assert.equal(completed.ok, false);
  assert.equal(completed.reason, "terminal_state");
});

test("completion requires real provider outcome plus evidence read-back; queued and started are not completed", async () => {
  const claimed = { ...intent(), state: CALL_STATES.EXECUTING, lease_owner: "worker-a", policy_receipt: { decision: "pass" } };
  const started = await completeCallIntent(claimed, { provider_call_id: "call_started", status: "started" }, { client: {}, now: NOW });
  assert.equal(started.ok, false);
  assert.equal(started.reason, "provider_outcome_not_terminal");

  let evidenceWritten = null;
  let storedIntent = claimed;
  const client = {
    async writeEvidence(row) { evidenceWritten = row; return { ok: true, rows: [row] }; },
    async readEvidence(id) { return evidenceWritten?.provider_call_id === id ? evidenceWritten : null; },
    async readIntent() { return { raw_intent: storedIntent, version: storedIntent.version, state: storedIntent.state }; },
    async upsertIntent(next) { storedIntent = next; return { ok: true }; },
  };
  const done = await completeCallIntent(claimed, {
    provider_call_id: "call_real_123",
    status: "ended",
    outcome: "interested",
    duration_seconds: 74,
    recording_url: "https://retell.example/recording/call_real_123",
    transcript_url: "https://retell.example/transcript/call_real_123",
  }, { client, now: NOW, updateLead: false });

  assert.equal(done.ok, true);
  assert.equal(done.intent.state, CALL_STATES.COMPLETED);
  assert.equal(done.intent.provider_call_id, "call_real_123");
  assert.equal(done.evidence_items.provider_read_back, "verified");
});

test("all Phase 3 outcomes classify and route to safe next action", () => {
  const expected = {
    connected: "human_review",
    voicemail: "retry_with_spacing",
    no_answer: "retry_with_spacing",
    busy: "retry_with_spacing",
    failed: "provider_reconcile_or_retry",
    wrong_number: "stop_and_reverify_phone",
    callback_requested: "schedule_callback",
    interested: "route_to_leak_check",
    not_interested: "stop_follow_up",
    do_not_call: "stop_all_contact",
    meeting_requested: "book_meeting",
    ambiguous: "human_review",
  };
  for (const [outcome, action] of Object.entries(expected)) {
    assert.equal(classifyProviderOutcome({ outcome }).outcome, outcome);
    assert.equal(nextActionForOutcome(outcome, { preferredOffer: "leak_check" }).next_action, action);
  }
});

test("timeout reconciliation completes only after provider read-back returns terminal evidence", async () => {
  const timedOut = { ...intent(), state: CALL_STATES.STARTED_UNVERIFIED, provider_call_id: "call_timeout" };
  const missing = await reconcileProviderTimeout(timedOut, { lookupCall: async () => null, client: {}, now: NOW });
  assert.equal(missing.ok, false);
  assert.equal(missing.requires_reconciliation, true);

  let storedTimeoutIntent = timedOut;
  const client = {
    async writeEvidence(row) { this.row = row; return { ok: true }; },
    async readEvidence(id) { return this.row?.provider_call_id === id ? this.row : null; },
    async readIntent() { return { raw_intent: storedTimeoutIntent, version: storedTimeoutIntent.version, state: storedTimeoutIntent.state }; },
    async upsertIntent(next) { storedTimeoutIntent = next; return { ok: true }; },
  };
  const found = await reconcileProviderTimeout(timedOut, {
    client,
    now: NOW,
    updateLead: false,
    lookupCall: async () => ({ provider_call_id: "call_timeout", status: "ended", outcome: "voicemail", duration_seconds: 22 }),
  });
  assert.equal(found.ok, true);
  assert.equal(found.intent.state, CALL_STATES.COMPLETED);
});

test("watchdog covers expired leases, missing evidence, provider timeout, stale work, failed reply lookup, and conflicts", () => {
  const report = sweepCallIntents([
    { ...intent(), state: CALL_STATES.CLAIMED, lease_expires_at: "2026-06-08T15:00:00.000Z" },
    { ...intent(), state: CALL_STATES.COMPLETED, provider_call_id: "" },
    { ...intent(), state: CALL_STATES.STARTED_UNVERIFIED },
    { ...intent(), state: CALL_STATES.SCHEDULED, scheduled_at: "2026-06-01T16:00:00.000Z" },
  ], {
    now: NOW,
    replyLookup: { ok: false },
    pipelineConflicts: ["lead-jonathan-controlled"],
  });

  const reasons = [...report.actions, ...report.escalations].map((a) => a.reason);
  assert.ok(reasons.includes("lease_expired"));
  assert.ok(reasons.includes("completed_without_provider_evidence"));
  assert.ok(reasons.includes("provider_timeout_needs_reconciliation"));
  assert.ok(reasons.includes("stale_scheduled_call"));
  assert.ok(reasons.includes("failed_reply_lookup"));
  assert.ok(reasons.includes("pipeline_conflict"));
});
