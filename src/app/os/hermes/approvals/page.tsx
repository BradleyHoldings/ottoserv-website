import { hermesApprovals } from "@/lib/hermesCommandCenter";

export default function HermesApprovalsPage() {
  return (
    <ShellPage
      eyebrow="Approval Center"
      title="Approval queue, not direct execution"
      description="Approval decisions will write to a Hermes-readable queue in Phase 2. Buttons are intentionally inert in Phase 1 so high-risk actions cannot bypass Hermes."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {hermesApprovals.map((approval) => (
          <article key={approval.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-xs text-gray-500">{approval.id}</p>
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase text-amber-100">
                {approval.riskLevel}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-black text-white">{approval.requestedAction}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">{approval.reason}</p>
            <div className="mt-4 grid gap-3">
              <Info label="Expected business outcome" value={approval.expectedBusinessOutcome} />
              <Info label="What approval unlocks" value={approval.unlocks} />
              <Info label="Approval type" value={approval.approvalType.replace(/_/g, " ")} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-100" type="button">
                Approve
              </button>
              <button className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-100" type="button">
                Reject
              </button>
              <button className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-200" type="button">
                Request revision
              </button>
            </div>
          </article>
        ))}
      </div>
    </ShellPage>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-gray-100">{value}</p>
    </div>
  );
}

function ShellPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">{description}</p>
      </div>
      {children}
    </div>
  );
}
