// ─── Controlled-real acceptance fixture ───────────────────────────────────────
//
// 7 synthetic records designed to exercise every acceptance case WITHOUT using
// real production leads or enabling outreach. Each record represents a DIFFERENT
// scenario that the acceptance run must prove.
//
// NO PII: all contact data is fabricated. No real phone numbers, emails, or
// business names. Do NOT add real leads here.
//
// Domain pattern: *.acceptance-run.io — avoids the validator's INVALID_DOMAIN_RE
// which blocks *.example.com, *.test.com, *.invalid, etc.
// Phone pattern: 512-234-XXXX — avoids 555/800/000 reserved ranges.
//
// The acceptance run MUST prove:
//   1. stable IDs (same record → same lead_id across runs)
//   2. dedupe/reconciliation (dup record → one upsert, not two)
//   3. quarantine/rejection evidence retained
//   4. scoring
//   5. eligibility
//   6. enrichment queued/pending (not falsely completed)
//   7. Supabase write + read-after-write match
//   8. record version
//   9. restart-safe repeated run (idempotent)
//  10. no duplicate leads/tasks
//  11. no outreach

export const ACCEPTANCE_RUN_ID = "controlled-real-acceptance-v1";
export const ACCEPTANCE_SOURCE = {
  source_url: "internal://acceptance-fixture/v1",
  source_type: "acceptance_test",
  label: "Phase 1 controlled-real acceptance",
};

/**
 * Record A: new valid ICP lead — website + phone present, should accept + score high.
 */
export const RECORD_A_NEW_VALID = {
  company_name: "Acceptance HVAC Services LLC",
  phone: "5122340101",
  website: "https://acceptance-hvac.acceptance-run.io",
  city: "Austin",
  state: "TX",
  industry: "HVAC",
  source_url: "internal://acceptance-fixture/v1",
  source_type: "acceptance_test",
  _scenario: "new_valid",
};

/**
 * Record B: duplicate of A with slightly different formatting — should reconcile
 * to the same lead_id, NOT create a second row.
 */
export const RECORD_B_DUPLICATE = {
  company_name: "Acceptance HVAC Services",  // no "LLC" suffix
  phone: "(512) 234-0101",                   // formatted differently — same digits
  website: "https://www.acceptance-hvac.acceptance-run.io",  // www prefix
  city: "Austin",
  state: "TX",
  industry: "HVAC",
  source_url: "internal://acceptance-fixture/v1",
  source_type: "acceptance_test",
  _scenario: "duplicate_of_a",
};

/**
 * Record C: changed contact alias — same website as A but different phone number.
 * Should reconcile to the same lead via domain key, updating the phone alias.
 */
export const RECORD_C_CHANGED_ALIAS = {
  company_name: "Acceptance HVAC Services",
  phone: "5122340199",                       // different phone
  website: "https://acceptance-hvac.acceptance-run.io",
  city: "Austin",
  state: "TX",
  industry: "HVAC",
  source_url: "internal://acceptance-fixture/v1",
  source_type: "acceptance_test",
  _scenario: "changed_contact_alias",
};

/**
 * Record D: missing contact — has website + public evidence but no phone/email.
 * Should be queued for enrichment (not auto-completed, not outreached).
 */
export const RECORD_D_NEEDS_ENRICHMENT = {
  company_name: "Acceptance Property Mgmt Co",
  website: "https://acceptance-propmgmt.acceptance-run.io",
  city: "Denver",
  state: "CO",
  industry: "Property Management",
  source_url: "internal://acceptance-fixture/v1",
  source_type: "acceptance_test",
  _scenario: "missing_contact_needs_enrichment",
  // No phone, no email — should trigger enrich_lead_contact task
};

/**
 * Record E: invalid/mock lead — invalid phone (all zeros), no website, placeholder
 * company. Should be quarantined or rejected.
 */
export const RECORD_E_INVALID = {
  company_name: "TEST FAKE COMPANY DO NOT USE",
  phone: "0000000000",   // invalid (all zeros)
  website: "",
  city: "",
  state: "",
  source_url: "internal://acceptance-fixture/v1",
  source_type: "acceptance_test",
  _scenario: "invalid_mock",
};

/**
 * Record F: missing source evidence — phone and company present but no website
 * and no source_url/source_evidence. Should be quarantined (unverifiable).
 */
export const RECORD_F_MISSING_EVIDENCE = {
  company_name: "Acceptance Plumbing Inc",
  phone: "5122340202",
  website: "",
  city: "Seattle",
  state: "WA",
  source_url: "",        // missing evidence
  source_type: "acceptance_test",
  _scenario: "missing_source_evidence",
};

/**
 * Record G: stale record protection — same lead_id as A will be provided in
 * existingRecords with version=99 (newer than what the fixture produces).
 * The reconcile stage must refuse to overwrite it.
 */
export const RECORD_G_STALE_PROTECTION_EXISTING = {
  // This is the "already stored" record that simulates a newer DB version.
  lead_id: null,  // computed by test from RECORD_A identity
  company_name: "Acceptance HVAC Services LLC",
  phone: "5122340101",
  website: "https://acceptance-hvac.acceptance-run.io",
  city: "Austin",
  state: "TX",
  industry: "HVAC",
  source_url: "internal://acceptance-fixture/v1",
  source_type: "acceptance_test",
  record_status: "accepted",
  version: 99,    // far ahead of what the new run will produce (v1)
  schema_version: "phase1.v1",
  _scenario: "stale_record_newer_version_in_store",
};

/**
 * All 7 input rows for the acceptance run (rows presented to the pipeline).
 * Record G's pre-existing row is passed separately as existingRecords.
 */
export const ACCEPTANCE_ROWS = [
  RECORD_A_NEW_VALID,
  RECORD_B_DUPLICATE,
  RECORD_C_CHANGED_ALIAS,
  RECORD_D_NEEDS_ENRICHMENT,
  RECORD_E_INVALID,
  RECORD_F_MISSING_EVIDENCE,
  RECORD_A_NEW_VALID, // intentional second submission of A (duplicate within the same batch)
];

/**
 * The acceptance checklist: what each scenario must demonstrate.
 * Reference this when reviewing acceptance run receipts.
 */
export const ACCEPTANCE_CHECKLIST = [
  { scenario: "new_valid",               expect: "accepted, scored, eligibility set, persisted, read-back verified" },
  { scenario: "duplicate_of_a",          expect: "reconciles to same lead_id as A, no second row, stats.duplicates > 0" },
  { scenario: "changed_contact_alias",   expect: "reconciles to same lead_id via domain key, phone alias updated" },
  { scenario: "missing_contact_needs_enrichment", expect: "enrich_lead_contact task queued, not completed, no outreach" },
  { scenario: "invalid_mock",            expect: "quarantined or rejected, quarantine evidence present, no persistence" },
  { scenario: "missing_source_evidence", expect: "quarantined, quarantine_reasons includes missing evidence" },
  { scenario: "stale_record_newer_version_in_store", expect: "stale_skipped or version_conflict, existing record not overwritten" },
  { scenario: "repeated_run",            expect: "idempotent: same correlation_id → skips, no duplicate tasks" },
  { scenario: "no_outreach",             expect: "no_transport: true throughout, no email/call/DM triggered" },
];
