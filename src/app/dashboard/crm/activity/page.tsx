"use client";

import { useState, useMemo } from "react";
import { mockCRMActivities, CRMActivity } from "@/lib/mockData";

const ACTIVITY_ICONS: Record<string, string> = {
  call: "📞",
  email: "📧",
  meeting: "🤝",
  note: "📝",
  task_completed: "✅",
  deal_stage_change: "🔄",
  lead_created: "➕",
  ai_action: "🤖",
};

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-900/40 text-blue-400 border-blue-800",
  email: "bg-indigo-900/40 text-indigo-400 border-indigo-800",
  meeting: "bg-purple-900/40 text-purple-400 border-purple-800",
  note: "bg-gray-800 text-gray-400 border-gray-700",
  task_completed: "bg-green-900/40 text-green-400 border-green-800",
  deal_stage_change: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  lead_created: "bg-blue-900/40 text-blue-400 border-blue-800",
  ai_action: "bg-orange-900/40 text-orange-400 border-orange-800",
};

const TYPE_LABELS: Record<string, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  task_completed: "Task",
  deal_stage_change: "Stage Change",
  lead_created: "Lead Created",
  ai_action: "AI Action",
};

const ACTIVITY_TYPES = [
  "call",
  "email",
  "meeting",
  "note",
  "task_completed",
  "deal_stage_change",
  "lead_created",
  "ai_action",
] as const;

const DATE_RANGES = [
  { label: "All time", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
];

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isSameDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

export default function ActivityPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [contactFilter, setContactFilter] = useState("");
  const [dateRange, setDateRange] = useState(0);

  const allContacts = useMemo(() => {
    const names = mockCRMActivities
      .map((a) => a.contact_name)
      .filter(Boolean) as string[];
    return [...new Set(names)].sort();
  }, []);

  const cutoff = useMemo(() => {
    if (!dateRange) return null;
    const d = new Date("2026-04-30T23:59:59Z");
    d.setDate(d.getDate() - dateRange);
    return d.toISOString();
  }, [dateRange]);

  const filtered = useMemo(() => {
    return mockCRMActivities.filter((a) => {
      const matchType = typeFilter === "all" || a.type === typeFilter;
      const matchContact =
        !contactFilter || a.contact_name === contactFilter;
      const matchDate = !cutoff || a.timestamp >= cutoff;
      return matchType && matchContact && matchDate;
    });
  }, [typeFilter, contactFilter, cutoff]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: string; activities: CRMActivity[] }[] = [];
    for (const act of filtered) {
      const dateKey = act.timestamp.slice(0, 10);
      const last = groups[groups.length - 1];
      if (!last || !isSameDay(last.date, dateKey)) {
        groups.push({ date: dateKey, activities: [act] });
      } else {
        last.activities.push(act);
      }
    }
    return groups;
  }, [filtered]);

  const hasFilters =
    typeFilter !== "all" || contactFilter !== "" || dateRange !== 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Timeline</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} of {mockCRMActivities.length} activities
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Log Activity
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Type filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              typeFilter === "all"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300"
            }`}
          >
            All
          </button>
          {ACTIVITY_TYPES.map((type) => {
            const count = mockCRMActivities.filter(
              (a) => a.type === type
            ).length;
            return (
              <button
                key={type}
                onClick={() =>
                  setTypeFilter(typeFilter === type ? "all" : type)
                }
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  typeFilter === type
                    ? ACTIVITY_TYPE_COLORS[type]
                    : "bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300"
                }`}
              >
                <span>{ACTIVITY_ICONS[type]}</span>
                <span>{TYPE_LABELS[type]}</span>
                <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Contact filter */}
        <select
          value={contactFilter}
          onChange={(e) => setContactFilter(e.target.value)}
          className="bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        >
          <option value="">All Contacts</option>
          {allContacts.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
          {DATE_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDateRange(r.days)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                dateRange === r.days
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={() => {
              setTypeFilter("all");
              setContactFilter("");
              setDateRange(0);
            }}
            className="text-gray-500 hover:text-white text-sm"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-600 text-sm">
            No activities match your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.date}>
              {/* Date divider */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-800" />
                <span className="text-gray-500 text-xs font-medium whitespace-nowrap">
                  {formatDate(group.date)}
                </span>
                <div className="h-px flex-1 bg-gray-800" />
              </div>

              {/* Activities for this day */}
              <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
                {group.activities.map((act, i) => (
                  <div
                    key={act.id}
                    className={`flex items-start gap-4 p-4 ${
                      i < group.activities.length - 1
                        ? "border-b border-gray-800"
                        : ""
                    }`}
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
                      {ACTIVITY_ICONS[act.type] || "📌"}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 text-sm leading-snug">
                        {act.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {act.contact_name && (
                          <span className="text-gray-500 text-xs">
                            👤 {act.contact_name}
                          </span>
                        )}
                        {act.company_name && (
                          <span className="text-gray-600 text-xs">
                            · 🏢 {act.company_name}
                          </span>
                        )}
                        {act.deal_name && (
                          <span className="text-gray-600 text-xs truncate max-w-[180px]">
                            · 💰 {act.deal_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex-shrink-0 text-right space-y-1">
                      <p className="text-gray-600 text-xs whitespace-nowrap">
                        {formatTimestamp(act.timestamp)}
                      </p>
                      <span
                        className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${
                          ACTIVITY_TYPE_COLORS[act.type] ||
                          "bg-gray-800 text-gray-400 border-gray-700"
                        }`}
                      >
                        {ACTIVITY_ICONS[act.type]}{" "}
                        {TYPE_LABELS[act.type] || act.type}
                      </span>
                      <p className="text-gray-600 text-xs">{act.user_or_agent}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
