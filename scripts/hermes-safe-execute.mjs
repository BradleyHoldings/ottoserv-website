// Hermes safe internal execution. Auto-completes already-approved execution
// tasks whose evidence is sufficient, and persists the updated state + ledger.
// SAFE: internal status only — no emails, calls, DMs, payments, n8n, deploys, or
// client-facing actions. Evidence-gated and idempotent.
//
// Env: REVENUE_LOOP_OUTPUT_DIR (state dir), HERMES_NOW (ISO override),
//      HERMES_PERSIST_SUPABASE=false to skip durable upserts.

import { applySafeExecutions } from "../src/lib/hermesSafeExecutor.mjs";

const result = await applySafeExecutions({
  now: process.env.HERMES_NOW,
  dataDir: process.env.REVENUE_LOOP_OUTPUT_DIR,
  persistSupabase: process.env.HERMES_PERSIST_SUPABASE === "false" ? false : undefined,
});

console.log(JSON.stringify({
  ok: result.ok,
  reason: result.reason,
  executed: result.executed,
  skipped_count: Array.isArray(result.skipped) ? result.skipped.length : 0,
  persisted: result.persisted,
}, null, 2));
process.exit(result.ok ? 0 : 1);
