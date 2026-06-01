import { formatHermesLabel, hermesMissions } from "@/lib/hermesCommandCenter";

const priorityStyles: Record<string, string> = {
  critical: "border-red-400/50 bg-red-500/15 text-red-100",
  high: "border-amber-400/50 bg-amber-500/15 text-amber-100",
  medium: "border-blue-400/50 bg-blue-500/15 text-blue-100",
  low: "border-gray-500/40 bg-gray-500/10 text-gray-300",
};

const statusStyles: Record<string, string> = {
  active: "border-blue-400/50 bg-blue-500/15 text-blue-100",
  waiting_for_approval: "border-amber-400/50 bg-amber-400/15 text-amber-100",
  reviewing: "border-violet-400/50 bg-violet-500/15 text-violet-100",
  complete: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
  blocked: "border-red-400/50 bg-red-500/15 text-red-100",
  idle: "border-gray-500/40 bg-gray-500/10 text-gray-300",
  failed: "border-red-500/60 bg-red-600/20 text-red-100",
};

export default function HermesMissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Mission Board</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Business outcomes, not generic tasks</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          Each mission ties an assigned agent to a business objective, approval boundary, required evidence, and revenue impact.
        </p>
      </div>

      <div className="space-y-5">
        {hermesMissions.map((mission) => (
          <article key={mission.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 font-mono text-xs text-gray-300">
                    {mission.id}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityStyles[mission.priority]}`}>
                    {mission.priority}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[mission.status]}`}>
                    {formatHermesLabel(mission.status)}
                  </span>
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-white">{mission.title}</h2>
                <p className="mt-3 max-w-4xl text-base leading-7 text-gray-300">{mission.businessObjective}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4 xl:w-80">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Assigned agent</p>
                <p className="mt-2 text-xl font-black text-white">{mission.assignedAgent}</p>
                <p className="mt-1 text-sm text-gray-400">Assigned by {mission.assignedBy}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <InfoBlock label="Due window" value={mission.dueWindow} />
              <InfoBlock label="Related lead/client/project" value={mission.relatedEntity} />
              <InfoBlock label="Revenue impact" value={mission.revenueImpact} />
              <InfoBlock label="Hermes review result" value={mission.hermesReviewResult} />
              <InfoBlock label="Approval requirement" value={mission.approvalRequirement} />
              <InfoBlock label="Next action" value={mission.nextAction} />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <ListBlock label="Required evidence" items={mission.requiredEvidence} />
              <ListBlock label="Submitted evidence" items={mission.submittedEvidence} empty="No submitted evidence yet" />
              <ListBlock label="Blockers" items={mission.blockers} empty="No current blockers" tone={mission.blockers.length ? "warning" : "default"} />
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
  empty,
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
          <span className="text-sm text-gray-500">{empty || "None"}</span>
        )}
      </div>
    </div>
  );
}
