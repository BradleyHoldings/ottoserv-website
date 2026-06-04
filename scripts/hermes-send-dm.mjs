// Execute queued DM packets through the configured Hermes browser bridge.
// Safe default: no_send. Live requires HERMES_DM_MODE=live plus bridge config.

import { createBrowserProvider } from "../src/lib/hermesBrowserProvider.mjs";
import { applyDmExecution } from "../src/lib/hermesDmExecutor.mjs";

function list(value) {
  return String(value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

const mode = process.env.HERMES_DM_MODE || "no_send";
const provider = createBrowserProvider();
const result = await applyDmExecution({
  now: process.env.HERMES_NOW,
  dataDir: process.env.REVENUE_LOOP_OUTPUT_DIR,
  mode,
  provider,
  dnc: list(process.env.DNC_LIST),
  blacklist: list(process.env.BLACKLIST),
  flags: list(process.env.HERMES_DM_FLAGS),
  persistSupabase: process.env.HERMES_PERSIST_SUPABASE === "false" ? false : undefined,
});

console.log(JSON.stringify({
  ok: result.ok,
  reason: result.reason,
  mode,
  provider_wired: Boolean(provider),
  summary: result.summary,
  results: result.results,
  persisted: result.persisted,
  note: "No-send by default. Live DMs require HERMES_DM_MODE=live, an authenticated browser bridge, policy-compliant queued packets, and real evidence from the platform.",
}, null, 2));
process.exit(result.ok ? 0 : 1);
