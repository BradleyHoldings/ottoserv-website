import { NextRequest, NextResponse } from "next/server";
// @ts-expect-error -- .mjs engine binding has a sibling .d.ts via socialContentEngine
import { getServerSocialEngine, getSocialOpsHealthPanel } from "@/lib/socialEngineServer.mjs";
// @ts-expect-error -- runtime event log helper (.mjs)
import { recordSocialEvent } from "@/lib/socialWorkflowStore.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY_STATE = {
  source: "unavailable",
  counts: {},
  posts: [],
  approvalQueue: [],
  coworkQueue: [],
  failureQueue: [],
  nextActions: [],
  auditSummary: [],
};

// GET /api/social — the live dashboard source of truth: workflow state + health.
// Resilient: if the store is unreachable we still return the health panel (with
// last_error / disconnected) instead of a fatal 500, so the dashboard can render.
export async function GET() {
  let health;
  try {
    health = await getSocialOpsHealthPanel();
  } catch (err) {
    return NextResponse.json(
      {
        state: EMPTY_STATE,
        items: [],
        health: {
          service: "SocialEngine",
          backend_connected: false,
          store_type: "unknown",
          writable: false,
          data_source: "unavailable",
          last_error: err instanceof Error ? err.message : "Store selection failed",
        },
      },
      { status: 200 },
    );
  }

  let state = EMPTY_STATE;
  let items: unknown[] = [];
  try {
    const engine = getServerSocialEngine();
    [state, items] = (await Promise.all([engine.getDashboardState(), engine.listDrafts()])) as [
      typeof EMPTY_STATE,
      unknown[],
    ];
  } catch {
    // health.last_error already reflects the failure; return the empty state so
    // the dashboard shows the disconnected health panel rather than a hard error.
  }

  return NextResponse.json({ state, health, items });
}

// POST /api/social — Codex drafts/imports content into the SocialEngine.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.post_text && !body.postText) {
    return NextResponse.json({ error: "post_text is required." }, { status: 400 });
  }

  try {
    const engine = getServerSocialEngine();
    const draft = await engine.createDraft(body);
    if (body.submit_for_review) {
      await engine.submitForReview(draft.id);
    }
    await recordSocialEvent("codex_content_prep", draft.id, "Draft created via /api/social");
    const fresh = await engine.listDrafts();
    const item = fresh.find((d: { id: string }) => d.id === draft.id) ?? draft;
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create draft" },
      { status: 500 },
    );
  }
}
