"use client";

import { useEffect, useState } from "react";
import type { LeadSupply } from "@/lib/dashboardApi";
import { getLeadSupply } from "@/lib/dashboardApi";

export default function LeadSupplyTile() {
  const [data, setData] = useState<LeadSupply | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await getLeadSupply();
      if (alive) {
        setData(d);
        setLoading(false);
      }
    })();
    const id = setInterval(async () => {
      const d = await getLeadSupply();
      if (alive && d) setData(d);
    }, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 animate-pulse">
        <div className="h-4 w-32 bg-gray-800 rounded mb-3" />
        <div className="h-8 w-24 bg-gray-800 rounded" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
        <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold">Lead supply today</p>
        <p className="text-gray-400 mt-2 text-sm">Log in to platform to see live data.</p>
      </div>
    );
  }

  const pct = Math.min(100, data.attainmentPct);
  const pctColor =
    pct >= 100 ? "bg-emerald-500" : pct >= 75 ? "bg-blue-500" : pct >= 50 ? "bg-yellow-500" : "bg-orange-500";

  const sourceRows = Object.entries(data.bySource)
    .map(([src, byStatus]) => {
      const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
      const completed = (byStatus.completed || 0) + (byStatus.dispatched || 0);
      const blocked = byStatus.blocked || 0;
      const failed = byStatus.failed || 0;
      return { src, total, completed, blocked, failed };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold">
          Lead supply today {data.scope === "platform" ? "· platform-wide" : ""}
        </p>
        <p className="text-xs text-gray-500">target: {data.targetPerDay}/day</p>
      </div>

      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-3xl font-bold text-white">{data.attained}</span>
        <span className="text-gray-400 text-sm">/ {data.targetPerDay}</span>
        <span className={`text-sm font-semibold ${pct >= 75 ? "text-emerald-400" : pct >= 50 ? "text-yellow-400" : "text-orange-400"}`}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded overflow-hidden mb-4">
        <div className={`h-full ${pctColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm mb-4">
        <Stat label="Calls" value={data.totalsToday.calls} />
        <Stat label="Failed" value={data.totalsToday.failed} tone={data.totalsToday.failed > 0 ? "warn" : "neutral"} />
        <Stat label="Blocked (dedup)" value={data.dedupBlocked} tone={data.dedupBlocked >= 3 ? "warn" : "neutral"} />
      </div>

      {data.dedupBlocked >= 3 ? (
        <div className="bg-orange-900/30 border border-orange-700 text-orange-200 text-xs px-3 py-2 rounded mb-3">
          Thin lead pool signal: {data.dedupBlocked} dial(s) blocked by 7-day dedup today. Cowork may need a supplemental source.
        </div>
      ) : null}

      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">By source</p>
        <ul className="space-y-1">
          {sourceRows.length === 0 ? (
            <li className="text-gray-500 text-sm">No calls today.</li>
          ) : (
            sourceRows.map((r) => (
              <li key={r.src} className="flex justify-between text-sm">
                <span className="text-gray-300">{r.src}</span>
                <span className="text-gray-400">
                  {r.completed}<span className="text-gray-600"> ok</span>
                  {r.blocked ? <> · {r.blocked}<span className="text-gray-600"> blk</span></> : null}
                  {r.failed ? <> · <span className="text-orange-400">{r.failed} fail</span></> : null}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "warn" }) {
  const color = tone === "warn" ? "text-orange-400" : "text-white";
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
