import { NextResponse } from "next/server";

import {
  authorizePhase7CAcceptanceRequest,
  buildPhase7CAcceptanceOptions,
  runRevenueQueueControlledAcceptance,
  sanitizePhase7CAcceptanceReport,
} from "../../../../../lib/revenueQueueControlledAcceptance.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = authorizePhase7CAcceptanceRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.status });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const ready = await buildPhase7CAcceptanceOptions(body);
  if (!ready.ok) {
    return NextResponse.json({ ok: false, error: ready.reason, env: ready.env }, { status: ready.status });
  }

  const report = await runRevenueQueueControlledAcceptance(ready.options);
  return NextResponse.json({
    ok: report.ok,
    accepted: report.accepted === true,
    report: sanitizePhase7CAcceptanceReport(report),
    env: ready.env,
  }, { status: report.accepted ? 200 : 424 });
}
