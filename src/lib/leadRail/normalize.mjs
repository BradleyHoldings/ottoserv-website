// ─── Phase 1 lead rail: normalization ─────────────────────────────────────────
//
// Turns a raw source row (any of the shapes the old importers accepted) into the
// rail's normalized field set, separating SIGNAL/discovery time from IMPORT time
// (a recurring Phase-0 defect). It picks values by header alias, normalizes the
// durable contact attributes, derives timezone from state, and preserves the
// intent fields the single scorer (leadIntent.scoreIntentLead) reads — so we keep
// one scorer, not a parallel one. PURE.

import { normalizeDomain, normalizePhone, normalizeEmail } from "./identity.mjs";
import { STATE_TIMEZONES } from "./validate.mjs";

function clean(v) {
  return String(v ?? "").trim();
}
function lower(v) {
  return clean(v).toLowerCase();
}
function asArray(v) {
  return Array.isArray(v) ? v : [];
}

// Pick the first non-empty value among header aliases (case-insensitive).
function pick(row, aliases) {
  const lowered = {};
  for (const [k, v] of Object.entries(row || {})) lowered[lower(k)] = v;
  for (const a of aliases) {
    const v = lowered[lower(a)];
    if (clean(v) && lower(v) !== "none" && lower(v) !== "n/a") return clean(v);
  }
  return "";
}

function pickArray(row, aliases) {
  const v = (() => {
    const lowered = {};
    for (const [k, val] of Object.entries(row || {})) lowered[lower(k)] = val;
    for (const a of aliases) if (lowered[lower(a)] !== undefined) return lowered[lower(a)];
    return undefined;
  })();
  if (Array.isArray(v)) return v.map(clean).filter(Boolean);
  if (clean(v)) return [clean(v)];
  return [];
}

/**
 * Normalize one raw row. `options.importedAt` is the IMPORT time; the discovered/
 * signal time comes from the row's own date fields. Returns the normalized record
 * PLUS `scoringInput` (the exact shape leadIntent.scoreIntentLead consumes).
 */
export function normalizeRow(row = {}, options = {}) {
  const importedAt = options.importedAt || options.now || new Date().toISOString();

  const company_name = pick(row, ["company_name", "company", "business", "business_name", "name"]);
  const contact_name = pick(row, ["contact_name", "decision_maker", "contact", "owner", "owner_name", "person"]);
  const rawPhone = pick(row, ["normalized_phone", "phone", "phone_number", "telephone", "mobile"]);
  const email = normalizeEmail(pick(row, ["email", "email_address"]));
  const website = pick(row, ["website", "website_url", "domain", "url"]);
  const industry = pick(row, ["industry", "category", "business_type", "vertical"]);
  const city = pick(row, ["city", "locality"]);
  const state = pick(row, ["state", "region", "province"]).toUpperCase();
  const location = pick(row, ["location"]) || [city, state].filter(Boolean).join(", ");
  const source_url = pick(row, ["source_url", "source", "source_link", "profile_url", "listing_url"]);
  const source_urls = (() => {
    const arr = pickArray(row, ["source_urls"]);
    const merged = [...arr];
    if (source_url) merged.unshift(source_url);
    const proof = pick(row, ["decision-maker proof url", "proof url", "proof_url"]);
    if (proof) merged.push(proof);
    return [...new Set(merged.filter(Boolean))];
  })();
  const source_type = pick(row, ["source_type"]) || (source_url ? "public_url" : "import");
  const source_evidence = pick(row, ["source_evidence", "evidence_snippet", "snippet", "quote"]);
  const intent_type = pick(row, ["intent_type", "buying_signal", "signal"]);
  const intent_evidence_summary = pick(row, ["intent_evidence_summary", "notes", "description", "summary"]);
  const pain_point = pick(row, ["pain_point", "pain_signal", "pain", "project/pain details", "pain details"]);
  const date_of_signal = pick(row, ["date_of_signal", "posted date", "posted", "signal_date", "date"]);
  const signal_window = pick(row, ["signal_window"]);
  const discovered_at = pick(row, ["discovered_at"]) || date_of_signal || "";

  const normalized_phone = normalizePhone(rawPhone);
  const website_host = normalizeDomain(website);
  const timezone = pick(row, ["timezone", "local_timezone"]) || STATE_TIMEZONES[state] || "";

  const normalized = {
    company_name,
    contact_name,
    phone: clean(rawPhone),
    normalized_phone,
    email,
    website: website_host ? (clean(website).match(/^https?:\/\//i) ? clean(website) : `https://${website_host}`) : "",
    website_host,
    industry,
    city,
    state,
    location,
    timezone,
    // source_url is the DISCOVERED public source only. A company's own website is a
    // contact/enrichment channel, NOT intent evidence, so it never backfills here.
    source_url,
    source_urls,
    source_type,
    source_evidence,
    intent_type,
    intent_evidence_summary,
    pain_point,
    date_of_signal,
    signal_window,
    discovered_at,
    imported_at: importedAt,
    // raw field carriers leadIntent expects under different names
    business_name: company_name,
    decision_maker: contact_name,
    evidence_snippet: source_evidence,
  };

  // The single scorer's input contract (leadIntent.scoreIntentLead).
  const scoringInput = {
    business_name: company_name,
    industry,
    intent_type,
    intent_evidence_summary,
    pain_point,
    signal_window,
    date_of_signal,
    evidence_snippet: source_evidence,
    source_url: normalized.source_url,
    source_urls,
    phone: rawPhone,
    email,
    website: normalized.website,
  };

  return { normalized, scoringInput };
}
