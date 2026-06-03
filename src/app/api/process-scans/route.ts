import { NextRequest, NextResponse } from "next/server";
import {
  buildProcessScan,
  clean,
  listProcessScans,
  saveProcessScan,
  validateProcessScanInput,
  type ProcessScanInput,
} from "@/lib/processScans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_API_TOKEN || "";
  return Boolean(expected && token && token === expected);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await listProcessScans();
    return NextResponse.json({ rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load process scans." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: Partial<ProcessScanInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const input: ProcessScanInput = {
    company_name: clean(body.company_name),
    contact_name: clean(body.contact_name),
    email: clean(body.email).toLowerCase(),
    phone: clean(body.phone),
    website: clean(body.website),
    industry: clean(body.industry),
    business_type: clean(body.business_type),
    main_leak: clean(body.main_leak),
    process_name: clean(body.process_name),
    process_type: clean(body.process_type || body.main_leak),
    software_used: clean(body.software_used),
    current_process_description: clean(body.current_process_description),
    failure_impact: clean(body.failure_impact),
    monthly_lead_volume: clean(body.monthly_lead_volume),
    best_time_to_contact: clean(body.best_time_to_contact),
    recording_status: body.recording_status || "not_provided",
    audio_status: body.audio_status || "unknown",
    gap_tags: Array.isArray(body.gap_tags) ? body.gap_tags.filter((item): item is string => typeof item === "string") : [],
    other_gap_text: clean(body.other_gap_text),
    clarification_answers:
      body.clarification_answers && typeof body.clarification_answers === "object" && !Array.isArray(body.clarification_answers)
        ? Object.fromEntries(
            Object.entries(body.clarification_answers).map(([key, value]) => [key, clean(value)]),
          )
        : {},
    source_page: clean(body.source_page) || "front_office_leak_check",
  };

  const validationError = validateProcessScanInput(input);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const origin = request.nextUrl.origin;
    const scan = buildProcessScan(input, origin);
    const saved = await saveProcessScan(scan);
    return NextResponse.json({
      status: "created",
      storage: saved.storage,
      scan: saved.scan,
      report_url: saved.scan.public_report_url,
    });
  } catch (err) {
    console.error("Process scan create failed:", err);
    return NextResponse.json(
      { error: "We could not save your leak check. Please try again." },
      { status: 500 },
    );
  }
}
