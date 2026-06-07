// ─── Front Office recording rail: durable metadata store ──────────────────────
//
// Persists recording metadata in Supabase (authoritative) and links it to the
// canonical Process Scan. Server-only (service-role). Mirrors the existing
// processScans PostgREST access pattern. Read methods THROW on transport failure
// so a failed read is never collapsed into "absent".

import { getSupabaseConfig } from "../socialSupabaseStore.mjs";

export const RECORDING_TABLE = process.env.RECORDING_TABLE || "process_scan_recordings";

export const PERSISTENCE = {
  PERSISTED: "persisted",
  PENDING: "persistence_pending",
  CONFLICT: "version_conflict",
};

function clean(v) { return String(v ?? "").trim(); }
function headers(key, extra = {}) { return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`, ...extra }; }

export function describeRecordingStore() {
  const cfg = getSupabaseConfig();
  return { configured: Boolean(cfg), table: RECORDING_TABLE, reason: cfg ? "configured" : "supabase_not_configured" };
}

export function makeRecordingStore(options = {}) {
  const cfg = options.config || getSupabaseConfig();
  if (!cfg) return null;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const root = cfg.url.replace(/\/$/, "");
  const table = `${root}/rest/v1/${RECORDING_TABLE}`;

  // Upsert on recording_id (deterministic) → idempotent; never duplicates a row.
  async function upsert(record) {
    const res = await fetchImpl(`${table}?on_conflict=recording_id`, {
      method: "POST",
      headers: headers(cfg.key, { Prefer: "resolution=merge-duplicates,return=representation" }),
      cache: "no-store", body: JSON.stringify([toRow(record)]),
    });
    if (!res.ok) return { ok: false, error: `recording_upsert_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    const rows = await res.json().catch(() => []);
    return { ok: true, row: Array.isArray(rows) ? rows[0] : rows };
  }

  async function readById(recording_id) {
    const res = await fetchImpl(`${table}?recording_id=eq.${encodeURIComponent(recording_id)}&select=*&limit=1`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`recording_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? fromRow(rows[0]) : null;
  }

  async function listByScan(scan_id) {
    const res = await fetchImpl(`${table}?scan_id=eq.${encodeURIComponent(scan_id)}&select=*&order=created_at.desc`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`recording_list_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows.map(fromRow) : [];
  }

  return { configured: true, upsert, readById, listByScan };
}

const COLUMN_FIELDS = [
  "recording_id", "scan_id", "idempotency_key", "attempt", "object_path", "bucket",
  "mime_type", "size_bytes", "checksum_sha256", "audio_included", "upload_state",
  "recording_status", "retry_count", "verified_at", "deleted_at", "fail_reason",
  "schema_version", "version", "created_at", "updated_at",
];
const TS_FIELDS = new Set(["verified_at", "deleted_at", "created_at", "updated_at"]);

function toRow(record) {
  const row = {};
  for (const f of COLUMN_FIELDS) {
    let v = record[f];
    if (TS_FIELDS.has(f) && (v === "" || v === undefined)) v = null;
    row[f] = v === undefined ? null : v;
  }
  row.consent_json = record.consent || null;
  row.history_json = Array.isArray(record.history) ? record.history : [];
  return row;
}
function fromRow(row) {
  const rec = {};
  for (const f of COLUMN_FIELDS) rec[f] = row[f];
  rec.consent = row.consent_json || null;
  rec.history = Array.isArray(row.history_json) ? row.history_json : [];
  return rec;
}

/**
 * Persist a recording record with read-after-write verification. Returns a
 * structured result. Uses the injected store (prod: makeRecordingStore; tests: fake).
 */
export async function persistRecording(record, options = {}) {
  const store = options.store || makeRecordingStore(options);
  if (!store) return { ok: false, status: PERSISTENCE.PENDING, reason: "supabase_not_configured" };
  const id = clean(record.recording_id);
  if (!id) return { ok: false, status: PERSISTENCE.PENDING, reason: "missing_recording_id" };

  const wrote = await store.upsert(record);
  if (!wrote?.ok) return { ok: false, status: PERSISTENCE.PENDING, reason: wrote?.error || "upsert_failed" };

  let readBack;
  try { readBack = await store.readById(id); }
  catch (err) { return { ok: false, status: PERSISTENCE.PENDING, reason: `read_back_failed:${clean(err?.message)}` }; }
  if (!readBack || clean(readBack.recording_id) !== id) return { ok: false, status: PERSISTENCE.PENDING, reason: "read_after_write_missing" };
  if (clean(readBack.upload_state) !== clean(record.upload_state)) {
    return { ok: false, status: PERSISTENCE.CONFLICT, reason: `state_mismatch:${readBack.upload_state}!=${record.upload_state}` };
  }
  return { ok: true, status: PERSISTENCE.PERSISTED, recording_id: id, upload_state: clean(readBack.upload_state) };
}
