import { NextResponse } from "next/server";
import type { CallOutcome } from "@/lib/outreach/callOutcomes";
import type { NormalizedLead } from "@/lib/outreach/leadImport";
import {
  CALL_OUTCOMES_PATH,
  JARVIS_CALL_PACKETS_PATH,
  LEADS_PATH,
  buildJarvisCallPackets,
  readJsonFile,
  writeJsonFile,
} from "@/lib/outreach/leadStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const leads = await readJsonFile<NormalizedLead[]>(LEADS_PATH, []);
  const outcomes = await readJsonFile<CallOutcome[]>(CALL_OUTCOMES_PATH, []);
  const packets = buildJarvisCallPackets(leads, outcomes);
  await writeJsonFile(JARVIS_CALL_PACKETS_PATH, packets);

  return NextResponse.json({
    status: "ok",
    authority: "Jarvis owns call execution. Local Hermes may audit evidence only.",
    count: packets.length,
    packets,
  });
}
