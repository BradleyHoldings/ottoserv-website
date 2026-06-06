// ─── Phase 1 lead rail: stable, deterministic identity ────────────────────────
//
// THE DEFECT THIS FIXES
// Two pre-Phase-1 implementations minted UNSTABLE lead ids:
//   - leadIntent.normalizeEnrichedLead → `li-<slug>-<digits of NOW>` (changes every
//     run, so the same lead never reconciles to one row);
//   - outreach/leadImport.ts → `lead_<…>-<row>` (depends on spreadsheet row order).
// Either one creates a NEW lead on every import. This module is the single,
// versioned, deterministic identity used by the whole rail: a lead id derived ONLY
// from normalized durable attributes, so the same business always hashes to the
// same id regardless of import order, run time, or file shape.
//
// PURE. No I/O. No network.

import { createHash } from "node:crypto";

// Bump when the identity DERIVATION changes (so old ids can be migrated, not
// silently collided). The version is part of the id and the hash input.
export const IDENTITY_VERSION = "v1";

function clean(v) {
  return String(v ?? "").trim();
}
function lower(v) {
  return clean(v).toLowerCase();
}

// ── Field normalizers (the durable attributes identity is built from) ──────────

/** Bare host: strip scheme, `www.`, path, port, query. Lowercased. */
export function normalizeDomain(website) {
  const m = lower(website).match(/^(?:https?:\/\/)?(?:www\.)?([^/:?#\s]+)/);
  return m ? m[1] : "";
}

/** US 10-digit phone (drops a leading country `1`); "" when not 10 digits. */
export function normalizePhone(phone) {
  const digits = clean(phone).replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return ten.length === 10 ? ten : "";
}

/** Lowercased, trimmed email; "" when not email-shaped. */
export function normalizeEmail(email) {
  const e = lower(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
}

const COMPANY_SUFFIXES = /\b(llc|l\.l\.c|inc|incorporated|co|corp|corporation|ltd|limited|plc|pllc|lp|llp|company)\b/g;

/** Company slug: lowercased, suffixes/punctuation stripped, spaces collapsed. */
export function normalizeCompany(name) {
  return lower(name)
    .replace(/[.,]/g, " ")
    .replace(COMPANY_SUFFIXES, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function normalizeRegion(value) {
  return lower(value).replace(/[^a-z0-9]+/g, "");
}

/**
 * All candidate identity keys for a lead, strongest first. Two records that share
 * ANY of these keys are the same lead (used by dedupe + alias reconciliation).
 * Returns an array of `kind:value` strings.
 */
export function identityKeys(lead = {}) {
  const keys = [];
  const domain = normalizeDomain(lead.website || lead.website_url);
  const phone = normalizePhone(lead.normalized_phone || lead.phone);
  const email = normalizeEmail(lead.email);
  const company = normalizeCompany(lead.company_name || lead.business_name || lead.company);
  const city = normalizeRegion(lead.city || lead.location);
  const state = normalizeRegion(lead.state);
  if (domain) keys.push(`domain:${domain}`);
  if (phone) keys.push(`phone:${phone}`);
  if (email) keys.push(`email:${email}`);
  // Company fallback only counts when paired with a place, so two unrelated
  // "ABC Plumbing"s in different cities are not merged.
  if (company && (city || state)) keys.push(`company:${company}|${city}|${state}`);
  return keys;
}

/**
 * The single durable basis used to MINT the id, chosen by priority:
 *   verified website domain → normalized phone → normalized email →
 *   normalized company + city/state.
 * Returns { basis, value } or { basis:"", value:"" } when nothing durable exists.
 */
export function identityBasis(lead = {}) {
  const domain = normalizeDomain(lead.website || lead.website_url);
  if (domain) return { basis: "domain", value: domain };
  const phone = normalizePhone(lead.normalized_phone || lead.phone);
  if (phone) return { basis: "phone", value: phone };
  const email = normalizeEmail(lead.email);
  if (email) return { basis: "email", value: email };
  const company = normalizeCompany(lead.company_name || lead.business_name || lead.company);
  const city = normalizeRegion(lead.city || lead.location);
  const state = normalizeRegion(lead.state);
  if (company && (city || state)) return { basis: "company_geo", value: `${company}|${city}|${state}` };
  if (company) return { basis: "company", value: company };
  return { basis: "", value: "" };
}

/**
 * Deterministic, versioned lead id. The same durable attributes always produce the
 * same id, independent of row order / run time / input shape. Returns "" only when
 * the lead has NO durable attribute at all (caller must quarantine such a record).
 */
export function deriveLeadId(lead = {}) {
  const { basis, value } = identityBasis(lead);
  if (!basis || !value) return "";
  const digest = createHash("sha256").update(`${IDENTITY_VERSION}:${basis}:${value}`).digest("hex");
  return `lid_${IDENTITY_VERSION}_${digest.slice(0, 16)}`;
}

/** True when `a` and `b` are the same lead by any shared identity key. */
export function sameLead(a, b) {
  const setA = new Set(identityKeys(a));
  return identityKeys(b).some((k) => setA.has(k));
}
