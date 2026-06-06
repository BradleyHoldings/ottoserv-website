import { dedupeAndReconcile } from "../leadRail/dedupe.mjs";
import { classifyEligibility } from "../leadRail/eligibility.mjs";
import { identityKeys } from "../leadRail/identity.mjs";
import { normalizeRow } from "../leadRail/normalize.mjs";
import { scoreLead } from "../leadRail/score.mjs";
import { buildCanonicalLead } from "../leadRail/schema.mjs";
import { validateLead, validatePhone as railValidatePhone, RECORD_STATUS } from "../leadRail/validate.mjs";

export const ACCEPTED_LEAD_FIELDS = [
  "company",
  "contact_name",
  "name",
  "phone",
  "email",
  "website",
  "website_url",
  "industry",
  "city",
  "state",
  "source_url",
  "notes",
  "description",
  "buying_signal",
  "pain_signal",
  "timezone",
  "local_timezone",
];

export function parseCsv(text) {
  const rows = parseCsvRows(String(text || "").trim());
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => normalizeKey(header));
  return rows.slice(1).filter((row) => row.some((cell) => String(cell).trim())).map((row) => {
    const item = {};
    headers.forEach((header, index) => {
      if (header) item[header] = row[index] || "";
    });
    return item;
  });
}

export function parseJsonPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.leads)) return payload.leads;
    if (Array.isArray(payload.records)) return payload.records;
    return [payload];
  }
  return [];
}

export function scoreAndNormalizeLead(input, row = 2, slotIndex = 0) {
  const built = buildLegacyLead(input, { now: new Date().toISOString(), slotIndex });
  if (built.error) return { error: { ...built.error, row } };
  return { lead: built.legacy };
}

export function importLeadRows(rows, existing = [], dryRun = false) {
  const now = new Date().toISOString();
  const accepted = [];
  const rejected = [];
  const duplicates = [];
  const seenKeys = new Set((Array.isArray(existing) ? existing : []).flatMap(leadDuplicateKeys));

  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    const built = buildLegacyLead(row, { now, slotIndex: accepted.length });
    if (built.error) {
      rejected.push({ ...built.error, row: index + 2 });
      return;
    }
    built.row = index + 2;
    const duplicateKey = leadDuplicateKeys(built.legacy).find((key) => seenKeys.has(key));
    if (duplicateKey) {
      duplicates.push({
        row: index + 2,
        company: built.legacy.company || undefined,
        phone: built.legacy.phone || undefined,
        field: "duplicate",
        code: "duplicate_lead",
        message: `Duplicate lead skipped using canonical leadRail identity key: ${duplicateKey}.`,
      });
      return;
    }
    leadDuplicateKeys(built.legacy).forEach((key) => seenKeys.add(key));
    accepted.push(built);
  });

  const reconciled = dedupeAndReconcile(accepted.map((item) => item.canonical), [], { now });
  const upsertIds = new Set(reconciled.upserts.map((lead) => lead.lead_id));
  const imported = accepted
    .filter((item) => upsertIds.has(item.canonical.lead_id))
    .map((item) => canonicalToLegacy(reconciled.upserts.find((lead) => lead.lead_id === item.canonical.lead_id) || item.canonical, item.raw, item.slotIndex));
  const collapsedDuplicateCount = accepted.length - imported.length + reconciled.stats.duplicates + reconciled.stats.stale_skipped;

  return {
    dry_run: Boolean(dryRun),
    accepted_count: imported.length,
    rejected_count: rejected.length,
    duplicate_count: duplicates.length + collapsedDuplicateCount,
    imported,
    duplicates: [
      ...duplicates,
      ...accepted.filter((item) => !upsertIds.has(item.canonical.lead_id)).map((item) => ({
      row: item.row,
      company: item.legacy.company || undefined,
      phone: item.legacy.phone || undefined,
      field: "duplicate",
      code: "duplicate_lead",
      message: "Duplicate lead skipped using canonical leadRail identity.",
      })),
    ],
    rejected,
    accepted_fields: ACCEPTED_LEAD_FIELDS,
  };
}

export function leadDuplicateKeys(lead) {
  return identityKeys({
    company_name: lead.company || lead.company_name,
    normalized_phone: lead.normalized_phone,
    email: lead.email,
    website: lead.website_url || lead.website,
    city: lead.city,
    state: lead.state,
  });
}

export function validatePhone(phone) {
  const res = railValidatePhone(phone);
  return {
    valid: res.valid,
    normalized: res.normalized || undefined,
    code: res.code,
    message: res.reason,
  };
}

export function classifyLead(score, hasValidPhone, hasValidEmail, badFit) {
  if (badFit || (!hasValidPhone && !hasValidEmail) || score < 20) return "Reject";
  if (score >= 75 && hasValidPhone) return "A-tier";
  if (score >= 50 && hasValidEmail) return "B-tier";
  return "C-tier";
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function buildLegacyLead(input = {}, options = {}) {
  const normalizedBundle = normalizeRow(input, { now: options.now });
  const normalized = normalizedBundle.normalized;
  const validation = validateLead(normalized, { now: options.now });
  const scored = scoreLead(normalizedBundle.scoringInput, { now: options.now });
  const policy = classifyEligibility({
    record_status: validation.record_status,
    contact_validation: validation.contact_validation,
    fit_validation: validation.fit_validation,
    score: scored,
  });
  const canonical = buildCanonicalLead({ normalized, validation, scored, policy, now: options.now });
  const legacy = canonicalToLegacy(canonical, normalized, options.slotIndex || 0);

  if (validation.record_status !== RECORD_STATUS.ACCEPTED || legacy.tier === "Reject") {
    return {
      raw: normalized,
      canonical,
      legacy,
      slotIndex: options.slotIndex || 0,
      error: {
        company: legacy.company || undefined,
        phone: legacy.phone || undefined,
        field: validation.record_status === RECORD_STATUS.REJECTED ? "fit" : "validation",
        code: validation.record_status === RECORD_STATUS.REJECTED ? "rejected_fit" : "quarantined_lead",
        message: validation.reasons.join(" "),
      },
    };
  }

  return { raw: normalized, canonical, legacy, slotIndex: options.slotIndex || 0 };
}

function canonicalToLegacy(lead, raw = {}, slotIndex = 0) {
  const tier = lead.tier || "Reject";
  const status = tier === "A-tier" ? "ready_to_call" : tier === "B-tier" ? "ready_to_email" : tier === "C-tier" ? "needs_enrichment" : "rejected";
  return {
    lead_id: lead.lead_id,
    company: lead.company_name || raw.company_name || "",
    contact_name: lead.contact_name || raw.contact_name || "",
    phone: raw.phone || lead.normalized_phone || "",
    normalized_phone: lead.normalized_phone || "",
    email: lead.email || "",
    website_url: lead.website || "",
    industry: lead.industry || "",
    city: lead.city || "",
    state: lead.state || "",
    source_url: lead.source_url || "",
    notes: raw.intent_evidence_summary || raw.source_evidence || "",
    buying_signal: raw.intent_type || "",
    pain_signal: raw.pain_point || "",
    timezone: lead.timezone || "",
    score: lead.score || 0,
    tier,
    score_reasons: Array.isArray(lead.score_reasons) ? lead.score_reasons : [],
    status,
    suggested_owner: tier === "A-tier" ? "jarvis" : tier === "B-tier" || tier === "C-tier" ? "cowork" : "codex",
    scheduled_call_local: tier === "A-tier" ? scheduledLocalBusinessTime(lead.timezone || "America/New_York", slotIndex) : null,
    created_at: lead.created_at || new Date().toISOString(),
  };
}

function legacyToCanonical(lead = {}) {
  return {
    lead_id: lead.lead_id,
    company_name: lead.company,
    contact_name: lead.contact_name,
    normalized_phone: lead.normalized_phone,
    email: lead.email,
    website: lead.website_url,
    industry: lead.industry,
    city: lead.city,
    state: lead.state,
    timezone: lead.timezone,
    source_url: lead.source_url,
    source_type: "legacy_call_import",
    source_evidence: lead.notes,
    discovered_at: "",
    imported_at: lead.created_at,
    last_validated_at: lead.created_at,
    contact_validation: {},
    fit_validation: {},
    score: lead.score,
    tier: lead.tier,
    score_reasons: lead.score_reasons || [],
    pipeline_stage: lead.status,
    eligibility: lead.status === "ready_to_call" ? "call_eligible" : lead.status === "ready_to_email" ? "email_eligible" : lead.status === "needs_enrichment" ? "enrich" : "rejected",
    next_action: "none",
    enrichment_status: lead.status === "needs_enrichment" ? "queued" : "not_required",
    external_outreach_allowed: false,
    record_status: lead.status === "rejected" ? "rejected" : "accepted",
    schema_version: "phase1.v1",
    version: 1,
    created_at: lead.created_at,
    updated_at: lead.created_at,
  };
}

function normalizeKey(key) {
  return String(key || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

function scheduledLocalBusinessTime(timezone, slotIndex) {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  local.setSeconds(0, 0);
  if (local.getHours() >= 17) local.setDate(local.getDate() + 1);
  if (local.getHours() < 9 || local.getHours() >= 17) local.setHours(9, 0, 0, 0);
  local.setMinutes(local.getMinutes() + slotIndex * 12);
  while (local.getHours() >= 17 || local.getDay() === 0 || local.getDay() === 6) {
    local.setDate(local.getDate() + 1);
    local.setHours(9, 0, 0, 0);
  }
  return `${local.toISOString().slice(0, 16)} ${timezone}`;
}
