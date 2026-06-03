// ─── Hermes service-delivery build packets (Autonomy v2, milestone 6) ─────────
//
// THE GAP THIS FILLS
// The next-action selector emits a build_packet STUB for an approved work order,
// but nothing produces the full, buildable spec Codex needs: the automation
// opportunity, the integrations it touches, the client inputs required, the
// OttoServ build steps, the test plan, the evidence gates, and the client-ready
// visual deliverable. Without it, "service delivery" stalls at a hand-wave.
//
// This module is that builder. PURE + deterministic. It turns a durable
// implementation work order (implementationWorkOrders.mjs shape) into a structured
// build packet, and only marks it ready_for_build when the work order is approved/
// paid — otherwise it returns a packet blocked on the exact approval gate. It
// reuses the work order's own gated_actions/required_evidence; no parallel store.
//
// SAFETY: produces a build SPEC only. It does not build, deploy, activate n8n,
// send anything to a client, or create a client-facing deliverable. Every
// money/production/client-facing step is carried as an approval gate.

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function lower(value) {
  return clean(value).toLowerCase();
}

// Map automation-opportunity / leak text to the integrations a build would touch.
const INTEGRATION_RULES = [
  { re: /missed call|after.?hours|phone|answer|receptionist|voicemail|call/i, integration: "Telephony / AI receptionist (Retell or Twilio)" },
  { re: /crm|pipeline|lead|contact|hubspot|salesforce|gohighlevel/i, integration: "CRM sync (lead/contact pipeline)" },
  { re: /schedul|dispatch|calendar|booking|appointment/i, integration: "Calendar / scheduling" },
  { re: /email|follow.?up|reply|nurtur/i, integration: "Email rail (approved templates)" },
  { re: /text|sms|message/i, integration: "SMS rail" },
  { re: /invoice|payment|billing|stripe|quote/i, integration: "Payments (Stripe) — approval-gated" },
  { re: /workflow|automation|n8n|zapier|integrat/i, integration: "n8n workflow (activation approval-gated)" },
  { re: /review|reputation|google/i, integration: "Reviews / reputation" },
];

function inferIntegrations(texts) {
  const blob = texts.map(clean).join(" \n ");
  const found = [];
  for (const { re, integration } of INTEGRATION_RULES) {
    if (re.test(blob) && !found.includes(integration)) found.push(integration);
  }
  return found.length ? found : ["Scoping required — no integration keywords detected; confirm with client."];
}

const STANDARD_CLIENT_INPUTS = [
  "Business hours, service area, and call-handling rules.",
  "Top FAQs / scripts and the desired booking/qualification flow.",
  "Access to the phone number/forwarding and CRM (provisioned by Jonathan; credentials never handled by Hermes).",
  "Approved messaging/tone and any compliance constraints.",
];

const STANDARD_BUILD_STEPS = [
  "Confirm scope + integrations against the approved pilot.",
  "Build the automation in a sandbox (no production activation).",
  "Wire integrations with test credentials; verify with route checks.",
  "Run the test plan; capture evidence (commit, build/test output, route check).",
  "Prepare the client-ready visual deliverable for Jonathan approval before any send.",
];

function testPlanFor(integrations) {
  const plan = [
    "Add/extend node:test coverage for each automation branch.",
    "Run build + route check; attach output as evidence.",
  ];
  if (integrations.some((i) => /telephony|receptionist/i.test(i))) plan.push("Simulated call flow test (no live dialing): greeting → qualify → book/route.");
  if (integrations.some((i) => /crm/i.test(i))) plan.push("CRM write/read round-trip on a test record (no real contacts).");
  if (integrations.some((i) => /calendar|scheduling/i.test(i))) plan.push("Booking creates/updates a test calendar event and is idempotent.");
  if (integrations.some((i) => /n8n|workflow/i.test(i))) plan.push("Workflow dry-run with a mock payload; production activation stays approval-gated.");
  plan.push("Pilot metric baseline vs target (response speed, completed follow-ups, recovered opportunities).");
  return plan;
}

const VISUAL_DELIVERABLE_REQUIREMENTS = [
  "Before/after of the operational gap (e.g. missed-call rate → recovered).",
  "A plain-English explanation of what was automated and why it matters.",
  "Pilot metrics vs baseline in a simple chart.",
  "Clear next-step/upsell framing — drafted for Jonathan approval, not sent.",
];

const READY_STAGES = new Set(["paid_awaiting_implementation", "implementation_in_progress"]);

/**
 * Build a full service-delivery packet from one implementation work order. Pure.
 * status is "ready_for_build" only when the work order is approved/paid; otherwise
 * "blocked_awaiting_approval" with the gate that must clear first.
 */
export function buildServiceDeliveryPacket(workOrder = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const id = clean(workOrder.id) || "wo";
  const stage = clean(workOrder.implementation_stage) || clean(workOrder.stage);
  const approved = lower(workOrder.approvalStatus) === "approved" || READY_STAGES.has(stage);

  const opportunities = asArray(workOrder.automation_opportunities);
  const oppText = opportunities.length ? opportunities : [clean(workOrder.pilot_recommendation) || clean(workOrder.main_leak) || "front-office automation"];
  const integrations = inferIntegrations([...oppText, clean(workOrder.main_leak), clean(workOrder.pilot_recommendation)]);

  const requiredEvidence = asArray(workOrder.required_evidence).length
    ? asArray(workOrder.required_evidence)
    : ["Codex commit hash + build/test/route-check output per automation."];
  const approvalGates = asArray(workOrder.gated_actions).length
    ? asArray(workOrder.gated_actions)
    : [{ action: "production_automation_change", approval_required: true }, { action: "final_client_deliverable", approval_required: true }];

  return {
    packet_id: `build-${id}`,
    work_order_id: id,
    client: clean(workOrder.client) || clean(workOrder.company), // business name only; no PII
    engagement_type: clean(workOrder.engagement_type) || "automation_implementation",
    status: approved ? "ready_for_build" : "blocked_awaiting_approval",
    blocking_gate: approved ? "" : "Work order is not approved/paid — pricing/proposal/payment must clear first (Jonathan).",
    automation_opportunity: oppText,
    required_integrations: integrations,
    client_inputs_needed: STANDARD_CLIENT_INPUTS,
    ottoserv_steps: STANDARD_BUILD_STEPS,
    test_plan: testPlanFor(integrations),
    required_evidence: requiredEvidence,
    approval_gates: approvalGates,
    visual_deliverable_requirements: VISUAL_DELIVERABLE_REQUIREMENTS,
    forbidden_actions: [
      "Do NOT activate production n8n / deploy without recorded approval.",
      "Do NOT send any client-facing deliverable, proposal, or payment link without approval.",
      "Do NOT handle client credentials directly — Jonathan provisions access.",
    ],
    assigned_actor: "Codex",
    created_at: now,
  };
}

/**
 * Build packets for every build-ready work order in a revenue document, and list
 * the ones still blocked on approval. Pure.
 */
export function buildPacketsForDocument(document = {}, options = {}) {
  const orders = asArray(document?.implementationWorkOrders?.orders);
  const packets = orders.map((wo) => buildServiceDeliveryPacket(wo, options));
  return {
    generated_at: options.now || new Date().toISOString(),
    ready_for_build: packets.filter((p) => p.status === "ready_for_build"),
    blocked_awaiting_approval: packets.filter((p) => p.status !== "ready_for_build"),
    count: packets.length,
  };
}
