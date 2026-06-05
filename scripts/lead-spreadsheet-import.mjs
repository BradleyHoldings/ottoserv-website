// Hermes spreadsheet seed-lead importer. Reads pre-parsed spreadsheet rows (JSON
// array of header->value objects), validates + dedupes + classifies eligibility,
// selects a SMALL controlled pilot (email + call), runs the usable leads through
// the normal intake pipeline, and writes the result to the (gitignored) runtime
// data dir. It SENDS/DIALS NOTHING and commits NO real lead/contact data.
//
// The .xlsx must be converted to JSON rows first (no xlsx dep is bundled). Provide
// rows via LEAD_SPREADSHEET_JSON=/path/to/rows.json.
//
// Env: LEAD_SPREADSHEET_JSON (required), HERMES_NOW, EMAIL_CAP (default 1),
//      CALL_CAP (default 1), DNC_LIST/BLACKLIST (comma), WRITE_INTAKE=true to also
//      write data/call-imports/leads.json + data/lead-intent/pipeline.json.

import { promises as fs } from "node:fs";
import path from "node:path";

import { ingestSpreadsheetRows, selectControlledPilot, pilotToQueueEntry } from "../src/lib/leadSpreadsheetIngest.mjs";
import { buildLeadPipeline } from "../src/lib/leadIntent.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();
const rowsPath = process.env.LEAD_SPREADSHEET_JSON;

function list(env) {
  return String(env ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}
// Redact a contact for console output (never print full emails/phones).
function redact(s) {
  return String(s ?? "").replace(/[A-Za-z0-9._%+-]+@/g, "***@").replace(/\d(?=\d{2})/g, "*");
}

if (!rowsPath) {
  console.error("Set LEAD_SPREADSHEET_JSON=/path/to/rows.json (convert the .xlsx to JSON rows first).");
  process.exit(2);
}

const rows = JSON.parse(await fs.readFile(rowsPath, "utf8"));
const ingest = ingestSpreadsheetRows(rows, { now, dnc: list(process.env.DNC_LIST), blacklist: list(process.env.BLACKLIST) });
const pilot = selectControlledPilot(ingest, {
  emailCap: process.env.EMAIL_CAP ? Number(process.env.EMAIL_CAP) : 1,
  callCap: process.env.CALL_CAP ? Number(process.env.CALL_CAP) : 1,
});

let intake = null;
if (process.env.WRITE_INTAKE === "true") {
  // Only ICP-fit, evidenced leads enter intake. The pipeline tiers/dedupes them.
  const usable = ingest.leads.filter((l) => l.eligibility.icp_fit && l.eligibility.has_evidence);
  const pipeline = buildLeadPipeline(usable, { now, minRecentIntent: 1 });
  const cwd = process.cwd();
  const leadsFile = path.join(cwd, "data", "call-imports", "leads.json");
  const pipeFile = path.join(cwd, "data", "lead-intent", "pipeline.json");
  await fs.mkdir(path.dirname(leadsFile), { recursive: true });
  await fs.mkdir(path.dirname(pipeFile), { recursive: true });
  await fs.writeFile(leadsFile, `${JSON.stringify(pipeline.revenueLoopLeads, null, 2)}\n`, "utf8");
  await fs.writeFile(pipeFile, `${JSON.stringify(pipeline.pipeline ?? pipeline, null, 2)}\n`, "utf8");
  intake = { wrote: [leadsFile, pipeFile], revenue_leads: pipeline.revenueLoopLeads.length, by_tier: pipeline.summary };
}

let queued = null;
if (process.env.BUILD_QUEUE === "true") {
  // Enqueue the controlled pilot into the durable actor queue (gitignored
  // latest.json) so the email/call executors can act on it. NO sends/dials — the
  // packets are no_send/no_call; live execution needs a wired, credentialed transport.
  const cwd = process.cwd();
  const latestFile = path.join(cwd, "data", "revenue-engine", "latest.json");
  let doc = {};
  try { doc = JSON.parse(await fs.readFile(latestFile, "utf8")); } catch { doc = {}; }
  const existing = Array.isArray(doc?.approvalExecutionQueue?.items) ? doc.approvalExecutionQueue.items : [];
  const entries = [
    ...pilot.email_pilot.map((l) => pilotToQueueEntry(l, "email", { now })),
    ...pilot.call_pilot.map((l) => pilotToQueueEntry(l, "call", { now })),
  ];
  const existingIds = new Set(existing.map((i) => i.taskPacket?.task_id));
  const additions = entries.filter((e) => !existingIds.has(e.taskPacket.task_id));
  const items = [...existing, ...additions];
  doc = { ...doc, approvalExecutionQueue: { ...(doc.approvalExecutionQueue || {}), generated_at: now, count: items.length, items } };
  await fs.mkdir(path.dirname(latestFile), { recursive: true });
  await fs.writeFile(latestFile, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  queued = { wrote: latestFile, added: additions.length, total_queue: items.length };
}

console.log(JSON.stringify({
  generated_at: now,
  ingest_summary: ingest.summary,
  queued,
  pilot_summary: pilot.summary,
  email_pilot: pilot.email_pilot.map((l) => ({ company: l.business_name, to: redact(l.email), source: l.source_url, angle: l.likely_ottoserv_angle })),
  call_pilot: pilot.call_pilot.map((l) => ({ company: l.business_name, to: redact(l.phone), source: l.source_url })),
  enrichment_queued: pilot.enrichment_queue.length,
  intake,
  note: "No sends/dials. Contact paths redacted. Real lead data written only to gitignored data/ when WRITE_INTAKE=true.",
}, null, 2));
