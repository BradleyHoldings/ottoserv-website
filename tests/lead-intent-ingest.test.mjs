import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { coerceResearchRows, ingestResearchResults } from "../src/lib/leadIntentIngest.mjs";

const NOW = "2026-06-03T12:00:00.000Z";
const D = (daysAgo) => new Date(Date.parse(NOW) - daysAgo * 86_400_000).toISOString();

test("coerce accepts arrays, wrapper objects, and single objects", () => {
  assert.equal(coerceResearchRows([{ business_name: "A" }]).shape, "array");
  assert.equal(coerceResearchRows({ leads: [{ business_name: "A" }] }).shape, "object.leads");
  assert.equal(coerceResearchRows({ results: [{ business_name: "A" }] }).shape, "object.results");
  assert.equal(coerceResearchRows({ business_name: "Solo Plumbing" }).shape, "single_object");
  assert.deepEqual(coerceResearchRows({ business_name: "Solo Plumbing" }).rows.length, 1);
});

test("coerce is safe on malformed / empty input and filters non-objects", () => {
  assert.equal(coerceResearchRows(null).shape, "empty");
  assert.equal(coerceResearchRows("nope").shape, "invalid");
  assert.equal(coerceResearchRows({ random: true }).shape, "object_unrecognized");
  const res = coerceResearchRows([{ business_name: "A" }, 5, "x", null]);
  assert.equal(res.rows.length, 1);
  assert.equal(res.skipped_non_objects, 3);
});

test("accepted A-tier lead is reported accepted with its window + next action", () => {
  const report = ingestResearchResults(
    [{
      business_name: "Reliable Flow Plumbing",
      phone: "+1 (407) 555-0142",
      industry: "plumbing",
      date_of_signal: D(10),
      intent_type: "explicit_buying_intent",
      source_url: "https://www.reddit.com/r/smallbusiness/comments/x/",
      evidence_snippet: "We keep missing calls after 5pm.",
    }],
    { now: NOW },
  );
  assert.equal(report.summary.accepted, 1);
  assert.equal(report.summary.usable_input, true);
  const row = report.rows[0];
  assert.equal(row.ingest_status, "accepted");
  assert.equal(row.tier, "A-tier");
  assert.equal(row.signal_window, "last_30_days");
  assert.equal(row.recommended_next_action, "call");
});

test("high-intent claim without evidence is flagged needs_verification with a fix", () => {
  const report = ingestResearchResults(
    [{
      business_name: "NoProof HVAC",
      phone: "813-555-0100",
      industry: "hvac",
      date_of_signal: D(5),
      intent_type: "explicit_buying_intent",
      // no source_url / evidence_snippet
    }],
    { now: NOW },
  );
  assert.equal(report.summary.needs_verification, 1);
  const row = report.rows[0];
  assert.equal(row.ingest_status, "needs_verification");
  assert.equal(row.has_evidence, false);
  assert.equal(row.signal_window, "evergreen_fit");
  assert.ok(row.fixes.some((f) => /source_url|snippet|date_of_signal/i.test(f)));
});

test("vendor / no-contact lead is reported rejected with reasons", () => {
  const report = ingestResearchResults(
    [{ business_name: "Best Leads Marketing Agency", industry: "marketing agency vendor", intent_type: "other", intent_evidence_summary: "agency selling services" }],
    { now: NOW },
  );
  assert.equal(report.summary.rejected, 1);
  assert.equal(report.rows[0].ingest_status, "rejected");
  assert.ok(report.rows[0].reasons.length >= 1);
  assert.ok(report.rows[0].fixes.length >= 1);
});

test("duplicates are counted as collapsed", () => {
  const dup = { business_name: "A", phone: "407-555-0142", industry: "plumbing", intent_type: "operational_pain", date_of_signal: D(10), source_url: "u", evidence_snippet: "s" };
  const report = ingestResearchResults([dup, { ...dup, business_name: "A dup" }], { now: NOW });
  assert.equal(report.summary.total_rows, 2);
  assert.equal(report.summary.duplicates_collapsed, 1);
});

test("malformed input surfaces parse_error and stays usable_input=false", () => {
  const report = ingestResearchResults(null, { now: NOW, parseError: "research-results.json is not valid JSON: Unexpected token" });
  assert.equal(report.summary.usable_input, false);
  assert.equal(report.summary.total_rows, 0);
  assert.match(report.parse_error, /not valid JSON/);
  assert.equal(report.input_shape, "empty");
});

test("committed example fixture ingests with accepted + rejected + verification rows", () => {
  const fixture = JSON.parse(readFileSync(new URL("../data/lead-intent/examples/research-results.example.json", import.meta.url), "utf8"));
  const report = ingestResearchResults(fixture, { now: NOW });
  assert.equal(report.input_shape, "array");
  assert.ok(report.summary.total_rows >= 5);
  assert.ok(report.summary.accepted >= 1);
  assert.ok(report.summary.rejected >= 1);
  // every row carries a status and at least one reason
  assert.ok(report.rows.every((r) => r.ingest_status && r.reasons.length >= 1));
});
