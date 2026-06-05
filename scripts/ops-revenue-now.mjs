// `/ops_revenue_now` command rail — the durable Telegram → execution entrypoint.
//
// This is the ONLY sanctioned path for "yes, start the revenue operation". The
// droplet Telegram bot MUST call this instead of free-texting "starting now". It:
//   1. creates a durable task + consumes a durable approval,
//   2. submits to the rail (queue receipt),
//   3. runs the SAME integrated operating cycle (runOperatingCycle) as the worker,
//   4. records execution evidence, and
//   5. returns the STATE-DERIVED Telegram message for every lifecycle stage.
//
// SAFETY: transports are DISABLED by default (MODE=dry → no sends/dials). It never
// claims outreach happened without a production transport receipt. Output includes
// the exact Telegram transcript + persisted record paths so status is inspectable.
//
// Env: CORRELATION_ID (telegram message id, required for idempotency),
//      APPROVED_BY (default Jonathan), SOURCE_TEXT, MODE (dry|live, default dry),
//      LEAD_SPREADSHEET_JSON (optional pre-parsed rows), HERMES_NOW,
//      HERMES_TASKS_DIR / HERMES_APPROVALS_DIR (default under data/, gitignored).

import { promises as fs } from "node:fs";

import { runOpsRevenueNow } from "../src/lib/execution/commandRail.mjs";
import { tasksDir } from "../src/lib/execution/taskLifecycle.mjs";
import { runOperatingCycle } from "../src/lib/hermesOrchestrator.mjs";
import { ingestSpreadsheetRows } from "../src/lib/leadSpreadsheetIngest.mjs";
import { buildLeadPipeline } from "../src/lib/leadIntent.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();
const mode = process.env.MODE === "live" ? "live" : "dry";

// Optional: convert a pre-parsed spreadsheet (rows JSON) into validated leads.
let leads = [];
if (process.env.LEAD_SPREADSHEET_JSON) {
  const rows = JSON.parse(await fs.readFile(process.env.LEAD_SPREADSHEET_JSON, "utf8"));
  const ingest = ingestSpreadsheetRows(rows, { now });
  const usable = ingest.leads.filter((l) => l.eligibility.icp_fit && l.eligibility.has_evidence);
  leads = buildLeadPipeline(usable, { now, minRecentIntent: 1 }).revenueLoopLeads;
}

// The worker: the REAL integrated operating cycle. Transports disabled in dry mode.
const runCycle = async ({ leads: leadArg, now: cycleNow, executionMode }) => {
  return runOperatingCycle({
    now: cycleNow,
    state: { leads: leadArg },
    executionMode: executionMode === "live" ? "live" : undefined, // dry → no live transport
    emailTransport: null,
    callTransport: null,
    persistSupabase: false,
  });
};

const result = await runOpsRevenueNow({
  correlation_id: process.env.CORRELATION_ID || `cid-${now}`,
  approved_by: process.env.APPROVED_BY || "Jonathan",
  source_message_id: process.env.SOURCE_MESSAGE_ID || "",
  source_text: process.env.SOURCE_TEXT || "yes, please start",
  leads,
  mode,
  now,
  runCycle,
}, {});

console.log(JSON.stringify({
  ok: result.ok,
  idempotent: Boolean(result.idempotent),
  mode,
  task_id: result.task?.task_id,
  final_state: result.task?.state,
  // The exact Telegram messages, in order — derived purely from durable state.
  telegram_transcript: result.transcript,
  final_status_text: result.final_status?.text,
  evidence: result.evidence || null,
  persisted: { tasks_dir: tasksDir({}), task_file: `${tasksDir({})}/${result.task?.task_id}.json` },
  note: "Transports disabled in dry mode. No emails sent, no calls dialed. Status is derived from durable task state + validated receipts only.",
}, null, 2));
process.exit(result.ok ? 0 : 1);
