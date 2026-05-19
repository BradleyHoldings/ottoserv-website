import { NextResponse } from "next/server";
import { loadClient, saveClient } from "@/lib/visibility-kit/store";
import type { PromptTrackerRow } from "@/lib/visibility-kit/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await loadClient(slug);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ rows: c.promptTracker });
}

// Replace or upsert tracker rows.
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await loadClient(slug);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { rows?: PromptTrackerRow[] } | null;
  if (!body?.rows) return NextResponse.json({ error: "rows required" }, { status: 400 });
  c.promptTracker = body.rows;
  await saveClient(c);
  return NextResponse.json({ ok: true, count: c.promptTracker.length });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await loadClient(slug);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Partial<PromptTrackerRow> & { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "row id required" }, { status: 400 });
  const idx = c.promptTracker.findIndex((r) => r.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "row not found" }, { status: 404 });
  c.promptTracker[idx] = { ...c.promptTracker[idx], ...body, lastCheckedAt: new Date().toISOString() };
  await saveClient(c);
  return NextResponse.json({ ok: true, row: c.promptTracker[idx] });
}
