import assert from "node:assert/strict";
import test from "node:test";

import { normalizeResearchResult, researchSeedLeads } from "../src/lib/hermesBrowserResearch.mjs";

const NOW = "2026-06-04T15:00:00.000Z";

test("rejects URL IDs as phone numbers", () => {
  const out = normalizeResearchResult(
    { business_name: "Example HVAC", industry: "hvac", source_url: "https://example.test/post", evidence_snippet: "Needs after-hours coverage" },
    { public_phone: "https://example.test/job/4409749089", contact_sources: ["https://example.test/contact"] },
    NOW,
  );
  assert.equal(out.phone, "");
  assert.equal(out.enrichment.verified_contact_path, false);
});

test("email and phone require public contact-source evidence", () => {
  const withoutProof = normalizeResearchResult(
    { business_name: "Example Plumbing", industry: "plumbing" },
    { public_email: "owner@example.com", public_phone: "407-555-0199" },
    NOW,
  );
  assert.equal(withoutProof.email, "");
  assert.equal(withoutProof.phone, "");

  const withProof = normalizeResearchResult(
    { business_name: "Example Plumbing", industry: "plumbing" },
    { public_email: "owner@example.com", public_phone: "407-555-0199", contact_sources: ["https://example.com/contact"] },
    NOW,
  );
  assert.equal(withProof.email, "owner@example.com");
  assert.equal(withProof.phone, "4075550199");
});

test("verified social profile can make a lead DM-ready", () => {
  const out = normalizeResearchResult(
    { business_name: "Example Roofing", industry: "roofing" },
    { social_profiles: [{ platform: "linkedin", url: "https://example.test/in/owner", verified: true, source_url: "https://example.test/company" }] },
    NOW,
  );
  assert.equal(out.social_profiles.length, 1);
  assert.equal(out.enrichment.verified_contact_path, true);
});

test("browser research provider produces channel-ready counts", async () => {
  const provider = {
    researchLead: async () => ({
      official_website: "https://example.com",
      public_email: "owner@example.com",
      contact_sources: ["https://example.com/contact"],
      social_profiles: [{ platform: "linkedin", url: "https://example.test/in/owner", verified: true, source_url: "https://example.com/about" }],
    }),
  };
  const out = await researchSeedLeads([{ business_name: "Example Co", industry: "hvac" }], { provider, now: NOW });
  assert.equal(out.ok, true);
  assert.equal(out.summary.enriched, 1);
  assert.equal(out.summary.email_ready, 1);
  assert.equal(out.summary.dm_ready, 1);
});
