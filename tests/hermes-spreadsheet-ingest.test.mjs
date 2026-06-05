// Sprint priorities 2 + 5: spreadsheet seed-lead ingest + controlled pilot, and
// duplicate-revalidation freshness. All synthetic example.com data (no real leads).

import assert from "node:assert/strict";
import test from "node:test";

import { rowToResearchLead, ingestSpreadsheetRows, selectControlledPilot } from "../src/lib/leadSpreadsheetIngest.mjs";
import { buildLeadPipeline, dedupeEnrichedLeads, normalizeEnrichedLead } from "../src/lib/leadIntent.mjs";

const NOW = "2026-06-04T15:00:00.000Z";

// Header-shaped rows mirroring the real spreadsheet columns (synthetic values).
function row(over = {}) {
  return {
    "Website/Domain": "https://www.demohvac.example",
    "Contact Name": "Pat Owner",
    "Company": "Demo HVAC",
    "Role": "Owner",
    "Opportunity Type": "HVAC dispatcher / missed calls",
    "Project/Pain Details": "Hiring a dispatcher; missing after-hours calls",
    "Source Platform": "Job posting",
    "Posted Date": "2026-05-20",
    "Suggested OttoServ Angle": "AI receptionist for after-hours capture",
    "Priority": "High",
    "Source URL": "https://example.com/job/demo-hvac",
    "Decision-Maker Proof URL": "https://example.com/in/pat-owner",
    "Verification Status": "Verified signal + decision-maker",
    ...over,
  };
}

test("a blank padding row is ignored", () => {
  const { lead } = rowToResearchLead({ "Website/Domain": "None", "Company": "None" });
  assert.equal(lead, null);
});

test("a real signal row maps to a research lead with ICP fit + public evidence", () => {
  const { lead, icp_fit } = rowToResearchLead(row());
  assert.equal(lead.business_name, "Demo HVAC");
  assert.equal(icp_fit, true, "HVAC is ICP");
  assert.ok(lead.source_url.includes("example.com"));
  assert.equal(lead.email, "", "no contact path in this row → not contactable yet");
});

test("contact path is detected from anywhere in the row", () => {
  const withEmail = rowToResearchLead(row({ Notes: "reach pat at owner@demohvac.example" }));
  assert.equal(withEmail.lead.email, "owner@demohvac.example");
  const withPhone = rowToResearchLead(row({ Notes: "office line (407) 555-0199" }));
  assert.ok(withPhone.lead.phone.includes("555"));
});

test("SAFETY: numbers embedded in URLs are NOT treated as a dialable phone", () => {
  // Real spreadsheet failure mode: a BBB/LinkedIn profile or job ID inside a URL
  // looks like a 10-digit number. It must never become a contact path.
  const r1 = rowToResearchLead(row({ "Decision-Maker Proof URL": "https://www.bbb.org/us/az/profile/1126-1000023", Notes: "" }));
  assert.equal(r1.lead.phone, "", "URL profile-id is not a phone");
  const r2 = rowToResearchLead(row({ "Source URL": "https://www.linkedin.com/jobs/view/csr-at-acme-4409749089", Notes: "" }));
  assert.equal(r2.lead.phone, "", "URL job-id is not a phone");
  // A properly formatted phone in a free-text field IS accepted.
  const r3 = rowToResearchLead(row({ Notes: "best line: (407) 555-0142" }));
  assert.ok(r3.lead.phone.includes("555"));
});

test("ingest validates, dedupes, and classifies eligibility", () => {
  const rows = [
    row(), // no contact path → needs enrichment
    row({ "Company": "Echo Plumbing", "Website/Domain": "https://echoplumbing.example", Notes: "owner@echoplumbing.example" }), // email-eligible
    row({ "Company": "Foxtrot Electric", "Website/Domain": "https://foxtrotelectric.example", Notes: "call (305) 555-0123" }), // call-eligible
    row({ "Company": "Demo HVAC", "Website/Domain": "https://www.demohvac.example" }), // duplicate domain of row 1
    row({ "Company": "Acme Bakery", "Website/Domain": "https://acmebakery.example", "Opportunity Type": "retail bakery", "Project/Pain Details": "cupcakes", "Suggested OttoServ Angle": "", Notes: "hi@acmebakery.example" }), // not ICP
  ];
  const res = ingestSpreadsheetRows(rows, { now: NOW });
  assert.equal(res.summary.duplicates, 1, "demohvac domain deduped");
  assert.equal(res.summary.email_eligible, 1, "only Echo is email-eligible");
  assert.equal(res.summary.call_eligible, 1, "only Foxtrot is call-eligible");
  assert.ok(res.summary.needs_enrichment >= 1, "the no-contact ICP lead is queued for enrichment");
  const bakery = res.leads.find((l) => l.business_name === "Acme Bakery");
  assert.equal(bakery.eligibility.icp_fit, false, "non-ICP excluded from eligibility");
  assert.equal(bakery.eligibility.email_eligible, false);
});

test("controlled pilot honors caps and one-channel-per-lead", () => {
  const rows = [
    row({ "Company": "Echo Plumbing", "Website/Domain": "https://echoplumbing.example", Notes: "owner@echoplumbing.example and call (407) 555-0150" }),
    row({ "Company": "Golf HVAC", "Website/Domain": "https://golfhvac.example", Notes: "call (407) 555-0160" }),
  ];
  const ingest = ingestSpreadsheetRows(rows, { now: NOW });
  const pilot = selectControlledPilot(ingest, { emailCap: 1, callCap: 1 });
  assert.equal(pilot.email_pilot.length, 1);
  assert.equal(pilot.call_pilot.length, 1);
  // Echo (email) must NOT also be the call pilot — one channel per lead.
  const echoInBoth = pilot.email_pilot.some((l) => l.business_name === "Echo Plumbing") && pilot.call_pilot.some((l) => l.business_name === "Echo Plumbing");
  assert.equal(echoInBoth, false, "no simultaneous dual-channel to one lead");
  assert.equal(pilot.call_pilot[0].business_name, "Golf HVAC");
});

test("a never-contactable spreadsheet (no contact paths) yields zero pilot, all enrichment", () => {
  const rows = [row(), row({ "Company": "Hotel HVAC", "Website/Domain": "https://hotelhvac.example" })];
  const ingest = ingestSpreadsheetRows(rows, { now: NOW });
  const pilot = selectControlledPilot(ingest, { emailCap: 5, callCap: 5 });
  assert.equal(pilot.email_pilot.length, 0);
  assert.equal(pilot.call_pilot.length, 0);
  assert.ok(pilot.enrichment_queue.length >= 2, "all ICP leads without contact go to enrichment, not outreach");
});

// ── Freshness / duplicate revalidation (priority 5) ──
test("duplicate revalidation updates last_seen_at without weakening evidence rules", () => {
  const evidenced = { business_name: "Echo Plumbing", email: "owner@echoplumbing.example", source_url: "https://example.com/e", evidence_snippet: "missed calls", date_of_signal: NOW, intent_type: "operational_pain" };
  const a = normalizeEnrichedLead(evidenced, { now: "2026-06-01T00:00:00.000Z" });
  const b = normalizeEnrichedLead(evidenced, { now: NOW }); // same lead, seen again later
  const deduped = dedupeEnrichedLeads([a, b], { now: NOW });
  assert.equal(deduped.length, 1, "duplicate collapsed");
  assert.equal(deduped.revalidated_count, 1);
  assert.equal(deduped[0].last_seen_at, NOW, "kept lead's last_seen_at refreshed");
  assert.ok(deduped[0].last_validated_at, "evidence-backed dup keeps validation");
});

test("revenue-loop lead carries last_seen_at / last_validated_at / last_intake_at", () => {
  const pipeline = buildLeadPipeline([
    { business_name: "Echo Plumbing", email: "owner@echoplumbing.example", source_url: "https://example.com/e", evidence_snippet: "missed calls", date_of_signal: NOW, intent_type: "operational_pain" },
  ], { now: NOW, minRecentIntent: 1 });
  const lead = pipeline.revenueLoopLeads[0];
  assert.equal(lead.last_intake_at, NOW);
  assert.equal(lead.last_seen_at, NOW);
  assert.ok("last_validated_at" in lead);
});
