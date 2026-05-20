import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  ACCEPTED_LEAD_FIELDS,
  importLeadRows,
  type NormalizedLead,
  parseCsv,
  parseJsonPayload,
} from "@/lib/outreach/leadImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data", "call-imports");
const LEADS_PATH = path.join(DATA_DIR, "leads.json");
const OUTREACH_QUEUE_PATH = path.join(DATA_DIR, "outreach_queue.json");
const DAILY_METRICS_PATH = path.join(DATA_DIR, "daily_metrics.json");

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
  const metrics = buildDailyMetrics(nextLeads, result);

  if (!dryRun) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await writeJsonFile(LEADS_PATH, nextLeads);
    await writeJsonFile(OUTREACH_QUEUE_PATH, buildOutreachQueue(nextLeads));
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

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function buildOutreachQueue(leads: NormalizedLead[]) {
  return leads.map((lead) => ({
    lead_id: lead.lead_id,
    company: lead.company,
    tier: lead.tier,
    score: lead.score,
    owner: lead.suggested_owner,
    status: lead.status,
    next_channel: lead.tier === "A-tier" ? "call" : lead.tier === "B-tier" ? "email" : "enrich",
    scheduled_call_local: lead.scheduled_call_local,
    phone: lead.normalized_phone,
    email: lead.email,
    website_url: lead.website_url,
    evidence_required: "import source, fit reason, outreach attempt log, and any reply or appointment proof",
  }));
}

function buildDailyMetrics(leads: NormalizedLead[], lastImport: { imported: NormalizedLead[]; rejected_count: number; duplicate_count: number }) {
  const today = new Date().toISOString().slice(0, 10);
  const importedToday = leads.filter((lead) => lead.created_at.startsWith(today));
  return {
    report_date: today,
    leads_imported_today: importedToday.length,
    a_tier_ready_to_call: leads.filter((lead) => lead.tier === "A-tier").length,
    b_tier_ready_to_email: leads.filter((lead) => lead.tier === "B-tier").length,
    leads_needing_enrichment: leads.filter((lead) => lead.tier === "C-tier").length,
    calls_scheduled: leads.filter((lead) => Boolean(lead.scheduled_call_local)).length,
    calls_completed: 0,
    replies_received: 0,
    appointments_booked: 0,
    failed_imports_or_errors: lastImport.rejected_count,
    duplicates_skipped: lastImport.duplicate_count,
    agent_blockers: [],
    next_best_actions: [
      "Hermes reviews imported A-tier leads before Jarvis spends call credits.",
      "Jarvis calls only A-tier leads with valid scheduled_call_local values.",
      "Cowork enriches C-tier leads and adds source evidence before outreach.",
    ],
  };
}
