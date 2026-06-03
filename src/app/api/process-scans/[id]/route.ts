import { NextRequest, NextResponse } from "next/server";
import { getProcessScan, updateProcessScan, type ProcessScan } from "@/lib/processScans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_API_TOKEN || "";
  return Boolean(expected && token && token === expected);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const scan = await getProcessScan(id);
  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ scan });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: Partial<ProcessScan>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const allowed: Partial<ProcessScan> = {};
  const keys: (keyof ProcessScan)[] = [
    "status",
    "analysis_status",
    "report_status",
    "recommended_next_step",
    "pilot_recommendation",
    "email_subject",
    "email_preview_text",
    "email_body_markdown",
    "email_sent_at",
  ];
  for (const key of keys) {
    if (key in body) {
      allowed[key] = body[key] as never;
    }
  }

  const scan = await updateProcessScan(id, allowed);
  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ scan });
}
