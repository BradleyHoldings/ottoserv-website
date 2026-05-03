"use client";

import { useState, useEffect } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { mockProjects, Project } from "@/lib/mockData";
import { getProjects, getToken } from "@/lib/dashboardApi";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-900/40 text-green-400 border border-green-800",
  medium: "bg-yellow-900/40 text-yellow-400 border border-yellow-800",
  high: "bg-red-900/40 text-red-400 border border-red-800",
};

const PROGRESS_COLORS: Record<string, string> = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

const TYPE_ICONS: Record<string, string> = {
  bathroom: "🚿",
  kitchen: "🍳",
  addition: "🏠",
  deck: "🪵",
  basement: "⬇️",
  other: "🔨",
};

const STATUS_FILTER_OPTIONS = ["all", "in_progress", "planning", "complete", "on_hold"];

const PROJECT_PHASES = [
  "Planning", "Estimate", "Contract", "Materials", "Scheduled",
  "In Progress", "Inspection", "Punch List", "Completed",
  "Invoiced", "Paid", "Closed",
];

const DETAIL_TABS = [
  "Overview", "Tasks", "Budget", "Materials", "Labor", "Documents", "Client Comms", "AI Notes",
];

function PhaseTracker({ currentPhase }: { currentPhase: string }) {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const currentIdx = PROJECT_PHASES.findIndex(
    (p) => normalize(p) === normalize(currentPhase)
  );

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-0 min-w-max">
        {PROJECT_PHASES.map((phase, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={phase} className="flex items-center">
              <div
                className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${
                  isCurrent
                    ? "bg-blue-600 text-white"
                    : isPast
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-800 text-gray-600"
                }`}
              >
                {phase}
              </div>
              {i < PROJECT_PHASES.length - 1 && (
                <div className={`w-3 h-0.5 ${i < currentIdx ? "bg-gray-600" : "bg-gray-800"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY_PROJECT_FORM = {
  project_name: "", client_name: "", address: "",
  project_type: "other", start_date: "", target_completion: "", estimated_revenue: "",
};

export default function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [projects, setProjects] = useState(mockProjects);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_PROJECT_FORM);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newProject: Project = {
      id: Date.now().toString(),
      project_name: form.project_name,
      client_name: form.client_name,
      address: form.address,
      project_type: form.project_type,
      status: "planning",
      phase: "Planning",
      start_date: form.start_date,
      target_completion: form.target_completion,
      estimated_revenue: parseFloat(form.estimated_revenue) || 0,
      estimated_cost: 0,
      actual_cost: 0,
      gross_margin: 0,
      percent_complete: 0,
      risk_level: "low",
    };
    setProjects((prev) => [newProject, ...prev]);
    setForm(EMPTY_PROJECT_FORM);
    setShowModal(false);
  }

  useEffect(() => {
    const token = getToken();
    if (token) {
      getProjects(token).then((data) => { if (data) setProjects(data); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  const filtered =
    statusFilter === "all"
      ? projects
      : projects.filter((p) => p.status === statusFilter);

  const totalRevenue = projects.reduce((s, p) => s + p.estimated_revenue, 0);
  const activeCount = projects.filter((p) => p.status === "in_progress").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeCount} active · ${totalRevenue.toLocaleString()} total contract value
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + New Project
        </button>
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-semibold text-lg">New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Project Name *</label>
                <input required type="text" value={form.project_name} onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Client Name *</label>
                  <input required type="text" value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Project Type</label>
                  <select value={form.project_type} onChange={(e) => setForm((f) => ({ ...f, project_type: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="bathroom">Bathroom</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="addition">Addition</option>
                    <option value="deck">Deck</option>
                    <option value="basement">Basement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Target Completion</label>
                  <input type="date" value={form.target_completion} onChange={(e) => setForm((f) => ({ ...f, target_completion: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Contract Value ($)</label>
                <input type="number" value={form.estimated_revenue} onChange={(e) => setForm((f) => ({ ...f, estimated_revenue: e.target.value }))} placeholder="0" className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTER_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "bg-[#111827] text-gray-400 hover:text-white border border-gray-800"
            }`}
          >
            {s === "all" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((project) => {
          const budgetUsedPct =
            project.estimated_cost > 0
              ? Math.round((project.actual_cost / project.estimated_cost) * 100)
              : 0;
          const overBudget = project.actual_cost > project.estimated_cost;

          return (
            <button
              key={project.id}
              onClick={() => { setSelected(project); setActiveTab("Overview"); }}
              className="text-left bg-[#111827] border border-gray-800 rounded-xl p-6 hover:border-blue-800 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {TYPE_ICONS[project.project_type] || TYPE_ICONS.other}
                  </span>
                  <div>
                    <h3 className="text-white font-semibold leading-snug">{project.project_name}</h3>
                    <p className="text-gray-400 text-sm">{project.client_name}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={project.status} />
                  <span className={`text-xs px-2 py-0.5 rounded border ${RISK_COLORS[project.risk_level]}`}>
                    {project.risk_level} risk
                  </span>
                </div>
              </div>

              {/* Phase Tracker */}
              <div className="mb-4 overflow-hidden">
                <PhaseTracker currentPhase={project.phase} />
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-gray-300 font-medium">{project.percent_complete}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${PROGRESS_COLORS[project.risk_level]}`}
                    style={{ width: `${project.percent_complete}%` }}
                  />
                </div>
              </div>

              {/* Budget */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">Budget Used</span>
                  <span className={`font-medium ${overBudget ? "text-red-400" : "text-gray-300"}`}>
                    ${project.actual_cost.toLocaleString()} / $
                    {project.estimated_cost.toLocaleString()}
                    {overBudget && " ⚠️"}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${overBudget ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-500 mb-0.5">Phase</p>
                  <p className="text-gray-300">{project.phase}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Revenue</p>
                  <p className="text-green-400 font-medium">
                    ${project.estimated_revenue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Margin</p>
                  <p className="text-gray-300">{project.gross_margin}%</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-xs text-gray-500">
                <span>Start: {project.start_date}</span>
                <span>Target: {project.target_completion}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Project Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg h-full bg-[#111827] border-l border-gray-800 overflow-y-auto">
            {/* Panel Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-800 sticky top-0 bg-[#111827] z-10">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.project_name}</h2>
                <p className="text-gray-400 text-sm">{selected.id} · {selected.client_name}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Phase Tracker */}
            <div className="px-6 py-4 border-b border-gray-800 overflow-x-auto">
              <PhaseTracker currentPhase={selected.phase} />
            </div>

            {/* Tab Bar */}
            <div className="flex overflow-x-auto border-b border-gray-800">
              {DETAIL_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "Overview" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <StatusBadge status={selected.status} size="md" />
                    <span className={`text-sm px-3 py-1 rounded border ${RISK_COLORS[selected.risk_level]}`}>
                      {selected.risk_level} risk
                    </span>
                  </div>

                  <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                    <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Financials</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Contract Value</span>
                        <span className="text-green-400 font-medium">${selected.estimated_revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Estimated Cost</span>
                        <span className="text-white">${selected.estimated_cost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Actual Cost</span>
                        <span className={selected.actual_cost > selected.estimated_cost ? "text-red-400 font-medium" : "text-white"}>
                          ${selected.actual_cost.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Gross Margin</span>
                        <span className="text-white">{selected.gross_margin}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                    <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Timeline</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Start Date</span>
                        <span className="text-white">{selected.start_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Target Completion</span>
                        <span className="text-white">{selected.target_completion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Current Phase</span>
                        <span className="text-white">{selected.phase}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Address</span>
                        <span className="text-white">{selected.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Completion</span>
                      <span className="text-white font-medium">{selected.percent_complete}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${PROGRESS_COLORS[selected.risk_level]}`}
                        style={{ width: `${selected.percent_complete}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Tasks" && (
                <div className="space-y-2">
                  <p className="text-gray-500 text-sm">Tasks linked to this project will appear here.</p>
                  <div className="bg-[#0f1117] border border-dashed border-gray-700 rounded-xl p-8 text-center">
                    <p className="text-gray-600 text-sm">Connect to Tasks for full task management</p>
                  </div>
                </div>
              )}

              {activeTab === "Budget" && (
                <div className="bg-[#0f1117] border border-dashed border-gray-700 rounded-xl p-8 text-center">
                  <p className="text-2xl mb-2">💵</p>
                  <p className="text-gray-400 text-sm font-medium">Full budget breakdown</p>
                  <p className="text-gray-600 text-xs mt-1">See Job Costing for full cost detail</p>
                </div>
              )}

              {(["Materials", "Labor", "Documents", "Client Comms", "AI Notes"] as const).includes(activeTab as any) && (
                <div className="bg-[#0f1117] border border-dashed border-gray-700 rounded-xl p-8 text-center">
                  <p className="text-2xl mb-2">🔧</p>
                  <p className="text-gray-400 text-sm font-medium">{activeTab}</p>
                  <p className="text-gray-600 text-xs mt-1">Full {activeTab.toLowerCase()} view coming soon</p>
                </div>
              )}

              <button
                className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                onClick={() => window.location.href = `/dashboard/projects/${selected.id}`}
              >
                Open Full Project View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
