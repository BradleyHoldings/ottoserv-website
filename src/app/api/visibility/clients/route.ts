import { NextResponse } from "next/server";
import { listClients, loadClient, saveClient, slugify } from "@/lib/visibility-kit/store";
import { buildInitialIntake } from "@/lib/visibility-kit/generators/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  const clients = await listClients();
  return NextResponse.json({
    clients: clients.map((c) => ({
      slug: c.slug,
      companyName: c.companyName,
      mainService: c.mainService,
      serviceAreas: c.serviceAreas,
      aiLearnPageStatus: c.aiLearnPageStatus,
      problemPages: c.problemSpaceTopics.length,
      comparisonPages: c.comparisonPages.length,
      promptTrackerRows: c.promptTracker.length,
      updatedAt: c.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.companyName !== "string" || typeof body.mainService !== "string") {
    return NextResponse.json({ error: "companyName and mainService are required" }, { status: 400 });
  }
  const slug = body.slug ? slugify(body.slug) : slugify(body.companyName);
  const existing = await loadClient(slug);
  if (existing) {
    return NextResponse.json({ error: `Client '${slug}' already exists` }, { status: 409 });
  }
  const intake = buildInitialIntake({ ...body, slug });
  await saveClient(intake);
  return NextResponse.json({ ok: true, slug, client: intake }, { status: 201 });
}
