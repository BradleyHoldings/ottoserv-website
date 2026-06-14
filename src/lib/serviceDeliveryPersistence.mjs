import {
  SERVICE_DELIVERY_CANONICAL_TABLES,
  buildServiceDeliveryDashboardExport,
  generateImplementationWorkOrders,
  generateServiceDeliveryPackage,
  getServiceDefinition,
  normalizeServiceDeliverySignal,
  translateFindingsToOpportunities,
} from "./serviceDeliverySpine.mjs";
import { getSupabaseConfig } from "./socialSupabaseStore.mjs";
import { createHash } from "node:crypto";

export const SERVICE_DELIVERY_PERSISTENCE_VERSION = "phase6c_live_service_delivery_rails_v1";

export const SERVICE_DELIVERY_LIVE_TABLES = {
  opportunities: process.env.SERVICE_DELIVERY_OPPORTUNITY_TABLE || "hermes_opportunity_actions",
  tickets: process.env.SERVICE_DELIVERY_TICKET_TABLE || "techops_tickets",
  ticket_events: process.env.SERVICE_DELIVERY_TICKET_EVENT_TABLE || "techops_ticket_events",
  deployments: process.env.SERVICE_DELIVERY_DEPLOYMENT_TABLE || "client_deployments",
};
export const SERVICE_DELIVERY_OPPORTUNITY_UPSERT_RPC =
  process.env.SERVICE_DELIVERY_OPPORTUNITY_UPSERT_RPC || "hermes_opportunity_upsert_cas";

const DUPLICATE_TABLE_PATTERNS = [
  /^service_delivery_/i,
  /^automation_opportunit/i,
  /^implementation_work_order/i,
  /^client_project/i,
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

function slug(value, fallback = "item") {
  const out = clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return out || fallback;
}

function stableId(prefix, value) {
  return `${prefix}_${slug(value).replace(/-/g, "_")}`;
}

function stableUuid(prefix, value) {
  const hex = createHash("sha1").update(`${prefix}:${clean(value)}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

function riskIsHigh(value) {
  return lower(value) === "high" || lower(value) === "critical";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function headers(key) {
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

function liveWritableRow(row = {}) {
  const rest = { ...row };
  delete rest.canonical_table;
  delete rest.service_delivery_json;
  return rest;
}

export function describeServiceDeliveryLiveConfig() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const hasKey = Boolean(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const missing_env = [];
  if (!hasUrl) missing_env.push("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  if (!hasKey) missing_env.push("SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
  return {
    configured: hasUrl && hasKey,
    tables: SERVICE_DELIVERY_LIVE_TABLES,
    opportunity_upsert_rpc: SERVICE_DELIVERY_OPPORTUNITY_UPSERT_RPC,
    missing_env,
    reason: hasUrl && hasKey ? "configured" : "supabase_not_configured",
  };
}

export function makeServiceDeliverySupabaseClient(options = {}) {
  const cfg = options.config === undefined ? getSupabaseConfig() : options.config;
  if (!cfg) return null;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const root = cfg.url.replace(/\/$/, "");
  const baseHeaders = headers(cfg.key);

  async function request(method, table, query = "", body, extraHeaders = {}) {
    const res = await fetchImpl(`${root}/rest/v1/${table}${query}`, {
      method,
      headers: { ...baseHeaders, ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `${table}_${method}_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 240)}` };
    const text = await res.text().catch(() => "");
    return { ok: true, rows: text ? JSON.parse(text) : [] };
  }

  async function readOpportunity(intent_id) {
    const res = await request("GET", SERVICE_DELIVERY_LIVE_TABLES.opportunities, `?intent_id=eq.${encodeURIComponent(intent_id)}&select=raw_intent,version,lifecycle_state&limit=1`);
    if (!res.ok) return null;
    return Array.isArray(res.rows) && res.rows[0] ? res.rows[0] : null;
  }

  async function readBy(table, query) {
    const res = await request("GET", table, `${query}&limit=1`);
    if (!res.ok) return null;
    return Array.isArray(res.rows) && res.rows[0] ? res.rows[0] : null;
  }

  return {
    configured: true,
    kind: "supabase",
    tables: SERVICE_DELIVERY_LIVE_TABLES,
    async upsertOpportunity(row) {
      const current = await readOpportunity(row.intent_id);
      const expected = Number(current?.version || 0);
      const res = await request("POST", `rpc/${SERVICE_DELIVERY_OPPORTUNITY_UPSERT_RPC}`, "", {
        p_intent_id: row.intent_id,
        p_idempotency_key: row.idempotency_key,
        p_expected_version: expected,
        p_row: row.raw_intent || row,
      });
      if (!res.ok) return res;
      const body = Array.isArray(res.rows) ? res.rows[0] : res.rows;
      return { ok: body?.ok !== false, created: !current, row: body || row };
    },
    async upsertTicket(row) {
      const current = await readBy(SERVICE_DELIVERY_LIVE_TABLES.tickets, `?ticket_number=eq.${encodeURIComponent(row.ticket_number)}&select=id,ticket_number,status`);
      const res = await request(
        "POST",
        SERVICE_DELIVERY_LIVE_TABLES.tickets,
        "?on_conflict=ticket_number&select=*",
        liveWritableRow(row),
        { Prefer: "resolution=merge-duplicates,return=representation" },
      );
      return { ok: res.ok, created: !current, row: Array.isArray(res.rows) ? res.rows[0] || row : row, error: res.error };
    },
    async upsertTicketEvent(row) {
      const current = await readBy(SERVICE_DELIVERY_LIVE_TABLES.ticket_events, `?id=eq.${encodeURIComponent(row.id)}&select=id`);
      const res = await request(
        "POST",
        SERVICE_DELIVERY_LIVE_TABLES.ticket_events,
        "?on_conflict=id&select=*",
        liveWritableRow(row),
        { Prefer: "resolution=ignore-duplicates,return=representation" },
      );
      return { ok: res.ok, created: !current, row: Array.isArray(res.rows) ? res.rows[0] || row : row, error: res.error };
    },
    async upsertDeployment(row) {
      const current = await readBy(SERVICE_DELIVERY_LIVE_TABLES.deployments, `?id=eq.${encodeURIComponent(row.id)}&select=id`);
      const res = await request(
        "POST",
        SERVICE_DELIVERY_LIVE_TABLES.deployments,
        "?on_conflict=id&select=*",
        liveWritableRow(row),
        { Prefer: "resolution=merge-duplicates,return=representation" },
      );
      return { ok: res.ok, created: !current, row: Array.isArray(res.rows) ? res.rows[0] || row : row, error: res.error };
    },
    async patchTicket(ticketNumber, patch) {
      const res = await request("PATCH", SERVICE_DELIVERY_LIVE_TABLES.tickets, `?ticket_number=eq.${encodeURIComponent(ticketNumber)}&select=*`, patch, { Prefer: "return=representation" });
      return { ok: res.ok, row: Array.isArray(res.rows) ? res.rows[0] || null : null, error: res.error };
    },
    async listServiceDeliveryStatus() {
      const opportunities = await request("GET", SERVICE_DELIVERY_LIVE_TABLES.opportunities, "?select=intent_id,lifecycle_state,raw_intent,updated_at&order=updated_at.desc&limit=500");
      const tickets = await request("GET", SERVICE_DELIVERY_LIVE_TABLES.tickets, "?source_channel=eq.service_delivery_spine&select=*&order=updated_at.desc&limit=200");
      const events = await request("GET", SERVICE_DELIVERY_LIVE_TABLES.ticket_events, "?event_type=like.service_delivery_%25&select=*&order=created_at.desc&limit=500");
      const deployments = await request("GET", SERVICE_DELIVERY_LIVE_TABLES.deployments, "?deployment_model=eq.ottoserv_managed&select=*&order=updated_at.desc&limit=500");
      const serviceDeliveryOpportunities = asArray(opportunities.rows).filter((row) => row?.raw_intent?.service_delivery);
      const serviceDeliveryDeployments = asArray(deployments.rows).filter((row) => row?.handoff_package?.source === "service_delivery_spine");
      return {
        ok: tickets.ok,
        opportunities: serviceDeliveryOpportunities,
        tickets: tickets.rows || [],
        events: events.rows || [],
        deployments: serviceDeliveryDeployments,
        error: tickets.error || events.error || deployments.error || opportunities.error,
      };
    },
  };
}

export function createMockServiceDeliveryLiveClient(seed = {}) {
  const memory = createMemoryServiceDeliveryStore(seed);
  async function put(map, key, row) {
    const created = !map.has(key);
    map.set(key, { ...(map.get(key) || {}), ...clone(row) });
    return { ok: true, created, row: map.get(key) };
  }
  return {
    configured: true,
    kind: "mock_supabase",
    tables: memory.tables,
    async upsertOpportunity(row) { return put(memory.tables.hermes_opportunity_actions, row.intent_id, row); },
    async upsertTicket(row) { return put(memory.tables.techops_tickets, row.ticket_number, row); },
    async upsertTicketEvent(row) { return put(memory.tables.techops_ticket_events, row.id, row); },
    async upsertDeployment(row) { return put(memory.tables.client_deployments, row.id, row); },
    async patchTicket(ticketNumber, patch) {
      const current = memory.tables.techops_tickets.get(ticketNumber);
      if (!current) return { ok: false, error: "ticket_not_found" };
      memory.tables.techops_tickets.set(ticketNumber, { ...current, ...clone(patch) });
      return { ok: true, row: memory.tables.techops_tickets.get(ticketNumber) };
    },
    async listServiceDeliveryStatus() {
      return {
        ok: true,
        opportunities: [...memory.tables.hermes_opportunity_actions.values()].map(clone),
        tickets: [...memory.tables.techops_tickets.values()].map(clone),
        events: [...memory.tables.techops_ticket_events.values()].map(clone),
        deployments: [...memory.tables.client_deployments.values()].map(clone),
      };
    },
  };
}

export function createMemoryServiceDeliveryStore(seed = {}) {
  const tables = {
    hermes_opportunity_actions: new Map(seed.hermes_opportunity_actions || []),
    techops_tickets: new Map(seed.techops_tickets || []),
    techops_ticket_events: new Map(seed.techops_ticket_events || []),
    client_deployments: new Map(seed.client_deployments || []),
    onboarding_sessions: new Map(seed.onboarding_sessions || []),
    process_scans: new Map(seed.process_scans || []),
    approval_cards: new Map(seed.approval_cards || []),
    execution_packets: new Map(seed.execution_packets || []),
  };
  return { tables };
}

export function opportunityToCanonicalIntent(opportunity = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const intentId = stableId("sdo", opportunity.id || `${opportunity.service_key}:${opportunity.opportunity_type}:${opportunity.client?.company_name}`);
  const leadId = stableId("service_client", opportunity.client?.company_name || opportunity.id);
  const route = opportunity.route || {};
  const lifecycle = riskIsHigh(opportunity.risk_level) ? "approval_required" : "queue_ready";

  return {
    intent_id: intentId,
    idempotency_key: `service-delivery:${clean(opportunity.id) || intentId}`,
    lead_id: leadId,
    lead_version: 1,
    selected_action: clean(opportunity.opportunity_type),
    lifecycle_state: lifecycle,
    approval_boundary: riskIsHigh(opportunity.risk_level) ? "jonathan_required" : "",
    policy_receipt: {
      policy_ref: SERVICE_DELIVERY_PERSISTENCE_VERSION,
      deterministic: true,
      route,
    },
    source_evidence: {
      evidence: clean(opportunity.evidence),
      source_refs: asArray(opportunity.source_refs),
      service_key: clean(opportunity.service_key),
      recommended_service_key: clean(opportunity.recommended_service_key),
    },
    raw_intent: {
      intent_id: intentId,
      selected_action: clean(opportunity.opportunity_type),
      lifecycle_state: lifecycle,
      lead_ref: { lead_id: leadId, version: 1 },
      service_delivery: opportunity,
      version: 1,
      created_at: now,
      updated_at: now,
    },
    version: 1,
    attempts: 0,
    created_at: now,
    updated_at: now,
    canonical_table: SERVICE_DELIVERY_CANONICAL_TABLES.hermes_actions,
  };
}

export function workOrderToCanonicalTicket(workOrder = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const ticketNumber = clean(workOrder.id) || stableId("WO", workOrder.source_opportunity_id);
  return {
    id: stableUuid("ticket", ticketNumber),
    ticket_number: ticketNumber,
    client_id: null,
    contact_name: clean(workOrder.contactName),
    contact_email: clean(workOrder.contactEmail),
    source_channel: "service_delivery_spine",
    category: "Service Delivery Automation",
    issue_summary: clean(workOrder.title),
    description: clean(workOrder.description),
    urgency: clean(workOrder.priority) || "medium",
    priority: clean(workOrder.priority) || "medium",
    risk_level: clean(workOrder.implementation?.assignment?.requires_approval ? "high" : workOrder.risk_level || "medium"),
    status: workOrder.implementation?.readiness?.can_queue ? "queue_ready" : clean(workOrder.status) || "new",
    agent_handled: false,
    human_escalated: Boolean(workOrder.implementation?.assignment?.requires_approval),
    dispatch_required: false,
    billing_category: "service_delivery_automation",
    approval_required: Boolean(workOrder.implementation?.assignment?.requires_approval || workOrder.approvalRequired),
    escalation_reason: clean(workOrder.implementation?.assignment?.reason),
    created_at: clean(workOrder.createdAt) || now,
    updated_at: now,
    canonical_table: SERVICE_DELIVERY_CANONICAL_TABLES.implementation_work_orders,
  };
}

export function workOrderGeneratedEvent(workOrder = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const ticketNumber = clean(workOrder.id);
  return {
    id: stableUuid("event", `${ticketNumber}:generated`),
    ticket_id: stableUuid("ticket", ticketNumber),
    event_type: "service_delivery_work_order_generated",
    actor_type: "system",
    actor_id: "phase6b_service_delivery_spine",
    summary: `Generated service delivery work order for ${clean(workOrder.client) || "client"}.`,
    details_json: {
      evidence: {
        source_opportunity_id: clean(workOrder.source_opportunity_id),
        source_refs: asArray(workOrder.implementation?.source_refs),
        required_evidence: asArray(workOrder.implementation?.testing_checklist),
      },
      assignment: workOrder.implementation?.assignment || {},
      readiness: workOrder.implementation?.readiness || {},
      no_live_execution: true,
    },
    created_at: now,
    canonical_table: SERVICE_DELIVERY_CANONICAL_TABLES.work_order_events,
  };
}

export function deliveryPackageSummary(workOrder = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  return {
    id: stableUuid("deployment", workOrder.id),
    company_id: stableUuid("company", workOrder.client || workOrder.id),
    deployment_model: "ottoserv_managed",
    selector_inputs: {
      source_work_order_id: clean(workOrder.id),
      service_key: clean(workOrder.service_key),
      opportunity_type: clean(workOrder.opportunity_type),
    },
    selector_reasoning: "Phase 6B generated from persisted service delivery opportunity and work order.",
    infrastructure_ownership: ["ottoserv"],
    handoff_status: workOrder.implementation?.readiness?.can_queue ? "deployment" : "permission_review",
    handoff_package: {
      source: "service_delivery_spine",
      work_order_id: clean(workOrder.id),
      client: clean(workOrder.client),
      service_key: clean(workOrder.service_key),
      status: clean(workOrder.status),
      route: workOrder.implementation?.assignment || {},
      monitoring_metrics: asArray(workOrder.implementation?.monitoring_metrics),
      upsell_paths: asArray(workOrder.implementation?.upsell_paths),
      generated_at: now,
      evidence_required: asArray(workOrder.implementation?.testing_checklist),
      no_live_execution: true,
    },
    created_at: now,
    updated_at: now,
    canonical_table: SERVICE_DELIVERY_CANONICAL_TABLES.deployments,
  };
}

export function createServiceDeliveryApprovalCard(workOrder = {}, options = {}) {
  const opportunity = options.opportunity || {};
  const now = options.now || new Date().toISOString();
  const action = clean(workOrder.title) || clean(opportunity.opportunity_type) || "Service delivery execution approval";
  return {
    id: stableId("sdo_approval", workOrder.id || opportunity.id),
    source: "phase6b_service_delivery",
    requestedAction: action,
    reason: clean(workOrder.implementation?.assignment?.reason) || "Generated service delivery work order crosses an approval boundary.",
    riskLevel: clean(workOrder.implementation?.assignment?.requires_approval ? "high" : opportunity.risk_level || "medium"),
    unlocks: clean(workOrder.implementation?.readiness?.route?.reason) || "Allows Hermes to route this work item into controlled execution.",
    approvalType: "one_time",
    status: "pending",
    created_at: now,
    payload: {
      client: clean(workOrder.client || opportunity.client?.company_name),
      service: clean(workOrder.service_key || opportunity.recommended_service_key),
      action,
      risk_reason: clean(workOrder.implementation?.assignment?.reason),
      source_evidence: [clean(opportunity.evidence), ...asArray(opportunity.source_refs)].filter(Boolean),
      expected_execution_result: `Route ${clean(workOrder.id)} to ${clean(workOrder.implementation?.assignment?.assignee) || "the assigned actor"} after approval.`,
      canonical_ticket_table: SERVICE_DELIVERY_CANONICAL_TABLES.implementation_work_orders,
      canonical_event_table: SERVICE_DELIVERY_CANONICAL_TABLES.work_order_events,
      work_order_id: clean(workOrder.id),
    },
  };
}

export function createServiceDeliveryExecutionPacket(workOrder = {}, options = {}) {
  const opportunity = options.opportunity || {};
  const now = options.now || new Date().toISOString();
  const assignment = workOrder.implementation?.assignment || {};
  const assignee = clean(assignment.assignee) || "Hermes";
  const requiresApproval = Boolean(assignment.requires_approval);
  const rail =
    /cowork/i.test(assignee) ? "cowork" :
    /codex|claude/i.test(assignee) ? "codex" :
    /jonathan/i.test(assignee) ? "manual_review" :
    "hermes_internal";

  return {
    task_id: stableId("sdo_task", workOrder.id || opportunity.id),
    source: "phase6b_service_delivery",
    related_ticket_number: clean(workOrder.id),
    related_opportunity_id: clean(opportunity.id || workOrder.source_opportunity_id),
    status: requiresApproval ? "blocked_pending_approval" : "queue_ready",
    execution_rail: rail,
    assigned_agent: requiresApproval ? "Jonathan" : assignee,
    requested_action: clean(workOrder.title) || clean(opportunity.opportunity_type),
    client: clean(workOrder.client || opportunity.client?.company_name),
    service_key: clean(workOrder.service_key || opportunity.recommended_service_key),
    required_evidence: asArray(workOrder.implementation?.testing_checklist).length
      ? asArray(workOrder.implementation.testing_checklist)
      : ["Execution evidence required before completion."],
    forbidden_actions: [
      "Activate production automation without approval",
      "Send client-facing deliverables without approval",
      "Create or send Stripe payment links without approval",
      "Place live Retell/voice calls without an approved rail",
      "Fabricate evidence or mark complete without proof",
    ],
    monitoring_metrics: asArray(workOrder.implementation?.monitoring_metrics),
    upsell_paths: asArray(workOrder.implementation?.upsell_paths),
    created_at: now,
  };
}

export async function persistServiceDeliveryRun(input = {}, options = {}) {
  const liveClient = options.liveClient || null;
  const store = liveClient ? null : (options.store || createMemoryServiceDeliveryStore());
  const now = options.now || new Date().toISOString();
  const opportunities = asArray(input.opportunities);
  const workOrders = asArray(input.workOrders);
  const approvalCards = asArray(input.approvalCards);
  const executionPackets = asArray(input.executionPackets);
  const result = {
    opportunities: { created: 0, skipped_existing: 0, total: opportunities.length },
    work_orders: { created: 0, skipped_existing: 0, total: workOrders.length },
    ticket_events: { created: 0, skipped_existing: 0 },
    delivery_packages: { created: 0, skipped_existing: 0 },
    approval_cards: { created: 0, skipped_existing: 0, pending: 0 },
    execution_packets: { created: 0, skipped_existing: 0, queue_ready: 0 },
    tables_reused: SERVICE_DELIVERY_CANONICAL_TABLES,
    mode: liveClient ? "live" : "memory",
  };

  for (const opportunity of opportunities) {
    const row = opportunityToCanonicalIntent(opportunity, { now });
    if (liveClient) {
      const wrote = await liveClient.upsertOpportunity(row);
      if (wrote?.created) result.opportunities.created += 1;
      else result.opportunities.skipped_existing += 1;
    } else if (store.tables.hermes_opportunity_actions.has(row.intent_id)) {
      result.opportunities.skipped_existing += 1;
    } else {
      store.tables.hermes_opportunity_actions.set(row.intent_id, row);
      result.opportunities.created += 1;
    }
  }

  for (const workOrder of workOrders) {
    const ticket = workOrderToCanonicalTicket(workOrder, { now });
    if (liveClient) {
      const wrote = await liveClient.upsertTicket(ticket);
      if (wrote?.created) result.work_orders.created += 1;
      else result.work_orders.skipped_existing += 1;
    } else if (store.tables.techops_tickets.has(ticket.ticket_number)) {
      result.work_orders.skipped_existing += 1;
    } else {
      store.tables.techops_tickets.set(ticket.ticket_number, ticket);
      result.work_orders.created += 1;
    }

    const event = workOrderGeneratedEvent(workOrder, { now });
    if (liveClient) {
      const wrote = await liveClient.upsertTicketEvent(event);
      if (wrote?.created) result.ticket_events.created += 1;
      else result.ticket_events.skipped_existing += 1;
    } else if (store.tables.techops_ticket_events.has(event.id)) {
      result.ticket_events.skipped_existing += 1;
    } else {
      store.tables.techops_ticket_events.set(event.id, event);
      result.ticket_events.created += 1;
    }

    const deployment = deliveryPackageSummary(workOrder, { now });
    if (liveClient) {
      const wrote = await liveClient.upsertDeployment(deployment);
      if (wrote?.created) result.delivery_packages.created += 1;
      else result.delivery_packages.skipped_existing += 1;
    } else if (store.tables.client_deployments.has(deployment.id)) {
      result.delivery_packages.skipped_existing += 1;
    } else {
      store.tables.client_deployments.set(deployment.id, deployment);
      result.delivery_packages.created += 1;
    }
  }

  for (const card of approvalCards) {
    if (liveClient) {
      result.approval_cards.created += 1;
      continue;
    }
    if (store.tables.approval_cards.has(card.id)) {
      result.approval_cards.skipped_existing += 1;
    } else {
      store.tables.approval_cards.set(card.id, card);
      result.approval_cards.created += 1;
    }
  }

  for (const packet of executionPackets) {
    if (liveClient) {
      result.execution_packets.created += 1;
      if (packet.status === "queue_ready") result.execution_packets.queue_ready += 1;
      continue;
    }
    if (store.tables.execution_packets.has(packet.task_id)) {
      result.execution_packets.skipped_existing += 1;
    } else {
      store.tables.execution_packets.set(packet.task_id, packet);
      result.execution_packets.created += 1;
    }
  }

  if (liveClient) {
    result.approval_cards.pending = approvalCards.filter((card) => clean(card.status) === "pending").length;
  } else {
    result.approval_cards.pending = [...store.tables.approval_cards.values()].filter((card) => clean(card.status) === "pending").length;
    result.execution_packets.queue_ready = [...store.tables.execution_packets.values()].filter((packet) => clean(packet.status) === "queue_ready").length;
  }
  return result;
}

function recordToSource(record) {
  if (record?.client || record?.findings) return record;
  return {
    ...record,
    service_key: clean(record.service_key) || clean(asArray(record.selected_services)[0]) || "front_office_leak_check",
    client: {
      company_name: clean(record.company_name || record.company),
      contact_name: clean(record.contact_name || record.contact),
      email: clean(record.email),
    },
    intake: {
      process_name: clean(record.process_name),
      software_used: clean(record.software_used),
      current_process_description: clean(record.current_process_description),
    },
  };
}

export async function runServiceDeliveryOperatingCycle(options = {}) {
  const now = options.now || new Date().toISOString();
  const liveClient = options.liveClient || null;
  const store = options.store || createMemoryServiceDeliveryStore();
  const records = asArray(options.records);
  const normalizedRequests = records.map((record) => normalizeServiceDeliverySignal(recordToSource(record), { now }));
  const deliveryPackages = [];
  const opportunities = [];
  const workOrders = [];
  let sequenceStart = Number(options.sequenceStart || 900);
  for (const request of normalizedRequests) {
    const requestOpportunities = translateFindingsToOpportunities(request, { now });
    const deliveryPackage = generateServiceDeliveryPackage(request, requestOpportunities, { now });
    const requestWorkOrders = generateImplementationWorkOrders(deliveryPackage, { now, sequenceStart });
    sequenceStart += requestWorkOrders.length;
    opportunities.push(...requestOpportunities);
    deliveryPackages.push(deliveryPackage);
    workOrders.push(...requestWorkOrders);
  }
  const byOpportunityId = new Map(opportunities.map((opportunity) => [clean(opportunity.id), opportunity]));
  const approvalCards = [];
  const executionPackets = [];

  for (const workOrder of workOrders) {
    const opportunity = byOpportunityId.get(clean(workOrder.source_opportunity_id)) || {};
    const packet = createServiceDeliveryExecutionPacket(workOrder, { opportunity, now });
    if (packet.status === "blocked_pending_approval") {
      approvalCards.push(createServiceDeliveryApprovalCard(workOrder, { opportunity, now }));
    } else {
      executionPackets.push(packet);
    }
  }

  const persistence = await persistServiceDeliveryRun({ opportunities, workOrders, approvalCards, executionPackets }, { store, liveClient, now });
  const liveStatus = liveClient ? await readLiveServiceDeliveryStatus({ liveClient }) : null;
  const summaries = workOrders.map((workOrder) => ({
    work_order_id: clean(workOrder.id),
    client: clean(workOrder.client),
    service_key: clean(workOrder.service_key),
    status: clean(workOrder.status),
    route: workOrder.implementation?.assignment || {},
    monitoring_metrics: asArray(workOrder.implementation?.monitoring_metrics),
    upsell_paths: asArray(workOrder.implementation?.upsell_paths),
  }));
  const dashboardExport = buildServiceDeliveryDashboardExport({
    service_requests: normalizedRequests.map((request) => ({
      request_id: request.request_id,
      client: request.client,
      service_key: request.service_key,
      status: request.blocked_items.length ? "active_blocked" : "active",
      next_action: request.safe_autonomous_next_actions[0],
    })),
    delivery_packages: deliveryPackages,
    work_orders: workOrders,
  }, { now });

  return {
    ok: true,
    generated_at: now,
    normalized_requests: normalizedRequests,
    delivery_packages: deliveryPackages,
    opportunities,
    workOrders,
    approval_cards: approvalCards,
    execution_packets: executionPackets,
    delivery_status_summaries: summaries,
    dashboard_export: dashboardExport,
    persistence,
    store,
    summary: {
      records_seen: records.length,
      mode: liveClient ? "live" : "memory",
      opportunities: { total: opportunities.length, persisted: liveStatus?.summary?.opportunities?.persisted ?? store.tables.hermes_opportunity_actions.size },
      work_orders: { total: workOrders.length, persisted: liveStatus?.summary?.work_orders?.persisted ?? store.tables.techops_tickets.size },
      ticket_events: { total: liveStatus?.summary?.ticket_events?.total ?? store.tables.techops_ticket_events.size },
      approvals: { pending: approvalCards.length },
      execution_packets: { queue_ready: executionPackets.filter((packet) => packet.status === "queue_ready").length },
      delivery_packages: { total: deliveryPackages.length, recoverable: liveStatus?.summary?.delivery_packages?.recoverable ?? store.tables.client_deployments.size },
      tables_reused: SERVICE_DELIVERY_CANONICAL_TABLES,
    },
  };
}

function eventFromDecision(decision = {}, approvalCard = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const decisionValue = lower(decision.decision);
  const ticketNumber = clean(approvalCard.payload?.work_order_id || options.ticketNumber);
  return {
    id: stableUuid("event", `${ticketNumber}:approval:${decisionValue}:${clean(decision.decided_at) || now}`),
    ticket_id: stableUuid("ticket", ticketNumber),
    event_type: `service_delivery_approval_${decisionValue}`,
    actor_type: "human",
    actor_id: clean(decision.decided_by) || "Jonathan",
    summary: `Service delivery approval ${decisionValue}.`,
    details_json: {
      approval_item_id: clean(decision.approval_item_id || approvalCard.id),
      decision: decisionValue,
      decided_by: clean(decision.decided_by),
      decided_at: clean(decision.decided_at) || now,
      reason_or_note: clean(decision.reason_or_note),
      evidence: {
        source: "hermes_approval_outbox",
        source_evidence: asArray(approvalCard.payload?.source_evidence),
      },
      no_live_execution: true,
    },
    created_at: now,
    canonical_table: SERVICE_DELIVERY_CANONICAL_TABLES.work_order_events,
  };
}

export async function applyServiceDeliveryApprovalDecision(decision = {}, options = {}) {
  const liveClient = options.liveClient;
  if (!liveClient) return { ok: false, reason: "live_client_required" };
  const approvalCard = options.approvalCard || {};
  const ticketNumber = clean(approvalCard.payload?.work_order_id || options.ticketNumber);
  if (!ticketNumber) return { ok: false, reason: "missing_work_order_id" };
  const value = lower(decision.decision);
  if (!["approved", "rejected", "revision_requested"].includes(value)) return { ok: false, reason: "unsupported_decision" };
  if (!clean(decision.reason_or_note) && value !== "approved") return { ok: false, reason: "rejection_or_revision_reason_required" };

  const nextStatus = value === "approved" ? "sandbox_execution_ready" : value === "rejected" ? "blocked_rejected" : "revision_requested";
  const patched = await liveClient.patchTicket(ticketNumber, {
    status: nextStatus,
    approval_required: value !== "approved",
    human_escalated: value !== "approved",
    updated_at: options.now || new Date().toISOString(),
  });
  if (!patched?.ok) return { ok: false, reason: patched?.error || "ticket_patch_failed" };
  const event = eventFromDecision(decision, approvalCard, { now: options.now, ticketNumber });
  const wrote = await liveClient.upsertTicketEvent(event);
  if (!wrote?.ok) return { ok: false, reason: wrote?.error || "approval_event_write_failed" };
  return { ok: true, status: nextStatus, event };
}

function eventFromExecutionEvidence(packet = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const evidence = packet.evidence || {};
  const ticketNumber = clean(packet.related_ticket_number);
  return {
    id: stableUuid("event", `${ticketNumber}:evidence:${clean(evidence.evidence_id || packet.task_id || now)}`),
    ticket_id: stableUuid("ticket", ticketNumber),
    event_type: clean(evidence.review_status) === "accepted"
      ? "service_delivery_execution_evidence_accepted"
      : "service_delivery_execution_evidence_submitted",
    actor_type: "agent",
    actor_id: clean(packet.assigned_agent) || "Hermes",
    summary: clean(evidence.evidence_summary) || "Service delivery execution evidence submitted.",
    details_json: {
      task_id: clean(packet.task_id),
      execution_status: clean(packet.status),
      evidence: {
        evidence_id: clean(evidence.evidence_id),
        evidence_type: clean(evidence.evidence_type),
        evidence_summary: clean(evidence.evidence_summary),
        evidence_reference: clean(evidence.evidence_reference),
        review_status: clean(evidence.review_status) || "not_reviewed",
      },
      no_live_execution: true,
    },
    created_at: now,
    canonical_table: SERVICE_DELIVERY_CANONICAL_TABLES.work_order_events,
  };
}

export async function ingestServiceDeliveryExecutionEvidence(packet = {}, options = {}) {
  const liveClient = options.liveClient;
  if (!liveClient) return { ok: false, reason: "live_client_required" };
  const ticketNumber = clean(packet.related_ticket_number);
  if (!ticketNumber) return { ok: false, reason: "missing_related_ticket_number" };
  const evidence = packet.evidence || {};
  if (lower(packet.status) === "completed" && !clean(evidence.evidence_reference) && !clean(evidence.evidence_summary)) {
    return { ok: false, reason: "completion_requires_evidence" };
  }
  const event = eventFromExecutionEvidence(packet, options);
  const wrote = await liveClient.upsertTicketEvent(event);
  if (!wrote?.ok) return { ok: false, reason: wrote?.error || "evidence_event_write_failed" };
  const nextStatus = lower(packet.status) === "completed" && clean(evidence.review_status) === "accepted" ? "completed" : "waiting_for_evidence_review";
  const patched = await liveClient.patchTicket(ticketNumber, {
    status: nextStatus,
    updated_at: options.now || new Date().toISOString(),
  });
  if (!patched?.ok) return { ok: false, reason: patched?.error || "ticket_patch_failed" };
  return { ok: true, status: nextStatus, event };
}

export async function readLiveServiceDeliveryStatus(options = {}) {
  const liveClient = options.liveClient || makeServiceDeliverySupabaseClient(options);
  if (!liveClient) return { available: false, reason: "supabase_not_configured", summary: { opportunities: { persisted: 0 }, work_orders: { persisted: 0 }, ticket_events: { total: 0 }, delivery_packages: { recoverable: 0 } }, delivery_status_summaries: [], approval_cards: [], execution_packets: [] };
  const listed = await liveClient.listServiceDeliveryStatus();
  if (!listed?.ok) return { available: false, reason: listed?.error || "live_status_read_failed", summary: { opportunities: { persisted: 0 }, work_orders: { persisted: 0 }, ticket_events: { total: 0 }, delivery_packages: { recoverable: 0 } }, delivery_status_summaries: [], approval_cards: [], execution_packets: [] };
  const tickets = asArray(listed.tickets);
  const opportunities = asArray(listed.opportunities);
  const events = asArray(listed.events);
  const deployments = asArray(listed.deployments);
  const deploymentsByWorkOrder = new Map(deployments.map((deployment) => [clean(deployment.selector_inputs?.source_work_order_id || deployment.handoff_package?.work_order_id), deployment]));
  return {
    available: true,
    source: "live_supabase",
    summary: {
      mode: "live",
      work_orders: { persisted: tickets.length },
      opportunities: { persisted: opportunities.length },
      ticket_events: { total: events.length },
      delivery_packages: { recoverable: deployments.length },
      approvals: { pending: tickets.filter((ticket) => ticket.status === "needs_approval").length },
      execution_packets: { queue_ready: tickets.filter((ticket) => ticket.status === "queue_ready" || ticket.status === "sandbox_execution_ready").length },
    },
    delivery_status_summaries: tickets.map((ticket) => {
      const deployment = deploymentsByWorkOrder.get(clean(ticket.ticket_number)) || {};
      const service = deployment.handoff_package || {};
      const selector = deployment.selector_inputs || {};
      return {
        work_order_id: clean(ticket.ticket_number),
        client: clean(ticket.issue_summary || ticket.client_id),
        service_key: clean(service.service_key || selector.service_key),
        status: clean(ticket.status),
        route: service.route || {},
        monitoring_metrics: asArray(service.monitoring_metrics),
        upsell_paths: asArray(service.upsell_paths),
      };
    }),
    approval_cards: [],
    execution_packets: [],
    raw: { opportunities, tickets, events, deployments },
  };
}

export async function generateMonitoringUpsellRollups(options = {}) {
  const status = await readLiveServiceDeliveryStatus(options);
  if (!status.available) return [];
  const events = asArray(status.raw?.events);
  const deploymentsByWorkOrder = new Map(asArray(status.raw?.deployments).map((deployment) => [clean(deployment.selector_inputs?.source_work_order_id || deployment.handoff_package?.work_order_id), deployment]));
  return asArray(status.raw?.tickets).map((ticket) => {
    const deployment = deploymentsByWorkOrder.get(clean(ticket.ticket_number)) || {};
    const serviceJson = deployment.handoff_package || {};
    const selector = deployment.selector_inputs || {};
    const serviceKey = clean(serviceJson.service_key || selector.service_key);
    const evidenceEvents = events.filter((event) => clean(event.ticket_id) === stableUuid("ticket", ticket.ticket_number));
    const latestEvidenceEvent = evidenceEvents.find((event) => /evidence/.test(clean(event.event_type))) || null;
    const latestEvidence = latestEvidenceEvent?.details_json?.evidence || null;
    let upsell = asArray(serviceJson.upsell_paths)[0] || "";
    if (!upsell && serviceKey) {
      try { upsell = asArray(getServiceDefinition(serviceKey).upsell_paths)[0] || ""; } catch { upsell = ""; }
    }
    return {
      work_order_id: clean(ticket.ticket_number),
      active_service: serviceKey,
      launch_status: clean(ticket.status),
      latest_evidence: latestEvidence,
      monitoring_metrics: asArray(serviceJson.monitoring_metrics),
      recommended_next_service: upsell,
      updated_at: clean(ticket.updated_at),
    };
  });
}

export function serviceDeliveryDuplicateTableNames(schemaText = "") {
  const names = [];
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi;
  let match;
  while ((match = re.exec(schemaText))) {
    const name = match[1];
    if (DUPLICATE_TABLE_PATTERNS.some((pattern) => pattern.test(name))) names.push(name);
  }
  return names;
}
