import { formatTimestamp, getHermesLiveDashboardData } from "@/lib/hermesReadOnlyAdapter";

export const dynamic = "force-dynamic";

export default async function HermesRevenuePage() {
  const data = await getHermesLiveDashboardData();
  const revenueSource = data.sections.revenueRisks;
  const loopSummary = data.sections.loopRunSummary;
  const isLive = data.dataMode === "real_data_connected";
  const isStale = data.sources.some((source) => source.status === "real_data_connected" && source.stale);
  const metrics = isLive
    ? [
        ...(loopSummary.jsonSummary?.counts || []),
        ...(loopSummary.jsonSummary?.pipelineViewCounts || []),
      ].slice(0, 8)
    : [
        { label: "Fixture revenue posture", value: 0 },
        { label: "Live export files", value: 0 },
        { label: "Trusted actions", value: 0 },
        { label: "Evidence records", value: 0 },
      ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300">Revenue Command View</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">What moved revenue forward today</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          {isLive
            ? "Live from Hermes safe export. Revenue numbers below are parsed from allowlisted loop summaries and revenue-risk files."
            : "Not live - showing fixture/mock data only. Do not use these numbers as operational truth until Hermes safe export is connected."}
        </p>
      </div>
      <div className={`rounded-3xl border p-5 ${isLive ? "border-emerald-400/25 bg-emerald-500/10" : "border-amber-400/25 bg-amber-500/10"}`}>
        <p className={`text-sm font-black uppercase tracking-[0.2em] ${isLive ? "text-emerald-100" : "text-amber-100"}`}>
          {isLive ? (isStale ? "Live from Hermes export - stale warning" : "Live from Hermes export") : "Not live - showing fixture/mock data"}
        </p>
        <p className="mt-2 text-sm leading-6 text-gray-300">
          Source: {loopSummary.fileName} via {loopSummary.readLocation.replace(/_/g, " ")}. Last update: {formatTimestamp(loopSummary.lastModified)}. Parsed: {formatTimestamp(loopSummary.lastSuccessfulParseAt)}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{metric.label}</p>
            <p className="mt-3 text-4xl font-black text-white">{metric.value}</p>
            <p className="mt-2 text-sm font-semibold text-blue-200">{isLive ? "Parsed from Hermes loop export" : "Fixture only"}</p>
          </article>
        ))}
      </div>
      <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
        <p className="text-sm font-bold text-amber-100">Blocked revenue items</p>
        {isLive && revenueSource.sections.length ? (
          <div className="mt-3 space-y-3">
            {revenueSource.sections.slice(0, 3).map((section) => (
              <div key={section.title}>
                <p className="text-sm font-semibold text-white">{section.title}</p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-50/80">
                  {section.items.slice(0, 4).map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-amber-50/80">
            No live Hermes revenue export is available. Outreach sends and payment links remain approval-gated until Hermes receives explicit approval decisions.
          </p>
        )}
      </div>
    </div>
  );
}
