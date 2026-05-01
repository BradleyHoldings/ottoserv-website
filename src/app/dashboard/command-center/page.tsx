"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import KpiCard from "@/components/dashboard/KpiCard";
import BusinessBrief from "@/components/dashboard/BusinessBrief";
import AlertList from "@/components/dashboard/AlertList";
import QuickActions from "@/components/dashboard/QuickActions";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import StatusBadge from "@/components/dashboard/StatusBadge";
import PriorityBadge from "@/components/dashboard/PriorityBadge";
import {
  mockKpis,
  mockBrief,
  mockAlerts,
  mockProjects,
  mockTasks,
  mockWorkOrders,
  mockAgentActivity,
  mockLeads,
  mockInvoices,
  mockCalendarEvents,
} from "@/lib/mockData";
import { getDashboard, getTasks, getLeads, getToken } from "@/lib/dashboardApi";

const EXTENDED_ALERTS = [
  { type: "budget_overrun", title: "Johnson Kitchen over budget", description: "PRJ-002 material costs 12% over estimate — review required", severity: "high" },
  { type: "schedule_behind", title: "Project behind schedule", description: "Johnson Kitchen — 6 days behind target completion", severity: "high" },
  { type: "missing_material", title: "Materials not ordered", description: "Subway tile for PRJ-002 still pending — delivery needed by May 5", severity: "medium" },
  { type: "unassigned_wo", title: "Work order unassigned", description: "WO-003 (Derek Walsh estimate) has no assigned tech", severity: "medium" },
  { type: "client_waiting", title: "Client awaiting reply", description: "Mike Johnson asked for a site walkthrough — 1 day no response", severity: "high" },
  { type: "invoice_overdue", title: "Invoice #1041 overdue", description: "Tom Carter — $4,200 — 20 days overdue", severity: "high" },
  { type: "ai_approval", title: "AI action needs approval", description: "Growth Agent drafted Instagram post for Johnson Kitchen", severity: "medium" },
];

export default function CommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(mockKpis);
  const [brief, setBrief] = useState(mockBrief);
  const [alerts, setAlerts] = useState(mockAlerts);
  const [tasks, setTasks] = useState(mockTasks);
  const [leads, setLeads] = useState(mockLeads);

  useEffect(() => {
    const token = getToken() || "";
    Promise.all([
      getDashboard(token),
      getTasks(token),
      getLeads(token),
    ]).then(([dashData, tasksData, leadsData]) => {
      if (dashData?.kpis) setKpis(dashData.kpis);
      if (dashData?.brief) setBrief(dashData.brief);
      if (dashData?.alerts) setAlerts(dashData.alerts);
      if (tasksData) setTasks(tasksData);
      if (leadsData) setLeads(leadsData);
      setLoading(false);
    });
  }, []);

  const inProgressProjects = mockProjects.filter((p) => p.status === "in_progress");
  const urgentTasks = tasks
    .filter((t) => t.status === "overdue" || t.priority === "urgent")
    .slice(0, 5);
  const openWorkOrders = mockWorkOrders.filter((wo) => !["completed", "invoiced"].includes(wo.status));
  const scheduledThisWeek = mockWorkOrders.filter((wo) => wo.status === "scheduled").length;
  const aiPendingCount = mockAgentActivity.filter((a) => a.requires_approval && a.status === "waiting_approval").length;
  const todayEvents = mockCalendarEvents.filter((e) => e.start.startsWith("2026-04-30"));
  const leadsNeedingFollowup = leads.filter((l) => ["new", "follow_up"].includes(l.status));
  const overdueInvoices = mockInvoices.filter((i) => i.status === "overdue");

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-gray-500 text-sm mt-1">Loading your business snapshot…</p>
        </div>
        <LoadingSkeleton type="card" rows={8} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Command Center</h1>
        <p className="text-gray-500 text-sm mt-1">Thursday, April 30, 2026</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          value={kpis.activeJobs}
          label="Active Jobs"
          color="blue"
          trend="2 need attention"
          trendDirection="down"
        />
        <KpiCard
          value={kpis.todayAppointments}
          label="Today's Appointments"
          color="green"
          trend="Next at 9:00 AM"
          trendDirection="neutral"
        />
        <KpiCard
          value={kpis.overdueTasks}
          label="Overdue Tasks"
          color="red"
          trend="Up from 2 yesterday"
          trendDirection="down"
        />
        <KpiCard
          value={kpis.newLeads}
          label="New Leads"
          color="purple"
          trend="3 need follow-up"
          trendDirection="up"
        />
        <KpiCard
          value={`$${kpis.revenueThisMonth.toLocaleString()}`}
          label="Revenue This Month"
          color="green"
          trend="+24% vs last month"
          trendDirection="up"
        />
        <KpiCard
          value={`$${kpis.billingDue.toLocaleString()}`}
          label="Outstanding Billing"
          color="yellow"
          trend="2 invoices overdue"
          trendDirection="down"
        />
        <KpiCard
          value={openWorkOrders.length}
          label="Open Work Orders"
          color="blue"
          trend={`${scheduledThisWeek} scheduled this week`}
          trendDirection="neutral"
        />
        <KpiCard
          value={aiPendingCount}
          label="AI Actions Pending"
          color={aiPendingCount > 0 ? "yellow" : "green"}
          trend={aiPendingCount > 0 ? "Review required" : "All clear"}
          trendDirection={aiPendingCount > 0 ? "down" : "neutral"}
        />
      </div>

      {/* Business Brief */}
      <div className="mb-6">
        <BusinessBrief brief={brief} />
      </div>

      {/* Today Operational Snapshot */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6">
        <h3 className="text-white font-semibold mb-4">Today's Operational Snapshot</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Scheduled Today */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase mb-2">Scheduled Today</p>
            {todayEvents.length === 0 ? (
              <p className="text-gray-600 text-sm">Nothing scheduled</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-400 text-xs mt-0.5 flex-shrink-0">
                      {new Date(e.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-gray-300">{e.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leads Needing Follow-Up */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase mb-2">Leads to Follow Up</p>
            <div className="space-y-2">
              {leadsNeedingFollowup.slice(0, 3).map((lead) => (
                <div key={lead.id} className="flex items-start gap-2 text-sm">
                  <span className="text-purple-400 text-xs mt-0.5 flex-shrink-0">●</span>
                  <div>
                    <span className="text-gray-300">{lead.name}</span>
                    <span className="text-gray-500 text-xs ml-1">— {lead.service_needed}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoices Needing Action */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase mb-2">Invoices Needing Action</p>
            <div className="space-y-2">
              {overdueInvoices.map((inv) => (
                <div key={inv.id} className="flex items-start gap-2 text-sm">
                  <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">⚠</span>
                  <div>
                    <span className="text-gray-300">{inv.id}</span>
                    <span className="text-gray-500 text-xs ml-1">— {inv.client_name} · ${inv.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Completed Work */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase mb-2">AI Completed Today</p>
            <div className="space-y-2">
              {mockAgentActivity
                .filter((a) => a.status === "completed")
                .slice(0, 3)
                .map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-sm">
                    <span className="text-green-400 text-xs mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-gray-300">{a.task}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts & Risks + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Alerts & Risks Panel */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Alerts & Risks</h3>
          <div className="space-y-0">
            {EXTENDED_ALERTS.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 py-3 ${i < EXTENDED_ALERTS.length - 1 ? "border-b border-gray-800" : ""}`}
              >
                <span
                  className={`text-lg flex-shrink-0 ${
                    alert.severity === "high" ? "text-red-400" : "text-yellow-400"
                  }`}
                >
                  {alert.severity === "high" ? "🔴" : "🟡"}
                </span>
                <div>
                  <p className="text-white text-sm font-medium">{alert.title}</p>
                  <p className="text-gray-500 text-xs">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <QuickActions />
      </div>

      {/* Active Projects */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Active Projects</h3>
          <Link href="/dashboard/projects" className="text-blue-400 text-sm hover:underline">
            View all →
          </Link>
        </div>
        <div className="space-y-5">
          {inProgressProjects.map((p) => (
            <div key={p.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <Link
                    href={`/dashboard/projects/${p.id}`}
                    className="text-white text-sm font-medium hover:text-blue-400 transition-colors"
                  >
                    {p.project_name}
                  </Link>
                  <span className="text-gray-500 text-xs ml-2">— {p.client_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">{p.percent_complete}%</span>
                  <StatusBadge status={p.risk_level} />
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    p.risk_level === "high"
                      ? "bg-red-500"
                      : p.risk_level === "medium"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${p.percent_complete}%` }}
                />
              </div>
              <p className="text-gray-600 text-xs mt-1">
                {p.phase} · Target: {p.target_completion} · $
                {p.estimated_revenue.toLocaleString()} contract
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Urgent Tasks */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Urgent & Overdue Tasks</h3>
          <Link href="/dashboard/tasks" className="text-blue-400 text-sm hover:underline">
            View all →
          </Link>
        </div>
        {urgentTasks.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            No urgent tasks — great work!
          </p>
        ) : (
          <div className="space-y-1">
            {urgentTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0"
              >
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-white text-sm">{t.title}</p>
                  <p className="text-gray-500 text-xs">
                    {t.assigned_to} · Due: {t.due_date}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
