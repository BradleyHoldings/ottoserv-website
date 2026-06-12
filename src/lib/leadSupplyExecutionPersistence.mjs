import { persistCallIntent } from "./callRail/store.mjs";
import { persistIntent as persistEmailIntent } from "./emailRail/store.mjs";

export const LEAD_SUPPLY_EXECUTION_VERSION = "phase7b_durable_revenue_execution_queue_v1";

const STATUS = {
  QUEUED: "queued",
  BLOCKED: "blocked",
  APPROVAL_REQUIRED: "approval_required",
  DELEGATED: "delegated",
  EXECUTED: "executed",
  COMPLETED_WITH_EVIDENCE: "completed_with_evidence",
  FAILED: "failed",
  STALE: "stale",
  REPAIRED: "repaired",
};

function clean(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slug(value, fallback = "item") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
}

function dateKey(now) {
  return clean(now).slice(0, 10) || new Date().toISOString().slice(0, 10);
}

function hasEvidence(evidence = {}) {
  return Boolean(clean(evidence.evidence_reference) && clean(evidence.evidence_summary));
}

function statusForAction(action = {}) {
  const next = clean(action.next_action);
  if (next === "approval_required") return STATUS.APPROVAL_REQUIRED;
  if (/Cowork|Codex|Claude/.test(next)) return STATUS.DELEGATED;
  if (/blocked|not_ready/.test(next)) return STATUS.BLOCKED;
  if (next === "manual_review") return STATUS.BLOCKED;
  if (next === "call_needed") return STATUS.BLOCKED;
  return STATUS.QUEUED;
}

function actionId(action = {}, now = new Date().toISOString()) {
  return `phase7b-${dateKey(now)}-${slug(action.lead_id)}-${slug(action.next_action)}-${slug(action.offer?.service_key)}`;
}

function repairId(repair = {}) {
  return clean(repair.id) || `phase7b-repair-${slug(repair.failure_class)}-${slug(repair.lead_id || repair.task_id || repair.detail)}`;
}

export function createMemoryRevenueExecutionStore(seed = {}) {
  return {
    version: LEAD_SUPPLY_EXECUTION_VERSION,
    tables: {
      selected_leads: new Map(seed.selected_leads || []),
      revenue_actions: new Map(seed.revenue_actions || []),
      email_intents: new Map(seed.email_intents || []),
      call_intents: new Map(seed.call_intents || []),
      approval_cards: new Map(seed.approval_cards || []),
      cowork_packets: new Map(seed.cowork_packets || []),
      codex_packets: new Map(seed.codex_packets || []),
      repair_tasks: new Map(seed.repair_tasks || []),
      contact_safety_decisions: new Map(seed.contact_safety_decisions || []),
      evidence_events: new Map(seed.evidence_events || []),
    },
  };
}

function ensureStore(store) {
  return store || createMemoryRevenueExecutionStore();
}

function leadRecord(lead = {}, action = {}, now) {
  const readiness = lead.readiness || {};
  const buyingStage = lead.buying_stage || {};
  const signals = lead.signals || {};
  return {
    id: clean(lead.lead_id),
    lead_id: clean(lead.lead_id),
    company_name: clean(lead.company_name),
    source: clean(signals.evidence || action.reason || "phase7a"),
    readiness_state: clean(readiness.readiness),
    buying_stage: clean(buyingStage.stage),
    icp_fit: clean(readiness.icp_fit),
    pain_intent_signals: asArray(signals.signals),
    offer_match: action.offer || lead.offer || {},
    selected_next_action: clean(action.next_action),
    evidence_source_reference: clean(signals.evidence),
    next_scheduled_action: clean(action.email?.intent?.scheduled_at || action.call?.intent?.scheduled_at || now),
    updated_at: now,
  };
}

function actionRecord(lead = {}, action = {}, now) {
  return {
    action_id: actionId(action, now),
    lead_id: clean(action.lead_id || lead.lead_id),
    client: clean(action.client || lead.company_name),
    source: clean(lead.signals?.evidence || lead.source || "phase7a"),
    readiness_state: clean(lead.readiness?.readiness || action.readiness),
    buying_stage: clean(lead.buying_stage?.stage || action.buying_stage),
    icp_fit: clean(lead.readiness?.icp_fit),
    pain_intent_signals: asArray(lead.signals?.signals),
    offer_match: action.offer || lead.offer || {},
    next_action: clean(action.next_action),
    status: statusForAction(action),
    no_action_reason: /blocked|not_ready|call_needed/.test(clean(action.next_action)) ? clean(action.reason || action.next_action) : "",
    duplicate_contact_safety: false,
    evidence_source_reference: clean(lead.signals?.evidence),
    next_scheduled_action: clean(action.email?.intent?.scheduled_at || action.call?.intent?.scheduled_at || now),
    raw_action: clone(action),
    created_at: now,
    updated_at: now,
  };
}

function upsert(map, id, value) {
  const existing = map.get(id);
  if (existing) {
    map.set(id, { ...existing, ...value, created_at: existing.created_at || value.created_at });
    return { created: false, id };
  }
  map.set(id, value);
  return { created: true, id };
}

function persistContactSafety(report, store, now) {
  let persisted = 0;
  for (const conflict of asArray(report.contact_safety?.duplicate_conflicts)) {
    const id = `duplicate-${slug(conflict.lead_id)}-${slug(conflict.reason)}`;
    upsert(store.tables.contact_safety_decisions, id, {
      id,
      type: "duplicate_conflict",
      status: STATUS.BLOCKED,
      reason: clean(conflict.reason),
      lead_id: clean(conflict.lead_id),
      canonical_lead_id: clean(conflict.canonical_lead_id),
      created_at: now,
      updated_at: now,
    });
    persisted += 1;
  }
  const dncCount = Number(report.contact_safety?.do_not_contact_skipped || 0);
  if (dncCount) {
    upsert(store.tables.contact_safety_decisions, `dnc-${dateKey(now)}`, {
      id: `dnc-${dateKey(now)}`,
      type: "do_not_contact_skipped",
      status: STATUS.BLOCKED,
      reason: "do_not_contact",
      count: dncCount,
      created_at: now,
      updated_at: now,
    });
    persisted += 1;
  }
  return persisted;
}

async function persistExecutionIntent(action, store, options) {
  if (action.email?.intent) {
    const intent = action.email.intent;
    upsert(store.tables.email_intents, clean(intent.execution_id), { ...clone(intent), status: STATUS.QUEUED });
    if (options.emailClient) await persistEmailIntent(intent, { client: options.emailClient });
    return "email";
  }
  if (action.call?.intent) {
    const intent = action.call.intent;
    upsert(store.tables.call_intents, clean(intent.execution_id), { ...clone(intent), status: STATUS.QUEUED });
    if (options.callClient) await persistCallIntent(intent, { client: options.callClient });
    return "call";
  }
  return "";
}

export async function persistLeadSupplyExecution(report = {}, options = {}) {
  const now = options.now || report.generated_at || new Date().toISOString();
  const store = ensureStore(options.store);
  const selected = asArray(report.leads);
  const actions = asArray(report.actions);
  const byLeadId = new Map(selected.map((lead) => [clean(lead.lead_id), lead]));
  const result = {
    version: LEAD_SUPPLY_EXECUTION_VERSION,
    selected_leads: { persisted: 0 },
    actions: { persisted: 0 },
    email_intents: { persisted: 0 },
    call_intents: { persisted: 0 },
    approval_cards: { persisted: 0 },
    cowork_packets: { persisted: 0 },
    codex_packets: { persisted: 0 },
    repair_tasks: { persisted: 0 },
    contact_safety_decisions: { persisted: 0 },
  };

  for (const action of actions) {
    const lead = byLeadId.get(clean(action.lead_id)) || {};
    const selectedRow = leadRecord(lead, action, now);
    if (selectedRow.lead_id) {
      upsert(store.tables.selected_leads, selectedRow.lead_id, selectedRow);
      result.selected_leads.persisted += 1;
    }
    const row = actionRecord(lead, action, now);
    upsert(store.tables.revenue_actions, row.action_id, row);
    result.actions.persisted += 1;
    const intentType = await persistExecutionIntent(action, store, { ...options, now });
    if (intentType === "email") result.email_intents.persisted += 1;
    if (intentType === "call") result.call_intents.persisted += 1;
  }

  for (const card of asArray(report.approval_cards)) {
    upsert(store.tables.approval_cards, clean(card.id), { ...clone(card), status: STATUS.APPROVAL_REQUIRED, updated_at: now });
    result.approval_cards.persisted += 1;
  }
  for (const packet of asArray(report.cowork_packets)) {
    upsert(store.tables.cowork_packets, clean(packet.packet_id), { ...clone(packet), status: STATUS.DELEGATED, updated_at: now });
    result.cowork_packets.persisted += 1;
  }
  for (const packet of asArray(report.codex_packets)) {
    upsert(store.tables.codex_packets, clean(packet.packet_id), { ...clone(packet), status: STATUS.DELEGATED, updated_at: now });
    result.codex_packets.persisted += 1;
  }
  for (const item of asArray(report.repairs_created)) {
    const id = repairId(item);
    upsert(store.tables.repair_tasks, id, { ...clone(item), id, status: clean(item.status) || STATUS.STALE, updated_at: now });
    result.repair_tasks.persisted += 1;
  }
  result.contact_safety_decisions.persisted = persistContactSafety(report, store, now);

  return {
    ok: true,
    store,
    summary: result,
    queue: readDurableRevenueExecutionQueue({ store }),
  };
}

export function completeRevenueExecutionAction(actionId, evidence = {}, options = {}) {
  const store = ensureStore(options.store);
  const now = options.now || new Date().toISOString();
  const id = clean(actionId);
  const action = store.tables.revenue_actions.get(id);
  if (!action) return { ok: false, reason: "action_not_found" };
  if (!hasEvidence(evidence)) return { ok: false, reason: "completion_requires_evidence" };
  const evidenceId = `ev-${slug(id)}-${slug(evidence.evidence_type || "evidence")}`;
  const event = {
    evidence_id: evidenceId,
    action_id: id,
    evidence_type: clean(evidence.evidence_type),
    evidence_reference: clean(evidence.evidence_reference),
    evidence_summary: clean(evidence.evidence_summary),
    submitted_at: now,
  };
  upsert(store.tables.evidence_events, evidenceId, event);
  store.tables.revenue_actions.set(id, {
    ...action,
    status: STATUS.COMPLETED_WITH_EVIDENCE,
    completed_at: now,
    latest_evidence: event,
    updated_at: now,
  });
  return { ok: true, action: store.tables.revenue_actions.get(id), evidence: event };
}

export function updateRevenueExecutionActionStatus(actionId, status, options = {}) {
  const store = ensureStore(options.store);
  const now = options.now || new Date().toISOString();
  const id = clean(actionId);
  const nextStatus = clean(status);
  const action = store.tables.revenue_actions.get(id);
  const allowed = new Set([STATUS.FAILED, STATUS.STALE, STATUS.REPAIRED, STATUS.BLOCKED, STATUS.QUEUED, STATUS.DELEGATED]);
  if (!action) return { ok: false, reason: "action_not_found" };
  if (!allowed.has(nextStatus)) return { ok: false, reason: "unsupported_status_transition" };
  const evidence = options.evidence || {};
  if ([STATUS.FAILED, STATUS.REPAIRED].includes(nextStatus) && !hasEvidence(evidence)) {
    return { ok: false, reason: "status_transition_requires_evidence" };
  }
  let event = null;
  if (hasEvidence(evidence)) {
    const evidenceId = `ev-${slug(id)}-${slug(nextStatus)}-${slug(evidence.evidence_type || "status")}`;
    event = {
      evidence_id: evidenceId,
      action_id: id,
      evidence_type: clean(evidence.evidence_type || `${nextStatus}_status`),
      evidence_reference: clean(evidence.evidence_reference),
      evidence_summary: clean(evidence.evidence_summary),
      submitted_at: now,
    };
    upsert(store.tables.evidence_events, evidenceId, event);
  }
  store.tables.revenue_actions.set(id, {
    ...action,
    status: nextStatus,
    latest_evidence: event || action.latest_evidence,
    updated_at: now,
  });
  return { ok: true, action: store.tables.revenue_actions.get(id), evidence: event };
}

function mapValues(map) {
  return [...map.values()].map(clone);
}

export function readDurableRevenueExecutionQueue(options = {}) {
  const store = ensureStore(options.store);
  const items = mapValues(store.tables.revenue_actions).map((action) => ({
    ...action,
    lead: clone(store.tables.selected_leads.get(action.lead_id) || {}),
  }));
  const evidence = mapValues(store.tables.evidence_events);
  const contactSafety = mapValues(store.tables.contact_safety_decisions);
  return {
    version: LEAD_SUPPLY_EXECUTION_VERSION,
    available: true,
    summary: {
      total_actions: items.length,
      selected_leads: store.tables.selected_leads.size,
      queued_actions: items.filter((item) => item.status === STATUS.QUEUED).length,
      blocked_actions: items.filter((item) => item.status === STATUS.BLOCKED).length + contactSafety.filter((item) => item.status === STATUS.BLOCKED).length,
      approval_required: items.filter((item) => item.status === STATUS.APPROVAL_REQUIRED).length,
      delegated_actions: items.filter((item) => item.status === STATUS.DELEGATED).length,
      completed_with_evidence: items.filter((item) => item.status === STATUS.COMPLETED_WITH_EVIDENCE).length,
      email_intents: store.tables.email_intents.size,
      call_intents: store.tables.call_intents.size,
      approval_cards: store.tables.approval_cards.size,
      cowork_packets: store.tables.cowork_packets.size,
      codex_packets: store.tables.codex_packets.size,
      manual_review_actions: items.filter((item) => item.next_action === "no_action_not_ready" || item.next_action === "manual_review").length,
      repair_tasks: store.tables.repair_tasks.size,
      evidence_events: evidence.length,
    },
    items,
    queued_actions: items.filter((item) => item.status === STATUS.QUEUED),
    blocked_actions: items.filter((item) => item.status === STATUS.BLOCKED),
    approval_cards: mapValues(store.tables.approval_cards),
    delegated_packets: [...mapValues(store.tables.cowork_packets), ...mapValues(store.tables.codex_packets)],
    repair_tasks: mapValues(store.tables.repair_tasks),
    completed_evidence: evidence,
    contact_safety: {
      decisions: contactSafety,
      duplicate_conflicts: contactSafety.filter((item) => item.type === "duplicate_conflict"),
      do_not_contact_skipped: contactSafety.filter((item) => item.type === "do_not_contact_skipped").reduce((sum, item) => sum + Number(item.count || 0), 0),
    },
    next_operator_action: store.tables.repair_tasks.size
      ? "repair_durable_revenue_queue_items"
      : store.tables.approval_cards.size ? "review_durable_revenue_approval_cards" : "execute_queued_revenue_actions_under_existing_policies",
  };
}
