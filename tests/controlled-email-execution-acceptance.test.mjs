import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  runControlledEmailExecutionAcceptance,
} from "../src/lib/controlledEmailExecutionAcceptance.mjs";
import { createEmailIntent } from "../src/lib/emailRail/intent.mjs";
import { evaluatePolicy } from "../src/lib/emailRail/policy.mjs";
import {
  createMemoryRevenueExecutionStore,
  readDurableRevenueExecutionQueue,
} from "../src/lib/leadSupplyExecutionPersistence.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import { readAutonomousRevenueState } from "../src/lib/revenueEngineReadAdapter.mjs";

const INSIDE = "2026-06-12T14:00:00.000Z"; // Friday 10:00 AM New York
const OUTSIDE = "2026-06-12T08:55:00.000Z"; // Friday 4:55 AM New York

function fakeEmailClient() {
  const intents = new Map();
  const idemKeys = new Set();
  const evidence = new Map();
  return {
    configured: true,
    intents,
    evidence,
    async readIntent(id) {
      const row = intents.get(id);
      return row ? { raw_intent: row.row, version: row.version, state: row.row.state } : null;
    },
    async upsertIntent(intent, expectedVersion) {
      const existing = intents.get(intent.execution_id);
      const target = Number(intent.version ?? 1);
      if (!existing) {
        if (expectedVersion !== 0 || target !== 1) return { ok: false, status: "conflict", reason: "first_insert_version_mismatch" };
        if (idemKeys.has(intent.idempotency_key)) return { ok: false, status: "duplicate", reason: "duplicate_idempotency_key" };
        idemKeys.add(intent.idempotency_key);
        intents.set(intent.execution_id, { row: { ...intent }, version: 1 });
        return { ok: true, status: "inserted", version: 1 };
      }
      if (existing.version !== expectedVersion) return { ok: false, status: "conflict", reason: "cas_version_mismatch", current_version: existing.version };
      if (target !== expectedVersion + 1) return { ok: false, status: "conflict", reason: "non_sequential_version", current_version: existing.version };
      intents.set(intent.execution_id, { row: { ...intent }, version: target });
      return { ok: true, status: "updated", version: target };
    },
    async claim(id, owner, leaseSeconds, now) {
      const current = intents.get(id);
      if (!current) return { ok: false, reason: "intent_not_found" };
      const row = current.row;
      const nowMs = Date.parse(now);
      const liveLease = row.lease_owner && row.lease_expires_at && Date.parse(row.lease_expires_at) > nowMs;
      if (liveLease && row.lease_owner !== owner) return { ok: false, reason: "lease_held_by_other" };
      const expires = new Date(nowMs + leaseSeconds * 1000).toISOString();
      row.lease_owner = owner;
      row.lease_expires_at = expires;
      current.version += 1;
      row.version = current.version;
      return { ok: true, status: "claimed", lease_expires_at: expires };
    },
    async writeEvidence(row) {
      if (evidence.has(row.provider_message_id)) return { ok: true, rows: [] };
      evidence.set(row.provider_message_id, { ...row });
      return { ok: true, rows: [row] };
    },
    async readEvidence(id) {
      return evidence.get(id) || null;
    },
  };
}

function lead(id, overrides = {}) {
  return {
    lead_id: id,
    company_name: `${id} Plumbing`,
    website: `https://${id}.example`,
    email: `${id}@example.com`,
    eligibility: "email_eligible",
    record_status: "accepted",
    pipeline_stage: "contact_ready",
    version: 1,
    ...overrides,
  };
}

function queuedEmailAction(store, id, overrides = {}) {
  const now = overrides.now || INSIDE;
  const leadRecord = lead(overrides.lead_id || id, overrides.lead || {});
  const intent = overrides.intent || createEmailIntent({
    lead_id: leadRecord.lead_id,
    lead_version: leadRecord.version,
    recipient: leadRecord.email,
    sender: overrides.sender || "hello@ottoserv.com",
    template_ref: overrides.template_ref || "intro_v1",
    campaign_id: overrides.campaign_id || "phase9b-front-office",
    subject: overrides.subject || `Quick question for ${leadRecord.company_name}`,
    body: overrides.body || "Approved OttoServ controlled outreach.",
    scheduled_at: now,
  }, { now });
  const policy = overrides.policy || evaluatePolicy(intent, {
    lead: leadRecord,
    now,
    approvedSenders: ["ottoserv.com"],
    approvalPresent: overrides.approvalPresent !== false,
  });
  const actionId = overrides.action_id || `phase9b-${id}`;
  store.tables.selected_leads.set(leadRecord.lead_id, {
    lead_id: leadRecord.lead_id,
    company_name: leadRecord.company_name,
    email: leadRecord.email,
    website: leadRecord.website,
    readiness_state: "contact_ready",
    next_scheduled_action: now,
    updated_at: now,
  });
  store.tables.revenue_actions.set(actionId, {
    action_id: actionId,
    lead_id: leadRecord.lead_id,
    client: leadRecord.company_name,
    status: overrides.status || "queued",
    next_action: "approved_cold_email",
    offer_match: { service_key: "front_office_leak_check" },
    evidence_source_reference: overrides.evidence_source_reference === undefined ? `source://${id}` : overrides.evidence_source_reference,
    raw_action: {
      lead_id: leadRecord.lead_id,
      client: leadRecord.company_name,
      next_action: "approved_cold_email",
      offer: { service_key: "front_office_leak_check" },
      email: { intent, policy },
    },
    created_at: now,
    updated_at: now,
  });
  store.tables.email_intents.set(intent.execution_id, { ...intent, status: "queued" });
  return { actionId, intent, lead: leadRecord };
}

test("outside-window controlled email acceptance holds all sends and reports next eligible time", async () => {
  const store = createMemoryRevenueExecutionStore();
  queuedEmailAction(store, "outside", { now: OUTSIDE });
  const queue = readDurableRevenueExecutionQueue({ store });

  const report = await runControlledEmailExecutionAcceptance({
    now: OUTSIDE,
    queue,
    store,
    mode: "live",
    emailClient: fakeEmailClient(),
    transport: () => ({ message_id: "should-not-send" }),
  });

  assert.equal(report.approved_window.in_window, false);
  assert.equal(report.summary.sent, 0);
  assert.equal(report.summary.held, 1);
  assert.equal(report.actions[0].status, "held_until_send_window");
  assert.equal(report.safety.no_live_call_placed, true);
});

test("inside-window acceptance sends one first, then up to three total after clean evidence", async () => {
  const store = createMemoryRevenueExecutionStore();
  queuedEmailAction(store, "one");
  queuedEmailAction(store, "two");
  queuedEmailAction(store, "three");
  queuedEmailAction(store, "four");
  const client = fakeEmailClient();
  const drafts = [];
  const transport = (draft) => {
    drafts.push(draft);
    return { message_id: `msg-${draft.to}`, thread_id: `thr-${draft.to}`, to: draft.to, from: draft.from, status: "accepted", accepted: true, provider_timestamp: INSIDE };
  };

  const report = await runControlledEmailExecutionAcceptance({
    now: INSIDE,
    queue: readDurableRevenueExecutionQueue({ store }),
    store,
    mode: "live",
    emailClient: client,
    transport,
    dailyCap: 3,
    initialCap: 1,
  });

  assert.equal(drafts.length, 3);
  assert.equal(report.summary.attempted, 3);
  assert.equal(report.summary.sent, 3);
  assert.equal(report.summary.blocked, 1);
  assert.equal(report.actions.filter((item) => item.status === "sent").length, 3);
  assert.ok(report.actions.some((item) => item.status === "blocked" && item.reason === "daily_cap_reached"));
  assert.equal(client.evidence.size, 3);

  const queue = readDurableRevenueExecutionQueue({ store });
  assert.equal(queue.summary.completed_with_evidence, 3);
  assert.equal(queue.summary.evidence_events, 3);
  assert.equal(queue.items.filter((item) => item.revenue_status === "follow_up_due").length, 3);
});

test("DNC, duplicate recipient, missing email, missing evidence, and unapproved copy are blocked", async () => {
  const store = createMemoryRevenueExecutionStore();
  queuedEmailAction(store, "dnc");
  queuedEmailAction(store, "dupe-a", { lead: { email: "same@example.com" } });
  queuedEmailAction(store, "dupe-b", { lead: { email: "same@example.com" } });
  queuedEmailAction(store, "missing-email", { lead: { email: "" } });
  queuedEmailAction(store, "missing-evidence", { evidence_source_reference: "" });
  queuedEmailAction(store, "unapproved", { approvalPresent: false });
  let sends = 0;

  const report = await runControlledEmailExecutionAcceptance({
    now: INSIDE,
    queue: readDurableRevenueExecutionQueue({ store }),
    store,
    mode: "live",
    emailClient: fakeEmailClient(),
    transport: () => { sends += 1; return { message_id: "blocked-should-not-send" }; },
    doNotContact: ["dnc@example.com"],
  });

  assert.equal(sends, 0);
  assert.equal(report.summary.sent, 0);
  assert.ok(report.actions.some((item) => item.status === "blocked" && item.reason === "recipient_on_dnc"));
  assert.ok(report.actions.some((item) => item.status === "skipped_duplicate" && item.reason === "duplicate_email"));
  assert.ok(report.actions.some((item) => item.status === "blocked" && item.reason === "missing_email"));
  assert.ok(report.actions.some((item) => item.status === "blocked" && item.reason === "missing_evidence_path"));
  assert.ok(report.actions.some((item) => item.status === "blocked" && item.reason === "unapproved_copy"));
});

test("idempotent rerun does not resend the same action, lead, or recipient offer", async () => {
  const store = createMemoryRevenueExecutionStore();
  queuedEmailAction(store, "idem");
  const client = fakeEmailClient();
  let sends = 0;
  const transport = (draft) => {
    sends += 1;
    return { message_id: "msg-idem", thread_id: "thr-idem", to: draft.to, from: draft.from, status: "accepted", accepted: true };
  };

  const first = await runControlledEmailExecutionAcceptance({
    now: INSIDE,
    queue: readDurableRevenueExecutionQueue({ store }),
    store,
    mode: "live",
    emailClient: client,
    transport,
    dailyCap: 3,
  });
  const second = await runControlledEmailExecutionAcceptance({
    now: INSIDE,
    queue: readDurableRevenueExecutionQueue({ store }),
    store,
    mode: "live",
    emailClient: client,
    transport,
    dailyCap: 3,
  });

  assert.equal(first.summary.sent, 1);
  assert.equal(second.summary.sent, 0);
  assert.equal(second.summary.skipped_duplicate, 1);
  assert.equal(sends, 1);
  assert.equal(second.idempotency.no_resend_on_rerun, true);
});

test("provider failure updates revenue action as failed without completion evidence", async () => {
  const store = createMemoryRevenueExecutionStore();
  queuedEmailAction(store, "fail");
  const report = await runControlledEmailExecutionAcceptance({
    now: INSIDE,
    queue: readDurableRevenueExecutionQueue({ store }),
    store,
    mode: "live",
    emailClient: fakeEmailClient(),
    transport: () => { throw new Error("provider_down"); },
  });

  assert.equal(report.summary.failed, 1);
  assert.equal(report.summary.sent, 0);
  const queue = readDurableRevenueExecutionQueue({ store });
  const action = queue.items.find((item) => item.action_id === "phase9b-fail");
  assert.equal(action.status, "failed");
  assert.equal(action.latest_evidence.evidence_type, "email_send_failure");
});

test("latest.json and read adapter expose Phase 9B controlled email execution acceptance", async () => {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "phase9b-latest-"));
  const client = fakeEmailClient();
  let sends = 0;
  const result = await runRevenueDailyLoop({
    now: INSIDE,
    outputDir,
    persistSupabase: false,
    sourceOptions: { cwd: outputDir },
    leadSupplySources: [{
      source_type: "manual_imported_leads",
      records: [lead("latest", {
        company_name: "Latest Plumbing",
        industry: "plumbing",
        niche: "plumbing",
        source_evidence: "Synthetic latest source",
        pain_notes: "Missed calls and slow follow up.",
      })],
    }],
    leadSupplyOptions: { approvalPresent: true, approvedSenders: ["ottoserv.com"] },
    controlledEmailAcceptanceOptions: {
      mode: "live",
      emailClient: client,
      dailyCap: 1,
      initialCap: 1,
      transport: (draft) => {
        sends += 1;
        return { message_id: "msg-latest", thread_id: "thr-latest", to: draft.to, from: draft.from, status: "accepted", accepted: true };
      },
    },
  });

  const latest = JSON.parse(readFileSync(result.latestPath, "utf8"));
  assert.equal(sends, 1);
  assert.equal(latest.controlledEmailExecution.summary.sent, 1);
  assert.equal(latest.controlledEmailExecution.evidence_summary.evidence_events_recorded, 1);
  assert.equal(latest.dailyAutonomousOperatingCycle.safety_confirmations.no_live_calls_placed, true);

  const readState = await readAutonomousRevenueState({ dataDir: outputDir });
  assert.equal(readState.controlledEmailExecution.summary.sent, 1);
  assert.equal(readState.dailyAutonomousOperatingCycle.latest_json_read_model.dailyAutonomousOperatingCycle, true);
});
