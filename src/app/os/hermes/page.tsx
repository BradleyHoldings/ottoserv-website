import Link from "next/link";
import { getHermesCommandSummary, hermesMissions } from "@/lib/hermesCommandCenter";

const answerCards = [
  ["What is Hermes trying to accomplish?", "Move today's revenue-critical missions while keeping high-risk actions behind approval policy."],
  ["Which agents are working?", "The agent console shows each operator, owner, tools, blockers, evidence, and next action."],
  ["What moved revenue forward?", "Revenue view tracks leads, outreach, calls, demos, Leak Checks, payments, clients, and blocked items."],
  ["What proves completion?", "Evidence review requires URLs, screenshots, commits, logs, transcripts, records, and test output before completion."],
];

export default function HermesCommandPage() {
  const summary = getHermesCommandSummary();
  const leadMission = hermesMissions[0];

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
              Phase 1 uses safe mocked fixtures and admin-only UI shells. Raw Hermes UI, credentials, prompts, and unrestricted execution endpoints are not exposed.
            </p>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {answerCards.map(([question, answer]) => (
          <div key={question} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-sm font-bold text-white">{question}</p>
            <p className="mt-3 text-sm leading-6 text-gray-400">{answer}</p>
          </div>
        ))}
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
