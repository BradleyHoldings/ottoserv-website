import { NextResponse } from "next/server";
import { loadClient, saveClient } from "@/lib/visibility-kit/store";
import type { ClientIntake } from "@/lib/visibility-kit/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await loadClient(slug);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ client: c });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const current = await loadClient(slug);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });
  const patch = (await req.json().catch(() => null)) as Partial<ClientIntake> | null;
  if (!patch) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const merged: ClientIntake = { ...current, ...patch, slug: current.slug };
  await saveClient(merged);
  return NextResponse.json({ ok: true, client: merged });
}
