"use client";

import { useState } from "react";
import Link from "next/link";
import { mockTechOpsTickets, TechOpsTicket } from "@/lib/mockData";
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

const EVENT_ICONS: Record<string, string> = {
  created: "🎫",
  ai_diagnosis: "🤖",
  remote_attempt: "💻",
  escalated: "⚠️",
  dispatched: "🚚",
  resolved: "✅",
  note: "📝",
};

const STATUS_OPTIONS = ["all", "open", "in_progress", "resolved", "escalated", "closed"] as const;
const PRIORITY_OPTIONS = ["all", "low", "medium", "high", "critical"] as const;

export default function TicketsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selected, setSelected] = useState<TechOpsTicket | null>(null);

  const filtered = mockTechOpsTickets.filter((t) => {
    const matchSearch =
      !search ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.client.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.subcategory.toLowerCase().includes(search.toLowerCase()) ||
      t.contact.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/techops" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Back to TechOps
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tickets</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} tickets</p>
        </div>
        <Link
          href="/dashboard/techops/submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Submit Request
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#111827] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-56"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#111827] border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All Statuses" : s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-[#111827] border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p === "all" ? "All Priorities" : p}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Ticket</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">Priority</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Risk</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Assigned</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden xl:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">No tickets match your filters.</td>
                </tr>
              )}
              {filtered.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className="hover:bg-[#1a2332] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-blue-400 font-mono text-xs">{ticket.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium truncate max-w-[140px]">{ticket.client}</p>
                    <p className="text-gray-500 text-xs truncate max-w-[140px]">{ticket.contact}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-gray-300 text-xs truncate max-w-[160px]">{ticket.category}</p>
                    <p className="text-gray-500 text-xs truncate max-w-[160px]">{ticket.subcategory}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs font-semibold capitalize ${PRIORITY_COLORS[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${RISK_COLORS[ticket.risk]}`}>
                      {ticket.risk}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">{ticket.assigned}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-gray-500 text-xs">{ticket.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg h-full bg-[#111827] border-l border-gray-800 overflow-y-auto">
            <div className="sticky top-0 bg-[#111827] border-b border-gray-800 px-6 py-4 flex items-start justify-between z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-400 font-mono text-sm">{selected.id}</span>
                  <StatusBadge status={selected.status} />
                </div>
                <h2 className="text-white font-bold">{selected.client}</h2>
                <p className="text-gray-400 text-sm">{selected.site}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-xl leading-none ml-4">×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Info */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Details</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ["Contact", selected.contact],
                    ["Category", `${selected.category} → ${selected.subcategory}`],
                    ["Device", selected.device],
                    ["Urgency", selected.urgency],
                    ["Assigned", selected.assigned],
                    ["Updated", selected.updated_at],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-gray-500 flex-shrink-0">{k}</span>
                      <span className="text-gray-300 text-right">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 flex-shrink-0">Priority</span>
                    <span className={`font-semibold capitalize ${PRIORITY_COLORS[selected.priority]}`}>{selected.priority}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 flex-shrink-0">Risk</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${RISK_COLORS[selected.risk]}`}>{selected.risk}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-2">Description</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{selected.description}</p>
                {selected.error_message && (
                  <div className="mt-3 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                    <p className="text-red-400 text-xs font-mono">{selected.error_message}</p>
                  </div>
                )}
              </div>

              {/* Flags */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Flags</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.remote_access && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-900/30 border border-blue-800 text-blue-400">Remote Access</span>
                  )}
                  {selected.business_critical && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-900/30 border border-red-800 text-red-400">Business Critical</span>
                  )}
                  {selected.happened_before && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-900/30 border border-yellow-800 text-yellow-400">Recurring</span>
                  )}
                  {selected.preferred_window && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400">{selected.preferred_window}</span>
                  )}
                </div>
              </div>

              {/* Events Timeline */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Timeline</h3>
                <div className="space-y-3">
                  {selected.events.map((ev) => (
                    <div key={ev.id} className="flex gap-3">
                      <span className="text-base flex-shrink-0">{EVENT_ICONS[ev.type] ?? "📌"}</span>
                      <div>
                        <p className="text-gray-300 text-xs leading-snug">{ev.message}</p>
                        <p className="text-gray-600 text-xs mt-0.5">{ev.actor} · {ev.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispatch link */}
              {selected.dispatch_packet_id && (
                <Link
                  href="/dashboard/techops/dispatch"
                  className="flex items-center gap-2 px-4 py-3 bg-purple-900/20 border border-purple-800/40 rounded-lg text-purple-400 hover:bg-purple-900/30 transition-colors text-sm font-medium"
                >
                  <span>📦</span> View Dispatch Packet {selected.dispatch_packet_id}
                </Link>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button className="w-full py-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-700/40 text-green-400 text-sm font-medium rounded-lg transition-colors">
                  Mark Resolved
                </button>
                <button className="w-full py-2.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-700/40 text-orange-400 text-sm font-medium rounded-lg transition-colors">
                  Escalate to Human
                </button>
                <button className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
                  Close Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
