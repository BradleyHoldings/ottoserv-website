// Hermes production state check. Reports whether durable Supabase persistence is
// configured and, if not, exactly which env var NAMES are missing — WITHOUT ever
// printing a URL, key, or any secret value. Also reports local state presence.
// Read-only: triggers nothing.

import { promises as fs } from "node:fs";
import path from "node:path";

import { describeRevenueStateConfig } from "../src/lib/revenueEngineSupabaseStore.mjs";

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function main() {
  const cwd = process.cwd();
  const dir = process.env.REVENUE_LOOP_OUTPUT_DIR || path.join(cwd, "data", "revenue-engine");
  const cfg = describeRevenueStateConfig();

  const local = {
    latest_json: await exists(path.join(dir, "latest.json")),
    operating_cycle_json: await exists(path.join(dir, "operating-cycle.json")),
    operating_ledger_json: await exists(path.join(dir, "operating-ledger.json")),
  };

  console.log(JSON.stringify({
    supabase: cfg,
    local_state: { dir, ...local },
    guidance: cfg.configured
      ? "Supabase configured. revenue:daily-loop / hermes:operate / hermes:actor-queue will upsert the latest document so the production dashboard reflects live Hermes state."
      : [
          "Production dashboard shows stale/empty state because Supabase env is missing.",
          `Set these env var NAMES (values not shown here) where the dashboard + schedulers run: ${cfg.missing_env.join(", ")}.`,
          "Locations: Vercel Project → Settings → Environment Variables (for the dashboard read path); the host/cron running the Hermes scripts (for the write path); and a local .env for manual runs.",
          `Apply the table once: psql/Supabase SQL editor with ${cfg.schema_file} (table ${cfg.table}, singleton row id "${cfg.row_id}").`,
          "Never commit the service key. Use the service-role key only server-side.",
        ],
  }, null, 2));
}

main().catch((err) => { console.error(String(err?.stack || err)); process.exit(1); });
