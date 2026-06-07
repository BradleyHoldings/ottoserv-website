// ─── Phase 1 lead rail: production configuration contract ─────────────────────
//
// Defines exactly how the rail receives its required runtime configuration, validates
// it, and reports config state without ever exposing secret values. Imported by the
// pipeline, store, and Hermes adapter.
//
// Missing configuration → persistence_pending (recoverable).
// Malformed configuration → blocked (operator action required).
// Production CANNOT silently fall back to local JSON as an authoritative store.

export const SCHEMA_VERSION = "phase1.v1";

export const MODE = {
  DRY: "dry",
  INTERNAL: "internal",
};

export const CONFIG_STATE = {
  CONFIGURED: "configured",
  PERSISTENCE_PENDING: "persistence_pending", // missing but recoverable
  BLOCKED: "blocked",                          // malformed / invalid
};

function clean(v) {
  return String(v ?? "").trim();
}

/**
 * Read and validate the rail's required environment variables WITHOUT returning
 * secret values. Returns { state, table, schema_version, mode, present, reason }.
 *
 * state=configured   → all required vars present and well-formed.
 * state=persistence_pending → vars missing (no Supabase yet configured).
 * state=blocked      → vars present but malformed / invalid shape.
 */
export function readRailConfig(env = process.env) {
  const url = clean(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL);
  const key = clean(env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY);
  const table = clean(env.HERMES_PIPELINE_TABLE) || "hermes_pipeline";
  const rawMode = clean(env.LEAD_RAIL_MODE);
  const mode = rawMode === MODE.INTERNAL ? MODE.INTERNAL : MODE.DRY;

  const present = {
    supabase_url: Boolean(url),
    service_key: Boolean(key),
    table_override: Boolean(env.HERMES_PIPELINE_TABLE),
    mode_override: Boolean(rawMode),
  };

  // Missing → persistence_pending (operator must add env vars, then re-run idempotently).
  if (!url || !key) {
    return {
      state: CONFIG_STATE.PERSISTENCE_PENDING,
      table,
      schema_version: SCHEMA_VERSION,
      mode,
      present,
      reason: "supabase_not_configured",
      detail: "SUPABASE_URL and SUPABASE_SERVICE_KEY (or aliases) are required for Supabase persistence.",
    };
  }

  // Malformed URL → blocked (cannot connect; operator must fix).
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    return {
      state: CONFIG_STATE.BLOCKED,
      table,
      schema_version: SCHEMA_VERSION,
      mode,
      present,
      reason: "malformed_supabase_url",
      detail: "SUPABASE_URL must begin with https://.",
    };
  }

  // Malformed key (too short → likely not a real service key).
  if (key.length < 20) {
    return {
      state: CONFIG_STATE.BLOCKED,
      table,
      schema_version: SCHEMA_VERSION,
      mode,
      present,
      reason: "malformed_service_key",
      detail: "SUPABASE_SERVICE_KEY appears too short to be a valid service-role key.",
    };
  }

  return {
    state: CONFIG_STATE.CONFIGURED,
    table,
    schema_version: SCHEMA_VERSION,
    mode,
    present,
    reason: "configured",
  };
}

/**
 * Describe config state for logging/receipts WITHOUT exposing any secret value.
 * Safe to include in any log, receipt, or operator report.
 */
export function describeRailConfig(env = process.env) {
  const cfg = readRailConfig(env);
  return {
    configured: cfg.state === CONFIG_STATE.CONFIGURED,
    state: cfg.state,
    table: cfg.table,
    schema_version: cfg.schema_version,
    mode: cfg.mode,
    present: cfg.present,
    reason: cfg.reason,
    // Never include url, key, or any secret value.
  };
}

/**
 * Assert that production is NOT silently falling back to local JSON as the
 * authoritative record store. Throws when:
 *   - mode is "internal" (production intent) AND config is not CONFIGURED.
 * Local artifacts are cache/recovery/evidence only — they CANNOT be promoted
 * to authoritative records in production.
 */
export function assertNoLocalAuthorityInProduction(cfg) {
  if (cfg.mode === MODE.INTERNAL && cfg.state !== CONFIG_STATE.CONFIGURED) {
    throw new Error(
      `production_local_authority_blocked: mode=internal requires configured Supabase. ` +
      `reason=${cfg.reason}. Configure SUPABASE_URL + SUPABASE_SERVICE_KEY then re-run.`
    );
  }
}
