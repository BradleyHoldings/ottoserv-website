import { NextRequest, NextResponse } from "next/server";
import {
  buildPilotStartConversion,
  listPilotStartConversions,
  savePilotStartConversion,
  validatePilotStartInput,
  type PilotStartInput,
} from "@/lib/processScanConversions";
import { updateProcessScan } from "@/lib/processScans";

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
    const rows = await listPilotStartConversions();
    return NextResponse.json({ rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load pilot starts." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let input: PilotStartInput;

  if (contentType.includes("application/json")) {
    input = await request.json();
  } else {
    const form = await request.formData();
    input = {
      scan_id: String(form.get("scan_id") || ""),
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      company: String(form.get("company") || ""),
      phone: String(form.get("phone") || ""),
      workflow: String(form.get("workflow") || ""),
      preferred_start_date: String(form.get("preferred_start_date") || ""),
      notes: String(form.get("notes") || ""),
      consent_to_contact: form.get("consent_to_contact") === "on" || form.get("consent_to_contact") === "true",
    };
  }

  const validationError = validatePilotStartInput(input);
  if (validationError) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const url = new URL("/front-office-leak-check/start-pilot", request.nextUrl.origin);
    if (input.scan_id) url.searchParams.set("scan", input.scan_id);
    if (input.workflow) url.searchParams.set("workflow", input.workflow);
    url.searchParams.set("error", validationError);
    return NextResponse.redirect(url, { status: 303 });
  }

  try {
    const conversion = buildPilotStartConversion(input);
    const saved = await savePilotStartConversion(conversion);
    if (conversion.scan_id) {
      await updateProcessScan(conversion.scan_id, {
        status: "pilot_recommended",
        recommended_next_step: "Pilot start requested. Confirm scope, start date, and payment path.",
      });
    }

    if (contentType.includes("application/json")) {
      return NextResponse.json({ status: "created", storage: saved.storage, conversion: saved.conversion });
    }
    const url = new URL("/front-office-leak-check/start-pilot/thank-you", request.nextUrl.origin);
    url.searchParams.set("event", saved.conversion.id);
    if (conversion.scan_id) url.searchParams.set("scan", conversion.scan_id);
    return NextResponse.redirect(url, { status: 303 });
  } catch (err) {
    console.error("Pilot start conversion failed:", err);
    return NextResponse.json({ error: "We could not save the pilot start request. Please try again." }, { status: 500 });
  }
}
