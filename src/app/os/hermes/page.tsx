import Link from "next/link";
import { formatTimestamp, getHermesLiveDashboardData, HermesSourceFile } from "@/lib/hermesReadOnlyAdapter";

export const dynamic = "force-dynamic";

const answerCards = [
  ["What is Hermes trying to accomplish?", "Move today's revenue-critical missions while keeping high-risk actions behind approval policy."],
  ["Which agents are working?", "The agent console shows each operator, owner, tools, blockers, evidence, and next action."],
  ["What moved revenue forward?", "Revenue view tracks leads, outreach, calls, demos, Leak Checks, payments, clients, and blocked items."],
  ["What proves completion?", "Evidence review requires URLs, screenshots, commits, logs, transcripts, records, and test output before completion."],
];

export default async function HermesCommandPage() {
  const data = await getHermesLiveDashboardData();
  const summary = data.summary;
  const leadMission = data.missions[0];
  const hasStaleSources = data.sources.some((source) => source.status === "real_data_connected" && source.stale);
  const modeLabel = data.dataMode === "real_data_connected" ? (hasStaleSources ? "LIVE EXPORT STALE" : "LIVE EXPORT") : "MOCK FALLBACK";

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Autonomous company operating layer</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Hermes stays the Co-CEO. OttoServ OS becomes the cockpit.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-gray-300">
              Phase 2 reads allowlisted Hermes operating files server-side, sanitizes them for dashboard use, and keeps the Phase 1 fixtures as fallback. Raw Hermes UI, credentials, prompts, and unrestricted execution endpoints are not exposed.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <StatusPill status={data.dataMode} label={modeLabel} stale={hasStaleSources} />
              <span className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-semibold text-gray-300">
                Parsed {formatTimestamp(data.generatedAt)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[420px]">
            {[
              ["Active agents", summary.activeAgents],
              ["Blocked/gated", summary.blockedAgents],
              ["Approvals waiting", summary.approvalsWaiting],
              ["Critical missions", summary.criticalMissions],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-3xl font-black text-white">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <SourcePanel source={data.sections.loopRunSummary} />
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-400">Source freshness</p>
          <div className="mt-4 grid gap-3">
            {data.sources.map((source) => (
              <div key={source.key} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white">{source.label}</p>
                    <p className="mt-1 font-mono text-xs text-gray-500">{source.fileName}</p>
                  </div>
                  <StatusPill status={source.status} label={sourceStatusLabel(source)} stale={source.stale} />
                </div>
                <p className="mt-3 text-xs text-gray-400">Modified: {formatTimestamp(source.lastModified)}</p>
                <p className="mt-1 text-xs text-gray-400">Parsed: {formatTimestamp(source.lastSuccessfulParseAt)}</p>
                {source.stale ? <p className="mt-2 text-xs font-semibold text-amber-200">Stale data warning: older than 24 hours.</p> : null}
                {source.status !== "real_data_connected" ? <p className="mt-2 text-xs text-red-200">{source.message}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {answerCards.map(([question, answer]) => (
          <div key={question} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-sm font-bold text-white">{question}</p>
            <p className="mt-3 text-sm leading-6 text-gray-400">{answer}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SourcePanel source={data.sections.operatingPlan} />
        <SourcePanel source={data.sections.revenueRisks} />
        <SourcePanel source={data.sections.breaks} />
        <SourcePanel source={data.sections.approvalQueue} />
        <SourcePanel source={data.sections.codexQueue} />
        <SourcePanel source={data.sections.coworkQueue} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl border border-blue-400/20 bg-blue-500/10 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-200">Lead mission</p>
          <h2 className="mt-3 text-2xl font-black text-white">{leadMission.title}</h2>
          <p className="mt-3 text-gray-300">{leadMission.businessObjective}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Assigned agent</p>
              <p className="mt-2 font-semibold text-white">{leadMission.assignedAgent}</p>
            </div>
            <div className="rounded-2xl bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Revenue impact</p>
              <p className="mt-2 font-semibold text-white">{leadMission.revenueImpact}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-400">Phase 1 routes</p>
          <div className="mt-5 grid gap-3">
            <Link href="/os/hermes/agents" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-white hover:border-blue-400/40">
              Open Multi-Agent Console
            </Link>
            <Link href="/os/hermes/missions" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-white hover:border-blue-400/40">
              Open Mission Board
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SourcePanel({ source }: { source: HermesSourceFile }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">{source.fileName}</p>
          <h2 className="mt-2 text-2xl font-black text-white">{source.label}</h2>
        </div>
        <StatusPill status={source.status} label={sourceStatusLabel(source)} stale={source.stale} />
      </div>
      <p className="mt-3 text-xs text-gray-400">Modified: {formatTimestamp(source.lastModified)} · Parsed: {formatTimestamp(source.lastSuccessfulParseAt)}</p>
      {source.stale ? <p className="mt-2 text-sm font-semibold text-amber-200">Stale data warning: this source is older than 24 hours.</p> : null}
      {source.status !== "real_data_connected" ? <p className="mt-4 text-sm text-red-200">{source.message}</p> : null}
      {source.jsonSummary ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {source.jsonSummary.generatedAt ? <Metric label="Generated at" value={source.jsonSummary.generatedAt} /> : null}
          {source.jsonSummary.runId ? <Metric label="Run ID" value={source.jsonSummary.runId} /> : null}
          {source.jsonSummary.counts.map((count) => (
            <Metric key={count.label} label={count.label} value={String(count.value)} />
          ))}
        </div>
      ) : null}
      <div className="mt-5 space-y-4">
        {source.sections.slice(0, 4).map((section) => (
          <div key={section.title} className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <p className="text-sm font-bold text-white">{section.title}</p>
            {section.items.length ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                {section.items.slice(0, 5).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500">No dashboard-safe bullet items parsed.</p>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusPill({ status, label, stale = false }: { status: string; label: string; stale?: boolean }) {
  const className =
    status === "real_data_connected" && !stale
      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
      : status === "using_mock_fallback" || stale
        ? "border-amber-400/40 bg-amber-400/15 text-amber-100"
        : "border-red-400/40 bg-red-500/15 text-red-100";

  return <span className={`rounded-full border px-4 py-2 text-xs font-bold uppercase ${className}`}>{label}</span>;
}

function sourceStatusLabel(source: HermesSourceFile) {
  if (source.status === "real_data_connected" && source.stale) return "LIVE EXPORT STALE";
  if (source.status === "real_data_connected") return "LIVE EXPORT";
  if (source.status === "file_missing") return "EXPORT MISSING";
  if (source.status === "parse_error") return "PARSE ERROR";
  return "MOCK FALLBACK";
}
