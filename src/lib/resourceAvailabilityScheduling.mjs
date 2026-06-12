import { buildResourceAvailabilitySummary, getAgentResourceRegistry } from "./multiAgentCommandState.mjs";
import { isApprovedSendWindow, nextEligibleSendTime } from "./leadSupplyEmailExecutionGate.mjs";

export const RESOURCE_AVAILABILITY_SCHEDULING_VERSION = "phase8c_resource_availability_scheduling_v1";

const NY_TIME_ZONE = "America/New_York";
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

function minutes(hour, minute = 0) {
  return Number(hour) * 60 + Number(minute);
}

function nyParts(iso) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const out = {};
  for (const part of parts) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    weekday: out.weekday,
    hour: Number(out.hour),
    minute: Number(out.minute),
  };
}

function offsetMinutesFor(utcMs) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TIME_ZONE,
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(utcMs));
  const label = clean(parts.find((part) => part.type === "timeZoneName")?.value);
  const match = label.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return -new Date(utcMs).getTimezoneOffset();
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
}

function localNyToUtcIso(year, month, day, hour, minute) {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let utc = localAsUtc - offsetMinutesFor(localAsUtc) * 60_000;
  utc = localAsUtc - offsetMinutesFor(utc) * 60_000;
  return new Date(utc).toISOString();
}

function addCalendarDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function weekdayForLocalDate(year, month, day) {
  return nyParts(localNyToUtcIso(year, month, day, 12, 0)).weekday;
}

function nextWindowTime(iso, rule) {
  if (rule.open(iso)) return new Date(iso).toISOString();
  const parts = nyParts(iso);
  const minute = minutes(parts.hour, parts.minute);
  if (rule.days.includes(parts.weekday) && minute < rule.start) {
    return localNyToUtcIso(parts.year, parts.month, parts.day, Math.floor(rule.start / 60), rule.start % 60);
  }
  let next = addCalendarDays(parts, 1);
  while (!rule.days.includes(weekdayForLocalDate(next.year, next.month, next.day))) {
    next = addCalendarDays(next, 1);
  }
  return localNyToUtcIso(next.year, next.month, next.day, Math.floor(rule.start / 60), rule.start % 60);
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MON_THU = ["Mon", "Tue", "Wed", "Thu"];

const WINDOW_RULES = {
  email_outreach: {
    key: "email_outreach",
    label: "Email outreach",
    days: WEEKDAYS,
    start: minutes(9),
    end: minutes(16, 30),
    open: isApprovedSendWindow,
    next: nextEligibleSendTime,
    hold_reason: "outside_email_outreach_window",
  },
  calls: {
    key: "calls",
    label: "Phone calls",
    days: WEEKDAYS,
    start: minutes(9, 30),
    end: minutes(16, 30),
    hold_reason: "outside_call_window",
  },
  production_voice_activation: {
    key: "production_voice_activation",
    label: "Production voice activation",
    days: MON_THU,
    start: minutes(10),
    end: minutes(15),
    hold_reason: "outside_production_voice_activation_window",
  },
  deployment: {
    key: "deployment",
    label: "Vercel deploys",
    days: WEEKDAYS,
    start: minutes(9),
    end: minutes(15),
    hold_reason: "outside_deploy_window",
  },
  data_changes: {
    key: "data_changes",
    label: "Supabase/data changes",
    days: WEEKDAYS,
    start: minutes(9),
    end: minutes(15),
    hold_reason: "outside_data_change_window",
  },
  anytime: {
    key: "anytime",
    label: "Anytime safe queueing/sandbox work",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    start: minutes(0),
    end: minutes(23, 59),
    hold_reason: "",
  },
};

for (const rule of Object.values(WINDOW_RULES)) {
  if (!rule.open) {
    rule.open = (iso) => {
      const parts = nyParts(iso);
      const minute = minutes(parts.hour, parts.minute);
      return rule.days.includes(parts.weekday) && minute >= rule.start && minute <= rule.end;
    };
  }
  if (!rule.next) rule.next = (iso) => nextWindowTime(iso, rule);
}

function taskWindowKey(taskType, executionMode = "") {
  const type = lower(taskType);
  const mode = lower(executionMode);
  if (/email/.test(type)) return "email_outreach";
  if (/call|retell_test/.test(type)) return "calls";
  if (/production_voice_activation/.test(type)) return "production_voice_activation";
  if (/deployment|vercel/.test(type)) return "deployment";
  if (/database|schema|data/.test(type) && mode === "production_gated") return "data_changes";
  if (/code|test|build|browser|research|lead_research|public_lead|daily|revenue|service_delivery/.test(type)) return "anytime";
  return "anytime";
}

function normalizeStatus(raw = {}) {
  const status = lower(raw.status || raw.state || raw.availability_status);
  if (RESOURCE_STATUSES.has(status)) return status;
  if (["credit_exhausted", "budget_exhausted", "quota_reset_pending"].includes(status)) return "exhausted";
  if (["rate_limited", "window_cooldown"].includes(status)) return "limited";
  return status || "unknown";
}

function resourceDefaults() {
  const registry = getAgentResourceRegistry();
  const active = Object.fromEntries(registry.active.map((agent) => [agent.agent_key, agent]));
  return {
    hermes: active.hermes,
    codex: active.codex,
    claude_code: active.claude_code,
    cowork: active.cowork,
    jonathan_operator: active.jonathan_operator,
    email_rail: active.email_rail,
    retell_call_rail: active.retell_call_rail,
    supabase_data_rail: active.supabase_data_rail,
    vercel_deploy_rail: active.vercel_deploy_rail,
    browser_manual_research_rail: {
      agent_key: "browser_manual_research_rail",
      fallback_route: "cowork",
      required_approvals: ["platform_write_actions"],
      evidence_requirements: ["source_url_or_notes"],
    },
    api_backed_fallback: {
      agent_key: "api_backed_fallback",
      fallback_route: "jonathan_operator",
      required_approvals: ["api_budget_approval"],
      evidence_requirements: ["api_usage_receipt"],
    },
  };
}

export function buildResourceAvailabilityState(input = {}) {
  const now = clean(input.now) || new Date().toISOString();
  const registryResources = buildResourceAvailabilitySummary(input.resources || {});
  const defaults = resourceDefaults();
  const resources = {};
  for (const [key, defaultsForKey] of Object.entries(defaults)) {
    const raw = input.resources?.[key] || {};
    const routed = registryResources[key] || {};
    const status = normalizeStatus(raw) || clean(routed.status) || "unknown";
    resources[key] = {
      resource_key: key,
      status,
      status_reason: clean(raw.reason || routed.reason),
      available_actions: asArray(defaultsForKey.allowed_task_types),
      blocked_actions: asArray(defaultsForKey.blocked_task_types),
      next_eligible_time: clean(raw.next_eligible_time || raw.resets_at || routed.resets_at),
      approval_dependency: asArray(defaultsForKey.required_approvals),
      evidence_dependency: asArray(defaultsForKey.evidence_requirements),
      manual_check_required: status === "requires_manual_check",
      fallback_route: clean(raw.fallback_route || defaultsForKey.fallback_route) || "jonathan_operator",
      source: clean(raw.source || routed.source) || "manual_or_registry",
    };
  }
  const blockedResources = Object.values(resources).filter((item) => ["blocked", "exhausted"].includes(item.status));
  return {
    version: RESOURCE_AVAILABILITY_SCHEDULING_VERSION,
    generated_at: now,
    resources,
    blocked_resources: blockedResources,
    summary: {
      resources_tracked: Object.keys(resources).length,
      available: Object.values(resources).filter((item) => item.status === "available").length,
      limited: Object.values(resources).filter((item) => item.status === "limited").length,
      exhausted: Object.values(resources).filter((item) => item.status === "exhausted").length,
      blocked: Object.values(resources).filter((item) => item.status === "blocked").length,
      manual_check_required: Object.values(resources).filter((item) => item.manual_check_required).length,
    },
    safety: {
      no_private_billing_scrape: true,
      manual_or_config_status_only: true,
      no_live_execution_triggered: true,
    },
  };
}

function approvalSatisfied(handoff = {}, approvals = {}) {
  if (!asArray(handoff.approval_requirement).length) return true;
  return approvals[handoff.task_id] === true || approvals[handoff.source_record_id] === true || handoff.approval_granted === true;
}

function hasEvidencePath(handoff = {}) {
  return asArray(handoff.evidence_requirement).length > 0 || asArray(handoff.closeout_evidence).length > 0 || clean(handoff.evidence_path);
}

function conflictBlocked(handoff = {}, conflictLocks = []) {
  return asArray(conflictLocks).some((item) => item.type === "active_lock_conflict" && asArray(item.task_ids).includes(handoff.task_id));
}

export function nextEligibleWindowTime(taskType, iso = new Date().toISOString(), executionMode = "") {
  const key = taskWindowKey(taskType, executionMode);
  return WINDOW_RULES[key].next(iso);
}

export function evaluateTaskSchedule(handoff = {}, options = {}) {
  const now = clean(options.now) || new Date().toISOString();
  const resourceState = buildResourceAvailabilityState({ now, resources: options.resources || {} });
  const resourceKey = clean(handoff.current_owner) || "hermes";
  const resource = resourceState.resources[resourceKey] || {
    resource_key: resourceKey,
    status: "unknown",
    fallback_route: clean(handoff.fallback_owner) || "jonathan_operator",
    manual_check_required: false,
  };
  const windowKey = taskWindowKey(handoff.task_type, handoff.execution_mode);
  const rule = WINDOW_RULES[windowKey];
  const inWindow = rule.open(now);
  const base = {
    task_id: clean(handoff.task_id),
    task_type: clean(handoff.task_type),
    can_run_now: false,
    hold_reason: "",
    next_eligible_time: inWindow ? now : rule.next(now),
    required_resource: resourceKey,
    resource_status: resource.status,
    required_approval: asArray(handoff.approval_requirement),
    execution_mode: clean(handoff.execution_mode) || "advisory",
    fallback_route: clean(handoff.fallback_owner || resource.fallback_route),
    recommended_action: "queue_only",
    window_key: rule.key,
  };
  if (conflictBlocked(handoff, options.conflictLocks)) {
    return { ...base, hold_reason: "conflict_lock_active", recommended_action: "cancel_or_review" };
  }
  if (["exhausted", "blocked"].includes(resource.status)) {
    return {
      ...base,
      hold_reason: `resource_${resource.status}`,
      next_eligible_time: clean(resource.next_eligible_time) || base.next_eligible_time,
      recommended_action: base.fallback_route ? "fallback_to_other_agent" : "block_until_resource_available",
    };
  }
  if (resource.status === "requires_manual_check") {
    return { ...base, hold_reason: "resource_requires_manual_check", recommended_action: "manual_check_required" };
  }
  if (!approvalSatisfied(handoff, options.approvals || {})) {
    return { ...base, hold_reason: "approval_required", recommended_action: "request_approval" };
  }
  if (!hasEvidencePath(handoff)) {
    return { ...base, hold_reason: "missing_evidence_path", recommended_action: "queue_only" };
  }
  if (!inWindow) {
    return { ...base, hold_reason: rule.hold_reason, recommended_action: "hold_until_window" };
  }
  return { ...base, can_run_now: true, hold_reason: "", next_eligible_time: now, recommended_action: "run_now" };
}

export function buildSchedulingWindowState(input = {}) {
  const now = clean(input.now) || new Date().toISOString();
  const ledger = input.taskOwnershipLedger || {};
  const tasks = asArray(ledger.active_handoffs);
  const resourceAvailabilityState = input.resourceAvailabilityState || buildResourceAvailabilityState({ now, resources: input.resources || {} });
  const decisions = tasks.map((handoff) => evaluateTaskSchedule(handoff, {
    now,
    resources: input.resources || {},
    approvals: input.approvals || {},
    conflictLocks: ledger.conflict_locks,
  }));
  const heldTasks = decisions.filter((item) => item.recommended_action === "hold_until_window");
  const executableTasks = decisions.filter((item) => item.can_run_now);
  const blocked = decisions.filter((item) => !item.can_run_now && item.recommended_action !== "hold_until_window");
  const next =
    blocked.some((item) => item.recommended_action === "request_approval") ? "request_required_approvals_before_execution" :
    blocked.some((item) => item.recommended_action === "fallback_to_other_agent") ? "route_unavailable_resources_to_fallbacks" :
    heldTasks.length ? "wait_for_next_eligible_scheduling_window" :
    executableTasks.length ? "execute_ready_tasks_under_existing_gates" :
    "continue_resource_window_monitoring";
  return {
    version: RESOURCE_AVAILABILITY_SCHEDULING_VERSION,
    generated_at: now,
    windows: Object.fromEntries(Object.entries(WINDOW_RULES).map(([key, rule]) => [key, {
      key,
      label: rule.label,
      days: rule.days,
      start_local: `${String(Math.floor(rule.start / 60)).padStart(2, "0")}:${String(rule.start % 60).padStart(2, "0")}`,
      end_local: `${String(Math.floor(rule.end / 60)).padStart(2, "0")}:${String(rule.end % 60).padStart(2, "0")}`,
      time_zone: NY_TIME_ZONE,
      open_now: rule.open(now),
      next_eligible_time: rule.next(now),
    }])),
    decisions: decisions.map(clone),
    held_tasks: heldTasks.map(clone),
    executable_tasks: executableTasks.map(clone),
    blocked_tasks: blocked.map(clone),
    blocked_resources: resourceAvailabilityState.blocked_resources,
    next_eligible_actions: decisions.filter((item) => clean(item.next_eligible_time)).map((item) => ({ task_id: item.task_id, next_eligible_time: item.next_eligible_time, recommended_action: item.recommended_action })),
    next_operator_action: next,
    summary: {
      tasks_seen: decisions.length,
      held_tasks: heldTasks.length,
      executable_tasks: executableTasks.length,
      blocked_tasks: blocked.length,
      blocked_resources: resourceAvailabilityState.blocked_resources.length,
    },
    safety: {
      no_email_sent: true,
      no_calls_placed: true,
      no_retell_production_activation: true,
      no_stripe_or_n8n_triggered: true,
      no_deploy_triggered: true,
      no_schema_modified: true,
    },
  };
}
