// ─── Revenue daily-loop runner (operational entrypoint) ───────────────────────
//
// WHY THIS EXISTS
// `scripts/revenue-daily-loop.mjs` was a top-level side-effecting script — fine to
// run by hand, but hard to test and to schedule with confidence. This module
// extracts the loop body into a single testable function so the operational path
// (the thing a cron / Task Scheduler invokes unattended) is covered by tests and
// has one documented, safe contract.
//
// SAFE BY DESIGN — this runner ONLY:
//   - READS local JSON ledgers (leads, call outcomes, social drafts, process
//     scans) via revenueLoopSources, and
//   - WRITES read-only state files into `outputDir`: the dated run, latest.json,
//     and the durable implementation-work-orders.json.
//
// It imports only pure/local modules (revenueEngine, revenueLoopSources,
// implementationWorkOrders). It loads NO credentials and imports NO platform,
// email, Stripe, Retell, or n8n client. Scheduling it therefore cannot send a
// message, charge a card, activate a workflow, deploy, or emit a client-facing
// deliverable. Missing/empty source files degrade to a safe "repair_first"
// state rather than throwing.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createDailyLoopRun } from "./revenueEngine.mjs";
import { assembleRevenueLoopInput } from "./revenueLoopSources.mjs";
import { promoteSeedsToWorkOrders } from "./implementationWorkOrders.mjs";

export function inferCycle(value = new Date().toISOString()) {
  const hour = new Date(value).getHours();
  return hour < 12 ? "morning" : "afternoon";
}

export function defaultOutputDir(cwd = process.cwd()) {
  return path.join(cwd, "data", "revenue-engine");
}

export async function runRevenueDailyLoop(options = {}) {
  const now = options.now || new Date().toISOString();
  const cycle = options.cycle || inferCycle(now);
  const maxVolume = Number(options.maxVolume || 10);
  const outputDir = options.outputDir || defaultOutputDir(options.cwd);
  // Keep the durable work-order store next to the other state files so a single
  // outputDir fully contains everything the runner writes.
  const storePath = options.storePath || path.join(outputDir, "implementation-work-orders.json");

  const { input, serviceDelivery, sources } = await assembleRevenueLoopInput({
    now,
    cycle,
    maxVolume,
    ...(options.sourceOptions || {}),
  });

  const run = createDailyLoopRun(input);

  // Idempotent — re-running each cycle never duplicates existing work orders.
  const implementation = await promoteSeedsToWorkOrders(serviceDelivery, { now, storePath });

  const document = {
    ...run,
    serviceDelivery,
    implementationWorkOrders: {
      created_this_run: implementation.created,
      skipped_existing: implementation.skipped,
      summary: implementation.summary,
      store_path: implementation.storePath,
      orders: implementation.workOrders,
    },
    sources,
    generated_at: now,
  };

  mkdirSync(outputDir, { recursive: true });
  const datedPath = path.join(outputDir, `${run.id}.json`);
  writeFileSync(datedPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

  // `latest.json` is the single source-of-truth the dashboard/Hermes read.
  const latestPath = path.join(outputDir, "latest.json");
  writeFileSync(latestPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

  const summary = {
    status: run.status,
    schedule: run.schedule,
    volume_policy: run.volume_policy,
    plan_date: run.plan.run_date,
    cycle,
    last_run_at: now,
    sources,
    execution_packets: run.executionPackets.length,
    repair_packets: run.repairPackets.length,
    service_delivery_seeds: serviceDelivery.length,
    implementation_work_orders: {
      created_this_run: implementation.created,
      total: implementation.summary.total,
      needs_approval: implementation.summary.needs_approval,
      by_stage: implementation.summary.by_stage,
    },
    revenue_risks: run.plan.revenue_risks,
    health: run.health,
    dated_output_path: datedPath,
    latest_output_path: latestPath,
    work_orders_store_path: implementation.storePath,
  };

  return { summary, document, outputDir, datedPath, latestPath, storePath: implementation.storePath };
}
