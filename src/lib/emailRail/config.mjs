// ─── Phase 2 controlled email execution rail: configuration contract ──────────
//
// Supabase is authoritative in production. This module reports — WITHOUT ever
// printing secret values — whether the email execution rail is configured to run
// for real, and which controlled-real send is approved. It mirrors the Phase 1
// leadRail/config.mjs contract so the operating cycle can stop truthfully when
// email is disabled or misconfigured (never falling back to local JSON as
// authority).

import { getSupabaseConfig } from "../socialSupabaseStore.mjs";

export const EMAIL_SCHEMA_VERSION = "phase2.v1";

// Transport modes. `no_send` is the safe default (prepare only). `live` performs
// a real provider send and REQUIRES a wired, credentialed transport.
export const EMAIL_MODE = {
  NO_SEND: "no_send",
  LIVE: "live",
};

export const EMAIL_CONFIG_STATE = {
  CONFIGURED: "configured",         // Supabase + provider present → may execute live
  PERSISTENCE_PENDING: "persistence_pending", // no Supabase → cannot be authoritative
  TRANSPORT_PENDING: "transport_pending",     // Supabase ok but no provider creds
  BLOCKED: "blocked",               // malformed config → must not run
};

function clean(v) { return String(v ?? "").trim(); }

// Provider credential presence (booleans only — never the values).
function providerPresent(env) {
  // The approved OttoServ email provider is wired through these env vars. Presence
  // (not value) is all that is ever reported.
  return {
    provider: clean(env.HERMES_EMAIL_PROVIDER) || "",
    api_key: Boolean(env.HERMES_EMAIL_API_KEY || env.RESEND_API_KEY || env.POSTMARK_SERVER_TOKEN),
    sender: clean(env.HERMES_EMAIL_SENDER) || "",
  };
}

/**
 * Read the email rail config from the environment. Returns a structured, secret-
 * free descriptor. THROWS nothing — callers decide how to act on `state`.
 */
export function readEmailConfig(env = process.env) {
  const supa = getSupabaseConfig();
  const prov = providerPresent(env);
  const mode = clean(env.HERMES_EMAIL_MODE).toLowerCase() === EMAIL_MODE.LIVE ? EMAIL_MODE.LIVE : EMAIL_MODE.NO_SEND;

  // A sender that is configured but malformed is a hard block — never guess.
  const sender = prov.sender;
  if (sender && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sender)) {
    return { state: EMAIL_CONFIG_STATE.BLOCKED, mode, reason: "malformed_sender", present: { supabase: Boolean(supa), provider_api_key: prov.api_key, sender: Boolean(sender) } };
  }

  let state;
  if (!supa) state = EMAIL_CONFIG_STATE.PERSISTENCE_PENDING;
  else if (!prov.api_key || !sender) state = EMAIL_CONFIG_STATE.TRANSPORT_PENDING;
  else state = EMAIL_CONFIG_STATE.CONFIGURED;

  return {
    state, mode,
    schema_version: EMAIL_SCHEMA_VERSION,
    provider: prov.provider || (prov.api_key ? "configured" : ""),
    present: { supabase: Boolean(supa), provider_api_key: prov.api_key, sender: Boolean(sender) },
    // The single controlled-real recipient approved for acceptance (OttoServ inbox).
    controlled_recipient: clean(env.HERMES_EMAIL_CONTROLLED_RECIPIENT) || "",
    reason: state,
  };
}

// Safe for logs / dashboard: never contains secret values.
export function describeEmailConfig(env = process.env) {
  const cfg = readEmailConfig(env);
  return {
    configured: cfg.state === EMAIL_CONFIG_STATE.CONFIGURED,
    state: cfg.state, mode: cfg.mode, provider: cfg.provider,
    present: cfg.present, schema_version: cfg.schema_version,
    has_controlled_recipient: Boolean(cfg.controlled_recipient),
  };
}

// Production guard: a `live` run with no authoritative Supabase store must throw —
// local JSON may NEVER be the production authority for execution truth.
export function assertNoLocalAuthorityInProduction(cfg) {
  if (cfg.mode === EMAIL_MODE.LIVE && cfg.state === EMAIL_CONFIG_STATE.PERSISTENCE_PENDING) {
    throw new Error("email_production_local_authority_blocked: live mode requires authoritative Supabase persistence");
  }
  return true;
}
