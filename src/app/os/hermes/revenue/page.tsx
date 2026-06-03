import { formatTimestamp, getHermesLiveDashboardData } from "@/lib/hermesReadOnlyAdapter";
import { readAutonomousRevenueState } from "@/lib/revenueEngineReadAdapter.mjs";
import type { AutonomousRevenueState } from "@/lib/revenueEngineReadAdapter";

export const dynamic = "force-dynamic";

export default async function HermesRevenuePage() {
  const data = await getHermesLiveDashboardData();
  const loop = (await readAutonomousRevenueState()) as AutonomousRevenueState;
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

      <AutonomousRevenueLoop loop={loop} />
    </div>
  );
}

function AutonomousRevenueLoop({ loop }: { loop: AutonomousRevenueState }) {
  const healthy = loop.health?.status === "healthy";
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-200">Autonomous revenue loop</p>
          <p className="mt-1 text-xs text-gray-500">
            Read-only from {loop.source.file.split("/").slice(-2).join("/")} · last run {formatTimestamp(loop.source.lastModified)}
          </p>
        </div>
        {loop.available ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] ${
              loop.status === "repair_first" || !healthy ? "bg-amber-500/20 text-amber-100" : "bg-emerald-500/20 text-emerald-100"
            }`}
          >
            {loop.status} · {loop.health?.status ?? "unknown"}
          </span>
        ) : (
          <span className="rounded-full bg-gray-500/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-gray-300">
            no loop run yet
          </span>
        )}
      </div>

      {loop.available ? (
        <>
          <p className="mt-4 text-sm font-semibold text-white">Next action: {loop.nextAction}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(loop.queueCounts).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-gray-500">{key}</p>
                <p className="mt-1 text-2xl font-black text-white">{value as number}</p>
              </div>
            ))}
          </div>

          {loop.revenueRisks.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Revenue risks</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-50/80">
                {loop.revenueRisks.map((risk) => (
                  <li key={risk}>- {risk}</li>
                ))}
              </ul>
            </div>
          )}

          {loop.repairPackets.length > 0 && (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-200">Broken rails / repair packets</p>
              {loop.repairPackets.map((packet) => (
                <div key={packet.id} className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.07] p-4">
                  <p className="text-sm font-semibold text-white">
                    {packet.category} → {packet.owner}
                  </p>
                  <p className="mt-1 text-sm text-gray-300">{packet.actual_behavior}</p>
                  <p className="mt-1 text-xs text-gray-500">Expected: {packet.expected_behavior}</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm leading-6 text-gray-400">{loop.nextAction}</p>
      )}
    </section>
  );
}
