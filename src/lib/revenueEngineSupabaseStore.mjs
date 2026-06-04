// ─── Supabase persistence for the autonomous revenue loop ─────────────────────
//
// WHY THIS EXISTS
// The revenue loop's source-of-truth lives in local JSON files. That works on a
// persistent host (droplet/dev) but NOT on Vercel, whose filesystem is read-only
// and ephemeral — so the Vercel-served Hermes dashboard shows "No loop run yet".
//
// This module gives the loop a durable home Vercel can read: a single row in a
// `revenue_engine_state` table holding the full loop document (the same object
// written to latest.json, which also embeds the implementation work orders).
//
// It reuses the EXACT Supabase/PostgREST pattern already used by
// processScans.ts and socialSupabaseStore.mjs (service key, REST, no client SDK),
// including the shared `getSupabaseConfig()` env resolver. It writes ONLY to this
// one project-owned table — no emails, calls, payment links, n8n activations,
// deploys, or client-facing actions. When Supabase isn't configured it no-ops.

import { getSupabaseConfig } from "./socialSupabaseStore.mjs";

export const REVENUE_STATE_TABLE = process.env.REVENUE_ENGINE_SUPABASE_TABLE || "revenue_engine_state";
// Singleton row id — the dashboard always reads "the latest run".
export const REVENUE_STATE_ID = "latest";

export function revenueSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

/**
 * Describe the persistence configuration WITHOUT exposing any secret values.
 * Reports only which env var NAMES are present/missing so an operator can tell
 * why production shows supabase_not_configured. Never returns URLs or keys.
 */
export function describeRevenueStateConfig() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const hasKey = Boolean(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const missing = [];
  if (!hasUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  if (!hasKey) missing.push("SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
  return {
    configured: hasUrl && hasKey,
    present: { supabase_url: hasUrl, service_key: hasKey },
    missing_env: missing,
    table: REVENUE_STATE_TABLE,
    row_id: REVENUE_STATE_ID,
    schema_file: "supabase/revenue_engine_schema.sql",
    used_by: ["revenue:daily-loop", "hermes:operate", "hermes:actor-queue", "evidence:submit"],
    reason: hasUrl && hasKey ? "configured" : "supabase_not_configured",
  };
}

function headers(key) {
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

/**
 * Upsert the latest loop document. Best-effort: returns a result object and never
 * throws on a Supabase/network error so a scheduled local run is never broken by
 * a persistence hiccup. No-ops (skipped) when Supabase is not configured.
 */
export async function upsertRevenueState(document, options = {}) {
  const cfg = getSupabaseConfig();
  if (!cfg) return { ok: false, skipped: true, reason: "supabase_not_configured" };

  const id = options.id || REVENUE_STATE_ID;
  const row = {
    id,
    status: document?.status ?? null,
    generated_at: document?.generated_at ?? null,
    document,
    updated_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${cfg.url}/rest/v1/${REVENUE_STATE_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: { ...headers(cfg.key), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Supabase upsert failed (${res.status}): ${text.slice(0, 300)}` };
    }
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * Read the latest loop document, or null when not configured / not found / on
 * error. Uses the service key server-side (RLS-bypassing) — never call from the
 * browser.
 */
export async function readRevenueState(options = {}) {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  const id = options.id || REVENUE_STATE_ID;
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/${REVENUE_STATE_TABLE}?id=eq.${encodeURIComponent(id)}&select=document,status,generated_at,updated_at&limit=1`,
      { headers: headers(cfg.key), cache: "no-store" },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    return row && row.document ? { document: row.document, updated_at: row.updated_at } : null;
  } catch {
    return null;
  }
}
