import { getAgentResourceRegistry } from "./multiAgentCommandState.mjs";

export const AUTONOMY_GRADUATION_STATE_VERSION = "phase10a_autonomy_graduation_framework_v1";

export const ACTION_RISK_LEVELS = ["low", "medium", "high", "critical"];

export const AUTONOMY_LEVELS = {
  L0: {
    level: "L0",
    id: "advisory_only",
    allowed_actions: ["read/report state", "generate recommendations", "explain blockers"],
    blocked_actions: ["queue work", "modify state", "send messages", "call", "charge", "deploy"],
    required_approvals: ["none unless advisory output contains sensitive recommendation"],
    required_evidence: ["source state reference", "report timestamp"],
    caps_limits: ["no execution", "no external side effects"],
    rollback_requirements: ["no rollback needed because no state change is allowed"],
    monitoring_requirements: ["report generation audit"],
    escalation_rules: ["escalate unclear or sensitive recommendations to Jonathan/operator"],
  },
  L1: {
    level: "L1",
    id: "draft_or_queue_only",
    allowed_actions: ["create drafts", "create queue items", "create repair recommendations", "prepare approval packets"],
    blocked_actions: ["client-facing send", "live call", "production workflow trigger", "payment action"],
    required_approvals: ["approval required before any queued external action executes"],
    required_evidence: ["queue item id", "source evidence path", "policy receipt where applicable"],
    caps_limits: ["queue only", "no live execution"],
    rollback_requirements: ["idempotent queue keys", "dedupe keys for generated items"],
    monitoring_requirements: ["queue counts", "blocked/held reasons"],
    escalation_rules: ["escalate missing evidence paths or duplicate risk"],
  },
  L2: {
    level: "L2",
    id: "execute_low_risk_with_evidence",
    allowed_actions: ["controlled low-risk internal updates", "safe queue/report execution", "non-production status updates with evidence"],
    blocked_actions: ["medium/high/critical real-world action", "production configuration changes", "client-facing send without gate"],
    required_approvals: ["owner approval for medium/high/critical; none for proven low-risk within policy"],
    required_evidence: ["sandbox tests", "evidence path", "idempotency key", "duplicate prevention key"],
    caps_limits: ["low-risk only", "predefined per-run caps"],
    rollback_requirements: ["rollback or fail-closed behavior for state-changing work"],
    monitoring_requirements: ["evidence read-back", "duplicate monitoring", "incident check"],
    escalation_rules: ["escalate any missing evidence, cap overflow, or incident"],
  },
  L3: {
    level: "L3",
    id: "controlled_real_execution_with_caps",
    allowed_actions: ["controlled real execution within caps", "approved email within cap/window", "approved follow-up task creation"],
    blocked_actions: ["uncapped execution", "bulk outreach", "production voice launch", "pricing/product/payment changes"],
    required_approvals: ["owner approval", "policy-specific approval", "Jonathan/operator approval for high risk"],
    required_evidence: ["controlled-real acceptance evidence", "provider evidence", "policy receipt", "monitoring record"],
    caps_limits: ["business-hour windows", "per-run and per-recipient caps", "duplicate suppression"],
    rollback_requirements: ["fail-closed on policy or provider evidence failure", "rollback plan where reversible"],
    monitoring_requirements: ["live evidence read-back", "watchdog", "safety incident tracking"],
    escalation_rules: ["escalate provider failure, missing read-back, or cap/window breach"],
  },
  L4: {
    level: "L4",
    id: "production_gated_execution",
    allowed_actions: ["operator-approved production workflow", "operator-approved deploy/env/data action"],
    blocked_actions: ["critical actions without explicit Jonathan/operator approval", "auth bypass", "secret exposure", "safety-control disablement"],
    required_approvals: ["explicit Jonathan/operator approval", "production gate approval"],
    required_evidence: ["approval record", "rollback/fail-closed plan", "monitoring plan", "post-action read-back"],
    caps_limits: ["single approved scope", "time-boxed production flag", "named target only"],
    rollback_requirements: ["documented rollback or fail-closed behavior before execution"],
    monitoring_requirements: ["post-action verification", "incident monitor", "flag cleanup verification"],
    escalation_rules: ["block and escalate if scope, flag, auth, evidence, or rollback is missing"],
  },
  L5: {
    level: "L5",
    id: "fully_autonomous_approved_domain",
    allowed_actions: ["fully autonomous actions only inside an explicitly approved domain with audited limits"],
    blocked_actions: ["critical cross-domain action", "new capability activation", "credential/access grants", "bulk outreach without fresh approval"],
    required_approvals: ["domain approval", "recurring review approval", "explicit Jonathan/operator approval for critical actions"],
    required_evidence: ["domain approval", "continuous monitoring", "incident-free history", "rollback/fail-closed evidence"],
    caps_limits: ["approved domain boundary", "standing caps", "automatic kill switch"],
    rollback_requirements: ["tested rollback", "automatic fail-closed on monitor failure"],
    monitoring_requirements: ["continuous monitor", "incident SLA", "operator-visible audit"],
    escalation_rules: ["auto-downgrade on incident, cap breach, or missing monitor"],
  },
};

const RISK_EXAMPLES = {
  low: [
    "read/report state",
    "generate drafts",
    "create queue items",
    "create repair recommendations",
    "update internal non-production status with evidence",
  ],
  medium: [
    "send approved email within cap/window",
    "create approved follow-up task",
    "queue approved call",
    "create client-facing draft",
    "update CRM state with evidence",
  ],
  high: [
    "place live call",
    "send client-facing launch instructions",
    "trigger production workflow",
    "change routing",
    "modify deployment/env config",
    "change database schema",
    "create payment link",
    "activate Retell production behavior",
  ],
  critical: [
    "charge money",
    "change pricing/products",
    "provision phone numbers",
    "production voice launch",
    "delete data",
    "send bulk outreach",
    "grant credentials/access",
    "disable safety controls",
  ],
};

const RISK_PATTERNS = [
  ["critical", /\b(charge money|charge|pricing|product|provision phone|production voice launch|delete data|bulk outreach|grant credentials|grant access|disable safety)\b/i],
  ["high", /\b(place live call|live call|launch instructions|production workflow|change routing|deployment|env config|database schema|payment link|retell production)\b/i],
  ["medium", /\b(send approved email|approved email|follow-up task|queue approved call|client-facing draft|crm state)\b/i],
  ["low", /\b(read|report state|generate draft|create draft|queue item|repair recommendation|internal non-production status)\b/i],
];

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

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(clean(value));
}

function levelNumber(level) {
  const match = clean(level).match(/^L([0-5])$/i);
  return match ? Number(match[1]) : 0;
}

function riskRank(risk) {
  const index = ACTION_RISK_LEVELS.indexOf(lower(risk));
  return index === -1 ? 0 : index;
}

function nextLevel(current = "L0", requested = "L0") {
  return levelNumber(requested) > levelNumber(current) ? requested : current;
}

export function classifyActionRisk(input = {}) {
  const explicit = lower(input.risk_level || input.risk);
  if (ACTION_RISK_LEVELS.includes(explicit)) {
    return { risk_level: explicit, reason: "explicit_risk_level", examples: RISK_EXAMPLES[explicit] };
  }
  const text = lower([input.action, input.category, input.task_type, input.description].filter(Boolean).join(" "));
  for (const [risk, pattern] of RISK_PATTERNS) {
    if (pattern.test(text)) return { risk_level: risk, reason: `matched_${risk}_risk_pattern`, examples: RISK_EXAMPLES[risk] };
  }
  return { risk_level: "low", reason: "default_low_risk_unknown_read_or_queue_only", examples: RISK_EXAMPLES.low };
}

export function evaluateAutonomyGraduation(action = {}) {
  const risk = classifyActionRisk(action).risk_level;
  const currentLevel = clean(action.current_autonomy_level || action.currentAutonomyLevel || "L0").toUpperCase();
  const requestedLevel = clean(action.requested_autonomy_level || action.requestedAutonomyLevel || currentLevel).toUpperCase();
  const targetLevel = nextLevel(currentLevel, requestedLevel);
  const targetNumber = levelNumber(targetLevel);
  const blocked = [];
  const requiredBefore = [];

  const requireField = (condition, reason, requirement) => {
    if (condition) return;
    blocked.push(reason);
    requiredBefore.push(requirement);
  };

  if (targetNumber >= 1) {
    requireField(hasValue(action.evidence_requirements || action.required_evidence), "missing_evidence_requirements", "evidence_requirements");
    requireField(hasValue(action.duplicate_prevention || action.duplicate_prevention_key), "missing_duplicate_prevention", "duplicate_prevention");
  }
  if (targetNumber >= 2) {
    requireField(action.sandbox_tests_passed === true, "missing_sandbox_tests", "sandbox_tests_passed");
    requireField(hasValue(action.controlled_real_acceptance_evidence), "missing_controlled_real_acceptance_evidence", "controlled_real_acceptance_evidence");
    requireField(hasValue(action.idempotency_protection || action.idempotency_key), "missing_idempotency_protection", "idempotency_protection");
    requireField(action.rollback_or_fail_closed === true || hasValue(action.rollback_plan), "missing_rollback_or_fail_closed_behavior", "rollback_or_fail_closed");
    requireField(action.monitoring === true || hasValue(action.monitoring_plan), "missing_monitoring", "monitoring");
    requireField(hasValue(action.caps_limits || action.caps), "missing_caps_limits", "caps_limits");
  }
  if (riskRank(risk) >= riskRank("medium")) {
    requireField(action.owner_approval === true, "owner_approval_required", "owner_approval");
  }
  if (riskRank(risk) >= riskRank("high")) {
    requireField(action.owner_approval === true, "high_risk_owner_approval_required", "owner_approval");
  }
  if (risk === "critical") {
    requireField(action.jonathan_operator_approval === true, "critical_requires_explicit_jonathan_operator_approval", "explicit_jonathan_operator_approval");
  }
  if (asArray(action.unresolved_safety_incidents).length) {
    blocked.push("unresolved_safety_incidents");
    requiredBefore.push("resolve_safety_incidents");
  }

  const uniqueBlocked = [...new Set(blocked)];
  const uniqueRequired = [...new Set(requiredBefore)];
  return {
    action_id: clean(action.action_id || action.task_id || action.category || "action"),
    category: clean(action.category || action.task_type || "uncategorized"),
    risk_level: risk,
    current_autonomy_level: currentLevel,
    requested_autonomy_level: requestedLevel,
    next_autonomy_level: targetLevel,
    allowed_to_graduate: uniqueBlocked.length === 0,
    blocked_reasons: uniqueBlocked,
    required_before_graduation: uniqueRequired,
    approval_requirement: risk === "critical"
      ? "explicit_jonathan_operator_approval"
      : riskRank(risk) >= riskRank("medium") ? "owner_approval" : "policy_and_evidence",
    evidence_requirement: asArray(action.evidence_requirements || action.required_evidence),
    caps_limits: action.caps_limits || action.caps || {},
    rollback_requirement: action.rollback_or_fail_closed === true || hasValue(action.rollback_plan)
      ? "rollback_or_fail_closed_present"
      : "rollback_or_fail_closed_required",
    monitoring_requirement: action.monitoring === true || hasValue(action.monitoring_plan)
      ? "monitoring_present"
      : "monitoring_required",
    unresolved_safety_incidents: asArray(action.unresolved_safety_incidents),
  };
}

const AUTHORITY_MAPPING = {
  hermes: {
    max_autonomy_level: "L2",
    allowed_risk_level: "low",
    allowed_execution_modes: ["advisory", "draft_or_queue", "low_risk_internal_with_evidence"],
    approval_requirements: ["owner approval for medium/high/critical"],
    evidence_requirements: ["routing reason", "source queue reference", "status evidence"],
    forbidden_actions: ["live client outreach", "calls", "charges", "deploys", "schema changes", "Retell production activation"],
  },
  codex: {
    max_autonomy_level: "L2",
    allowed_risk_level: "medium",
    allowed_execution_modes: ["sandbox code work", "tests", "read adapter repair"],
    approval_requirements: ["production deploy approval", "live schema migration approval"],
    evidence_requirements: ["files changed", "tests run", "build result"],
    forbidden_actions: ["live outreach", "unapproved deploy", "secret exposure", "production secret pull"],
  },
  claude_code: {
    max_autonomy_level: "L2",
    allowed_risk_level: "medium",
    allowed_execution_modes: ["sandbox code work", "fallback repair packets"],
    approval_requirements: ["production deploy approval", "live schema migration approval"],
    evidence_requirements: ["handoff packet", "files changed", "tests run"],
    forbidden_actions: ["live outreach", "unapproved deploy", "secret exposure"],
  },
  cowork: {
    max_autonomy_level: "L1",
    allowed_risk_level: "low",
    allowed_execution_modes: ["browser research", "public source enrichment", "queue-only platform tasks"],
    approval_requirements: ["platform write approval", "client contact approval"],
    evidence_requirements: ["public source URL", "screenshot or notes"],
    forbidden_actions: ["posting", "commenting", "DMs", "credential changes", "unapproved outreach"],
  },
  jonathan_operator: {
    max_autonomy_level: "L5",
    allowed_risk_level: "critical",
    allowed_execution_modes: ["approval review", "production exception", "critical decision"],
    approval_requirements: [],
    evidence_requirements: ["decision record", "approval or rejection reason"],
    forbidden_actions: ["automated bulk execution without separate domain approval"],
  },
  retell_call_rail: {
    max_autonomy_level: "L3",
    allowed_risk_level: "high",
    allowed_execution_modes: ["controlled test calls", "approved capped call execution"],
    approval_requirements: ["call policy approval", "production voice launch approval"],
    evidence_requirements: ["call id", "call status", "transcript or reason", "approval id"],
    forbidden_actions: ["production voice launch", "phone number provisioning", "unapproved outbound calls"],
  },
  email_rail: {
    max_autonomy_level: "L3",
    allowed_risk_level: "medium",
    allowed_execution_modes: ["approved capped email execution", "business-hours send window"],
    approval_requirements: ["copy approval", "outreach policy", "caps/window policy"],
    evidence_requirements: ["message id", "recipient", "timestamp", "policy receipt"],
    forbidden_actions: ["bulk outreach", "unapproved copy", "DNC contact", "duplicate outreach"],
  },
  supabase_data_rail: {
    max_autonomy_level: "L2",
    allowed_risk_level: "medium",
    allowed_execution_modes: ["read adapter", "evidence persistence", "approved non-production data work"],
    approval_requirements: ["schema migration live approval", "production data mutation approval"],
    evidence_requirements: ["migration or adapter summary", "readback evidence", "idempotency key"],
    forbidden_actions: ["unapproved schema change", "duplicate table creation", "secret exposure"],
  },
  vercel_deploy_rail: {
    max_autonomy_level: "L1",
    allowed_risk_level: "high",
    allowed_execution_modes: ["approved deploy planning", "route verification", "env names only"],
    approval_requirements: ["production deploy or flag change approval"],
    evidence_requirements: ["deployment id", "route status", "env names only"],
    forbidden_actions: ["unapproved deploy", "unsafe env toggle", "secret printing"],
  },
};

function plannedAuthorityProfile(agent = {}) {
  return {
    max_autonomy_level: "L0",
    allowed_risk_level: "low",
    allowed_execution_modes: ["planned profile only"],
    approval_requirements: ["explicit phase activation", "operator approval"],
    evidence_requirements: ["future authority boundary"],
    forbidden_actions: ["all live execution", "routing", "external side effects"],
    routable: false,
    authority_source: clean(agent.current_status || "planned_non_routable"),
  };
}

export function getCapabilityAuthorityMapping() {
  const registry = getAgentResourceRegistry();
  const mapping = {};
  for (const agent of registry.active) {
    mapping[agent.agent_key] = {
      ...(AUTHORITY_MAPPING[agent.agent_key] || plannedAuthorityProfile(agent)),
      routable: agent.routable === true,
      registry_authority_level: clean(agent.authority_level),
    };
  }
  for (const agent of registry.reserved) {
    mapping[agent.agent_key] = {
      max_autonomy_level: "L0",
      allowed_risk_level: "low",
      allowed_execution_modes: ["alias only"],
      approval_requirements: ["explicit operator activation before any routing"],
      evidence_requirements: ["alias activation record"],
      forbidden_actions: ["duplicate Hermes authority", "direct task routing", "live execution"],
      routable: false,
      authority_source: "reserved_alias_for_hermes",
    };
  }
  for (const agent of registry.planned) {
    mapping[agent.agent_key] = plannedAuthorityProfile(agent);
  }
  return clone(mapping);
}

export function defaultAutonomyActionCandidates(input = {}) {
  const tasks = [
    ...asArray(input.commandTasks),
    ...asArray(input.taskOwnershipLedger?.active_handoffs).map((item) => ({
      action_id: item.task_id,
      category: item.task_type,
      risk_level: item.risk_level,
      current_autonomy_level: "L1",
      requested_autonomy_level: lower(item.execution_mode) === "controlled_real" ? "L3" : lower(item.execution_mode) === "production_gated" ? "L4" : "L2",
      evidence_requirements: item.evidence_requirement,
      duplicate_prevention: item.duplicate_prevention_key,
      idempotency_protection: item.duplicate_prevention_key,
      rollback_or_fail_closed: lower(item.execution_mode) !== "production_gated",
      monitoring: true,
      caps_limits: lower(item.task_type).includes("email") ? { window: "business_hours" } : { per_run: 1 },
      owner_approval: !asArray(item.approval_requirement).length,
      controlled_real_acceptance_evidence: lower(item.execution_mode) === "advisory" ? "queue-only evidence" : "",
      unresolved_safety_incidents: [],
    })),
  ];
  return tasks;
}

function summarizeEvaluations(evaluations = []) {
  const byRisk = Object.fromEntries(ACTION_RISK_LEVELS.map((risk) => [risk, 0]));
  const byLevel = Object.fromEntries(Object.keys(AUTONOMY_LEVELS).map((level) => [level, 0]));
  for (const item of evaluations) {
    if (byRisk[item.risk_level] !== undefined) byRisk[item.risk_level] += 1;
    if (byLevel[item.next_autonomy_level] !== undefined) byLevel[item.next_autonomy_level] += 1;
  }
  return {
    actions_evaluated: evaluations.length,
    graduation_allowed: evaluations.filter((item) => item.allowed_to_graduate).length,
    graduation_blocked: evaluations.filter((item) => !item.allowed_to_graduate).length,
    by_risk: byRisk,
    by_target_autonomy_level: byLevel,
  };
}

export function buildAutonomyGraduationState(input = {}) {
  const now = clean(input.now) || new Date().toISOString();
  const candidates = asArray(input.actionCandidates).length
    ? asArray(input.actionCandidates)
    : defaultAutonomyActionCandidates(input);
  const evaluations = candidates.map(evaluateAutonomyGraduation);
  const blocked = evaluations.filter((item) => !item.allowed_to_graduate);
  const allowed = evaluations.filter((item) => item.allowed_to_graduate);
  const currentLevels = Object.fromEntries(evaluations.map((item) => [item.category, item.allowed_to_graduate ? item.next_autonomy_level : item.current_autonomy_level]));
  const requiredEvidence = blocked.flatMap((item) => item.required_before_graduation.map((requirement) => ({
    action_id: item.action_id,
    requirement,
  })));
  const safetyIncidents = blocked.flatMap((item) => asArray(item.unresolved_safety_incidents).map((incident) => ({
    action_id: item.action_id,
    incident,
    status: "unresolved",
  })));

  return {
    version: AUTONOMY_GRADUATION_STATE_VERSION,
    generated_at: now,
    autonomy_levels: clone(AUTONOMY_LEVELS),
    action_risk_model: {
      levels: ACTION_RISK_LEVELS,
      examples: clone(RISK_EXAMPLES),
    },
    current_autonomy_level_by_action_category: currentLevels,
    evaluations,
    blocked_graduation_items: blocked,
    graduation_allowed_items: allowed,
    required_evidence_before_graduation: requiredEvidence,
    safety_incidents: safetyIncidents,
    approval_requirements: evaluations.map((item) => ({
      action_id: item.action_id,
      risk_level: item.risk_level,
      approval_requirement: item.approval_requirement,
    })),
    authority_mapping: getCapabilityAuthorityMapping(),
    graduation_rules: [
      "sandbox_tests_passed",
      "controlled_real_acceptance_evidence",
      "idempotency_protection",
      "duplicate_prevention",
      "rollback_or_fail_closed_where_applicable",
      "monitoring",
      "evidence_requirements",
      "caps_limits",
      "owner_approval_for_medium_high_critical",
      "no_unresolved_safety_incidents",
    ],
    security_guardrails: {
      no_secrets_in_logs_or_reports: true,
      no_local_pulling_of_production_secrets: true,
      no_auth_bypass: true,
      no_forged_admin_cookies: true,
      same_origin_admin_guard_required: true,
      fail_closed_when_flags_disabled: true,
      production_flags_removed_after_acceptance_runs: true,
      live_actions_require_policy_checks: true,
      completed_statuses_require_evidence: true,
      critical_actions_require_jonathan_operator_approval: true,
    },
    rails_reused: [
      "approvalExecutionQueue",
      "safe action policies",
      "multiAgentCommandState",
      "taskOwnershipLedger",
      "resourceAvailabilityState",
      "schedulingWindowState",
      "dispatchControlState",
      "dailyAutonomousOperatingCycle",
      "serviceDeliveryExecution",
      "durableRevenueExecutionQueue",
      "controlledEmailExecution",
      "Retell/call rails",
      "commercial/payment/onboarding rails",
      "latest.json/read adapter",
    ],
    tables_reused: [
      "latest.json",
      "implementation-work-orders.json",
      "approval/evidence event stores",
      "service delivery persistence stores",
      "commercial payment evidence stores",
      "email/call evidence stores",
    ],
    tables_added: [],
    next_operator_action: blocked.length
      ? "review_blocked_autonomy_graduation_items"
      : allowed.length ? "maintain_current_autonomy_caps_and_monitoring" : "continue_autonomy_evidence_collection",
    summary: summarizeEvaluations(evaluations),
    safety: {
      no_live_execution_expanded: true,
      no_email_sent: true,
      no_calls_placed: true,
      no_retell_production_activation: true,
      no_stripe_or_n8n_triggered: true,
      no_deploy_triggered: true,
      no_supabase_schema_modified: true,
      no_secrets_exposed: true,
      no_new_runtime_agents_created: true,
      no_action_raised_to_live_autonomy_without_evidence_and_approval: true,
      no_admin_or_auth_bypass: true,
    },
  };
}
