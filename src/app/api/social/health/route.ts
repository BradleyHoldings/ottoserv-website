import { NextResponse } from "next/server";
// @ts-expect-error -- .mjs engine binding
import { getSocialOpsHealthPanel } from "@/lib/socialEngineServer.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/social/health — social-ops health/status panel (Task 9).
export async function GET() {
  try {
    const health = await getSocialOpsHealthPanel();
    return NextResponse.json(health);
  } catch (err) {
    return NextResponse.json(
      {
        service: "SocialEngine",
        backend_connected: false,
        store_type: "unknown",
        writable: false,
        data_source: "unavailable",
        last_error: err instanceof Error ? err.message : "Failed to load health",
      },
      { status: 200 },
    );
  }
}
