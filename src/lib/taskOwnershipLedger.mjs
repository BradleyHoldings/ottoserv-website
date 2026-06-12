import { buildMultiAgentCommandState, routeCommandTask } from "./multiAgentCommandState.mjs";

export const TASK_OWNERSHIP_LEDGER_VERSION = "phase8b_task_ownership_ledger_v1";

export const TASK_OWNERSHIP_STATUSES = [
  "proposed",
  "assigned",
  "accepted",
  "in_progress",
  "blocked",
  "approval_required",
  "waiting_on_operator",
  "waiting_on_external",
  "delegated",
  "stale",
  "fallback_required",
  "escalated",
  "completed_with_evidence",
  "failed",
  "cancelled",
];

const ACTIVE_STATUSES = new Set(["proposed", "assigned", "accepted", "in_progress", "blocked", "approval_required", "waiting_on_operator", "waiting_on_external", "delegated", "stale", "fallback_required", "escalated"]);
const TERMINAL_STATUSES = new Set(["completed_with_evidence", "failed", "cancelled"]);

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

function nowIso(options = {}) {
  return clean(options.now) || new Date().toISOString();
}

function ageHours(iso, now) {
  const start = Date.parse(clean(iso));
  const end = Date.parse(clean(now));
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return (end - start) / 36e5;
}

function hasEvidence(evidence = {}) {
  return Boolean(clean(evidence.evidence_reference) && clean(evidence.evidence_summary));
}

function historyEvent(eventType, patch = {}, options = {}) {
  const at = nowIso(options);
  return {
    event_id: `${slug(patch.task_id || patch.handoff_id || eventType)}-${slug(eventType)}-${slug(at)}`,
    event_type: eventType,
    actor: clean(options.actor || patch.actor) || "hermes",
    at,
    from_status: clean(patch.from_status),
    to_status: clean(patch.to_status),
    reason: clean(patch.reason),
    evidence_id: clean(patch.evidence_id),
  };
}

export function createTaskOwnershipStore(seed = {}) {
  return {
    version: TASK_OWNERSHIP_LEDGER_VERSION,
    handoffs: new Map(seed.handoffs || []),
    conflict_locks: new Map(seed.conflict_locks || []),
  };
}

function ensureStore(store) {
  return store || createTaskOwnershipStore();
}

function handoffId(task = {}) {
  return clean(task.task_id || task.id || task.action_id || task.packet_id || task.related_ticket_number) || `phase8b-${slug(task.source || task.task_type || "task")}`;
}

function sourceSystem(task = {}) {
  const source = lower(task.source || task.source_system);
  if (/servicedelivery|service_delivery|phase6|sdo/.test(source)) return "service_delivery";
  if (/approval/.test(source)) return "approval";
  if (/voice|retell|call/.test(source)) return "voice";
  if (/email/.test(source)) return "email";
  if (/browser|cowork|publiclead/.test(source)) return "browser";
  if (/code|codex|claude/.test(source)) return "code";
  if (/deploy|vercel/.test(source)) return "deploy";
  if (/data|supabase/.test(source)) return "data";
  if (/repair/.test(source)) return "repair";
  if (/revenue|lead/.test(source)) return "revenue";
  const type = lower(task.task_type || task.type || task.next_action);
  if (/email/.test(type)) return "email";
  if (/call|retell|voice/.test(type)) return "voice";
  if (/browser|research/.test(type)) return "browser";
  if (/code|test|build/.test(type)) return "code";
  if (/service_delivery/.test(type)) return "service_delivery";
  return "revenue";
}

function sourceRecordId(task = {}) {
  return clean(task.source_record_id || task.action_id || task.id || task.packet_id || task.related_ticket_number || task.task_id);
}

function lockKey(task = {}) {
  if (clean(task.lock_conflict_key)) return clean(task.lock_conflict_key);
  const system = sourceSystem(task);
  if (asArray(task.file_paths || task.files_changed).length) return `file:${lower(asArray(task.file_paths || task.files_changed)[0])}`;
  if (clean(task.lead_id) && /email|call|contact|outreach/.test(lower(task.task_type || task.next_action || task.execution_kind))) return `lead_contact:${clean(task.lead_id)}`;
  if (clean(task.deployment_target)) return `deploy:${lower(task.deployment_target)}`;
  return `${system}:${sourceRecordId(task) || handoffId(task)}`;
}

function duplicateKey(task = {}) {
  if (clean(task.duplicate_prevention_key)) return clean(task.duplicate_prevention_key);
  return `${sourceSystem(task)}:${sourceRecordId(task) || handoffId(task)}:${clean(task.task_type || task.type || task.next_action)}`;
}

function statusFor(task = {}, route = {}) {
  const status = lower(task.status);
  if (["completed_with_evidence", "failed", "cancelled"].includes(status)) return status;
  if (task.approval_required === true || route.allowed_execution_mode === "production_gated" || /approval/.test(status)) return "approval_required";
  if (["delegated", "queue_ready"].includes(status)) return "delegated";
  if (["blocked", "held_until_send_window"].includes(status)) return "blocked";
  if (["accepted", "in_progress", "waiting_on_operator", "waiting_on_external", "stale", "fallback_required", "escalated"].includes(status)) return status;
  return "assigned";
}

function normalizeEvidence(task = {}, route = {}) {
  const evidence = asArray(task.required_evidence).length ? asArray(task.required_evidence) : asArray(route.required_evidence);
  return evidence.length ? evidence : ["completion_evidence"];
}

function staleThresholdHours(task = {}) {
  const explicit = Number(task.stale_threshold_hours || task.due_stale_threshold_hours);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  if (lower(task.task_type).includes("approval")) return 48;
  return 72;
}

function toHandoff(task = {}, options = {}) {
  const now = nowIso(options);
  const resources = options.resources || {};
  const route = routeCommandTask(task, { resources });
  const defaultRoute = routeCommandTask(task, { resources: {} });
  const id = handoffId(task);
  const status = statusFor(task, route);
  const assignedAt = clean(task.assigned_at || task.created_at || task.createdAt) || now;
  const updatedAt = clean(task.last_updated_at || task.updated_at || task.created_at || task.createdAt) || now;
  const currentOwner = route.primary_assignee;
  const escalationOwner = clean(task.escalation_owner) || (status === "approval_required" ? "jonathan_operator" : "jonathan_operator");
  return {
    task_id: id,
    handoff_id: id,
    source_system: sourceSystem(task),
    source_record_id: sourceRecordId(task),
    task_type: route.task_type,
    risk_level: clean(task.risk_level) || (route.allowed_execution_mode === "production_gated" ? "high" : "medium"),
    current_owner: currentOwner,
    fallback_owner: route.fallback_assignee,
    escalation_owner: escalationOwner,
    status,
    assigned_at: assignedAt,
    last_updated_at: updatedAt,
    due_stale_threshold_hours: staleThresholdHours(task),
    approval_requirement: route.required_approvals,
    evidence_requirement: normalizeEvidence(task, route),
    execution_mode: route.allowed_execution_mode,
    lock_conflict_key: lockKey(task),
    duplicate_prevention_key: duplicateKey(task),
    routing_reason: route.reason,
    resource_dependency: route.resource_dependency,
    resource_fallback_used: defaultRoute.primary_assignee !== route.primary_assignee,
    conflict_warnings: route.conflict_warnings,
    handoff_history: asArray(task.handoff_history).length
      ? asArray(task.handoff_history).map(clone)
      : [historyEvent("created", { task_id: id, to_status: status, reason: route.reason }, { actor: "hermes", now })],
    closeout_evidence: asArray(task.closeout_evidence).map(clone),
    no_live_execution: true,
  };
}

function normalizeRevenueQueueTasks(queue = {}) {
  return asArray(queue.items).map((item) => ({
    task_id: item.action_id,
    source: "revenue",
    source_record_id: item.action_id,
    task_type: item.raw_action?.email?.intent ? "email_queue_execution" : item.raw_action?.call?.intent ? "call_queue_execution" : "revenue_queue_task",
    risk_level: item.risk_level || "low",
    assigned_agent: item.raw_action?.email?.intent ? "email_rail" : item.raw_action?.call?.intent ? "retell_call_rail" : "hermes",
    status: item.status,
    lead_id: item.lead_id,
    required_evidence: ["policy_receipt", "execution_evidence"],
    evidence_path: item.evidence_source_reference,
    created_at: item.created_at,
    updated_at: item.updated_at,
    lock_conflict_key: item.raw_action?.email?.intent || item.raw_action?.call?.intent ? `lead_contact:${clean(item.lead_id)}` : `revenue:${clean(item.action_id)}`,
  }));
}

function normalizeServiceWorkOrders(execution = {}) {
  return asArray(execution.workOrders).map((workOrder) => ({
    task_id: clean(workOrder.id),
    source: "service_delivery",
    source_record_id: clean(workOrder.id),
    task_type: "service_delivery_work_order",
    risk_level: clean(workOrder.risk_level) || (workOrder.implementation?.assignment?.requires_approval ? "high" : "medium"),
    assigned_agent: clean(workOrder.implementation?.assignment?.assignee),
    status: clean(workOrder.status) || "assigned",
    approval_required: Boolean(workOrder.implementation?.assignment?.requires_approval),
    required_evidence: asArray(workOrder.implementation?.testing_checklist).length ? asArray(workOrder.implementation.testing_checklist) : ["ticket_event", "work_order_evidence"],
    evidence_path: asArray(workOrder.implementation?.testing_checklist).join("; "),
    created_at: clean(workOrder.createdAt),
    updated_at: clean(workOrder.updatedAt || workOrder.createdAt),
    lock_conflict_key: `service_delivery:${clean(workOrder.id)}`,
  }));
}

function normalizeServiceExecutionPackets(execution = {}) {
  return asArray(execution.execution_packets).map((packet) => ({
    task_id: clean(packet.task_id),
    source: "service_delivery",
    source_record_id: clean(packet.related_ticket_number || packet.task_id),
    task_type: packet.execution_rail === "cowork" ? "browser_manual_research" : packet.execution_rail === "codex" ? "code_changes" : packet.execution_rail === "manual_review" ? "approval_review" : "service_delivery_work_order",
    assigned_agent: clean(packet.assigned_agent),
    status: clean(packet.status),
    approval_required: clean(packet.status) === "blocked_pending_approval",
    required_evidence: asArray(packet.required_evidence),
    evidence_path: asArray(packet.required_evidence).join("; "),
    created_at: clean(packet.created_at),
    lock_conflict_key: `service_delivery:${clean(packet.related_ticket_number || packet.task_id)}`,
  }));
}

function normalizeApprovalQueueTasks(queue = {}) {
  return asArray(queue.items).map((item) => ({
    ...item,
    task_id: clean(item.taskPacket?.task_id),
    source: "approval",
    source_record_id: clean(item.taskPacket?.related_approval_item_id || item.taskPacket?.task_id),
    task_type: clean(item.taskPacket?.execution_rail) === "cowork" ? "browser_manual_research" : clean(item.taskPacket?.execution_rail) === "codex" ? "code_changes" : "revenue_queue_task",
    assigned_agent: clean(item.taskPacket?.assigned_agent),
    status: clean(item.lifecycle?.execution_status || "assigned"),
    approval_required: clean(item.lifecycle?.decision) !== "approved",
    required_evidence: asArray(item.taskPacket?.required_evidence),
    evidence_path: asArray(item.taskPacket?.required_evidence).join("; "),
    created_at: clean(item.taskPacket?.created_at),
  }));
}

function normalizePublicLeadTasks(discovery = {}) {
  return asArray(discovery.cowork_packets).map((packet) => ({
    task_id: clean(packet.packet_id),
    source: "browser",
    source_record_id: clean(packet.packet_id),
    task_type: "browser_manual_research",
    assigned_agent: "cowork",
    status: clean(packet.status || "delegated"),
    lead_id: clean(packet.lead_id),
    required_evidence: asArray(packet.required_evidence),
    evidence_path: asArray(packet.required_evidence).join("; "),
    created_at: clean(packet.created_at),
    lock_conflict_key: `lead_research:${clean(packet.lead_id || packet.packet_id)}`,
  }));
}

function collectTasks(input = {}) {
  return [
    ...asArray(input.tasks),
    ...normalizeRevenueQueueTasks(input.durableRevenueExecutionQueue),
    ...normalizeServiceWorkOrders(input.serviceDeliveryExecution),
    ...normalizeServiceExecutionPackets(input.serviceDeliveryExecution),
    ...normalizeApprovalQueueTasks(input.approvalExecutionQueue),
    ...normalizePublicLeadTasks(input.publicLeadDiscovery),
  ];
}

function upsertHandoff(store, handoff, conflicts) {
  const existing = store.handoffs.get(handoff.task_id);
  if (existing && TERMINAL_STATUSES.has(lower(existing.status))) return existing;
  const lockOwner = store.conflict_locks.get(handoff.lock_conflict_key);
  if (lockOwner && lockOwner !== handoff.task_id) {
    const active = store.handoffs.get(lockOwner);
    if (active && ACTIVE_STATUSES.has(lower(active.status))) {
      conflicts.push({ type: "active_lock_conflict", lock_conflict_key: handoff.lock_conflict_key, task_ids: [lockOwner, handoff.task_id], severity: "high" });
      return null;
    }
  }
  const merged = existing
    ? { ...existing, ...handoff, assigned_at: existing.assigned_at, handoff_history: existing.handoff_history, closeout_evidence: existing.closeout_evidence }
    : handoff;
  store.handoffs.set(merged.task_id, merged);
  store.conflict_locks.set(merged.lock_conflict_key, merged.task_id);
  return merged;
}

function summarize(store, conflicts = [], commandState = null, now = new Date().toISOString()) {
  const handoffs = [...store.handoffs.values()].map(clone);
  const active = handoffs.filter((item) => ACTIVE_STATUSES.has(lower(item.status)));
  const stale = active.filter((item) => ["stale", "fallback_required"].includes(lower(item.status)) || ageHours(item.last_updated_at || item.assigned_at, now) > Number(item.due_stale_threshold_hours || 72));
  const blocked = active.filter((item) => ["blocked", "approval_required", "waiting_on_operator", "waiting_on_external"].includes(lower(item.status)));
  const fallback = active.filter((item) => ["fallback_required"].includes(lower(item.status)) || item.resource_fallback_used || ["exhausted", "blocked"].includes(lower(commandState?.resource_availability_summary?.[item.current_owner]?.status)));
  const escalations = active.filter((item) => ["approval_required", "escalated"].includes(lower(item.status)) || lower(item.fallback_owner) === "blocked_until_operator");
  const completed = handoffs.filter((item) => lower(item.status) === "completed_with_evidence");
  const conflictLocks = [...store.conflict_locks.entries()].map(([lock_conflict_key, task_id]) => ({ lock_conflict_key, task_id }));
  const activeLockConflicts = conflicts.filter((item) => clean(item.type) === "active_lock_conflict");
  const next =
    activeLockConflicts.length ? "resolve_handoff_conflict_locks" :
    fallback.length || stale.length ? "route_fallback_or_escalate_stale_handoffs" :
    escalations.length ? "review_task_ownership_escalations" :
    blocked.length ? "clear_blocked_handoffs" :
    "continue_task_ownership_monitoring";

  return {
    version: TASK_OWNERSHIP_LEDGER_VERSION,
    generated_at: now,
    summary: {
      total_handoffs: handoffs.length,
      active_handoffs: active.length,
      stale_handoffs: stale.length,
      blocked_handoffs: blocked.length,
      fallback_required: fallback.length,
      escalations_required: escalations.length,
      completed_with_evidence: completed.length,
      conflict_locks: activeLockConflicts.length || conflictLocks.length,
    },
    active_handoffs: active,
    stale_handoffs: stale,
    blocked_handoffs: blocked,
    fallback_required: fallback.map((item) => ({ task_id: item.task_id, current_owner: item.current_owner, fallback_owner: item.fallback_owner, reason: "owner_unavailable_or_stale" })),
    escalations_required: escalations.map((item) => ({ task_id: item.task_id, escalation_owner: item.escalation_owner, reason: item.status === "approval_required" ? "approval_required" : "operator_escalation_required" })),
    completed_with_evidence: completed,
    conflict_locks: activeLockConflicts.length ? activeLockConflicts : conflictLocks,
    conflict_warnings: conflicts,
    next_operator_action: next,
    status_model: TASK_OWNERSHIP_STATUSES,
    safety: {
      no_live_outreach_triggered: true,
      no_email_sent: true,
      no_calls_placed: true,
      no_retell_production_activation: true,
      no_stripe_or_n8n_triggered: true,
      no_duplicate_tables: true,
    },
    store,
  };
}

export function buildTaskOwnershipLedger(input = {}) {
  const now = nowIso(input);
  const store = ensureStore(input.store);
  const tasks = collectTasks(input);
  const resources = input.resources || {};
  const commandState = input.multiAgentCommandState || buildMultiAgentCommandState({ now, tasks, resources });
  const conflicts = [];
  for (const task of tasks) {
    const handoff = toHandoff(task, { now, resources });
    upsertHandoff(store, handoff, conflicts);
  }
  return summarize(store, [...conflicts, ...asArray(commandState.conflict_warnings)], commandState, now);
}

function updateHandoff(store, taskId, nextStatus, options = {}) {
  const id = clean(taskId);
  const current = store.handoffs.get(id);
  if (!current) return { ok: false, reason: "handoff_not_found", store };
  const now = nowIso(options);
  const updated = {
    ...current,
    status: nextStatus,
    last_updated_at: now,
    handoff_history: [
      ...asArray(current.handoff_history),
      historyEvent(nextStatus, { task_id: id, from_status: current.status, to_status: nextStatus, reason: options.reason }, options),
    ],
  };
  store.handoffs.set(id, updated);
  return { ok: true, store, handoff: clone(updated) };
}

export function acceptHandoff(store, taskId, options = {}) {
  return updateHandoff(store, taskId, "accepted", options);
}

export function markBlocked(store, taskId, reason, options = {}) {
  return updateHandoff(store, taskId, "blocked", { ...options, reason });
}

export function attachHandoffEvidence(store, taskId, evidence = {}, options = {}) {
  const id = clean(taskId);
  const current = store.handoffs.get(id);
  if (!current) return { ok: false, reason: "handoff_not_found", store };
  if (!hasEvidence(evidence)) return { ok: false, reason: "evidence_reference_and_summary_required", store };
  const now = nowIso(options);
  const evidenceId = clean(evidence.evidence_id) || `ev-${slug(id)}-${slug(evidence.evidence_type || "evidence")}`;
  const event = {
    evidence_id: evidenceId,
    evidence_type: clean(evidence.evidence_type || "handoff_evidence"),
    evidence_reference: clean(evidence.evidence_reference),
    evidence_summary: clean(evidence.evidence_summary),
    submitted_at: now,
    submitted_by: clean(options.actor) || current.current_owner,
  };
  const updated = {
    ...current,
    closeout_evidence: [...asArray(current.closeout_evidence), event],
    last_updated_at: now,
    handoff_history: [
      ...asArray(current.handoff_history),
      historyEvent("evidence_attached", { task_id: id, from_status: current.status, to_status: current.status, evidence_id: evidenceId }, options),
    ],
  };
  store.handoffs.set(id, updated);
  return { ok: true, store, handoff: clone(updated), evidence: event };
}

export function completeHandoff(store, taskId, evidence = {}, options = {}) {
  const id = clean(taskId);
  let current = store.handoffs.get(id);
  if (!current) return { ok: false, reason: "handoff_not_found", store };
  if (hasEvidence(evidence)) {
    const attached = attachHandoffEvidence(store, id, evidence, options);
    current = attached.handoff;
  }
  if (!asArray(current.closeout_evidence).length) return { ok: false, reason: "completion_requires_evidence", store };
  const completed = updateHandoff(store, id, "completed_with_evidence", options);
  if (completed.ok) {
    store.conflict_locks.delete(clean(completed.handoff.lock_conflict_key));
  }
  return completed;
}

export function markStaleHandoffs(store, options = {}) {
  const now = nowIso(options);
  for (const handoff of [...store.handoffs.values()]) {
    if (!ACTIVE_STATUSES.has(lower(handoff.status))) continue;
    const stale = ageHours(handoff.last_updated_at || handoff.assigned_at, now) > Number(handoff.due_stale_threshold_hours || 72);
    if (!stale) continue;
    const next = clean(handoff.fallback_owner) && handoff.fallback_owner !== handoff.current_owner ? "fallback_required" : "stale";
    store.handoffs.set(handoff.task_id, {
      ...handoff,
      status: next,
      last_updated_at: now,
      handoff_history: [
        ...asArray(handoff.handoff_history),
        historyEvent(next, { task_id: handoff.task_id, from_status: handoff.status, to_status: next, reason: "stale_threshold_exceeded" }, options),
      ],
    });
  }
  return summarize(store, [], null, now);
}
