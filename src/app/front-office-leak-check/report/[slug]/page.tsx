import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProcessScanBySlug } from "@/lib/processScans";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scan = await getProcessScanBySlug(slug);
  return {
    title: scan ? `${scan.company_name} Front Office Leak Check | OttoServ` : "Front Office Leak Check Report | OttoServ",
    description: "Client-facing OttoServ diagnostic report with process map, detected leaks, SOP, and pilot recommendation.",
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

  const leaks = asStringArray(scan.leaks_detected_json);
  const currentSteps = asStringArray(scan.current_state_flowchart_json);
  const futureSteps = asStringArray(scan.future_state_flowchart_json);
  const opportunities = asStringArray(scan.automation_opportunities_json);

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="min-h-screen text-gray-200">
      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
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

          <ReportSection title="Executive Summary">
            <p className="text-gray-300 leading-relaxed">{scan.executive_summary}</p>
            <div className="mt-4 rounded-lg border border-blue-900 bg-blue-950/20 p-4">
              <p className="text-sm font-semibold text-blue-300">Biggest opportunity</p>
              <p className="mt-1 text-sm text-gray-300">
                {leaks[0] || "Tighten ownership, response speed, and follow-up visibility before automation."}
              </p>
            </div>
          </ReportSection>

          <ReportSection title="Visual Process Map">
            <ProcessMap steps={currentSteps} />
            {scan.current_state_flowchart_mermaid && (
              <details className="mt-4 rounded-lg border border-gray-800 bg-[#0d0d0d] p-4">
                <summary className="cursor-pointer text-sm text-gray-400">Mermaid source</summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-gray-300">
                  {scan.current_state_flowchart_mermaid}
                </pre>
              </details>
            )}
          </ReportSection>

          <ReportSection title="Detected Leaks / Bottlenecks">
            <Bullets items={leaks} fallback="No leaks have been finalized yet. OttoServ will add reviewed findings here." />
          </ReportSection>

          <ReportSection title="Current-State SOP">
            <MarkdownList markdown={scan.current_sop_markdown} />
          </ReportSection>

          <ReportSection title="Recommended Future-State Workflow">
            <ProcessMap steps={futureSteps} tone="future" />
            <div className="mt-5">
              <MarkdownList markdown={scan.recommended_sop_markdown} />
            </div>
          </ReportSection>

          <ReportSection title="AI Employee Recommendation">
            <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-5">
              <p className="text-2xl font-bold text-white">
                {scan.ai_employee_recommendation || "OttoServ Front Desk AI"}
              </p>
              <p className="mt-3 text-gray-300">
                This is the best first AI employee or automation to test because it addresses
                the submitted workflow before expanding into broader operations.
              </p>
            </div>
            <div className="mt-4">
              <Bullets items={opportunities} fallback="Automation opportunities will be added after review." />
            </div>
          </ReportSection>

          <ReportSection title="Suggested 30-Day Pilot Plan">
            <p className="text-gray-300 leading-relaxed">{scan.pilot_recommendation}</p>
            <p className="mt-4 text-gray-400">{scan.estimated_value_summary}</p>
          </ReportSection>

          <ReportSection title="Next Step">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/contact?topic=leak-check-review" className="rounded-md bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700">
                Book a Review Call
              </Link>
              <Link href="/front-desk-ai" className="rounded-md border border-gray-700 px-5 py-3 text-center text-sm font-semibold text-gray-200 hover:border-gray-500 hover:text-white">
                Start the 30-Day Pilot
              </Link>
              <Link href="/contact" className="rounded-md border border-gray-700 px-5 py-3 text-center text-sm font-semibold text-gray-200 hover:border-gray-500 hover:text-white">
                Contact OttoServ
              </Link>
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

function ProcessMap({ steps, tone = "current" }: { steps: string[]; tone?: "current" | "future" }) {
  const color = tone === "future" ? "border-green-800 bg-green-950/20 text-green-200" : "border-blue-900 bg-blue-950/20 text-blue-200";
  if (steps.length === 0) {
    return <p className="text-gray-400">Process map will appear after the workflow is reviewed.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3">
      {steps.map((step, idx) => (
        <div key={`${idx}-${step}`}>
          <div className={`rounded-lg border p-4 ${color}`}>
            <div className="mb-1 text-xs uppercase tracking-widest opacity-70">Step {idx + 1}</div>
            <div className="text-sm font-medium">{step}</div>
          </div>
          {idx < steps.length - 1 && <div className="py-2 text-center text-gray-600">down</div>}
        </div>
      ))}
    </div>
  );
}

function Bullets({ items, fallback }: { items: string[]; fallback: string }) {
  if (items.length === 0) return <p className="text-gray-400">{fallback}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="rounded-lg border border-gray-800 bg-[#0d0d0d] p-3 text-sm text-gray-300">
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
