import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  classifyBuyingStage,
  classifyLeadReadiness,
  detectPainIntentSignals,
  getLeadSourceRegistry,
  ingestLeadSources,
  matchOttoServOffer,
  runLeadSupplyDailyLoop,
  selectDailyLeadAction,
} from "../src/lib/leadSupplyDailyLoop.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";

const NOW = "2026-06-12T14:00:00.000Z";

function lead(overrides = {}) {
  return {
    lead_id: "lead-alpha",
    company_name: "Alpha Plumbing",
    contact_name: "Alex Owner",
    website: "https://alphaplumbing.example",
    email: "alex@alphaplumbing.example",
    normalized_phone: "+14075550123",
    phone_verified: true,
    city: "Orlando",
    state: "FL",
    industry: "plumbing",
    niche: "plumbing",
    source_type: "manual_import",
    source_evidence: "Manual import from approved list.",
    pain_notes: "",
    score: 82,
    tier: "A-tier",
    eligibility: "email_eligible",
    record_status: "accepted",
    pipeline_stage: "contact_ready",
    version: 1,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

test("source registry supports required Phase 7A lead source types", () => {
  const registry = getLeadSourceRegistry();
  const keys = registry.sources.map((source) => source.source_type);

  assert.ok(keys.includes("existing_ottoserv_lead_records"));
  assert.ok(keys.includes("manual_imported_leads"));
  assert.ok(keys.includes("front_office_leak_check_submissions"));
  assert.ok(keys.includes("full_process_audit_submissions"));
  assert.ok(keys.includes("website_demo_contact_form_submissions"));
  assert.ok(keys.includes("prior_outreach_reply_records"));
  assert.ok(keys.includes("public_business_discovery_queue"));
  assert.ok(keys.includes("public_pain_intent_signal_queue"));
  assert.ok(keys.includes("cowork_browser_research_queue"));
});

test("source ingestion supports existing and manual/imported leads", () => {
  const result = ingestLeadSources([
    { source_type: "existing_ottoserv_lead_records", records: [lead({ lead_id: "existing-1" })] },
    { source_type: "manual_imported_leads", records: [lead({ lead_id: "manual-1", company_name: "Manual HVAC", website: "https://manualhvac.example", email: "owner@manualhvac.example", normalized_phone: "+14075550124" })] },
  ], { now: NOW });

  assert.equal(result.leads.length, 2);
  assert.equal(result.summary.by_source.existing_ottoserv_lead_records, 1);
  assert.equal(result.summary.by_source.manual_imported_leads, 1);
});

test("dedupe prevents duplicate company, domain, email, and phone outreach", () => {
  const result = ingestLeadSources([
    {
      source_type: "manual_imported_leads",
      records: [
        lead({ lead_id: "a", company_name: "Alpha Plumbing" }),
        lead({ lead_id: "b", company_name: "Alpha Plumbing LLC", website: "https://alphaplumbing.example/services", email: "other@alphaplumbing.example" }),
        lead({ lead_id: "c", company_name: "Different", website: "https://different.example", email: "alex@alphaplumbing.example" }),
        lead({ lead_id: "d", company_name: "Other", website: "https://other.example", email: "other@example.com", normalized_phone: "+14075550123" }),
      ],
    },
  ], { now: NOW });

  assert.equal(result.leads.length, 1);
  assert.equal(result.summary.duplicates_blocked, 3);
  assert.deepEqual(result.contact_safety.duplicate_conflicts.map((item) => item.reason), [
    "duplicate_domain",
    "duplicate_email",
    "duplicate_phone",
  ]);
});

test("do-not-contact records are skipped", () => {
  const result = ingestLeadSources([{ source_type: "manual_imported_leads", records: [lead()] }], {
    now: NOW,
    doNotContact: ["alphaplumbing.example", "alex@alphaplumbing.example"],
  });

  assert.equal(result.leads.length, 0);
  assert.equal(result.contact_safety.do_not_contact_skipped, 1);
});

test("enrichment-needed classification and ICP qualification are deterministic", () => {
  const needs = classifyLeadReadiness(lead({ email: "", normalized_phone: "", phone_verified: false }));
  const qualified = classifyLeadReadiness(lead());

  assert.equal(needs.readiness, "needs_enrichment");
  assert.ok(needs.enrichment_needed.includes("email"));
  assert.equal(qualified.readiness, "contact_ready");
  assert.equal(qualified.icp_fit, "qualified_fit");
});

test("buying-stage classification covers submitted intent, replies, and customers", () => {
  assert.equal(classifyBuyingStage(lead({ pain_notes: "Reviews mention no callback." })).stage, "problem_aware");
  assert.equal(classifyBuyingStage(lead({ source_type: "front_office_leak_check_submissions" })).stage, "ready_to_buy");
  assert.equal(classifyBuyingStage(lead({ reply_state: "positive_interest" })).stage, "ready_to_buy");
  assert.equal(classifyBuyingStage(lead({ pipeline_stage: "won_onboarding_needed" })).stage, "customer");
});

test("pain and intent signals classify from evidence", () => {
  const signals = detectPainIntentSignals(lead({
    pain_notes: "Reviews say no one answers, callback was slow, and scheduling is broken.",
  }));

  assert.ok(signals.signals.includes("missed_call_complaint"));
  assert.ok(signals.signals.includes("slow_follow_up_complaint"));
  assert.ok(signals.signals.includes("scheduling_bottleneck"));
});

test("offer matching selects OttoServ services from signals", () => {
  assert.equal(matchOttoServOffer(lead({ pain_notes: "bad reviews mention no answer" })).service_key, "missed_call_recovery");
  assert.equal(matchOttoServOffer(lead({ source_type: "full_process_audit_submissions" })).service_key, "full_process_audit");
  assert.equal(matchOttoServOffer(lead({ pain_notes: "estimate follow-up is slow" })).service_key, "estimate_follow_up_automation");
});

test("daily next-action selection queues approved email through existing policy", () => {
  const action = selectDailyLeadAction(lead({ tier: "B-tier", normalized_phone: "", phone_verified: false }), {
    now: NOW,
    approvalPresent: true,
    approvedSenders: ["ottoserv.com"],
  });

  assert.equal(action.next_action, "approved_cold_email");
  assert.equal(action.email.policy.ok, true);
  assert.equal(action.email.intent.state, "proposed");
});

test("call action queues only when existing call policy passes and blocks otherwise", () => {
  const queued = selectDailyLeadAction(lead(), { now: NOW, approvalPresent: true, localHour: 14 });
  const blocked = selectDailyLeadAction(lead({ normalized_phone: "", phone_verified: false }), { now: NOW, approvalPresent: true });

  assert.equal(queued.next_action, "policy_approved_call_queued");
  assert.equal(queued.call.policy.ok, true);
  assert.equal(blocked.next_action, "approved_cold_email");
});

test("approval cards, Cowork packets, and Codex/Claude packets are generated", () => {
  const report = runLeadSupplyDailyLoop({
    sources: [{ source_type: "manual_imported_leads", records: [
      lead({ lead_id: "needs-approval", company_name: "Approval HVAC", website: "https://approvalhvac.example", email: "owner@approvalhvac.example", normalized_phone: "+14075550131", requested_action: "launch new outbound campaign" }),
      lead({ lead_id: "research", company_name: "Research Roofing", email: "", normalized_phone: "", phone_verified: false, website: "https://research.example", source_evidence: "public website" }),
      lead({ lead_id: "repair", company_name: "Repair Electric", website: "https://repairelectric.example", email: "owner@repairelectric.example", normalized_phone: "+14075550132", pipeline_stage: "stuck_needs_build", notes: "missing automation workflow build" }),
    ] }],
    now: NOW,
    approvals: { approvalPresent: false },
  });

  assert.ok(report.approval_cards.length >= 1);
  assert.ok(report.cowork_packets.some((packet) => packet.packet_type === "browser_research"));
  assert.ok(report.codex_packets.some((packet) => packet.packet_type === "build_or_repair"));
});

test("stalled task repair detects stale enrichment, call, approval, and duplicate conflicts", () => {
  const report = runLeadSupplyDailyLoop({
    sources: [{ source_type: "manual_imported_leads", records: [
      lead({ lead_id: "stale-enrich", company_name: "Stale Enrich Plumbing", website: "https://staleenrich.example", email: "", normalized_phone: "", phone_verified: false, enrichment_status: "needs_enrichment", updated_at: "2026-06-01T00:00:00.000Z" }),
      lead({ lead_id: "stale-follow", company_name: "Stale Follow HVAC", website: "https://stalefollow.example", email: "owner@stalefollow.example", normalized_phone: "+14075550141", pipeline_stage: "follow_up_due", last_contact_at: "2026-06-01T00:00:00.000Z" }),
      lead({ lead_id: "dup-a" }),
      lead({ lead_id: "dup-b", email: "alex@alphaplumbing.example" }),
    ] }],
    existingTasks: [
      { task_id: "appr-old", task_type: "approval", status: "pending", created_at: "2026-06-01T00:00:00.000Z" },
      { task_id: "cowork-old", task_type: "cowork", status: "queued", created_at: "2026-06-01T00:00:00.000Z" },
      { task_id: "codex-old", task_type: "codex", status: "queued", created_at: "2026-06-01T00:00:00.000Z" },
    ],
    failures: [{ channel: "phone_call_retell_morgan", actual_behavior: "call failed" }],
    now: NOW,
  });

  const classes = report.repairs_created.map((repair) => repair.failure_class);
  assert.ok(classes.includes("lead_stuck_in_needs_enrichment"));
  assert.ok(classes.includes("stale_follow_up"));
  assert.ok(classes.includes("approval_waiting_too_long"));
  assert.ok(classes.includes("cowork_packet_stale"));
  assert.ok(classes.includes("codex_packet_stale"));
  assert.ok(classes.includes("call_failed"));
  assert.ok(classes.includes("duplicate_conflict"));
});

test("latest.json exports leadSupplyDailyLoop report", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "phase7a-latest-"));
  const result = await runRevenueDailyLoop({
    now: NOW,
    outputDir,
    persistSupabase: false,
    sourceOptions: { cwd: outputDir },
    leadSupplySources: [{ source_type: "manual_imported_leads", records: [lead({ tier: "B-tier", normalized_phone: "", phone_verified: false })] }],
    leadSupplyOptions: { approvalPresent: true, approvedSenders: ["ottoserv.com"] },
  });

  const latest = JSON.parse(await readFile(result.latestPath, "utf8"));
  assert.equal(latest.leadSupplyDailyLoop.summary.leads_sourced, 1);
  assert.equal(latest.leadSupplyDailyLoop.summary.actions_selected, 1);
  assert.equal(latest.leadSupplyDailyLoop.summary.emails_queued, 1);
  assert.ok(latest.leadSupplyDailyLoop.next_operator_action);

  await rm(outputDir, { recursive: true, force: true });
});
