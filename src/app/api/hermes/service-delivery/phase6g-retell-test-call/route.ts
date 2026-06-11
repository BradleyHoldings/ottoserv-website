import { NextResponse } from "next/server";

import {
  authorizePhase6GAcceptanceRequest,
  buildPhase6GAcceptanceOptions,
  runRetellControlledTestCallAcceptance,
  sanitizePhase6GAcceptanceReport,
} from "../../../../../lib/retellControlledTestCallAcceptance.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = authorizePhase6GAcceptanceRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.status });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const ready = await buildPhase6GAcceptanceOptions(body);
  if (!ready.ok) {
    return NextResponse.json({ ok: false, error: ready.reason, env: ready.env }, { status: ready.status });
  }

  const report = await runRetellControlledTestCallAcceptance(ready.options);
  return NextResponse.json({
    ok: report.ok,
    accepted: report.ok && report.accepted === true,
    duplicate_prevented: report.duplicate_prevented === true,
    report: sanitizePhase6GAcceptanceReport(report),
    env: ready.env,
  }, { status: report.ok ? 200 : 424 });
}
