import { NextResponse } from "next/server";

import { runControlledRealServiceDeliveryAcceptance } from "../../../../../lib/serviceDeliveryControlledAcceptance.mjs";
import {
  authorizePhase6DAcceptanceRequest,
  buildPhase6DAcceptanceOptions,
  sanitizePhase6DAcceptanceReport,
} from "../../../../../lib/serviceDeliveryPhase6DAcceptanceRoute.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = authorizePhase6DAcceptanceRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.status });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const ready = await buildPhase6DAcceptanceOptions(body);
  if (!ready.ok) {
    return NextResponse.json({ ok: false, error: ready.reason, env: ready.env }, { status: ready.status });
  }

  const report = await runControlledRealServiceDeliveryAcceptance(ready.options);
  return NextResponse.json({
    ok: report.ok,
    accepted: report.ok && !report.skipped,
    report: sanitizePhase6DAcceptanceReport(report),
    env: ready.env,
  }, { status: report.ok && !report.skipped ? 200 : 424 });
}
