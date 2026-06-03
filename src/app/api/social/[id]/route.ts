import { NextRequest, NextResponse } from "next/server";
// @ts-expect-error -- .mjs engine binding
import { getServerSocialEngine } from "@/lib/socialEngineServer.mjs";
// @ts-expect-error -- runtime event log helper (.mjs)
import { recordSocialEvent } from "@/lib/socialWorkflowStore.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Action =
  | "submit"
  | "review"
  | "approve"
  | "reject"
  | "handoff"
  | "evidence"
  | "fail"
  | "fallback";

// Build the formal Cowork handoff packet (Task 6) from the approved item.
function buildHandoffPacket(item: Record<string, any>, overrides: Record<string, any> = {}) {
  return {
    draft_id: item.id,
    platform: item.platform,
    post_text: item.post_text,
    asset_path: item.asset_path || null,
    asset_url: item.asset_url || null,
    instructions:
      overrides.instructions ||
      `Publish this ${item.content_type || "post"} to ${item.platform}. Preserve the core insight: "${item.core_insight_or_reframe || ""}". Do not turn it into an ad.`,
    cta_guidance:
      overrides.cta_guidance ||
      `CTA posture: ${item.cta_status || "none"}. This is a ${item.content_category || "post"} — keep any CTA proportionate.`,
    evidence_requirements: overrides.evidence_requirements || [
      "published post URL",
      "screenshot of the live post",
      "publish timestamp",
      "any warnings or errors encountered",
    ],
    fallback_rule:
      overrides.fallback_rule ||
      "If Cowork is unavailable or stalls, return to Hermes within 2h; Hermes reassigns to Codex if still blocked. The task must not be dropped.",
    executor: overrides.executor || "Cowork",
    created_by: overrides.created_by || "Hermes",
    created_at: new Date().toISOString(),
  };
}

// POST /api/social/[id] — workflow transition dispatcher.
// Body: { action, ...payload }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { action?: Action } & Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const action = body.action;
  if (!action) {
    return NextResponse.json({ error: "action is required." }, { status: 400 });
  }

  try {
    const engine = getServerSocialEngine();
    let item: Record<string, any>;
    let packet: Record<string, any> | null = null;

    switch (action) {
      case "submit":
        item = await engine.submitForReview(id);
        await recordSocialEvent("codex_content_prep", id, "Submitted for review");
        break;

      case "review":
        item = await engine.reviewDraft(id, body.review || body);
        await recordSocialEvent("hermes_social_review", id, "Strategy review recorded");
        break;

      case "approve":
        item = await engine.approveDraft(id, {
          approved_by: body.approved_by || "Jonathan",
          scheduled_for: body.scheduled_for,
        });
        await recordSocialEvent("approval_writeback", id, `Approved by ${body.approved_by || "Jonathan"}`);
        break;

      case "reject":
        item = await engine.rejectDraft(id, {
          reason: body.reason || "Rejected via dashboard",
          rejected_by: body.rejected_by || "Jonathan",
        });
        await recordSocialEvent("approval_writeback", id, `Rejected by ${body.rejected_by || "Jonathan"}`);
        break;

      case "handoff": {
        // Hermes routes the approved item to Cowork and records the packet.
        const current = await engine.getAuditTrail(id).then(() => engine.listDrafts());
        const target = current.find((d: { id: string }) => d.id === id);
        if (!target) {
          return NextResponse.json({ error: `Draft ${id} not found.` }, { status: 404 });
        }
        if (target.status !== "approved") {
          return NextResponse.json(
            { error: `Draft must be approved before Cowork handoff (status=${target.status}).` },
            { status: 409 },
          );
        }
        packet = buildHandoffPacket(target, body.packet || {});
        await engine.routeApprovedItem(id, packet.executor);
        item = await engine.recordExecutorHandoff(id, packet);
        await recordSocialEvent("cowork_handoff", id, `Handoff packet for ${item.platform}`);
        break;
      }

      case "evidence":
        item = await engine.recordEvidence(id, {
          published_url: body.published_url,
          evidence_path: body.evidence_path,
          evidence_url: body.evidence_url,
          performance_notes: body.performance_notes,
          published_at: body.published_at,
          recorded_by: body.recorded_by || "Cowork",
        });
        await recordSocialEvent("cowork_evidence", id, body.published_url || "evidence recorded");
        break;

      case "fail":
        item = await engine.markFailed(id, {
          failure_reason: body.failure_reason || "Cowork unavailable or stalled.",
          failed_by: body.failed_by || "SocialEngine",
        });
        await recordSocialEvent("fallback", id, "Marked failed");
        break;

      case "fallback":
        item = await engine.assignFallback(id, body.fallback_owner || "Hermes");
        await recordSocialEvent("fallback", id, `Fallback owner: ${body.fallback_owner || "Hermes"}`);
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ item, packet });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Workflow transition failed" },
      { status: 500 },
    );
  }
}
