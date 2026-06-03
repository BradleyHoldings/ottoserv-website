// Thin CLI for the autonomous revenue daily loop. All work lives in the testable
// runner. Safe to schedule unattended (cron / Windows Task Scheduler): it only
// refreshes read-only operational state and work-order visibility.
//
// Env overrides (all optional):
//   REVENUE_LOOP_NOW         ISO timestamp (default: now)
//   REVENUE_LOOP_CYCLE       morning | afternoon (default: inferred from hour)
//   REVENUE_LOOP_OUTPUT_DIR  output dir (default: data/revenue-engine)
//   REVENUE_LOOP_MAX_VOLUME  max execution packets (default: 10)

import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";

const result = await runRevenueDailyLoop({
  now: process.env.REVENUE_LOOP_NOW,
  cycle: process.env.REVENUE_LOOP_CYCLE,
  maxVolume: process.env.REVENUE_LOOP_MAX_VOLUME,
  outputDir: process.env.REVENUE_LOOP_OUTPUT_DIR,
});

console.log(JSON.stringify(result.summary, null, 2));
