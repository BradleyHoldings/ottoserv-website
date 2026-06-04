// Hermes client-success runner. Reads client signals + delivered work orders and
// emits expansion / churn-risk / optimization / improvement opportunities as
// approval-gated next actions. Triggers NOTHING — every client-facing move is a
// proposal requiring approval; internal optimizations stay deploy-gated.
//
// Env overrides: CLIENT_SUCCESS_PATH (default data/client-success/clients.json),
//   REVENUE_LOOP_OUTPUT_DIR, HERMES_NOW.

import { promises as fs } from "node:fs";
import path from "node:path";

import { loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";
import { detectClientOpportunities } from "../src/lib/hermesClientSuccess.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();

async function readJsonSafe(file) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return null; }
}

async function main() {
  const cwd = process.cwd();
  const clientsPath = process.env.CLIENT_SUCCESS_PATH || path.join(cwd, "data", "client-success", "clients.json");
  const raw = await readJsonSafe(clientsPath);
  const clients = Array.isArray(raw) ? raw : Array.isArray(raw?.clients) ? raw.clients : [];

  const loaded = await loadRevenueDocument({});
  const document = loaded.document || {};

  const result = detectClientOpportunities({ clients, document, now }, { now });

  console.log(JSON.stringify({
    mode: "client_success",
    generated_at: now,
    clients_seen: clients.length,
    document_source: loaded.source?.kind || "none",
    count: result.count,
    by_type: result.by_type,
    opportunities: result.opportunities,
    note: "Proposals only. Client-facing moves (check-ins, expansion offers) require Jonathan approval; internal optimizations stay deploy-gated.",
  }, null, 2));
}

main().catch((err) => { console.error(String(err?.stack || err)); process.exit(1); });
