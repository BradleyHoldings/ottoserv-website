import { promises as fs } from "fs";
import path from "path";
import { buildJarvisCallPacket } from "./callPackets";
import type { CallOutcome } from "./callOutcomes";
import type { ImportResult, NormalizedLead } from "./leadImport";

export const DATA_DIR = process.env.OTTO_CALL_IMPORT_DATA_DIR || path.join(process.cwd(), "data", "call-imports");
export const LEADS_PATH = path.join(DATA_DIR, "leads.json");
export const OUTREACH_QUEUE_PATH = path.join(DATA_DIR, "outreach_queue.json");
export const DAILY_METRICS_PATH = path.join(DATA_DIR, "daily_metrics.json");
export const FORM_SUBMISSIONS_PATH = path.join(DATA_DIR, "form_submissions.json");
export const CALL_OUTCOMES_PATH = path.join(DATA_DIR, "call_outcomes.json");
export const JARVIS_CALL_PACKETS_PATH = path.join(DATA_DIR, "jarvis_call_packets.json");

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function buildOutreachQueue(leads: NormalizedLead[]) {
  return leads.map((lead) => ({
    lead_id: lead.lead_id,
    company: lead.company,
    tier: lead.tier,
    score: lead.score,
    owner: lead.suggested_owner,
    status: lead.status,
    next_channel: lead.tier === "A-tier" ? "call" : lead.tier === "B-tier" ? "email" : "enrich",
    scheduled_call_local: lead.scheduled_call_local,
    phone: lead.normalized_phone,
    email: lead.email,
    website_url: lead.website_url,
    evidence_required: "import source, fit reason, outreach attempt log, and any reply or appointment proof",
  }));
}

export function buildJarvisCallPackets(leads: NormalizedLead[], outcomes: CallOutcome[]) {
  return leads
    .filter((lead) => lead.tier === "A-tier" && lead.status === "ready_to_call" && lead.normalized_phone)
    .map((lead) => buildJarvisCallPacket(lead, outcomes));
}

export function buildDailyMetrics(
  leads: NormalizedLead[],
  lastImport?: Pick<ImportResult, "rejected_count" | "duplicate_count">,
  outcomes: CallOutcome[] = [],
) {
  const today = new Date().toISOString().slice(0, 10);
  const importedToday = leads.filter((lead) => lead.created_at.startsWith(today));
  const outcomesToday = outcomes.filter((outcome) => outcome.timestamp.startsWith(today));
  return {
    report_date: today,
    leads_imported_today: importedToday.length,
    a_tier_ready_to_call: leads.filter((lead) => lead.tier === "A-tier").length,
    b_tier_ready_to_email: leads.filter((lead) => lead.tier === "B-tier").length,
    leads_needing_enrichment: leads.filter((lead) => lead.tier === "C-tier").length,
    rejected_owned_by_codex: leads.filter((lead) => lead.status === "rejected" || lead.suggested_owner === "codex").length,
    jarvis_call_packets_ready: buildJarvisCallPackets(leads, outcomes).length,
    calls_scheduled: leads.filter((lead) => Boolean(lead.scheduled_call_local)).length,
    calls_completed: outcomesToday.length,
    emails_sent: 0,
    replies_received: 0,
    appointments_booked: outcomesToday.filter((outcome) => outcome.status === "booked_meeting").length,
    call_outcomes: CALL_OUTCOME_STATUS_SUMMARY(outcomesToday),
    failed_imports_or_errors: lastImport?.rejected_count || 0,
    duplicates_skipped: lastImport?.duplicate_count || 0,
    agent_blockers: [],
    next_best_actions: [
      "Jarvis calls only A-tier leads with valid scheduled_call_local values during business hours.",
      "Cowork enriches B-tier and C-tier leads with source evidence and personalization angles.",
      "Codex reviews rejected/bad-fit leads and import errors for cleanup.",
      "Local Hermes may audit evidence only; it does not approve or own operations.",
    ],
  };
}

function CALL_OUTCOME_STATUS_SUMMARY(outcomes: CallOutcome[]) {
  return outcomes.reduce<Record<string, number>>((summary, outcome) => {
    summary[outcome.status] = (summary[outcome.status] || 0) + 1;
    return summary;
  }, {});
}
