import { promises as fs } from "fs";
import path from "path";
import { createWorkflowDiagnostics } from "./processScanDiagnostics.mjs";

export type ProcessScanStatus =
  | "submitted"
  | "needs_review"
  | "analysis_ready"
  | "report_ready"
  | "pilot_recommended"
  | "closed";

export type RecordingStatus =
  | "not_provided"
  | "recorded_upload_pending"
  | "uploaded"
  | "upload_failed";

export type AudioStatus = "unknown" | "enabled" | "disabled" | "blocked" | "unavailable";

export type ReportConfidenceLevel = "High" | "Medium" | "Low";

export type ReportStatus = "draft" | "ready" | "sent";

export interface ProcessScanInput {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  business_type?: string;
  main_leak: string;
  process_name: string;
  process_type?: string;
  software_used?: string;
  current_process_description: string;
  failure_impact?: string;
  monthly_lead_volume?: string;
  best_time_to_contact?: string;
  recording_status?: RecordingStatus;
  audio_status?: AudioStatus;
  gap_tags?: string[];
  other_gap_text?: string;
  clarification_answers?: Record<string, string>;
  source_page?: string;
}

export interface ProcessScan extends ProcessScanInput {
  id: string;
  recording_url: string | null;
  audio_status: AudioStatus;
  audio_included: boolean;
  gap_tags_json: unknown;
  other_gap_text: string;
  clarification_answers_json: unknown;
  report_confidence: ReportConfidenceLevel;
  report_confidence_reason: string;
  observed_from_recording_json: unknown;
  reported_by_user_json: unknown;
  could_not_confirm_json: unknown;
  top_workflow_leaks_json: unknown;
  information_gaps_json: unknown;
  current_state_workflow_map_json: unknown;
  future_state_workflow_map_json: unknown;
  ai_recommendation_json: unknown;
  revenue_risks_json: unknown;
  priority_ranking_json: unknown;
  practical_next_actions_json: unknown;
  analysis_status: string;
  transcript: string | null;
  process_summary: string | null;
  sop_markdown: string | null;
  flowchart_json: unknown;
  bottlenecks_json: unknown;
  automation_opportunities_json: unknown;
  ai_employee_recommendation: string | null;
  recommended_next_step: string | null;
  public_report_slug: string;
  public_report_url: string | null;
  report_status: ReportStatus;
  report_ready_at: string | null;
  executive_summary: string | null;
  current_state_flowchart_json: unknown;
  current_state_flowchart_mermaid: string | null;
  future_state_flowchart_json: unknown;
  future_state_flowchart_mermaid: string | null;
  leaks_detected_json: unknown;
  current_sop_markdown: string | null;
  recommended_sop_markdown: string | null;
  estimated_value_summary: string | null;
  pilot_recommendation: string | null;
  email_subject: string | null;
  email_preview_text: string | null;
  email_body_markdown: string | null;
  email_sent_at: string | null;
  status: ProcessScanStatus;
  created_at: string;
  updated_at: string;
}

const DATA_PATH = path.join(process.cwd(), "data", "process_scans.json");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const leakLabels: Record<string, string> = {
  missed_calls: "Missed calls",
  after_hours_calls: "After-hours calls",
  slow_follow_up: "Slow follow-up",
  unanswered_forms: "Unanswered forms",
  estimate_follow_up: "Estimate follow-up",
  scheduling: "Scheduling",
  crm_admin_updates: "CRM/admin updates",
  invoice_payment_follow_up: "Invoice/payment follow-up",
  other: "Other front office workflow",
};

export function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateProcessScanInput(input: Partial<ProcessScanInput>) {
  const required: (keyof ProcessScanInput)[] = [
    "company_name",
    "contact_name",
    "email",
    "main_leak",
    "process_name",
    "current_process_description",
  ];
  for (const key of required) {
    if (!clean(input[key])) return `${String(key).replaceAll("_", " ")} is required.`;
  }
  if (!EMAIL_RE.test(clean(input.email).toLowerCase())) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function buildProcessScan(input: ProcessScanInput, origin?: string): ProcessScan {
  const now = new Date().toISOString();
  const id = `ps_${Date.now()}_${randomToken(6)}`;
  const slug = `${randomToken(12)}-${slugify(input.company_name || "scan")}`;
  const mainLeakLabel = leakLabels[input.main_leak] || input.main_leak;
  const processType = input.process_type || input.main_leak;
  const reportUrl = origin ? `${origin}/front-office-leak-check/report/${slug}` : null;
  const leaks = deriveLeaks(input);
  const currentSteps = deriveCurrentSteps(input);
  const futureSteps = deriveFutureSteps(input);
  const recommendation = deriveRecommendation(input.main_leak);
  const diagnostics = createWorkflowDiagnostics(input);
  const reportConfidence = asReportConfidence(diagnostics.reportConfidence.level);

  return {
    id,
    company_name: clean(input.company_name),
    contact_name: clean(input.contact_name),
    email: clean(input.email).toLowerCase(),
    phone: clean(input.phone),
    website: clean(input.website),
    industry: clean(input.industry),
    business_type: clean(input.business_type),
    main_leak: input.main_leak,
    process_name: clean(input.process_name),
    process_type: processType,
    software_used: clean(input.software_used),
    current_process_description: clean(input.current_process_description),
    failure_impact: clean(input.failure_impact),
    monthly_lead_volume: clean(input.monthly_lead_volume),
    best_time_to_contact: clean(input.best_time_to_contact),
    recording_url: null,
    recording_status: input.recording_status || "not_provided",
    audio_status: input.audio_status || "unknown",
    audio_included: input.audio_status === "enabled",
    gap_tags_json: input.gap_tags || [],
    other_gap_text: clean(input.other_gap_text),
    clarification_answers_json: input.clarification_answers || {},
    report_confidence: reportConfidence,
    report_confidence_reason: diagnostics.reportConfidence.reason,
    observed_from_recording_json: diagnostics.observed,
    reported_by_user_json: diagnostics.reported,
    could_not_confirm_json: diagnostics.couldNotConfirm,
    top_workflow_leaks_json: diagnostics.topWorkflowLeaks,
    information_gaps_json: diagnostics.informationGaps,
    current_state_workflow_map_json: diagnostics.currentStateMap,
    future_state_workflow_map_json: diagnostics.futureStateMap,
    ai_recommendation_json: diagnostics.aiRecommendation,
    revenue_risks_json: diagnostics.revenueRisks,
    priority_ranking_json: diagnostics.priorityRanking,
    practical_next_actions_json: diagnostics.nextActions,
    analysis_status: "pending",
    transcript: null,
    process_summary: `Submitted workflow: ${clean(input.process_name)}. Main leak to inspect: ${mainLeakLabel}.`,
    sop_markdown: currentSteps.map((step, idx) => `${idx + 1}. ${step}`).join("\n"),
    flowchart_json: currentSteps,
    bottlenecks_json: diagnostics.topWorkflowLeaks.length ? diagnostics.topWorkflowLeaks : leaks,
    automation_opportunities_json: diagnostics.automationOpportunities.length ? diagnostics.automationOpportunities : deriveOpportunities(input),
    ai_employee_recommendation: recommendation,
    recommended_next_step: "Review the leak check report, then scope a focused 30-day pilot.",
    source_page: input.source_page || "front_office_leak_check",
    public_report_slug: slug,
    public_report_url: reportUrl,
    report_status: "ready",
    report_ready_at: now,
    executive_summary: buildExecutiveSummary(input, mainLeakLabel),
    current_state_flowchart_json: currentSteps,
    current_state_flowchart_mermaid: toMermaidFromMap(diagnostics.currentStateMap),
    future_state_flowchart_json: futureSteps,
    future_state_flowchart_mermaid: toMermaidFromMap(diagnostics.futureStateMap),
    leaks_detected_json: diagnostics.topWorkflowLeaks.length ? diagnostics.topWorkflowLeaks : leaks,
    current_sop_markdown: currentSteps.map((step, idx) => `${idx + 1}. ${step}`).join("\n"),
    recommended_sop_markdown: futureSteps.map((step, idx) => `${idx + 1}. ${step}`).join("\n"),
    estimated_value_summary: buildEstimatedValue(input),
    pilot_recommendation: `Start with ${diagnostics.aiRecommendation.name || recommendation} during a focused 30-day pilot. Measure response speed, completed follow-ups, recovered opportunities, and remaining bottlenecks before expanding.`,
    email_subject: `Your OttoServ Front Office Leak Check for ${clean(input.company_name)}`,
    email_preview_text: "Your process map, detected leaks, and recommended 30-day pilot path are ready.",
    email_body_markdown: reportUrl
      ? `Hi ${firstName(input.contact_name)},\n\nYour Free Front Office Leak Check is ready:\n\n${reportUrl}\n\nInside you will find the process map, detected leaks, current-state SOP, recommended future-state workflow, and the suggested 30-day pilot path.\n\n- OttoServ`
      : `Hi ${firstName(input.contact_name)},\n\nYour Free Front Office Leak Check is ready. Send the public report link once deployed.\n\n- OttoServ`,
    email_sent_at: null,
    status: "report_ready",
    created_at: now,
    updated_at: now,
  };
}

export async function saveProcessScan(scan: ProcessScan) {
  const supabase = await insertSupabaseScan(scan);
  if (supabase.ok) return { scan: supabase.scan, storage: "supabase" as const };
  if (supabase.error !== "supabase_not_configured") {
    throw new Error(supabase.error);
  }
  await saveLocalScan(scan);
  return { scan, storage: "local" as const };
}

export async function listProcessScans(): Promise<ProcessScan[]> {
  const supabase = await selectSupabaseScans();
  if (supabase.ok) return supabase.scans;
  return readLocalScans();
}

export async function getProcessScan(id: string): Promise<ProcessScan | null> {
  const supabase = await selectSupabaseScanById(id);
  if (supabase.ok) return supabase.scan;
  const scans = await readLocalScans();
  return scans.find((scan) => scan.id === id) || null;
}

export async function getProcessScanBySlug(slug: string): Promise<ProcessScan | null> {
  const supabase = await selectSupabaseScanBySlug(slug);
  if (supabase.ok) return supabase.scan;
  const scans = await readLocalScans();
  return scans.find((scan) => scan.public_report_slug === slug) || null;
}

export async function updateProcessScan(id: string, patch: Partial<ProcessScan>) {
  const nextPatch = { ...patch, updated_at: new Date().toISOString() };
  const supabase = await patchSupabaseScan(id, nextPatch);
  if (supabase.ok) return supabase.scan;
  const scans = await readLocalScans();
  const idx = scans.findIndex((scan) => scan.id === id);
  if (idx === -1) return null;
  scans[idx] = { ...scans[idx], ...nextPatch };
  await writeLocalScans(scans);
  return scans[idx];
}

async function readLocalScans(): Promise<ProcessScan[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveLocalScan(scan: ProcessScan) {
  const scans = await readLocalScans();
  await writeLocalScans([scan, ...scans]);
}

async function writeLocalScans(scans: ProcessScan[]) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(scans, null, 2));
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

async function insertSupabaseScan(scan: ProcessScan) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { ok: false as const, error: "supabase_not_configured" };

  const res = await fetch(`${url}/rest/v1/process_scans?select=*`, {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(scan),
  });
  if (!res.ok) return { ok: false as const, error: await res.text() };
  const rows = (await res.json()) as ProcessScan[];
  return { ok: true as const, scan: rows[0] || scan };
}

async function selectSupabaseScans() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { ok: false as const, error: "supabase_not_configured" };
  const res = await fetch(`${url}/rest/v1/process_scans?select=*&order=created_at.desc&limit=500`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const, error: await res.text() };
  return { ok: true as const, scans: (await res.json()) as ProcessScan[] };
}

async function selectSupabaseScanById(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { ok: false as const, error: "supabase_not_configured" };
  const res = await fetch(`${url}/rest/v1/process_scans?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const, error: await res.text() };
  const rows = (await res.json()) as ProcessScan[];
  return { ok: true as const, scan: rows[0] || null };
}

async function selectSupabaseScanBySlug(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { ok: false as const, error: "supabase_not_configured" };
  const res = await fetch(`${url}/rest/v1/process_scans?public_report_slug=eq.${encodeURIComponent(slug)}&select=*`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const, error: await res.text() };
  const rows = (await res.json()) as ProcessScan[];
  return { ok: true as const, scan: rows[0] || null };
}

async function patchSupabaseScan(id: string, patch: Partial<ProcessScan>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { ok: false as const, error: "supabase_not_configured" };
  const res = await fetch(`${url}/rest/v1/process_scans?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return { ok: false as const, error: await res.text() };
  const rows = (await res.json()) as ProcessScan[];
  return { ok: true as const, scan: rows[0] || null };
}

function randomToken(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function firstName(value: string) {
  return clean(value).split(/\s+/)[0] || "there";
}

function buildExecutiveSummary(input: ProcessScanInput, mainLeakLabel: string) {
  return `${clean(input.company_name)} submitted the "${clean(input.process_name)}" workflow for a free front office leak check. The primary concern is ${mainLeakLabel.toLowerCase()}. Based on the intake, the likely opportunity is to tighten ownership, response timing, reminders, and system updates before deploying a focused OttoServ AI employee.`;
}

function deriveLeaks(input: ProcessScanInput) {
  const base = [
    "No clear owner at the moment the workflow starts",
    "Manual follow-up depends on memory or individual availability",
    "Status updates may not reach the CRM or scheduling system quickly enough",
  ];
  const leak = input.main_leak;
  if (leak.includes("missed") || leak.includes("after_hours")) {
    base.unshift("Calls can go unanswered or sit in voicemail before a human sees them");
  }
  if (leak.includes("follow_up") || leak.includes("estimate")) {
    base.unshift("Follow-up timing can drift after the first customer touch");
  }
  if (leak.includes("scheduling")) {
    base.unshift("Booking requires back-and-forth instead of a clear next available slot");
  }
  if (leak.includes("crm")) {
    base.unshift("Important context may be copied manually between tools");
  }
  if (leak.includes("invoice")) {
    base.unshift("Payment reminders and next steps may be inconsistent");
  }
  return Array.from(new Set(base));
}

function deriveOpportunities(input: ProcessScanInput) {
  return [
    `Use an AI intake layer to capture structured details for ${clean(input.process_name)}.`,
    "Add immediate confirmation and internal routing when the workflow starts.",
    "Trigger reminders for any lead, estimate, invoice, or scheduling step that has not moved.",
    "Write a clean summary back to the CRM/admin system for visibility.",
  ];
}

function deriveCurrentSteps(input: ProcessScanInput) {
  return [
    "Customer or prospect starts the workflow",
    `${clean(input.company_name)} receives the request through the current front office channel`,
    clean(input.current_process_description) || "Team handles the process manually",
    clean(input.software_used) ? `Team updates or checks ${clean(input.software_used)}` : "Team checks tools, inboxes, calendars, or notes",
    clean(input.failure_impact) ? `If it fails: ${clean(input.failure_impact)}` : "If it fails, the opportunity can stall or disappear",
  ];
}

function deriveFutureSteps(input: ProcessScanInput) {
  const recommendation = deriveRecommendation(input.main_leak);
  return [
    "Workflow starts from call, form, email, text, or admin trigger",
    `${recommendation} captures structured details immediately`,
    "OttoServ routes the summary, urgency, owner, and next action to the team",
    "Automated reminders keep follow-up, scheduling, CRM, or payment steps moving",
    "Dashboard/reporting shows recovered opportunities and remaining bottlenecks",
  ];
}

function deriveRecommendation(mainLeak: string) {
  if (mainLeak === "missed_calls" || mainLeak === "after_hours_calls") return "OttoServ Front Desk AI";
  if (mainLeak === "estimate_follow_up" || mainLeak === "slow_follow_up") return "Estimate Follow-Up Agent";
  if (mainLeak === "scheduling") return "Scheduling Assistant";
  if (mainLeak === "crm_admin_updates") return "CRM Update Agent";
  if (mainLeak === "invoice_payment_follow_up") return "Invoice Follow-Up Agent";
  return "Front Office Workflow Assistant";
}

function buildEstimatedValue(input: ProcessScanInput) {
  const volume = clean(input.monthly_lead_volume);
  if (!volume) {
    return "Value will be estimated after OttoServ reviews lead volume, response time, and average job value.";
  }
  return `With roughly ${volume} monthly opportunities, even a small improvement in response speed, follow-up consistency, or handoff quality can justify a focused 30-day pilot.`;
}

function toMermaid(steps: string[]) {
  const lines = ["flowchart TD"];
  steps.forEach((step, idx) => {
    const node = String.fromCharCode(65 + idx);
    lines.push(`  ${node}["${step.replace(/"/g, "'")}"]`);
    if (idx > 0) {
      const prev = String.fromCharCode(65 + idx - 1);
      lines.push(`  ${prev} --> ${node}`);
    }
  });
  return lines.join("\n");
}

function asReportConfidence(value: string): ReportConfidenceLevel {
  return value === "High" || value === "Medium" || value === "Low" ? value : "Low";
}

function toMermaidFromMap(map: unknown) {
  if (!map || typeof map !== "object") return "";
  const typed = map as { nodes?: Array<{ id: string; label: string; type?: string }>; edges?: Array<{ from: string; to: string; label?: string }> };
  if (!Array.isArray(typed.nodes) || !Array.isArray(typed.edges)) return "";
  const lines = ["flowchart TD"];
  for (const node of typed.nodes) {
    const shape = node.type === "decision" ? "{%LABEL%}" : node.type === "leak" ? "[[%LABEL%]]" : "[\"%LABEL%\"]";
    lines.push(`  ${safeMermaidId(node.id)}${shape.replace("%LABEL%", String(node.label || "").replace(/"/g, "'"))}`);
  }
  for (const edge of typed.edges) {
    const label = edge.label ? `|${String(edge.label).replace(/\|/g, "/")}|` : "";
    lines.push(`  ${safeMermaidId(edge.from)} -->${label} ${safeMermaidId(edge.to)}`);
  }
  return lines.join("\n");
}

function safeMermaidId(value: string) {
  return String(value || "node").replace(/[^A-Za-z0-9_]/g, "_");
}
