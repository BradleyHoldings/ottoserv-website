"use client";

import { use, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/dashboard/StatusBadge";
import {
  mockProjects,
  mockTasks,
  mockMaterials,
  mockExpenses,
  Project,
} from "@/lib/mockData";

const PROJECT_PHASES = [
  "Planning", "Estimate", "Contract", "Materials", "Scheduled",
  "In Progress", "Inspection", "Punch List", "Completed",
  "Invoiced", "Paid", "Closed",
];

const DETAIL_TABS = [
  "Overview", "Tasks", "Budget", "Materials", "Labor", "Documents", "Client Comms", "AI Notes",
];

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-900/40 text-green-400 border border-green-800",
  medium: "bg-yellow-900/40 text-yellow-400 border border-yellow-800",
  high: "bg-red-900/40 text-red-400 border border-red-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-900/40 text-red-400 border border-red-800",
  high: "bg-orange-900/40 text-orange-400 border border-orange-800",
  medium: "bg-yellow-900/40 text-yellow-400 border border-yellow-800",
  low: "bg-gray-800 text-gray-400 border border-gray-700",
};

const MOCK_LABOR: Record<
  string,
  { worker: string; date: string; hours: number; rate: number; description: string }[]
> = {
  "PRJ-001": [
    { worker: "Jake", date: "2026-04-22", hours: 8, rate: 65, description: "Tile demo and prep" },
    { worker: "Jake", date: "2026-04-23", hours: 7.5, rate: 65, description: "Shower pan liner install" },
    { worker: "Owner", date: "2026-04-24", hours: 4, rate: 85, description: "Plumbing rough-in" },
    { worker: "Jake", date: "2026-04-25", hours: 8, rate: 65, description: "Wall tile installation" },
    { worker: "Owner", date: "2026-04-28", hours: 6, rate: 85, description: "Fixture connections" },
  ],
  "PRJ-002": [
    { worker: "Jake", date: "2026-04-16", hours: 8, rate: 65, description: "Cabinet installation" },
    { worker: "Owner", date: "2026-04-17", hours: 8, rate: 85, description: "Electrical rough-in" },
    { worker: "Jake", date: "2026-04-18", hours: 7, rate: 65, description: "Lower cabinet install" },
    { worker: "Owner", date: "2026-04-20", hours: 5, rate: 85, description: "Plumbing stub-outs" },
    { worker: "Jake", date: "2026-04-22", hours: 8, rate: 65, description: "Tile backsplash prep" },
  ],
  "PRJ-003": [
    { worker: "Owner", date: "2026-05-05", hours: 3, rate: 85, description: "Permit submission" },
  ],
  "PRJ-004": [
    { worker: "Jake", date: "2026-03-10", hours: 8, rate: 65, description: "Demo day" },
    { worker: "Owner", date: "2026-03-11", hours: 6, rate: 85, description: "Plumbing updates" },
    { worker: "Jake", date: "2026-03-15", hours: 8, rate: 65, description: "Tile work" },
    { worker: "Owner", date: "2026-03-20", hours: 4, rate: 85, description: "Final connections" },
  ],
};

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

function getBudgetRows(project: Project) {
  const e = project.estimated_cost;
  const a = project.actual_cost;
  const splits = { Labor: 0.40, Materials: 0.35, Subcontractors: 0.15, Equipment: 0.05, Overhead: 0.05 };
  return Object.entries(splits).map(([label, pct]) => ({
    label,
    est: Math.round(e * pct),
    act: Math.round(a * pct),
  }));
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("Overview");

  const project = mockProjects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-gray-400 text-lg mb-4">Project not found</p>
        <Link href="/dashboard/projects" className="text-blue-400 hover:text-blue-300 text-sm">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const projectTasks = mockTasks.filter((t) => t.project_id === project.id);
  const projectMaterials = mockMaterials.filter((m) => m.project_id === project.id);
  const projectExpenses = mockExpenses.filter((e) => e.project_id === project.id);
  const laborEntries = MOCK_LABOR[project.id] ?? [];
  const budgetRows = getBudgetRows(project);
  const overBudget = project.actual_cost > project.estimated_cost;
  const estimatedProfit = project.estimated_revenue - project.estimated_cost;
  const projectedProfit = project.estimated_revenue - project.actual_cost;

  const laborByWorker: Record<string, { hours: number; cost: number }> = {};
  laborEntries.forEach((e) => {
    if (!laborByWorker[e.worker]) laborByWorker[e.worker] = { hours: 0, cost: 0 };
    laborByWorker[e.worker].hours += e.hours;
    laborByWorker[e.worker].cost += e.hours * e.rate;
  });
  const totalLaborHours = laborEntries.reduce((s, e) => s + e.hours, 0);
  const totalLaborCost = laborEntries.reduce((s, e) => s + e.hours * e.rate, 0);

  const progressColor =
    project.risk_level === "high"
      ? "bg-red-500"
      : project.risk_level === "medium"
      ? "bg-yellow-500"
      : "bg-blue-500";

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/dashboard/projects" className="text-gray-500 hover:text-white transition-colors">
          ← Projects
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300 font-medium">{project.project_name}</span>
      </div>

      {/* Project Header Card */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{project.project_name}</h1>
            <p className="text-gray-400 text-sm">{project.client_name} · {project.address}</p>
            <p className="text-gray-600 text-xs mt-0.5">{project.id}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <StatusBadge status={project.status} size="md" />
            <span className={`text-xs px-2 py-0.5 rounded border ${RISK_COLORS[project.risk_level]}`}>
              {project.risk_level} risk
            </span>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-gray-500 text-xs font-medium uppercase mb-2">Phase Tracker</p>
          <PhaseTracker currentPhase={project.phase} />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Completion</span>
            <span className="text-white font-semibold">{project.percent_complete}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${progressColor}`}
              style={{ width: `${project.percent_complete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex overflow-x-auto border-b border-gray-800 mb-6">
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

      {/* ── Overview ── */}
      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h3 className="text-gray-400 text-xs font-medium uppercase mb-4">Financial Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Contract Value</span>
                <span className="text-green-400 font-semibold">${project.estimated_revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated Cost</span>
                <span className="text-white">${project.estimated_cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Actual Cost</span>
                <span className={overBudget ? "text-red-400 font-medium" : "text-white"}>
                  ${project.actual_cost.toLocaleString()}
                  {overBudget && " ⚠️"}
                </span>
              </div>
              <div className="border-t border-gray-800 pt-3 flex justify-between">
                <span className="text-gray-500">Gross Margin</span>
                <span className="text-white">{project.gross_margin}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated Profit</span>
                <span className={estimatedProfit >= 0 ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                  ${estimatedProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h3 className="text-gray-400 text-xs font-medium uppercase mb-4">Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Start Date</span>
                <span className="text-white">{project.start_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Target Completion</span>
                <span className="text-white">{project.target_completion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Phase</span>
                <span className="text-white">{project.phase}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Project Type</span>
                <span className="text-white capitalize">{project.project_type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Risk Level</span>
                <span className={`text-xs px-2 py-0.5 rounded border ${RISK_COLORS[project.risk_level]}`}>
                  {project.risk_level} risk
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tasks ── */}
      {activeTab === "Tasks" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-400 text-sm">{projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""}</p>
            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              + Add Task
            </button>
          </div>
          {projectTasks.length === 0 ? (
            <div className="bg-[#111827] border border-dashed border-gray-700 rounded-xl p-10 text-center">
              <p className="text-gray-500 text-sm">No tasks for this project yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projectTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-[#111827] border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between gap-4 hover:border-gray-700 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">{task.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {task.assigned_to} · Due {task.due_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={task.status} />
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${
                        PRIORITY_COLORS[task.priority] ?? "bg-gray-800 text-gray-400 border-gray-700"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Budget ── */}
      {activeTab === "Budget" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">Contract Value</p>
              <p className="text-green-400 text-xl font-bold">${project.estimated_revenue.toLocaleString()}</p>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">Estimated Cost</p>
              <p className="text-white text-xl font-bold">${project.estimated_cost.toLocaleString()}</p>
            </div>
            <div
              className={`border rounded-xl p-4 text-center ${
                overBudget ? "bg-red-900/20 border-red-800" : "bg-[#111827] border-gray-800"
              }`}
            >
              <p className="text-gray-500 text-xs mb-1">Actual Cost to Date</p>
              <p className={`text-xl font-bold ${overBudget ? "text-red-400" : "text-white"}`}>
                ${project.actual_cost.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 px-5 py-3 border-b border-gray-800 text-xs text-gray-500 font-medium uppercase tracking-wide">
              <span>Category</span>
              <span className="text-right">Estimated</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Variance</span>
            </div>
            {budgetRows.map((row) => {
              const variance = row.act - row.est;
              const over = variance > 0;
              const noSpend = row.act === 0;
              return (
                <div
                  key={row.label}
                  className="grid grid-cols-4 px-5 py-3.5 border-b border-gray-800 last:border-0 text-sm hover:bg-gray-800/30 transition-colors"
                >
                  <span className="text-gray-300">{row.label}</span>
                  <span className="text-right text-gray-400">${row.est.toLocaleString()}</span>
                  <span className="text-right text-white">{noSpend ? "—" : `$${row.act.toLocaleString()}`}</span>
                  <span
                    className={`text-right font-medium ${
                      noSpend ? "text-gray-600" : over ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {noSpend ? "—" : `${over ? "+" : "-"}$${Math.abs(variance).toLocaleString()}`}
                  </span>
                </div>
              );
            })}
            <div className="grid grid-cols-4 px-5 py-3.5 bg-gray-800/40 text-sm font-semibold border-t border-gray-700">
              <span className="text-gray-200">Total</span>
              <span className="text-right text-gray-300">${project.estimated_cost.toLocaleString()}</span>
              <span className="text-right text-white">${project.actual_cost.toLocaleString()}</span>
              <span className={`text-right ${overBudget ? "text-red-400" : "text-green-400"}`}>
                {overBudget ? "+" : "-"}${Math.abs(project.actual_cost - project.estimated_cost).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h3 className="text-gray-400 text-xs font-medium uppercase mb-4">Profit Estimate</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Budgeted Profit</span>
                <span className="text-green-400 font-medium">${estimatedProfit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Projected Profit (at current spend)</span>
                <span
                  className={
                    projectedProfit >= estimatedProfit
                      ? "text-green-400 font-medium"
                      : "text-red-400 font-medium"
                  }
                >
                  ${projectedProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Materials ── */}
      {activeTab === "Materials" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {projectMaterials.length} item{projectMaterials.length !== 1 ? "s" : ""}
            </p>
            <button className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg border border-gray-700 transition-colors">
              Upload Receipt
            </button>
          </div>

          {projectMaterials.length > 0 && (
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-5 px-5 py-3 border-b border-gray-800 text-xs text-gray-500 font-medium uppercase tracking-wide">
                <span className="col-span-2">Material</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Cost</span>
                <span className="text-right">Status</span>
              </div>
              {projectMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="grid grid-cols-5 px-5 py-4 border-b border-gray-800 last:border-0 text-sm hover:bg-gray-800/30 transition-colors items-center"
                >
                  <div className="col-span-2">
                    <p className="text-white">{mat.name}</p>
                    <p className="text-gray-500 text-xs">{mat.supplier} · {mat.category}</p>
                  </div>
                  <span className="text-right text-gray-400">{mat.quantity} {mat.unit}</span>
                  <span className="text-right text-gray-400">${mat.unit_cost.toLocaleString()}</span>
                  <div className="flex justify-end">
                    <StatusBadge status={mat.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {projectExpenses.length > 0 && (
            <div>
              <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Receipt Log</h3>
              <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
                {projectExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between px-5 py-4 border-b border-gray-800 last:border-0 text-sm hover:bg-gray-800/30 transition-colors"
                  >
                    <div>
                      <p className="text-white">{exp.description}</p>
                      <p className="text-gray-500 text-xs">{exp.vendor} · {exp.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">${exp.amount.toLocaleString()}</span>
                      <StatusBadge status={exp.receipt_status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projectMaterials.length === 0 && projectExpenses.length === 0 && (
            <div className="bg-[#111827] border border-dashed border-gray-700 rounded-xl p-10 text-center">
              <p className="text-gray-500 text-sm">No materials or receipts logged yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Labor ── */}
      {activeTab === "Labor" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">Total Hours</p>
              <p className="text-white text-xl font-bold">{totalLaborHours.toFixed(1)}</p>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">Labor Cost</p>
              <p className="text-white text-xl font-bold">${totalLaborCost.toLocaleString()}</p>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">Workers</p>
              <p className="text-white text-xl font-bold">{Object.keys(laborByWorker).length}</p>
            </div>
          </div>

          {Object.keys(laborByWorker).length > 0 && (
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
              <h3 className="text-gray-400 text-xs font-medium uppercase mb-4">Hours by Worker</h3>
              <div className="space-y-4">
                {Object.entries(laborByWorker).map(([worker, data]) => (
                  <div key={worker} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-900/40 border border-blue-800 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
                      {worker[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-white">{worker}</span>
                        <span className="text-gray-400">
                          {data.hours}h · ${data.cost.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-blue-500 transition-all"
                          style={{
                            width: `${Math.round((data.hours / totalLaborHours) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {laborEntries.length > 0 ? (
            <div>
              <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Time Entries</h3>
              <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
                {laborEntries.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-5 py-4 border-b border-gray-800 last:border-0 text-sm hover:bg-gray-800/30 transition-colors"
                  >
                    <div>
                      <p className="text-white">{entry.description}</p>
                      <p className="text-gray-500 text-xs">
                        {entry.worker} · {entry.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{entry.hours}h</p>
                      <p className="text-gray-500 text-xs">${entry.rate}/hr</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#111827] border border-dashed border-gray-700 rounded-xl p-10 text-center">
              <p className="text-gray-500 text-sm">No time entries logged yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Documents ── */}
      {activeTab === "Documents" && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-white font-medium mb-2">Documents</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Contracts, permits, inspection reports, and project files will appear here.
          </p>
          <p className="text-gray-700 text-xs mt-4">Coming soon</p>
        </div>
      )}

      {/* ── Client Comms ── */}
      {activeTab === "Client Comms" && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-white font-medium mb-2">Client Communications</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            All emails, messages, and notes exchanged with {project.client_name} will appear here.
          </p>
          <p className="text-gray-700 text-xs mt-4">Coming soon</p>
        </div>
      )}

      {/* ── AI Notes ── */}
      {activeTab === "AI Notes" && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-white font-medium mb-2">AI Notes</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Jarvis-generated project summaries, risk flags, and actionable recommendations will appear here.
          </p>
          <p className="text-gray-700 text-xs mt-4">Coming soon</p>
        </div>
      )}
    </div>
  );
}
