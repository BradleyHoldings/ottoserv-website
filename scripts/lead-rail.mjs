// Phase 1 lead rail CLI — runs the ONE authoritative intake + enrichment rail
// against a fixture or a real source, in dry/internal mode, with NO external
// transport (no email, calls, DMs, social, payments). Safe to run repeatedly:
// deterministic ids + dedupe + upsert make it idempotent and restart-safe.
//
// Usage:
//   node scripts/lead-rail.mjs --fixture
//   node scripts/lead-rail.mjs --source data/path/to/rows.json [--mode internal]
//   npm run lead:rail -- --fixture
//
// Source must be a JSON array of row objects (header→value). Convert CSV/XLSX to
// JSON rows first. Writes a write-through cache + quarantine artifact to the
// gitignored data/lead-rail/ dir. Persists to Supabase hermes_pipeline when
// SUPABASE_URL + SUPABASE_SERVICE_KEY are configured; otherwise reports
// persistence_pending (it never pretends success).

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { runLeadIntakeEnrichment } from "../src/lib/leadRail/pipeline.mjs";
import { describePipelineConfig } from "../src/lib/leadRail/store.mjs";

const args = process.argv.slice(2);
function flag(name) { return args.includes(`--${name}`); }
function opt(name, fallback = "") {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const cwd = process.cwd();
const useFixture = flag("fixture");
const sourcePath = useFixture
  ? path.join(cwd, "data", "lead-rail", "fixtures", "sample-source.json")
  : opt("source");
const mode = opt("mode", "dry") === "internal" ? "internal" : "dry";
const now = process.env.LEAD_RAIL_NOW || new Date().toISOString();

if (!sourcePath) {
  console.error("Provide --fixture or --source <path-to-rows.json>. No transport is ever triggered.");
  process.exit(2);
}
if (!existsSync(sourcePath)) {
  console.error(`Source not found: ${sourcePath}`);
  process.exit(2);
}

let rows;
try {
  const parsed = JSON.parse(readFileSync(sourcePath, "utf8"));
  rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.rows) ? parsed.rows : Array.isArray(parsed.leads) ? parsed.leads : []);
} catch (err) {
  console.error(`Source is not valid JSON: ${err.message}`);
  process.exit(2);
}

const result = await runLeadIntakeEnrichment(
  { rows, source: { source_type: useFixture ? "fixture" : "file", source_url: sourcePath, label: path.basename(sourcePath) }, mode, now },
  {},
);

// Redact contact data from console output.
function redact(s) {
  return String(s ?? "").replace(/[A-Za-z0-9._%+-]+@/g, "***@").replace(/\d(?=\d{2})/g, "*");
}

console.log(JSON.stringify({
  operation: "lead_intake_enrichment",
  correlation_id: result.correlation_id,
  file_hash: result.file_hash,
  task_id: result.task?.task_id,
  task_state: result.task?.state,
  final_status: result.final_status,
  reason: result.reason,
  idempotent: result.idempotent || false,
  mode,
  no_transport: true,
  summary: result.summary,
  receipts: result.receipts,
  supabase: describePipelineConfig(),
  eligible_sample: (result.upserts || [])
    .filter((l) => l.eligibility === "email_eligible" || l.eligibility === "call_eligible")
    .slice(0, 5)
    .map((l) => ({ lead_id: l.lead_id, company: l.company_name, eligibility: l.eligibility, contact: redact(l.email || l.normalized_phone), source: l.source_url })),
  enrichment_queued_sample: (result.enrichment_tasks || [])
    .slice(0, 5)
    .map((t) => ({ task_id: t.task_id, lead_id: t.lead_id, status: t.status })),
  artifacts: result.local,
}, null, 2));
