// ─── Phase 1 lead rail: canonical Supabase persistence ───────────────────────
// Supabase is authoritative. Local files are cache/recovery evidence only.

import { promises as fs } from "node:fs";
import path from "node:path";
import { getSupabaseConfig } from "../socialSupabaseStore.mjs";
import { identityKeys } from "./identity.mjs";

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

// dedupe change-object kinds → canonical stored alias-key prefix. The change object
// may describe `normalized_phone`/`email`/`website`; the persisted key is
// `phone:`/`email:`/`domain:` to match identityKeys().
const ALIAS_KIND_PREFIX = { normalized_phone: "phone", phone: "phone", email: "email", website: "domain", domain: "domain", company: "company" };

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

  // Authoritative full read. THROWS on a failed fetch so the caller can distinguish
  // a real read failure from a genuinely empty table (never collapses both to []).
  async function readAll() {
    const res = await fetchImpl(`${table}?select=raw_payload,version`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`read_all_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows.map(rowToLead).filter(Boolean) : [];
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
    // PostgREST in.() list: quote each value (doubling embedded quotes) and let the
    // transport percent-encode separators. THROWS on failure (no silent empty).
    const encoded = aliasKeys.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(",");
    const res = await fetchImpl(`${root}/rest/v1/${HERMES_ALIAS_TABLE}?alias_key=in.(${encodeURIComponent(encoded)})&select=alias_key,lead_id`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`alias_read_failed_${res.status}`);
    return res.json();
  }

  // Global alias ownership: one alias_key belongs to exactly one lead. We
  // insert-or-IGNORE on alias_key (never overwrite an existing owner), then read
  // back and verify every key is owned by the expected lead. A key already owned by
  // a different lead survives the ignore and fails verification → hard conflict.
  async function writeAliases(rows) {
    if (!rows.length) return { ok: true, count: 0 };
    const res = await fetchImpl(`${root}/rest/v1/${HERMES_ALIAS_TABLE}?on_conflict=alias_key`, {
      method: "POST", headers: { ...headers(cfg.key), Prefer: "resolution=ignore-duplicates,return=minimal" },
      cache: "no-store", body: JSON.stringify(rows),
    });
    if (!res.ok) return { ok: false, error: `alias_write_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    let owners;
    try { owners = await readAliases([...new Set(rows.map((r) => r.alias_key))]); }
    catch (err) { return { ok: false, error: `alias_verify_failed:${clean(err?.message)}` }; }
    const ownerOf = new Map((owners || []).map((o) => [clean(o.alias_key).toLowerCase(), clean(o.lead_id)]));
    for (const r of rows) {
      const actual = ownerOf.get(clean(r.alias_key).toLowerCase());
      if (actual && actual !== clean(r.lead_id)) {
        return { ok: false, status: "conflict", error: `alias_owner_conflict:${r.alias_key}:owned_by_${actual}` };
      }
      if (!actual) return { ok: false, error: `alias_not_persisted:${r.alias_key}` };
    }
    return { ok: true, count: rows.length };
  }

  return {
    configured: true, read, readBack: read, readAll, atomicWrite,
    writeAliases, readAliases,
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
    if (targetVersion < currentVersion) {
      // A lower-version write is based on an outdated read. If the stored row is
      // strictly fresher, the incoming import is STALE (drop it). If freshness is
      // equal/unknown or the incoming is fresher, it is a CONFLICT that must be
      // rebased — never silently dropped.
      const curFresh = Date.parse(clean(current.last_validated_at) || clean(current.updated_at));
      const recFresh = Date.parse(clean(rec.last_validated_at) || clean(rec.updated_at));
      if (!Number.isNaN(curFresh) && !Number.isNaN(recFresh) && curFresh > recFresh) {
        return { lead_id, status: PERSISTENCE.STALE, reason: "stored_version_is_newer", current_version: currentVersion, attempted_version: targetVersion };
      }
      return { lead_id, status: PERSISTENCE.VERSION_CONFLICT, reason: "stale_version_needs_rebase", current_version: currentVersion, attempted_version: targetVersion };
    }
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

// Canonical alias key for a dedupe change entry. The change object describes a
// FIELD (normalized_phone/email/website); the stored key uses the canonical prefix.
function changeAliasKey(kind, value) {
  const prefix = ALIAS_KIND_PREFIX[kind] || kind;
  return `${prefix}:${clean(value).toLowerCase()}`;
}

/**
 * Build the full set of alias rows to persist. On EVERY insert/update we write ALL
 * of the lead's current canonical identity keys (so first-insert aliases exist), and
 * on a contact change we additionally write the OLD key (so the previous contact path
 * still resolves to the stable lead_id). One alias_key is owned by exactly one lead.
 */
export function aliasRowsForUpserts(upserts = [], aliasChanges = [], now = new Date().toISOString()) {
  const rows = [];
  for (const lead of upserts || []) {
    const lead_id = clean(lead.lead_id);
    if (!lead_id) continue;
    for (const key of identityKeys(lead)) if (clean(key)) rows.push({ alias_key: clean(key).toLowerCase(), lead_id, created_at: now });
  }
  for (const item of aliasChanges || []) {
    const lead_id = clean(item.lead_id);
    if (!lead_id) continue;
    for (const c of item.changed || []) {
      for (const value of [c.from, c.to]) if (clean(value)) rows.push({ alias_key: changeAliasKey(c.kind, value), lead_id, created_at: now });
    }
  }
  return [...new Map(rows.map((r) => [`${r.alias_key}|${r.lead_id}`, r])).values()];
}

// Back-compat: build alias rows from reconciliation change sets only.
export function aliasRowsFromReconciliation(aliases = [], now = new Date().toISOString()) {
  return aliasRowsForUpserts([], aliases, now);
}

/** Persist already-built alias rows with global-ownership enforcement. */
export async function persistAliasRows(rows = [], options = {}) {
  const client = options.client || makeSupabaseClient(options);
  if (!client) return { ok: false, configured: false, count: 0, reason: "supabase_not_configured" };
  if (!rows.length) return { ok: true, configured: true, count: 0 };
  if (typeof client.writeAliases !== "function") return { ok: false, configured: true, count: 0, reason: "alias_writer_unavailable" };
  const result = await client.writeAliases(rows);
  if (result?.ok) return { ok: true, configured: true, count: rows.length };
  return { ok: false, configured: true, count: 0, status: result?.status, reason: result?.error || result?.reason || "alias_write_failed" };
}

/** Persist aliases derived from full upserts + change sets. */
export async function persistAliases(upserts = [], aliasChanges = [], options = {}) {
  const rows = aliasRowsForUpserts(upserts, aliasChanges, options.now);
  return persistAliasRows(rows, options);
}

export async function lookupAliases(aliasKeys = [], options = {}) {
  const client = options.client || makeSupabaseClient(options);
  if (!client || typeof client.readAliases !== "function") return [];
  return client.readAliases(aliasKeys.map((x) => clean(x).toLowerCase()).filter(Boolean));
}

/**
 * Structured alias lookup with an explicit failure contract so a failed alias read
 * is never silently treated as "no aliases":
 *   { ok, configured, status, rows, reason }
 *   - status=ok ok=true              (rows, possibly empty)
 *   - status=unsupported ok=true     (injected client without alias reads — proceed)
 *   - status=read_failed ok=false    (the read failed — caller must decide)
 *   - status=unconfigured ok=false   (no Supabase)
 */
export async function lookupAliasesResult(aliasKeys = [], options = {}) {
  const client = options.client || makeSupabaseClient(options);
  const keys = (aliasKeys || []).map((x) => clean(x).toLowerCase()).filter(Boolean);
  if (!client) return { ok: false, configured: false, status: "unconfigured", rows: [], reason: "supabase_not_configured" };
  if (typeof client.readAliases !== "function") return { ok: true, configured: true, status: "unsupported", rows: [], reason: "alias_reader_unavailable" };
  try {
    const rows = await client.readAliases(keys);
    return { ok: true, configured: true, status: "ok", rows: Array.isArray(rows) ? rows : [], reason: "read_ok" };
  } catch (err) {
    return { ok: false, configured: true, status: "read_failed", rows: [], reason: `alias_read_failed:${clean(err?.message)}` };
  }
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

export const AUTHORITATIVE_READ = {
  ROWS: "rows",                 // successful read, ≥1 record
  EMPTY: "empty",               // successful read, zero rows (table genuinely empty)
  READ_FAILED: "read_failed",   // the authoritative read itself failed
  UNCONFIGURED: "unconfigured", // no Supabase configured
};

/**
 * Authoritative read with an EXPLICIT four-state contract. NEVER collapses a failed
 * fetch and an empty table into the same []:
 *   { ok, configured, status, rows, reason }
 *   - status=rows   ok=true  configured=true  (≥1 record)
 *   - status=empty  ok=true  configured=true  (zero rows — table is genuinely empty)
 *   - status=read_failed ok=false configured=true (the read failed — do NOT treat as empty)
 *   - status=unconfigured ok=false configured=false (no Supabase)
 */
export async function readAuthoritativeLeads(options = {}) {
  const client = options.client || makeSupabaseClient(options);
  if (!client) return { ok: false, configured: false, status: AUTHORITATIVE_READ.UNCONFIGURED, rows: [], reason: "supabase_not_configured" };
  if (typeof client.readAll !== "function") {
    return { ok: false, configured: true, status: AUTHORITATIVE_READ.READ_FAILED, rows: [], reason: "authoritative_reader_unavailable" };
  }
  try {
    const rows = await client.readAll();
    const list = Array.isArray(rows) ? rows : [];
    return { ok: true, configured: true, status: list.length ? AUTHORITATIVE_READ.ROWS : AUTHORITATIVE_READ.EMPTY, rows: list, reason: list.length ? "read_ok" : "empty_table" };
  } catch (err) {
    return { ok: false, configured: true, status: AUTHORITATIVE_READ.READ_FAILED, rows: [], reason: `authoritative_read_failed:${clean(err?.message)}` };
  }
}

/**
 * Back-compat array reader. Returns rows on a successful read, [] when unconfigured
 * or empty. THROWS on an authoritative read failure so callers cannot silently treat
 * a failed read as an empty database.
 */
export async function readAllLeads(options = {}) {
  const res = await readAuthoritativeLeads(options);
  if (res.status === AUTHORITATIVE_READ.READ_FAILED) throw new Error(res.reason);
  return res.rows;
}

/**
 * Persist a Cowork-enriched lead with SEQUENTIAL version advancement + CAS conflict
 * handling, then persist the completed task. The version is advanced to base+1; if
 * the lead changed while Cowork was working, the CAS write returns a conflict/stale
 * (it is never silently overwritten). Returns { ok, status, lead, task, lead_persistence, task_persistence }.
 */
export async function persistEnrichmentWriteBack(enrichedLead, task, options = {}) {
  const now = options.now || new Date().toISOString();
  const baseVersion = Number(options.baseVersion ?? enrichedLead.version ?? 1);
  const next = { ...enrichedLead, version: baseVersion + 1, updated_at: now };
  const leadPersistence = await upsertLeads([next], { ...options, now });
  const result = leadPersistence.results[0] || { status: PERSISTENCE.PENDING, reason: "no_result" };
  if (result.status !== PERSISTENCE.PERSISTED) {
    return { ok: false, status: result.status, reason: result.reason, lead: next, task, lead_persistence: leadPersistence };
  }
  const taskPersistence = await persistEnrichmentTasks([task], { ...options, now });
  return { ok: taskPersistence.ok !== false, status: "persisted", lead: next, task, lead_persistence: leadPersistence, task_persistence: taskPersistence };
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
