import { resolveActorAvailability } from "./hermesActorAvailability.mjs";

export const MULTI_AGENT_COMMAND_STATE_VERSION = "phase8a_multi_agent_command_state_v1";

const RESOURCE_STATUSES = new Set(["available", "limited", "exhausted", "blocked", "unknown", "requires_manual_check"]);

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

const ACTIVE_AGENTS = [
  {
    agent_key: "hermes",
    display_name: "Hermes",
    type: "ai_agent",
    primary_role: "Command router, operating loop coordinator, queue triage, low-risk coordination.",
    allowed_task_types: ["revenue_queue_task", "service_delivery_work_order", "repair_stalled_task_handling", "evidence_review", "approval_routing", "public_lead_discovery"],
    blocked_task_types: ["production_deploy_without_approval", "production_voice_activation_without_approval", "live_outreach_without_rail"],
    authority_level: "command_coordinator",
    required_approvals: ["production_gated_actions"],
    evidence_requirements: ["routing_reason", "source_queue_reference", "status_change_evidence"],
    resource_dependency: "local_runtime",
    availability_status: "available",
    fallback_route: "jonathan_operator",
    escalation_route: "jonathan_operator",
    routable: true,
  },
  {
    agent_key: "codex",
    display_name: "Codex",
    type: "code_worker",
    primary_role: "Code changes, tests, build verification, adapter repair, controlled implementation packets.",
    allowed_task_types: ["code_changes", "tests_build", "repair_stalled_task_handling", "database_schema_work_sandbox", "service_delivery_build_packet"],
    blocked_task_types: ["live_client_outreach", "unapproved_production_deploy", "secret_exposure"],
    authority_level: "sandbox_worker",
    required_approvals: ["production_deploy", "schema_migration_live"],
    evidence_requirements: ["files_changed", "tests_run", "build_result"],
    resource_dependency: "codex_credits",
    availability_status: "unknown",
    fallback_route: "claude_code",
    escalation_route: "jonathan_operator",
    routable: true,
  },
  {
    agent_key: "claude_code",
    display_name: "Claude Code",
    type: "code_worker",
    primary_role: "Code-worker fallback/handoff for build-heavy or repair work.",
    allowed_task_types: ["code_changes", "tests_build", "repair_stalled_task_handling", "service_delivery_build_packet"],
    blocked_task_types: ["live_client_outreach", "unapproved_production_deploy", "secret_exposure"],
    authority_level: "sandbox_worker",
    required_approvals: ["production_deploy", "schema_migration_live"],
    evidence_requirements: ["handoff_packet", "files_changed", "tests_run"],
    resource_dependency: "claude_code_credits",
    availability_status: "unknown",
    fallback_route: "codex",
    escalation_route: "jonathan_operator",
    routable: true,
  },
  {
    agent_key: "cowork",
    display_name: "Cowork",
    type: "browser_worker",
    primary_role: "Browser/manual research, public lead enrichment, platform tasks under no-contact constraints.",
    allowed_task_types: ["browser_manual_research", "lead_research_enrichment", "public_lead_discovery", "cowork_research_packet"],
    blocked_task_types: ["unapproved_outreach", "posting_commenting_dm", "credential_changes"],
    authority_level: "research_worker",
    required_approvals: ["client_contact", "platform_write_actions"],
    evidence_requirements: ["public_source_url", "screenshot_or_notes", "contact_path_or_unavailable_reason"],
    resource_dependency: "cowork_credits",
    availability_status: "requires_manual_check",
    fallback_route: "hermes",
    escalation_route: "jonathan_operator",
    routable: true,
  },
  {
    agent_key: "jonathan_operator",
    display_name: "Jonathan/operator",
    type: "human_operator",
    primary_role: "Approval authority, exception handling, production launch decisions, sensitive commercial decisions.",
    allowed_task_types: ["approval_review", "production_voice_activation", "sensitive_commercial_actions", "client_facing_messages", "manual_review"],
    blocked_task_types: ["automated_bulk_execution"],
    authority_level: "final_approval_authority",
    required_approvals: [],
    evidence_requirements: ["decision_record", "approval_or_rejection_reason"],
    resource_dependency: "human_attention",
    availability_status: "requires_manual_check",
    fallback_route: "blocked_until_operator",
    escalation_route: "jonathan_operator",
    routable: true,
  },
  {
    agent_key: "retell_call_rail",
    display_name: "Retell/call rail",
    type: "voice_rail",
    primary_role: "Controlled call execution and Retell test-call evidence under approved policy.",
    allowed_task_types: ["call_queue_execution", "controlled_call_execution", "retell_test_calls"],
    blocked_task_types: ["production_voice_activation_without_approval", "number_provisioning_without_approval", "outbound_customer_calls_without_policy"],
    authority_level: "controlled_real_rail",
    required_approvals: ["call_policy_approval", "production_voice_launch_approval"],
    evidence_requirements: ["call_id", "call_status", "transcript_or_reason", "approval_id"],
    resource_dependency: "retell_credentials_and_phone_rail",
    availability_status: "unknown",
    fallback_route: "jonathan_operator",
    escalation_route: "jonathan_operator",
    routable: true,
  },
  {
    agent_key: "email_rail",
    display_name: "email rail",
    type: "email_rail",
    primary_role: "Controlled email queue execution with policy, evidence, and time-window gates.",
    allowed_task_types: ["email_queue_execution", "controlled_email_execution"],
    blocked_task_types: ["unapproved_copy", "outside_send_window", "do_not_contact", "duplicate_outreach"],
    authority_level: "controlled_real_rail",
    required_approvals: ["copy_approval", "outreach_policy"],
    evidence_requirements: ["message_id", "recipient", "timestamp", "policy_receipt"],
    resource_dependency: "email_transport_and_policy_rail",
    availability_status: "unknown",
    fallback_route: "jonathan_operator",
    escalation_route: "jonathan_operator",
    routable: true,
  },
  {
    agent_key: "supabase_data_rail",
    display_name: "Supabase/data rail",
    type: "data_rail",
    primary_role: "Canonical persistence, read adapters, service-role gated data writes.",
    allowed_task_types: ["database_schema_work", "data_persistence", "read_adapter", "evidence_event_persistence"],
    blocked_task_types: ["unapproved_schema_change", "secret_exposure", "duplicate_table_creation"],
    authority_level: "data_rail",
    required_approvals: ["schema_migration_live", "production_data_mutation"],
    evidence_requirements: ["migration_or_adapter_summary", "readback_evidence", "idempotency_key"],
    resource_dependency: "supabase_service_role_runtime_env",
    availability_status: "unknown",
    fallback_route: "codex",
    escalation_route: "jonathan_operator",
    routable: true,
  },
  {
    agent_key: "vercel_deploy_rail",
    display_name: "Vercel/deploy rail",
    type: "deploy_rail",
    primary_role: "Approved deployment, env flag management, production route verification.",
    allowed_task_types: ["deployment", "vercel_env_management", "production_route_verification"],
    blocked_task_types: ["unapproved_deploy", "secret_printing", "unsafe_env_toggle"],
    authority_level: "production_gated_rail",
    required_approvals: ["production_deploy_or_flag_change"],
    evidence_requirements: ["deployment_id", "route_status", "env_names_only"],
    resource_dependency: "vercel_project_access",
    availability_status: "requires_manual_check",
    fallback_route: "jonathan_operator",
    escalation_route: "jonathan_operator",
    routable: true,
  },
];

const RESERVED_AGENTS = [
  {
    agent_key: "jarvis",
    display_name: "Jarvis",
    type: "reserved_alias",
    primary_role: "Reserved alias/future rename for Hermes command authority.",
    current_status: "reserved_alias",
    routable: false,
    fallback_route: "hermes",
    escalation_route: "jonathan_operator",
    note: "Do not route Jarvis as a separate active authority unless explicitly enabled.",
  },
];

const PLANNED_AGENTS = [
  ["nova", "Nova", "growth, creative, content intelligence, campaign ideation", "growth_creative"],
  ["dash", "Dash", "dashboard/reporting/operator visibility", "dashboard_reporting"],
  ["atlas", "Atlas", "research, market intelligence, lead intelligence", "market_research"],
  ["sentinel", "Sentinel", "monitoring, security, quality, failure detection", "monitoring_quality"],
].map(([agent_key, display_name, intended_role, capability]) => ({
  agent_key,
  display_name,
  type: "planned_agent",
  intended_role,
  possible_capability_area: capability,
  activation_requirements: ["explicit_phase_activation", "authority_boundary", "resource_status_model", "tests", "operator_approval"],
  current_status: "planned",
  routable: false,
  fallback_route: capability === "market_research" ? "cowork" : "hermes",
  escalation_route: "jonathan_operator",
}));

const CAPABILITY_MATRIX = {
  code_changes: { primary: "codex", fallback: "claude_code", capable_agents: ["codex", "claude_code"], approvals: [], evidence: ["files_changed", "tests_run"] },
  tests_build: { primary: "codex", fallback: "claude_code", capable_agents: ["codex", "claude_code"], approvals: [], evidence: ["test_output", "build_output"] },
  deployment: { primary: "vercel_deploy_rail", fallback: "jonathan_operator", capable_agents: ["vercel_deploy_rail"], approvals: ["production_deploy_or_flag_change"], evidence: ["deployment_id", "route_status"] },
  database_schema_work: { primary: "supabase_data_rail", fallback: "codex", capable_agents: ["supabase_data_rail", "codex"], approvals: ["schema_migration_live"], evidence: ["migration_summary", "readback_evidence"] },
  service_delivery_work_order: { primary: "hermes", fallback: "codex", capable_agents: ["hermes", "codex", "claude_code", "cowork", "jonathan_operator"], approvals: ["high_risk_work_order"], evidence: ["ticket_event", "work_order_id"] },
  revenue_queue_task: { primary: "hermes", fallback: "jonathan_operator", capable_agents: ["hermes", "email_rail", "retell_call_rail", "cowork", "codex"], approvals: ["risk_dependent"], evidence: ["queue_item_id", "policy_receipt"] },
  lead_research_enrichment: { primary: "cowork", fallback: "hermes", capable_agents: ["cowork", "hermes"], approvals: [], evidence: ["public_source_url", "research_notes"] },
  browser_manual_research: { primary: "cowork", fallback: "hermes", capable_agents: ["cowork", "hermes"], approvals: ["platform_write_actions"], evidence: ["screenshot_or_source_url"] },
  email_queue_execution: { primary: "email_rail", fallback: "jonathan_operator", capable_agents: ["email_rail"], approvals: ["copy_approval"], evidence: ["message_id", "policy_receipt"] },
  call_queue_execution: { primary: "retell_call_rail", fallback: "jonathan_operator", capable_agents: ["retell_call_rail"], approvals: ["call_policy_approval"], evidence: ["call_id", "call_status"] },
  retell_test_calls: { primary: "retell_call_rail", fallback: "jonathan_operator", capable_agents: ["retell_call_rail"], approvals: ["controlled_test_call_approval"], evidence: ["retell_call_id", "transcript_or_reason"] },
  production_voice_activation: { primary: "jonathan_operator", fallback: "blocked_until_operator", capable_agents: ["jonathan_operator"], approvals: ["jonathan_operator_approval"], evidence: ["launch_checklist", "rollback_plan", "approval_id"] },
  approval_review: { primary: "jonathan_operator", fallback: "blocked_until_operator", capable_agents: ["jonathan_operator"], approvals: [], evidence: ["decision_record"] },
  evidence_review: { primary: "hermes", fallback: "jonathan_operator", capable_agents: ["hermes", "jonathan_operator"], approvals: [], evidence: ["evidence_reference", "review_result"] },
  client_facing_messages: { primary: "jonathan_operator", fallback: "email_rail", capable_agents: ["jonathan_operator", "email_rail"], approvals: ["client_message_approval"], evidence: ["approved_copy", "send_evidence"] },
  sensitive_commercial_actions: { primary: "jonathan_operator", fallback: "blocked_until_operator", capable_agents: ["jonathan_operator"], approvals: ["commercial_approval"], evidence: ["commercial_evidence"] },
  public_lead_discovery: { primary: "hermes", fallback: "cowork", capable_agents: ["hermes", "cowork"], approvals: [], evidence: ["source_url_or_note"] },
  controlled_email_execution: { primary: "email_rail", fallback: "jonathan_operator", capable_agents: ["email_rail"], approvals: ["copy_approval", "send_window"], evidence: ["message_id_or_held_reason"] },
  controlled_call_execution: { primary: "retell_call_rail", fallback: "jonathan_operator", capable_agents: ["retell_call_rail"], approvals: ["call_policy_approval"], evidence: ["call_id_or_block_reason"] },
  repair_stalled_task_handling: { primary: "codex", fallback: "hermes", capable_agents: ["codex", "claude_code", "hermes", "cowork"], approvals: ["risk_dependent"], evidence: ["repair_summary", "tests_or_verification"] },
};

function byKey(items) {
  return Object.fromEntries(items.map((item) => [item.agent_key, item]));
}

export function getAgentResourceRegistry() {
  const active = ACTIVE_AGENTS.map(clone);
  const reserved = RESERVED_AGENTS.map(clone);
  const planned = PLANNED_AGENTS.map(clone);
  return {
    version: MULTI_AGENT_COMMAND_STATE_VERSION,
    active,
    reserved,
    planned,
    by_key: { ...byKey(active), ...byKey(reserved), ...byKey(planned) },
    safety: {
      jarvis_not_duplicate_authority: true,
      planned_agents_not_routable: true,
      no_runtime_workers_created: true,
    },
  };
}

export function getCapabilityMatrix() {
  return clone(CAPABILITY_MATRIX);
}

function normalizeResourceStatus(key, raw = {}) {
  const status = lower(raw.status || raw.state || raw.availability_status);
  return {
    agent_key: key,
    status: RESOURCE_STATUSES.has(status) ? status : status === "credit_exhausted" || status === "budget_exhausted" ? "exhausted" : status || "unknown",
    reason: clean(raw.reason),
    resets_at: clean(raw.resets_at),
    source: clean(raw.source) || "manual_or_runtime_status",
  };
}

export function buildResourceAvailabilitySummary(resources = {}) {
  const registry = getAgentResourceRegistry();
  const out = {};
  for (const agent of registry.active) {
    const raw = resources[agent.agent_key] || resources[agent.display_name] || {};
    const resolved = raw.status || raw.state
      ? normalizeResourceStatus(agent.agent_key, raw)
      : {
          agent_key: agent.agent_key,
          status: clean(agent.availability_status) || "unknown",
          reason: "",
          resets_at: "",
          source: "registry_default",
        };
    if (raw.state) {
      const actor = resolveActorAvailability(agent.display_name, { [agent.display_name]: raw }, new Date().toISOString());
      if (!actor.available && actor.temporary) resolved.status = "limited";
    }
    out[agent.agent_key] = resolved;
  }
  return out;
}

function agentAvailable(key, resources) {
  const status = resources[key]?.status || "unknown";
  return !["exhausted", "blocked"].includes(status);
}

function executionModeFor(task = {}, matrix = {}) {
  if (lower(task.risk_level) === "high" || task.approval_required || asArray(matrix.approvals).length) {
    if (/production/.test(lower(task.task_type))) return "production_gated";
    return "controlled_real";
  }
  if (["code_changes", "tests_build", "browser_manual_research", "lead_research_enrichment", "public_lead_discovery"].includes(clean(task.task_type))) return "sandbox";
  return "advisory";
}

function taskType(task = {}) {
  return clean(task.task_type || task.type || task.next_action || "manual_review");
}

function evidenceFor(task = {}, matrix = {}) {
  return asArray(task.required_evidence).length
    ? asArray(task.required_evidence)
    : asArray(matrix.evidence).length ? asArray(matrix.evidence) : ["execution_evidence_required"];
}

export function routeCommandTask(task = {}, options = {}) {
  const registry = getAgentResourceRegistry();
  const resources = buildResourceAvailabilitySummary(options.resources || {});
  const type = taskType(task);
  const matrix = CAPABILITY_MATRIX[type] || CAPABILITY_MATRIX.manual_review || {
    primary: "hermes",
    fallback: "jonathan_operator",
    capable_agents: ["hermes", "jonathan_operator"],
    approvals: [],
    evidence: ["routing_evidence"],
  };
  const requested = clean(task.requested_agent || task.assigned_agent);
  const warnings = [];
  const originalPrimary = matrix.primary;
  let primary = requested || originalPrimary;
  if (requested && registry.by_key[requested]?.routable === false) {
    warnings.push(`${requested} is reserved/planned and not routable; using fallback route.`);
    primary = registry.by_key[requested]?.fallback_route || originalPrimary;
  }
  if (!registry.by_key[primary]?.routable) primary = originalPrimary;
  if (!agentAvailable(primary, resources)) {
    const capableFallback = asArray(matrix.capable_agents).find((agent) => agent !== primary && agentAvailable(agent, resources) && registry.by_key[agent]?.routable);
    primary = capableFallback || matrix.fallback || "jonathan_operator";
  }
  const primaryFallback = registry.by_key[primary]?.fallback_route;
  const fallbackAssignee =
    matrix.fallback && matrix.fallback !== primary && agentAvailable(matrix.fallback, resources)
      ? matrix.fallback
      : primaryFallback && primaryFallback !== primary && agentAvailable(primaryFallback, resources)
        ? primaryFallback
        : originalPrimary !== primary && agentAvailable(originalPrimary, resources)
          ? originalPrimary
          : "jonathan_operator";
  const riskHigh = lower(task.risk_level) === "high" || task.approval_required === true;
  if (riskHigh && /production/.test(type)) primary = "jonathan_operator";
  const requiredApprovals = [...new Set([
    ...asArray(matrix.approvals),
    ...(riskHigh ? ["jonathan_operator_approval"] : []),
  ])].filter(Boolean);
  const requiredEvidence = evidenceFor(task, matrix);
  const mode = executionModeFor(task, matrix);
  const blocked = (mode === "production_gated" && requiredApprovals.length > 0) || requiredEvidence.length === 0;
  return {
    task_id: clean(task.task_id || task.id) || `cmd-${slug(type)}`,
    task_type: type,
    primary_assignee: primary,
    fallback_assignee: fallbackAssignee,
    required_approvals: requiredApprovals,
    required_evidence: requiredEvidence,
    allowed_execution_mode: mode,
    blocked,
    blocked_reason: blocked ? "approval_or_evidence_gate_required" : "",
    resource_dependency: registry.by_key[primary]?.resource_dependency || "",
    reason: `${type} routes to ${primary} via Phase 8A capability matrix.`,
    conflict_warnings: warnings,
  };
}

function ageHours(iso, now) {
  const created = Date.parse(clean(iso));
  const current = Date.parse(now);
  if (!Number.isFinite(created) || !Number.isFinite(current)) return 0;
  return (current - created) / 36e5;
}

export function detectCommandConflicts(tasks = []) {
  const conflicts = [];
  const fileOwners = new Map();
  const leadContactOwners = new Map();
  const deployTargets = new Map();
  for (const task of asArray(tasks)) {
    const id = clean(task.task_id || task.id);
    const agent = lower(task.assigned_agent || task.primary_assignee);
    for (const file of asArray(task.file_paths || task.files_changed)) {
      const key = lower(file);
      const existing = fileOwners.get(key);
      if (existing && existing.agent !== agent && new Set([existing.agent, agent]).has("codex") && new Set([existing.agent, agent]).has("claude_code")) {
        conflicts.push({ type: "file_ownership_conflict", task_ids: [existing.id, id], file_path: file, severity: "high" });
      }
      if (!existing) fileOwners.set(key, { id, agent });
    }
    if (clean(task.lead_id) && /contact|outreach|email|call/.test(lower(task.execution_kind || task.task_type || task.next_action))) {
      const existing = leadContactOwners.get(clean(task.lead_id));
      if (existing && existing.agent !== agent) conflicts.push({ type: "lead_contact_conflict", task_ids: [existing.id, id], lead_id: clean(task.lead_id), severity: "high" });
      if (!existing) leadContactOwners.set(clean(task.lead_id), { id, agent });
    }
    if (lower(task.task_type) === "deployment" || clean(task.deployment_target)) {
      const target = lower(task.deployment_target || "production");
      const existing = deployTargets.get(target);
      if (existing) conflicts.push({ type: "duplicate_deploy_attempt", task_ids: [existing, id], deployment_target: target, severity: "high" });
      else deployTargets.set(target, id);
    }
    if (!clean(task.evidence_path) && !asArray(task.required_evidence).length) {
      conflicts.push({ type: "missing_evidence_path", task_ids: [id], severity: "medium" });
    }
    if (/production/.test(lower(task.task_type)) && task.approval_required !== true) {
      conflicts.push({ type: "production_without_approval", task_ids: [id], severity: "critical" });
    }
    if (agent === "jarvis") {
      conflicts.push({ type: "reserved_alias_authority_conflict", task_ids: [id], severity: "high" });
    }
    if (["nova", "dash", "atlas", "sentinel"].includes(agent)) {
      conflicts.push({ type: "planned_agent_routing_blocked", task_ids: [id], severity: "high" });
    }
  }
  return conflicts;
}

function normalizeCommandTask(input = {}) {
  if (input.taskPacket) {
    return {
      task_id: clean(input.taskPacket.task_id),
      task_type: clean(input.taskPacket.execution_rail) === "cowork" ? "browser_manual_research" : clean(input.taskPacket.execution_rail) === "codex" ? "code_changes" : "revenue_queue_task",
      assigned_agent: clean(input.taskPacket.assigned_agent),
      status: clean(input.lifecycle?.execution_status || input.taskPacket.status) || "queued",
      approval_required: clean(input.lifecycle?.decision) !== "approved",
      required_evidence: asArray(input.taskPacket.required_evidence),
      evidence_path: asArray(input.taskPacket.required_evidence).join("; "),
      created_at: clean(input.taskPacket.created_at),
      source: "approvalExecutionQueue",
    };
  }
  return { ...input };
}

export function buildMultiAgentCommandState(input = {}) {
  const now = input.now || new Date().toISOString();
  const registry = getAgentResourceRegistry();
  const resources = buildResourceAvailabilitySummary(input.resources || {});
  const tasks = asArray(input.tasks).map(normalizeCommandTask);
  const routes = tasks.map((item) => ({ task: item, route: routeCommandTask(item, { resources }) }));
  const conflicts = detectCommandConflicts(tasks);
  const activeDelegations = routes.map(({ task, route }) => {
    const approvalNeeded = task.approval_required === true || route.allowed_execution_mode === "production_gated" || /approval/.test(lower(task.status));
    return {
      task_id: route.task_id,
      task_type: route.task_type,
      assigned_agent: route.primary_assignee,
      status: clean(task.status) || (route.blocked ? "blocked" : "queued"),
      blocked_reason: route.blocked_reason,
      resource_dependency: route.resource_dependency,
      approval_needed: approvalNeeded,
      evidence_expected: route.required_evidence,
      fallback_route: route.fallback_assignee,
      allowed_execution_mode: route.allowed_execution_mode,
      reason: route.reason,
    };
  });
  const staleTasks = tasks
    .filter((item) => ageHours(item.created_at, now) > 72 && !["completed", "completed_with_evidence", "cancelled"].includes(lower(item.status)))
    .map((item) => ({ task_id: clean(item.task_id || item.id), age_hours: Math.round(ageHours(item.created_at, now)), assigned_agent: clean(item.assigned_agent), status: clean(item.status) }));
  const approvalsNeeded = activeDelegations.filter((item) => item.approval_needed || /approval/.test(lower(item.status)));
  const blockedDelegations = activeDelegations.filter((item) => item.blocked_reason || /blocked|held/.test(lower(item.status)));
  const evidenceRequirements = activeDelegations.flatMap((item) => asArray(item.evidence_expected).map((evidence) => ({ task_id: item.task_id, evidence })));

  return {
    version: MULTI_AGENT_COMMAND_STATE_VERSION,
    generated_at: now,
    registry_summary: {
      active_routable: registry.active.filter((agent) => agent.routable).length,
      reserved_aliases: registry.reserved.length,
      planned_non_routable: registry.planned.length,
      jarvis_reserved_alias: true,
    },
    active_agent_registry: registry.active,
    planned_reserved_agents: [...registry.reserved, ...registry.planned],
    resource_availability_summary: resources,
    active_delegations: activeDelegations,
    blocked_delegations: blockedDelegations,
    fallback_recommendations: activeDelegations
      .filter((item) => item.fallback_route && item.fallback_route !== item.assigned_agent)
      .map((item) => ({ task_id: item.task_id, fallback_route: item.fallback_route })),
    conflict_warnings: conflicts,
    stale_tasks: staleTasks,
    approvals_needed: approvalsNeeded,
    evidence_requirements: evidenceRequirements,
    next_operator_action: conflicts.length
      ? "resolve_multi_agent_conflicts_before_execution"
      : approvalsNeeded.length ? "review_multi_agent_approvals" : staleTasks.length ? "unstick_stale_agent_tasks" : "continue_command_queue_monitoring",
    summary: {
      active_delegations: activeDelegations.length,
      blocked_delegations: blockedDelegations.length,
      conflicts: conflicts.length,
      stale_tasks: staleTasks.length,
      approvals_needed: approvalsNeeded.length,
      evidence_requirements: evidenceRequirements.length,
    },
    safety: {
      no_live_outreach_triggered: true,
      no_calls_placed: true,
      no_email_sent: true,
      no_runtime_workers_created_for_planned_agents: true,
      no_duplicate_tables: true,
    },
  };
}
