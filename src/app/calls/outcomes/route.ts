import { NextRequest, NextResponse } from "next/server";
import { normalizeCallOutcome, type CallOutcome } from "@/lib/outreach/callOutcomes";
import {
  CALL_OUTCOMES_PATH,
  DAILY_METRICS_PATH,
  JARVIS_CALL_PACKETS_PATH,
  LEADS_PATH,
  buildDailyMetrics,
  buildJarvisCallPackets,
  readJsonFile,
  writeJsonFile,
} from "@/lib/outreach/leadStore";
import type { NormalizedLead } from "@/lib/outreach/leadImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const outcomes = await readJsonFile<CallOutcome[]>(CALL_OUTCOMES_PATH, []);
  return NextResponse.json({ status: "ok", outcomes });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const normalized = normalizeCallOutcome(body);
  if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });

  const leads = await readJsonFile<NormalizedLead[]>(LEADS_PATH, []);
  const outcomes = await readJsonFile<CallOutcome[]>(CALL_OUTCOMES_PATH, []);
  const nextOutcomes = [...outcomes, normalized.outcome!];
  const metrics = buildDailyMetrics(leads, undefined, nextOutcomes);

  await writeJsonFile(CALL_OUTCOMES_PATH, nextOutcomes);
  await writeJsonFile(JARVIS_CALL_PACKETS_PATH, buildJarvisCallPackets(leads, nextOutcomes));
  await writeJsonFile(DAILY_METRICS_PATH, metrics);

  return NextResponse.json({
    status: "logged",
    outcome: normalized.outcome,
    dashboard: metrics,
  });
}
