import { NextRequest, NextResponse } from "next/server";
// @ts-expect-error -- .mjs engine binding has a sibling .d.ts via socialContentEngine
import { getServerSocialEngine, getSocialOpsHealthPanel } from "@/lib/socialEngineServer.mjs";
// @ts-expect-error -- runtime event log helper (.mjs)
import { recordSocialEvent } from "@/lib/socialWorkflowStore.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/social — the live dashboard source of truth: workflow state + health.
export async function GET() {
  try {
    const engine = getServerSocialEngine();
    const [state, health, items] = await Promise.all([
      engine.getDashboardState(),
      getSocialOpsHealthPanel(),
      engine.listDrafts(),
    ]);
    return NextResponse.json({ state, health, items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load social state" },
      { status: 500 },
    );
  }
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
