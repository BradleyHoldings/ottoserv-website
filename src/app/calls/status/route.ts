import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data", "call-imports");
const LEADS_PATH = path.join(DATA_DIR, "leads.json");
const DAILY_METRICS_PATH = path.join(DATA_DIR, "daily_metrics.json");

type StoredLead = {
  tier?: string;
  status?: string;
  scheduled_call_local?: string | null;
  created_at?: string;
};

export async function GET() {
  const leads = await readJsonFile<StoredLead[]>(LEADS_PATH, []);
  const existingMetrics = await readJsonFile<Record<string, unknown> | null>(DAILY_METRICS_PATH, null);
  const today = new Date().toISOString().slice(0, 10);
  const importedToday = leads.filter((lead) => lead.created_at?.startsWith(today));
  const metrics = {
    report_date: today,
    leads_imported_today: importedToday.length,
    a_tier_leads_ready_to_call: leads.filter((lead) => lead.tier === "A-tier").length,
    b_tier_leads_ready_to_email: leads.filter((lead) => lead.tier === "B-tier").length,
    leads_needing_enrichment: leads.filter((lead) => lead.tier === "C-tier").length,
    calls_scheduled: leads.filter((lead) => Boolean(lead.scheduled_call_local)).length,
    calls_completed: Number(existingMetrics?.calls_completed || 0),
    replies_received: Number(existingMetrics?.replies_received || 0),
    appointments_booked: Number(existingMetrics?.appointments_booked || 0),
    failed_imports_or_errors: Number(existingMetrics?.failed_imports_or_errors || 0),
    agent_blockers: existingMetrics?.agent_blockers || [],
    next_best_actions: existingMetrics?.next_best_actions || [
      "Import or validate a lead list with POST /calls/import?dry_run=1.",
      "Have Hermes approve A-tier leads before Jarvis uses call credits.",
      "Have Cowork enrich C-tier leads with source evidence and personalization angles.",
    ],
  };

  return NextResponse.json({
    status: "ok",
    ledgers: {
      leads: LEADS_PATH,
      daily_metrics: DAILY_METRICS_PATH,
    },
    dashboard: metrics,
  });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}
