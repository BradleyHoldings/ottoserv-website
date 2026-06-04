// Hermes lead-research runner. Two jobs, both PURE-read + print (no outreach, no
// network, no writes):
//
//   (default)            Emit the actor-ready Cowork research packet to refill the
//                        intent pipeline (full per-ICP brief + research-results
//                        contract). This is the brief Cowork executes by hand.
//   --validate <file>    Validate a research-results.json against the contract and
//                        print ready_for_intake + per-row fixes BEFORE lead:intake.
//
// Env overrides: LEAD_INTENT_LOCATION, LEAD_INTENT_OUTPUT_DIR, LEAD_INTENT_MIN_RECENT,
//   HERMES_NOW.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { buildLeadIntentResearchTasks } from "../src/lib/leadIntentResearchTasks.mjs";
import { validateResearchResults, RESEARCH_RESULTS_CONTRACT } from "../src/lib/leadResearchContract.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();
const args = process.argv.slice(2);
const validateIdx = args.indexOf("--validate");

function readPipelineSummary() {
  const dir = process.env.LEAD_INTENT_OUTPUT_DIR || path.join(process.cwd(), "data", "lead-intent");
  try { return JSON.parse(readFileSync(path.join(dir, "pipeline.json"), "utf8")).summary || null; } catch { return null; }
}

if (validateIdx !== -1) {
  const file = args[validateIdx + 1];
  if (!file) {
    console.error("Usage: npm run lead:research -- --validate <path-to-research-results.json>");
    process.exit(2);
  }
  let parsed = null;
  let parseError = null;
  if (existsSync(file)) {
    try { parsed = JSON.parse(readFileSync(file, "utf8")); } catch (err) { parseError = err.message; }
  } else {
    parseError = `file not found: ${file}`;
  }
  const minAccepted = Number(process.env.LEAD_INTENT_MIN_RECENT || 1);
  const result = validateResearchResults(parsed, { now, parseError, minAccepted });
  console.log(JSON.stringify({
    mode: "validate",
    file,
    ready_for_intake: result.ready_for_intake,
    summary: result.summary,
    blocking: result.blocking,
    needs_verification_rows: result.needs_verification_rows,
    next_step: result.next_step,
  }, null, 2));
  process.exit(result.ready_for_intake ? 0 : 1);
}

// Default: emit the Cowork research packet.
const summary = readPipelineSummary();
const reason = summary
  ? `Recent-intent volume: ${summary.high_intent_30d ?? 0} (last_30_days); refill needed.`
  : "No pipeline yet — cold start: build the recent-intent lead pipeline.";

const packet = buildLeadIntentResearchTasks({
  now,
  location: process.env.LEAD_INTENT_LOCATION || "",
  reason,
});

console.log(JSON.stringify({
  mode: "research_packet",
  generated_at: now,
  reason,
  contract: RESEARCH_RESULTS_CONTRACT,
  research_tasks: packet.tasks,
  note: "Proposals only. No outreach. Cowork executes the public research, fills " +
    `${RESEARCH_RESULTS_CONTRACT.output_file}, validates with \`npm run lead:research -- --validate <file>\`, then runs \`${RESEARCH_RESULTS_CONTRACT.apply_command}\`.`,
}, null, 2));
