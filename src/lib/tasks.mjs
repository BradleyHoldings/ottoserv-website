export const TASK_STATUSES = ["open", "in_progress", "waiting", "needs_approval", "overdue", "done", "archived"];
export const TASK_PRIORITIES = ["urgent", "high", "medium", "low"];
export const TASK_TYPES = [
  "general",
  "client_follow_up",
  "lead_follow_up",
  "estimate",
  "work_order",
  "project",
  "invoice",
  "approval",
  "automation",
  "ai_agent",
  "internal",
];
export const TASK_SOURCES = ["manual", "otto", "jarvis", "automation", "integration"];
export const TASK_VISIBILITIES = ["internal", "client_visible"];
export const TASK_RECURRENCES = ["none", "daily", "weekly", "monthly", "custom"];
export const TASK_APPROVAL_STATUSES = ["none", "pending", "approved", "rejected"];

const CLOSED_STATUSES = new Set(["done", "archived"]);

function clean(value, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function normalize(value, fallback = "") {
  return clean(value, fallback).toLowerCase().replace(/[\s-]+/g, "_");
}

function dateOnly(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function isSameDay(a, b) {
  return dateOnly(a) === dateOnly(b);
}

function formatTaskId(sequence, now) {
  const year = new Date(now).getFullYear();
  return `TSK-${year}-${String(sequence).padStart(5, "0")}`;
}

function defaultApprovalStatus(input = {}) {
  if (input.approvalStatus) return normalize(input.approvalStatus);
  return input.approvalRequired ? "pending" : "none";
}

function defaultStatus(input = {}) {
  if (input.approvalRequired && defaultApprovalStatus(input) === "pending") return "needs_approval";
  return normalize(input.status, "open");
}

function relatedRouteFor(type, id) {
  if (!type) return "";
  const routes = {
    lead: "/dashboard/leads",
    leads: "/dashboard/leads",
    crm: "/dashboard/crm",
    client: "/dashboard/crm",
    project: "/dashboard/projects",
    projects: "/dashboard/projects",
    work_order: "/dashboard/work-orders",
    work_orders: "/dashboard/work-orders",
    "work-orders": "/dashboard/work-orders",
    invoice: "/dashboard/financials",
    invoices: "/dashboard/financials",
    estimate: "/dashboard/financials",
    automation: "/dashboard/automations",
    automations: "/dashboard/automations",
    report: "/dashboard/reports",
    reports: "/dashboard/reports",
    ai_agent: "/dashboard/ai-agents",
    agents: "/dashboard/ai-agents",
  };
  const base = routes[normalize(type)] || "";
  return base && id ? `${base}?id=${encodeURIComponent(id)}` : base;
}

export function validateTaskInput(input = {}) {
  const missing = clean(input.title) ? [] : ["title"];
  return { valid: missing.length === 0, missing };
}

export function isTaskOverdue(task = {}, now = new Date().toISOString()) {
  if (!task.dueDate || CLOSED_STATUSES.has(normalize(task.status))) return false;
  const due = dateOnly(task.dueDate);
  const today = dateOnly(now);
  if (!due || !today) return false;
  return due < today;
}

export function buildTask(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const actor = clean(options.actor, "OttoServ");
  const approvalRequired = Boolean(input.approvalRequired);
  const approvalStatus = defaultApprovalStatus({ ...input, approvalRequired });
  const relatedRecordType = clean(input.relatedRecordType || input.relatedType);
  const relatedRecordId = clean(input.relatedRecordId || input.relatedId);
  const relatedRecordLabel = clean(input.relatedRecordLabel || input.relatedLabel);

  return {
    id: clean(input.id, formatTaskId(options.sequence || 1, now)),
    title: clean(input.title),
    description: clean(input.description),
    status: defaultStatus({ ...input, approvalRequired, approvalStatus }),
    priority: normalize(input.priority, "medium"),
    type: normalize(input.type, "general"),
    source: normalize(input.source, "manual"),
    assignedTo: clean(input.assignedTo || input.assigned_to, "Unassigned"),
    createdBy: clean(input.createdBy || input.created_by, actor),
    clientId: clean(input.clientId || input.client_id),
    leadId: clean(input.leadId || input.lead_id),
    projectId: clean(input.projectId || input.project_id),
    workOrderId: clean(input.workOrderId || input.work_order_id),
    invoiceId: clean(input.invoiceId || input.invoice_id),
    estimateId: clean(input.estimateId || input.estimate_id),
    automationId: clean(input.automationId || input.automation_id),
    reportId: clean(input.reportId || input.report_id),
    dueDate: clean(input.dueDate || input.due_date),
    reminderDate: clean(input.reminderDate || input.reminder_date),
    completedAt: clean(input.completedAt || input.completed_at),
    completedBy: clean(input.completedBy || input.completed_by),
    approvalRequired,
    approvalStatus,
    rejectionReason: clean(input.rejectionReason || input.rejection_reason),
    visibility: normalize(input.visibility, "client_visible"),
    recurrence: normalize(input.recurrence, "none"),
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
    relatedRecordType,
    relatedRecordId,
    relatedRecordLabel,
    relatedRecordHref: input.relatedRecordHref || relatedRouteFor(relatedRecordType || input.type, relatedRecordId),
    createdAt: input.createdAt || input.created_at || now,
    updatedAt: input.updatedAt || input.updated_at || now,
    activityLog: [
      {
        timestamp: now,
        actor,
        action: input.initialAction || "Task created",
        detail: input.description ? clean(input.description).slice(0, 160) : undefined,
      },
      ...(Array.isArray(input.activityLog) ? input.activityLog : []),
    ],
  };
}

export function addTaskActivity(task, action, detail = "", actor = "OttoServ", now = new Date().toISOString()) {
  return {
    ...task,
    updatedAt: now,
    activityLog: [
      { timestamp: now, actor, action, detail: detail || undefined },
      ...(Array.isArray(task.activityLog) ? task.activityLog : []),
    ],
  };
}

export function startTask(task, actor = "OttoServ") {
  return addTaskActivity({ ...task, status: "in_progress" }, "Task started", "", actor);
}

export function markTaskDone(task, actor = "OttoServ", now = new Date().toISOString()) {
  return addTaskActivity({ ...task, status: "done", completedAt: now, completedBy: actor }, "Task completed", "", actor, now);
}

export function snoozeTask(task, dueDate, actor = "OttoServ") {
  return addTaskActivity({ ...task, dueDate }, "Task snoozed", `Due date changed to ${dueDate}.`, actor);
}

export function assignTask(task, assignedTo, actor = "OttoServ") {
  const assignee = clean(assignedTo, "Unassigned");
  return addTaskActivity({ ...task, assignedTo: assignee }, `Assigned to ${assignee}`, "", actor);
}

export function approveTask(task, actor = "OttoServ") {
  const nextStatus = task.status === "needs_approval" ? "open" : task.status;
  return addTaskActivity(
    { ...task, status: nextStatus, approvalStatus: "approved", approvalRequired: Boolean(task.approvalRequired) },
    "Task approved",
    "",
    actor,
  );
}

export function rejectTask(task, reason, actor = "OttoServ") {
  return addTaskActivity(
    { ...task, status: "waiting", approvalStatus: "rejected", rejectionReason: clean(reason) },
    "Task rejected",
    clean(reason),
    actor,
  );
}

export function archiveTask(task, actor = "OttoServ") {
  return addTaskActivity({ ...task, status: "archived" }, "Task archived", "", actor);
}

export function getTaskSummary(tasks = [], now = new Date().toISOString()) {
  const visible = tasks.filter((task) => normalize(task.status) !== "archived");
  return {
    openTasks: visible.filter((task) => !CLOSED_STATUSES.has(normalize(task.status))).length,
    dueToday: visible.filter((task) => isSameDay(task.dueDate, now) && !CLOSED_STATUSES.has(normalize(task.status))).length,
    overdue: visible.filter((task) => isTaskOverdue(task, now)).length,
    needsApproval: visible.filter((task) => task.approvalStatus === "pending" || normalize(task.status) === "needs_approval").length,
  };
}

export function filterTasks(tasks = [], filters = {}, now = new Date().toISOString()) {
  const query = clean(filters.search).toLowerCase();
  return tasks.filter((task) => {
    const status = normalize(task.status);
    if ((filters.status || "all") !== "all") {
      if (filters.status === "overdue") {
        if (!isTaskOverdue(task, now)) return false;
      } else if (status !== filters.status) {
        return false;
      }
    } else if (status === "archived" && !filters.includeArchived) {
      return false;
    }
    if (filters.priority && filters.priority !== "all" && normalize(task.priority) !== filters.priority) return false;
    if (filters.type && filters.type !== "all" && normalize(task.type) !== filters.type) return false;
    if (filters.source && filters.source !== "all" && normalize(task.source) !== filters.source) return false;
    if (filters.visibility && filters.visibility !== "all" && normalize(task.visibility) !== filters.visibility) return false;
    if (filters.assignedTo && filters.assignedTo !== "all" && task.assignedTo !== filters.assignedTo) return false;
    if (filters.projectId && filters.projectId !== "all" && task.projectId !== filters.projectId) return false;
    if (filters.dueDate && dateOnly(task.dueDate) !== filters.dueDate) return false;
    if (query) {
      const haystack = [
        task.title,
        task.description,
        task.assignedTo,
        task.clientName,
        task.projectName,
        task.leadName,
        task.relatedRecordLabel,
        task.type,
        task.source,
      ].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function createTaskFromSuggestion(suggestion = {}, options = {}) {
  const task = buildTask(
    {
      title: suggestion.title,
      description: [suggestion.reason, suggestion.suggestedAction].filter(Boolean).join(" Suggested action: "),
      type: suggestion.type || "general",
      priority: suggestion.priority || "medium",
      source: "otto",
      status: "open",
      assignedTo: suggestion.assignedTo || "Operations",
      relatedRecordType: suggestion.relatedRecordType,
      relatedRecordId: suggestion.relatedRecordId,
      relatedRecordLabel: suggestion.relatedRecordLabel,
      visibility: suggestion.visibility || "client_visible",
      initialAction: "Suggested task accepted",
    },
    options,
  );
  return task;
}

export function getSuggestedTasks() {
  return [
    {
      id: "suggestion-lead-follow-up",
      title: "Follow up with lead: 24 hours since last contact",
      reason: "New leads convert faster when contacted within the first day.",
      suggestedAction: "Call or email the lead and log the outcome.",
      type: "lead_follow_up",
      priority: "high",
      relatedRecordType: "leads",
      relatedRecordLabel: "New leads queue",
    },
    {
      id: "suggestion-overdue-work-order",
      title: "Review overdue work order",
      reason: "A work order may be past its SLA or promised follow-up window.",
      suggestedAction: "Check status, assign an owner, and notify the client.",
      type: "work_order",
      priority: "high",
      relatedRecordType: "work-orders",
      relatedRecordLabel: "Open work orders",
    },
    {
      id: "suggestion-social-approval",
      title: "Approve AI-generated social post",
      reason: "Jarvis has a draft waiting for approval.",
      suggestedAction: "Review the post before publishing.",
      type: "approval",
      priority: "medium",
      approvalRequired: true,
      relatedRecordType: "social-intelligence",
      relatedRecordLabel: "Social approvals",
    },
    {
      id: "suggestion-automation-failure",
      title: "Check failed automation",
      reason: "An automation may need a configuration update.",
      suggestedAction: "Review the failed run and restart after fixing the trigger.",
      type: "automation",
      priority: "urgent",
      relatedRecordType: "automations",
      relatedRecordLabel: "Automation failures",
    },
    {
      id: "suggestion-invoice-reminder",
      title: "Send unpaid invoice reminder",
      reason: "An invoice may need follow-up before aging further.",
      suggestedAction: "Send a reminder or create a collection task.",
      type: "invoice",
      priority: "medium",
      relatedRecordType: "invoices",
      relatedRecordLabel: "Open invoices",
    },
  ];
}
