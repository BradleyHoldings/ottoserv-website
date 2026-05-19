import { NextResponse } from "next/server";
import { loadClient, saveClient } from "@/lib/visibility-kit/store";
import { regenerateGeneratedContent } from "@/lib/visibility-kit/generators/seed";

export const dynamic = "force-dynamic";

// Regenerate problem-space pages, FAQ, comparisons, authority checklist, and prompt
// tracker rows. Only DRAFT items are overwritten; approved/published items are kept.
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const current = await loadClient(slug);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });
  const next = regenerateGeneratedContent(current);
  await saveClient(next);
  return NextResponse.json({
    ok: true,
    slug,
    problemSpaceTopics: next.problemSpaceTopics.length,
    faqItems: next.faq.items.length,
    comparisonPages: next.comparisonPages.length,
    promptTrackerRows: next.promptTracker.length,
    authorityChecklist: next.authorityChecklist.length,
  });
}
