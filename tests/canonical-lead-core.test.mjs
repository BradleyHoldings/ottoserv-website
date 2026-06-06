import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_LEAD_SCHEMA_VERSION,
  buildEnrichmentTask,
  buildIdentityAliases,
  dedupeCanonicalLeads,
  deriveStableLeadId,
  toCanonicalLead,
  validateLeadEvidence,
} from "../src/lib/leads/canonicalLeadCore.mjs";

const NOW = "2026-06-06T18:30:00.000Z";

function realLead(overrides = {}) {
  return {
    company_name: "Bravo Plumbing LLC",
    phone: "(407) 222-0198",
    email: "dispatch@bravoplumbing.com",
    website: "https://www.bravoplumbing.com/services",
    source_url: "https://www.google.com/maps/place/bravo-plumbing",
    source_type: "public_revenue_signal",
    city: "Orlando",
    state: "FL",
    industry: "plumbing",
    ...overrides,
  };
}

test("stable lead id is independent of row order and display formatting", () => {
  const first = deriveStableLeadId(realLead());
  const reordered = deriveStableLeadId({
    state: "FL",
    city: "Orlando",
    website: "bravoplumbing.com/",
    email: "DISPATCH@BRAVOPLUMBING.COM",
    phone: "+1 407 222 0198",
    company: "Bravo Plumbing, LLC",
  });
  assert.equal(first, reordered);
  assert.match(first, /^lead_v1_[a-f0-9]{24}$/);
});

test("identity aliases include durable domain, phone, email, and company location keys", () => {
  const aliases = buildIdentityAliases(realLead());
  assert.ok(aliases.includes("domain:bravoplumbing.com"));
  assert.ok(aliases.includes("phone:4072220198"));
  assert.ok(aliases.includes("email:dispatch@bravoplumbing.com"));
  assert.ok(aliases.includes("company_location:bravo plumbing llc|orlando|FL"));
});

test("duplicate within one batch collapses even when phone/email formatting changes", () => {
  const one = toCanonicalLead(realLead(), { now: NOW });
  const two = toCanonicalLead(realLead({
    phone: "+1-407-222-0198",
    email: "DISPATCH@BRAVOPLUMBING.COM",
    website: "bravoplumbing.com",
  }), { now: NOW });
  const result = dedupeCanonicalLeads([one, two]);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.duplicates[0].duplicate_of, one.lead_id);
});

test("duplicate against an existing canonical record is detected through an alias", () => {
  const existing = toCanonicalLead(realLead(), { now: NOW });
  const incoming = toCanonicalLead(realLead({ website: "", source_url: "https://bbb.org/bravo", phone: "+1 407 222 0198" }), { now: NOW });
  const result = dedupeCanonicalLeads([incoming], [existing]);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.duplicates[0].duplicate_of, existing.lead_id);
});

test("mock/test company is rejected and test contacts are quarantined", () => {
  const lead = toCanonicalLead({
    company_name: "Example Test HVAC",
    email: "owner@example.com",
    phone: "407-555-0100",
    website: "https://example.com",
    source_url: "https://example.com/profile",
  }, { now: NOW });
  assert.equal(lead.record_status, "rejected");
  assert.equal(lead.eligibility, "rejected");
  assert.ok(lead.fit_validation.rejection_reasons.includes("missing_or_placeholder_business_identity"));
  assert.ok(lead.fit_validation.quarantine_reasons.includes("invalid_or_test_email"));
  assert.ok(lead.fit_validation.quarantine_reasons.includes("invalid_or_test_phone"));
});

test("missing public evidence never becomes outreach eligible", () => {
  const validation = validateLeadEvidence({
    company_name: "Real Plumbing Co",
    phone: "4072220198",
    email: "owner@realplumbing.co",
  });
  assert.equal(validation.public_evidence_verified, false);
  assert.equal(validation.eligibility, "manual_review");
  assert.ok(validation.quarantine_reasons.includes("missing_public_source_evidence"));
});

test("public evidence with no verified contact path queues enrichment", () => {
  const lead = toCanonicalLead({
    company_name: "Evidence Roofing",
    website: "https://evidenceroofing.com",
    source_url: "https://www.google.com/maps/place/evidence-roofing",
    city: "Tampa",
    state: "FL",
  }, { now: NOW });
  assert.equal(lead.eligibility, "enrich");
  assert.equal(lead.enrichment_status, "queued_required");
  const task = buildEnrichmentTask(lead, { now: NOW });
  assert.equal(task.task_id, `enrich_${lead.lead_id}`);
  assert.equal(task.idempotency_key, `enrich_lead_contact:${lead.lead_id}`);
  assert.equal(task.external_outreach_allowed, false);
});

test("verified contact path skips enrichment and only marks eligibility", () => {
  const lead = toCanonicalLead(realLead(), { now: NOW });
  assert.equal(lead.eligibility, "call_eligible");
  assert.equal(lead.enrichment_status, "not_required");
  assert.equal(buildEnrichmentTask(lead, { now: NOW }), null);
});

test("canonical timestamps preserve discovery time separately from import time", () => {
  const lead = toCanonicalLead(realLead({ discovered_at: "2026-05-01T12:00:00.000Z" }), { now: NOW });
  assert.equal(lead.discovered_at, "2026-05-01T12:00:00.000Z");
  assert.equal(lead.imported_at, NOW);
  assert.equal(lead.created_at, NOW);
  assert.equal(lead.updated_at, NOW);
  assert.equal(lead.schema_version, CANONICAL_LEAD_SCHEMA_VERSION);
});

test("enrichment task is deterministic and does not authorize outreach", () => {
  const lead = toCanonicalLead({
    company_name: "No Contact Electric",
    website: "https://nocontactelectric.com",
    source_url: "https://linkedin.com/company/no-contact-electric",
    city: "Cocoa",
    state: "FL",
  }, { now: NOW });
  const first = buildEnrichmentTask(lead, { now: NOW });
  const second = buildEnrichmentTask(lead, { now: "2026-06-06T19:00:00.000Z" });
  assert.equal(first.task_id, second.task_id);
  assert.equal(first.idempotency_key, second.idempotency_key);
  assert.equal(first.external_outreach_allowed, false);
});
