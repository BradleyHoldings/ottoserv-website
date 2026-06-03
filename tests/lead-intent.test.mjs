import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  normalizeEnrichedLead,
  scoreIntentLead,
  tierForIntent,
  dedupeEnrichedLeads,
  buildLeadPipeline,
  toRevenueLoopLead,
  signalWindowFor,
} from "../src/lib/leadIntent.mjs";
import { buildLeadIntentResearchTasks, LEAD_INTENT_SCORING_RULES } from "../src/lib/leadIntentResearchTasks.mjs";

const NOW = "2026-06-03T12:00:00.000Z";
const D = (daysAgo) => new Date(Date.parse(NOW) - daysAgo * 86_400_000).toISOString();

test("signal window is computed from the signal date", () => {
  assert.equal(signalWindowFor(D(5), NOW), "last_30_days");
  assert.equal(signalWindowFor(D(60), NOW), "last_90_days");
  assert.equal(signalWindowFor(D(200), NOW), "evergreen_fit");
  assert.equal(signalWindowFor("", NOW), "evergreen_fit");
});

test("recent explicit intent with evidence + phone scores high and tiers A", () => {
  const lead = normalizeEnrichedLead({
    business_name: "Reliable Flow Plumbing",
    phone: "+1 (407) 555-0142",
    email: "office@reliableflow.com",
    industry: "plumbing",
    date_of_signal: D(10),
    intent_type: "explicit_buying_intent",
    source_url: "https://www.reddit.com/r/smallbusiness/comments/x/",
    evidence_snippet: "We keep missing calls after 5pm.",
    pain_point: "Missed after-hours calls",
  }, { now: NOW });
  assert.equal(lead.signal_window, "last_30_days");
  assert.equal(lead.tier, "A-tier");
  assert.equal(lead.recommended_next_action, "call");
  assert.equal(lead.recommended_offer, "AI Receptionist");
  assert.ok(lead.score >= 70);
});

test("high-intent claim WITHOUT evidence is downgraded and routed to Cowork to verify", () => {
  const scored = scoreIntentLead({
    business_name: "NoProof HVAC",
    phone: "813-555-0100",
    industry: "hvac",
    date_of_signal: D(5),
    intent_type: "explicit_buying_intent",
    // no source_url / evidence_snippet
  }, NOW);
  assert.equal(scored.window, "evergreen_fit", "no evidence → window downgraded");
  const lead = normalizeEnrichedLead({
    business_name: "NoProof HVAC", phone: "813-555-0100", industry: "hvac",
    date_of_signal: D(5), intent_type: "explicit_buying_intent",
  }, { now: NOW });
  assert.notEqual(lead.tier, "A-tier");
  assert.equal(lead.recommended_next_action, "cowork_research");
  assert.match(lead.evidence_required, /evidence/i);
});

test("vendor/no-contact leads are rejected", () => {
  const lead = normalizeEnrichedLead({
    business_name: "Best Leads Marketing Agency",
    industry: "marketing agency vendor",
    intent_type: "other",
    intent_evidence_summary: "agency selling services",
  }, { now: NOW });
  assert.equal(lead.tier, "Reject");
  assert.equal(lead.recommended_next_action, "reject");
});

test("dedupe collapses same phone/website/email", () => {
  const a = normalizeEnrichedLead({ business_name: "A", phone: "407-555-0142", industry: "plumbing", intent_type: "operational_pain", date_of_signal: D(10), source_url: "u", evidence_snippet: "s" }, { now: NOW });
  const b = normalizeEnrichedLead({ business_name: "A dup", phone: "(407) 555-0142", industry: "plumbing", intent_type: "operational_pain", date_of_signal: D(10), source_url: "u", evidence_snippet: "s" }, { now: NOW });
  assert.equal(dedupeEnrichedLeads([a, b]).length, 1);
});

test("pipeline buckets by window, builds queues, and emits a repair packet when recent intent is low", () => {
  const raw = [
    { business_name: "P1 Plumbing", phone: "407-555-0142", industry: "plumbing", intent_type: "explicit_buying_intent", date_of_signal: D(10), source_url: "https://reddit.com/x", evidence_snippet: "missing calls" },
    { business_name: "PM Co", phone: "813-555-0199", email: "leasing@pm.com", industry: "property_management", intent_type: "operational_pain", date_of_signal: D(60), source_url: "https://indeed.com/x", evidence_snippet: "hiring dispatcher" },
    { business_name: "Roofer", phone: "904-555-0123", industry: "roofing", intent_type: "growth_signal" },
    { business_name: "Vendor Agency", industry: "marketing vendor", intent_type: "other", intent_evidence_summary: "agency selling" },
  ];
  const p = buildLeadPipeline(raw, { now: NOW, minRecentIntent: 3 });
  assert.equal(p.summary.high_intent_30d, 1);
  assert.equal(p.summary.medium_intent_90d, 1);
  assert.equal(p.summary.qualified_icp, 1);
  assert.equal(p.summary.rejected, 1);
  assert.equal(p.queues.a_tier_calls.length, 1);
  assert.ok(p.summary.low_recent_intent, "1 < 3 → low");
  assert.ok(p.repairPacket, "repair packet present");
  assert.equal(p.repairPacket.owner, "Cowork");
  // Feeds the revenue loop in NormalizedLead-compatible shape.
  assert.equal(p.revenueLoopLeads.length, 3);
  const a = p.revenueLoopLeads.find((l) => l.tier === "A-tier");
  assert.ok(a.company && a.tier && a.created_at && (a.normalized_phone || a.email));
  assert.ok(a.intent.signal_window);
});

test("revenue-loop lead carries core fields the loop consumes", () => {
  const lead = normalizeEnrichedLead({ business_name: "X", phone: "407-555-0142", industry: "plumbing", intent_type: "explicit_buying_intent", date_of_signal: D(5), source_url: "u", evidence_snippet: "s" }, { now: NOW });
  const rl = toRevenueLoopLead(lead);
  assert.equal(rl.tier, "A-tier");
  assert.equal(rl.status, "ready_to_call");
  assert.equal(rl.suggested_owner, "jarvis");
  assert.ok(rl.normalized_phone);
});

test("Cowork research tasks are generated with queries, evidence rules, and safety limits", () => {
  const res = buildLeadIntentResearchTasks({ now: NOW, icps: ["plumbing", "hvac"], location: "Florida" });
  assert.equal(res.count, 2);
  const task = res.tasks[0];
  assert.equal(task.execution_rail, "cowork");
  assert.ok(task.sources.some((s) => s.source === "reddit_public" && s.queries.length));
  assert.ok(task.forbidden_actions.some((f) => /do not contact/i.test(f)));
  assert.ok(task.evidence_requirements.some((e) => /source url/i.test(e)));
  assert.equal(task.scoring_rules.evidence_rule, LEAD_INTENT_SCORING_RULES.evidence_rule);
});

test("committed example fixture parses and runs through the pipeline", () => {
  const fixture = JSON.parse(readFileSync(new URL("../data/lead-intent/examples/research-results.example.json", import.meta.url), "utf8"));
  const p = buildLeadPipeline(fixture, { now: NOW, minRecentIntent: 3 });
  assert.ok(p.summary.accepted >= 3);
  assert.ok(p.summary.rejected >= 1);
  assert.equal(typeof p.summary.high_intent_30d, "number");
});
