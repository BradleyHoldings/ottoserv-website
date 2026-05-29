import type { FrontOfficePremiumReport, LeakSeverity } from "@/lib/frontOfficeLeakCheck/reportContract";
import { ProcessMapPreview } from "./ProcessMapPreview";

const severityStyles: Record<LeakSeverity, string> = {
  low: "border-gray-700 bg-gray-900/60 text-gray-200",
  medium: "border-yellow-800 bg-yellow-950/30 text-yellow-100",
  high: "border-orange-800 bg-orange-950/30 text-orange-100",
  critical: "border-red-800 bg-red-950/30 text-red-100",
};

export function PremiumReportPreview({ report }: { report: FrontOfficePremiumReport }) {
  return (
    <section className="mb-8 rounded-2xl border border-blue-900/70 bg-gradient-to-b from-blue-950/35 to-[#0b1120] p-5 shadow-2xl shadow-black/20">
      <div className="mb-5 flex flex-col gap-3 border-b border-blue-900/60 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-blue-300">
            Front Office Leak Check premium report
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">{report.companyName}</h2>
          <p className="mt-1 text-sm text-gray-400">
            {report.industry} - Audit #{report.auditId}
          </p>
        </div>
        <div className="rounded-lg border border-yellow-800 bg-yellow-950/30 px-3 py-2 text-xs uppercase tracking-widest text-yellow-200">
          {report.statusLabel}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
            Executive summary
          </h3>
          <p className="mt-3 text-gray-100 leading-relaxed">{report.executiveSummary}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
            Approval gates
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-300">
            {report.approvalGates.map((gate) => (
              <li key={gate} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>{gate}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <section className="rounded-xl border border-gray-800 bg-[#111827] p-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-blue-300">
            Front office leak findings
          </h3>
          <div className="mt-4 grid gap-3">
            {report.leakFindings.map((finding) => (
              <article key={finding.title} className={`rounded-lg border p-4 ${severityStyles[finding.severity]}`}>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <h4 className="font-semibold text-white">{finding.title}</h4>
                  <span className="text-xs uppercase tracking-widest text-gray-300">{finding.severity}</span>
                </div>
                <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-gray-500">Observed evidence</dt>
                    <dd className="mt-1 text-gray-200">{finding.observedEvidence}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-gray-500">Recommended fix</dt>
                    <dd className="mt-1 text-gray-200">{finding.recommendedFix}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-gray-500">Revenue impact</dt>
                    <dd className="mt-1 text-gray-200">{finding.revenueImpact}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-gray-500">Customer experience impact</dt>
                    <dd className="mt-1 text-gray-200">{finding.customerExperienceImpact}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-gray-400">{finding.approvalRequirement}</p>
              </article>
            ))}
          </div>
        </section>

        <ProcessMapPreview steps={report.processMap} mermaid={report.mermaidPreview} />

        <div className="grid gap-4 lg:grid-cols-3">
          <ReportList title="Revenue/risk impact" items={report.revenueRiskImpact} />
          <section className="rounded-xl border border-gray-800 bg-[#111827] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
              Recommended automations
            </h3>
            <div className="mt-3 space-y-3">
              {report.recommendedAutomations.map((automation) => (
                <div key={automation.title} className="rounded-lg border border-gray-800 bg-black/20 p-3">
                  <div className="text-sm font-semibold text-white">{automation.title}</div>
                  <p className="mt-1 text-sm text-gray-300">{automation.purpose}</p>
                  {automation.blockedUntilApproval && (
                    <p className="mt-2 text-xs uppercase tracking-widest text-yellow-300">Approval-gated</p>
                  )}
                </div>
              ))}
            </div>
          </section>
          <ReportList title="Follow-up plan" items={report.followUpPlan} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ReportList title="Missing information / gaps" items={report.missingInformation.length ? report.missingInformation : ["No major missing fields detected from the current intake."]} />
          <ReportList title="Source evidence used" items={report.sourceEvidence} />
        </div>
      </div>
    </section>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-gray-800 bg-[#111827] p-5">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-gray-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
