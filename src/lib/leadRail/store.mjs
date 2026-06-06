// ─── Phase 1 lead rail: canonical Supabase store (hermes_pipeline) ─────────────
//
// Supabase `hermes_pipeline` is the AUTHORITATIVE lead store. This module owns:
//   - deterministic-id upsert (on_conflict=lead_id);
//   - read-after-write verification;
//   - optimistic concurrency (a `version` counter; a stale/conflicting write is
//     refused, never silently overwriting a newer row);
//   - honest failure: a write that cannot be confirmed reports `persistence_pending`
//     rather than pretending success;
//   - local write-through cache + quarantine artifact (NEVER an independent source
//     of truth — they are caches/reports/recovery evidence only).
//
// It reuses the exact env resolver and service-key REST pattern already used by
// revenueEngineSupabaseStore / socialSupabaseStore. No secret is ever returned. The
// store is injectable (options.client) so tests drive every failure path.

import { promises as fs } from "node:fs";
import path from "node:path";

import { getSupabaseConfig } from "../socialSupabaseStore.mjs";

export const HERMES_PIPELINE_TABLE = process.env.HERMES_PIPELINE_TABLE || "hermes_pipeline";

// Persistence outcomes (per lead).
export const PERSISTENCE = {
  PERSISTED: "persisted",
  PENDING: "persistence_pending",
  VERSION_CONFLICT: "version_conflict",
  STALE: "stale_skipped",
};

const TIMESTAMP_FIELDS = new Set(["discovered_at", "imported_at", "last_validated_at", "created_at", "updated_at"]);
const JSON_FIELDS = new Set(["contact_validation", "fit_validation", "score_reasons", "quarantine_reasons"]);
const COLUMN_FIELDS = [
  "lead_id", "company_name", "contact_name", "normalized_phone", "email", "website",
  "industry", "city", "state", "timezone", "source_url", "source_type", "source_evidence",
  "discovered_at", "imported_at", "last_validated_at", "contact_validation", "fit_validation",
  "score", "tier", "score_reasons", "pipeline_stage", "eligibility", "next_action",
  "enrichment_status", "record_status", "schema_version", "version", "created_at", "updated_at",
];

function clean(v) {
  return String(v ?? "").trim();
}
function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

/** Map a canonical lead → DB row (typed columns + lossless raw_payload jsonb). */
export function leadToRow(lead) {
  const row = {};
  for (const f of COLUMN_FIELDS) {
    let value = lead[f];
    if (TIMESTAMP_FIELDS.has(f) && (value === "" || value === undefined)) value = null;
    if (JSON_FIELDS.has(f) && value === undefined) value = null;
    row[f] = value === undefined ? null : value;
  }
  row.raw_payload = clone(lead);
  return row;
}

function rowToLead(row) {
  if (row && row.raw_payload && typeof row.raw_payload === "object") return clone(row.raw_payload);
  return row ? clone(row) : null;
}

/** Config description WITHOUT secrets. */
export function describePipelineConfig() {
  const cfg = getSupabaseConfig();
  return {
    configured: Boolean(cfg),
    table: HERMES_PIPELINE_TABLE,
    schema_file: "supabase/hermes_pipeline_schema.sql",
    present: {
      supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
      service_key: Boolean(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    reason: cfg ? "configured" : "supabase_not_configured",
  };
}

function headers(key) {
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

/**
 * Default Supabase-backed client. Returns null when Supabase is unconfigured.
 * The client interface (also what tests inject):
 *   read(lead_id)   → lead | null
 *   write(row)      → { ok, error? }   (throws/returns !ok ⇒ persistence_pending)
 *   readBack(lead_id)→ lead | null
 */
export function makeSupabaseClient(options = {}) {
  const cfg = options.config || getSupabaseConfig();
  if (!cfg) return null;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const base = `${cfg.url.replace(/\/$/, "")}/rest/v1/${HERMES_PIPELINE_TABLE}`;

  async function read(lead_id) {
    const res = await fetchImpl(`${base}?lead_id=eq.${encodeURIComponent(lead_id)}&select=raw_payload,version&limit=1`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rowToLead(rows[0]) : null;
  }
  async function write(row) {
    const res = await fetchImpl(`${base}?on_conflict=lead_id`, {
      method: "POST",
      headers: { ...headers(cfg.key), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `write_failed_${res.status}:${text.slice(0, 200)}` };
    }
    return { ok: true };
  }
  return { read, write, readBack: read, configured: true };
}

/**
 * Upsert canonical leads with read-after-write verification + optimistic
 * concurrency. Returns { ok, configured, results[], persisted, pending, conflicts,
 * stale }. NEVER reports success it cannot confirm.
 *
 * @param {object} options { client?, config?, fetchImpl?, now? }
 */
export async function upsertLeads(records = [], options = {}) {
  const recs = Array.isArray(records) ? records : [];
  const client = options.client || makeSupabaseClient(options);
  if (!client) {
    return {
      ok: false, configured: false, reason: "supabase_not_configured",
      results: recs.map((r) => ({ lead_id: r.lead_id, status: PERSISTENCE.PENDING, reason: "supabase_not_configured" })),
      persisted: 0, pending: recs.length, conflicts: 0, stale: 0,
    };
  }

  const results = [];
  for (const rec of recs) {
    results.push(await upsertOne(client, rec));
  }
  return {
    ok: results.every((r) => r.status === PERSISTENCE.PERSISTED),
    configured: true,
    results,
    persisted: results.filter((r) => r.status === PERSISTENCE.PERSISTED).length,
    pending: results.filter((r) => r.status === PERSISTENCE.PENDING).length,
    conflicts: results.filter((r) => r.status === PERSISTENCE.VERSION_CONFLICT).length,
    stale: results.filter((r) => r.status === PERSISTENCE.STALE).length,
  };
}

async function upsertOne(client, rec) {
  const lead_id = clean(rec.lead_id);
  if (!lead_id) return { lead_id: "", status: PERSISTENCE.PENDING, reason: "missing_lead_id" };
  const targetVersion = Number(rec.version || 1);
  const baseVersion = targetVersion - 1;

  // 1. Optimistic concurrency: refuse to overwrite a newer row.
  let current = null;
  try {
    current = await client.read(lead_id);
  } catch (err) {
    return { lead_id, status: PERSISTENCE.PENDING, reason: `read_error:${clean(err?.message)}` };
  }
  if (current) {
    const curVersion = Number(current.version || 1);
    if (curVersion > baseVersion) {
      // Another writer advanced this row since we built `rec`.
      const curFresh = Date.parse(clean(current.last_validated_at) || clean(current.updated_at));
      const recFresh = Date.parse(clean(rec.last_validated_at) || clean(rec.updated_at));
      if (!Number.isNaN(curFresh) && !Number.isNaN(recFresh) && curFresh > recFresh) {
        return { lead_id, status: PERSISTENCE.STALE, reason: "existing_row_is_newer", current_version: curVersion };
      }
      return { lead_id, status: PERSISTENCE.VERSION_CONFLICT, reason: "version_advanced_concurrently", current_version: curVersion, attempted_version: targetVersion };
    }
  }

  // 2. Write.
  let wrote;
  try {
    wrote = await client.write(leadToRow(rec));
  } catch (err) {
    return { lead_id, status: PERSISTENCE.PENDING, reason: `write_error:${clean(err?.message)}` };
  }
  if (!wrote || !wrote.ok) {
    return { lead_id, status: PERSISTENCE.PENDING, reason: wrote?.error || "write_not_ok" };
  }

  // 3. Read-after-write verification.
  let readBack;
  try {
    readBack = await client.readBack(lead_id);
  } catch (err) {
    return { lead_id, status: PERSISTENCE.PENDING, reason: `read_back_error:${clean(err?.message)}` };
  }
  if (!readBack || clean(readBack.lead_id) !== lead_id) {
    return { lead_id, status: PERSISTENCE.PENDING, reason: "read_after_write_missing" };
  }
  if (Number(readBack.version || 0) !== targetVersion) {
    return { lead_id, status: PERSISTENCE.PENDING, reason: `read_after_write_version_mismatch:${readBack.version}!=${targetVersion}` };
  }
  return { lead_id, status: PERSISTENCE.PERSISTED, read_back_id: lead_id, version: targetVersion };
}

/** Read all canonical leads (for dedupe against existing). [] when unconfigured. */
export async function readAllLeads(options = {}) {
  const cfg = options.config || getSupabaseConfig();
  if (!cfg) return [];
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  try {
    const res = await fetchImpl(`${cfg.url.replace(/\/$/, "")}/rest/v1/${HERMES_PIPELINE_TABLE}?select=raw_payload,version`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows.map(rowToLead).filter(Boolean) : [];
  } catch {
    return [];
  }
}

// ── Local write-through cache + quarantine artifact (NOT a source of truth) ─────

export function leadRailDataDir(options = {}) {
  return options.dataDir || process.env.LEAD_RAIL_DATA_DIR || path.join(process.cwd(), "data", "lead-rail");
}

export async function writeCache(records, options = {}) {
  const dir = leadRailDataDir(options);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "pipeline-cache.json");
  await fs.writeFile(file, `${JSON.stringify({ generated_at: options.now || new Date().toISOString(), count: records.length, leads: records }, null, 2)}\n`, "utf8");
  return file;
}

export async function readCache(options = {}) {
  const file = path.join(leadRailDataDir(options), "pipeline-cache.json");
  try {
    const doc = JSON.parse(await fs.readFile(file, "utf8"));
    return Array.isArray(doc.leads) ? doc.leads : [];
  } catch {
    return [];
  }
}

export async function writeQuarantine(records, options = {}) {
  const dir = leadRailDataDir(options);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "quarantine.json");
  // Append-merge by lead_id so rejected/quarantined history is never lost.
  let existing = [];
  try { existing = JSON.parse(await fs.readFile(file, "utf8")).records || []; } catch { /* none */ }
  const byId = new Map(existing.map((r) => [clean(r.lead_id) || JSON.stringify(r), r]));
  for (const r of records) byId.set(clean(r.lead_id) || JSON.stringify(r), { ...r, quarantined_at: options.now || new Date().toISOString() });
  const merged = [...byId.values()];
  await fs.writeFile(file, `${JSON.stringify({ generated_at: options.now || new Date().toISOString(), count: merged.length, records: merged }, null, 2)}\n`, "utf8");
  return file;
}
