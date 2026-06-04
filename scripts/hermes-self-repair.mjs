// Hermes self-repair runner. Computes the autonomy scorecard from current state,
// turns each detected broken rail into an owned repair packet (reusing the engine
// builder), and prints the packets + routing. Triggers NOTHING — it generates
// repair work; it does not fix, deploy, or close anything.
//
// Env overrides: REVENUE_LOOP_OUTPUT_DIR, LEADS_PATH, LEAD_INTENT_OUTPUT_DIR,
//   CLIENT_SUCCESS_PATH, HERMES_NOW.

import { promises as fs } from "node:fs";
import path from "node:path";

import { loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";
import { computeScorecard } from "../src/lib/hermesAutonomyScorecard.mjs";
import { generateRepairPackets } from "../src/lib/hermesSelfRepair.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();

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

  const scorecard = computeScorecard({ document, leads, pipeline, ingestReport, now }, { now });
  const result = generateRepairPackets({ scorecard, document, now });

  console.log(JSON.stringify({
    mode: "self_repair",
    generated_at: now,
    autonomy_status: scorecard.autonomy_status,
    detected_blockers: scorecard.top_blockers.map((b) => ({ type: b.type, id: b.id, priority: b.priority })),
    summary: result.summary,
    new_repair_packets: result.new_packets.map((p) => ({
      id: p.id, what_failed: p.what_failed, owner: p.owner, category: p.category,
      verification_steps: p.verification_steps, required_evidence: p.required_evidence, status: p.status,
    })),
    note: "Repair packets only. Assigned to owners with verification steps + required evidence. Closing a packet requires verification evidence (logs/commit/route-check/test).",
  }, null, 2));
}

main().catch((err) => { console.error(String(err?.stack || err)); process.exit(1); });
