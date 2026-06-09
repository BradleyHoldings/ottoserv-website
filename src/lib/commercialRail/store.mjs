import { getSupabaseConfig } from "../socialSupabaseStore.mjs";

export const COMMERCIAL_INTENT_TABLE = process.env.HERMES_COMMERCIAL_INTENT_TABLE || "hermes_commercial_actions";
export const COMMERCIAL_PAYMENT_TABLE = process.env.HERMES_COMMERCIAL_PAYMENT_TABLE || "hermes_commercial_payment_evidence";
export const COMMERCIAL_ONBOARDING_RPC = process.env.HERMES_COMMERCIAL_ONBOARDING_RPC || "hermes_commercial_paid_onboarding_cas";
export const COMMERCIAL_UPSERT_RPC = process.env.HERMES_COMMERCIAL_UPSERT_RPC || "hermes_commercial_upsert_cas";

function clean(v) { return String(v ?? "").trim(); }
function headers(key) { return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` }; }

export function describeCommercialStoreConfig() {
  const cfg = getSupabaseConfig();
  return {
    configured: Boolean(cfg),
    tables: { intents: COMMERCIAL_INTENT_TABLE, payments: COMMERCIAL_PAYMENT_TABLE },
    schema_file: "supabase/hermes_commercial_actions_schema.sql",
    reason: cfg ? "configured" : "supabase_not_configured",
  };
}

export function makeCommercialClient(options = {}) {
  const cfg = options.config || getSupabaseConfig();
  if (!cfg) return null;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const root = cfg.url.replace(/\/$/, "");

  async function readIntent(intent_id) {
    const res = await fetchImpl(`${root}/rest/v1/${COMMERCIAL_INTENT_TABLE}?intent_id=eq.${encodeURIComponent(intent_id)}&select=raw_intent,version,lifecycle_state&limit=1`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`commercial_intent_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  async function upsertIntent(intent, expectedVersion = null) {
    const current = expectedVersion == null ? await readIntent(intent.intent_id).catch(() => null) : null;
    const res = await fetchImpl(`${root}/rest/v1/rpc/${COMMERCIAL_UPSERT_RPC}`, {
      method: "POST",
      headers: headers(cfg.key),
      cache: "no-store",
      body: JSON.stringify({
        p_intent_id: intent.intent_id,
        p_idempotency_key: intent.idempotency_key,
        p_expected_version: expectedVersion == null ? Number(current?.version || 0) : expectedVersion,
        p_row: intent,
      }),
    });
    if (!res.ok) return { ok: false, error: `commercial_intent_write_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    const body = await res.json();
    return (Array.isArray(body) ? body[0] : body) || { ok: false, error: "commercial_intent_empty_result" };
  }

  async function readPaymentLink(intentId) {
    const res = await fetchImpl(`${root}/rest/v1/${COMMERCIAL_PAYMENT_TABLE}?intent_id=eq.${encodeURIComponent(intentId)}&status=eq.link_created&select=*&limit=1`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`commercial_payment_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0].payment_payload || rows[0] : null;
  }

  async function writePaymentLink(intentId, payment) {
    const row = { intent_id: intentId, provider_link_id: payment.provider_link_id, status: payment.status, payment_payload: payment, created_at: payment.created_at };
    const res = await fetchImpl(`${root}/rest/v1/${COMMERCIAL_PAYMENT_TABLE}?on_conflict=intent_id,provider_link_id`, {
      method: "POST",
      headers: { ...headers(cfg.key), Prefer: "resolution=ignore-duplicates,return=representation" },
      cache: "no-store",
      body: JSON.stringify([row]),
    });
    if (!res.ok) return { ok: false, error: `commercial_payment_write_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    return { ok: true, rows: await res.json().catch(() => []) };
  }

  async function atomicPaidClientOnboarding(payload) {
    const res = await fetchImpl(`${root}/rest/v1/rpc/${COMMERCIAL_ONBOARDING_RPC}`, {
      method: "POST",
      headers: headers(cfg.key),
      cache: "no-store",
      body: JSON.stringify({ p_payload: payload }),
    });
    if (!res.ok) return { ok: false, reason: `commercial_onboarding_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}` };
    const body = await res.json();
    return (Array.isArray(body) ? body[0] : body) || { ok: false, reason: "commercial_onboarding_empty_result" };
  }

  async function listDashboardIntents(limit = 100) {
    const res = await fetchImpl(`${root}/rest/v1/${COMMERCIAL_INTENT_TABLE}?select=raw_intent,version,lifecycle_state,updated_at&order=updated_at.desc&limit=${Number(limit) || 100}`, { headers: headers(cfg.key), cache: "no-store" });
    if (!res.ok) throw new Error(`commercial_dashboard_read_failed_${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  return { configured: true, readIntent, upsertIntent, readPaymentLink, writePaymentLink, atomicPaidClientOnboarding, listDashboardIntents };
}
