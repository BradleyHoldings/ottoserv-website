import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProcessScanBySlug } from "@/lib/processScans";

export const dynamic = "force-dynamic";

type WorkflowNode = {
  id: string;
  type: "trigger" | "manual_step" | "system_step" | "decision" | "leak" | "unknown" | "automation" | "outcome";
  label: string;
  description?: string;
  source?: "observed" | "reported" | "inferred" | "unknown";
  status?: "confirmed" | "unconfirmed" | "gap" | "recommended";
  severity?: "low" | "medium" | "high";
  evidence?: string[];
  recommendation?: string;
};

type WorkflowEdge = {
  from: string;
  to: string;
  label?: string;
};

type WorkflowMap = {
  workflowName: string;
  confidence: "High" | "Medium" | "Low";
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

type AiRecommendation = {
  name?: string;
  bestFirstJob?: string;
  whatItWouldDo?: string[];
  whatItWouldNotReplace?: string[];
  pilotMeasurements?: string[];
  basedOn?: string;
};

type RevenueRisk = {
  title: string;
  impact: string;
  severity: "low" | "medium" | "high";
};

type PriorityItem = {
  priority: "P1" | "P2" | "P3";
  title: string;
  action: string;
  severity: "low" | "medium" | "high";
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scan = await getProcessScanBySlug(slug);
  return {
    title: scan ? `${scan.company_name} Front Office Leak Check | OttoServ` : "Front Office Leak Check Report | OttoServ",
    description: "Client-facing OttoServ diagnostic report with confidence, workflow maps, leaks, unknowns, and a direct pilot next step.",
  };
}

export default async function LeakCheckReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scan = await getProcessScanBySlug(slug);
  if (!scan) notFound();

  const currentMap = asWorkflowMap(scan.current_state_workflow_map_json);
  const futureMap = asWorkflowMap(scan.future_state_workflow_map_json);
  const aiRecommendation = asAiRecommendation(scan.ai_recommendation_json);
  const leaks = asStringArray(scan.top_workflow_leaks_json).length
    ? asStringArray(scan.top_workflow_leaks_json)
    : asStringArray(scan.leaks_detected_json);
  const informationGaps = asStringArray(scan.information_gaps_json).length
    ? asStringArray(scan.information_gaps_json)
    : asStringArray(scan.could_not_confirm_json);
  const observed = asStringArray(scan.observed_from_recording_json);
  const reported = asStringArray(scan.reported_by_user_json);
  const couldNotConfirm = asStringArray(scan.could_not_confirm_json);
  const revenueRisks = asObjectArray<RevenueRisk>(scan.revenue_risks_json);
  const priorityRanking = asObjectArray<PriorityItem>(scan.priority_ranking_json);
  const practicalNextActions = asStringArray(scan.practical_next_actions_json);
  const automationOpportunities = asStringArray(scan.automation_opportunities_json);
  const pilotHref = `/front-office-leak-check/start-pilot?scan=${encodeURIComponent(scan.id)}&workflow=${encodeURIComponent(aiRecommendation.name || scan.ai_employee_recommendation || scan.process_name)}`;

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="min-h-screen text-gray-200">
      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-800 pb-8 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
                OttoServ Diagnostic Report
              </p>
              <h1 className="text-3xl font-bold text-white md:text-5xl">
                {scan.company_name} Front Office Leak Check
              </h1>
              <p className="mt-3 text-gray-400">
                Workflow: {scan.process_name} | Main leak: {scan.main_leak.replaceAll("_", " ")}
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#111827] px-4 py-3 text-sm">
              <div className="text-gray-500">Report status</div>
              <div className="font-semibold capitalize text-blue-300">{scan.report_status}</div>
            </div>
          </div>

          <ReportSection title="1. Executive Summary">
            <p className="text-gray-300 leading-relaxed">{scan.executive_summary}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Insight label="Recommended first AI employee" value={aiRecommendation.name || scan.ai_employee_recommendation || "Front Office Workflow Assistant"} />
              <Insight label="Recording" value={(scan.recording_status || "not provided").replaceAll("_", " ")} />
              <Insight label="Narration" value={scan.audio_included ? "Captured" : "Not captured"} />
            </div>
            {scan.recording_status === "recorded_upload_pending" && (
              <p className="mt-4 rounded border border-yellow-900 bg-yellow-950/30 p-3 text-sm text-yellow-200">
                Recording storage note: the browser captured a local preview, but the video file was not uploaded or stored durably. This report uses the submitted status, gap tags, and user-provided context; durable recording upload remains a follow-up storage task.
              </p>
            )}
          </ReportSection>

          <ReportSection title="2. Report Confidence">
            <div className={`rounded-lg border p-5 ${confidenceTone(scan.report_confidence)}`}>
              <p className="text-sm font-semibold uppercase tracking-widest opacity-80">
                Report Confidence
              </p>
              <p className="mt-2 text-3xl font-bold text-white">{scan.report_confidence || "Low"}</p>
              <p className="mt-2 text-sm leading-relaxed">{scan.report_confidence_reason || "Key workflow details could not be confirmed."}</p>
              {!scan.audio_included && (
                <p className="mt-3 rounded border border-yellow-900 bg-yellow-950/30 p-3 text-sm text-yellow-200">
                  No narration was captured. This report is based on the screen recording, selected gap tags, and any written answers provided.
                </p>
              )}
            </div>
          </ReportSection>

          <ReportSection title="3. Visual Process Map">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Flowchart title="Current-State Flowchart" map={currentMap} />
              <Flowchart title="Recommended Future-State Flowchart" map={futureMap} future />
            </div>
          </ReportSection>

          <ReportSection title="4. Detected Leaks / Bottlenecks">
            <Bullets items={leaks} fallback="No leaks have been finalized yet. OttoServ will add reviewed findings here." />
          </ReportSection>

          <ReportSection title="5. Revenue Risks">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {revenueRisks.length ? revenueRisks.map((risk) => (
                <RiskCard key={risk.title} risk={risk} />
              )) : <p className="text-sm text-gray-400">Revenue risk ranking will appear after review.</p>}
            </div>
          </ReportSection>

          <ReportSection title="6. Priority Ranking">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {priorityRanking.length ? priorityRanking.map((item) => (
                <PriorityCard key={`${item.priority}-${item.title}`} item={item} />
              )) : <p className="text-sm text-gray-400">Priority ranking will appear after review.</p>}
            </div>
          </ReportSection>

          <ReportSection title="7. Automation Opportunities">
            <Bullets items={automationOpportunities} fallback="Automation opportunities will appear after review." />
          </ReportSection>

          <ReportSection title="8. Practical Next Actions">
            <Bullets items={practicalNextActions} fallback="Next actions will appear after review." />
          </ReportSection>

          <ReportSection title="9. Information Gaps / What We Could Not Confirm">
            <Bullets items={informationGaps} fallback="No major information gaps were flagged by the intake." />
          </ReportSection>

          <ReportSection title="10. Observed / Reported / Could Not Confirm">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <EvidenceColumn title="Observed from recording" items={observed} fallback="No recording observations were available." />
              <EvidenceColumn title="Reported by user" items={reported} fallback="No user-reported details were provided." />
              <EvidenceColumn title="Could not confirm" items={couldNotConfirm} fallback="No unconfirmed items were flagged." />
            </div>
          </ReportSection>

          <ReportSection title="11. Current-State SOP">
            <MarkdownList markdown={scan.current_sop_markdown} />
          </ReportSection>

          <ReportSection title="12. Recommended Future-State Workflow">
            <MarkdownList markdown={scan.recommended_sop_markdown} />
          </ReportSection>

          <ReportSection title="13. AI Employee Recommendation">
            <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-5">
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">
                Recommended First AI Employee
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {aiRecommendation.name || scan.ai_employee_recommendation || "Front Office Workflow Assistant"}
              </p>
              <p className="mt-3 text-gray-300">
                {aiRecommendation.bestFirstJob || "Best first job: capture the workflow request, assign next action, trigger reminders, and keep status visible."}
              </p>
              {aiRecommendation.basedOn && <p className="mt-3 text-sm text-gray-500">{aiRecommendation.basedOn}</p>}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <EvidenceColumn title="What this AI employee would do" items={aiRecommendation.whatItWouldDo || []} fallback="Capture, route, remind, and update status." />
              <EvidenceColumn title="What it would not replace" items={aiRecommendation.whatItWouldNotReplace || []} fallback="Human judgment and approval controls." />
              <EvidenceColumn title="30-day pilot measurements" items={aiRecommendation.pilotMeasurements || []} fallback="Response time, completed follow-ups, recovered opportunities, and unresolved handoffs." />
            </div>
          </ReportSection>

          <ReportSection title="14. Suggested 30-Day Pilot Plan">
            <p className="text-gray-300 leading-relaxed">{scan.pilot_recommendation}</p>
            <p className="mt-4 text-gray-400">{scan.estimated_value_summary}</p>
          </ReportSection>

          <ReportSection title="15. Direct Next Step">
            <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-5">
              <h2 className="text-2xl font-bold text-white">Ready to test this on one workflow?</h2>
              <p className="mt-3 text-gray-300">
                Start with the recommended AI employee for 30 days. We will track response time,
                completed follow-ups, recovered opportunities, and remaining bottlenecks before
                expanding into broader operations.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link href={pilotHref} className="rounded-md bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700">
                  Start the 30-Day Pilot
                </Link>
                <Link href={`/process-audit?source=leak-check-report&scan=${encodeURIComponent(scan.id)}`} className="rounded-md border border-green-800 bg-green-950/20 px-5 py-3 text-center text-sm font-semibold text-green-200 hover:border-green-500">
                  Full Process Audit
                </Link>
                <Link href={`/contact?topic=leak-check-review&scan=${encodeURIComponent(scan.id)}`} className="rounded-md border border-blue-800 bg-[#0d0d0d] px-5 py-3 text-center text-sm font-semibold text-blue-200 hover:border-blue-500">
                  Book a Review Call
                </Link>
              </div>
            </div>
          </ReportSection>
        </div>
      </section>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border border-gray-800 bg-[#111827] p-6 md:p-7">
      <h2 className="mb-4 text-xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Flowchart({ title, map, future }: { title: string; map: WorkflowMap | null; future?: boolean }) {
  if (!map || !Array.isArray(map.nodes) || map.nodes.length === 0) {
    return <p className="text-gray-400">Workflow map will appear after the workflow is reviewed.</p>;
  }
  const columns = Math.min(Math.max(map.nodes.length, 1), 6);
  return (
    <div className="rounded-xl border border-gray-800 bg-[#0d0d0d] p-4">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-xs text-gray-500">{map.workflowName}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${future ? "border-green-800 text-green-300" : "border-blue-800 text-blue-300"}`}>
          {map.confidence} confidence
        </span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div
          className="grid min-w-[720px] items-start gap-x-3 gap-y-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(150px, 1fr))` }}
        >
          {map.nodes.map((node, idx) => (
            <div key={node.id} className="flex items-start">
              <NodeCard node={node} future={future} />
              {idx < map.nodes.length - 1 && <Connector label={map.edges.find((edge) => edge.from === node.id)?.label} />}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        {map.nodes.map((node) => (
          <details key={`${node.id}-details`} className="rounded-lg border border-gray-800 bg-[#111827] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-gray-200">{node.label}</summary>
            <div className="mt-2 space-y-2 text-xs text-gray-400">
              <p>Status: {node.status || "unknown"}</p>
              <p>Source: {node.source || "unknown"}</p>
              {node.description && <p>Why it matters: {node.description}</p>}
              {node.recommendation && <p className="text-blue-300">Recommended fix: {node.recommendation}</p>}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function NodeCard({ node, future }: { node: WorkflowNode; future?: boolean }) {
  const tone = nodeTone(node, future);
  const isDecision = node.type === "decision";
  return (
    <div className={`relative min-h-[118px] w-[150px] shrink-0 border p-3 text-sm shadow-lg ${tone} ${isDecision ? "rotate-45 rounded-md" : "rounded-lg"}`}>
      <div className={isDecision ? "-rotate-45 text-center" : ""}>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-70">
          {node.type.replaceAll("_", " ")}
        </div>
        <div className="font-semibold leading-snug">{node.label}</div>
        {node.severity && <div className="mt-2 text-[10px] uppercase tracking-widest">Severity: {node.severity}</div>}
      </div>
    </div>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="flex h-[118px] w-12 shrink-0 items-center justify-center">
      <div className="relative h-px w-full bg-gray-700">
        {label && <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#111827] px-2 py-0.5 text-[10px] text-gray-400">{label}</span>}
        <span className="absolute -right-1 -top-1 h-2 w-2 rotate-45 border-r border-t border-gray-500" />
      </div>
    </div>
  );
}

function nodeTone(node: WorkflowNode, future?: boolean) {
  if (node.type === "leak") return "border-red-700 bg-red-950/50 text-red-100";
  if (node.type === "unknown") return "border-yellow-700 bg-yellow-950/40 text-yellow-100";
  if (node.type === "decision") return "border-purple-700 bg-purple-950/35 text-purple-100";
  if (node.type === "automation") return "border-green-700 bg-green-950/40 text-green-100";
  if (node.type === "trigger") return "border-blue-700 bg-blue-950/45 text-blue-100";
  if (node.type === "outcome") return future ? "border-green-700 bg-green-950/30 text-green-100" : "border-gray-600 bg-gray-900 text-gray-100";
  if (future) return "border-green-800 bg-green-950/20 text-green-100";
  return "border-gray-700 bg-[#111827] text-gray-100";
}

function confidenceTone(value: string) {
  if (value === "High") return "border-green-800 bg-green-950/20 text-green-200";
  if (value === "Medium") return "border-blue-800 bg-blue-950/20 text-blue-200";
  return "border-yellow-800 bg-yellow-950/20 text-yellow-200";
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#0d0d0d] p-4">
      <div className="mb-1 text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-sm font-semibold capitalize text-gray-200">{value}</div>
    </div>
  );
}

function RiskCard({ risk }: { risk: RevenueRisk }) {
  return (
    <div className={`rounded-lg border p-4 ${risk.severity === "high" ? "border-red-800 bg-red-950/30" : risk.severity === "medium" ? "border-yellow-800 bg-yellow-950/25" : "border-gray-800 bg-[#0d0d0d]"}`}>
      <div className="mb-2 text-xs uppercase tracking-wider text-gray-500">Revenue risk | {risk.severity}</div>
      <h3 className="font-semibold text-white">{risk.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-300">{risk.impact}</p>
    </div>
  );
}

function PriorityCard({ item }: { item: PriorityItem }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#0d0d0d] p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-300">{item.priority} | {item.severity}</div>
      <h3 className="font-semibold text-white">{item.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-300">{item.action}</p>
    </div>
  );
}

function EvidenceColumn({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#0d0d0d] p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-300">{title}</h3>
      <Bullets items={items} fallback={fallback} compact />
    </div>
  );
}

function Bullets({ items, fallback, compact }: { items: string[]; fallback: string; compact?: boolean }) {
  if (items.length === 0) return <p className="text-sm text-gray-400">{fallback}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className={`${compact ? "text-sm" : "rounded-lg border border-gray-800 bg-[#0d0d0d] p-3 text-sm"} text-gray-300`}>
          {compact ? <span className="text-gray-500">- </span> : null}
          {item}
        </li>
      ))}
    </ul>
  );
}

function MarkdownList({ markdown }: { markdown: string | null }) {
  const rows = (markdown || "")
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  return <Bullets items={rows} fallback="SOP draft will appear after review." />;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function asWorkflowMap(value: unknown): WorkflowMap | null {
  if (!value || typeof value !== "object") return null;
  const map = value as Partial<WorkflowMap>;
  if (!Array.isArray(map.nodes) || !Array.isArray(map.edges)) return null;
  return {
    workflowName: typeof map.workflowName === "string" ? map.workflowName : "Workflow map",
    confidence: map.confidence === "High" || map.confidence === "Medium" || map.confidence === "Low" ? map.confidence : "Low",
    nodes: map.nodes as WorkflowNode[],
    edges: map.edges as WorkflowEdge[],
  };
}

function asAiRecommendation(value: unknown): AiRecommendation {
  if (!value || typeof value !== "object") return {};
  return value as AiRecommendation;
}

function asObjectArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item): item is T => Boolean(item && typeof item === "object")) : [];
}
