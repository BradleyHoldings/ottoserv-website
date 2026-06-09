import { getSupabaseConfig } from "../socialSupabaseStore.mjs";

export const CALL_INTENT_TABLE = process.env.HERMES_CALL_INTENT_TABLE || "hermes_call_executions";
export const CALL_EVIDENCE_TABLE = process.env.HERMES_CALL_EVIDENCE_TABLE || "hermes_call_evidence";
export const CALL_CLAIM_RPC = process.env.HERMES_CALL_CLAIM_RPC || "hermes_call_claim_cas";
export const CALL_UPSERT_RPC = process.env.HERMES_CALL_UPSERT_RPC || "hermes_call_upsert_cas";

export const PERSISTENCE = {
  PERSISTED: "persisted",
  PENDING: "persistence_pending",
  VERSION_CONFLICT: "version_conflict",
  DUPLICATE: "duplicate_idempotency",
};

function clean(v) { return String(v ?? "").trim(); }
function headers(key) { return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` }; }

export function describeCallStoreConfig() {
  const cfg = getSupabaseConfig();
  return {
    configured: Boolean(cfg),
    tables: { intents: CALL_INTENT_TABLE, evidence: CALL_EVIDENCE_TABLE },
    schema_file: "supabase/hermes_call_execution_schema.sql",
    reason: cfg ? "configured" : "supabase_not_configured",
  };
}

export function makeCallClient(options = {}) {
  const cfg = options.config || getSupabaseConfig();
  if (!cfg) return null;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const root = cfg.url.replace(/\/$/, "");

  async function readIntent(execution_id) {
    const res = await fetchImpl(`${root}/rest/v1/${CALL_INTENT_TABLE}?execution_id=eq.${encodeURIComponent(execution_id)}&select=raw_intent,version,state&limit=1`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`call_intent_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  async function upsertIntent(intent, expectedVersion) {
    const res = await fetchImpl(`${root}/rest/v1/rpc/${CALL_UPSERT_RPC}`, {
      method: "POST", headers: headers(cfg.key), cache: "no-store",
      body: JSON.stringify({ p_execution_id: intent.execution_id, p_idempotency_key: intent.idempotency_key, p_expected_version: expectedVersion, p_row: intent }),
    });
    if (!res.ok) return { ok: false, error: `call_intent_write_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    const body = await res.json();
    return (Array.isArray(body) ? body[0] : body) || { ok: false, error: "call_intent_empty_result" };
  }

  async function claim(execution_id, owner, leaseSeconds, now) {
    const res = await fetchImpl(`${root}/rest/v1/rpc/${CALL_CLAIM_RPC}`, {
      method: "POST", headers: headers(cfg.key), cache: "no-store",
      body: JSON.stringify({ p_execution_id: execution_id, p_owner: owner, p_lease_seconds: leaseSeconds, p_now: now }),
    });
    if (!res.ok) return { ok: false, error: `call_claim_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    const body = await res.json();
    return (Array.isArray(body) ? body[0] : body) || { ok: false, error: "call_claim_empty_result" };
  }

  async function writeEvidence(row) {
    const res = await fetchImpl(`${root}/rest/v1/${CALL_EVIDENCE_TABLE}?on_conflict=provider_call_id`, {
      method: "POST",
      headers: { ...headers(cfg.key), Prefer: "resolution=ignore-duplicates,return=representation" },
      cache: "no-store",
      body: JSON.stringify([row]),
    });
    if (!res.ok) return { ok: false, error: `call_evidence_write_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    const rows = await res.json().catch(() => []);
    return { ok: true, rows, deduped: Array.isArray(rows) && rows.length === 0 };
  }

  async function readEvidence(provider_call_id) {
    const res = await fetchImpl(`${root}/rest/v1/${CALL_EVIDENCE_TABLE}?provider_call_id=eq.${encodeURIComponent(provider_call_id)}&select=*&limit=1`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`call_evidence_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  async function listActiveIntents() {
    const res = await fetchImpl(`${root}/rest/v1/${CALL_INTENT_TABLE}?select=raw_intent,version,state&state=in.(proposed,approval_required,approved,scheduled,claimed,executing,started_unverified,retry_waiting,blocked)`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`call_active_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function listDashboardIntents(limit = 100) {
    const res = await fetchImpl(`${root}/rest/v1/${CALL_INTENT_TABLE}?select=raw_intent,version,state,updated_at&order=updated_at.desc&limit=${Number(limit) || 100}`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`call_dashboard_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  return { configured: true, readIntent, upsertIntent, claim, writeEvidence, readEvidence, listActiveIntents, listDashboardIntents };
}

export async function persistCallIntent(intent, options = {}) {
  const client = options.client || makeCallClient(options);
  if (!client) return { ok: false, status: PERSISTENCE.PENDING, reason: "supabase_not_configured" };
  const execution_id = clean(intent.execution_id);
  if (!execution_id) return { ok: false, status: PERSISTENCE.PENDING, reason: "missing_execution_id" };

  let current;
  try { current = await client.readIntent(execution_id); }
  catch (err) { return { ok: false, status: PERSISTENCE.PENDING, reason: `read_error:${clean(err?.message)}` }; }

  const expectedVersion = current ? Number(current.version ?? 0) : 0;
  const targetVersion = Number(intent.version ?? 1);
  if (current && targetVersion !== expectedVersion + 1 && targetVersion !== expectedVersion) {
    return { ok: false, status: PERSISTENCE.VERSION_CONFLICT, reason: `non_sequential:${targetVersion}!=${expectedVersion}+1`, current_version: expectedVersion };
  }
  if (!current && targetVersion !== 1) {
    return { ok: false, status: PERSISTENCE.VERSION_CONFLICT, reason: "first_insert_must_be_v1", current_version: 0 };
  }

  const wrote = await client.upsertIntent(intent, expectedVersion);
  if (!wrote?.ok) {
    if (wrote?.status === "duplicate") return { ok: false, status: PERSISTENCE.DUPLICATE, reason: wrote.reason || "duplicate_idempotency_key" };
    if (wrote?.status === "conflict") return { ok: false, status: PERSISTENCE.VERSION_CONFLICT, reason: wrote.reason || "cas_conflict", current_version: wrote.current_version };
    return { ok: false, status: PERSISTENCE.PENDING, reason: wrote?.error || "write_not_ok" };
  }

  let readBack;
  try { readBack = await client.readIntent(execution_id); }
  catch (err) { return { ok: false, status: PERSISTENCE.PENDING, reason: `read_back_error:${clean(err?.message)}` }; }
  if (!readBack) return { ok: false, status: PERSISTENCE.PENDING, reason: "read_after_write_missing" };
  return { ok: true, status: PERSISTENCE.PERSISTED, execution_id, version: Number(readBack.version ?? targetVersion), state: clean(readBack.state) };
}
