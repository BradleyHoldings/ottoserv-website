// Hermes service-delivery build-packet runner. Turns the durable implementation
// work orders in the revenue document into full, buildable service-delivery
// packets (integrations, client inputs, OttoServ steps, test plan, evidence gates,
// visual deliverable requirements). Triggers NOTHING — it produces build SPECS
// only; build/deploy/n8n-activation/client sends all stay approval-gated.
//
// A packet is "ready_for_build" only when its work order is approved/paid;
// otherwise it is "blocked_awaiting_approval" with the gate that must clear.
//
// Env overrides: REVENUE_LOOP_OUTPUT_DIR, HERMES_NOW. Use --full for whole packets.

import { loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";
import { buildPacketsForDocument } from "../src/lib/hermesBuildPacket.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();
const full = process.argv.includes("--full");

async function main() {
  const loaded = await loadRevenueDocument({});
  const document = loaded.document || {};
  const result = buildPacketsForDocument(document, { now });

  const compact = (p) => ({
    packet_id: p.packet_id,
    work_order_id: p.work_order_id,
    client: p.client,
    status: p.status,
    blocking_gate: p.blocking_gate || undefined,
    required_integrations: p.required_integrations,
    test_plan_steps: p.test_plan.length,
    visual_deliverables: p.visual_deliverable_requirements.length,
    approval_gates: p.approval_gates.map((g) => g.action || g),
  });

  console.log(JSON.stringify({
    mode: full ? "full" : "summary",
    generated_at: now,
    document_source: loaded.source?.kind || "none",
    count: result.count,
    ready_for_build: full ? result.ready_for_build : result.ready_for_build.map(compact),
    blocked_awaiting_approval: full ? result.blocked_awaiting_approval : result.blocked_awaiting_approval.map(compact),
    note: "Build SPECS only. No build/deploy/n8n activation/client send. Each money/production/client-facing step stays approval-gated.",
  }, null, 2));
}

main().catch((err) => { console.error(String(err?.stack || err)); process.exit(1); });
