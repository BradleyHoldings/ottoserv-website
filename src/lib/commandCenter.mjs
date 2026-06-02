const CLOSED_STATUSES = new Set(["done", "completed", "closed", "won", "lost", "archived", "paid"]);
const OPEN_INVOICE_STATUSES = new Set(["open", "sent", "overdue", "unpaid", "draft"]);
const ACTIVE_TASK_STATUSES = new Set(["active", "todo", "in_progress", "pending", "new"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === new Date().toDateString();
}

function isPast(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function isOpenStatus(status) {
  return !CLOSED_STATUSES.has(String(status || "").toLowerCase());
}

function titleOf(item, fallback) {
  return item?.title || item?.name || item?.project_name || item?.client_name || fallback;
}

function itemHref(base, item) {
  return item?.id ? `${base}/${item.id}` : base;
}

export function isOttoServAdmin(user) {
  const role = String(user?.role || user?.type || "").toLowerCase();
  return role === "ottoserv_admin" || (role === "super_admin" && user?.isOttoServEmployee === true);
}

export function buildCommandCenterData(raw = {}, user = {}) {
  const tasks = asArray(raw.tasks);
  const leads = asArray(raw.leads);
  const calls = asArray(raw.calls);
  const events = asArray(raw.calendarEvents);
  const workOrders = asArray(raw.workOrders);
  const invoices = asArray(raw.invoices);
  const automations = asArray(raw.automations);
  const inboxItems = asArray(raw.inboxItems);
  const projects = asArray(raw.projects);
  const approvals = asArray(raw.approvals);
  const dashboardAlerts = asArray(raw.dashboardAlerts);
  const dashboardActivity = asArray(raw.recentActivity);
  const leadSupply = raw.leadSupply || null;
  const revenueEngine = raw.revenueEngine || null;
  const admin = isOttoServAdmin(user);

  const activeTasks = tasks.filter((task) => ACTIVE_TASK_STATUSES.has(String(task.status || "").toLowerCase()));
  const overdueTasks = tasks.filter((task) => String(task.status || "").toLowerCase() === "overdue" || isPast(task.due_date || task.dueDate));
  const newLeads = leads.filter((lead) => ["new", "follow_up", "uncontacted"].includes(String(lead.status || "").toLowerCase()));
  const callsToday = calls.filter((call) => isToday(call.created_at || call.createdAt));
  const todayAppointments = events.filter((event) => isToday(event.start || event.start_at || event.date));
  const openWorkOrders = workOrders.filter((workOrder) => isOpenStatus(workOrder.status));
  const openInvoices = invoices.filter((invoice) => OPEN_INVOICE_STATUSES.has(String(invoice.status || "").toLowerCase()));
  const activeAutomations = automations.filter((automation) => ["active", "running"].includes(String(automation.status || "").toLowerCase()));
  const failedAutomations = automations.filter((automation) => ["failed", "paused", "error"].includes(String(automation.status || "").toLowerCase()));
  const unreadInbox = inboxItems.filter((item) => item.unread || item.read === false || String(item.status || "").toLowerCase() === "unread");
  const aiPending = approvals.filter((approval) => /ai|jarvis|agent/i.test(`${approval.type || ""} ${approval.title || ""}`));
  const activeProjects = projects.filter((project) => isOpenStatus(project.status));

  const kpis = [
    { id: "activeTasks", label: "Active Tasks", value: activeTasks.length, helper: `${overdueTasks.length} overdue`, href: "/dashboard/tasks?status=active", color: "blue" },
    { id: "todayAppointments", label: "Today's Appointments", value: todayAppointments.length, helper: todayAppointments.length ? "Scheduled today" : "No appointments scheduled", href: "/dashboard/calendar?date=today", color: "green" },
    { id: "overdueTasks", label: "Overdue Tasks", value: overdueTasks.length, helper: overdueTasks.length ? "Requires attention" : "All caught up", href: "/dashboard/tasks?status=overdue", color: overdueTasks.length ? "red" : "green" },
    { id: "newLeads", label: "New Leads", value: newLeads.length, helper: newLeads.length ? "Need follow-up" : "All contacted", href: "/dashboard/leads?status=new", color: "purple" },
    { id: "callsToday", label: "Calls Today", value: callsToday.length, helper: callsToday.length ? `${callsToday.filter((call) => call.status === "completed").length} connected` : "No calls yet", href: "/dashboard/inbox?type=calls&date=today", color: "blue" },
    { id: "openWorkOrders", label: "Open Work Orders", value: openWorkOrders.length, helper: openWorkOrders.length ? "Open jobs" : "No open work orders", href: "/dashboard/work-orders?status=open", color: "blue" },
    { id: "aiPending", label: "AI Actions Pending", value: aiPending.length, helper: aiPending.length ? "Review required" : "All clear", href: "/dashboard/agents?status=pending", color: aiPending.length ? "yellow" : "green" },
    {
      id: "revenueRepairs",
      label: "Revenue Repairs",
      value: Number(revenueEngine?.repairQueue?.length || 0),
      helper: revenueEngine?.nextAction || "Revenue loop ready",
      href: "/dashboard/command-center#revenue-engine",
      color: revenueEngine?.repairQueue?.length ? "red" : "green",
    },
  ];

  const moduleCards = [
    { id: "tasks", title: "Today's Tasks", value: activeTasks.length, description: overdueTasks.length ? `${overdueTasks.length} overdue` : "No blockers", href: "/dashboard/tasks?status=active" },
    { id: "leads", title: "Recent Leads", value: newLeads.length, description: "New or waiting follow-up", href: "/dashboard/leads?status=new" },
    { id: "workOrders", title: "Active Work Orders", value: openWorkOrders.length, description: "Open field work", href: "/dashboard/work-orders?status=open" },
    { id: "invoices", title: "Open Invoices", value: openInvoices.length, description: "Need payment or review", href: "/dashboard/financials?status=open" },
    { id: "automations", title: "Active Automations", value: activeAutomations.length, description: failedAutomations.length ? `${failedAutomations.length} need review` : "Running cleanly", href: "/dashboard/automations" },
    { id: "inbox", title: "Unread Inbox", value: unreadInbox.length, description: "Messages and calls", href: "/dashboard/inbox" },
    { id: "agents", title: "Agent Alerts", value: aiPending.length + failedAutomations.length, description: "AI approvals and failures", href: "/dashboard/agents?status=pending" },
    {
      id: "revenueEngine",
      title: "Revenue Engine",
      value: Number(revenueEngine?.revenueMovement?.calls_ready || 0) + Number(revenueEngine?.revenueMovement?.leads_ready || 0),
      description: revenueEngine?.selfRepairStatus === "repairs_open" ? "Repair before scale" : "Daily loop ready",
      href: "/dashboard/command-center#revenue-engine",
    },
  ];

  const snapshot = {
    scheduledToday: {
      title: "Scheduled Today",
      empty: "No appointments today.",
      actionLabel: "Schedule Appointment",
      actionHref: "/dashboard/calendar?action=new",
      items: todayAppointments.slice(0, 4).map((event) => ({
        id: event.id || event.title,
        title: titleOf(event, "Appointment"),
        meta: event.start ? new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today",
        href: itemHref("/dashboard/calendar", event),
        actionLabel: "View",
      })),
    },
    leadsToFollowUp: {
      title: "Leads to Follow Up",
      empty: "No leads waiting.",
      actionLabel: "Add Lead",
      action: "newLead",
      items: newLeads.slice(0, 4).map((lead) => ({
        id: lead.id || lead.name,
        title: titleOf(lead, "Lead"),
        meta: lead.service_needed || lead.source || "Needs follow-up",
        href: itemHref("/dashboard/leads", lead),
        actionLabel: "Follow Up",
      })),
    },
    invoicesNeedingAction: {
      title: "Invoices Needing Action",
      empty: "No invoices needing action.",
      actionLabel: "View Financials",
      actionHref: "/dashboard/financials",
      items: openInvoices.slice(0, 4).map((invoice) => ({
        id: invoice.id || invoice.client_name,
        title: titleOf(invoice, "Invoice"),
        meta: `${invoice.status || "open"}${invoice.amount ? ` / $${Number(invoice.amount).toLocaleString()}` : ""}`,
        href: "/dashboard/financials",
        actionLabel: "View",
      })),
    },
    recentCalls: {
      title: "Recent Calls or Messages",
      empty: "No calls today.",
      actionLabel: "View Inbox",
      actionHref: "/dashboard/inbox",
      items: callsToday.slice(0, 4).map((call) => ({
        id: call.id || call.contact,
        title: titleOf(call, "Call"),
        meta: call.outcome || call.status || "Call",
        href: "/dashboard/inbox?type=calls&date=today",
        actionLabel: "View",
      })),
    },
  };

  const alerts = [
    ...dashboardAlerts.map((alert, index) => ({
      id: alert.id || `dashboard-${index}`,
      type: alert.type || "system",
      severity: alert.severity || "medium",
      title: alert.title || "Dashboard alert",
      description: alert.description || "Action may be required.",
      href: alert.href || "/dashboard/command-center",
      suggestedAction: alert.suggestedAction || "Review",
      dismissible: alert.dismissible !== false,
    })),
    ...overdueTasks.slice(0, 3).map((task) => ({
      id: `task-${task.id || task.title}`,
      type: "overdue_task",
      severity: "high",
      title: titleOf(task, "Overdue task"),
      description: task.due_date ? `Was due ${task.due_date}.` : "Task is overdue.",
      href: "/dashboard/tasks?status=overdue",
      suggestedAction: "Review task",
      dismissible: false,
    })),
    ...openInvoices.filter((invoice) => String(invoice.status || "").toLowerCase() === "overdue").slice(0, 2).map((invoice) => ({
      id: `invoice-${invoice.id || invoice.client_name}`,
      type: "invoice_overdue",
      severity: "medium",
      title: `${titleOf(invoice, "Invoice")} is overdue`,
      description: invoice.amount ? `$${Number(invoice.amount).toLocaleString()} needs action.` : "Invoice needs action.",
      href: "/dashboard/financials",
      suggestedAction: "View invoice",
      dismissible: false,
    })),
    ...failedAutomations.slice(0, 2).map((automation) => ({
      id: `automation-${automation.id || automation.name}`,
      type: "automation_failed",
      severity: "high",
      title: `${titleOf(automation, "Automation")} needs review`,
      description: "Automation is failed or paused.",
      href: "/dashboard/automations",
      suggestedAction: "Review automation",
      dismissible: false,
    })),
  ];

  const normalizedApprovals = approvals.slice(0, 6).map((approval, index) => ({
    id: approval.id || `approval-${index}`,
    type: approval.type || "Jarvis action",
    title: titleOf(approval, "Approval required"),
    createdAt: approval.created_at || approval.createdAt || new Date().toISOString(),
    preview: approval.preview || approval.description || "Review this item before Jarvis proceeds.",
    href: approval.href || "/dashboard/agents?status=pending",
  }));

  const recentActivity = [
    ...dashboardActivity,
    ...tasks.filter((task) => String(task.status || "").toLowerCase() === "completed").map((task) => ({
      id: `task-completed-${task.id || task.title}`,
      actor_type: "user",
      actor_name: task.assigned_to || "Team",
      event_type: "task_completed",
      title: `${titleOf(task, "Task")} completed`,
      description: task.description || "Task marked complete.",
      related_type: "task",
      related_id: task.id,
      href: itemHref("/dashboard/tasks", task),
      created_at: task.updated_at || task.created_at || new Date().toISOString(),
    })),
    ...newLeads.map((lead) => ({
      id: `lead-${lead.id || lead.name}`,
      actor_type: "system",
      actor_name: "OttoServ",
      event_type: "lead_added",
      title: `${titleOf(lead, "Lead")} added`,
      description: lead.service_needed || "New lead needs follow-up.",
      related_type: "lead",
      related_id: lead.id,
      href: itemHref("/dashboard/leads", lead),
      created_at: lead.created_at || new Date().toISOString(),
    })),
    ...callsToday.map((call) => ({
      id: `call-${call.id || call.contact}`,
      actor_type: "ai",
      actor_name: call.agent || "Jarvis",
      event_type: "call_logged",
      title: `Call with ${call.contact || "lead"}`,
      description: call.outcome || call.status || "Call logged.",
      related_type: "call",
      related_id: call.id,
      href: "/dashboard/inbox?type=calls&date=today",
      created_at: call.created_at || new Date().toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))
    .slice(0, 10);

  const jarvisBrief = {
    sinceYesterday: `${newLeads.length} lead${newLeads.length === 1 ? "" : "s"}, ${callsToday.length} call${callsToday.length === 1 ? "" : "s"}, ${recentActivity.length} activity event${recentActivity.length === 1 ? "" : "s"}.`,
    needsAttention: alerts.length ? `${alerts.length} item${alerts.length === 1 ? "" : "s"} need attention.` : "Nothing urgent is waiting.",
    recommendation: alerts.length ? "Start with the highest severity alert, then clear follow-ups due today." : "Use the quiet window to add tasks, connect integrations, or review reports.",
    handling: aiPending.length ? `${aiPending.length} Jarvis action${aiPending.length === 1 ? "" : "s"} waiting for approval.` : "Jarvis will show approval requests here when actions need permission.",
    emptyMessage: "Everything looks clear. Connect your CRM, calendar, inbox, and financials to unlock a full daily operating brief.",
    revenueEngine: revenueEngine
      ? `${revenueEngine.todayPlan?.icp_focus || "Revenue ICP"} / ${revenueEngine.nextAction || "run daily loop"}`
      : "RevenueEngine will appear here once dashboard state loads.",
  };

  const leadHealth = admin
    ? {
        mode: "platform",
        targetPerDay: Number(leadSupply?.targetPerDay || 200),
        attained: Number(leadSupply?.attained || 0),
        calls: Number(leadSupply?.totalsToday?.calls || 0),
        failed: Number(leadSupply?.totalsToday?.failed || 0),
        blocked: Number(leadSupply?.totalsToday?.blocked || leadSupply?.dedupBlocked || 0),
        href: "/calls/import",
      }
    : {
        mode: "client",
        newLeadsToday: leads.filter((lead) => isToday(lead.created_at || lead.createdAt)).length,
        contactedLeads: leads.filter((lead) => ["contacted", "qualified", "estimate_scheduled"].includes(String(lead.status || "").toLowerCase())).length,
        awaitingResponse: leads.filter((lead) => ["follow_up", "awaiting_response"].includes(String(lead.status || "").toLowerCase())).length,
        followUpsDue: newLeads.length,
        missedLeads: calls.filter((call) => ["missed", "failed"].includes(String(call.status || "").toLowerCase())).length,
        suggestedNextAction: newLeads.length ? "Follow up with the newest lead first." : "Add a lead or connect your CRM to track follow-up health.",
        href: "/dashboard/leads",
      };

  return {
    kpis,
    moduleCards,
    snapshot,
    alerts,
    approvals: normalizedApprovals,
    recentActivity,
    jarvisBrief,
    leadHealth,
    revenueEngine,
    meta: {
      activeProjects: activeProjects.length,
      openInvoices: openInvoices.length,
      activeAutomations: activeAutomations.length,
      unreadInbox: unreadInbox.length,
    },
  };
}

export function getJarvisCommandCenterResponse(prompt = "", data = {}) {
  const text = String(prompt || "").toLowerCase();
  const alertCount = asArray(data.alerts).length;

  if (text.includes("overdue")) {
    return {
      message: alertCount
        ? `You have ${alertCount} alert${alertCount === 1 ? "" : "s"} to review. Start with overdue tasks and invoices before creating new work.`
        : "I do not see overdue items in the current Command Center snapshot.",
      suggestedTask: {
        title: "Review overdue operations items",
        description: "Check overdue tasks, invoices, and blocked work before end of day.",
        priority: alertCount ? "high" : "medium",
      },
    };
  }

  if (text.includes("lead")) {
    return {
      message: "I checked lead follow-up health. Prioritize new leads and any follow-ups due today.",
      suggestedTask: {
        title: "Follow up with waiting leads",
        description: "Review new and follow-up leads from Command Center.",
        priority: "high",
      },
    };
  }

  return {
    message:
      "Here is what needs attention today: review active alerts, clear any pending approvals, and create tasks for follow-ups that need an owner.",
    suggestedTask: {
      title: "Review Command Center priorities",
      description: "Work through alerts, approvals, and today follow-ups.",
      priority: alertCount ? "high" : "medium",
    },
  };
}
