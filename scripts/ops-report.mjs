import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const kind = process.argv[2] === "evening" ? "evening" : "morning";
const dataDir = path.join(root, "data", "call-imports");
const reportsDir = path.join(root, "reports", "ops");

function readJson(name, fallback) {
  const file = path.join(dataDir, name);
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, "utf8"));
}

const leads = readJson("leads.json", []);
const metrics = readJson("daily_metrics.json", {});
const today = new Date().toISOString().slice(0, 10);
const importedToday = leads.filter((lead) => String(lead.created_at || "").startsWith(today));
const aTier = leads.filter((lead) => lead.tier === "A-tier");
const bTier = leads.filter((lead) => lead.tier === "B-tier");
const cTier = leads.filter((lead) => lead.tier === "C-tier");

const lines = kind === "morning" ? morningReport() : eveningReport();
mkdirSync(reportsDir, { recursive: true });
const outPath = path.join(reportsDir, `${today}_${kind}.md`);
writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(outPath);

function morningReport() {
  return [
    `# OttoServ Morning Ops - ${today}`,
    "",
    "Jarvis is the operational lead. This report supports Jarvis; it does not replace Jarvis.",
    "",
    `- A-tier leads ready to call: ${aTier.length}`,
    `- B-tier leads ready to email: ${bTier.length}`,
    `- Leads needing enrichment: ${cTier.length}`,
    `- Agent blockers: ${formatList(metrics.agent_blockers || [])}`,
    `- Unfinished tasks: review /home/clawuser/agent_ledgers/tasks.json and repo docs/ops/tomorrow-work-packets.json`,
    "",
    "## Recommended Actions",
    "- Jarvis: call only approved A-tier leads during local business hours.",
    "- Cowork: enrich B/C-tier leads with source evidence and personalization angles.",
    "- Codex: fix import/dashboard/automation blockers and protect lead-data ledgers.",
    "- Gemini: deep research queued when credits are available.",
    "- Local Hermes: QA/evidence/context support only; no operations ownership.",
  ];
}

function eveningReport() {
  return [
    `# OttoServ Evening Ops - ${today}`,
    "",
    "Jarvis remains source of operational truth unless Jonathan explicitly overrides.",
    "",
    `- Leads imported today: ${importedToday.length || metrics.leads_imported_today || 0}`,
    `- Calls scheduled: ${metrics.calls_scheduled || 0}`,
    `- Calls completed: ${metrics.calls_completed || 0}`,
    `- Emails sent: ${metrics.emails_sent || 0}`,
    `- Replies received: ${metrics.replies_received || 0}`,
    `- Appointments booked: ${metrics.appointments_booked || 0}`,
    `- Failed imports/errors: ${metrics.failed_imports_or_errors || 0}`,
    "",
    "## Tomorrow Queue",
    "- Jarvis: approved A-tier calls only.",
    "- Cowork: lead enrichment and evidence capture.",
    "- Gemini: deep research for ICP/page/use-case gaps.",
    "- Codex: blocker cleanup, tests, schemas, dashboards, automation wiring.",
    "- Local Hermes: audit reports only if evidence is available.",
  ];
}

function formatList(items) {
  return Array.isArray(items) && items.length ? items.join("; ") : "none recorded";
}
