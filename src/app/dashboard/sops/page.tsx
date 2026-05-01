"use client";

import { useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { mockSOPs, SOP } from "@/lib/mockData";

const CATEGORY_ICONS: Record<string, string> = {
  Sales: "💼",
  Operations: "🔧",
  Quality: "⭐",
  Finance: "💰",
  HR: "👤",
  "Customer Service": "💬",
  Procurement: "📦",
};

const categories = ["All", ...Array.from(new Set(mockSOPs.map((s) => s.category)))];

export default function SOPsPage() {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = mockSOPs.filter((s) => {
    const catOk = categoryFilter === "All" || s.category === categoryFilter;
    const searchOk =
      !search.trim() ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  const activeCount = mockSOPs.filter((s) => s.status === "active").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">SOPs</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeCount} active · {mockSOPs.length} total standard operating procedures
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + New SOP
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SOPs…"
          className="bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500 placeholder:text-gray-500 w-full max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-blue-600 text-white"
                  : "bg-[#111827] text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              {cat !== "All" && (CATEGORY_ICONS[cat] ?? "📄")} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* SOP List */}
      <div className="space-y-3">
        {filtered.map((sop) => {
          const isOpen = expanded === sop.id;
          return (
            <div key={sop.id} className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => setExpanded(isOpen ? null : sop.id)}
                className="w-full text-left px-6 py-4 flex items-start gap-4 hover:bg-[#1a2230] transition-colors"
              >
                <span className="text-xl flex-shrink-0 mt-0.5">
                  {CATEGORY_ICONS[sop.category] ?? "📄"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="text-white font-semibold">{sop.title}</h3>
                    <StatusBadge status={sop.status} />
                    <span className="text-gray-500 text-xs">v{sop.version}</span>
                  </div>
                  <p className="text-gray-400 text-sm">{sop.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span className="bg-gray-800 px-2 py-0.5 rounded">{sop.category}</span>
                    <span>{sop.steps.length} steps</span>
                    <span>Updated {sop.last_updated}</span>
                  </div>
                </div>
                <span className="text-gray-500 flex-shrink-0 text-lg mt-0.5">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {/* Expanded steps */}
              {isOpen && (
                <div className="px-6 pb-5 border-t border-gray-800">
                  <div className="mt-4">
                    <h4 className="text-gray-400 text-xs font-medium uppercase mb-3">
                      Steps
                    </h4>
                    <ol className="space-y-2">
                      {sop.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs flex items-center justify-center flex-shrink-0 font-medium mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-gray-300 text-sm leading-snug">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="px-4 py-2 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg border border-gray-700 transition-colors">
                      Edit SOP
                    </button>
                    <button className="px-4 py-2 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg border border-gray-700 transition-colors">
                      Export PDF
                    </button>
                    <button className="px-4 py-2 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg border border-gray-700 transition-colors">
                      Share
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-white font-medium">No SOPs match your search</p>
          <p className="text-gray-500 text-sm mt-1">Try a different category or keyword</p>
        </div>
      )}
    </div>
  );
}
