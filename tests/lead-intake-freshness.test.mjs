// Priority 1 regression: a fresh accepted lead intake must update the freshness
// signal even when the intent SIGNAL date is older than the import-recency window.
// created_at is the intake/import time; date_of_signal stays the intent date.
// Synthetic/example placeholder leads must NOT become recent high-intent.

import assert from "node:assert/strict";
import test from "node:test";

import { buildLeadPipeline, toRevenueLoopLead } from "../src/lib/leadIntent.mjs";
import { detectRevenueRisks } from "../src/lib/revenueLoopSources.mjs";

const NOW = "2026-06-04T12:00:00.000Z";
const daysAgo = (n) => new Date(Date.parse(NOW) - n * 86_400_000).toISOString();

// A real, evidence-backed B-tier lead whose intent signal is 10 days old (still
// "last_30_days" for intent, but older than the 2-day import-recency window).
function realLead() {
  return {
    business_name: "Bravo Plumbing",
    email: "owner@bravo.example",
    industry: "plumbing",
    intent_type: "operational_pain",
    date_of_signal: daysAgo(10),
    source_url: "https://reddit.com/r/plumbing/abc",
    evidence_snippet: "owner says they keep missing after-hours calls",
    pain_point: "missed after-hours calls",
  };
}

test("intake stamps created_at with the import time, not the signal date", () => {
  const pipeline = buildLeadPipeline([realLead()], { now: NOW, minRecentIntent: 1 });
  const lead = pipeline.revenueLoopLeads[0];
  assert.equal(lead.created_at, NOW, "created_at is the intake time");
  assert.equal(lead.imported_at, NOW);
  assert.equal(lead.date_of_signal, daysAgo(10), "intent signal date is preserved separately");
});

test("a freshly imported lead with an older signal clears the stale-pipeline risk", () => {
  const pipeline = buildLeadPipeline([realLead()], { now: NOW, minRecentIntent: 1 });
  const risks = detectRevenueRisks({ leads: pipeline.revenueLoopLeads, callOutcomes: [], social: [{}], scans: [], now: NOW });
  assert.ok(!risks.some((r) => /No leads imported in the last 2 days/.test(r)), "no false stale-import risk");

  // Sanity: the OLD behavior (created_at = signal date) WOULD have looked stale.
  const oldStyle = { ...pipeline.revenueLoopLeads[0], created_at: daysAgo(10) };
  const staleRisks = detectRevenueRisks({ leads: [oldStyle], callOutcomes: [], social: [{}], scans: [], now: NOW });
  assert.ok(staleRisks.some((r) => /No leads imported in the last 2 days/.test(r)), "old signal-date behavior was the bug");
});

test("placeholder/synthetic signal strings never leak into created_at and never read as recent high-intent", () => {
  const synthetic = {
    business_name: "Example Co",
    phone: "407-555-0142",
    industry: "plumbing",
    intent_type: "explicit_buying_intent",
    date_of_signal: "RECENT_30D", // placeholder, not a real date
    source_url: "https://example.com/x",
    evidence_snippet: "placeholder",
  };
  const pipeline = buildLeadPipeline([synthetic], { now: NOW, minRecentIntent: 1 });
  const lead = pipeline.revenueLoopLeads[0];
  assert.equal(lead.created_at, NOW, "no placeholder string leaks into created_at");
  // Unparseable signal date ⇒ evergreen_fit, never last_30_days high-intent.
  assert.equal(pipeline.summary.high_intent_30d, 0, "placeholder signal is not counted as recent high-intent");
  assert.notEqual(lead.intent.signal_window, "last_30_days");
});

test("toRevenueLoopLead defaults created_at to call time when now is omitted", () => {
  const before = Date.now();
  const lead = toRevenueLoopLead({ business_name: "X", tier: "B-tier", date_of_signal: daysAgo(20), source_urls: [] });
  const stamped = Date.parse(lead.created_at);
  assert.ok(stamped >= before, "created_at is stamped at call time, not the old signal date");
});
