// ─── Phase 1 lead rail: canonical Supabase persistence ───────────────────────
// Supabase is authoritative. Local files are cache/recovery evidence only.

import { promises as fs } from "node:fs";
import path from "node:path";
import { getSupabaseConfig } from "../socialSupabaseStore.mjs";

export const HERMES_PIPELINE_TABLE = process.env.HERMES_PIPELINE_TABLE || "hermes_pipeline";
export const HERMES_ALIAS_TABLE = process.env.HERMES_ALIAS_TABLE || "hermes_lead_aliases";
export const HERMES_ENRICHMENT_TABLE = process.env.HERMES_ENRICHMENT_TABLE || "hermes_enrichment_tasks";
export const HERMES_CAS_RPC = process.env.HERMES_CAS_RPC || "hermes_upsert_pipeline_cas";

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

function clean(v) { return String(v ?? "").trim(); }
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
function samePayload(a, b) {
  const strip = (v) => { const x = clone(v || {}); delete x.updated_at; return x; };
  return stable(strip(a)) === stable(strip(b));
}

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
  if (row?.raw_payload && typeof row.raw_payload === "object") return clone(row.raw_payload);
  return row ? clone(row) : null;
}

export function describePipelineConfig() {
  const cfg = getSupabaseConfig();
  return {
    configured: Boolean(cfg), table: HERMES_PIPELINE_TABLE,
    schema_file: "supabase/hermes_pipeline_schema.sql",
    present: {
      supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
      service_key: Boolean(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    reason: cfg ? "configured" : "supabase_not_configured",
  };
}

function headers(key) { return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` }; }

export function makeSupabaseClient(options = {}) {
  const cfg = options.config || getSupabaseConfig();
  if (!cfg) return null;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const root = cfg.url.replace(/\/$/, "");
  const table = `${root}/rest/v1/${HERMES_PIPELINE_TABLE}`;

  async function read(lead_id) {
    const res = await fetchImpl(`${table}?lead_id=eq.${encodeURIComponent(lead_id)}&select=raw_payload,version&limit=1`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rowToLead(rows[0]) : null;
  }

  async function atomicWrite(row, expectedVersion) {
    const res = await fetchImpl(`${root}/rest/v1/rpc/${HERMES_CAS_RPC}`, {
      method: "POST", headers: headers(cfg.key), cache: "no-store",
      body: JSON.stringify({ p_lead_id: row.lead_id, p_expected_version: expectedVersion, p_row: row }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `cas_write_failed_${res.status}:${text.slice(0, 200)}` };
    }
    const body = await res.json();
    const result = Array.isArray(body) ? body[0] : body;
    return result || { ok: false, error: "cas_empty_result" };
  }

  async function upsertRows(tableName, rows, conflict) {
    if (!rows.length) return { ok: true, count: 0 };
    const res = await fetchImpl(`${root}/rest/v1/${tableName}?on_conflict=${encodeURIComponent(conflict)}`, {
      method: "POST", headers: { ...headers(cfg.key), Prefer: "resolution=merge-duplicates,return=minimal" },
      cache: "no-store", body: JSON.stringify(rows),
    });
    if (!res.ok) return { ok: false, error: `${tableName}_write_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    return { ok: true, count: rows.length };
  }

  async function readAliases(aliasKeys) {
    if (!aliasKeys.length) return [];
    const encoded = aliasKeys.map((x) => `"${x.replaceAll('"', '\\"')}"`).join(",");
    const res = await fetchImpl(`${root}/rest/v1/${HERMES_ALIAS_TABLE}?alias_key=in.(${encodeURIComponent(encoded)})&select=alias_key,lead_id`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`alias_read_failed_${res.status}`);
    return res.json();
  }

  return {
    configured: true, read, readBack: read, atomicWrite,
    writeAliases: (rows) => upsertRows(HERMES_ALIAS_TABLE, rows, "alias_key,lead_id"),
    readAliases,
    writeEnrichmentTasks: (rows) => upsertRows(HERMES_ENRICHMENT_TABLE, rows, "task_id"),
  };
}

export async function upsertLeads(records = [], options = {}) {
  const recs = Array.isArray(records) ? records : [];
  const client = options.client || makeSupabaseClient(options);
  if (!client) return {
    ok: false, configured: false, reason: "supabase_not_configured",
    results: recs.map((r) => ({ lead_id: r.lead_id, status: PERSISTENCE.PENDING, reason: "supabase_not_configured" })),
    persisted: 0, pending: recs.length, conflicts: 0, stale: 0,
  };
  const results = [];
  for (const rec of recs) results.push(await upsertOne(client, rec));
  return summarize(results);
}

function summarize(results) {
  return {
    ok: results.every((r) => r.status === PERSISTENCE.PERSISTED), configured: true, results,
    persisted: results.filter((r) => r.status === PERSISTENCE.PERSISTED).length,
    pending: results.filter((r) => r.status === PERSISTENCE.PENDING).length,
    conflicts: results.filter((r) => r.status === PERSISTENCE.VERSION_CONFLICT).length,
    stale: results.filter((r) => r.status === PERSISTENCE.STALE).length,
  };
}

async function upsertOne(client, rec) {
  const lead_id = clean(rec.lead_id);
  if (!lead_id) return { lead_id: "", status: PERSISTENCE.PENDING, reason: "missing_lead_id" };
  const targetVersion = Number(rec.version ?? 1);
  if (!Number.isInteger(targetVersion) || targetVersion < 1) return { lead_id, status: PERSISTENCE.PENDING, reason: "invalid_target_version" };

  let current;
  try { current = await client.read(lead_id); }
  catch (err) { return { lead_id, status: PERSISTENCE.PENDING, reason: `read_error:${clean(err?.message)}` }; }

  const currentVersion = current ? Number(current.version ?? 1) : 0;
  if (current) {
    if (targetVersion < currentVersion) return { lead_id, status: PERSISTENCE.STALE, reason: "stored_version_is_newer", current_version: currentVersion, attempted_version: targetVersion };
    if (targetVersion === currentVersion) {
      if (samePayload(current, rec)) return { lead_id, status: PERSISTENCE.PERSISTED, idempotent: true, read_back_id: lead_id, version: targetVersion };
      return { lead_id, status: PERSISTENCE.VERSION_CONFLICT, reason: "same_version_different_payload", current_version: currentVersion, attempted_version: targetVersion };
    }
    if (targetVersion !== currentVersion + 1) return { lead_id, status: PERSISTENCE.VERSION_CONFLICT, reason: "non_sequential_version", current_version: currentVersion, attempted_version: targetVersion };
  } else if (targetVersion !== 1) {
    return { lead_id, status: PERSISTENCE.VERSION_CONFLICT, reason: "first_insert_must_be_version_1", current_version: 0, attempted_version: targetVersion };
  }

  let wrote;
  try {
    if (typeof client.atomicWrite === "function") wrote = await client.atomicWrite(leadToRow(rec), currentVersion);
    else if (typeof client.write === "function") wrote = await client.write(leadToRow(rec)); // injected legacy test client only
    else wrote = { ok: false, error: "atomic_write_unavailable" };
  } catch (err) { return { lead_id, status: PERSISTENCE.PENDING, reason: `write_error:${clean(err?.message)}` }; }

  if (!wrote?.ok) {
    if (wrote?.status === "stale") return { lead_id, status: PERSISTENCE.STALE, reason: wrote.reason || "atomic_stale", current_version: wrote.current_version };
    if (wrote?.status === "conflict") return { lead_id, status: PERSISTENCE.VERSION_CONFLICT, reason: wrote.reason || "atomic_conflict", current_version: wrote.current_version, attempted_version: targetVersion };
    return { lead_id, status: PERSISTENCE.PENDING, reason: wrote?.error || "write_not_ok" };
  }

  let readBack;
  try { readBack = await client.readBack(lead_id); }
  catch (err) { return { lead_id, status: PERSISTENCE.PENDING, reason: `read_back_error:${clean(err?.message)}` }; }
  if (!readBack || clean(readBack.lead_id) !== lead_id) return { lead_id, status: PERSISTENCE.PENDING, reason: "read_after_write_missing" };
  if (Number(readBack.version ?? 0) !== targetVersion) return { lead_id, status: PERSISTENCE.PENDING, reason: `read_after_write_version_mismatch:${readBack.version}!=${targetVersion}` };
  if (!samePayload(readBack, rec)) return { lead_id, status: PERSISTENCE.PENDING, reason: "read_after_write_payload_mismatch" };
  return { lead_id, status: PERSISTENCE.PERSISTED, read_back_id: lead_id, version: targetVersion };
}

export function aliasRowsFromReconciliation(aliases = [], now = new Date().toISOString()) {
  const rows = [];
  for (const item of aliases || []) for (const c of item.changed || []) {
    for (const value of [c.from, c.to]) if (clean(value)) rows.push({ alias_key: `${c.kind}:${clean(value).toLowerCase()}`, lead_id: item.lead_id, created_at: now });
  }
  return [...new Map(rows.map((r) => [`${r.alias_key}|${r.lead_id}`, r])).values()];
}

export async function persistAliases(aliases = [], options = {}) {
  const client = options.client || makeSupabaseClient(options);
  const rows = aliasRowsFromReconciliation(aliases, options.now);
  if (!client) return { ok: false, configured: false, count: 0, reason: "supabase_not_configured" };
  if (!rows.length) return { ok: true, configured: true, count: 0 };
  if (typeof client.writeAliases !== "function") return { ok: false, configured: true, count: 0, reason: "alias_writer_unavailable" };
  const result = await client.writeAliases(rows);
  return { configured: true, count: result?.ok ? rows.length : 0, ...result };
}

export async function lookupAliases(aliasKeys = [], options = {}) {
  const client = options.client || makeSupabaseClient(options);
  if (!client || typeof client.readAliases !== "function") return [];
  return client.readAliases(aliasKeys.map((x) => clean(x).toLowerCase()).filter(Boolean));
}

export async function persistEnrichmentTasks(tasks = [], options = {}) {
  const client = options.client || makeSupabaseClient(options);
  const rows = (tasks || []).map((t) => ({
    task_id: t.task_id, lead_id: t.lead_id, task_type: t.task_type || "enrich_lead_contact", actor: t.actor || "Cowork",
    status: t.status || "queued", attempt: Number(t.attempt || 0), payload: clone(t), result: t.result || null,
    blocked_reason: t.blocked_reason || null, created_at: t.created_at || options.now || new Date().toISOString(),
    queued_at: t.queued_at || null, updated_at: t.updated_at || options.now || new Date().toISOString(), completed_at: t.completed_at || null,
  }));
  if (!client) return { ok: false, configured: false, count: 0, reason: "supabase_not_configured" };
  if (!rows.length) return { ok: true, configured: true, count: 0 };
  if (typeof client.writeEnrichmentTasks !== "function") return { ok: false, configured: true, count: 0, reason: "enrichment_writer_unavailable" };
  const result = await client.writeEnrichmentTasks(rows);
  return { configured: true, count: result?.ok ? rows.length : 0, ...result };
}

export async function readAllLeads(options = {}) {
  const cfg = options.config || getSupabaseConfig();
  if (!cfg) return [];
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  try {
    const res = await fetchImpl(`${cfg.url.replace(/\/$/, "")}/rest/v1/${HERMES_PIPELINE_TABLE}?select=raw_payload,version`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows.map(rowToLead).filter(Boolean) : [];
  } catch { return []; }
}

export function leadRailDataDir(options = {}) { return options.dataDir || process.env.LEAD_RAIL_DATA_DIR || path.join(process.cwd(), "data", "lead-rail"); }
export async function writeCache(records, options = {}) {
  const dir = leadRailDataDir(options); await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "pipeline-cache.json");
  await fs.writeFile(file, `${JSON.stringify({ generated_at: options.now || new Date().toISOString(), count: records.length, leads: records }, null, 2)}\n`, "utf8");
  return file;
}
export async function readCache(options = {}) {
  try { const doc = JSON.parse(await fs.readFile(path.join(leadRailDataDir(options), "pipeline-cache.json"), "utf8")); return Array.isArray(doc.leads) ? doc.leads : []; }
  catch { return []; }
}
export async function writeQuarantine(records, options = {}) {
  const dir = leadRailDataDir(options); await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "quarantine.json");
  let existing = []; try { existing = JSON.parse(await fs.readFile(file, "utf8")).records || []; } catch {}
  const byId = new Map(existing.map((r) => [clean(r.lead_id) || JSON.stringify(r), r]));
  for (const r of records) byId.set(clean(r.lead_id) || JSON.stringify(r), { ...r, quarantined_at: options.now || new Date().toISOString() });
  const merged = [...byId.values()];
  await fs.writeFile(file, `${JSON.stringify({ generated_at: options.now || new Date().toISOString(), count: merged.length, records: merged }, null, 2)}\n`, "utf8");
  return file;
}
