// Hermes approval-to-action throughput runner. Reads current state, runs the
// next-action selector, and materializes proposed actions into actor-ready
// execution packets where standing policy / recorded approvals / standing grants
// allow. Triggers NOTHING — high-risk/uncovered actions are returned GATED.
//
// Env overrides: REVENUE_LOOP_OUTPUT_DIR, LEADS_PATH, LEAD_INTENT_OUTPUT_DIR,
//   HERMES_NOW. Use --full to print the materialized packets (default prints a
//   compact summary).

import { promises as fs } from "node:fs";
import path from "node:path";

import { loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";
import { materializeActorPackets, DEFAULT_STANDING_OUTBOUND_POLICY } from "../src/lib/hermesApprovalThroughput.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();
const full = process.argv.includes("--full");

async function readJsonSafe(file) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return null; }
}

async function main() {
  const cwd = process.cwd();
  const leadsPath = process.env.LEADS_PATH || path.join(cwd, "data", "call-imports", "leads.json");
  const liDir = process.env.LEAD_INTENT_OUTPUT_DIR || path.join(cwd, "data", "lead-intent");

  const loaded = await loadRevenueDocument({});
  const document = loaded.document || {};
  const leadsRaw = (await readJsonSafe(leadsPath)) || [];
  const leads = Array.isArray(leadsRaw) ? leadsRaw : [];
  const pipeline = await readJsonSafe(path.join(liDir, "pipeline.json"));
  const ingestReport = await readJsonSafe(path.join(liDir, "ingest-report.json"));

  const selected = selectNextActions({ leads, document, pipeline, ingestReport, now }, { now });
  const result = materializeActorPackets(selected.actions, {
    document,
    now,
    standingOutboundPolicy: DEFAULT_STANDING_OUTBOUND_POLICY,
  });

  const out = {
    mode: full ? "full" : "summary",
    generated_at: now,
    document_source: loaded.source?.kind || "none",
    proposed_actions: selected.actions.length,
    throughput: result.summary,
    outbound_counters: result.outbound_counters,
    materialized: full
      ? result.materialized
      : result.materialized.map((m) => ({ action_id: m.action_id, task_id: m.task_id, via: m.via, agent: m.taskPacket.assigned_agent })),
    gated: full
      ? result.gated
      : result.gated.map((g) => ({ action_id: g.action_id, risk: g.risk, action_type: g.approval_packet.action_type, reason: g.reason })),
    blocked: result.blocked,
    already_enqueued: result.already_enqueued,
    note: "No outreach/calls/payments/deploys. NORMAL B-tier email under cap and NORMAL approved-policy calls materialize as send/call-ready packets under standing policy (no per-item approval); they still obey caps, DNC/blacklist, cooldowns, business hours, ICP/offer, and the outbound evidence contract. Exceptional/over-cap/off-segment/uncovered actions stay GATED; missing-prerequisite actions are BLOCKED, never sent.",
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
