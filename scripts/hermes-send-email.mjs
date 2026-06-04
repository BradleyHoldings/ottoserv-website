// Hermes live email execution runner. Reads the durable actor queue's QUEUED email
// packets, runs the full preflight (caps/DNC/blacklist/cooldown/contact/evidence/
// sensitive), and — ONLY in explicit live mode with a wired, credentialed
// transport — sends them, records message-id/timestamp/recipient/status evidence,
// closes the lifecycle, and persists state + ledger.
//
// SAFETY: NO-SEND BY DEFAULT. Without HERMES_EMAIL_MODE=live AND a real transport
// wired in (intentionally NOT bundled here — it needs separate, approved
// credentials), this sends NOTHING and writes NO evidence; ready packets are
// reported "prepared" or "no_transport". It never fabricates evidence.
//
// To wire a real transport, a separate credentialed entry point should import
// applyEmailExecution and pass `transport: async (draft) => ({ message_id, ... })`.
//
// Env: REVENUE_LOOP_OUTPUT_DIR, HERMES_NOW, HERMES_EMAIL_MODE (default no_send),
//      DNC_LIST / BLACKLIST (comma-separated), HERMES_PERSIST_SUPABASE=false.

import { applyEmailExecution } from "../src/lib/hermesEmailExecutor.mjs";

function list(env) {
  return String(env ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

const mode = process.env.HERMES_EMAIL_MODE || "no_send";

// A real transport is deliberately not wired here. Live mode with no transport
// reports "no_transport" and sends nothing — the honest, safe default.
const result = await applyEmailExecution({
  now: process.env.HERMES_NOW,
  dataDir: process.env.REVENUE_LOOP_OUTPUT_DIR,
  mode,
  dnc: list(process.env.DNC_LIST),
  blacklist: list(process.env.BLACKLIST),
  transport: null,
  persistSupabase: process.env.HERMES_PERSIST_SUPABASE === "false" ? false : undefined,
});

console.log(JSON.stringify({
  ok: result.ok,
  reason: result.reason,
  mode,
  summary: result.summary,
  results: result.results,
  persisted: result.persisted,
  note: "no_send by default. Live sends require HERMES_EMAIL_MODE=live AND a wired, credentialed transport (not bundled). Evidence is only recorded from real sends.",
}, null, 2));
process.exit(result.ok ? 0 : 1);
