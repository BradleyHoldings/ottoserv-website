"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/userAuth";
import KpiCard from "@/components/dashboard/KpiCard";
import BusinessBrief from "@/components/dashboard/BusinessBrief";
import AlertList from "@/components/dashboard/AlertList";
import QuickActions from "@/components/dashboard/QuickActions";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import StatusBadge from "@/components/dashboard/StatusBadge";
import PriorityBadge from "@/components/dashboard/PriorityBadge";
import {
  getDashboard,
  getTasks,
  getLeads,
  getRecentCalls,
  hasPlatformAccess,
  RecentCall,
} from "@/lib/dashboardApi";
import ComingSoonBanner from "@/components/dashboard/ComingSoonBanner";

export default function CommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const platformAccess = hasPlatformAccess();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);

    // Super admin should use admin dashboard, not command center
    if (currentUser.role === 'super_admin') {
      router.push('/dashboard/admin');
      return;
    }

    Promise.all([
      getDashboard(),
      getTasks(),
      getLeads(),
      getRecentCalls(20),
    ]).then(([dashData, tasksData, leadsData, callsData]) => {
      if (dashData?.brief) setBrief(dashData.brief);
      if (dashData?.alerts) setAlerts(dashData.alerts);
      if (tasksData) setTasks(tasksData);
      if (leadsData) setLeads(leadsData);
      if (callsData) setRecentCalls(callsData);
      setLoading(false);
    });
  }, [router]);

  const inProgressProjects: any[] = [];
  const urgentTasks = tasks
    .filter((t: any) => t.status === "overdue" || t.priority === "urgent")
    .slice(0, 5);
  const openWorkOrders: any[] = [];
  const scheduledThisWeek = 0;
  const aiPendingCount = 0;
  const todayEvents: any[] = [];
  const leadsNeedingFollowup = leads.filter((l: any) => ["new", "follow_up"].includes(l.status));
  const overdueInvoices: any[] = [];
  const callsToday = recentCalls.filter((c) => {
    const created = new Date(c.created_at);
    const now = new Date();
    return created.toDateString() === now.toDateString();
  });
  const connectedCallsToday = callsToday.filter((c) => c.status === "completed").length;

  const calculatedKpis = {
    activeJobs: tasks.length,
    todayAppointments: todayEvents.length,
    overdueTasks: tasks.filter((t: any) => t.status === 'overdue').length,
    newLeads: leadsNeedingFollowup.length,
    callsToday: callsToday.length,
    openWorkOrders: openWorkOrders.length,
  };

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
    <div className="density-comfortable">
      <div className="section-spacing">
        <h1 className="text-2xl font-bold text-white">Command Center</h1>
        <p className="text-gray-500 text-sm element-spacing">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {!platformAccess && (
        <ComingSoonBanner
          tone="auth"
          title="Platform access required"
          description="You're signed in to the OS Dashboard, but this browser doesn't have a platform JWT yet. Sign out and sign back in to refresh it, or contact OttoServ if your account isn't provisioned on the platform yet."
        />
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 grid-spacing-normal section-spacing" data-jarvis-target="dashboard_overview" data-demo-target="kpi-section">
        <KpiCard
          value={calculatedKpis.activeJobs}
          label="Active Tasks"
          color="blue"
          trend={`${urgentTasks.length} urgent`}
          trendDirection={urgentTasks.length > 0 ? "up" : "neutral"}
        />
        <KpiCard
          value={calculatedKpis.todayAppointments}
          label="Today's Appointments"
          color="green"
          trend="No appointments scheduled"
          trendDirection="neutral"
        />
        <KpiCard
          value={calculatedKpis.overdueTasks}
          label="Overdue Tasks"
          color={calculatedKpis.overdueTasks > 0 ? "red" : "green"}
          trend={calculatedKpis.overdueTasks === 0 ? "All caught up" : "Requires attention"}
          trendDirection={calculatedKpis.overdueTasks > 0 ? "up" : "down"}
        />
        <KpiCard
          value={calculatedKpis.newLeads}
          label="New Leads"
          color="purple"
          trend={calculatedKpis.newLeads > 0 ? "Need follow-up" : "All contacted"}
          trendDirection={calculatedKpis.newLeads > 0 ? "up" : "neutral"}
        />
        <KpiCard
          value={calculatedKpis.callsToday}
          label="Calls Today"
          color="blue"
          trend={
            calculatedKpis.callsToday === 0
              ? "No calls yet"
              : `${connectedCallsToday} connected`
          }
          trendDirection={calculatedKpis.callsToday > 0 ? "up" : "neutral"}
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
      <div className="section-spacing">
        <BusinessBrief brief={(brief as any)?.content || "OttoServ platform operational with real data from live business metrics."} />
      </div>

      {/* Today Operational Snapshot */}
      <div className="container-primary section-spacing" data-demo-target="operational-snapshot">
        <h3 className="text-white font-semibold subsection-spacing">Today's Operational Snapshot</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-spacing-normal">
          {/* Scheduled Today */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase component-spacing">Scheduled Today</p>
            {todayEvents.length === 0 ? (
              <p className="text-gray-600 text-sm">Nothing scheduled</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map((e: any, index: number) => (
                  <div key={e.id || index} className="flex items-start gap-2 text-sm">
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
          <div data-jarvis-target="lead_pipeline">
            <p className="text-gray-400 text-xs font-medium uppercase component-spacing">Leads to Follow Up</p>
            <div className="space-y-2">
              {leadsNeedingFollowup.slice(0, 3).map((lead: any, index: number) => (
                <div key={lead.id || index} className="flex items-start gap-2 text-sm">
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
            <p className="text-gray-400 text-xs font-medium uppercase component-spacing">Invoices Needing Action</p>
            <div className="space-y-2">
              {overdueInvoices.map((inv: any, index: number) => (
                <div key={inv.id || index} className="flex items-start gap-2 text-sm">
                  <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">⚠</span>
                  <div>
                    <span className="text-gray-300">{inv.id}</span>
                    <span className="text-gray-500 text-xs ml-1">— {inv.client_name} · ${inv.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Calls */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase component-spacing">Recent Calls</p>
            {callsToday.length === 0 ? (
              <p className="text-gray-600 text-sm">No calls placed today</p>
            ) : (
              <div className="space-y-2">
                {callsToday.slice(0, 4).map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-sm">
                    <span
                      className={`text-xs mt-0.5 flex-shrink-0 ${
                        c.status === "completed"
                          ? "text-green-400"
                          : c.status === "blocked"
                          ? "text-yellow-400"
                          : c.status === "failed"
                          ? "text-red-400"
                          : "text-blue-400"
                      }`}
                    >
                      {c.status === "completed"
                        ? "✓"
                        : c.status === "blocked"
                        ? "◐"
                        : c.status === "failed"
                        ? "✕"
                        : "●"}
                    </span>
                    <div className="min-w-0">
                      <span className="text-gray-300 truncate">{c.contact}</span>
                      <span className="text-gray-500 text-xs ml-1">
                        — {c.outcome}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts & Risks + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 grid-spacing-loose section-spacing">
        {/* Alerts & Risks Panel */}
        <div className="container-primary" data-demo-target="alerts-section">
          <h3 className="text-white font-semibold subsection-spacing">Alerts & Risks</h3>
          {alerts.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No active alerts.</p>
          ) : (
          <div className="space-y-0">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 py-3 ${i < alerts.length - 1 ? "border-b border-gray-800" : ""}`}
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
          )}
        </div>
        <QuickActions />
      </div>

      {/* Active Projects */}
      <div className="container-primary section-spacing" data-demo-target="active-projects">
        <div className="flex items-center justify-between subsection-spacing">
          <h3 className="text-white font-semibold">Active Projects</h3>
          <Link href="/dashboard/projects" className="text-blue-400 text-sm hover:underline">
            View all →
          </Link>
        </div>
        <div className="space-y-5">
          {inProgressProjects.map((p: any, index: number) => (
            <div key={p.id || index}>
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
      <div className="container-primary" data-demo-target="tasks-section">
        <div className="flex items-center justify-between subsection-spacing">
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
            {urgentTasks.map((t: any, index: number) => (
              <div
                key={t.id || index}
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
