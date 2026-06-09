import { NextResponse } from "next/server";

import { buildRetellReadinessReport } from "../../../../../lib/callRail/retellReadiness.mjs";

export const dynamic = "force-dynamic";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(request: Request): boolean {
  const expected = clean(process.env.HERMES_PHASE3_ACCEPTANCE_TOKEN || process.env.ADMIN_API_TOKEN);
  const provided = clean(request.headers.get("x-hermes-phase3-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  return Boolean(expected && timingSafeEqual(provided, expected));
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const report = await buildRetellReadinessReport();
  return NextResponse.json(report, { status: report.ok ? 200 : 424 });
}
