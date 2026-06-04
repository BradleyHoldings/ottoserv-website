// ─── Implementation work orders (service-delivery spine) ──────────────────────
//
// WHY THIS EXISTS
// `revenueLoopSources.buildImplementationWorkOrders()` turns report-ready Front
// Office Leak Check / ProcessScan results into lightweight *seeds*. Seeds are not
// durable and cannot carry approval state, evidence, or lifecycle. This module
// promotes those seeds into REAL, durable implementation work orders.
//
// It deliberately reuses the existing field-service work-order primitives in
// `src/lib/workOrders.mjs` (`buildWorkOrder`, `updateWorkOrderStatus`,
// `addWorkOrderActivity`) for the base record (id, approval-aware status,
// activity log, timestamps) and EXTENDS them with the implementation-engagement
// fields the field-service model does not have: engagement type, pilot stage
// ladder, success criteria, required evidence, recommended actor, risk level,
// next action, and the high-risk approval gates (paid implementation, pricing,
// payment links, final client deliverables, production automation changes).
//
// No parallel work-order system: every record is a `buildWorkOrder()` object
// plus an `implementation` block. Promotion is idempotent (deduped by seed id)
// so the daily loop can call it every run without creating duplicates.
//
// No credentials, no network, no deploy settings. The durable store is a JSON
// file under the already-gitignored `data/revenue-engine/` runtime dir, so real
// client/contact data is never committed.

import { promises as fs } from "node:fs";
import path from "node:path";

import { buildWorkOrder, updateWorkOrderStatus } from "./workOrders.mjs";
import { inferIntegrations } from "./hermesBuildPacket.mjs";

// Standard client inputs and engagement risks a work order must surface so the
// proposal/scoping conversation and the build packet are complete.
function clientInputsFor() {
  return [
    "Business hours, service area, and call-handling rules.",
    "Top FAQs/scripts and the desired booking/qualification flow.",
    "Phone-number/forwarding + CRM access (provisioned by Jonathan; Hermes never handles credentials).",
    "Approved messaging/tone and any compliance constraints.",
  ];
}
function engagementRisksFor(seed) {
  const risks = [
    "Client does not pay/sign the pilot scope → engagement cannot open (gate holds).",
    "Required client inputs/access delayed → implementation blocked.",
    "Integration limits (telephony/CRM/calendar) reduce automation coverage → re-scope.",
  ];
  if (/payment|stripe|invoice|billing/i.test(String(seed.main_leak) + String(seed.pilot_recommendation))) {
    risks.push("Payment/financial step is client-facing and approval-gated — never auto-execute.");
  }
  return risks;
}

export function resolveImplementationStorePath(options = {}) {
  if (options.storePath) return options.storePath;
  if (process.env.IMPLEMENTATION_WORK_ORDERS_PATH) return process.env.IMPLEMENTATION_WORK_ORDERS_PATH;
  const cwd = options.cwd || process.cwd();
  return path.join(cwd, "data", "revenue-engine", "implementation-work-orders.json");
}

// Pilot lifecycle ladder for an automation engagement. Each step maps to a base
// work-order status and to the actor who should move it next.
export const IMPLEMENTATION_STAGES = [
  "report_ready_awaiting_delivery",
  "awaiting_pilot_scope_or_proposal",
  "proposal_sent_awaiting_payment",
  "paid_awaiting_implementation",
  "implementation_in_progress",
  "delivered_awaiting_evidence",
  "completed",
];

// High-risk actions that must never auto-execute. Carried on every work order so
// Hermes/Codex can see exactly what still needs Jonathan before money or
// production changes move.
export const IMPLEMENTATION_GATED_ACTIONS = [
  { action: "paid_implementation", approval_required: true, reason: "Starting paid implementation work commits delivery effort and client expectations." },
  { action: "pricing", approval_required: true, reason: "Custom pricing, discounts, or guarantees require Jonathan." },
  { action: "payment_link", approval_required: true, reason: "Stripe products/links and payment requests require approval." },
  { action: "final_client_deliverable", approval_required: true, reason: "Final client-facing deliverables require approval before send." },
  { action: "production_automation_change", approval_required: true, reason: "New/activated production n8n workflows require approval." },
];

function clean(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stageForActor(stage) {
  switch (stage) {
    case "report_ready_awaiting_delivery":
      return { actor: "Hermes/Cowork", risk: "low", next: "Deliver the leak check report, then follow up to scope a 30-day pilot." };
    case "awaiting_pilot_scope_or_proposal":
      return { actor: "Jonathan → Codex", risk: "medium", next: "Scope the pilot, then get an approved proposal/payment link ready (approval-gated)." };
    case "proposal_sent_awaiting_payment":
      return { actor: "Jonathan", risk: "high", next: "Confirm approved payment link is sent and await paid pilot before implementation opens." };
    case "paid_awaiting_implementation":
      return { actor: "Codex", risk: "high", next: "Open implementation: build automations and wire approved workflows." };
    case "implementation_in_progress":
      return { actor: "Codex", risk: "high", next: "Complete build, verify with tests/route checks, attach evidence." };
    case "delivered_awaiting_evidence":
      return { actor: "Cowork/Codex", risk: "medium", next: "Attach delivery + pilot-metric evidence before closing." };
    default:
      return { actor: "Hermes", risk: "low", next: "Monitor pilot results." };
  }
}

function successCriteriaFor() {
  return [
    "Client receives the leak check report and books a pilot scoping conversation.",
    "Approved proposal and payment link accepted — pilot is paid before build starts.",
    "Implementation automations are built and verified by Codex (tests/build/route checks).",
    "Pilot metrics (response speed, completed follow-ups, recovered opportunities) measured against baseline.",
  ];
}

function requiredEvidenceFor(seed) {
  return [
    "Report delivery proof (email sent timestamp / message id).",
    clean(seed.evidence_requirement) || "Signed pilot scope or paid pilot (Stripe payment confirmation) before implementation work order opens.",
    "Codex commit hash + build/test/route-check output for each implemented automation.",
    "Approved n8n workflow activation record if production automation changes are made.",
    "Final client-facing deliverable approved by Jonathan before send.",
  ];
}

/**
 * Convert one implementation seed into a durable work order built on the existing
 * `buildWorkOrder` primitive. Pure — no I/O.
 *
 * @param {object} seed  Output of revenueLoopSources.buildImplementationWorkOrders()
 * @param {object} options { now, sequence, actor }
 */
export function seedToImplementationWorkOrder(seed = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const actor = options.actor || "RevenueEngine";
  const stage = IMPLEMENTATION_STAGES.includes(clean(seed.stage)) ? clean(seed.stage) : "awaiting_pilot_scope_or_proposal";
  const company = clean(seed.company) || "Unknown company";
  const role = stageForActor(stage);

  // Base record from the shared work-order model. Implementation engagements are
  // always approval-gated (they lead to paid work + client deliverables), so the
  // base status resolves to "needs_approval".
  const base = buildWorkOrder(
    {
      title: `Implementation: front office automation pilot — ${company}`,
      client: company,
      // The shared model requires `property`; automation engagements have no
      // physical property, so mirror the client as the engagement subject.
      property: company,
      description:
        clean(seed.pilot_recommendation) ||
        `Implement the recommended automation pilot for ${company} from the Front Office Leak Check.`,
      category: "Other",
      priority: "high",
      source: "ai_created",
      contactName: clean(seed.contact),
      contactEmail: clean(seed.email),
      notes: clean(seed.main_leak) ? `Primary leak under inspection: ${clean(seed.main_leak)}.` : "",
      approvalRequired: true,
      approvalStatus: "pending",
    },
    { now, sequence: options.sequence || 1, actor },
  );

  return {
    ...base,
    engagement_type: "automation_implementation",
    source_seed_id: clean(seed.id),
    scan_id: clean(seed.scan_id),
    report_url: clean(seed.report_url),
    main_leak: clean(seed.main_leak),
    pilot_recommendation: clean(seed.pilot_recommendation),
    automation_opportunities: asArray(seed.automation_opportunities),
    // Client context + planning fields so the work order is complete on its own.
    client_context: {
      company,
      contact: clean(seed.contact),
      email: clean(seed.email),
      source_url: clean(seed.interest_signal?.source_url) || clean(seed.report_url),
      main_pain: clean(seed.main_leak),
      interest_signal: seed.interest_signal || null,
    },
    pain: clean(seed.main_leak),
    integration_needs: inferIntegrations([...asArray(seed.automation_opportunities), clean(seed.main_leak), clean(seed.pilot_recommendation)]),
    client_inputs_needed: clientInputsFor(),
    risks: engagementRisksFor(seed),
    implementation_stage: stage,
    stage_ladder: IMPLEMENTATION_STAGES,
    recommended_actor: role.actor,
    risk_level: role.risk,
    next_action: clean(seed.next_action) || role.next,
    success_criteria: successCriteriaFor(),
    required_evidence: requiredEvidenceFor(seed),
    evidence: [],
    gated_actions: IMPLEMENTATION_GATED_ACTIONS,
    approval_reason:
      clean(seed.approval_reason) ||
      "Proposals, pricing, payment links, paid implementation, and client-facing deliverables require Jonathan approval.",
  };
}

export async function readImplementationWorkOrders(storePath) {
  try {
    const parsed = JSON.parse(await fs.readFile(storePath, "utf8"));
    return asArray(parsed);
  } catch {
    return [];
  }
}

export async function writeImplementationWorkOrders(storePath, list) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, `${JSON.stringify(asArray(list), null, 2)}\n`, "utf8");
}

/**
 * Idempotently promote seeds into durable implementation work orders.
 * Existing orders (matched by source_seed_id, else scan_id) are preserved, not
 * duplicated. Returns { created, skipped, workOrders, summary }.
 */
export async function promoteSeedsToWorkOrders(seeds = [], options = {}) {
  const storePath = resolveImplementationStorePath(options);
  const now = options.now || new Date().toISOString();
  const actor = options.actor || "RevenueEngine";

  const existing = await readImplementationWorkOrders(storePath);
  const existingKeys = new Set(
    existing.map((wo) => clean(wo.source_seed_id) || clean(wo.scan_id)).filter(Boolean),
  );

  const created = [];
  let sequence = existing.length;
  for (const seed of asArray(seeds)) {
    const key = clean(seed.id) || clean(seed.scan_id);
    if (key && existingKeys.has(key)) continue;
    sequence += 1;
    const workOrder = seedToImplementationWorkOrder(seed, { now, sequence, actor });
    created.push(workOrder);
    if (key) existingKeys.add(key);
  }

  const workOrders = [...existing, ...created];
  if (created.length) await writeImplementationWorkOrders(storePath, workOrders);

  return {
    created: created.length,
    skipped: asArray(seeds).length - created.length,
    workOrders,
    summary: summarizeImplementationWorkOrders(workOrders),
    storePath,
  };
}

export function summarizeImplementationWorkOrders(workOrders = []) {
  const byStage = {};
  const byStatus = {};
  let needsApproval = 0;
  let withEvidence = 0;
  for (const wo of asArray(workOrders)) {
    const stage = clean(wo.implementation_stage) || "unknown";
    const status = clean(wo.status) || "unknown";
    byStage[stage] = (byStage[stage] || 0) + 1;
    byStatus[status] = (byStatus[status] || 0) + 1;
    if (status === "needs_approval" || wo.approvalStatus === "pending") needsApproval += 1;
    if (asArray(wo.evidence).length) withEvidence += 1;
  }
  return {
    total: asArray(workOrders).length,
    needs_approval: needsApproval,
    with_evidence: withEvidence,
    by_stage: byStage,
    by_status: byStatus,
  };
}

/**
 * Advance an implementation work order to the next stage with an audit trail.
 * Stage moves into/through paid + production steps stay gated: the caller must
 * pass `approved: true` (i.e. a recorded Jonathan approval) or the move is
 * rejected. Pure — returns { ok, workOrder?, error? }.
 */
export function advanceImplementationStage(workOrder, toStage, options = {}) {
  const idx = IMPLEMENTATION_STAGES.indexOf(toStage);
  if (idx === -1) return { ok: false, error: `Unknown stage: ${toStage}` };
  const gatedStages = new Set([
    "proposal_sent_awaiting_payment",
    "paid_awaiting_implementation",
    "implementation_in_progress",
  ]);
  if (gatedStages.has(toStage) && !options.approved) {
    return { ok: false, error: `Stage ${toStage} requires recorded Jonathan approval before it can move.` };
  }
  const actor = options.actor || "Hermes";
  const role = stageForActor(toStage);
  const baseStatus = toStage === "completed" ? "completed" : workOrder.status;
  const advanced = updateWorkOrderStatus(
    { ...workOrder, implementation_stage: toStage, recommended_actor: role.actor, risk_level: role.risk, next_action: role.next },
    baseStatus,
    actor,
    `Implementation stage → ${toStage}`,
  );
  return { ok: true, workOrder: advanced };
}
