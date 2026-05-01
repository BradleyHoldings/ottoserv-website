"use client";

import { useEffect, useState } from "react";
import { platformFetch } from "@/lib/platformApi";

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  event_type: string;
  action: string;
  resource: string;
  risk_level: string;
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-900/40 text-green-400",
  medium: "bg-yellow-900/40 text-yellow-400",
  high: "bg-orange-900/40 text-orange-400",
  critical: "bg-red-900/40 text-red-400",
};

const RISK_DOT: Record<string, string> = {
  low: "bg-green-400",
  medium: "bg-yellow-400",
  high: "bg-orange-400",
  critical: "bg-red-400",
};

const EVENT_TYPES = ["all", "auth", "task", "approval", "agent", "settings", "data"];
const RISK_LEVELS = ["all", "low", "medium", "high", "critical"];

const SELECT_CLASS =
  "bg-[#1f2937] border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors";

export default function PlatformAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    platformFetch("/audit?limit=100")
      .then((r) => r.json())
      .then((data) => {
        setEvents(Array.isArray(data) ? data : (data.events ?? []));
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load audit log.");
        setLoading(false);
      });
  }, []);

  const filtered = events.filter((e) => {
    if (eventTypeFilter !== "all" && e.event_type !== eventTypeFilter) return false;
    if (riskFilter !== "all" && e.risk_level !== riskFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !e.user?.toLowerCase().includes(q) &&
        !e.action?.toLowerCase().includes(q) &&
        !e.resource?.toLowerCase().includes(q) &&
        !e.event_type?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-xl font-bold">Audit Log</h1>
        <p className="text-gray-400 text-sm mt-0.5">Full history of platform activity and agent actions</p>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search user, action, resource..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#1f2937] border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors flex-1 min-w-[200px]"
        />
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className={SELECT_CLASS}
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All Event Types" : t.replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className={SELECT_CLASS}
        >
          {RISK_LEVELS.map((r) => (
            <option key={r} value={r}>
              {r === "all" ? "All Risk Levels" : r.replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        <span className="text-gray-500 text-sm ml-auto shrink-0">
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Risk level legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(RISK_COLORS).map(([level, cls]) => (
          <div key={level} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${RISK_DOT[level]}`} />
            <span className={`text-xs px-2 py-0.5 rounded capitalize ${cls}`}>{level}</span>
          </div>
        ))}
      </div>

      {/* Audit table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading audit log...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No events match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Timestamp</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">User</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Event Type</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Action</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Resource</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event, i) => (
                  <tr
                    key={event.id}
                    className={`border-b border-gray-800 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
                  >
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {event.timestamp
                        ? new Date(event.timestamp).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-white">{event.user || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded capitalize">
                        {event.event_type?.replace(/_/g, " ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{event.action || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{event.resource || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${RISK_DOT[event.risk_level] ?? "bg-gray-500"}`} />
                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${RISK_COLORS[event.risk_level] ?? "bg-gray-800 text-gray-400"}`}>
                          {event.risk_level || "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
