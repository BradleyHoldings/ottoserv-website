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
import { upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";
import { buildApprovalExecutionQueue, readApprovedDecisionsFromDir } from "./approvalExecutionBridge.mjs";
import { runServiceDeliveryOperatingCycle } from "./serviceDeliveryPersistence.mjs";
import {
  buildVoiceServiceStatusRollup,
  generateVoiceSetupPacketsFromWorkOrders,
} from "./retellVoiceServiceAutomation.mjs";
import { buildFirstClientVoiceActivationStatuses } from "./retellFirstClientActivationPlaybook.mjs";
import { runLeadSupplyDailyLoop } from "./leadSupplyDailyLoop.mjs";
import {
  createMemoryRevenueExecutionStore,
  persistLeadSupplyExecution,
} from "./leadSupplyExecutionPersistence.mjs";

export function inferCycle(value = new Date().toISOString()) {
  const hour = new Date(value).getHours();
  return hour < 12 ? "morning" : "afternoon";
}

export function defaultOutputDir(cwd = process.cwd()) {
  return path.join(cwd, "data", "revenue-engine");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export async function runRevenueDailyLoop(options = {}) {
  const now = options.now || new Date().toISOString();
  const cycle = options.cycle || inferCycle(now);
  const maxVolume = Number(options.maxVolume || 10);
  const outputDir = options.outputDir || defaultOutputDir(options.cwd);
  // Keep the durable work-order store next to the other state files so a single
  // outputDir fully contains everything the runner writes.
  const storePath = options.storePath || path.join(outputDir, "implementation-work-orders.json");

  const { input, scans, serviceDelivery, sources } = await assembleRevenueLoopInput({
    now,
    cycle,
    maxVolume,
    ...(options.sourceOptions || {}),
  });

  const run = createDailyLoopRun(input);

  // Idempotent — re-running each cycle never duplicates existing work orders.
  const implementation = await promoteSeedsToWorkOrders(serviceDelivery, { now, storePath });

  // Approval → execution bridge: turn recorded approval decisions into actor task
  // packets + lifecycle so an approved action becomes an executable/delegable to-do
  // with required evidence. Inputs are best-effort: explicit `options.approvals`
  // (tests / callers) plus approved decisions read from the outbox dir (droplet).
  // Nothing is executed here — this only produces the queue. Empty by default.
  const approvedDecisions =
    options.approvals !== undefined
      ? asArray(options.approvals)
      : await readApprovedDecisionsFromDir(options.approvalsDir);
  const approvalExecutionQueue = buildApprovalExecutionQueue(approvedDecisions, { now });
  const serviceDeliveryExecution = await runServiceDeliveryOperatingCycle({
    records: scans,
    now,
    store: options.serviceDeliveryStore,
    liveClient: options.serviceDeliveryLiveClient,
  });
  const voiceSetupPackets = generateVoiceSetupPacketsFromWorkOrders(serviceDeliveryExecution.workOrders, { now });
  const voiceServiceStatus = buildVoiceServiceStatusRollup(voiceSetupPackets, options.retellVoiceEvents);
  const voiceActivationWorkOrders = options.firstClientVoiceWorkOrders || serviceDeliveryExecution.workOrders;
  const firstClientVoiceActivation = buildFirstClientVoiceActivationStatuses(voiceActivationWorkOrders, {
    ...(options.voiceActivationContext || {}),
    events: options.voiceActivationContext?.events || options.retellVoiceEvents,
    now,
  });
  const leadSupplyDailyLoop = runLeadSupplyDailyLoop({
    sources: options.leadSupplySources || [
      { source_type: "existing_ottoserv_lead_records", records: input.leads },
      { source_type: "front_office_leak_check_submissions", records: scans },
    ],
    existingTasks: options.leadSupplyExistingTasks,
    failures: input.failures,
    now,
    approvals: options.leadSupplyOptions || {},
    policy: options.leadSupplyPolicy || {},
    doNotContact: options.leadSupplyDoNotContact,
  });
  const leadSupplyExecutionStore = options.leadSupplyExecutionStore || createMemoryRevenueExecutionStore();
  const persistedLeadSupplyExecution = await persistLeadSupplyExecution(leadSupplyDailyLoop, {
    store: leadSupplyExecutionStore,
    now,
    emailClient: options.leadSupplyEmailClient,
    callClient: options.leadSupplyCallClient,
  });
  const durableRevenueExecutionQueue = persistedLeadSupplyExecution.queue;

  const document = {
    ...run,
    leadSupplyDailyLoop,
    durableRevenueExecutionQueue,
    serviceDelivery,
    serviceDeliveryExecution: {
      summary: serviceDeliveryExecution.summary,
      persistence: serviceDeliveryExecution.persistence,
      opportunities: serviceDeliveryExecution.opportunities,
      workOrders: serviceDeliveryExecution.workOrders,
      approval_cards: serviceDeliveryExecution.approval_cards,
      execution_packets: serviceDeliveryExecution.execution_packets,
      delivery_status_summaries: serviceDeliveryExecution.delivery_status_summaries,
      voice_service_status: {
        ...voiceServiceStatus,
        packets: voiceSetupPackets,
      },
      first_client_voice_activation: firstClientVoiceActivation,
    },
    implementationWorkOrders: {
      created_this_run: implementation.created,
      skipped_existing: implementation.skipped,
      summary: implementation.summary,
      store_path: implementation.storePath,
      orders: implementation.workOrders,
    },
    approvalExecutionQueue,
    sources,
    generated_at: now,
  };

  mkdirSync(outputDir, { recursive: true });
  const datedPath = path.join(outputDir, `${run.id}.json`);
  writeFileSync(datedPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

  // `latest.json` is the single source-of-truth the dashboard/Hermes read locally.
  const latestPath = path.join(outputDir, "latest.json");
  writeFileSync(latestPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

  // Durable persistence so a Vercel-served dashboard (read-only fs) can read the
  // same state. Best-effort and gated: no-ops when Supabase isn't configured, and
  // never throws — a persistence hiccup must not break the local run. Pass
  // `persistSupabase: false` to force-skip (used by hermetic tests).
  let supabase = { ok: false, skipped: true, reason: "disabled" };
  if (options.persistSupabase !== false) {
    supabase = await upsertRevenueState(document);
  }

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
    approval_execution_queue: {
      count: approvalExecutionQueue.count,
      skipped_not_approved: approvalExecutionQueue.skipped_not_approved,
    },
    lead_supply_daily_loop: leadSupplyDailyLoop.summary,
    durable_revenue_execution_queue: durableRevenueExecutionQueue.summary,
    service_delivery_execution: serviceDeliveryExecution.summary,
    voice_service_status: voiceServiceStatus.summary,
    first_client_voice_activation: firstClientVoiceActivation.summary,
    revenue_risks: run.plan.revenue_risks,
    health: run.health,
    dated_output_path: datedPath,
    latest_output_path: latestPath,
    work_orders_store_path: implementation.storePath,
    supabase_persisted: supabase.ok === true,
    supabase,
  };

  return { summary, document, outputDir, datedPath, latestPath, storePath: implementation.storePath, supabase };
}
