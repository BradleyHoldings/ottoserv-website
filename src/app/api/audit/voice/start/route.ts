import { NextResponse } from "next/server";

// Mints a Retell web-call access_token for the marketing /process-audit page.
// Server-side proxy to platform.ottoserv.com/onboarding/voice/anonymous so the
// AUDIT_BRIDGE_KEY never ships to the browser.
//
// Anonymous onboarding session is created on the platform side — post-call
// transcript + ingest + finalize happens via the existing Retell webhook
// (POST /onboarding/retell/webhook) that's already in production.
// Falls back to the production platform URL when AUDIT_BRIDGE_URL is unset
// (Vercel prod hardcodes platform.ottoserv.com elsewhere — same pattern).
const DEFAULT_VOICE_URL = "https://platform.ottoserv.com/onboarding/voice/anonymous";

export async function POST() {
  const intakeUrl = process.env.AUDIT_BRIDGE_URL;
  const key = process.env.AUDIT_BRIDGE_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Voice intake not configured on server (missing AUDIT_BRIDGE_KEY)." },
      { status: 503 },
    );
  }

  // Derive /voice/anonymous from the intake URL so we don't need a separate env var.
  const url = intakeUrl
    ? intakeUrl.replace(/\/intake\/?$/, "/voice/anonymous")
    : DEFAULT_VOICE_URL;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-audit-key": key,
      },
      body: "{}",
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("voice/anonymous non-2xx:", res.status, body);
      return NextResponse.json(
        { error: body?.detail || "Could not start voice call." },
        { status: 502 },
      );
    }
    return NextResponse.json({
      access_token: body.access_token,
      call_id: body.call_id,
      session_id: body.session_id,
    });
  } catch (err) {
    console.error("voice/anonymous fetch failed:", err);
    return NextResponse.json(
      { error: "Voice service unreachable." },
      { status: 502 },
    );
  }
}
