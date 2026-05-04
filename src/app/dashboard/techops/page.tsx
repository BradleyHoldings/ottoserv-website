"use client";

import Link from "next/link";
import { mockTechOpsTickets, mockTechOpsStats } from "@/lib/mockData";
import KpiCard from "@/components/dashboard/KpiCard";
import StatusBadge from "@/components/dashboard/StatusBadge";

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-900/40 text-green-400 border-green-800",
  medium: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  high: "bg-red-900/40 text-red-400 border-red-800",
};

function categoryBreakdown() {
  const counts: Record<string, number> = {};
  for (const t of mockTechOpsTickets) {
    counts[t.category] = (counts[t.category] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export default function TechOpsDashboard() {
  const stats = mockTechOpsStats;
  const recent = [...mockTechOpsTickets].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const breakdown = categoryBreakdown();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">TechOps</h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered tech support hub</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/techops/submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Submit Request
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KpiCard value={stats.open} label="Open Tickets" color="blue" />
        <KpiCard value={stats.resolved_ai} label="Resolved by AI" color="green" />
        <KpiCard value={stats.escalated} label="Escalated" color="red" />
        <KpiCard value={stats.dispatch_needed} label="Dispatch Needed" color="yellow" />
        <KpiCard value={`${stats.avg_response_minutes}m`} label="Avg Response" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Tickets */}
        <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-xl overflow-hidden" data-demo-target="techops-tickets">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="text-white font-semibold">Recent Tickets</h2>
            <Link href="/dashboard/techops/tickets" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-gray-800">
            {recent.map((ticket) => (
              <div key={ticket.id} className="px-5 py-3 hover:bg-[#1a2332] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-gray-500 text-xs font-mono">{ticket.id}</span>
                      <span className={`text-xs font-semibold uppercase ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-white text-sm truncate">{ticket.client} — {ticket.subcategory}</p>
                    <p className="text-gray-500 text-xs truncate">{ticket.site}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <StatusBadge status={ticket.status} />
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${RISK_COLORS[ticket.risk]}`}>
                      {ticket.risk} risk
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Category Breakdown */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">By Category</h2>
            <div className="space-y-2">
              {breakdown.map(([cat, count]) => {
                const pct = Math.round((count / mockTechOpsTickets.length) * 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 truncate">{cat}</span>
                      <span className="text-gray-500 flex-shrink-0 ml-2">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full">
                      <div
                        className="h-1.5 bg-blue-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard/techops/submit"
                className="flex items-center gap-3 px-4 py-3 bg-blue-600/10 border border-blue-600/30 rounded-lg text-blue-400 hover:bg-blue-600/20 transition-colors text-sm font-medium"
              >
                <span>🎫</span> Submit Request
              </Link>
              <Link
                href="/dashboard/techops/kb"
                className="flex items-center gap-3 px-4 py-3 bg-[#0f1117] border border-gray-800 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a2332] transition-colors text-sm font-medium"
              >
                <span>📚</span> View Knowledge Base
              </Link>
              <Link
                href="/dashboard/techops/tickets"
                className="flex items-center gap-3 px-4 py-3 bg-[#0f1117] border border-gray-800 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a2332] transition-colors text-sm font-medium"
              >
                <span>📋</span> Manage Tickets
              </Link>
              <Link
                href="/dashboard/techops/dispatch"
                className="flex items-center gap-3 px-4 py-3 bg-[#0f1117] border border-gray-800 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a2332] transition-colors text-sm font-medium"
              >
                <span>📦</span> Dispatch Packets
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
