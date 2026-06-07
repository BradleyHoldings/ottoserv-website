// ─── Phase 1 lead rail: canonical, versioned lead schema ──────────────────────
//
// ONE versioned schema for the authoritative lead/CRM record. Every required field
// from the Phase-1 spec is present, and SIGNAL/discovery time is kept distinct from
// IMPORT time. The record carries its own `schema_version` so a stored row can be
// migrated deterministically. PURE assembly only.

import { deriveLeadId } from "./identity.mjs";
import { RECORD_STATUS } from "./validate.mjs";
import { ELIGIBILITY, ENRICHMENT_STATUS } from "./eligibility.mjs";

export const LEAD_SCHEMA_VERSION = "phase1.v1";

// The canonical column/field set (also mirrored by the Supabase table).
export const CANONICAL_FIELDS = [
  "lead_id", "company_name", "contact_name", "normalized_phone", "email", "website",
  "industry", "city", "state", "timezone", "source_url", "source_type",
  "source_evidence", "discovered_at", "imported_at", "last_validated_at",
  "contact_validation", "fit_validation", "score", "tier", "score_reasons",
  "pipeline_stage", "eligibility", "next_action", "enrichment_status",
  "record_status", "schema_version", "version", "created_at", "updated_at",
];

function clean(v) {
  return String(v ?? "").trim();
}

/**
 * Assemble a canonical lead from the rail's stage outputs. Deterministic: same
 * inputs (and the same `now`/`created_at`) → same record. `version` is the
 * optimistic-concurrency counter (starts at 1 for a new record).
 *
 * @param {object} parts {
 *   normalized,        // from normalizeRow
 *   validation,        // from validateLead
 *   scored,            // from scoreLead (optional for rejected/quarantined)
 *   policy,            // from classifyEligibility (optional)
 *   now, created_at, version
 * }
 */
export function buildCanonicalLead(parts = {}) {
  const n = parts.normalized || {};
  const v = parts.validation || {};
  const s = parts.scored || {};
  const p = parts.policy || {};
  const now = parts.now || new Date().toISOString();

  const lead_id = clean(parts.lead_id) || deriveLeadId({
    website: n.website,
    normalized_phone: n.normalized_phone,
    email: n.email,
    company_name: n.company_name,
    city: n.city,
    state: n.state,
  });

  const record_status = v.record_status || RECORD_STATUS.QUARANTINED;
  const eligibility = p.eligibility || (record_status === RECORD_STATUS.REJECTED ? ELIGIBILITY.REJECTED : ELIGIBILITY.MANUAL_REVIEW);

  return {
    lead_id,
    company_name: clean(n.company_name),
    contact_name: clean(n.contact_name),
    normalized_phone: clean(n.normalized_phone),
    email: clean(n.email),
    website: clean(n.website),
    industry: clean(s.category || n.industry),
    city: clean(n.city),
    state: clean(n.state),
    timezone: clean(n.timezone),
    source_url: clean(n.source_url),
    source_type: clean(n.source_type) || "import",
    source_evidence: clean(n.source_evidence),
    // discovered_at = signal time; imported_at = intake time. Never conflated.
    discovered_at: clean(n.discovered_at),
    imported_at: clean(n.imported_at) || now,
    last_validated_at: v.contact_validation?.validated_at || (v.fit_validation?.has_public_evidence ? now : ""),
    contact_validation: v.contact_validation || null,
    fit_validation: v.fit_validation || null,
    score: Number.isFinite(Number(s.score)) ? Number(s.score) : 0,
    tier: clean(s.tier) || "Reject",
    score_reasons: Array.isArray(s.score_reasons) ? s.score_reasons : [],
    scoring_version: clean(s.scoring_version),
    pipeline_stage: clean(p.pipeline_stage) || record_status,
    eligibility,
    next_action: clean(p.next_action) || "none",
    enrichment_status: clean(p.enrichment_status) || ENRICHMENT_STATUS.NOT_REQUIRED,
    external_outreach_allowed: false,
    record_status,
    quarantine_reasons: record_status === RECORD_STATUS.ACCEPTED ? [] : (Array.isArray(v.reasons) ? v.reasons : []),
    schema_version: LEAD_SCHEMA_VERSION,
    version: Number.isFinite(Number(parts.version)) ? Number(parts.version) : 1,
    created_at: clean(parts.created_at) || now,
    updated_at: now,
  };
}
