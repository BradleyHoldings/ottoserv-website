import { hermesEvidence } from "@/lib/hermesCommandCenter";

export default function HermesEvidencePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Evidence Review</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Completion requires proof</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          Tracks commit hashes, screenshots, URLs, send results, call logs, transcripts, record IDs, Stripe IDs, n8n executions, before/after status, and test output.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {hermesEvidence.map((item) => (
          <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-xs text-gray-500">{item.id}</p>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold uppercase text-gray-300">
                {item.reviewStatus.replace(/_/g, " ")}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-black text-white">{item.type}</h2>
            <p className="mt-2 text-sm text-blue-200">{item.sourceAgent} · {item.missionId}</p>
            <p className="mt-3 text-sm leading-6 text-gray-300">{item.summary}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">{item.submittedAt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
