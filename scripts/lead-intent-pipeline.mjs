// Lead-intent intake CLI — converts researched/enriched leads into the daily
// lead pipeline and feeds the revenue loop. Safe to run unattended: it only
// reads/normalizes/scores researched leads and writes local JSON. It triggers NO
// outreach, calls, DMs, payments, n8n, or deploys.
//
// Flow:
//   1. Read enriched research results (JSON array) from LEAD_INTENT_INPUT
//      (default data/lead-intent/research-results.json). Missing/empty → treated
//      as "no recent research yet".
//   2. Build the pipeline (score → tier → dedupe → queues + repair packet).
//   3. Merge accepted leads into data/call-imports/leads.json (deduped) so the
//      revenue loop sees them.
//   4. Write data/lead-intent/pipeline.json (full enriched pipeline + queues).
//   5. If recent-intent volume is low, write Cowork research task packets so
//      Hermes can route browser research to refill the pipeline.
//
// Env overrides: LEAD_INTENT_INPUT, LEAD_INTENT_OUTPUT_DIR, LEADS_PATH,
//   LEAD_INTENT_MIN_RECENT, LEAD_INTENT_LOCATION.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { buildLeadPipeline } from "../src/lib/leadIntent.mjs";
import { buildLeadIntentResearchTasks } from "../src/lib/leadIntentResearchTasks.mjs";
import { coerceResearchRows, ingestResearchResults } from "../src/lib/leadIntentIngest.mjs";

const now = process.env.LEAD_INTENT_NOW || new Date().toISOString();
const cwd = process.cwd();
const inputPath = process.env.LEAD_INTENT_INPUT || path.join(cwd, "data", "lead-intent", "research-results.json");
const outputDir = process.env.LEAD_INTENT_OUTPUT_DIR || path.join(cwd, "data", "lead-intent");
const leadsPath = process.env.LEADS_PATH || path.join(cwd, "data", "call-imports", "leads.json");
const minRecentIntent = Number(process.env.LEAD_INTENT_MIN_RECENT || 3);

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return fallback; }
}

// Read the research file, capturing a parse error instead of silently dropping
// it, so Cowork/Hermes get feedback when a malformed file is submitted.
let rawInput = [];
let parseError = null;
if (existsSync(inputPath)) {
  try {
    rawInput = JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (err) {
    parseError = `research-results.json is not valid JSON: ${err.message}`;
    rawInput = [];
  }
}

// Coerce the realistic shapes Cowork might submit (array, { leads: [...] },
// single object, ...) into the canonical row array the pipeline expects, and
// emit a machine-readable ingest report so the hand-off is reliable.
const { rows: rawLeads, shape: inputShape } = coerceResearchRows(rawInput);
const ingestReport = ingestResearchResults(rawInput, { now, parseError });

const pipeline = buildLeadPipeline(rawLeads, { now, minRecentIntent, location: process.env.LEAD_INTENT_LOCATION });

mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, "pipeline.json"), `${JSON.stringify(pipeline, null, 2)}\n`, "utf8");
writeFileSync(path.join(outputDir, "ingest-report.json"), `${JSON.stringify(ingestReport, null, 2)}\n`, "utf8");

// Merge accepted leads into the revenue loop's input (deduped). This is the only
// write outside the lead-intent dir; it is data-only and feeds the loop.
const existingLeads = Array.isArray(readJson(leadsPath, [])) ? readJson(leadsPath, []) : [];
const dedupeKey = (l) => [l.normalized_phone, (l.email || "").toLowerCase(), (l.website_url || "").toLowerCase(), (l.company || "").toLowerCase()].filter(Boolean).join("|");
const seen = new Set(existingLeads.map(dedupeKey));
const merged = [...existingLeads];
let added = 0;
for (const lead of pipeline.revenueLoopLeads) {
  const key = dedupeKey(lead);
  if (key && seen.has(key)) continue;
  if (key) seen.add(key);
  merged.push(lead);
  added += 1;
}
mkdirSync(path.dirname(leadsPath), { recursive: true });
writeFileSync(leadsPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

// Low recent-intent → dispatch Cowork research tasks to refill the pipeline.
let research = { count: 0 };
if (pipeline.summary.low_recent_intent) {
  research = buildLeadIntentResearchTasks({
    now,
    location: process.env.LEAD_INTENT_LOCATION,
    reason: `Only ${pipeline.summary.high_intent_30d} high-intent (last_30_days) lead(s); need >= ${minRecentIntent}.`,
  });
  writeFileSync(path.join(outputDir, "cowork-research-tasks.json"), `${JSON.stringify(research, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({
  input: existsSync(inputPath) ? inputPath : "(none — no research yet)",
  input_shape: inputShape,
  parse_error: parseError,
  ingest: ingestReport.summary,
  summary: pipeline.summary,
  leads_added_to_revenue_loop: added,
  leads_total: merged.length,
  repair_packet: pipeline.repairPacket ? pipeline.repairPacket.category : null,
  cowork_research_tasks: research.count,
  pipeline_output: path.join(outputDir, "pipeline.json"),
  ingest_report_output: path.join(outputDir, "ingest-report.json"),
  leads_output: leadsPath,
}, null, 2));
