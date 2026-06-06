export const CANONICAL_LEAD_SCHEMA_VERSION: "1.0.0";
export const LEAD_ID_VERSION: "v1";

export type CanonicalLeadEligibility =
  | "enrich"
  | "email_eligible"
  | "call_eligible"
  | "manual_review"
  | "gated"
  | "rejected";

export type CanonicalLead = {
  lead_id: string;
  identity_aliases: string[];
  company_name: string;
  contact_name: string;
  normalized_phone: string;
  email: string;
  website: string;
  industry: string;
  city: string;
  state: string;
  timezone: string;
  source_url: string;
  source_type: string;
  source_evidence: unknown;
  discovered_at: string;
  imported_at: string;
  last_validated_at: string;
  contact_validation: { phone: string; email: string };
  fit_validation: {
    public_evidence_verified: boolean;
    rejection_reasons: string[];
    quarantine_reasons: string[];
  };
  score: number;
  tier: string;
  score_reasons: string[];
  pipeline_stage: string;
  eligibility: CanonicalLeadEligibility;
  next_action: string;
  enrichment_status: string;
  record_status: "active" | "quarantined" | "rejected";
  schema_version: "1.0.0";
  created_at: string;
  updated_at: string;
};

export function normalizePhone(value: unknown): string;
export function normalizeEmail(value: unknown): string;
export function normalizeCompany(value: unknown): string;
export function normalizeDomain(value: unknown): string;
export function validEmail(value: unknown): boolean;
export function validPhone(value: unknown): boolean;
export function buildIdentityAliases(input?: Record<string, unknown>): string[];
export function deriveStableLeadId(input?: Record<string, unknown>): string;
export function validateLeadEvidence(input?: Record<string, unknown>): {
  public_evidence_verified: boolean;
  contact_validation: { phone: string; email: string };
  rejection_reasons: string[];
  quarantine_reasons: string[];
  eligibility: CanonicalLeadEligibility;
  enrichment_status: string;
  record_status: "active" | "quarantined" | "rejected";
};
export function toCanonicalLead(input?: Record<string, unknown>, options?: { now?: string }): CanonicalLead;
export function dedupeCanonicalLeads(leads?: Record<string, unknown>[], existing?: Record<string, unknown>[]): {
  accepted: CanonicalLead[];
  duplicates: Array<{ lead: CanonicalLead; duplicate_of: string; matched_alias: string }>;
};
export function buildEnrichmentTask(lead: CanonicalLead, options?: { now?: string }): null | {
  task_id: string;
  operation_type: "enrich_lead_contact";
  lead_id: string;
  idempotency_key: string;
  actor: "Cowork";
  state: "queued";
  created_at: string;
  updated_at: string;
  timeout_minutes: number;
  max_attempts: number;
  evidence_required: string[];
  external_outreach_allowed: false;
};
