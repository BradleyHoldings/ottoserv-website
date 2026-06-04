// Hermes call-rail runner. Reads current state, reports whether the call rail is
// idle/stale/healthy, and emits Retell/Morgan CALL PACKETS for the call-ready
// A-tier leads (proposals only). Triggers NO calls.
//
// Modes:
//   (default)    read-only: print rail status + call packets (proposals).
//   --simulate   in-memory only: prove the close-the-loop path by generating a
//                simulated outcome and re-detecting the rail (idle → healthy).
//                No real dial. No disk writes. Fixture/operating-cycle exercise.
//
// Env overrides (all optional):
//   REVENUE_LOOP_OUTPUT_DIR  revenue dir (default data/revenue-engine)
//   LEADS_PATH               leads ledger (default data/call-imports/leads.json)
//   LEAD_INTENT_OUTPUT_DIR   lead-intent dir (default data/lead-intent)
//   HERMES_NOW               ISO timestamp override

import { promises as fs } from "node:fs";
import path from "node:path";

import { loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";
import {
  detectCallRailState,
  callReadyATierLeads,
  buildCallPacket,
  simulateCallOutcome,
} from "../src/lib/hermesCallRail.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();
const simulate = process.argv.includes("--simulate");

async function readJsonSafe(file) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return null; }
}

async function main() {
  const cwd = process.cwd();
  const leadsPath = process.env.LEADS_PATH || path.join(cwd, "data", "call-imports", "leads.json");
  const liDir = process.env.LEAD_INTENT_OUTPUT_DIR || path.join(cwd, "data", "lead-intent");

  const loaded = await loadRevenueDocument({});
  const document = loaded.document || {};
  const leadsRaw = (await readJsonSafe(leadsPath)) || (await readJsonSafe(path.join(liDir, "leads.json"))) || [];
  const leads = Array.isArray(leadsRaw) ? leadsRaw : Array.isArray(leadsRaw.leads) ? leadsRaw.leads : [];

  const state = { leads, document, ledger: [], now };
  const rail = detectCallRailState(state, { now });
  const ready = callReadyATierLeads(leads);
  const packets = ready.slice(0, 5).map((lead) => buildCallPacket(lead, { now }));

  if (!simulate) {
    console.log(JSON.stringify({
      mode: "read_only",
      generated_at: now,
      document_source: loaded.source?.kind || "none",
      call_rail: rail,
      call_packets: packets,
      note: "Proposals only. No call placed. Dial each lead only after its approval is recorded; record outcomes via evidence intake.",
    }, null, 2));
    return;
  }

  // --simulate: prove the close-the-loop path in memory. No real call, no writes.
  if (!packets.length) {
    console.log(JSON.stringify({
      mode: "simulate",
      generated_at: now,
      before: rail,
      note: "No call-ready A-tier leads to simulate against. Refill the pipeline first (`npm run lead:intake`).",
    }, null, 2));
    return;
  }

  const packet = packets[0];
  const sim = simulateCallOutcome(packet, { disposition: "booked_demo" }, { now });
  // Re-detect with a synthetic recorded outcome injected (in-memory only).
  const afterDoc = {
    ...document,
    approvalExecutionQueue: {
      items: [
        ...(document?.approvalExecutionQueue?.items || []),
        {
          taskPacket: { task_id: packet.related_task_id, execution_rail: "morgan", assigned_agent: "Morgan", requested_action: `Approved call to ${packet.company}` },
          lifecycle: { execution_status: "evidence_submitted", execution_rail: "morgan", assigned_agent: "Morgan", last_status_update_at: now, submitted_evidence: [sim.submission.evidence] },
        },
      ],
    },
  };
  const after = detectCallRailState({ leads, document: afterDoc, ledger: [], now }, { now });

  console.log(JSON.stringify({
    mode: "simulate",
    generated_at: now,
    before: rail,
    call_packet: packet,
    simulated_outcome: sim,
    after,
    note: "SIMULATED ONLY — no real dial, no disk writes. In production an approved actor dials, then submits the real outcome via `npm run evidence:submit`.",
  }, null, 2));
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
