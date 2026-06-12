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
  readDurableRevenueExecutionQueue,
} from "./leadSupplyExecutionPersistence.mjs";
import { prepareControlledEmailExecution } from "./leadSupplyEmailExecutionGate.mjs";
import { runControlledEmailExecutionAcceptance } from "./controlledEmailExecutionAcceptance.mjs";
import { runPublicLeadDiscovery } from "./publicLeadDiscovery.mjs";
import { buildMultiAgentCommandState } from "./multiAgentCommandState.mjs";
import { buildTaskOwnershipLedger } from "./taskOwnershipLedger.mjs";
import {
  buildResourceAvailabilityState,
  buildSchedulingWindowState,
} from "./resourceAvailabilityScheduling.mjs";
import { buildDispatchControlState } from "./dispatchControlState.mjs";
import { buildDailyAutonomousOperatingCycle } from "./dailyAutonomousOperatingCycle.mjs";
import { buildAutonomyGraduationState } from "./autonomyGraduationFramework.mjs";
import { buildAutonomyGraduationReviewState } from "./autonomyGraduationReviewWorkflow.mjs";

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

function cleanExecutionRailTaskType(rail = "") {
  const value = String(rail || "").trim().toLowerCase();
  if (value === "codex") return "code_changes";
  if (value === "cowork") return "browser_manual_research";
  if (value === "hermes_internal") return "service_delivery_work_order";
  if (value === "manual_review") return "approval_review";
  return "service_delivery_work_order";
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
  const publicLeadDiscovery = runPublicLeadDiscovery({
    sources: options.publicLeadDiscoverySources || [],
    now,
    doNotContact: options.leadSupplyDoNotContact,
    recentContactHistory: options.publicLeadRecentContactHistory,
    existingAliases: options.publicLeadExistingAliases,
    leadSupplyOptions: options.leadSupplyOptions,
  });
  const leadSupplySources = options.leadSupplySources || [
      { source_type: "existing_ottoserv_lead_records", records: input.leads },
      { source_type: "front_office_leak_check_submissions", records: scans },
    ];
  const leadSupplyDailyLoop = runLeadSupplyDailyLoop({
    sources: [...leadSupplySources, ...publicLeadDiscovery.leadSupplySources],
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
  let durableRevenueExecutionQueue = persistedLeadSupplyExecution.queue;
  let controlledEmailExecution = prepareControlledEmailExecution(durableRevenueExecutionQueue, {
    now,
    ...(options.controlledEmailExecutionOptions || {}),
  });
  if (options.controlledEmailAcceptanceOptions) {
    controlledEmailExecution = await runControlledEmailExecutionAcceptance({
      now,
      queue: durableRevenueExecutionQueue,
      store: leadSupplyExecutionStore,
      ...(options.controlledEmailExecutionOptions || {}),
      ...(options.controlledEmailAcceptanceOptions || {}),
    });
    durableRevenueExecutionQueue = readDurableRevenueExecutionQueue({ store: leadSupplyExecutionStore });
  }
  const commandTasks = [
    ...asArray(options.commandTasks),
    ...asArray(approvalExecutionQueue.items),
    ...asArray(serviceDeliveryExecution.execution_packets).map((packet) => ({
      task_id: packet.task_id,
      task_type: cleanExecutionRailTaskType(packet.execution_rail),
      assigned_agent: packet.assigned_agent,
      status: packet.status,
      required_evidence: packet.required_evidence,
      evidence_path: asArray(packet.required_evidence).join("; "),
      approval_required: packet.status === "blocked_pending_approval",
      created_at: packet.created_at,
      source: "serviceDeliveryExecution",
    })),
    ...asArray(durableRevenueExecutionQueue.items).map((item) => ({
      task_id: item.action_id,
      task_type: item.raw_action?.email?.intent ? "email_queue_execution" : item.raw_action?.call?.intent ? "call_queue_execution" : "revenue_queue_task",
      assigned_agent: item.raw_action?.email?.intent ? "email_rail" : item.raw_action?.call?.intent ? "retell_call_rail" : "hermes",
      status: item.status,
      lead_id: item.lead_id,
      required_evidence: ["policy_receipt", "execution_evidence"],
      evidence_path: item.evidence_source_reference,
      created_at: item.created_at,
      source: "durableRevenueExecutionQueue",
    })),
    ...asArray(publicLeadDiscovery.cowork_packets).map((packet) => ({
      task_id: packet.packet_id,
      task_type: "browser_manual_research",
      assigned_agent: "cowork",
      status: "queued",
      lead_id: packet.lead_id,
      required_evidence: packet.required_evidence,
      evidence_path: asArray(packet.required_evidence).join("; "),
      created_at: packet.created_at,
      source: "publicLeadDiscovery",
    })),
  ];
  const multiAgentCommandState = buildMultiAgentCommandState({
    now,
    tasks: commandTasks,
    resources: options.commandResources || options.agentResources || {},
  });
  const builtTaskOwnershipLedger = buildTaskOwnershipLedger({
    now,
    tasks: commandTasks,
    resources: options.commandResources || options.agentResources || {},
    multiAgentCommandState,
    durableRevenueExecutionQueue,
    serviceDeliveryExecution,
    approvalExecutionQueue,
    publicLeadDiscovery,
    store: options.taskOwnershipStore,
  });
  const taskOwnershipLedger = Object.fromEntries(
    Object.entries(builtTaskOwnershipLedger).filter(([key]) => key !== "store"),
  );
  const resourceAvailabilityState = buildResourceAvailabilityState({
    now,
    resources: options.commandResources || options.agentResources || {},
    taskOwnershipLedger,
  });
  const schedulingWindowState = buildSchedulingWindowState({
    now,
    resources: options.commandResources || options.agentResources || {},
    taskOwnershipLedger,
    resourceAvailabilityState,
    approvals: options.schedulingApprovals || options.commandApprovals || {},
  });
  const dispatchControlState = buildDispatchControlState({
    now,
    taskOwnershipLedger,
    resourceAvailabilityState,
    schedulingWindowState,
  });
  const dailyAutonomousOperatingCycle = buildDailyAutonomousOperatingCycle({
    now,
    mode: options.dailyOperatingCycleMode || "queue_only",
    state: {
      leadSupplyDailyLoop,
      publicLeadDiscovery,
      durableRevenueExecutionQueue,
      controlledEmailExecution,
      serviceDeliveryExecution,
      approvalExecutionQueue,
    },
    commandTasks,
    resources: options.commandResources || options.agentResources || {},
    approvals: options.schedulingApprovals || options.commandApprovals || {},
    multiAgentCommandState,
    taskOwnershipLedger,
    resourceAvailabilityState,
    schedulingWindowState,
    dispatchControlState,
  });
  const autonomyGraduationState = buildAutonomyGraduationState({
    now,
    actionCandidates: options.autonomyGraduationActions,
    commandTasks,
    multiAgentCommandState,
    taskOwnershipLedger,
    resourceAvailabilityState,
    schedulingWindowState,
    dispatchControlState,
    dailyAutonomousOperatingCycle,
  });
  const autonomyGraduationReviewState = buildAutonomyGraduationReviewState({
    now,
    autonomyGraduationState,
    decisions: options.autonomyGraduationReviewDecisions,
    requests: options.autonomyGraduationReviewRequests,
  });

  const document = {
    ...run,
    leadSupplyDailyLoop,
    publicLeadDiscovery,
    durableRevenueExecutionQueue,
    controlledEmailExecution,
    multiAgentCommandState,
    taskOwnershipLedger,
    resourceAvailabilityState,
    schedulingWindowState,
    dispatchControlState,
    dailyAutonomousOperatingCycle,
    autonomyGraduationState,
    autonomyGraduationReviewState,
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
    public_lead_discovery: publicLeadDiscovery.summary,
    durable_revenue_execution_queue: durableRevenueExecutionQueue.summary,
    controlled_email_execution: controlledEmailExecution.summary,
    multi_agent_command_state: multiAgentCommandState.summary,
    task_ownership_ledger: taskOwnershipLedger.summary,
    resource_availability_state: resourceAvailabilityState.summary,
    scheduling_window_state: schedulingWindowState.summary,
    dispatch_control_state: dispatchControlState.summary,
    daily_autonomous_operating_cycle: dailyAutonomousOperatingCycle.report_summary,
    autonomy_graduation_state: autonomyGraduationState.summary,
    autonomy_graduation_review_state: autonomyGraduationReviewState.summary,
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
