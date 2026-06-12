export const DISPATCH_CONTROL_STATE_VERSION = "phase8d_dispatch_control_state_v1";

const TERMINAL_STATUSES = new Set(["completed_with_evidence", "completed", "cancelled"]);

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function scheduleByTask(schedulingWindowState = {}) {
  return new Map(asArray(schedulingWindowState.decisions).map((item) => [clean(item.task_id), item]));
}

export function repairRecommendationFor(handoff = {}) {
  const type = lower(handoff.task_type);
  const owner = lower(handoff.current_owner);
  if (/code|test|build|database|schema|deploy/.test(type) || /codex|claude/.test(owner)) return "create_codex_repair_packet";
  if (/browser|research|cowork/.test(type) || owner === "cowork") return "create_cowork_research_packet";
  if (/email/.test(type)) return "hold_for_resource_reset";
  if (/call|voice|retell/.test(type)) return "escalate_to_jonathan";
  return "retry_same_owner";
}

function baseDecision(handoff = {}, schedule = {}) {
  return {
    task_id: clean(handoff.task_id),
    source_system: clean(handoff.source_system),
    task_type: clean(handoff.task_type),
    current_owner: clean(handoff.current_owner),
    target_assignee_resource: clean(schedule.required_resource || handoff.current_owner),
    current_status: clean(handoff.status),
    dispatch_decision: "no_action",
    reason: "",
    required_approval: asArray(handoff.approval_requirement),
    required_evidence: asArray(handoff.evidence_requirement),
    next_eligible_time: clean(schedule.next_eligible_time),
    fallback_owner: clean(handoff.fallback_owner || schedule.fallback_route),
    escalation_owner: clean(handoff.escalation_owner) || "jonathan_operator",
    recommended_next_operator_action: "continue_dispatch_monitoring",
    repair_recommendation: "",
    execution_mode: clean(handoff.execution_mode),
    lock_conflict_key: clean(handoff.lock_conflict_key),
    duplicate_prevention_key: clean(handoff.duplicate_prevention_key),
    no_live_execution: true,
  };
}

function missingEvidence(handoff = {}, schedule = {}) {
  return !asArray(handoff.evidence_requirement).length || clean(schedule.hold_reason) === "missing_evidence_path";
}

function isProductionGatedWithoutApproval(handoff = {}, schedule = {}) {
  return lower(handoff.execution_mode) === "production_gated" && clean(schedule.hold_reason) === "approval_required";
}

export function decideTaskDispatch(handoff = {}, schedule = {}) {
  const decision = baseDecision(handoff, schedule);
  const status = lower(handoff.status);
  const recommended = clean(schedule.recommended_action);
  const holdReason = clean(schedule.hold_reason);

  if (TERMINAL_STATUSES.has(status)) {
    return { ...decision, dispatch_decision: "no_action", reason: "task_terminal_or_already_complete" };
  }
  if (status === "failed") {
    return {
      ...decision,
      dispatch_decision: "repair_required",
      reason: "failed_task_needs_repair",
      repair_recommendation: repairRecommendationFor(handoff),
      recommended_next_operator_action: "repair_failed_dispatch_task",
    };
  }
  if (["stale", "fallback_required", "escalated"].includes(status)) {
    return {
      ...decision,
      dispatch_decision: status === "fallback_required" ? "escalate_to_operator" : "escalate_to_operator",
      reason: holdReason || "stale_or_escalated_task",
      recommended_next_operator_action: "review_stale_or_escalated_task",
    };
  }
  if (holdReason === "conflict_lock_active" || recommended === "cancel_or_review") {
    return { ...decision, dispatch_decision: "blocked_conflict", reason: "conflict_lock_active", recommended_next_operator_action: "resolve_conflict_before_dispatch" };
  }
  if (missingEvidence(handoff, schedule)) {
    return { ...decision, dispatch_decision: "blocked_missing_evidence_path", reason: "missing_evidence_path", recommended_next_operator_action: "attach_evidence_path_before_dispatch" };
  }
  if (isProductionGatedWithoutApproval(handoff, schedule)) {
    return { ...decision, dispatch_decision: "blocked_policy", reason: "production_gated_without_approval", recommended_next_operator_action: "request_operator_approval" };
  }
  if (recommended === "request_approval") {
    return { ...decision, dispatch_decision: "request_approval", reason: holdReason || "approval_required", recommended_next_operator_action: "request_required_approval" };
  }
  if (recommended === "fallback_to_other_agent") {
    return { ...decision, dispatch_decision: "fallback_required", reason: holdReason || "owner_unavailable", recommended_next_operator_action: "route_to_fallback_owner" };
  }
  if (recommended === "manual_check_required") {
    return { ...decision, dispatch_decision: "escalate_to_operator", reason: holdReason || "manual_check_required", recommended_next_operator_action: "manual_resource_check_required" };
  }
  if (recommended === "block_until_resource_available") {
    return { ...decision, dispatch_decision: "blocked_resource", reason: holdReason || "resource_unavailable", recommended_next_operator_action: "wait_for_resource_or_choose_fallback" };
  }
  if (recommended === "hold_until_window") {
    return { ...decision, dispatch_decision: "hold_until_window", reason: holdReason || "outside_allowed_window", recommended_next_operator_action: "hold_until_window_opens" };
  }
  if (schedule.can_run_now === true && recommended === "run_now") {
    return { ...decision, dispatch_decision: "dispatch_ready", reason: "all_dispatch_gates_passed", recommended_next_operator_action: "dispatch_under_existing_rail" };
  }
  return { ...decision, dispatch_decision: "no_action", reason: holdReason || "not_dispatchable_yet" };
}

function bucket(decisions, value) {
  return decisions.filter((item) => item.dispatch_decision === value).map(clone);
}

function nextOperatorAction(decisions) {
  if (decisions.some((item) => item.dispatch_decision === "blocked_conflict")) return "resolve_dispatch_conflicts";
  if (decisions.some((item) => item.dispatch_decision === "repair_required")) return "repair_failed_dispatch_tasks";
  if (decisions.some((item) => item.dispatch_decision === "blocked_policy" || item.dispatch_decision === "request_approval")) return "review_dispatch_approval_requests";
  if (decisions.some((item) => item.dispatch_decision === "fallback_required")) return "route_dispatch_fallbacks";
  if (decisions.some((item) => item.dispatch_decision === "escalate_to_operator")) return "review_dispatch_escalations";
  if (decisions.some((item) => item.dispatch_decision === "hold_until_window")) return "wait_for_dispatch_windows";
  if (decisions.some((item) => item.dispatch_decision === "dispatch_ready")) return "dispatch_ready_tasks_under_existing_gates";
  return "continue_dispatch_monitoring";
}

export function buildDispatchControlState(input = {}) {
  const now = clean(input.now) || input.schedulingWindowState?.generated_at || input.taskOwnershipLedger?.generated_at || new Date().toISOString();
  const handoffs = asArray(input.taskOwnershipLedger?.active_handoffs);
  const schedules = scheduleByTask(input.schedulingWindowState || {});
  const decisions = handoffs.map((handoff) => decideTaskDispatch(handoff, schedules.get(clean(handoff.task_id)) || {}, input));
  const dispatchReady = bucket(decisions, "dispatch_ready");
  const held = bucket(decisions, "hold_until_window");
  const escalations = [...bucket(decisions, "escalate_to_operator"), ...bucket(decisions, "request_approval"), ...bucket(decisions, "blocked_policy")];
  const fallback = bucket(decisions, "fallback_required");
  const repairs = bucket(decisions, "repair_required");
  const blocked = decisions.filter((item) => item.dispatch_decision.startsWith("blocked_")).map(clone);
  return {
    version: DISPATCH_CONTROL_STATE_VERSION,
    generated_at: now,
    decisions: decisions.map(clone),
    dispatch_ready_tasks: dispatchReady,
    held_tasks: held,
    escalations,
    fallback_required_tasks: fallback,
    repair_required_tasks: repairs,
    blocked_tasks: blocked,
    next_eligible_actions: decisions.filter((item) => clean(item.next_eligible_time)).map((item) => ({ task_id: item.task_id, next_eligible_time: item.next_eligible_time, dispatch_decision: item.dispatch_decision })),
    next_operator_action: nextOperatorAction(decisions),
    summary: {
      tasks_seen: decisions.length,
      dispatch_ready: dispatchReady.length,
      held_tasks: held.length,
      escalations: escalations.length,
      fallback_required: fallback.length,
      repair_required: repairs.length,
      blocked_tasks: blocked.length,
      no_action: bucket(decisions, "no_action").length,
    },
    safety: {
      no_live_execution_triggered: true,
      no_email_sent: true,
      no_calls_placed: true,
      no_retell_production_activation: true,
      no_stripe_or_n8n_triggered: true,
      no_deploy_triggered: true,
      no_schema_modified: true,
      no_live_repairs_executed: true,
    },
  };
}
