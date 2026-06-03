import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createDailyLoopRun } from "../src/lib/revenueEngine.mjs";
import { assembleRevenueLoopInput } from "../src/lib/revenueLoopSources.mjs";

const now = process.env.REVENUE_LOOP_NOW || new Date().toISOString();
const cycle = process.env.REVENUE_LOOP_CYCLE || inferCycle(now);
const outputDir = process.env.REVENUE_LOOP_OUTPUT_DIR || path.join(process.cwd(), "data", "revenue-engine");
const maxVolume = Number(process.env.REVENUE_LOOP_MAX_VOLUME || 10);

// Feed the engine REAL local revenue state (leads, call outcomes, social drafts,
// process scans) instead of an empty object. Empty/stale rails surface as engine
// failures, so the loop reports an honest "repair_first" instead of a false
// "ready" when the pipeline is empty.
const { input, serviceDelivery, sources } = await assembleRevenueLoopInput({ now, cycle, maxVolume });

const run = createDailyLoopRun(input);

// Carry the service-delivery spine (leak-check → implementation work orders) and
// the source provenance alongside the engine run in one document.
const document = { ...run, serviceDelivery, sources, generated_at: now };

mkdirSync(outputDir, { recursive: true });
const datedPath = path.join(outputDir, `${run.id}.json`);
writeFileSync(datedPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

// `latest.json` is the single source-of-truth output the headless plane (Hermes,
// Codex, cron consumers, server routes) reads for the most recent loop run.
const latestPath = path.join(outputDir, "latest.json");
writeFileSync(latestPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

const summary = {
  status: run.status,
  schedule: run.schedule,
  volume_policy: run.volume_policy,
  plan_date: run.plan.run_date,
  cycle,
  sources,
  execution_packets: run.executionPackets.length,
  repair_packets: run.repairPackets.length,
  service_delivery_work_orders: serviceDelivery.length,
  revenue_risks: run.plan.revenue_risks,
  health: run.health,
  dated_output_path: datedPath,
  latest_output_path: latestPath,
};

console.log(JSON.stringify(summary, null, 2));

function inferCycle(value) {
  const hour = new Date(value).getHours();
  return hour < 12 ? "morning" : "afternoon";
}
