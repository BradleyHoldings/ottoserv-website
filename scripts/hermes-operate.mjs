// Hermes headless operating cycle. Runs sense → decide → score → record →
// persist once, then prints the cycle summary. Safe to schedule unattended
// (cron / Task Scheduler): it reads state + memory, records proposals, and
// publishes the next-action queue + autonomy scorecard. It triggers NO outreach,
// calls, emails, payments, n8n, deploys, or client-facing actions — every action
// it emits is an approval-gated proposal.
//
// Env overrides (all optional):
//   REVENUE_LOOP_OUTPUT_DIR  state + ledger + cycle dir (default data/revenue-engine)
//   LEADS_PATH               leads ledger (default data/call-imports/leads.json)
//   LEAD_INTENT_OUTPUT_DIR   lead-intent dir (default data/lead-intent)
//   HERMES_NOW               ISO timestamp override
//   HERMES_PERSIST_SUPABASE  set "false" to skip durable upserts

import { runOperatingCycle } from "../src/lib/hermesOrchestrator.mjs";

const result = await runOperatingCycle({
  now: process.env.HERMES_NOW,
  dataDir: process.env.REVENUE_LOOP_OUTPUT_DIR,
  leadsPath: process.env.LEADS_PATH,
  leadIntentDir: process.env.LEAD_INTENT_OUTPUT_DIR,
  persistSupabase: process.env.HERMES_PERSIST_SUPABASE === "false" ? false : undefined,
});

console.log(JSON.stringify(result.summary, null, 2));
