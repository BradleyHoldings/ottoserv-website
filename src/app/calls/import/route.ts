import { NextRequest, NextResponse } from "next/server";
import {
  ACCEPTED_LEAD_FIELDS,
  importLeadRows,
  type NormalizedLead,
  parseCsv,
  parseJsonPayload,
} from "@/lib/outreach/leadImport";
import {
  CALL_OUTCOMES_PATH,
  DAILY_METRICS_PATH,
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

export async function GET() {
  return NextResponse.json({
    endpoint: "/calls/import",
    method: "POST",
    authentication: "Send x-task-key header. Accepted key comes from OTTO_TASK_KEY, TASK_KEY, or the current OttoServ task key fallback.",
    content_types: ["application/json", "text/csv"],
    query_modes: {
      dry_run: "Use ?dry_run=1, ?dryRun=1, or ?validate=1 to validate without writing ledgers.",
    },
    accepted_fields: ACCEPTED_LEAD_FIELDS,
    json_shapes: [
      "{ leads: [{ company, phone, email, ... }] }",
      "{ records: [{ company, phone, email, ... }] }",
      "[{ company, phone, email, ... }]",
      "{ company, phone, email, ... }",
    ],
    guardrails: [
      "Reject missing phone unless valid email exists for email-first enrichment.",
      "Reject malformed US phone numbers.",
      "Reject 555, 000, and toll-free numbers for outbound call queue imports.",
      "Prevent duplicates by normalized phone, email, website, or normalized company name.",
      "A-tier leads receive local-business-hours call slots.",
    ],
  });
}

export async function POST(request: NextRequest) {
  const auth = authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: 401 });
  }

  const dryRun = isDryRun(request);
  const contentType = request.headers.get("content-type") || "";
  let rows;

  try {
    if (contentType.includes("text/csv") || contentType.includes("application/csv")) {
      rows = parseCsv(await request.text());
    } else {
      rows = parseJsonPayload(await request.json());
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: "Could not parse import payload.",
        detail: err instanceof Error ? err.message : String(err),
        accepted_fields: ACCEPTED_LEAD_FIELDS,
      },
      { status: 400 },
    );
  }

  if (!rows.length) {
    return NextResponse.json(
      {
        error: "No leads found in payload.",
        accepted_fields: ACCEPTED_LEAD_FIELDS,
      },
      { status: 400 },
    );
  }

  const existing = await readJsonFile<NormalizedLead[]>(LEADS_PATH, []);
  const result = importLeadRows(rows, existing, dryRun);
  const nextLeads = dryRun ? existing : [...existing, ...result.imported];
  const outcomes = await readJsonFile<CallOutcome[]>(CALL_OUTCOMES_PATH, []);
  const metrics = buildDailyMetrics(nextLeads, result, outcomes);

  if (!dryRun) {
    await writeJsonFile(LEADS_PATH, nextLeads);
    await writeJsonFile(OUTREACH_QUEUE_PATH, buildOutreachQueue(nextLeads));
    await writeJsonFile(JARVIS_CALL_PACKETS_PATH, buildJarvisCallPackets(nextLeads, outcomes));
    await writeJsonFile(DAILY_METRICS_PATH, metrics);
  }

  return NextResponse.json({
    ...result,
    ledgers_written: dryRun ? [] : [LEADS_PATH, OUTREACH_QUEUE_PATH, DAILY_METRICS_PATH],
    dashboard: metrics,
  });
}

function authorize(request: NextRequest): { ok: true } | { ok: false; message: string } {
  const headerKey = request.headers.get("x-task-key")?.trim();
  const acceptedKeys = [
    process.env.OTTO_TASK_KEY,
    process.env.TASK_KEY,
    "6622eb1f90ba8cd78b66b316efaa3423c3ae50128e0a4012975188fffc0bc3b8",
  ].filter(Boolean);

  if (!headerKey) {
    return { ok: false, message: "Missing x-task-key header." };
  }
  if (!acceptedKeys.includes(headerKey)) {
    return { ok: false, message: "Invalid x-task-key header." };
  }
  return { ok: true };
}

function isDryRun(request: NextRequest): boolean {
  const params = request.nextUrl.searchParams;
  return ["dry_run", "dryRun", "validate"].some((key) => ["1", "true", "yes"].includes((params.get(key) || "").toLowerCase()));
}
