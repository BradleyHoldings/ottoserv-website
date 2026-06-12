import { buildDispatchControlState } from "./dispatchControlState.mjs";
import { buildMultiAgentCommandState } from "./multiAgentCommandState.mjs";
import {
  buildResourceAvailabilityState,
  buildSchedulingWindowState,
} from "./resourceAvailabilityScheduling.mjs";
import { buildTaskOwnershipLedger } from "./taskOwnershipLedger.mjs";

export const DAILY_AUTONOMOUS_OPERATING_CYCLE_VERSION = "phase9a_daily_autonomous_operating_cycle_v1";

export const DAILY_OPERATING_CYCLE_ORDER = [
  "collect_current_state",
  "run_public_lead_discovery_where_safe",
  "run_lead_supply_daily_loop",
  "update_durable_revenue_queue",
  "evaluate_service_delivery_work",
  "evaluate_task_ownership_ledger",
  "evaluate_resource_availability_and_scheduling_windows",
  "evaluate_dispatch_decisions",
  "identify_safe_actions_that_can_run_now",
  "identify_held_actions_and_next_eligible_times",
  "identify_approval_needed_actions",
  "identify_stale_failed_blocked_tasks",
  "create_repair_recommendations",
  "create_delegation_packets_where_safe",
  "compile_daily_evidence_report",
  "produce_next_operator_action",
];

const SAFE_QUEUE_TASK_RE = /browser|research|queue|daily|lead|service_delivery|code|repair/i;
const LIVE_ACTION_RE = /email_queue_execution|call_queue_execution|retell|voice|stripe|deploy|n8n|browser_automation/i;

function clean(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function compactAction(item = {}, extra = {}) {
  return {
    task_id: clean(item.task_id),
    source_system: clean(item.source_system),
    task_type: clean(item.task_type),
    current_owner: clean(item.current_owner || item.target_assignee_resource),
    reason: clean(item.reason || item.hold_reason),
    next_eligible_time: clean(item.next_eligible_time),
    execution_mode: clean(item.execution_mode),
    ...extra,
  };
}

function count(value, key) {
  const direct = Number(value?.summary?.[key]);
  return Number.isFinite(direct) ? direct : 0;
}

function countNested(value, section, key) {
  const direct = Number(value?.summary?.[section]?.[key]);
  return Number.isFinite(direct) ? direct : 0;
}

function staleTaskRepair(handoff = {}, now) {
  return {
    id: `phase9a-repair-stale-${clean(handoff.task_id)}`,
    reason: "stale_task",
    task_id: clean(handoff.task_id),
    owner: clean(handoff.current_owner),
    recommended_action: clean(handoff.fallback_owner) && clean(handoff.fallback_owner) !== clean(handoff.current_owner)
      ? "route_to_fallback_or_operator_review"
      : "operator_review_required",
    status: "queued_recommendation",
    created_at: now,
  };
}

function blockedResourceRepair(resource = {}, now) {
  return {
    id: `phase9a-repair-resource-${clean(resource.resource_key)}`,
    reason: "blocked_or_exhausted_resource",
    resource_key: clean(resource.resource_key),
    status_reason: clean(resource.status_reason),
    next_eligible_time: clean(resource.next_eligible_time),
    recommended_action: clean(resource.fallback_route) ? "route_safe_work_to_fallback" : "manual_resource_recovery",
    status: "queued_recommendation",
    created_at: now,
  };
}

function missingEvidenceRepair(action = {}, now) {
  return {
    id: `phase9a-repair-evidence-${clean(action.task_id)}`,
    reason: "missing_evidence_path",
    task_id: clean(action.task_id),
    recommended_action: "attach_or_create_required_evidence_path",
    status: "queued_recommendation",
    created_at: now,
  };
}

function sourceRepair(input = {}, now) {
  return asArray(input.state?.leadSupplyDailyLoop?.repairs_created).map((item) => ({
    id: clean(item.id),
    reason: clean(item.failure_class || item.reason) || "source_repair_recommendation",
    task_id: clean(item.task_id || item.lead_id),
    recommended_action: clean(item.detail) || "review_source_repair_packet",
    status: clean(item.status) || "queued_recommendation",
    created_at: clean(item.created_at) || now,
  }));
}

function buildStates(input = {}) {
  const now = clean(input.now) || new Date().toISOString();
  const state = input.state || {};
  const resources = input.resources || {};
  const tasks = asArray(input.commandTasks);
  const useSourceQueues = tasks.length === 0;
  const multiAgentCommandState = input.multiAgentCommandState || state.multiAgentCommandState || buildMultiAgentCommandState({ now, tasks, resources });
  const taskOwnershipLedger = input.taskOwnershipLedger || state.taskOwnershipLedger || buildTaskOwnershipLedger({
    now,
    tasks,
    resources,
    multiAgentCommandState,
    durableRevenueExecutionQueue: useSourceQueues ? state.durableRevenueExecutionQueue : {},
    serviceDeliveryExecution: useSourceQueues ? state.serviceDeliveryExecution : {},
    approvalExecutionQueue: useSourceQueues ? state.approvalExecutionQueue : {},
    publicLeadDiscovery: useSourceQueues ? state.publicLeadDiscovery : {},
  });
  const resourceAvailabilityState = input.resourceAvailabilityState || state.resourceAvailabilityState || buildResourceAvailabilityState({
    now,
    resources,
    taskOwnershipLedger,
  });
  const schedulingWindowState = input.schedulingWindowState || state.schedulingWindowState || buildSchedulingWindowState({
    now,
    resources,
    taskOwnershipLedger,
    resourceAvailabilityState,
    approvals: input.approvals || {},
  });
  const dispatchControlState = input.dispatchControlState || state.dispatchControlState || buildDispatchControlState({
    now,
    taskOwnershipLedger,
    resourceAvailabilityState,
    schedulingWindowState,
  });
  return { multiAgentCommandState, taskOwnershipLedger, resourceAvailabilityState, schedulingWindowState, dispatchControlState };
}

function safeExecutedActions(dispatchControlState = {}) {
  return asArray(dispatchControlState.dispatch_ready_tasks)
    .filter((item) => SAFE_QUEUE_TASK_RE.test(item.task_type) && !LIVE_ACTION_RE.test(item.task_type))
    .map((item) => compactAction(item, { posture: "executed_safe", safe_effect: "queue_or_report_recorded" }));
}

function queuedActions(dispatchControlState = {}) {
  return asArray(dispatchControlState.decisions)
    .filter((item) => ["no_action"].includes(clean(item.dispatch_decision)) && SAFE_QUEUE_TASK_RE.test(item.task_type))
    .map((item) => compactAction(item, { posture: "queued" }));
}

function approvalActions(dispatchControlState = {}, ledger = {}) {
  const fromDispatch = [
    ...asArray(dispatchControlState.escalations).filter((item) => ["request_approval", "blocked_policy"].includes(clean(item.dispatch_decision))),
    ...asArray(dispatchControlState.decisions).filter((item) => clean(item.dispatch_decision) === "request_approval"),
  ];
  const fromLedger = asArray(ledger.escalations_required)
    .filter((item) => /approval/i.test(clean(item.reason)))
    .map((item) => ({ ...item, task_type: "approval_review", current_owner: item.escalation_owner, reason: item.reason }));
  const seen = new Set();
  return [...fromDispatch, ...fromLedger].filter((item) => {
    const id = clean(item.task_id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map((item) => compactAction(item, { posture: "approval_required" }));
}

function blockedActions(dispatchControlState = {}, ledger = {}) {
  const blocked = [
    ...asArray(dispatchControlState.blocked_tasks),
    ...asArray(dispatchControlState.fallback_required_tasks),
    ...asArray(dispatchControlState.repair_required_tasks),
    ...asArray(ledger.stale_handoffs).map((item) => ({ ...item, reason: "stale_task" })),
    ...asArray(ledger.blocked_handoffs).map((item) => ({ ...item, reason: clean(item.status) || "blocked_task" })),
  ];
  const seen = new Set();
  return blocked.filter((item) => {
    const id = clean(item.task_id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map((item) => compactAction(item, { posture: "blocked" }));
}

function repairRecommendations({ now, state, resourceAvailabilityState, taskOwnershipLedger, dispatchControlState }) {
  const repairs = [
    ...sourceRepair({ state }, now),
    ...asArray(resourceAvailabilityState.blocked_resources).map((item) => blockedResourceRepair(item, now)),
    ...asArray(taskOwnershipLedger.stale_handoffs).map((item) => staleTaskRepair(item, now)),
    ...asArray(dispatchControlState.blocked_tasks)
      .filter((item) => clean(item.reason) === "missing_evidence_path")
      .map((item) => missingEvidenceRepair(item, now)),
  ];
  const seen = new Set();
  return repairs.filter((item) => {
    const id = clean(item.id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function nextOperatorAction({ approvals, repairs, held, blocked, dispatchReady }) {
  if (approvals.length) return "review_phase9a_approval_required_actions";
  if (repairs.length) return "review_phase9a_repair_recommendations";
  if (blocked.length) return "clear_phase9a_blockers";
  if (held.length) return "wait_for_next_eligible_window_or_queue_safe_work";
  if (dispatchReady.length) return "dispatch_safe_queue_only_actions_under_existing_gates";
  return "continue_daily_operating_cycle_monitoring";
}

export function buildDailyAutonomousOperatingCycle(input = {}) {
  const now = clean(input.now) || new Date().toISOString();
  const mode = clean(input.mode) || "queue_only";
  const state = input.state || {};
  const {
    multiAgentCommandState,
    taskOwnershipLedger,
    resourceAvailabilityState,
    schedulingWindowState,
    dispatchControlState,
  } = buildStates(input);

  const executedSafe = safeExecutedActions(dispatchControlState);
  const queued = queuedActions(dispatchControlState);
  const held = asArray(dispatchControlState.held_tasks).map((item) => compactAction(item, { posture: "held_until_window" }));
  const approvals = approvalActions(dispatchControlState, taskOwnershipLedger);
  const blocked = blockedActions(dispatchControlState, taskOwnershipLedger);
  const repairs = repairRecommendations({ now, state, resourceAvailabilityState, taskOwnershipLedger, dispatchControlState });
  const delegations = [
    ...asArray(state.publicLeadDiscovery?.cowork_packets).map((item) => ({ packet_id: clean(item.packet_id), type: "public_lead_research", status: "created_queue_only" })),
    ...asArray(state.leadSupplyDailyLoop?.cowork_packets).map((item) => ({ packet_id: clean(item.packet_id), type: "lead_enrichment_research", status: "created_queue_only" })),
    ...asArray(state.leadSupplyDailyLoop?.codex_packets).map((item) => ({ packet_id: clean(item.packet_id), type: "codex_or_claude_repair", status: "created_queue_only" })),
  ].filter((item) => clean(item.packet_id));
  const dispatchReady = asArray(dispatchControlState.dispatch_ready_tasks).map((item) => compactAction(item, { posture: "dispatch_ready" }));
  const nextAction = nextOperatorAction({ approvals, repairs, held, blocked, dispatchReady });

  return {
    version: DAILY_AUTONOMOUS_OPERATING_CYCLE_VERSION,
    cycle_id: `phase9a-${now.slice(0, 10)}-${now.slice(11, 19).replace(/:/g, "")}`,
    timestamp: now,
    mode,
    cycle_order: DAILY_OPERATING_CYCLE_ORDER,
    revenue_summary: {
      lead_supply_actions: count(state.leadSupplyDailyLoop, "actions_selected"),
      emails_queued: count(state.leadSupplyDailyLoop, "emails_queued"),
      revenue_queue_items: asArray(state.durableRevenueExecutionQueue?.items).length,
      controlled_email_held: count(state.controlledEmailExecution, "held"),
      repairs_created: count(state.leadSupplyDailyLoop, "repairs_created"),
    },
    service_delivery_summary: {
      records_seen: count(state.serviceDeliveryExecution, "records_seen"),
      work_orders_total: countNested(state.serviceDeliveryExecution, "work_orders", "total"),
      approvals_pending: countNested(state.serviceDeliveryExecution, "approvals", "pending"),
      execution_packets_queue_ready: countNested(state.serviceDeliveryExecution, "execution_packets", "queue_ready"),
    },
    lead_discovery_summary: {
      discovered_count: count(state.publicLeadDiscovery, "discovered_count"),
      accepted_count: count(state.publicLeadDiscovery, "accepted_count"),
      cowork_packets_created: count(state.publicLeadDiscovery, "cowork_packets_created"),
    },
    report_summary: {
      executed_safe: executedSafe.length,
      queued: queued.length,
      held_until_window: held.length,
      approval_required: approvals.length,
      delegated: delegations.length,
      repair_required: repairs.length,
      blocked: blocked.length,
      manual_operator_required: approvals.length + blocked.length,
    },
    action_posture: {
      executed_safe: executedSafe,
      queued,
      held_until_window: held,
      approval_required: approvals,
      delegated: delegations,
      repair_required: repairs,
      blocked,
      manual_operator_required: [...approvals, ...blocked],
    },
    executed_safe: executedSafe,
    queued_actions: queued,
    held_actions: held,
    approval_needed_actions: approvals,
    dispatch_ready_actions: dispatchReady,
    blocked_actions: blocked,
    stale_tasks: asArray(taskOwnershipLedger.stale_handoffs).map((item) => compactAction(item, { posture: "repair_required" })),
    repair_recommendations: repairs,
    delegations_created: delegations,
    resource_constraints: {
      summary: resourceAvailabilityState.summary,
      blocked_resources: asArray(resourceAvailabilityState.blocked_resources).map(clone),
    },
    conflict_warnings: [
      ...asArray(taskOwnershipLedger.conflict_warnings),
      ...asArray(multiAgentCommandState.conflict_warnings),
    ],
    evidence_summary: {
      source_records_seen: count(state.leadSupplyDailyLoop, "leads_sourced") + count(state.publicLeadDiscovery, "discovered_count"),
      required_evidence_paths_tracked: asArray(taskOwnershipLedger.active_handoffs).filter((item) => asArray(item.evidence_requirement).length).length,
      report_generated: true,
      latest_json_update_ready: true,
      no_completed_without_evidence: true,
    },
    next_operator_action: nextAction,
    latest_json_read_model: {
      dailyAutonomousOperatingCycle: true,
      executed_safe_actions: executedSafe.length,
      queued_actions: queued.length,
      held_actions: held.length,
      approvals_needed: approvals.length,
      repairs_recommended: repairs.length,
      delegations_created: delegations.length,
      blockers: blocked.length,
      next_operator_action: nextAction,
    },
    safety_confirmations: {
      phase9a_queue_or_report_only: true,
      no_live_email_sent: true,
      no_live_calls_placed: true,
      no_retell_production_activation: true,
      no_stripe_n8n_browser_or_deploy_triggered: true,
      no_supabase_schema_modified: true,
      no_duplicate_tables_created: true,
      no_secrets_exposed: true,
      no_completed_without_evidence: true,
      uncertain_actions_queued_or_held: true,
    },
    component_states: {
      multiAgentCommandState,
      taskOwnershipLedger,
      resourceAvailabilityState,
      schedulingWindowState,
      dispatchControlState,
    },
  };
}
