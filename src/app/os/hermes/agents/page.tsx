import { formatHermesLabel, hermesAgents } from "@/lib/hermesCommandCenter";

const statusStyles: Record<string, string> = {
  idle: "border-gray-500/40 bg-gray-500/10 text-gray-300",
  active: "border-blue-400/50 bg-blue-500/15 text-blue-100",
  blocked: "border-red-400/50 bg-red-500/15 text-red-100",
  waiting_for_approval: "border-amber-400/50 bg-amber-400/15 text-amber-100",
  complete: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
  failed: "border-red-500/60 bg-red-600/20 text-red-100",
};

const riskStyles: Record<string, string> = {
  low: "text-emerald-300",
  medium: "text-blue-300",
  high: "text-amber-300",
  critical: "text-red-300",
};

export default function HermesAgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300">Multi-Agent Console</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Agents under Hermes command</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          See who is working, who assigned the mission, what evidence is required, what is blocked, and what revenue outcome the work supports.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {hermesAgents.map((agent) => (
          <article key={agent.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black text-white">{agent.name}</h2>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[agent.status]}`}>
                    {formatHermesLabel(agent.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-blue-200">{agent.role}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">{agent.type}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Risk</p>
                <p className={`mt-1 font-black uppercase ${riskStyles[agent.riskLevel]}`}>{agent.riskLevel}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InfoBlock label="Current mission" value={agent.currentMission} />
              <InfoBlock label="Current task" value={agent.currentTask} />
              <InfoBlock label="Assigned by" value={agent.assignedBy} />
              <InfoBlock label="Owner / orchestrator" value={agent.owner} />
              <InfoBlock label="Last activity" value={agent.lastActivity} />
              <InfoBlock label="Revenue impact" value={agent.revenueImpact} />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ListBlock label="Tools allowed" items={agent.toolsAllowed} />
              <ListBlock label="Evidence required" items={agent.evidenceRequired} />
              <ListBlock label="Evidence submitted" items={agent.evidenceSubmitted} empty="No evidence submitted yet" />
              <ListBlock label="Blockers" items={agent.blockers} empty="No current blockers" tone={agent.blockers.length ? "warning" : "default"} />
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Next action</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white">{agent.nextAction}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-gray-100">{value}</p>
    </div>
  );
}

function ListBlock({
  label,
  items,
  empty = "None",
  tone = "default",
}: {
  label: string;
  items: string[];
  empty?: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === "warning" ? "border-amber-400/20 bg-amber-400/10" : "border-white/10 bg-white/[0.03]"}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span key={item} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-gray-200">
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-500">{empty}</span>
        )}
      </div>
    </div>
  );
}
