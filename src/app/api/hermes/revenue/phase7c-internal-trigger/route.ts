import { NextResponse } from "next/server";

import {
  authorizePhase7CInternalTriggerRequest,
  buildPhase7CAcceptanceOptions,
  PHASE7C_CONTROLLED_RUN_ID,
  runRevenueQueueControlledAcceptance,
  sanitizePhase7CAcceptanceReport,
} from "../../../../../lib/revenueQueueControlledAcceptance.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function runTrigger(request: Request) {
  const auth = authorizePhase7CInternalTriggerRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.status });
  }

  const ready = await buildPhase7CAcceptanceOptions({ run_id: PHASE7C_CONTROLLED_RUN_ID });
  if (!ready.ok) {
    return NextResponse.json({ ok: false, error: ready.reason, env: ready.env }, { status: ready.status });
  }

  const report = await runRevenueQueueControlledAcceptance(ready.options);
  return NextResponse.json({
    ok: report.ok,
    accepted: report.accepted === true,
    trigger: "phase7c_internal_super_admin_session",
    report: sanitizePhase7CAcceptanceReport(report),
    env: ready.env,
  }, { status: report.accepted ? 200 : 424 });
}

export async function POST(request: Request) {
  return runTrigger(request);
}

export async function GET(request: Request) {
  return runTrigger(request);
}
