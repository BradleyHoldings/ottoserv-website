import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  classifyPublicLeadReadiness,
  getPublicLeadDiscoverySourceRegistry,
  runPublicLeadDiscovery,
} from "../src/lib/publicLeadDiscovery.mjs";
import { persistLeadSupplyExecution } from "../src/lib/leadSupplyExecutionPersistence.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import { readAutonomousRevenueState } from "../src/lib/revenueEngineReadAdapter.mjs";

const NOW = "2026-06-12T14:00:00.000Z";

function candidate(overrides = {}) {
  return {
    source_type: "google_business_profile_candidates",
    company_name: "Orlando Flow Plumbing",
    website: "https://orlandoflow.example",
    phone: "(407) 555-0199",
    email: "office@orlandoflow.example",
    city: "Orlando",
    state: "FL",
    niche: "plumbing",
    public_signal: "Reviews mention no one answers after hours and no callback.",
    source_url: "https://maps.example/orlando-flow",
    evidence_snippet: "Customer review: no one answers after hours.",
    ...overrides,
  };
}

test("public discovery source registry covers controlled public source adapters", () => {
  const keys = getPublicLeadDiscoverySourceRegistry().sources.map((source) => source.source_type);

  assert.ok(keys.includes("google_business_profile_candidates"));
  assert.ok(keys.includes("business_website_candidates"));
  assert.ok(keys.includes("local_directory_candidates"));
  assert.ok(keys.includes("chamber_member_directory_candidates"));
  assert.ok(keys.includes("trade_association_directory_candidates"));
  assert.ok(keys.includes("public_review_signal_candidates"));
  assert.ok(keys.includes("public_hiring_signal_candidates"));
  assert.ok(keys.includes("public_social_forum_intent_candidates"));
  assert.ok(keys.includes("cowork_manual_research_candidates"));
});

test("ICP and geography classification targets Florida trades and property managers", () => {
  const discovery = runPublicLeadDiscovery({
    sources: [{ source_type: "google_business_profile_candidates", records: [
      candidate(),
      candidate({ lead_id: "miami-hvac", company_name: "Miami Air Pros", website: "https://miamiair.example", email: "ops@miamiair.example", phone: "(305) 555-0198", city: "Miami", niche: "HVAC", public_signal: "Hiring office admin to handle calls." }),
      candidate({ lead_id: "seattle-saas", company_name: "Seattle SaaS", website: "https://seattlesaas.example", email: "hello@seattlesaas.example", phone: "(206) 555-0198", city: "Seattle", state: "WA", niche: "software", public_signal: "Generic software company." }),
    ] }],
    now: NOW,
  });

  const florida = discovery.candidates.filter((lead) => lead.state === "FL");
  assert.equal(florida.length, 2);
  assert.equal(discovery.summary.qualified_count, 2);
  assert.equal(discovery.blocked_records.some((record) => record.reason === "outside_initial_icp_or_geography"), true);
});

test("pain and intent signals classify buying stage, readiness, offer, confidence, and contactability", () => {
  const discovery = runPublicLeadDiscovery({
    sources: [{ source_type: "public_review_signal_candidates", records: [
      candidate({ public_signal: "Customers complain no callback and estimate follow-up is slow.", evidence_snippet: "No callback after estimate request." }),
      candidate({ lead_id: "active-ai", company_name: "Tampa Roof AI Search", website: "https://tamparoof.example", email: "owner@tamparoof.example", phone: "(813) 555-0198", city: "Tampa", niche: "roofing", public_signal: "Owner asked about AI receptionist and CRM scheduling automation.", evidence_snippet: "Asked about AI receptionist." }),
    ] }],
    now: NOW,
  });

  const estimate = discovery.candidates.find((lead) => lead.lead_id.includes("orlando-flow"));
  const active = discovery.candidates.find((lead) => lead.lead_id === "active-ai");

  assert.ok(estimate.pain_intent_signals.includes("slow_follow_up_complaint"));
  assert.equal(estimate.buying_stage, "problem_aware");
  assert.equal(estimate.matched_offer.service_key, "estimate_follow_up_automation");
  assert.equal(estimate.contactability, "email_and_phone_public");
  assert.equal(active.buying_stage, "solution_aware");
  assert.equal(active.readiness_state, "active_intent");
  assert.equal(active.matched_offer.service_key, "ai_receptionist");
  assert.equal(active.confidence_score >= 80, true);
});

test("dedupe blocks company, domain, email, phone, aliases, DNC, and recent contact", () => {
  const discovery = runPublicLeadDiscovery({
    sources: [{ source_type: "local_directory_candidates", records: [
      candidate({ lead_id: "canon", company_name: "Canonical Plumbing", website: "https://canonical.example", email: "owner@canonical.example", phone: "(407) 555-0101" }),
      candidate({ lead_id: "dup-company", company_name: "Canonical Plumbing LLC", website: "https://other1.example", email: "other1@other1.example", phone: "(407) 555-0102" }),
      candidate({ lead_id: "dup-domain", company_name: "Domain HVAC", website: "https://canonical.example/services", email: "domain@domain.example", phone: "(407) 555-0103" }),
      candidate({ lead_id: "dup-email", company_name: "Email Electric", website: "https://email.example", email: "owner@canonical.example", phone: "(407) 555-0104" }),
      candidate({ lead_id: "dup-phone", company_name: "Phone Roofing", website: "https://phone.example", email: "owner@phone.example", phone: "(407) 555-0101" }),
      candidate({ lead_id: "alias", company_name: "Alias Remodeler", website: "https://alias.example", email: "owner@alias.example", phone: "(407) 555-0105" }),
      candidate({ lead_id: "dnc", company_name: "DNC Plumbing", website: "https://dnc.example", email: "owner@dnc.example", phone: "(407) 555-0106" }),
      candidate({ lead_id: "recent", company_name: "Recent HVAC", website: "https://recent.example", email: "owner@recent.example", phone: "(407) 555-0107" }),
    ] }],
    existingAliases: ["domain:alias.example"],
    doNotContact: ["dnc.example"],
    recentContactHistory: [{ email: "owner@recent.example", last_contact_at: "2026-06-11T16:00:00.000Z" }],
    now: NOW,
  });
  const reasons = discovery.blocked_records.map((record) => record.reason);

  assert.equal(discovery.candidates.length, 1);
  assert.ok(reasons.includes("duplicate_company"));
  assert.ok(reasons.includes("duplicate_domain"));
  assert.ok(reasons.includes("duplicate_email"));
  assert.ok(reasons.includes("duplicate_phone"));
  assert.ok(reasons.includes("existing_alias_match"));
  assert.ok(reasons.includes("do_not_contact"));
  assert.ok(reasons.includes("recent_contact_history"));
});

test("readiness supports enrichment, manual review, and Cowork research packets", () => {
  assert.equal(classifyPublicLeadReadiness(candidate({ email: "", phone: "" })).readiness_state, "needs_enrichment");
  assert.equal(classifyPublicLeadReadiness(candidate({ source_url: "", evidence_snippet: "", public_signal: "" })).readiness_state, "manual_review");

  const discovery = runPublicLeadDiscovery({
    sources: [{ source_type: "cowork_manual_research_candidates", records: [
      candidate({ lead_id: "needs-research", company_name: "Brevard Property Managers", website: "https://brevardpm.example", email: "", phone: "", city: "Melbourne", niche: "property management" }),
    ] }],
    now: NOW,
  });

  assert.equal(discovery.summary.needs_enrichment_count, 1);
  assert.equal(discovery.cowork_packets.length, 1);
  assert.equal(discovery.cowork_packets[0].assigned_agent, "Cowork");
  assert.ok(discovery.cowork_packets[0].forbidden_actions.includes("No outreach"));
});

test("public discovery hands qualified leads to durable queue without outreach", async () => {
  const discovery = runPublicLeadDiscovery({
    sources: [{ source_type: "google_business_profile_candidates", records: [candidate()] }],
    now: NOW,
  });
  const persisted = await persistLeadSupplyExecution(discovery.leadSupplyReport, { now: NOW });

  assert.equal(persisted.queue.summary.total_actions, 1);
  assert.equal(persisted.queue.summary.email_intents, 1);
  assert.equal(discovery.safety.no_live_email_sent, true);
  assert.equal(discovery.safety.no_live_call_placed, true);
});

test("latest.json exports publicLeadDiscovery and read adapter exposes it", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "phase7e-latest-"));
  const result = await runRevenueDailyLoop({
    now: NOW,
    outputDir,
    persistSupabase: false,
    sourceOptions: { cwd: outputDir },
    publicLeadDiscoverySources: [{ source_type: "google_business_profile_candidates", records: [
      candidate(),
      candidate({ lead_id: "research-gap", company_name: "Cocoa Remodelers", website: "https://cocoaremodel.example", email: "", phone: "", city: "Cocoa", niche: "remodeling" }),
    ] }],
    leadSupplyOptions: { approvalPresent: true, approvedSenders: ["ottoserv.com"] },
  });
  const latest = JSON.parse(await readFile(result.latestPath, "utf8"));
  const readState = await readAutonomousRevenueState({ dataDir: outputDir });

  assert.equal(latest.publicLeadDiscovery.summary.discovered_count, 2);
  assert.equal(latest.publicLeadDiscovery.summary.qualified_count, 2);
  assert.equal(latest.publicLeadDiscovery.summary.cowork_packets_created, 1);
  assert.equal(latest.durableRevenueExecutionQueue.summary.total_actions, 2);
  assert.equal(readState.publicLeadDiscovery.summary.discovered_count, 2);
  assert.equal(result.summary.public_lead_discovery.discovered_count, 2);

  await rm(outputDir, { recursive: true, force: true });
});
