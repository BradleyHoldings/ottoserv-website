import { createHash } from "node:crypto";

export const CANONICAL_LEAD_SCHEMA_VERSION = "1.0.0";
export const LEAD_ID_VERSION = "v1";

const TEST_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org",
  "example.invalid",
  "test.com",
  "fakecompany.com",
]);

const BAD_FIT_TERMS = [
  "software vendor",
  "marketing agency",
  "recruiter",
  "job seeker",
  "candidate",
  "supplier",
  "data provider",
  "wholesale list",
];

const PLACEHOLDER_RE = /\b(test|sample|placeholder|mock|demo|todo|example|fakecompany|abc hvac)\b/i;

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

export function normalizePhone(value) {
  const digits = clean(value).replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return national.length === 10 ? national : "";
}

export function normalizeEmail(value) {
  return lower(value);
}

export function normalizeCompany(value) {
  return lower(value).replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function normalizeDomain(value) {
  const raw = clean(value);
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return "";
  }
}

export function validEmail(value) {
  const email = normalizeEmail(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const domain = email.split("@").pop();
  return Boolean(domain) && !TEST_DOMAINS.has(domain) && !domain.endsWith(".invalid") && !domain.endsWith(".test");
}

export function validPhone(value) {
  const phone = normalizePhone(value);
  if (!phone) return false;
  if (phone.includes("555") || phone.includes("000")) return false;
  return new Set(phone.slice(-7)).size > 2;
}

export function buildIdentityAliases(input = {}) {
  const phone = normalizePhone(input.normalized_phone || input.phone);
  const email = normalizeEmail(input.email);
  const domain = normalizeDomain(input.website || input.website_url || input.domain);
  const company = normalizeCompany(input.company_name || input.company || input.name);
  const city = lower(input.city).replace(/[^a-z0-9]+/g, " ").trim();
  const state = clean(input.state).toUpperCase();

  const aliases = [];
  if (domain) aliases.push(`domain:${domain}`);
  if (phone) aliases.push(`phone:${phone}`);
  if (email) aliases.push(`email:${email}`);
  if (company && (city || state)) aliases.push(`company_location:${company}|${city}|${state}`);
  if (company) aliases.push(`company:${company}`);
  return [...new Set(aliases)];
}

export function deriveStableLeadId(input = {}) {
  const aliases = buildIdentityAliases(input);
  const preferred = aliases.find((item) => item.startsWith("domain:"))
    || aliases.find((item) => item.startsWith("phone:"))
    || aliases.find((item) => item.startsWith("email:"))
    || aliases.find((item) => item.startsWith("company_location:"))
    || aliases.find((item) => item.startsWith("company:"));

  if (!preferred) return "";
  const digest = createHash("sha256").update(`${LEAD_ID_VERSION}|${preferred}`).digest("hex").slice(0, 24);
  return `lead_${LEAD_ID_VERSION}_${digest}`;
}

export function validateLeadEvidence(input = {}) {
  const company = clean(input.company_name || input.company || input.name);
  const sourceUrl = clean(input.source_url);
  const website = clean(input.website || input.website_url);
  const phone = clean(input.normalized_phone || input.phone);
  const email = clean(input.email);
  const combined = [company, input.industry, input.notes, input.buying_signal, input.pain_signal].map(clean).join(" ").toLowerCase();

  const rejectionReasons = [];
  const quarantineReasons = [];

  if (!company || PLACEHOLDER_RE.test(company)) rejectionReasons.push("missing_or_placeholder_business_identity");
  if (BAD_FIT_TERMS.some((term) => combined.includes(term))) rejectionReasons.push("excluded_business_fit");
  if (email && !validEmail(email)) quarantineReasons.push("invalid_or_test_email");
  if (phone && !validPhone(phone)) quarantineReasons.push("invalid_or_test_phone");
  if (!sourceUrl && !website) quarantineReasons.push("missing_public_source_evidence");
  if (!validPhone(phone) && !validEmail(email)) quarantineReasons.push("missing_verified_contact_path");

  const publicEvidence = Boolean(sourceUrl || normalizeDomain(website));
  const contactValidation = {
    phone: validPhone(phone) ? "verified_format" : phone ? "invalid" : "missing",
    email: validEmail(email) ? "verified_format" : email ? "invalid" : "missing",
  };

  let eligibility = "manual_review";
  let enrichmentStatus = "not_required";
  if (rejectionReasons.length) eligibility = "rejected";
  else if (!publicEvidence) eligibility = "manual_review";
  else if (!validPhone(phone) && !validEmail(email)) {
    eligibility = "enrich";
    enrichmentStatus = "queued_required";
  } else if (validPhone(phone)) eligibility = "call_eligible";
  else if (validEmail(email)) eligibility = "email_eligible";

  return {
    public_evidence_verified: publicEvidence,
    contact_validation: contactValidation,
    rejection_reasons: [...new Set(rejectionReasons)],
    quarantine_reasons: [...new Set(quarantineReasons)],
    eligibility,
    enrichment_status: enrichmentStatus,
    record_status: rejectionReasons.length ? "rejected" : quarantineReasons.length ? "quarantined" : "active",
  };
}

export function toCanonicalLead(input = {}, options = {}) {
  const now = clean(options.now) || new Date().toISOString();
  const companyName = clean(input.company_name || input.company || input.name);
  const website = clean(input.website || input.website_url);
  const normalizedPhone = normalizePhone(input.normalized_phone || input.phone);
  const email = normalizeEmail(input.email);
  const validation = validateLeadEvidence({ ...input, company_name: companyName, website, normalized_phone: normalizedPhone, email });
  const aliases = buildIdentityAliases({ ...input, company_name: companyName, website, normalized_phone: normalizedPhone, email });
  const leadId = deriveStableLeadId({ ...input, company_name: companyName, website, normalized_phone: normalizedPhone, email });

  return {
    lead_id: leadId,
    identity_aliases: aliases,
    company_name: companyName,
    contact_name: clean(input.contact_name),
    normalized_phone: normalizedPhone,
    email,
    website,
    industry: clean(input.industry),
    city: clean(input.city),
    state: clean(input.state).toUpperCase(),
    timezone: clean(input.timezone),
    source_url: clean(input.source_url),
    source_type: clean(input.source_type || input.lead_source),
    source_evidence: input.source_evidence || null,
    discovered_at: clean(input.discovered_at || input.signal_date),
    imported_at: now,
    last_validated_at: now,
    contact_validation: validation.contact_validation,
    fit_validation: {
      public_evidence_verified: validation.public_evidence_verified,
      rejection_reasons: validation.rejection_reasons,
      quarantine_reasons: validation.quarantine_reasons,
    },
    score: Number.isFinite(Number(input.score)) ? Number(input.score) : 0,
    tier: clean(input.tier),
    score_reasons: Array.isArray(input.score_reasons) ? [...input.score_reasons] : [],
    pipeline_stage: clean(input.pipeline_stage || "new_lead"),
    eligibility: validation.eligibility,
    next_action: clean(input.next_action),
    enrichment_status: validation.enrichment_status,
    record_status: validation.record_status,
    schema_version: CANONICAL_LEAD_SCHEMA_VERSION,
    created_at: clean(input.created_at) || now,
    updated_at: now,
  };
}

export function dedupeCanonicalLeads(leads = [], existing = []) {
  const aliasOwner = new Map();
  for (const lead of existing) {
    for (const alias of buildIdentityAliases(lead)) aliasOwner.set(alias, lead.lead_id || deriveStableLeadId(lead));
  }

  const accepted = [];
  const duplicates = [];
  for (const input of leads) {
    const lead = input.schema_version ? input : toCanonicalLead(input);
    const matchedAlias = lead.identity_aliases.find((alias) => aliasOwner.has(alias));
    if (matchedAlias) {
      duplicates.push({ lead, duplicate_of: aliasOwner.get(matchedAlias), matched_alias: matchedAlias });
      continue;
    }
    for (const alias of lead.identity_aliases) aliasOwner.set(alias, lead.lead_id);
    accepted.push(lead);
  }
  return { accepted, duplicates };
}

export function buildEnrichmentTask(lead, options = {}) {
  if (!lead || lead.eligibility !== "enrich") return null;
  const now = clean(options.now) || new Date().toISOString();
  return {
    task_id: `enrich_${lead.lead_id}`,
    operation_type: "enrich_lead_contact",
    lead_id: lead.lead_id,
    idempotency_key: `enrich_lead_contact:${lead.lead_id}`,
    actor: "Cowork",
    state: "queued",
    created_at: now,
    updated_at: now,
    timeout_minutes: 60,
    max_attempts: 3,
    evidence_required: ["public_source_url", "verified_contact_path", "validated_at", "actor_or_provider"],
    external_outreach_allowed: false,
  };
}
