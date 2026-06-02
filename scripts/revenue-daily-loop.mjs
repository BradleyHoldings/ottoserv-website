import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createDailyLoopRun } from "../src/lib/revenueEngine.mjs";

const now = process.env.REVENUE_LOOP_NOW || new Date().toISOString();
const cycle = process.env.REVENUE_LOOP_CYCLE || inferCycle(now);
const outputDir = process.env.REVENUE_LOOP_OUTPUT_DIR || path.join(process.cwd(), "data", "revenue-engine");

const run = createDailyLoopRun({
  now,
  cycle,
  maxVolume: Number(process.env.REVENUE_LOOP_MAX_VOLUME || 10),
});

mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${run.id}.json`);
writeFileSync(outputPath, `${JSON.stringify(run, null, 2)}\n`, "utf8");

const summary = {
  status: run.status,
  schedule: run.schedule,
  volume_policy: run.volume_policy,
  plan_date: run.plan.run_date,
  cycle,
  execution_packets: run.executionPackets.length,
  repair_packets: run.repairPackets.length,
  health: run.health,
  output_path: outputPath,
};

console.log(JSON.stringify(summary, null, 2));

function inferCycle(value) {
  const hour = new Date(value).getHours();
  return hour < 12 ? "morning" : "afternoon";
}
