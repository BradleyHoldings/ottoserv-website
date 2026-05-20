"use client";

import { useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { SOP } from "@/lib/mockData";
import ComingSoonBanner from "@/components/dashboard/ComingSoonBanner";

const CATEGORY_ICONS: Record<string, string> = {
  Sales: "💼",
  Operations: "🔧",
  Quality: "⭐",
  Finance: "💰",
  HR: "👤",
  "Customer Service": "💬",
  Procurement: "📦",
};

export default function SOPsPage() {
  const [sops, setSops] = useState<SOP[]>([]);
  const categories = ["All", ...Array.from(new Set(sops.map((s) => s.category)))];
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newSop, setNewSop] = useState({
    title: "",
    category: "Operations",
    description: "",
    steps: "",
  });

  function createSop(e: React.FormEvent) {
    e.preventDefault();
    const steps = newSop.steps
      .split("\n")
      .map((step) => step.trim())
      .filter(Boolean);
    const nextSop: SOP = {
      id: `SOP-${Date.now()}`,
      title: newSop.title,
      category: newSop.category,
      description: newSop.description,
      steps,
      status: "draft",
      version: "1.0",
      last_updated: new Date().toISOString().slice(0, 10),
    };
    setSops((prev) => [nextSop, ...prev]);
    setExpanded(nextSop.id);
    setShowModal(false);
    setNewSop({ title: "", category: "Operations", description: "", steps: "" });
  }

  const filtered = sops.filter((s) => {
    const catOk = categoryFilter === "All" || s.category === categoryFilter;
    const searchOk =
      !search.trim() ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  const activeCount = sops.filter((s) => s.status === "active").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">SOPs</h1>
      <ComingSoonBanner />

          <p className="text-gray-500 text-sm mt-1">
            {activeCount} active · {sops.length} total standard operating procedures
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-gray-700 bg-[#111827] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-lg">New SOP</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={createSop} className="space-y-4">
              <input required value={newSop.title} onChange={(e) => setNewSop((prev) => ({ ...prev, title: e.target.value }))} placeholder="SOP title" className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
              <select value={newSop.category} onChange={(e) => setNewSop((prev) => ({ ...prev, category: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                {Object.keys(CATEGORY_ICONS).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <textarea required value={newSop.description} onChange={(e) => setNewSop((prev) => ({ ...prev, description: e.target.value }))} rows={3} placeholder="What this SOP covers" className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm resize-none" />
              <textarea required value={newSop.steps} onChange={(e) => setNewSop((prev) => ({ ...prev, steps: e.target.value }))} rows={5} placeholder="One step per line" className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm resize-none" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Create SOP</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
