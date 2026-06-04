import assert from "node:assert/strict";
import test from "node:test";

import { validateResearchResults, RESEARCH_RESULTS_CONTRACT, EVIDENCE_REQUIRED_INTENT_TYPES } from "../src/lib/leadResearchContract.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";

const NOW = "2026-06-04T12:00:00.000Z";

// A fully-evidenced recent-intent lead that should pass the contract.
function goodLead(overrides = {}) {
  return {
    business_name: "Reliable Flow Plumbing",
    phone: "+1 (407) 555-0142",
    email: "office@reliableflow.example.com",
    website: "https://reliableflow.example.com",
    location: "Orlando, FL",
    industry: "plumbing",
    intent_type: "explicit_buying_intent",
    source_url: "https://www.reddit.com/r/smallbusiness/comments/example1/",
    evidence_snippet: "\"We keep missing calls after 5pm and losing jobs.\"",
    date_of_signal: "RECENT_30D",
    signal_window: "last_30_days",
    pain_point: "Missed after-hours calls.",
    ...overrides,
  };
}

test("contract exposes required fields, evidence rule, and apply command", () => {
  assert.equal(RESEARCH_RESULTS_CONTRACT.apply_command, "npm run lead:intake");
  assert.ok(RESEARCH_RESULTS_CONTRACT.required_fields.length >= 3);
  assert.ok(/source_url/.test(RESEARCH_RESULTS_CONTRACT.evidence_rule));
  assert.ok(EVIDENCE_REQUIRED_INTENT_TYPES.includes("missed_call_or_response_issue"));
});

test("well-formed evidenced research → ready_for_intake true, no blocking", () => {
  const res = validateResearchResults([goodLead()], { now: NOW });
  assert.equal(res.ready_for_intake, true);
  assert.deepEqual(res.blocking, []);
  assert.ok(res.summary.accepted >= 1);
  assert.ok(/run `npm run lead:intake`/.test(res.next_step));
});

test("malformed / empty input → not ready, with a clear blocking reason", () => {
  const empty = validateResearchResults(null, { now: NOW });
  assert.equal(empty.ready_for_intake, false);
  assert.ok(empty.blocking.some((b) => /no usable lead rows/i.test(b)));

  const parseErr = validateResearchResults(null, { now: NOW, parseError: "Unexpected token } in JSON" });
  assert.ok(parseErr.blocking.some((b) => /invalid json/i.test(b)));
});

test("high-intent claim without evidence → needs_verification with actionable fixes", () => {
  const noEvidence = goodLead({ source_url: "", evidence_snippet: "", date_of_signal: "" });
  const res = validateResearchResults([noEvidence], { now: NOW });
  assert.equal(res.ready_for_intake, false);
  const row = res.needs_verification_rows[0];
  assert.ok(row);
  assert.ok(row.fixes.some((f) => /source_url|evidence|snippet/i.test(f)));
});

test("accepts the { leads: [...] } wrapper shape Cowork may return", () => {
  const res = validateResearchResults({ leads: [goodLead()] }, { now: NOW });
  assert.equal(res.ready_for_intake, true);
});

test("minAccepted gate: requires enough accepted leads", () => {
  const res = validateResearchResults([goodLead()], { now: NOW, minAccepted: 3 });
  assert.equal(res.ready_for_intake, false);
  assert.ok(res.blocking.some((b) => /need >= 3/.test(b)));
});

test("selector's dispatch_lead_research now carries an actor-ready Cowork packet + contract", () => {
  const res = selectNextActions({ leads: [], now: NOW });
  const a = res.actions.find((x) => x.action_type === "dispatch_lead_research");
  assert.ok(a, "expected dispatch_lead_research action");
  const p = a.suggested_prompt_or_packet;
  assert.equal(p.kind, "cowork_research");
  assert.equal(p.run, "npm run lead:intake");
  assert.equal(p.generate_full_packet, "npm run lead:research");
  assert.ok(Array.isArray(p.icp_briefs) && p.icp_briefs.length >= 1);
  assert.ok(p.icp_briefs[0].top_queries.length >= 1);
  assert.ok(p.contract.evidence_rule && p.contract.required_fields.length >= 3);
});
