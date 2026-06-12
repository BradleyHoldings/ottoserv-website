import { saveApproval } from "./execution/approvalStore.mjs";

export const AUTONOMY_GRADUATION_REVIEW_VERSION = "phase10b_autonomy_graduation_review_v1";

export const OPERATOR_DECISIONS = [
  "approve_bounded_autonomy",
  "reject_graduation",
  "defer_until_evidence",
  "require_manual_only",
  "reduce_autonomy",
  "suspend_autonomy",
  "request_retest",
  "request_operator_review",
];

const ACTIVE_APPROVAL_DECISIONS = new Set(["approve_bounded_autonomy"]);
const REJECTED_DEFERRED_DECISIONS = new Set(["reject_graduation", "defer_until_evidence", "require_manual_only", "request_retest", "request_operator_review"]);
const SUSPENDED_REDUCED_DECISIONS = new Set(["reduce_autonomy", "suspend_autonomy"]);
const PLANNED_AGENTS = new Set(["nova", "dash", "atlas", "sentinel"]);

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

function slug(value, fallback = "item") {
  return lower(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
}

function requestIdFor(item = {}) {
  return `agr-${slug(item.action_id || item.request_id || item.category || "request")}`;
}

function levelNumber(level) {
  const match = clean(level).match(/^L([0-5])$/i);
  return match ? Number(match[1]) : 0;
}

function boundedLevel(requested, allowed) {
  const requestedLevel = clean(requested || "L0").toUpperCase();
  const allowedLevel = clean(allowed || requestedLevel).toUpperCase();
  return levelNumber(allowedLevel) <= levelNumber(requestedLevel) ? allowedLevel : requestedLevel;
}

function defaultAgentsFor(category = "") {
  const value = lower(category);
  if (/email/.test(value)) return ["email_rail", "hermes"];
  if (/call|voice|retell/.test(value)) return ["retell_call_rail", "hermes"];
  if (/data|schema|supabase/.test(value)) return ["supabase_data_rail", "codex"];
  if (/deploy|vercel/.test(value)) return ["vercel_deploy_rail", "codex"];
  if (/browser|research|cowork/.test(value)) return ["cowork", "hermes"];
  if (/payment|commercial|stripe/.test(value)) return ["jonathan_operator", "hermes"];
  return ["hermes"];
}

function defaultRailsFor(category = "") {
  const value = lower(category);
  if (/email/.test(value)) return ["email rail", "approvalExecutionQueue", "controlledEmailExecution"];
  if (/call|voice|retell/.test(value)) return ["Retell/call rail", "approvalExecutionQueue"];
  if (/data|schema|supabase/.test(value)) return ["Supabase/data rail", "approval store"];
  if (/deploy|vercel/.test(value)) return ["Vercel/deploy rail", "approval store"];
  if (/payment|commercial|stripe/.test(value)) return ["commercial/payment rail", "approval store"];
  return ["approval store", "autonomyGraduationState"];
}

function recommendationFor(item = {}) {
  if (asArray(item.unresolved_safety_incidents).length) return "defer";
  if (asArray(item.required_before_graduation).length) return "needs_more_evidence";
  if (lower(item.risk_level) === "critical") return "request_operator_review";
  return "approve";
}

export function createGraduationRequest(item = {}, options = {}) {
  const category = clean(item.category || item.action_category || "uncategorized");
  const caps = item.caps_limits || item.caps || {};
  return {
    request_id: clean(item.request_id) || requestIdFor(item),
    action_category: category,
    action_id: clean(item.action_id || item.request_id || category),
    current_autonomy_level: clean(item.current_autonomy_level || "L0").toUpperCase(),
    requested_autonomy_level: clean(item.requested_autonomy_level || item.next_autonomy_level || "L0").toUpperCase(),
    risk_class: lower(item.risk_level || item.risk_class || "low"),
    requested_by: clean(options.requestedBy || item.requested_by) || "Hermes",
    reason: clean(options.reason || item.reason) || `Review autonomy graduation for ${category}.`,
    supporting_evidence: asArray(options.supportingEvidence).length ? asArray(options.supportingEvidence) : asArray(item.evidence_requirement || item.evidence_requirements),
    missing_evidence: asArray(item.required_before_graduation || item.missing_evidence),
    caps_limits: caps,
    time_window_constraints: clean(options.timeWindowConstraints || item.time_window_constraints || caps.window),
    rollback_fail_closed_status: clean(item.rollback_requirement || item.rollback_fail_closed_status || "rollback_or_fail_closed_required"),
    monitoring_status: clean(item.monitoring_requirement || item.monitoring_status || "monitoring_required"),
    safety_incidents_exceptions: asArray(item.unresolved_safety_incidents || item.safety_incidents_exceptions),
    affected_agents_resources: asArray(options.affectedAgents).length ? asArray(options.affectedAgents) : asArray(item.affected_agents_resources).length ? asArray(item.affected_agents_resources) : defaultAgentsFor(category),
    affected_rails: asArray(options.affectedRails).length ? asArray(options.affectedRails) : asArray(item.affected_rails).length ? asArray(item.affected_rails) : defaultRailsFor(category),
    recommended_decision: clean(options.recommendedDecision || item.recommended_decision) || recommendationFor(item),
    current_status: clean(item.current_status) || "pending_operator_review",
    source_blocked_reasons: asArray(item.blocked_reasons),
    created_at: clean(options.now) || new Date().toISOString(),
  };
}

function statusForDecision(decision) {
  if (decision === "approve_bounded_autonomy") return "approved_bounded";
  if (decision === "reject_graduation") return "rejected";
  if (decision === "defer_until_evidence") return "deferred";
  if (decision === "require_manual_only") return "manual_only";
  if (decision === "reduce_autonomy") return "reduced";
  if (decision === "suspend_autonomy") return "suspended";
  if (decision === "request_retest") return "retest_requested";
  return "operator_review_requested";
}

function hasJonathanAuthority(operator = "") {
  return /jonathan|operator/i.test(clean(operator));
}

function hasPlannedAgent(request = {}) {
  return asArray(request.affected_agents_resources).some((agent) => PLANNED_AGENTS.has(lower(agent)));
}

function hasJarvis(request = {}) {
  return asArray(request.affected_agents_resources).some((agent) => lower(agent) === "jarvis");
}

function boundedPolicyFor(request = {}, decision = {}) {
  const approved = decision.decision === "approve_bounded_autonomy";
  return {
    request_id: request.request_id,
    action_category: request.action_category,
    enabled_for_future_gated_execution: approved,
    max_autonomy_level_allowed: approved ? decision.max_autonomy_level_allowed : request.current_autonomy_level,
    risk_class: request.risk_class,
    caps_limits: decision.caps_limits || {},
    expires_at: clean(decision.expires_at),
    review_at: clean(decision.review_at),
    approval_decision_id: clean(decision.decision_id),
    operator: clean(decision.operator),
    no_immediate_execution: true,
  };
}

function durableRecordFor(request = {}, decision = {}, now) {
  return {
    approval_id: `appr-autonomy-graduation-${slug(request.request_id)}`,
    operation_type: "autonomy_graduation",
    task_id: request.request_id,
    correlation_id: request.request_id,
    approved_by: clean(decision.operator),
    decision: decision.decision,
    scope: clean(decision.decision_scope) || `${request.action_category}:${request.requested_autonomy_level}`,
    policy_ref: "phase10b_autonomy_graduation_review",
    inheritable: false,
    expires_at: clean(decision.expires_at),
    consumed: false,
    consumed_at: "",
    consumed_by_task: "",
    created_at: now,
    updated_at: now,
    autonomy_graduation_request: request,
    operator_decision: decision,
    audit: [
      {
        step: "autonomy_graduation_decision_recorded",
        at: now,
        request_id: request.request_id,
        decision: decision.decision,
        no_live_execution_enabled: true,
      },
    ],
  };
}

export async function decideGraduationRequest(request = {}, input = {}, options = {}) {
  const now = clean(options.now) || new Date().toISOString();
  const decisionValue = clean(input.decision);
  if (!OPERATOR_DECISIONS.includes(decisionValue)) {
    return { ok: false, reason: "unsupported_operator_decision" };
  }
  if (decisionValue === "approve_bounded_autonomy" && !asArray(input.evidence_references).length) {
    return { ok: false, reason: "approval_requires_evidence_references" };
  }
  if (decisionValue === "approve_bounded_autonomy" && lower(request.risk_class) === "critical" && !hasJonathanAuthority(input.operator)) {
    return { ok: false, reason: "critical_requires_jonathan_operator_decision" };
  }
  if (decisionValue === "approve_bounded_autonomy" && hasPlannedAgent(request)) {
    return { ok: false, reason: "planned_agents_not_routable" };
  }
  if (decisionValue === "approve_bounded_autonomy" && hasJarvis(request)) {
    return { ok: false, reason: "jarvis_cannot_duplicate_hermes_authority" };
  }

  const decision = {
    decision_id: `autonomy-${slug(request.request_id)}-${now.replace(/[^0-9]/g, "")}`,
    request_id: clean(request.request_id),
    decision: decisionValue,
    operator: clean(input.operator) || "Jonathan/operator",
    timestamp: now,
    reason: clean(input.reason) || "No reason supplied.",
    decision_scope: clean(input.decision_scope) || `${request.action_category}:${request.requested_autonomy_level}`,
    max_autonomy_level_allowed: boundedLevel(request.requested_autonomy_level, input.max_autonomy_level_allowed),
    caps_limits: input.caps_limits || request.caps_limits || {},
    expires_at: clean(input.expires_at),
    review_at: clean(input.review_at || input.expires_at),
    evidence_references: asArray(input.evidence_references),
    rollback_requirements: asArray(input.rollback_requirements).length ? asArray(input.rollback_requirements) : [request.rollback_fail_closed_status],
    monitoring_requirements: asArray(input.monitoring_requirements).length ? asArray(input.monitoring_requirements) : [request.monitoring_status],
    current_status: statusForDecision(decisionValue),
    no_live_execution_enabled: true,
  };
  const bounded_policy = boundedPolicyFor(request, decision);
  await saveApproval(durableRecordFor(request, decision, now), options);
  return {
    ok: true,
    decision,
    bounded_policy,
    safety: {
      no_live_execution_triggered: true,
      no_email_sent: true,
      no_calls_placed: true,
      no_retell_production_activation: true,
      no_stripe_or_n8n_triggered: true,
      no_deploy_triggered: true,
      no_schema_modified: true,
    },
  };
}

function latestDecisionByRequest(decisions = []) {
  const out = new Map();
  for (const decision of asArray(decisions)) {
    const id = clean(decision.request_id);
    if (!id) continue;
    const existing = out.get(id);
    if (!existing || clean(decision.timestamp) > clean(existing.timestamp)) out.set(id, decision);
  }
  return out;
}

function summarize({ requests, approved, rejectedDeferred, suspendedReduced }) {
  return {
    pending_requests: requests.length,
    approved_bounded_autonomy: approved.length,
    rejected_deferred: rejectedDeferred.length,
    suspended_reduced: suspendedReduced.length,
    decisions_recorded: approved.length + rejectedDeferred.length + suspendedReduced.length,
  };
}

function nextOperatorAction({ requests, rejectedDeferred, suspendedReduced }) {
  if (rejectedDeferred.some((item) => item.decision === "defer_until_evidence")) return "collect_required_evidence_for_deferred_autonomy";
  if (suspendedReduced.length) return "review_suspended_or_reduced_autonomy";
  if (requests.length) return "review_pending_autonomy_graduation_requests";
  if (rejectedDeferred.length) return "monitor_rejected_or_manual_only_autonomy_items";
  return "continue_autonomy_review_monitoring";
}

export function buildAutonomyGraduationReviewState(input = {}) {
  const now = clean(input.now) || new Date().toISOString();
  const graduationState = input.autonomyGraduationState || {};
  const rawRequests = asArray(input.requests).length
    ? asArray(input.requests)
    : asArray(graduationState.blocked_graduation_items).map((item) => createGraduationRequest(item, { now }));
  const decisions = asArray(input.decisions);
  const latest = latestDecisionByRequest(decisions);
  const pending = rawRequests.filter((request) => !latest.has(request.request_id));
  const approved = decisions.filter((decision) => ACTIVE_APPROVAL_DECISIONS.has(clean(decision.decision))).map((decision) => ({
    request_id: decision.request_id,
    action_category: clean(rawRequests.find((request) => request.request_id === decision.request_id)?.action_category),
    max_autonomy_level_allowed: decision.max_autonomy_level_allowed,
    caps_limits: decision.caps_limits || {},
    expires_at: clean(decision.expires_at),
    review_at: clean(decision.review_at),
    evidence_references: asArray(decision.evidence_references),
    operator: clean(decision.operator),
    decision_id: clean(decision.decision_id),
    no_immediate_execution: true,
  }));
  const rejectedDeferred = decisions.filter((decision) => REJECTED_DEFERRED_DECISIONS.has(clean(decision.decision))).map(clone);
  const suspendedReduced = decisions.filter((decision) => SUSPENDED_REDUCED_DECISIONS.has(clean(decision.decision))).map(clone);
  const activeCaps = approved.map((item) => ({
    request_id: item.request_id,
    max_autonomy_level_allowed: item.max_autonomy_level_allowed,
    caps_limits: item.caps_limits,
    expires_at: item.expires_at,
  }));
  const reviewRequirements = approved
    .filter((item) => item.expires_at || item.review_at)
    .map((item) => ({ request_id: item.request_id, expires_at: item.expires_at, review_at: item.review_at || item.expires_at }));
  const nextEvidence = [
    ...pending.flatMap((request) => request.missing_evidence.map((evidence) => ({ request_id: request.request_id, evidence }))),
    ...rejectedDeferred
      .filter((decision) => decision.decision === "defer_until_evidence")
      .flatMap((decision) => asArray(decision.evidence_references).map((evidence) => ({ request_id: decision.request_id, evidence }))),
  ];

  return {
    version: AUTONOMY_GRADUATION_REVIEW_VERSION,
    generated_at: now,
    pending_graduation_requests: pending,
    approved_bounded_autonomy: approved,
    rejected_deferred_requests: rejectedDeferred,
    suspended_reduced_autonomy_items: suspendedReduced,
    active_autonomy_caps: activeCaps,
    expiration_review_requirements: reviewRequirements,
    operator_decision_history: decisions.map(clone),
    next_required_evidence: nextEvidence,
    bounded_autonomy_policy: {
      approved_autonomy_changes: approved,
      active_autonomy_caps: activeCaps,
      expiration_review_requirements: reviewRequirements,
      no_automatic_live_enablement: true,
    },
    approval_rails_reused: ["execution/approvalStore", "approvalExecutionBridge", "hermesApprovalOutbox pattern", "latest.json/read adapter"],
    tables_reused: ["data/revenue-engine/approvals/*.json", "latest.json", "revenue_engine_state document"],
    tables_added: [],
    next_operator_action: nextOperatorAction({ requests: pending, rejectedDeferred, suspendedReduced }),
    summary: summarize({ requests: pending, approved, rejectedDeferred, suspendedReduced }),
    safety: {
      no_live_execution_enabled_from_approval: true,
      no_email_sent: true,
      no_calls_placed: true,
      no_retell_production_activation: true,
      no_stripe_or_n8n_triggered: true,
      no_deploy_triggered: true,
      no_schema_modified: true,
      no_duplicate_approval_tables_created: true,
      planned_agents_not_granted_live_authority: true,
      jarvis_not_duplicate_hermes_authority: true,
    },
  };
}
