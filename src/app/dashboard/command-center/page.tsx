"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActionStateModal from "@/components/dashboard/ActionStateModal";
import DashboardModal from "@/components/dashboard/DashboardModal";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
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
  hasPlatformAccess,
  type RecentCall,
} from "@/lib/dashboardApi";
import { buildCommandCenterData, isOttoServAdmin } from "@/lib/commandCenter.mjs";

type ModalName = "lead" | "task" | "expense" | "project" | null;

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

const inputClass = "w-full rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none";
const labelClass = "space-y-1 text-sm text-gray-300";

function todayValue() {
  return new Date().toISOString().split("T")[0];
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed right-6 top-6 z-50 rounded-xl border border-blue-800 bg-blue-950/95 px-4 py-3 text-sm text-blue-100 shadow-2xl">
      {message}
    </div>
  );
}

function KpiLinkCard({ kpi }: { kpi: { href: string; label: string; value: number; helper: string; color: string } }) {
  const colorClass: Record<string, string> = {
    blue: "text-blue-400 border-blue-900/50",
    green: "text-emerald-400 border-emerald-900/50",
    red: "text-red-400 border-red-900/50",
    yellow: "text-yellow-400 border-yellow-900/50",
    purple: "text-purple-400 border-purple-900/50",
  };

  return (
    <Link
      href={kpi.href}
      className={`group rounded-xl border bg-[#111827] p-4 transition hover:-translate-y-0.5 hover:border-blue-700 hover:bg-[#141e2d] focus:outline-none focus:ring-2 focus:ring-blue-600 ${colorClass[kpi.color] ?? colorClass.blue}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-bold tabular-nums">{kpi.value}</p>
          <p className="mt-1 text-sm font-medium text-gray-300">{kpi.label}</p>
          <p className="mt-1 text-xs text-gray-500">{kpi.helper}</p>
        </div>
        <span className="text-xs text-gray-500 transition group-hover:text-blue-300">Open</span>
      </div>
    </Link>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-blue-400 hover:text-blue-300">
          View all
        </Link>
      )}
    </div>
  );
}

export default function CommandCenterPage() {
  const router = useRouter();
  const [user] = useState<User | null>(() => getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalName>(null);
  const [jarvisOpen, setJarvisOpen] = useState(false);
  const [jarvisPrompt, setJarvisPrompt] = useState("");
  const [jarvisResponse, setJarvisResponse] = useState<JarvisResponse | null>(null);
  const [jarvisLoading, setJarvisLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [integrationModal, setIntegrationModal] = useState<null | "invoice" | "expense" | "appointment">(null);

  const [tasks, setTasks] = useState<Record<string, unknown>[]>([]);
  const [leads, setLeads] = useState<Record<string, unknown>[]>([]);
  const [calls, setCalls] = useState<RecentCall[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Record<string, unknown>[]>([]);
  const [projects, setProjects] = useState<Record<string, unknown>[]>([]);
  const [workOrders] = useState<Record<string, unknown>[]>([]);
  const [automations, setAutomations] = useState<Record<string, unknown>[]>([]);
  const [inboxItems, setInboxItems] = useState<Record<string, unknown>[]>([]);
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [approvals, setApprovals] = useState<Record<string, unknown>[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [localActivity, setLocalActivity] = useState<ActivityEvent[]>([]);
  const [leadSupply, setLeadSupply] = useState<Record<string, unknown> | null>(null);
  const [dashboardAlerts, setDashboardAlerts] = useState<Record<string, unknown>[]>([]);
  const [dashboardActivity, setDashboardActivity] = useState<Record<string, unknown>[]>([]);

  const platformAccess = hasPlatformAccess();

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
        const [dashboard, taskRows, leadRows, callRows, eventRows, projectRows, automationRows, inboxRows, financials, approvalRows, supply] = await Promise.all([
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
          workOrders,
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
    [tasks, leads, calls, calendarEvents, projects, workOrders, automations, inboxItems, invoices, approvals, leadSupply, dashboardAlerts, dashboardActivity, localActivity, user],
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
      status: String(form.get("status") || "new"),
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
    notify("Lead created locally. Backend save wiring is still pending.");
    setModal(null);
  }

  function handleNewTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const task = {
      id: `task-${Date.now()}`,
      title: String(form.get("title") || "New task"),
      description: String(form.get("description") || ""),
      due_date: String(form.get("dueDate") || todayValue()),
      priority: String(form.get("priority") || "medium"),
      status: String(form.get("status") || "active"),
      assigned_to: String(form.get("assignedUser") || user?.name || "Owner"),
      related_type: String(form.get("relatedType") || ""),
      related_id: String(form.get("relatedRecord") || ""),
      created_at: new Date().toISOString(),
    };
    setTasks((prev) => [task, ...prev]);
    addActivity("Task created", task.title, "task_created", "/dashboard/tasks");
    notify("Task created locally. Backend save wiring is still pending.");
    setModal(null);
  }

  function handleExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addActivity("Expense logged", `${form.get("vendor") || "Vendor"} / $${form.get("amount") || "0"}`, "expense_logged", "/dashboard/financials");
    notify("Expense captured locally. Receipt upload and financial sync still need backend wiring.");
    setModal(null);
  }

  function handleProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const project = {
      id: `project-${Date.now()}`,
      project_name: String(form.get("projectName") || "New Project"),
      client_name: String(form.get("client") || ""),
      address: String(form.get("address") || ""),
      start_date: String(form.get("startDate") || ""),
      target_completion: String(form.get("targetDate") || ""),
      budget: Number(form.get("budget") || 0),
      status: String(form.get("status") || "active"),
      project_manager: String(form.get("manager") || user?.name || "Owner"),
      notes: String(form.get("notes") || ""),
      created_at: new Date().toISOString(),
    };
    setProjects((prev) => [project, ...prev]);
    addActivity("Project created", project.project_name, "project_created", "/dashboard/projects");
    notify("Project created locally. Backend project persistence is still pending.");
    setModal(null);
  }

  async function askJarvis() {
    if (!jarvisPrompt.trim()) return;
    setJarvisLoading(true);
    try {
      const response = await fetch("/api/jarvis/command-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: jarvisPrompt, context: data }),
      });
      setJarvisResponse(await response.json());
    } catch {
      setJarvisResponse({
        message: "Jarvis could not reach the assistant endpoint. Review alerts, approvals, and follow-ups manually.",
        suggestedTask: { title: "Review Command Center priorities", description: "Fallback task from Jarvis placeholder.", priority: "medium" },
      });
    } finally {
      setJarvisLoading(false);
    }
  }

  function createTaskFromJarvis() {
    if (!jarvisResponse?.suggestedTask) return;
    setTasks((prev) => [
      {
        id: `task-${Date.now()}`,
        title: jarvisResponse.suggestedTask?.title || "Jarvis follow-up",
        description: jarvisResponse.suggestedTask?.description || "",
        due_date: todayValue(),
        priority: jarvisResponse.suggestedTask?.priority || "medium",
        status: "active",
        assigned_to: user?.name || "Owner",
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    addActivity("Jarvis task created", jarvisResponse.suggestedTask.title, "ai_action_completed", "/dashboard/tasks");
    notify("Task created from Jarvis response.");
    setJarvisOpen(false);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">Command Center</h1>
        <p className="mt-1 text-sm text-gray-500">Loading your operating dashboard...</p>
        <div className="mt-6">
          <LoadingSkeleton type="card" rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} />}

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">Operations OS</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Command Center</h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModal("lead")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Add Lead</button>
          <Link href="/dashboard/work-orders?action=new" className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">Create Work Order</Link>
          <button onClick={() => setModal("task")} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">New Task</button>
          <Link href="/dashboard/automations" className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">View Automations</Link>
          <Link href="/dashboard/inbox" className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">Open Inbox</Link>
          <button onClick={() => setJarvisOpen(true)} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">Ask Jarvis</button>
          <Link href="/os/hermes" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400">Open Hermes Command Center</Link>
          <Link href="/dashboard/reports" className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">View Reports</Link>
        </div>
      </div>

      {!platformAccess && (
        <div className="rounded-xl border border-yellow-900/50 bg-yellow-950/20 p-4">
          <p className="font-medium text-yellow-200">Live platform access is not connected.</p>
          <p className="mt-1 text-sm text-gray-400">Command Center is showing safe empty/local states until CRM, calendar, inbox, and financial integrations are connected.</p>
          <Link href="/dashboard/integrations" className="mt-3 inline-flex text-sm text-blue-400 hover:text-blue-300">Open integrations</Link>
        </div>
      )}

      {error && <div className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
        {data.kpis.map((kpi: { id: string; href: string; label: string; value: number; helper: string; color: string }) => (
          <KpiLinkCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.moduleCards.map((card: { id: string; title: string; value: number; description: string; href: string }) => (
          <Link key={card.id} href={card.href} className="rounded-xl border border-gray-800 bg-[#111827] p-4 transition hover:border-blue-700 hover:bg-[#141e2d]">
            <p className="text-sm font-medium text-gray-400">{card.title}</p>
            <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 xl:col-span-2">
          <SectionHeader title="Jarvis Daily Brief" />
          {data.recentActivity.length === 0 && visibleAlerts.length === 0 ? (
            <p className="text-sm text-gray-300">{data.jarvisBrief.emptyMessage}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BriefItem title="Since yesterday" text={data.jarvisBrief.sinceYesterday} />
              <BriefItem title="Needs attention today" text={data.jarvisBrief.needsAttention} />
              <BriefItem title="Jarvis recommendation" text={data.jarvisBrief.recommendation} />
              <BriefItem title="What Jarvis is handling" text={data.jarvisBrief.handling} />
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setJarvisOpen(true)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Ask Jarvis</button>
            <Link href="/dashboard/agents?status=pending" className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">View AI Actions</Link>
            <button onClick={() => setModal("task")} className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">Create Task</button>
          </div>
        </div>

        <LeadHealthCard leadHealth={data.leadHealth} admin={isOttoServAdmin(user)} />
      </div>

      <QuickActionsPanel
        onLead={() => setModal("lead")}
        onTask={() => setModal("task")}
        onJarvis={() => setJarvisOpen(true)}
        onExpense={() => setModal("expense")}
        onProject={() => setModal("project")}
      />

      <div className="rounded-xl border border-gray-800 bg-[#111827] p-5">
        <SectionHeader title="Today's Operational Snapshot" href="/dashboard/calendar" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {Object.values(data.snapshot).map((section) => (
            <SnapshotColumn
              key={section.title}
              section={section}
              onAction={(action) => {
                if (action === "newLead") setModal("lead");
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AlertsPanel
          alerts={visibleAlerts}
          onDismiss={(id) => setDismissedAlerts((prev) => new Set(prev).add(id))}
        />
        <ApprovalsPanel
          approvals={data.approvals}
          onAction={(id, action) => {
            setApprovals((prev) => prev.filter((approval) => approval.id !== id));
            addActivity(`Approval ${action}`, `Approval ${id} was ${action}.`, "approval_updated", "/dashboard/agents?status=pending");
            notify(`Approval ${action}. Backend approval persistence is pending.`);
          }}
        />
      </div>

      <RecentActivityPanel activities={data.recentActivity} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {[
          ["/dashboard/tasks", "Tasks"],
          ["/dashboard/calendar", "Calendar"],
          ["/dashboard/leads", "Leads"],
          ["/dashboard/crm", "CRM"],
          ["/dashboard/inbox", "Inbox"],
          ["/dashboard/work-orders", "Work Orders"],
          ["/dashboard/projects", "Projects"],
          ["/dashboard/materials", "Materials"],
          ["/dashboard/job-costing", "Job Costing"],
          ["/dashboard/financials", "Financials"],
          ["/dashboard/marketing", "Marketing"],
          ["/dashboard/agents", "AI Agents"],
          ["/dashboard/reports", "Reports"],
          ["/dashboard/integrations", "Integrations"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg border border-gray-800 bg-[#111827] px-3 py-2 text-center text-sm text-gray-300 hover:border-blue-700 hover:text-white">
            {label}
          </Link>
        ))}
      </div>

      <LeadModal open={modal === "lead"} onClose={() => setModal(null)} onSubmit={handleNewLead} user={user} />
      <TaskModal open={modal === "task"} onClose={() => setModal(null)} onSubmit={handleNewTask} user={user} />
      <ExpenseModal open={modal === "expense"} onClose={() => setModal(null)} onSubmit={handleExpense} />
      <ProjectModal open={modal === "project"} onClose={() => setModal(null)} onSubmit={handleProject} user={user} />
      <JarvisDrawer
        open={jarvisOpen}
        prompt={jarvisPrompt}
        response={jarvisResponse}
        loading={jarvisLoading}
        onPrompt={setJarvisPrompt}
        onSubmit={askJarvis}
        onClose={() => setJarvisOpen(false)}
        onCreateTask={createTaskFromJarvis}
        onCopy={() => {
          navigator.clipboard?.writeText(jarvisResponse?.message || "");
          notify("Jarvis response copied.");
        }}
        onDismiss={() => setJarvisResponse(null)}
      />
      <ActionStateModal
        open={integrationModal !== null}
        kind="integration_required"
        integrationName={integrationModal === "invoice" ? "QuickBooks or Stripe" : integrationModal === "appointment" ? "Calendar" : "Financials"}
        description="Connect the related integration before this action can save live data."
        primaryHref="/dashboard/integrations"
        onClose={() => setIntegrationModal(null)}
      />
    </div>
  );
}

function BriefItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#0b1220] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-sm text-gray-200">{text}</p>
    </div>
  );
}

function QuickActionsPanel({
  onLead,
  onTask,
  onJarvis,
  onExpense,
  onProject,
}: {
  onLead: () => void;
  onTask: () => void;
  onJarvis: () => void;
  onExpense: () => void;
  onProject: () => void;
}) {
  const actions = [
    { label: "New Lead", onClick: onLead, primary: true },
    { label: "New Task", onClick: onTask, primary: true },
    { label: "Ask Jarvis", onClick: onJarvis, primary: true },
    { label: "Log Expense", onClick: onExpense },
    { label: "New Project", onClick: onProject },
  ];

  return (
    <div className="rounded-xl border border-gray-800 bg-[#111827] p-5">
      <SectionHeader title="Quick Actions" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`${action.primary ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-800 text-gray-200 hover:bg-gray-700"} rounded-lg px-4 py-3 text-sm font-medium transition`}
          >
            {action.label}
          </button>
        ))}
        <Link href="/dashboard/work-orders?action=new" className="rounded-lg bg-gray-800 px-4 py-3 text-center text-sm font-medium text-gray-200 transition hover:bg-gray-700">
          Create Work Order
        </Link>
        <Link href="/dashboard/automations" className="rounded-lg bg-gray-800 px-4 py-3 text-center text-sm font-medium text-gray-200 transition hover:bg-gray-700">
          View Automations
        </Link>
        <Link href="/dashboard/inbox" className="rounded-lg bg-gray-800 px-4 py-3 text-center text-sm font-medium text-gray-200 transition hover:bg-gray-700">
          Open Inbox
        </Link>
        <Link href="/dashboard/reports" className="rounded-lg bg-gray-800 px-4 py-3 text-center text-sm font-medium text-gray-200 transition hover:bg-gray-700">
          View Reports
        </Link>
      </div>
    </div>
  );
}

function LeadHealthCard({ leadHealth, admin }: { leadHealth: Record<string, unknown>; admin: boolean }) {
  return (
    <Link href={String(leadHealth.href || "/dashboard/leads")} className="rounded-xl border border-gray-800 bg-[#111827] p-5 transition hover:border-blue-700 hover:bg-[#141e2d]">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
        {admin ? "Lead Supply Today" : "Lead Follow-Up Health"}
      </p>
      {admin ? (
        <>
          <p className="mt-3 text-3xl font-bold text-white">{Number(leadHealth.attained || 0)} / {Number(leadHealth.targetPerDay || 200)}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <MiniStat label="Calls" value={Number(leadHealth.calls || 0)} />
            <MiniStat label="Failed" value={Number(leadHealth.failed || 0)} />
            <MiniStat label="Blocked" value={Number(leadHealth.blocked || 0)} />
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="New today" value={Number(leadHealth.newLeadsToday || 0)} />
            <MiniStat label="Contacted" value={Number(leadHealth.contactedLeads || 0)} />
            <MiniStat label="Awaiting" value={Number(leadHealth.awaitingResponse || 0)} />
            <MiniStat label="Due" value={Number(leadHealth.followUpsDue || 0)} />
          </div>
          <p className="mt-4 text-sm text-gray-400">{String(leadHealth.suggestedNextAction || "")}</p>
        </>
      )}
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SnapshotColumn({ section, onAction }: { section: Record<string, unknown>; onAction: (action: string) => void }) {
  const items = Array.isArray(section.items) ? section.items : [];
  return (
    <div className="rounded-xl border border-gray-800 bg-[#0b1220] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{String(section.title)}</p>
      {items.length === 0 ? (
        <EmptyState
          title={String(section.empty)}
          description="This will populate automatically when connected data is available."
          actions={[
            section.action
              ? { label: String(section.actionLabel), onClick: () => onAction(String(section.action)) }
              : { label: String(section.actionLabel), href: String(section.actionHref || "/dashboard/command-center") },
          ]}
          className="py-8"
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={String(item.id)} className="rounded-lg border border-gray-800 bg-[#111827] p-3">
              <Link href={String(item.href)} className="font-medium text-white hover:text-blue-300">{String(item.title)}</Link>
              <p className="mt-1 text-xs text-gray-500">{String(item.meta)}</p>
              <Link href={String(item.href)} className="mt-2 inline-flex text-xs text-blue-400 hover:text-blue-300">{String(item.actionLabel)}</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertsPanel({ alerts, onDismiss }: { alerts: Array<Record<string, unknown>>; onDismiss: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#111827] p-5">
      <SectionHeader title="Alerts & Risks" href="/dashboard/tasks?status=overdue" />
      {alerts.length === 0 ? (
        <EmptyState title="No active alerts. Everything looks good." description="Jarvis will surface operational risks here when something needs attention." className="py-10" />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={String(alert.id)} className="rounded-lg border border-gray-800 bg-[#0b1220] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`text-xs font-semibold uppercase ${alert.severity === "high" ? "text-red-400" : alert.severity === "medium" ? "text-yellow-400" : "text-blue-400"}`}>
                    {String(alert.severity)}
                  </span>
                  <p className="mt-1 font-medium text-white">{String(alert.title)}</p>
                  <p className="mt-1 text-sm text-gray-400">{String(alert.description)}</p>
                </div>
                {alert.dismissible !== false && (
                  <button onClick={() => onDismiss(String(alert.id))} className="text-xs text-gray-500 hover:text-white">Dismiss</button>
                )}
              </div>
              <Link href={String(alert.href)} className="mt-3 inline-flex text-sm text-blue-400 hover:text-blue-300">{String(alert.suggestedAction)}</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalsPanel({ approvals, onAction }: { approvals: Array<Record<string, unknown>>; onAction: (id: string, action: string) => void }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#111827] p-5">
      <SectionHeader title="Pending Approvals" href="/dashboard/agents?status=pending" />
      {approvals.length === 0 ? (
        <EmptyState title="No approvals pending" description="Jarvis action requests, drafts, estimates, and automation suggestions will appear here." className="py-10" />
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div key={String(approval.id)} className="rounded-lg border border-gray-800 bg-[#0b1220] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">{String(approval.type)}</p>
              <p className="mt-1 font-medium text-white">{String(approval.title)}</p>
              <p className="mt-1 text-xs text-gray-500">{new Date(String(approval.createdAt)).toLocaleString()}</p>
              <p className="mt-2 text-sm text-gray-400">{String(approval.preview)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={String(approval.href)} className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700">Review</Link>
                <button onClick={() => onAction(String(approval.id), "approved")} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs text-white hover:bg-emerald-600">Approve</button>
                <button onClick={() => onAction(String(approval.id), "rejected")} className="rounded-lg bg-red-950 px-3 py-1.5 text-xs text-red-200 hover:bg-red-900">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentActivityPanel({ activities }: { activities: Array<Record<string, unknown>> }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#111827] p-5">
      <SectionHeader title="Recent Activity" href="/dashboard/crm/activity" />
      {activities.length === 0 ? (
        <EmptyState title="No recent activity yet" description="Lead, task, invoice, appointment, AI, and automation events will appear here as the OS runs." className="py-10" />
      ) : (
        <div className="divide-y divide-gray-800">
          {activities.map((activity) => (
            <div key={String(activity.id)} className="flex gap-3 py-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
              <div className="min-w-0 flex-1">
                {activity.href ? (
                  <Link href={String(activity.href)} className="font-medium text-white hover:text-blue-300">{String(activity.title)}</Link>
                ) : (
                  <p className="font-medium text-white">{String(activity.title)}</p>
                )}
                <p className="text-sm text-gray-400">{String(activity.description || "")}</p>
                <p className="mt-1 text-xs text-gray-600">
                  {String(activity.actor_name || "System")} / {new Date(String(activity.created_at || activity.createdAt || "1970-01-01T00:00:00.000Z")).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeadModal({ open, onClose, onSubmit, user }: { open: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; user: User | null }) {
  return (
    <DashboardModal open={open} title="New Lead" description="Create a lead locally and log activity. Backend save wiring is pending." onClose={onClose} size="lg">
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Contact name"><input name="contactName" required className={inputClass} /></Field>
        <Field label="Company name"><input name="companyName" className={inputClass} /></Field>
        <Field label="Phone"><input name="phone" className={inputClass} /></Field>
        <Field label="Email"><input name="email" type="email" className={inputClass} /></Field>
        <Field label="Source"><input name="source" placeholder="Website, referral, call" className={inputClass} /></Field>
        <Field label="Service needed"><input name="serviceNeeded" className={inputClass} /></Field>
        <Field label="Lead status"><select name="status" className={inputClass}><option value="new">New</option><option value="follow_up">Follow-up</option><option value="qualified">Qualified</option></select></Field>
        <Field label="Assigned user"><input name="assignedUser" defaultValue={user?.name || "Owner"} className={inputClass} /></Field>
        <Field label="Follow-up date"><input name="followUpDate" type="date" className={inputClass} /></Field>
        <Field label="Notes"><textarea name="notes" rows={3} className={inputClass} /></Field>
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Cancel</button>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Lead</button>
        </div>
      </form>
    </DashboardModal>
  );
}

function TaskModal({ open, onClose, onSubmit, user }: { open: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; user: User | null }) {
  return (
    <DashboardModal open={open} title="New Task" description="Create an operational task and log activity." onClose={onClose} size="lg">
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Title"><input name="title" required className={inputClass} /></Field>
        <Field label="Due date"><input name="dueDate" type="date" defaultValue={todayValue()} className={inputClass} /></Field>
        <Field label="Priority"><select name="priority" className={inputClass}><option>low</option><option>medium</option><option>high</option><option>urgent</option></select></Field>
        <Field label="Status"><select name="status" className={inputClass}><option value="active">Active</option><option value="pending">Pending</option><option value="overdue">Overdue</option></select></Field>
        <Field label="Assigned user"><input name="assignedUser" defaultValue={user?.name || "Owner"} className={inputClass} /></Field>
        <Field label="Related record type"><select name="relatedType" className={inputClass}><option value="">None</option><option>lead</option><option>contact</option><option>company</option><option>deal</option><option>work_order</option><option>invoice</option></select></Field>
        <Field label="Related record ID/name"><input name="relatedRecord" className={inputClass} /></Field>
        <Field label="Description"><textarea name="description" rows={3} className={inputClass} /></Field>
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Cancel</button>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Task</button>
        </div>
      </form>
    </DashboardModal>
  );
}

function ExpenseModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <DashboardModal open={open} title="Log Expense" description="Receipt upload is shown as a disabled placeholder until storage wiring is ready." onClose={onClose} size="lg">
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Vendor"><input name="vendor" required className={inputClass} /></Field>
        <Field label="Amount"><input name="amount" type="number" min="0" step="0.01" required className={inputClass} /></Field>
        <Field label="Category"><select name="category" className={inputClass}><option>Materials</option><option>Labor</option><option>Vehicle</option><option>Supplies</option><option>Other</option></select></Field>
        <Field label="Project/work order"><input name="project" className={inputClass} /></Field>
        <Field label="Date"><input name="date" type="date" defaultValue={todayValue()} className={inputClass} /></Field>
        <Field label="Receipt upload"><input disabled className={`${inputClass} cursor-not-allowed opacity-60`} value="Upload coming soon" readOnly /></Field>
        <Field label="Notes"><textarea name="notes" rows={3} className={inputClass} /></Field>
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Cancel</button>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Log Expense</button>
        </div>
      </form>
    </DashboardModal>
  );
}

function ProjectModal({ open, onClose, onSubmit, user }: { open: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; user: User | null }) {
  return (
    <DashboardModal open={open} title="New Project" description="Create a project locally and log activity. Backend persistence is pending." onClose={onClose} size="lg">
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Project name"><input name="projectName" required className={inputClass} /></Field>
        <Field label="Client/customer"><input name="client" className={inputClass} /></Field>
        <Field label="Address/location"><input name="address" className={inputClass} /></Field>
        <Field label="Start date"><input name="startDate" type="date" className={inputClass} /></Field>
        <Field label="Target completion"><input name="targetDate" type="date" className={inputClass} /></Field>
        <Field label="Budget"><input name="budget" type="number" min="0" className={inputClass} /></Field>
        <Field label="Status"><select name="status" className={inputClass}><option value="active">Active</option><option value="planning">Planning</option><option value="on_hold">On hold</option></select></Field>
        <Field label="Project manager"><input name="manager" defaultValue={user?.name || "Owner"} className={inputClass} /></Field>
        <Field label="Notes"><textarea name="notes" rows={3} className={inputClass} /></Field>
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Cancel</button>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create Project</button>
        </div>
      </form>
    </DashboardModal>
  );
}

function JarvisDrawer({
  open,
  prompt,
  response,
  loading,
  onPrompt,
  onSubmit,
  onClose,
  onCreateTask,
  onCopy,
  onDismiss,
}: {
  open: boolean;
  prompt: string;
  response: JarvisResponse | null;
  loading: boolean;
  onPrompt: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onCreateTask: () => void;
  onCopy: () => void;
  onDismiss: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/60" aria-label="Close Jarvis" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-gray-800 bg-[#111827] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Ask Jarvis</h2>
            <p className="mt-1 text-sm text-gray-400">Use Command Center context to summarize, prioritize, or draft the next task.</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white">X</button>
        </div>
        <textarea
          value={prompt}
          onChange={(event) => onPrompt(event.target.value)}
          rows={6}
          className={inputClass}
          placeholder={"What needs my attention today?\nSummarize overdue tasks.\nFind leads that need follow-up.\nCreate a task from this."}
        />
        <button onClick={onSubmit} disabled={loading} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? "Asking..." : "Ask Jarvis"}
        </button>
        {response && (
          <div className="mt-5 rounded-xl border border-gray-800 bg-[#0b1220] p-4">
            <p className="text-sm leading-relaxed text-gray-200">{response.message}</p>
            {response.suggestedTask && (
              <div className="mt-4 rounded-lg border border-gray-800 bg-[#111827] p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Suggested task</p>
                <p className="mt-1 font-medium text-white">{response.suggestedTask.title}</p>
                <p className="mt-1 text-sm text-gray-400">{response.suggestedTask.description}</p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={onCreateTask} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Create Task</button>
              <button onClick={onCopy} className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700">Copy</button>
              <button onClick={onDismiss} className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700">Dismiss</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
