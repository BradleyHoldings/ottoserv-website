import { NextResponse } from "next/server";
import { loadClient, saveClient } from "@/lib/visibility-kit/store";
import type { AuthorityChecklistItem } from "@/lib/visibility-kit/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await loadClient(slug);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ items: c.authorityChecklist });
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await loadClient(slug);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { items?: AuthorityChecklistItem[] } | null;
  if (!body?.items) return NextResponse.json({ error: "items required" }, { status: 400 });
  c.authorityChecklist = body.items;
  await saveClient(c);
  return NextResponse.json({ ok: true, count: c.authorityChecklist.length });
}
