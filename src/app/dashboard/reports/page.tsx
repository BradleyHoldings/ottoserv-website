"use client";

import { useState } from "react";
import ReportCard from "@/components/dashboard/ReportCard";
import KpiCard from "@/components/dashboard/KpiCard";
import { mockReports, mockFinancialSummary, mockProjects, mockLeads, mockWorkOrders, Report } from "@/lib/mockData";

const DASHBOARD_TABS = ["Owner", "Project", "Operations", "Sales"] as const;
type DashboardTab = typeof DASHBOARD_TABS[number];

const TYPE_FILTERS = ["all", "summary", "financial", "sales", "operations", "hr", "quality"];

function OwnerDashboard() {
  const atRisk = mockProjects.filter((p) => p.risk_level === "high").length;
  const pipelineValue = mockLeads
    .filter((l) => !["won", "lost"].includes(l.status))
    .reduce((s, l) => {
      const mid = parseInt(l.budget.replace(/[^0-9]/g, "")) || 0;
      return s + mid * 1000;
    }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard value={`$${mockFinancialSummary.revenue_this_month.toLocaleString()}`} label="Revenue This Month" color="green" trend="+24% vs last month" trendDirection="up" />
        <KpiCard value={`$${mockFinancialSummary.gross_profit_this_month.toLocaleString()}`} label="Gross Profit" color="green" trend="38% margin" trendDirection="up" />
        <KpiCard value={`$${mockFinancialSummary.outstanding_receivables.toLocaleString()}`} label="Open Invoices" color="yellow" trend="2 overdue" trendDirection="down" />
        <KpiCard value={mockProjects.filter((p) => p.status === "in_progress").length} label="Active Jobs" color="blue" />
        <KpiCard value={atRisk} label="Jobs At Risk" color={atRisk > 0 ? "red" : "green"} trend={atRisk > 0 ? "Needs attention" : "All healthy"} trendDirection={atRisk > 0 ? "down" : "up"} />
        <KpiCard value={mockLeads.filter((l) => l.status === "new").length} label="New Leads" color="purple" />
        <KpiCard value={`$${(pipelineValue / 1000).toFixed(0)}k`} label="Pipeline Value" color="purple" />
        <KpiCard value={`${Math.round((mockLeads.filter((l) => l.status === "won").length / mockLeads.length) * 100)}%`} label="Conversion Rate" color="green" />
      </div>
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Revenue Trend</h3>
        <div className="flex items-end gap-2 h-32">
          {[28400, 32100, 38200, 47500].map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-gray-500 text-xs">${(v / 1000).toFixed(0)}k</span>
              <div
                className="w-full bg-blue-600 rounded-t"
                style={{ height: `${(v / 47500) * 100}px` }}
              />
              <span className="text-gray-600 text-xs">{["Jan", "Feb", "Mar", "Apr"][i]}</span>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-3 text-center">Connect QuickBooks for live revenue data</p>
      </div>
    </div>
  );
}

function ProjectDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard value={`$${mockProjects.reduce((s, p) => s + p.estimated_revenue, 0).toLocaleString()}`} label="Total Contract Value" color="green" />
        <KpiCard value={`$${mockProjects.reduce((s, p) => s + p.actual_cost, 0).toLocaleString()}`} label="Total Costs to Date" color="yellow" />
        <KpiCard value={`${Math.round(mockProjects.reduce((s, p) => s + p.percent_complete, 0) / mockProjects.length)}%`} label="Avg Completion" color="blue" />
        <KpiCard value={mockProjects.filter((p) => p.risk_level === "high").length} label="Projects At Risk" color="red" />
      </div>
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Budget vs Actual by Project</h3>
        </div>
        <div className="p-6 space-y-4">
          {mockProjects.map((p) => {
            const pct = p.estimated_cost > 0 ? Math.round((p.actual_cost / p.estimated_cost) * 100) : 0;
            return (
              <div key={p.id}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-300">{p.project_name}</span>
                  <span className={pct > 100 ? "text-red-400 font-medium" : "text-gray-400"}>
                    {pct}% of budget used
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${pct > 100 ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-blue-500"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OperationsDashboard() {
  const byStatus = ["new", "scheduled", "in_progress", "waiting_on_parts", "completed", "invoiced"].map((s) => ({
    status: s,
    count: mockWorkOrders.filter((wo) => wo.status === s).length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard value={mockWorkOrders.filter((wo) => !["completed", "invoiced"].includes(wo.status)).length} label="Open Work Orders" color="blue" />
        <KpiCard value={mockWorkOrders.filter((wo) => wo.status === "scheduled").length} label="Scheduled This Week" color="green" />
        <KpiCard value={mockWorkOrders.filter((wo) => wo.status === "waiting_on_parts").length} label="Waiting on Parts" color="yellow" />
        <KpiCard value={mockWorkOrders.filter((wo) => wo.priority === "urgent").length} label="Urgent Orders" color="red" />
      </div>
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Work Orders by Status</h3>
        <div className="space-y-3">
          {byStatus.map(({ status, count }) => (
            <div key={status} className="flex items-center gap-3 text-sm">
              <span className="text-gray-400 w-32 capitalize">{status.replace(/_/g, " ")}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <div
                  className="h-2 bg-blue-500 rounded-full"
                  style={{ width: `${mockWorkOrders.length > 0 ? (count / mockWorkOrders.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-gray-400 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SalesDashboard() {
  const bySource = Array.from(new Set(mockLeads.map((l) => l.source))).map((src) => ({
    source: src,
    count: mockLeads.filter((l) => l.source === src).length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard value={mockLeads.filter((l) => !["won", "lost"].includes(l.status)).length} label="Active Leads" color="purple" />
        <KpiCard value={`${Math.round((mockLeads.filter((l) => l.status === "won").length / mockLeads.length) * 100)}%`} label="Win Rate" color="green" />
        <KpiCard value={mockLeads.filter((l) => ["new", "follow_up"].includes(l.status)).length} label="Follow-Up Tasks" color="yellow" />
        <KpiCard value={mockLeads.filter((l) => l.status === "lost").length} label="Lost Leads" color="red" />
      </div>
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Leads by Source</h3>
        <div className="space-y-3">
          {bySource.map(({ source, count }) => (
            <div key={source} className="flex items-center gap-3 text-sm">
              <span className="text-gray-400 w-24 capitalize">{source}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <div
                  className="h-2 bg-purple-500 rounded-full"
                  style={{ width: `${(count / mockLeads.length) * 100}%` }}
                />
              </div>
              <span className="text-gray-400 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<DashboardTab>("Owner");
  const [view, setView] = useState<"dashboards" | "reports">("dashboards");

  function handleGenerate(id: string) {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "generating" } : r))
    );
    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "ready", last_generated: new Date().toISOString().slice(0, 10) }
            : r
        )
      );
    }, 2500);
  }

  function handleExport(id: string) {
    const report = reports.find((r) => r.id === id);
    if (report) alert(`Exporting "${report.title}" as PDF…`);
  }

  const filtered =
    typeFilter === "all" ? reports : reports.filter((r) => r.type === typeFilter);

  const generatingCount = reports.filter((r) => r.status === "generating").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">
            {reports.length} reports available
            {generatingCount > 0 && ` · ${generatingCount} generating`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setView("dashboards")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === "dashboards" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              Dashboards
            </button>
            <button
              onClick={() => setView("reports")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === "reports" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              Reports
            </button>
          </div>
          {view === "reports" && (
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              Generate All
            </button>
          )}
        </div>
      </div>

      {view === "dashboards" ? (
        <>
          {/* Dashboard Tabs */}
          <div className="flex gap-1 mb-6 bg-[#111827] border border-gray-800 rounded-lg p-1 w-fit">
            {DASHBOARD_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {tab} Dashboard
              </button>
            ))}
          </div>

          {activeTab === "Owner" && <OwnerDashboard />}
          {activeTab === "Project" && <ProjectDashboard />}
          {activeTab === "Operations" && <OperationsDashboard />}
          {activeTab === "Sales" && <SalesDashboard />}
        </>
      ) : (
        <>
          {/* Type Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-blue-600 text-white"
                    : "bg-[#111827] text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onGenerate={handleGenerate}
                onExport={handleExport}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-white font-medium">No reports match this filter</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
