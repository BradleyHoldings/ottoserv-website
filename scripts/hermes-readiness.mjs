// Hermes readiness report CLI. Rolls up acquisition, delivery, and client-success
// readiness, the durable-persistence gap, true blockers, and next actions — from
// the current durable state. READ-ONLY: triggers nothing.
//
// Env: REVENUE_LOOP_OUTPUT_DIR, LEADS_PATH, LEAD_INTENT_OUTPUT_DIR,
//   CLIENT_SUCCESS_PATH, HERMES_NOW.

import { promises as fs } from "node:fs";
import path from "node:path";

import { loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";
import { computeReadiness } from "../src/lib/hermesReadiness.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();

async function readJsonSafe(file) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return null; }
}

async function main() {
  const cwd = process.cwd();
  const leadsPath = process.env.LEADS_PATH || path.join(cwd, "data", "call-imports", "leads.json");
  const liDir = process.env.LEAD_INTENT_OUTPUT_DIR || path.join(cwd, "data", "lead-intent");
  const clientsPath = process.env.CLIENT_SUCCESS_PATH || path.join(cwd, "data", "client-success", "clients.json");

  const loaded = await loadRevenueDocument({});
  const document = loaded.document || {};
  const leads = (Array.isArray(await readJsonSafe(leadsPath)) ? await readJsonSafe(leadsPath) : []) || [];
  const pipeline = await readJsonSafe(path.join(liDir, "pipeline.json"));
  const ingestReport = await readJsonSafe(path.join(liDir, "ingest-report.json"));
  const clientsRaw = await readJsonSafe(clientsPath);
  const clients = Array.isArray(clientsRaw) ? clientsRaw : Array.isArray(clientsRaw?.clients) ? clientsRaw.clients : [];

  const report = computeReadiness({ document, leads, pipeline, ingestReport, clients, now }, { now });
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => { console.error(String(err?.stack || err)); process.exit(1); });
