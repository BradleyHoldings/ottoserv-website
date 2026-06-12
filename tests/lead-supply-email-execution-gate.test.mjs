import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runLeadSupplyDailyLoop } from "../src/lib/leadSupplyDailyLoop.mjs";
import {
  createMemoryRevenueExecutionStore,
  persistLeadSupplyExecution,
} from "../src/lib/leadSupplyExecutionPersistence.mjs";
import {
  prepareControlledEmailExecution,
  nextEligibleSendTime,
} from "../src/lib/leadSupplyEmailExecutionGate.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";

const INSIDE = "2026-06-12T14:00:00.000Z"; // Friday 10:00 AM America/New_York
const OUTSIDE = "2026-06-12T21:00:00.000Z"; // Friday 5:00 PM America/New_York

function lead(overrides = {}) {
  return {
    lead_id: "phase7d-alpha",
    company_name: "Alpha Plumbing",
    contact_name: "Alex Owner",
    website: "https://alphaplumbing.example",
    email: "alex@alphaplumbing.example",
    normalized_phone: "",
    phone_verified: false,
    industry: "plumbing",
    niche: "plumbing",
    source_type: "manual_imported_leads",
    source_evidence: "Operator imported lead with public website evidence.",
    pain_notes: "Reviews mention no answer and no callback.",
    score: 82,
    tier: "B-tier",
    eligibility: "email_eligible",
    record_status: "accepted",
    pipeline_stage: "contact_ready",
    version: 1,
    created_at: INSIDE,
    updated_at: INSIDE,
    ...overrides,
  };
}

async function queueFor(records, options = {}) {
  const report = runLeadSupplyDailyLoop({
    sources: [{ source_type: "manual_imported_leads", records }],
    now: options.now || INSIDE,
    approvals: { approvalPresent: true, approvedSenders: ["ottoserv.com"], localHour: 14, ...(options.approvals || {}) },
    doNotContact: options.doNotContact,
  });
  const store = createMemoryRevenueExecutionStore();
  const persisted = await persistLeadSupplyExecution(report, { store, now: options.now || INSIDE });
  return { queue: persisted.queue, store, report };
}

test("outside-hours queued emails are held with reason and next send window", async () => {
  const { queue } = await queueFor([lead()], { now: INSIDE });

  const prep = prepareControlledEmailExecution(queue, { now: OUTSIDE });

  assert.equal(prep.summary.held_until_send_window, 1);
  assert.equal(prep.summary.send_eligible, 0);
  assert.equal(prep.summary.live_emails_sent, 0);
  assert.equal(prep.actions[0].status, "held_until_send_window");
  assert.equal(prep.actions[0].held_reason, "outside_approved_send_window");
  assert.equal(prep.actions[0].next_eligible_send_time, "2026-06-15T13:00:00.000Z");
  assert.equal(prep.actions[0].offer_matched.service_key, "missed_call_recovery");
  assert.equal(prep.safety.no_live_email_sent, true);
});

test("inside-hours queued emails can be marked send-eligible without sending", async () => {
  const { queue } = await queueFor([lead()], { now: INSIDE });

  const prep = prepareControlledEmailExecution(queue, { now: INSIDE });

  assert.equal(prep.summary.send_eligible, 1);
  assert.equal(prep.actions[0].status, "send_eligible");
  assert.equal(prep.actions[0].template_copy_approval_status, "approved");
  assert.equal(prep.summary.live_emails_sent, 0);
});

test("daily cap limits send-eligible emails and holds the remainder", async () => {
  const records = [1, 2, 3, 4].map((n) => lead({
    lead_id: `phase7d-cap-${n}`,
    company_name: `Cap Plumbing ${n}`,
    website: `https://cap${n}.example`,
    email: `owner${n}@cap${n}.example`,
  }));
  const { queue } = await queueFor(records, { now: INSIDE });

  const prep = prepareControlledEmailExecution(queue, { now: INSIDE, dailyCap: 3 });

  assert.equal(prep.summary.send_eligible, 3);
  assert.equal(prep.summary.blocked, 1);
  assert.equal(prep.actions.filter((item) => item.block_reason === "daily_cap_reached").length, 1);
});

test("DNC, duplicates, missing email, unapproved copy, recent contact, unsafe sender, missing evidence, and prior sent are blocked", async () => {
  const records = [
    lead({ lead_id: "phase7d-dnc", company_name: "DNC Plumbing", website: "https://dnc.example", email: "owner@dnc.example" }),
    lead({ lead_id: "phase7d-dup-a", company_name: "Dup A", website: "https://dupa.example", email: "owner@duplicate.example" }),
    lead({ lead_id: "phase7d-dup-b", company_name: "Dup B", website: "https://dupb.example", email: "owner@dupb.example" }),
    lead({ lead_id: "phase7d-missing", company_name: "Missing Email", website: "https://missing.example", email: "missing@missing.example" }),
    lead({ lead_id: "phase7d-copy", company_name: "Copy Plumbing", website: "https://copy.example", email: "owner@copy.example" }),
    lead({ lead_id: "phase7d-recent", company_name: "Recent Plumbing", website: "https://recent.example", email: "owner@recent.example" }),
    lead({ lead_id: "phase7d-sender", company_name: "Sender Plumbing", website: "https://sender.example", email: "owner@sender.example" }),
    lead({ lead_id: "phase7d-evidence", company_name: "Evidence Plumbing", website: "https://evidence.example", email: "owner@evidence.example", source_evidence: "" }),
    lead({ lead_id: "phase7d-sent", company_name: "Sent Plumbing", website: "https://sent.example", email: "owner@sent.example" }),
  ];
  const { queue } = await queueFor(records, { now: INSIDE, doNotContact: [] });
  const byLead = new Map(queue.items.map((item) => [item.lead_id, item]));
  byLead.get("phase7d-dnc").raw_action.email.intent.recipient = "owner@dnc.example";
  byLead.get("phase7d-dup-b").raw_action.email.intent.recipient = "owner@duplicate.example";
  byLead.get("phase7d-missing").raw_action.email.intent.recipient = "";
  byLead.get("phase7d-copy").raw_action.email.policy = { ok: false, requires_approval: true, reason: "approval_required" };
  byLead.get("phase7d-recent").last_contact_at = "2026-06-12T12:30:00.000Z";
  byLead.get("phase7d-sender").raw_action.email.intent.sender = "sales@unsafe.example";
  byLead.get("phase7d-evidence").evidence_source_reference = "";
  byLead.get("phase7d-evidence").lead.evidence_source_reference = "";
  byLead.get("phase7d-sent").status = "completed_with_evidence";

  const prep = prepareControlledEmailExecution(queue, {
    now: INSIDE,
    doNotContact: ["owner@dnc.example"],
    approvedSenderDomains: ["ottoserv.com"],
  });
  const reasons = new Set(prep.actions.map((item) => item.block_reason).filter(Boolean));

  assert.equal(reasons.has("recipient_on_dnc"), true);
  assert.equal(reasons.has("duplicate_email"), true);
  assert.equal(reasons.has("missing_email"), true);
  assert.equal(reasons.has("unapproved_copy"), true);
  assert.equal(reasons.has("prior_recent_contact"), true);
  assert.equal(reasons.has("unsafe_sender_config"), true);
  assert.equal(reasons.has("missing_evidence_path"), true);
  assert.equal(reasons.has("already_completed_or_executed"), true);
  assert.equal(prep.summary.live_emails_sent, 0);
});

test("latest.json shows held_until_send_window for controlled email execution", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "phase7d-latest-"));
  const result = await runRevenueDailyLoop({
    now: INSIDE,
    outputDir,
    persistSupabase: false,
    sourceOptions: { cwd: outputDir },
    leadSupplySources: [{ source_type: "manual_imported_leads", records: [lead()] }],
    leadSupplyOptions: { approvalPresent: true, approvedSenders: ["ottoserv.com"] },
    controlledEmailExecutionOptions: { now: OUTSIDE },
  });

  const latest = JSON.parse(await readFile(result.latestPath, "utf8"));
  assert.equal(latest.controlledEmailExecution.summary.held_until_send_window, 1);
  assert.equal(latest.controlledEmailExecution.actions[0].status, "held_until_send_window");
  assert.equal(result.summary.controlled_email_execution.held_until_send_window, 1);
  await rm(outputDir, { recursive: true, force: true });
});

test("nextEligibleSendTime respects weekday outreach window", () => {
  assert.equal(nextEligibleSendTime("2026-06-12T21:00:00.000Z"), "2026-06-15T13:00:00.000Z");
  assert.equal(nextEligibleSendTime("2026-06-13T15:00:00.000Z"), "2026-06-15T13:00:00.000Z");
  assert.equal(nextEligibleSendTime("2026-06-15T12:00:00.000Z"), "2026-06-15T13:00:00.000Z");
});
