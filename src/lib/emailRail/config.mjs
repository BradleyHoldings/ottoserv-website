// Phase 2 controlled email execution rail: configuration contract.
//
// Supabase is authoritative in production. Live email execution also requires the
// approved Google Workspace/Gmail transport to be wired by the runtime. This file
// reports readiness without exposing credential values and never falls back to
// local JSON as production authority.

import { getSupabaseConfig } from "../socialSupabaseStore.mjs";

export const EMAIL_SCHEMA_VERSION = "phase2.v1";
export const APPROVED_CONTROLLED_SENDER = "jonathan@ottoservco.com";

export const EMAIL_MODE = {
  NO_SEND: "no_send",
  LIVE: "live",
};

export const EMAIL_CONFIG_STATE = {
  CONFIGURED: "configured",
  PERSISTENCE_PENDING: "persistence_pending",
  TRANSPORT_PENDING: "transport_pending",
  BLOCKED: "blocked",
};

function clean(v) { return String(v ?? "").trim(); }

function providerPresent(env) {
  const provider = clean(env.HERMES_EMAIL_PROVIDER || (env.HERMES_GMAIL_TRANSPORT_READY || env.GOOGLE_WORKSPACE_EMAIL_READY ? "gmail_workspace" : "")).toLowerCase();
  return {
    provider,
    transport_ready: Boolean(env.HERMES_GMAIL_TRANSPORT_READY || env.GOOGLE_WORKSPACE_EMAIL_READY),
    sender: clean(env.HERMES_EMAIL_SENDER) || APPROVED_CONTROLLED_SENDER,
  };
}

export function readEmailConfig(env = process.env) {
  const supa = getSupabaseConfig();
  const prov = providerPresent(env);
  const mode = clean(env.HERMES_EMAIL_MODE).toLowerCase() === EMAIL_MODE.LIVE ? EMAIL_MODE.LIVE : EMAIL_MODE.NO_SEND;

  if (prov.sender && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(prov.sender)) {
    return {
      state: EMAIL_CONFIG_STATE.BLOCKED,
      mode,
      reason: "malformed_sender",
      present: { supabase: Boolean(supa), provider_transport: prov.transport_ready, sender: Boolean(prov.sender) },
    };
  }

  if (prov.provider && !["gmail_workspace", "gmail", "google_workspace"].includes(prov.provider)) {
    return {
      state: EMAIL_CONFIG_STATE.BLOCKED,
      mode,
      reason: `unsupported_provider:${prov.provider}`,
      present: { supabase: Boolean(supa), provider_transport: prov.transport_ready, sender: Boolean(prov.sender) },
    };
  }

  let state;
  if (!supa) state = EMAIL_CONFIG_STATE.PERSISTENCE_PENDING;
  else if (!prov.transport_ready || !prov.sender) state = EMAIL_CONFIG_STATE.TRANSPORT_PENDING;
  else state = EMAIL_CONFIG_STATE.CONFIGURED;

  return {
    state,
    mode,
    schema_version: EMAIL_SCHEMA_VERSION,
    provider: prov.provider || (prov.transport_ready ? "gmail_workspace" : ""),
    sender: prov.sender,
    present: { supabase: Boolean(supa), provider_transport: prov.transport_ready, sender: Boolean(prov.sender) },
    controlled_recipient: clean(env.HERMES_EMAIL_CONTROLLED_RECIPIENT) || "",
    reason: state,
  };
}

export function describeEmailConfig(env = process.env) {
  const cfg = readEmailConfig(env);
  return {
    configured: cfg.state === EMAIL_CONFIG_STATE.CONFIGURED,
    state: cfg.state,
    mode: cfg.mode,
    provider: cfg.provider,
    present: cfg.present,
    schema_version: cfg.schema_version,
    has_controlled_recipient: Boolean(cfg.controlled_recipient),
  };
}

export function assertNoLocalAuthorityInProduction(cfg) {
  if (cfg.mode === EMAIL_MODE.LIVE && cfg.state === EMAIL_CONFIG_STATE.PERSISTENCE_PENDING) {
    throw new Error("email_production_local_authority_blocked: live mode requires authoritative Supabase persistence");
  }
  return true;
}
