import { NextResponse } from "next/server";
import {
  CALL_OUTCOMES_PATH,
  DAILY_METRICS_PATH,
  JARVIS_CALL_PACKETS_PATH,
  LEADS_PATH,
  readJsonFile,
} from "@/lib/outreach/leadStore";
import type { CallOutcome } from "@/lib/outreach/callOutcomes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoredLead = {
  tier?: string;
  status?: string;
  scheduled_call_local?: string | null;
  created_at?: string;
};

export async function GET() {
  const leads = await readJsonFile<StoredLead[]>(LEADS_PATH, []);
  const existingMetrics = await readJsonFile<Record<string, unknown> | null>(DAILY_METRICS_PATH, null);
  const outcomes = await readJsonFile<CallOutcome[]>(CALL_OUTCOMES_PATH, []);
  const packets = await readJsonFile<unknown[]>(JARVIS_CALL_PACKETS_PATH, []);
  const today = new Date().toISOString().slice(0, 10);
  const importedToday = leads.filter((lead) => lead.created_at?.startsWith(today));
  const outcomesToday = outcomes.filter((outcome) => outcome.timestamp.startsWith(today));
  const metrics = {
    report_date: today,
    leads_imported_today: importedToday.length,
    a_tier_leads_ready_to_call: leads.filter((lead) => lead.tier === "A-tier").length,
    b_tier_leads_ready_to_email: leads.filter((lead) => lead.tier === "B-tier").length,
    leads_needing_enrichment: leads.filter((lead) => lead.tier === "C-tier").length,
    calls_scheduled: leads.filter((lead) => Boolean(lead.scheduled_call_local)).length,
    jarvis_call_packets_ready: packets.length || Number(existingMetrics?.jarvis_call_packets_ready || 0),
    calls_completed: outcomesToday.length || Number(existingMetrics?.calls_completed || 0),
    replies_received: Number(existingMetrics?.replies_received || 0),
    appointments_booked: outcomesToday.filter((outcome) => outcome.status === "booked_meeting").length || Number(existingMetrics?.appointments_booked || 0),
    call_outcomes: existingMetrics?.call_outcomes || {},
    failed_imports_or_errors: Number(existingMetrics?.failed_imports_or_errors || 0),
    agent_blockers: existingMetrics?.agent_blockers || [],
    next_best_actions: existingMetrics?.next_best_actions || [
      "Import or validate a lead list with POST /calls/import?dry_run=1.",
      "Jarvis calls only A-tier leads with valid scheduled_call_local values during business hours.",
      "Have Cowork enrich B-tier and C-tier leads with source evidence and personalization angles.",
      "Use Local Hermes only for QA/evidence review, not operations ownership.",
    ],
  };

  return NextResponse.json({
    status: "ok",
    ledgers: {
      leads: LEADS_PATH,
      daily_metrics: DAILY_METRICS_PATH,
      jarvis_call_packets: JARVIS_CALL_PACKETS_PATH,
      call_outcomes: CALL_OUTCOMES_PATH,
    },
    dashboard: metrics,
  });
}
