import { getSupabaseConfig } from "../socialSupabaseStore.mjs";

export const OPPORTUNITY_INTENT_TABLE = process.env.HERMES_OPPORTUNITY_INTENT_TABLE || "hermes_opportunity_actions";
export const OPPORTUNITY_BOOKING_TABLE = process.env.HERMES_OPPORTUNITY_BOOKING_TABLE || "hermes_opportunity_booking_evidence";
export const OPPORTUNITY_CLAIM_RPC = process.env.HERMES_OPPORTUNITY_CLAIM_RPC || "hermes_opportunity_claim_cas";
export const OPPORTUNITY_UPSERT_RPC = process.env.HERMES_OPPORTUNITY_UPSERT_RPC || "hermes_opportunity_upsert_cas";

export const PERSISTENCE = {
  PERSISTED: "persisted",
  PENDING: "persistence_pending",
  VERSION_CONFLICT: "version_conflict",
  DUPLICATE: "duplicate_idempotency",
};

function clean(v) { return String(v ?? "").trim(); }
function headers(key) { return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` }; }

export function describeOpportunityStoreConfig() {
  const cfg = getSupabaseConfig();
  return {
    configured: Boolean(cfg),
    tables: { intents: OPPORTUNITY_INTENT_TABLE, bookings: OPPORTUNITY_BOOKING_TABLE },
    schema_file: "supabase/hermes_opportunity_actions_schema.sql",
    reason: cfg ? "configured" : "supabase_not_configured",
  };
}

export function makeOpportunityClient(options = {}) {
  const cfg = options.config || getSupabaseConfig();
  if (!cfg) return null;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const root = cfg.url.replace(/\/$/, "");

  async function readIntent(intent_id) {
    const res = await fetchImpl(`${root}/rest/v1/${OPPORTUNITY_INTENT_TABLE}?intent_id=eq.${encodeURIComponent(intent_id)}&select=raw_intent,version,lifecycle_state&limit=1`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`opportunity_intent_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  async function upsertIntent(intent, expectedVersion) {
    const res = await fetchImpl(`${root}/rest/v1/rpc/${OPPORTUNITY_UPSERT_RPC}`, {
      method: "POST", headers: headers(cfg.key), cache: "no-store",
      body: JSON.stringify({ p_intent_id: intent.intent_id, p_idempotency_key: intent.idempotency_key, p_expected_version: expectedVersion, p_row: intent }),
    });
    if (!res.ok) return { ok: false, error: `opportunity_intent_write_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    const body = await res.json();
    return (Array.isArray(body) ? body[0] : body) || { ok: false, error: "opportunity_intent_empty_result" };
  }

  async function claim(intent_id, owner, leaseSeconds, now) {
    const res = await fetchImpl(`${root}/rest/v1/rpc/${OPPORTUNITY_CLAIM_RPC}`, {
      method: "POST", headers: headers(cfg.key), cache: "no-store",
      body: JSON.stringify({ p_intent_id: intent_id, p_owner: owner, p_lease_seconds: leaseSeconds, p_now: now }),
    });
    if (!res.ok) return { ok: false, error: `opportunity_claim_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    const body = await res.json();
    return (Array.isArray(body) ? body[0] : body) || { ok: false, error: "opportunity_claim_empty_result" };
  }

  async function writeBookingEvidence(row) {
    const res = await fetchImpl(`${root}/rest/v1/${OPPORTUNITY_BOOKING_TABLE}?on_conflict=provider_event_id`, {
      method: "POST",
      headers: { ...headers(cfg.key), Prefer: "resolution=ignore-duplicates,return=representation" },
      cache: "no-store",
      body: JSON.stringify([row]),
    });
    if (!res.ok) return { ok: false, error: `booking_evidence_write_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    const rows = await res.json().catch(() => []);
    return { ok: true, rows, deduped: Array.isArray(rows) && rows.length === 0 };
  }

  async function readBookingEvidence(provider_event_id) {
    const res = await fetchImpl(`${root}/rest/v1/${OPPORTUNITY_BOOKING_TABLE}?provider_event_id=eq.${encodeURIComponent(provider_event_id)}&select=*&limit=1`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`booking_evidence_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  async function listDashboardIntents(limit = 100) {
    const res = await fetchImpl(`${root}/rest/v1/${OPPORTUNITY_INTENT_TABLE}?select=raw_intent,version,lifecycle_state,updated_at&order=updated_at.desc&limit=${Number(limit) || 100}`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`opportunity_dashboard_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  return { configured: true, readIntent, upsertIntent, claim, writeBookingEvidence, readBookingEvidence, listDashboardIntents };
}

export async function persistOpportunityIntent(intent, options = {}) {
  const client = options.client || makeOpportunityClient(options);
  if (!client) return { ok: false, status: PERSISTENCE.PENDING, reason: "supabase_not_configured" };
  const intent_id = clean(intent.intent_id);
  if (!intent_id) return { ok: false, status: PERSISTENCE.PENDING, reason: "missing_intent_id" };

  let current;
  try { current = await client.readIntent(intent_id); }
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
    if (wrote?.status === "duplicate") return { ok: false, status: PERSISTENCE.DUPLICATE, reason: wrote.reason || "duplicate_idempotency_key", existing_intent_id: wrote.existing_intent_id };
    if (wrote?.status === "conflict") return { ok: false, status: PERSISTENCE.VERSION_CONFLICT, reason: wrote.reason || "cas_conflict", current_version: wrote.current_version };
    return { ok: false, status: PERSISTENCE.PENDING, reason: wrote?.error || "write_not_ok" };
  }

  let readBack;
  try { readBack = await client.readIntent(intent_id); }
  catch (err) { return { ok: false, status: PERSISTENCE.PENDING, reason: `read_back_error:${clean(err?.message)}` }; }
  if (!readBack) return { ok: false, status: PERSISTENCE.PENDING, reason: "read_after_write_missing" };
  return { ok: true, status: PERSISTENCE.PERSISTED, intent_id, version: Number(readBack.version ?? targetVersion), lifecycle_state: clean(readBack.lifecycle_state) };
}

export async function claimOpportunityIntent(intent_id, options = {}) {
  const client = options.client || makeOpportunityClient(options);
  if (!client) return { ok: false, status: PERSISTENCE.PENDING, reason: "supabase_not_configured" };
  const owner = clean(options.owner) || "Hermes";
  const leaseSeconds = Number(options.leaseSeconds || 300);
  const now = options.now || new Date().toISOString();
  const result = await client.claim(intent_id, owner, leaseSeconds, now);
  if (!result?.ok) return { ok: false, status: result?.status || PERSISTENCE.PENDING, reason: result?.reason || result?.error || "claim_failed", lease_owner: result?.lease_owner };
  return { ok: true, status: "claimed", intent: result.intent || result.raw_intent, lease_expires_at: result.lease_expires_at };
}

export async function writeBookingEvidence(row, options = {}) {
  const client = options.client || makeOpportunityClient(options);
  if (!client) return { ok: false, reason: "supabase_not_configured" };
  if (!clean(row.provider_event_id)) return { ok: false, reason: "missing_provider_event_id" };
  const written = await client.writeBookingEvidence(row);
  if (!written?.ok) return { ok: false, reason: written?.error || "booking_evidence_write_failed" };
  let readBack;
  try { readBack = await client.readBookingEvidence(row.provider_event_id); }
  catch (err) { return { ok: false, reason: `read_back_error:${clean(err?.message)}` }; }
  if (!readBack) return { ok: false, reason: "read_after_write_missing" };
  return { ok: true, deduped: Boolean(written.deduped), row: readBack };
}
