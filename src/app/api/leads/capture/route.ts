import { NextRequest, NextResponse } from "next/server";
import { importLeadRows, type NormalizedLead } from "@/lib/outreach/leadImport";
import {
  CALL_OUTCOMES_PATH,
  DAILY_METRICS_PATH,
  FORM_SUBMISSIONS_PATH,
  JARVIS_CALL_PACKETS_PATH,
  LEADS_PATH,
  OUTREACH_QUEUE_PATH,
  buildDailyMetrics,
  buildJarvisCallPackets,
  buildOutreachQueue,
  readJsonFile,
  writeJsonFile,
} from "@/lib/outreach/leadStore";
import type { CallOutcome } from "@/lib/outreach/callOutcomes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CaptureBody = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  estimated_call_volume?: string;
  missed_call_concern?: string;
  message?: string;
  source_page?: string;
  intent?: string;
  consent_to_contact?: boolean;
};

export async function POST(request: NextRequest) {
  let body: CaptureBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = clean(body.email);
  const company = clean(body.company);
  const name = clean(body.name);
  const phone = clean(body.phone);
  if (!company && !name) return NextResponse.json({ error: "Company or name is required." }, { status: 400 });
  if (!email && !phone) return NextResponse.json({ error: "Email or phone is required." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!body.consent_to_contact) {
    return NextResponse.json({ error: "Permission to contact is required." }, { status: 400 });
  }

  const submittedAt = new Date().toISOString();
  const submission = {
    submission_id: `submission_${Date.now()}`,
    submitted_at: submittedAt,
    intent: clean(body.intent) || "general_inquiry",
    source_page: clean(body.source_page) || request.headers.get("referer") || "unknown",
    name,
    company,
    email,
    phone,
    website: clean(body.website),
    industry: clean(body.industry),
    estimated_call_volume: clean(body.estimated_call_volume),
    missed_call_concern: clean(body.missed_call_concern),
    message: clean(body.message),
    consent_to_contact: true,
  };

  const existingSubmissions = await readJsonFile<typeof submission[]>(FORM_SUBMISSIONS_PATH, []);
  const existingLeads = await readJsonFile<NormalizedLead[]>(LEADS_PATH, []);
  const outcomes = await readJsonFile<CallOutcome[]>(CALL_OUTCOMES_PATH, []);
  const result = importLeadRows([
    {
      company,
      contact_name: name,
      phone,
      email,
      website: clean(body.website),
      industry: clean(body.industry),
      source_url: submission.source_page,
      notes: [
        clean(body.message),
        clean(body.estimated_call_volume) && `estimated call volume: ${clean(body.estimated_call_volume)}`,
        clean(body.missed_call_concern) && `missed-call concern: ${clean(body.missed_call_concern)}`,
      ].filter(Boolean).join("; "),
      buying_signal: submission.intent,
      pain_signal: clean(body.missed_call_concern),
    },
  ], existingLeads, false);

  const nextLeads = [...existingLeads, ...result.imported];
  const metrics = buildDailyMetrics(nextLeads, result, outcomes);

  await writeJsonFile(FORM_SUBMISSIONS_PATH, [...existingSubmissions, submission]);
  await writeJsonFile(LEADS_PATH, nextLeads);
  await writeJsonFile(OUTREACH_QUEUE_PATH, buildOutreachQueue(nextLeads));
  await writeJsonFile(JARVIS_CALL_PACKETS_PATH, buildJarvisCallPackets(nextLeads, outcomes));
  await writeJsonFile(DAILY_METRICS_PATH, metrics);

  if (result.rejected_count > 0) {
    return NextResponse.json({
      status: "captured_needs_cleanup",
      message: "Your request was received. The lead needs cleanup before outreach.",
      submission_id: submission.submission_id,
      rejected: result.rejected,
      owner: "codex",
      dashboard: metrics,
    }, { status: 202 });
  }

  return NextResponse.json({
    status: "captured",
    message: "Thanks. We received your request and will follow up shortly.",
    submission_id: submission.submission_id,
    imported: result.imported,
    dashboard: metrics,
  });
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
