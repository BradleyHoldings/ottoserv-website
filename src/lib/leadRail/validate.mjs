// ─── Phase 1 lead rail: unified validation + quarantine ───────────────────────
//
// THE DEFECT THIS FIXES
// Safety rules were split across three places — outreach/leadImport.ts (phone
// 555/000/toll-free/length), leadSpreadsheetIngest.mjs (contact path / ICP /
// evidence), and the LIVE-ONLY Python (quarantine_mock_revenue_leads.py +
// repair_real_lead_sources.py: example/test domains, placeholder companies,
// vendor/recruiter fits). Nothing in the repo unified them, so the live scripts
// became a second business-logic implementation. This module is the ONE validator:
// it classifies every lead as accepted | quarantined | rejected and records the
// reasons + evidence so nothing is ever silently dropped.
//
// PURE. No I/O. Quarantined/rejected records are NOT deleted — the pipeline persists
// them to a quarantine artifact with these reasons.

import { normalizeDomain, normalizePhone, normalizeEmail } from "./identity.mjs";

export const VALIDATION_VERSION = "v1";

// record_status values the rail uses end to end.
export const RECORD_STATUS = {
  ACCEPTED: "accepted",      // safe to enter the pipeline
  QUARANTINED: "quarantined",// recoverable: mock-looking / missing evidence / no contact → held, not deleted
  REJECTED: "rejected",      // hard-excluded: vendor/recruiter/job-seeker fit, unusable record
};

function clean(v) {
  return String(v ?? "").trim();
}
function lower(v) {
  return clean(v).toLowerCase();
}
function asArray(v) {
  return Array.isArray(v) ? v : [];
}

// ── Non-real / test / reserved patterns (migrated from the live Python rules) ──

// Domains that are reserved, example, or obviously non-production.
const INVALID_DOMAIN_RE =
  /(?:^|\.)(?:example|test|invalid|localhost)(?:\.|$)|\b(?:example\.(?:com|net|org)|test\.com|sample\.com|mock\.|placeholder\.)/i;
const INVALID_TLD_RE = /\.(?:example|test|invalid|localhost|local)$/i;

// Email local/domain parts that signal a placeholder rather than a real inbox.
const PLACEHOLDER_EMAIL_LOCAL_RE = /^(?:test|sample|example|demo|noreply|no-reply|donotreply|placeholder|user|email|name|foo|bar)$/i;

// Company identities that are placeholders, not real businesses. Matches exact
// placeholder values AND names that LEAD with a placeholder token (e.g. "Test
// Company", "Sample Business") — the `\b` keeps real names like "Testa Plumbing".
const PLACEHOLDER_COMPANY_RE =
  /^(?:test|sample|example|demo|placeholder|unknown|n\/?a|none|null|tbd|company( name)?|your (?:company|business)|business name|acme(?: corp(?:oration)?| inc)?|lorem ipsum)$/i;
const PLACEHOLDER_COMPANY_PREFIX_RE = /^(?:test|sample|example|demo|placeholder|acme|foo|bar)\b/i;

// Excluded FITS — these are not ICP customers and must be rejected (kept on file).
const EXCLUDED_FIT_RE =
  /\b(?:recruiter|recruiting|staffing agenc|job seeker|jobseeker|candidate|résumé|resume service|mlm|multi-?level|wholesal|dropship|lead (?:gen|generation) (?:vendor|agency)|data (?:provider|broker)|marketing agency|seo agency|software vendor|saas vendor|reseller)\b/i;

// Reserved / fake phone signals (migrated from leadImport.ts validatePhone).
const TOLL_FREE_PREFIXES = new Set(["800", "888", "877", "866", "855", "844", "833", "822"]);

// US state → IANA timezone (migrated from leadImport.ts, used by normalize).
export const STATE_TIMEZONES = {
  FL: "America/New_York", GA: "America/New_York", NC: "America/New_York",
  SC: "America/New_York", NY: "America/New_York", VA: "America/New_York",
  TN: "America/Chicago", TX: "America/Chicago", IL: "America/Chicago",
  CA: "America/Los_Angeles", AZ: "America/Phoenix", CO: "America/Denver",
  WA: "America/Los_Angeles",
};

// ── Field-level validators ─────────────────────────────────────────────────────

/** Phone: returns { valid, normalized, code, reason }. */
export function validatePhone(phone) {
  const raw = clean(phone);
  if (!raw) return { valid: false, normalized: "", code: "missing_phone", reason: "No phone provided." };
  const normalized = normalizePhone(raw);
  if (!normalized) return { valid: false, normalized: "", code: "malformed_phone", reason: "Phone must normalize to 10 US digits." };
  if (normalized.includes("555")) return { valid: false, normalized: "", code: "reserved_555_phone", reason: "555 reserved/test numbers are blocked." };
  if (/^0+$/.test(normalized) || normalized.includes("000")) return { valid: false, normalized: "", code: "placeholder_000_phone", reason: "000 placeholder numbers are blocked." };
  if (/^(\d)\1{9}$/.test(normalized)) return { valid: false, normalized: "", code: "repeated_digit_phone", reason: "Repeated-digit numbers are blocked." };
  if (TOLL_FREE_PREFIXES.has(normalized.slice(0, 3))) return { valid: false, normalized: "", code: "toll_free_phone", reason: "Toll-free numbers are blocked for the call rail." };
  return { valid: true, normalized, code: "ok", reason: "Valid US phone." };
}

/** Email: returns { valid, normalized, code, reason }. */
export function validateEmail(email) {
  const raw = clean(email);
  if (!raw) return { valid: false, normalized: "", code: "missing_email", reason: "No email provided." };
  const normalized = normalizeEmail(raw);
  if (!normalized) return { valid: false, normalized: "", code: "malformed_email", reason: "Email is malformed." };
  const [localPart, domainPart] = normalized.split("@");
  if (INVALID_DOMAIN_RE.test(domainPart) || INVALID_TLD_RE.test(domainPart)) {
    return { valid: false, normalized: "", code: "non_real_email_domain", reason: `Email domain "${domainPart}" is example/test/invalid.` };
  }
  if (PLACEHOLDER_EMAIL_LOCAL_RE.test(localPart)) {
    return { valid: false, normalized: "", code: "placeholder_email", reason: `Email local-part "${localPart}" is a placeholder.` };
  }
  return { valid: true, normalized, code: "ok", reason: "Valid email." };
}

/** Website: returns { valid, host, code, reason }. */
export function validateWebsite(website) {
  const raw = clean(website);
  if (!raw) return { valid: false, host: "", code: "missing_website", reason: "No website provided." };
  const host = normalizeDomain(raw);
  if (!host || !host.includes(".")) return { valid: false, host: "", code: "malformed_website", reason: "Website host is malformed." };
  if (INVALID_DOMAIN_RE.test(host) || INVALID_TLD_RE.test(host)) {
    return { valid: false, host, code: "non_real_domain", reason: `Domain "${host}" is example/test/invalid.` };
  }
  return { valid: true, host, code: "ok", reason: "Valid website host." };
}

/** Public source evidence present? (URL or quoted snippet). */
export function hasPublicEvidence(lead = {}) {
  const urls = asArray(lead.source_urls).map(clean).filter(Boolean);
  return Boolean(clean(lead.source_url) || urls.length || clean(lead.source_evidence) || clean(lead.evidence_snippet));
}

function isPlaceholderCompany(name) {
  const n = clean(name);
  return !n || PLACEHOLDER_COMPANY_RE.test(n) || PLACEHOLDER_COMPANY_PREFIX_RE.test(n);
}

function excludedFit(lead = {}) {
  const blob = `${lower(lead.company_name || lead.business_name || lead.company)} ${lower(lead.industry)} ${lower(lead.intent_evidence_summary)} ${lower(lead.notes)} ${lower(lead.fit_note)}`;
  const m = blob.match(EXCLUDED_FIT_RE);
  return m ? m[0] : "";
}

/**
 * Classify one (raw or normalized) lead. Returns:
 * {
 *   record_status, reasons[],
 *   contact_validation: { phone, email, website, has_contact_path, validated_at },
 *   fit_validation: { excluded, exclusion_reason, has_public_evidence, placeholder_company },
 *   validation_version
 * }
 * Quarantine ≠ delete: callers persist quarantined/rejected records with reasons.
 */
export function validateLead(lead = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const reasons = [];

  const phone = validatePhone(lead.normalized_phone || lead.phone);
  const email = validateEmail(lead.email);
  const website = validateWebsite(lead.website || lead.website_url);
  const has_contact_path = phone.valid || email.valid;
  const has_public_evidence = hasPublicEvidence(lead);
  const placeholder_company = isPlaceholderCompany(lead.company_name || lead.business_name || lead.company);
  const exclusion_reason = excludedFit(lead);

  const contact_validation = {
    phone, email, website,
    has_contact_path,
    validated_at: now,
    method: "rail_validator",
    version: VALIDATION_VERSION,
  };
  const fit_validation = {
    excluded: Boolean(exclusion_reason),
    exclusion_reason,
    has_public_evidence,
    placeholder_company,
    validated_at: now,
  };

  // 1. Hard REJECT: excluded fit (vendor/recruiter/job-seeker/etc.) — kept on file.
  if (exclusion_reason) {
    reasons.push(`excluded_fit: matched "${exclusion_reason}".`);
    return { record_status: RECORD_STATUS.REJECTED, reasons, contact_validation, fit_validation, validation_version: VALIDATION_VERSION };
  }

  // 2. QUARANTINE: fake IDENTITY. A stray mock phone/email next to a real contact
  //    is simply dropped (validatePhone/validateEmail already mark it invalid) — it
  //    does NOT quarantine an otherwise-real lead. Only signals that the BUSINESS
  //    itself is fake quarantine it: a placeholder company name, or a primary
  //    website on an example/test domain (no real business uses example.com).
  if (placeholder_company) {
    reasons.push("placeholder_company: company name is a placeholder/test value.");
  }
  const sitePresent = clean(lead.website || lead.website_url);
  if (sitePresent && website.code === "non_real_domain") {
    reasons.push(`mock_website_domain: ${website.reason}`);
  }

  // 3. QUARANTINE: no public source evidence at all (can't be called verified).
  if (!has_public_evidence) {
    reasons.push("missing_source_evidence: no public source URL or snippet.");
  }

  // 4. QUARANTINE: no usable contact path AND no real website to enrich from.
  //    The reason explains WHY (e.g. present channels were mock/reserved).
  if (!has_contact_path && !website.valid) {
    const why = [];
    if (clean(lead.normalized_phone || lead.phone)) why.push(`phone(${phone.code})`);
    if (clean(lead.email)) why.push(`email(${email.code})`);
    reasons.push(`no_contact_path: no valid phone/email and no enrichable website${why.length ? ` [${why.join(", ")}]` : ""}.`);
  }

  if (reasons.length) {
    return { record_status: RECORD_STATUS.QUARANTINED, reasons, contact_validation, fit_validation, validation_version: VALIDATION_VERSION };
  }

  reasons.push("accepted: real identity, public evidence, and a usable contact/enrichment path.");
  return { record_status: RECORD_STATUS.ACCEPTED, reasons, contact_validation, fit_validation, validation_version: VALIDATION_VERSION };
}
