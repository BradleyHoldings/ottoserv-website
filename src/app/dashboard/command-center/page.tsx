"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser, type User } from "@/lib/userAuth";
import {
  getApprovals,
  getAutomations,
  getCalendarEvents,
  getDashboard,
  getFinancials,
  getLeadSupply,
  getLeads,
  getMessages,
  getProjects,
  getRecentCalls,
  getTasks,
  type RecentCall,
} from "@/lib/dashboardApi";
import { buildCommandCenterData } from "@/lib/commandCenter.mjs";
import { CompactDashboardSection } from "@/components/dashboard/CompactDashboardSection";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { CreateLeadModal } from "@/components/dashboard/modals/CreateLeadModal";
import { CreateTaskModal } from "@/components/dashboard/modals/CreateTaskModal";
import { ViewDetailsModal } from "@/components/dashboard/modals/ViewDetailsModal";
import { Plus, Bell, AlertCircle } from "lucide-react";

type ModalName = "lead" | "task" | "details" | null;
type DetailsType = "lead" | "task" | "project" | "call" | null;

interface ActivityEvent {
  id: string;
  actor_type: "user" | "ai" | "system";
  actor_name: string;
  event_type: string;
  title: string;
  description: string;
  href?: string;
  created_at: string;
}

interface JarvisResponse {
  message: string;
  suggestedTask?: {
    title: string;
    description: string;
    priority: string;
  };
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed right-6 top-6 z-50 rounded-xl border border-blue-800 bg-blue-950/95 px-4 py-3 text-sm text-blue-100 shadow-2xl">
      {message}
    </div>
  );
}

function KPICard({
  label,
  value,
  trend,
  color = "blue",
}: {
  label: string;
  value: number;
  trend?: { value: number; direction: "up" | "down" };
  color?: string;
}) {
  const colorClass: Record<string, string> = {
    blue: "bg-blue-900/20 border-blue-800/40 text-blue-300",
    green: "bg-emerald-900/20 border-emerald-800/40 text-emerald-300",
    purple: "bg-purple-900/20 border-purple-800/40 text-purple-300",
    orange: "bg-orange-900/20 border-orange-800/40 text-orange-300",
  };

  return (
    <Card className={`border ${colorClass[color]}`}>
      <CardContent className="pt-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {label}
        </p>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && (
            <Badge
              variant="outline"
              className={
                trend.direction === "up"
                  ? "text-emerald-400 border-emerald-800/40"
                  : "text-red-400 border-red-800/40"
              }
            >
              {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertItem({
  title,
  description,
  severity = "info",
  onDismiss,
}: {
  title: string;
  description: string;
  severity?: "info" | "warning" | "error";
  onDismiss?: () => void;
}) {
  const severityClass = {
    info: "bg-blue-900/20 border-blue-800/40 text-blue-300",
    warning: "bg-yellow-900/20 border-yellow-800/40 text-yellow-300",
    error: "bg-red-900/20 border-red-800/40 text-red-300",
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        severityClass[severity]
      }`}
    >
      <AlertCircle className="size-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs mt-0.5 opacity-90">{description}</p>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
        >
          ✕
        </Button>
      )}
    </div>
  );
}

export default function CommandCenterPageRedesigned() {
  const router = useRouter();
  const [user] = useState<User | null>(() => getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalName>(null);
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; type: DetailsType; data: any }>({
    open: false,
    type: null,
    data: null,
  });
  const [toast, setToast] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const [tasks, setTasks] = useState<Record<string, unknown>[]>([]);
  const [leads, setLeads] = useState<Record<string, unknown>[]>([]);
  const [calls, setCalls] = useState<RecentCall[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Record<string, unknown>[]>([]);
  const [projects, setProjects] = useState<Record<string, unknown>[]>([]);
  const [automations, setAutomations] = useState<Record<string, unknown>[]>([]);
  const [inboxItems, setInboxItems] = useState<Record<string, unknown>[]>([]);
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [approvals, setApprovals] = useState<Record<string, unknown>[]>([]);
  const [localActivity, setLocalActivity] = useState<ActivityEvent[]>([]);
  const [leadSupply, setLeadSupply] = useState<Record<string, unknown> | null>(null);
  const [dashboardAlerts, setDashboardAlerts] = useState<Record<string, unknown>[]>([]);
  const [dashboardActivity, setDashboardActivity] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [
          dashboard,
          taskRows,
          leadRows,
          callRows,
          eventRows,
          projectRows,
          automationRows,
          inboxRows,
          financials,
          approvalRows,
          supply,
        ] = await Promise.all([
          getDashboard(),
          getTasks(),
          getLeads(),
          getRecentCalls(20),
          getCalendarEvents(),
          getProjects(),
          getAutomations(),
          getMessages(),
          getFinancials(),
          getApprovals(),
          getLeadSupply(),
        ]);

        if (!alive) return;
        setTasks(Array.isArray(taskRows) ? taskRows : []);
        setLeads(Array.isArray(leadRows) ? leadRows : []);
        setCalls(Array.isArray(callRows) ? callRows : []);
        setCalendarEvents(Array.isArray(eventRows) ? eventRows : []);
        setProjects(Array.isArray(projectRows) ? projectRows : []);
        setAutomations(Array.isArray(automationRows) ? automationRows : []);
        setInboxItems(Array.isArray(inboxRows) ? inboxRows : []);
        setInvoices(Array.isArray(financials?.invoices) ? financials.invoices : []);
        setApprovals(Array.isArray(approvalRows) ? approvalRows : []);
        setLeadSupply(supply as Record<string, unknown> | null);
        setDashboardAlerts(Array.isArray(dashboard?.alerts) ? dashboard.alerts : []);
        setDashboardActivity(Array.isArray(dashboard?.recent_activity) ? dashboard.recent_activity : []);
      } catch {
        if (alive) setError("Command Center data could not be refreshed. Showing safe empty states.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [router, user]);

  const data = useMemo(
    () =>
      buildCommandCenterData(
        {
          tasks,
          leads,
          calls,
          calendarEvents,
          projects,
          workOrders: [],
          automations,
          inboxItems,
          invoices,
          approvals,
          leadSupply,
          dashboardAlerts,
          recentActivity: [...localActivity, ...dashboardActivity],
        },
        user ?? {},
      ),
    [tasks, leads, calls, calendarEvents, projects, automations, inboxItems, invoices, approvals, leadSupply, dashboardAlerts, dashboardActivity, localActivity, user],
  );

  const visibleAlerts = data.alerts.filter((alert: { id: string }) => !dismissedAlerts.has(alert.id));

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function addActivity(title: string, description: string, eventType: string, href?: string) {
    setLocalActivity((prev) => [
      {
        id: `local-${Date.now()}`,
        actor_type: "user",
        actor_name: user?.name || "You",
        event_type: eventType,
        title,
        description,
        href,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  function handleNewLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lead = {
      id: `lead-${Date.now()}`,
      name: String(form.get("contactName") || "New Lead"),
      company_name: String(form.get("companyName") || ""),
      phone: String(form.get("phone") || ""),
      email: String(form.get("email") || ""),
      source: String(form.get("source") || "manual"),
      service_needed: String(form.get("serviceNeeded") || ""),
      notes: String(form.get("notes") || ""),
      status: "new",
      assigned_to: String(form.get("assignedUser") || user?.name || "Owner"),
      follow_up_date: String(form.get("followUpDate") || ""),
      created_at: new Date().toISOString(),
    };
    setLeads((prev) => [lead, ...prev]);
    if (lead.follow_up_date) {
      setTasks((prev) => [
        {
          id: `task-${Date.now()}`,
          title: `Follow up with ${lead.name}`,
          description: lead.service_needed,
          due_date: lead.follow_up_date,
          priority: "medium",
          status: "active",
          assigned_to: lead.assigned_to,
          related_type: "lead",
          related_id: lead.id,
        },
        ...prev,
      ]);
    }
    addActivity("Lead added", `${lead.name} was added from Command Center.`, "lead_added", "/dashboard/leads");
    // TODO: Wire to backend API (Codex to implement)
    notify("Lead created locally. Backend sync pending.");
    setModal(null);
  }

  function handleNewTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const today = new Date().toISOString().split("T")[0];
    const task = {
      id: `task-${Date.now()}`,
      title: String(form.get("title") || "New task"),
      description: String(form.get("description") || ""),
      due_date: String(form.get("dueDate") || today),
      priority: String(form.get("priority") || "medium"),
      status: "active",
      assigned_to: String(form.get("assignedUser") || user?.name || "Owner"),
      related_type: "",
      related_id: "",
      created_at: new Date().toISOString(),
    };
    setTasks((prev) => [task, ...prev]);
    addActivity("Task created", task.title, "task_created", "/dashboard/tasks");
    // TODO: Wire to backend API (Codex to implement)
    notify("Task created locally. Backend sync pending.");
    setModal(null);
  }

  const filteredTasks = tasks.filter((t: any) =>
    searchQuery ? t.title?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );
  const filteredLeads = leads.filter((l: any) =>
    searchQuery ? l.name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-800" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" suppressHydrationWarning>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Command Center</h1>
          <p className="text-sm text-gray-400 mt-1">
            Welcome back, {user?.name || "Operator"}. Here&apos;s your business overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setModal("lead")} className="gap-2">
            <Plus className="size-4" />
            New Lead
          </Button>
          <Button onClick={() => setModal("task")} variant="outline" className="gap-2">
            <Plus className="size-4" />
            New Task
          </Button>
        </div>
      </div>

      {error && (
        <AlertItem
          title="Data Loading Issue"
          description={error}
          severity="warning"
          onDismiss={() => setError("")}
        />
      )}

      {/* Alerts Section */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="size-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Active Alerts</h2>
          </div>
          <div className="space-y-2">
            {visibleAlerts.map((alert: any) => (
              <AlertItem
                key={alert.id}
                title={alert.title}
                description={alert.description}
                severity={alert.severity || "info"}
                onDismiss={() => setDismissedAlerts((prev) => new Set([...prev, alert.id]))}
              />
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Active Tasks" value={tasks.length} color="blue" trend={{ value: 12, direction: "up" }} />
        <KPICard label="Total Leads" value={leads.length} color="green" trend={{ value: 8, direction: "up" }} />
        <KPICard label="Recent Calls" value={calls.length} color="purple" />
        <KPICard label="Projects" value={projects.length} color="orange" />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-900/50 border-b border-gray-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks & Projects</TabsTrigger>
          <TabsTrigger value="leads">Leads & Sales</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <DashboardFilters
            searchPlaceholder="Search tasks, leads, projects..."
            onSearchChange={setSearchQuery}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <CompactDashboardSection
                title="Urgent Items"
                description="Action required immediately"
                items={[
                  ...(filteredTasks
                    .filter((t: any) => t.priority === "urgent" || t.priority === "high")
                    .slice(0, 3)
                    .map((t: any) => ({
                      id: t.id,
                      title: t.title,
                      subtitle: t.description,
                      priority: t.priority,
                      timestamp: new Date(t.due_date).toLocaleDateString(),
                    })) || []),
                ]}
                emptyState="No urgent items"
                onItemClick={(item) => {
                  setDetailsModal({
                    open: true,
                    type: "task",
                    data: tasks.find((t: any) => t.id === item.id),
                  });
                }}
              />

              <CompactDashboardSection
                title="Recent Activity"
                description="Last 5 actions"
                items={(data.recentActivity || [])
                  .slice(0, 5)
                  .map((activity: any) => ({
                    id: activity.id,
                    title: activity.title,
                    subtitle: `${activity.actor_name} · ${activity.event_type}`,
                    timestamp: new Date(activity.created_at).toLocaleDateString(),
                  }))}
                emptyState="No recent activity"
              />
            </div>

            <div className="space-y-4">
              <CompactDashboardSection
                title="Up Next"
                description="Today & tomorrow"
                items={(filteredTasks || [])
                  .filter((t: any) => t.status === "active")
                  .slice(0, 5)
                  .map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    priority: t.priority,
                    timestamp: new Date(t.due_date).toLocaleDateString(),
                  }))}
                emptyState="No upcoming tasks"
                onItemClick={(item) => {
                  setDetailsModal({
                    open: true,
                    type: "task",
                    data: tasks.find((t: any) => t.id === item.id),
                  });
                }}
              />

              <CompactDashboardSection
                title="Calendar Events"
                items={(calendarEvents || [])
                  .slice(0, 3)
                  .map((e: any) => ({
                    id: e.id,
                    title: e.title || "Event",
                    timestamp: new Date(e.start_time).toLocaleDateString(),
                  }))}
                emptyState="No upcoming events"
              />
            </div>
          </div>
        </TabsContent>

        {/* Tasks & Projects Tab */}
        <TabsContent value="tasks" className="space-y-6 mt-6">
          <DashboardFilters
            searchPlaceholder="Search tasks..."
            onSearchChange={setSearchQuery}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CompactDashboardSection
              title="Active Tasks"
              description={`${filteredTasks.filter((t: any) => t.status === "active").length} tasks`}
              items={(filteredTasks || [])
                .filter((t: any) => t.status === "active")
                .map((t: any) => ({
                  id: t.id,
                  title: t.title,
                  subtitle: t.description,
                  priority: t.priority,
                  timestamp: new Date(t.due_date).toLocaleDateString(),
                }))}
              emptyState="No active tasks"
              onViewAll={() => router.push("/dashboard/tasks")}
              onItemClick={(item) => {
                setDetailsModal({
                  open: true,
                  type: "task",
                  data: tasks.find((t: any) => t.id === item.id),
                });
              }}
            />

            <CompactDashboardSection
              title="Projects"
              description={`${projects.length} total`}
              items={(projects || [])
                .slice(0, 5)
                .map((p: any) => ({
                  id: p.id,
                  title: p.name || p.title,
                  subtitle: p.description,
                  status: p.status,
                }))}
              emptyState="No projects"
              onViewAll={() => router.push("/dashboard/projects")}
              onItemClick={(item) => {
                setDetailsModal({
                  open: true,
                  type: "project",
                  data: projects.find((p: any) => p.id === item.id),
                });
              }}
            />
          </div>
        </TabsContent>

        {/* Leads & Sales Tab */}
        <TabsContent value="leads" className="space-y-6 mt-6">
          <DashboardFilters
            searchPlaceholder="Search leads..."
            onSearchChange={setSearchQuery}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CompactDashboardSection
              title="New Leads"
              description={`${filteredLeads.filter((l: any) => l.status === "new").length} new`}
              items={(filteredLeads || [])
                .filter((l: any) => l.status === "new")
                .map((l: any) => ({
                  id: l.id,
                  title: l.name,
                  subtitle: l.company_name || l.source,
                  badge: l.service_needed,
                }))}
              emptyState="No new leads"
              onViewAll={() => router.push("/dashboard/leads")}
              onItemClick={(item) => {
                setDetailsModal({
                  open: true,
                  type: "lead",
                  data: leads.find((l: any) => l.id === item.id),
                });
              }}
            />

            <CompactDashboardSection
              title="Recent Calls"
              description={`${calls.length} calls`}
              items={(calls || [])
                .slice(0, 5)
                .map((c: any) => ({
                  id: c.id,
                  title: c.contact_name || "Unknown",
                  subtitle: c.duration ? `${c.duration}s` : "Missed call",
                  timestamp: new Date(c.call_time).toLocaleDateString(),
                }))}
              emptyState="No recent calls"
              onItemClick={(item) => {
                setDetailsModal({
                  open: true,
                  type: "call",
                  data: calls.find((c: any) => c.id === item.id),
                });
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateLeadModal
        open={modal === "lead"}
        onOpenChange={(open) => setModal(open ? "lead" : null)}
        onSubmit={handleNewLead}
      />

      <CreateTaskModal
        open={modal === "task"}
        onOpenChange={(open) => setModal(open ? "task" : null)}
        onSubmit={handleNewTask}
      />

      <ViewDetailsModal
        open={detailsModal.open}
        onOpenChange={(open) =>
          setDetailsModal({ ...detailsModal, open })
        }
        title={
          detailsModal.type === "task"
            ? (detailsModal.data?.title || "Task")
            : detailsModal.type === "lead"
              ? (detailsModal.data?.name || "Lead")
              : detailsModal.type === "project"
                ? (detailsModal.data?.name || "Project")
                : "Details"
        }
        type={detailsModal.type || "task"}
        data={detailsModal.data || {}}
        onAction={(action) => {
          notify(`${action} action triggered. Backend implementation pending.`);
          // TODO: Wire to backend API based on action type (Codex to implement)
        }}
      />

      {toast && <Toast message={toast} />}
    </div>
  );
}
