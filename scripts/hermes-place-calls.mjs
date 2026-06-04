// Hermes live call execution runner. Reads the durable actor queue's QUEUED call
// packets, runs the full preflight (business hours / DNC / cooldown / max attempts
// / contact / evidence), and — ONLY in explicit live mode with a wired, approved
// Retell/Morgan dialer — places them, records call-id/disposition/summary/next-
// action evidence, closes the lifecycle, and persists state + ledger.
//
// SAFETY: NO-DIAL BY DEFAULT. Without HERMES_CALL_MODE=live AND a real dialer wired
// in (intentionally NOT bundled — needs approved telephony credentials), this dials
// NOTHING and writes NO evidence; ready packets are reported "prepared" or
// "no_dialer". It never fabricates evidence.
//
// Env: REVENUE_LOOP_OUTPUT_DIR, HERMES_NOW, HERMES_CALL_MODE (default no_dial),
//      DNC_LIST / BLACKLIST (comma), HERMES_CALL_LOCAL_HOUR (lead-local hour),
//      HERMES_PERSIST_SUPABASE=false.

import { applyCallExecution } from "../src/lib/hermesCallExecutor.mjs";

function list(env) {
  return String(env ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

const mode = process.env.HERMES_CALL_MODE || "no_dial";
const localHour = process.env.HERMES_CALL_LOCAL_HOUR ? Number(process.env.HERMES_CALL_LOCAL_HOUR) : undefined;

const result = await applyCallExecution({
  now: process.env.HERMES_NOW,
  dataDir: process.env.REVENUE_LOOP_OUTPUT_DIR,
  mode,
  dnc: list(process.env.DNC_LIST),
  blacklist: list(process.env.BLACKLIST),
  localHour,
  dialer: null, // real Retell/Morgan dialer requires separate, approved credentials
  persistSupabase: process.env.HERMES_PERSIST_SUPABASE === "false" ? false : undefined,
});

console.log(JSON.stringify({
  ok: result.ok,
  reason: result.reason,
  mode,
  summary: result.summary,
  results: result.results,
  persisted: result.persisted,
  note: "no_dial by default. Live dials require HERMES_CALL_MODE=live AND a wired, approved Retell/Morgan dialer (not bundled). Evidence is only recorded from real calls.",
}, null, 2));
process.exit(result.ok ? 0 : 1);
