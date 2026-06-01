import { hermesRevenueMetrics } from "@/lib/hermesCommandCenter";

export default function HermesRevenuePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300">Revenue Command View</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">What moved revenue forward today</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          Phase 1 shows the revenue spine as mocked structured data. Phase 2 can sync Hermes daily loop outputs and revenue events server-side.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {hermesRevenueMetrics.map((metric) => (
          <article key={metric.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{metric.label}</p>
            <p className="mt-3 text-4xl font-black text-white">{metric.value}</p>
            <p className="mt-2 text-sm font-semibold text-blue-200">{metric.movement}</p>
          </article>
        ))}
      </div>
      <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
        <p className="text-sm font-bold text-amber-100">Blocked revenue items</p>
        <p className="mt-2 text-sm leading-6 text-amber-50/80">
          Outreach sends and payment links are readying, but both remain approval-gated until Hermes receives explicit approval decisions.
        </p>
      </div>
    </div>
  );
}
