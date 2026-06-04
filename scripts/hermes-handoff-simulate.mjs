// Hermes paid-client handoff simulator CLI. From an interested lead (by --lead
// <id> from the lead ledger, or inline HANDOFF_LEAD_JSON) plus an optional call
// outcome, it generates the implementation work order + build packet + evidence
// requirements and surfaces the approval gate. SIMULATION ONLY by default.
//
// --apply persists the work order to the durable implementation store (internal
// JSON only — no proposal/payment/n8n/deploy/client send). The build packet stays
// blocked_awaiting_approval until the work order is approved/paid.
//
// Env: LEADS_PATH, HERMES_NOW, HANDOFF_LEAD_JSON, HANDOFF_OUTCOME_JSON,
//   REVENUE_LOOP_OUTPUT_DIR.

import { promises as fs } from "node:fs";
import path from "node:path";

import { simulatePaidHandoff } from "../src/lib/hermesHandoffSimulator.mjs";
import { promoteSeedsToWorkOrders } from "../src/lib/implementationWorkOrders.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();
const apply = process.argv.includes("--apply");

function argval(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : "";
}
async function readJsonSafe(file) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return null; }
}

async function main() {
  const cwd = process.cwd();
  const leadsPath = process.env.LEADS_PATH || path.join(cwd, "data", "call-imports", "leads.json");

  let lead = null;
  if (process.env.HANDOFF_LEAD_JSON) lead = JSON.parse(process.env.HANDOFF_LEAD_JSON);
  else {
    const leadId = argval("--lead");
    const leads = (Array.isArray(await readJsonSafe(leadsPath)) ? await readJsonSafe(leadsPath) : []) || [];
    lead = leadId ? leads.find((l) => String(l.lead_id) === leadId) : leads.find((l) => /interested|booked|qualified|demo/i.test(String(l.status || ""))) || leads[0];
  }
  if (!lead) { console.error("No lead found. Pass --lead <id> or HANDOFF_LEAD_JSON."); process.exit(1); }

  const outcome = process.env.HANDOFF_OUTCOME_JSON ? JSON.parse(process.env.HANDOFF_OUTCOME_JSON) : null;
  const result = simulatePaidHandoff({ lead, outcome }, { now });
  if (!result.ok) { console.error(result.error); process.exit(1); }

  let persisted = { applied: false };
  if (apply) {
    const res = await promoteSeedsToWorkOrders([result.handoff_seed], { now, dataDir: process.env.REVENUE_LOOP_OUTPUT_DIR });
    persisted = { applied: true, added: res.added ?? res.created ?? undefined, store: res.storePath || res.path || undefined };
  }

  console.log(JSON.stringify({
    generated_at: now,
    mode: apply ? "apply" : "simulate",
    lead: { lead_id: lead.lead_id, company: lead.company },
    work_order: {
      id: result.work_order.id,
      stage: result.work_order.implementation_stage,
      owner: result.work_order.recommended_actor,
      pain: result.work_order.pain,
      integration_needs: result.work_order.integration_needs,
      client_inputs_needed: result.work_order.client_inputs_needed,
      risks: result.work_order.risks,
      next_action: result.work_order.next_action,
    },
    build_packet: {
      packet_id: result.build_packet.packet_id,
      status: result.build_packet.status,
      scope: result.build_packet.scope,
      acceptance_criteria: result.build_packet.acceptance_criteria,
      required_integrations: result.build_packet.required_integrations,
      test_plan_steps: result.build_packet.test_plan.length,
      data_security_notes: result.build_packet.data_security_notes.length,
      rollback_plan_steps: result.build_packet.rollback_plan.length,
      visual_deliverable_requirements: result.build_packet.visual_deliverable_requirements.length,
    },
    evidence_requirements: result.evidence_requirements,
    approval_gate: result.approval_gate,
    persisted,
    note: "Simulation only. No proposal/payment/Stripe/n8n/deploy/client deliverable. Work order opens on the proposal/payment gate; build packet stays blocked until approved/paid.",
  }, null, 2));
}

main().catch((err) => { console.error(String(err?.stack || err)); process.exit(1); });
