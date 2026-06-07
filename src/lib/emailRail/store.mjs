// ─── Phase 2 email execution rail: durable Supabase store ─────────────────────
//
// Supabase is authoritative. Local JSON is cache/recovery/evidence only. This
// module persists durable email intents, the atomic claim/lease, provider
// evidence, and replies — each through database-enforced guarantees (unique
// idempotency key, atomic CAS claim, lease ownership/expiry, FK to canonical lead,
// unique provider message identity). It mirrors leadRail/store.mjs and reuses the
// same Supabase config. It NEVER returns [] for a failed read (four-state read).

import { promises as fs } from "node:fs";
import path from "node:path";
import { getSupabaseConfig } from "../socialSupabaseStore.mjs";

export const EMAIL_INTENT_TABLE = process.env.HERMES_EMAIL_INTENT_TABLE || "hermes_email_executions";
export const EMAIL_REPLY_TABLE = process.env.HERMES_EMAIL_REPLY_TABLE || "hermes_email_replies";
export const EMAIL_EVIDENCE_TABLE = process.env.HERMES_EMAIL_EVIDENCE_TABLE || "hermes_email_evidence";
export const EMAIL_CLAIM_RPC = process.env.HERMES_EMAIL_CLAIM_RPC || "hermes_email_claim_cas";
export const EMAIL_UPSERT_RPC = process.env.HERMES_EMAIL_UPSERT_RPC || "hermes_email_upsert_cas";

export const PERSISTENCE = {
  PERSISTED: "persisted",
  PENDING: "persistence_pending",
  VERSION_CONFLICT: "version_conflict",
  DUPLICATE: "duplicate_idempotency",
};

export const AUTHORITATIVE_READ = {
  ROWS: "rows",
  EMPTY: "empty",
  READ_FAILED: "read_failed",
  UNCONFIGURED: "unconfigured",
};

function clean(v) { return String(v ?? "").trim(); }
function headers(key) { return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` }; }

export function describeStoreConfig() {
  const cfg = getSupabaseConfig();
  return {
    configured: Boolean(cfg),
    tables: { intents: EMAIL_INTENT_TABLE, replies: EMAIL_REPLY_TABLE, evidence: EMAIL_EVIDENCE_TABLE },
    schema_file: "supabase/hermes_email_execution_schema.sql",
    reason: cfg ? "configured" : "supabase_not_configured",
  };
}

/**
 * Build the authoritative Supabase client for the email rail. Returns null when
 * Supabase is unconfigured. All read methods THROW on transport failure so callers
 * can distinguish a failed read from a genuinely empty result.
 */
export function makeEmailClient(options = {}) {
  const cfg = options.config || getSupabaseConfig();
  if (!cfg) return null;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const root = cfg.url.replace(/\/$/, "");

  async function readIntent(execution_id) {
    const res = await fetchImpl(`${root}/rest/v1/${EMAIL_INTENT_TABLE}?execution_id=eq.${encodeURIComponent(execution_id)}&select=raw_intent,version,state&limit=1`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`intent_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  // Atomic upsert of the intent row via CAS RPC (one-writer on the intent's own
  // version; unique idempotency_key enforced by the DB).
  async function upsertIntent(intent, expectedVersion) {
    const res = await fetchImpl(`${root}/rest/v1/rpc/${EMAIL_UPSERT_RPC}`, {
      method: "POST", headers: headers(cfg.key), cache: "no-store",
      body: JSON.stringify({ p_execution_id: intent.execution_id, p_idempotency_key: intent.idempotency_key, p_expected_version: expectedVersion, p_row: intent }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `intent_write_failed_${res.status}:${text.slice(0, 200)}` };
    }
    const body = await res.json();
    return (Array.isArray(body) ? body[0] : body) || { ok: false, error: "intent_empty_result" };
  }

  // Atomic claim: database-enforced one-winner. Sets lease_owner + lease_expires_at
  // only if currently unclaimed OR the existing lease has expired. Returns the
  // structured CAS result; exactly one concurrent caller can win.
  async function claim(execution_id, owner, leaseSeconds, now) {
    const res = await fetchImpl(`${root}/rest/v1/rpc/${EMAIL_CLAIM_RPC}`, {
      method: "POST", headers: headers(cfg.key), cache: "no-store",
      body: JSON.stringify({ p_execution_id: execution_id, p_owner: owner, p_lease_seconds: leaseSeconds, p_now: now }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `claim_failed_${res.status}:${text.slice(0, 200)}` };
    }
    const body = await res.json();
    return (Array.isArray(body) ? body[0] : body) || { ok: false, error: "claim_empty_result" };
  }

  // Insert provider evidence with unique provider_message_id. Idempotent: a repeat
  // insert of the same message id is ignored (never duplicated).
  async function writeEvidence(row) {
    const res = await fetchImpl(`${root}/rest/v1/${EMAIL_EVIDENCE_TABLE}?on_conflict=provider_message_id`, {
      method: "POST", headers: { ...headers(cfg.key), Prefer: "resolution=ignore-duplicates,return=representation" },
      cache: "no-store", body: JSON.stringify([row]),
    });
    if (!res.ok) return { ok: false, error: `evidence_write_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    const rows = await res.json().catch(() => []);
    return { ok: true, rows };
  }

  async function readEvidence(provider_message_id) {
    const res = await fetchImpl(`${root}/rest/v1/${EMAIL_EVIDENCE_TABLE}?provider_message_id=eq.${encodeURIComponent(provider_message_id)}&select=*&limit=1`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`evidence_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  // Insert a reply with unique provider event identity (dedupe at the DB).
  async function writeReply(row) {
    const res = await fetchImpl(`${root}/rest/v1/${EMAIL_REPLY_TABLE}?on_conflict=provider_event_id`, {
      method: "POST", headers: { ...headers(cfg.key), Prefer: "resolution=ignore-duplicates,return=representation" },
      cache: "no-store", body: JSON.stringify([row]),
    });
    if (!res.ok) return { ok: false, error: `reply_write_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    const rows = await res.json().catch(() => []);
    return { ok: true, rows, deduped: Array.isArray(rows) && rows.length === 0 };
  }

  async function listActiveIntents() {
    const res = await fetchImpl(`${root}/rest/v1/${EMAIL_INTENT_TABLE}?select=raw_intent,version,state&state=in.(proposed,approval_required,approved,scheduled,claimed,executing,sent_unverified,retry_waiting,blocked)`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`active_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function listDashboardIntents(limit = 100) {
    const res = await fetchImpl(`${root}/rest/v1/${EMAIL_INTENT_TABLE}?select=raw_intent,version,state,updated_at&order=updated_at.desc&limit=${Number(limit) || 100}`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`dashboard_intents_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function listRecentReplies(limit = 100) {
    const res = await fetchImpl(`${root}/rest/v1/${EMAIL_REPLY_TABLE}?select=*&order=received_at.desc&limit=${Number(limit) || 100}`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`replies_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  return { configured: true, readIntent, upsertIntent, claim, writeEvidence, readEvidence, writeReply, listActiveIntents, listDashboardIntents, listRecentReplies };
}

/**
 * Persist an intent with read-after-write verification. Returns a structured result.
 * Uses the injected client (production: makeEmailClient; tests: a fake).
 */
export async function persistIntent(intent, options = {}) {
  const client = options.client || makeEmailClient(options);
  if (!client) return { ok: false, status: PERSISTENCE.PENDING, reason: "supabase_not_configured" };
  const execution_id = clean(intent.execution_id);
  if (!execution_id) return { ok: false, status: PERSISTENCE.PENDING, reason: "missing_execution_id" };

  let current;
  try { current = await client.readIntent(execution_id); }
  catch (err) { return { ok: false, status: PERSISTENCE.PENDING, reason: `read_error:${clean(err?.message)}` }; }

  const expectedVersion = current ? Number(current.version ?? 0) : 0;
  // The incoming intent must be exactly one ahead of the stored version (or a v1
  // first insert), enforcing sequential optimistic concurrency.
  const targetVersion = Number(intent.version ?? 1);
  if (current && targetVersion !== expectedVersion + 1 && targetVersion !== expectedVersion) {
    return { ok: false, status: PERSISTENCE.VERSION_CONFLICT, reason: `non_sequential:${targetVersion}!=${expectedVersion}+1`, current_version: expectedVersion };
  }
  if (!current && targetVersion !== 1) {
    return { ok: false, status: PERSISTENCE.VERSION_CONFLICT, reason: "first_insert_must_be_v1", current_version: 0 };
  }

  let wrote;
  try { wrote = await client.upsertIntent(intent, expectedVersion); }
  catch (err) { return { ok: false, status: PERSISTENCE.PENDING, reason: `write_error:${clean(err?.message)}` }; }
  if (!wrote?.ok) {
    if (wrote?.status === "duplicate") return { ok: false, status: PERSISTENCE.DUPLICATE, reason: wrote.reason || "duplicate_idempotency_key" };
    if (wrote?.status === "conflict") return { ok: false, status: PERSISTENCE.VERSION_CONFLICT, reason: wrote.reason || "cas_conflict", current_version: wrote.current_version };
    return { ok: false, status: PERSISTENCE.PENDING, reason: wrote?.error || "write_not_ok" };
  }

  // Read-after-write verification.
  let readBack;
  try { readBack = await client.readIntent(execution_id); }
  catch (err) { return { ok: false, status: PERSISTENCE.PENDING, reason: `read_back_error:${clean(err?.message)}` }; }
  if (!readBack) return { ok: false, status: PERSISTENCE.PENDING, reason: "read_after_write_missing" };
  return { ok: true, status: PERSISTENCE.PERSISTED, execution_id, version: Number(readBack.version ?? targetVersion), state: clean(readBack.state) };
}

// ─── local cache / recovery (evidence only, never authority) ──────────────────
export function emailRailDataDir(options = {}) {
  return options.dataDir || process.env.EMAIL_RAIL_DATA_DIR || path.join(process.cwd(), "data", "email-rail");
}
export async function writeCache(records, options = {}) {
  const dir = emailRailDataDir(options);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "intents-cache.json");
  await fs.writeFile(file, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  return file;
}
