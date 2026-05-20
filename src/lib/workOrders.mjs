export const WORK_ORDER_STATUSES = [
  "draft",
  "new",
  "needs_approval",
  "scheduled",
  "in_progress",
  "waiting_on_client",
  "waiting_on_parts",
  "ready_for_review",
  "completed",
  "invoiced",
  "canceled",
];

export const WORK_ORDER_COLUMNS = [
  { id: "new", title: "New", dotColor: "bg-blue-500" },
  { id: "needs_approval", title: "Needs Approval", dotColor: "bg-yellow-500" },
  { id: "scheduled", title: "Scheduled", dotColor: "bg-purple-500" },
  { id: "in_progress", title: "In Progress", dotColor: "bg-orange-500" },
  { id: "waiting_on_parts", title: "Waiting on Parts / Vendor", dotColor: "bg-amber-500", match: ["waiting_on_parts", "waiting_on_client"] },
  { id: "ready_for_review", title: "Ready for Review", dotColor: "bg-cyan-500" },
  { id: "completed", title: "Completed", dotColor: "bg-emerald-500" },
];

export const WORK_ORDER_CATEGORIES = [
  "Plumbing",
  "HVAC",
  "Electrical",
  "Appliance",
  "Roofing",
  "Landscaping",
  "Cleaning",
  "Security",
  "General Maintenance",
  "Emergency",
  "Other",
];

export const WORK_ORDER_SOURCES = [
  { id: "manual", label: "Manual entry" },
  { id: "tenant_request", label: "Tenant request" },
  { id: "phone_call", label: "Phone call" },
  { id: "email", label: "Email" },
  { id: "website_form", label: "Website form" },
  { id: "inspection", label: "Inspection" },
  { id: "recurring_maintenance", label: "Recurring maintenance" },
  { id: "ai_created", label: "AI-created" },
];

export const STATUS_LABELS = {
  new: "New",
  needs_approval: "Needs Approval",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  waiting_on_parts: "Waiting on Parts / Vendor",
  ready_for_review: "Ready for Review",
  completed: "Completed",
  draft: "Draft",
  waiting_on_client: "Waiting on Client",
  invoiced: "Invoiced",
  canceled: "Canceled",
};

const REQUIRED_FIELDS = ["title", "client", "property", "description", "priority", "category"];
const CLOSED_STATUSES = new Set(["completed", "invoiced", "canceled"]);

function clean(value) {
  return String(value ?? "").trim();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

function isSameDay(a, b) {
  return dateOnly(a) === dateOnly(b);
}

function isPastDate(value, now = new Date().toISOString()) {
  if (!value) return false;
  const due = new Date(value);
  const today = new Date(now);
  if (Number.isNaN(due.getTime()) || Number.isNaN(today.getTime())) return false;
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function isThisWeek(value, now = new Date().toISOString()) {
  if (!value) return false;
  const date = new Date(value);
  const current = new Date(now);
  if (Number.isNaN(date.getTime()) || Number.isNaN(current.getTime())) return false;
  const day = current.getDay();
  const start = new Date(current);
  start.setDate(current.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function formatWorkOrderId(sequence, now) {
  const year = new Date(now).getFullYear();
  return `WO-${year}-${String(sequence).padStart(5, "0")}`;
}

function defaultStatus(input) {
  const approvalRequired = Boolean(input.approvalRequired);
  const approvalStatus = clean(input.approvalStatus || "not_required");
  if (approvalRequired && approvalStatus !== "approved" && approvalStatus !== "not_required") return "needs_approval";
  if (input.scheduledDate) return "scheduled";
  return "new";
}

function automationActivity(input) {
  const options = input.automationOptions || {};
  const activity = [];
  if (options.notifyTenant) activity.push("Tenant notification queued");
  if (options.notifyVendor) activity.push("Vendor/tech notification queued");
  if (options.aiSummary) activity.push("AI summary pending");
  if (options.aiCategory) activity.push("AI category suggestion pending");
  if (options.aiPriority) activity.push("AI priority suggestion pending");
  if (options.followUpReminder) activity.push("Follow-up reminder queued");
  if (options.requireCloseout) activity.push("Completion notes/photos required before closing");
  return activity;
}

export function validateWorkOrderInput(input = {}) {
  const missing = REQUIRED_FIELDS.filter((field) => !clean(input[field]));
  return { valid: missing.length === 0, missing };
}

export function buildWorkOrder(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const sequence = options.sequence || 1;
  const actor = options.actor || "OttoServ";
  const approvalRequired = Boolean(input.approvalRequired);
  const approvalStatus = clean(input.approvalStatus) || (approvalRequired ? "pending" : "not_required");
  const estimatedCost = toNumber(input.estimatedCost || input.laborEstimate || 0) + toNumber(input.materialEstimate || 0);

  return {
    id: input.id || formatWorkOrderId(sequence, now),
    title: clean(input.title),
    client: clean(input.client),
    project: clean(input.project),
    property: clean(input.property),
    unitLocation: clean(input.unitLocation),
    location: clean(input.location || input.unitLocation),
    description: clean(input.description),
    notes: clean(input.notes),
    category: clean(input.category),
    priority: clean(input.priority || "medium").toLowerCase(),
    status: input.status || defaultStatus({ ...input, approvalStatus }),
    source: clean(input.source || "manual"),
    contactName: clean(input.contactName),
    contactPhone: clean(input.contactPhone),
    contactEmail: clean(input.contactEmail),
    preferredContactMethod: clean(input.preferredContactMethod || "phone"),
    permissionToEnter: clean(input.permissionToEnter || "unknown"),
    assignedTech: clean(input.assignedTech),
    scheduledDate: clean(input.scheduledDate),
    scheduledTime: clean(input.scheduledTime),
    requestedDateTime: clean(input.requestedDateTime || now),
    dueDate: clean(input.dueDate),
    laborEstimate: toNumber(input.laborEstimate),
    materialEstimate: toNumber(input.materialEstimate),
    estimatedCost,
    approvalRequired,
    approvalLimit: toNumber(input.approvalLimit),
    approvalStatus,
    attachmentCount: toNumber(input.attachmentCount),
    aiStatus: automationActivity(input)[0] || "",
    automationActivity: automationActivity(input),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    createdBy: actor,
    archived: Boolean(input.archived),
    activityLog: [
      {
        timestamp: now,
        actor,
        action: "Work order created",
        detail: input.description ? clean(input.description).slice(0, 160) : undefined,
      },
      ...(Array.isArray(input.activityLog) ? input.activityLog : []),
    ],
  };
}

export function updateWorkOrderStatus(workOrder, status, actor = "OttoServ", detail = "") {
  const now = new Date().toISOString();
  return {
    ...workOrder,
    status,
    updatedAt: now,
    activityLog: [
      {
        timestamp: now,
        actor,
        action: `Status changed to ${STATUS_LABELS[status] || status}`,
        detail: detail || undefined,
      },
      ...(Array.isArray(workOrder.activityLog) ? workOrder.activityLog : []),
    ],
  };
}

export function addWorkOrderActivity(workOrder, action, detail = "", actor = "OttoServ") {
  const now = new Date().toISOString();
  return {
    ...workOrder,
    updatedAt: now,
    activityLog: [
      { timestamp: now, actor, action, detail: detail || undefined },
      ...(Array.isArray(workOrder.activityLog) ? workOrder.activityLog : []),
    ],
  };
}

export function getWorkOrderSummary(workOrders = [], now = new Date().toISOString()) {
  const open = workOrders.filter((wo) => !CLOSED_STATUSES.has(wo.status)).length;
  const urgentOverdue = workOrders.filter((wo) => (wo.priority === "emergency" || wo.priority === "high" || isPastDate(wo.dueDate || wo.scheduledDate, now)) && !CLOSED_STATUSES.has(wo.status)).length;
  const scheduledToday = workOrders.filter((wo) => isSameDay(wo.scheduledDate, now)).length;
  const waitingOnParts = workOrders.filter((wo) => wo.status === "waiting_on_parts" || wo.status === "waiting_on_client").length;
  const completedThisWeek = workOrders.filter((wo) => wo.status === "completed" && isThisWeek(wo.updatedAt || wo.createdAt, now)).length;
  const completed = workOrders.filter((wo) => wo.status === "completed");
  const averageTimeToComplete = completed.length
    ? Math.round(
        completed.reduce((sum, wo) => {
          const start = new Date(wo.createdAt).getTime();
          const end = new Date(wo.updatedAt || wo.createdAt).getTime();
          return sum + Math.max(0, end - start) / 86_400_000;
        }, 0) / completed.length,
      )
    : 0;
  const estimatedApprovedSpend = workOrders
    .filter((wo) => wo.approvalStatus === "approved" || wo.approvalStatus === "not_required")
    .reduce((sum, wo) => sum + toNumber(wo.estimatedCost), 0);

  return {
    open,
    urgentOverdue,
    scheduledToday,
    waitingOnParts,
    completedThisWeek,
    averageTimeToComplete,
    estimatedApprovedSpend,
  };
}

export function filterWorkOrders(workOrders = [], filters = {}, now = new Date().toISOString()) {
  const query = clean(filters.search).toLowerCase();
  return workOrders.filter((wo) => {
    if (query) {
      const haystack = [wo.id, wo.title, wo.client, wo.property, wo.unitLocation, wo.description, wo.assignedTech, wo.category].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.client && wo.client !== filters.client) return false;
    if (filters.property && wo.property !== filters.property) return false;
    if (filters.priority && wo.priority !== filters.priority) return false;
    if (filters.category && wo.category !== filters.category) return false;
    if (filters.status && wo.status !== filters.status) return false;
    if (filters.assignedTech && wo.assignedTech !== filters.assignedTech) return false;
    if (filters.dueDate && dateOnly(wo.dueDate || wo.scheduledDate) !== filters.dueDate) return false;
    if (filters.source && wo.source !== filters.source) return false;
    if (filters.overdueOnly && !isPastDate(wo.dueDate || wo.scheduledDate, now)) return false;
    return true;
  });
}

export function uniqueOptions(workOrders = [], key) {
  return Array.from(new Set(workOrders.map((wo) => wo[key]).filter(Boolean))).sort();
}

export function ageInDays(workOrder, now = new Date().toISOString()) {
  const start = new Date(workOrder.createdAt).getTime();
  const end = new Date(now).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

export function isWorkOrderOverdue(workOrder, now = new Date().toISOString()) {
  return !CLOSED_STATUSES.has(workOrder.status) && isPastDate(workOrder.dueDate || workOrder.scheduledDate, now);
}

export function sampleWorkOrders(now = new Date().toISOString()) {
  return [
    buildWorkOrder({
      title: "Emergency leak under kitchen sink",
      client: "Harbor Point PM",
      project: "Maintenance Program",
      property: "Harbor Point Apartments",
      unitLocation: "Unit 4B",
      description: "Tenant reports active leak under kitchen sink with water pooling inside cabinet.",
      category: "Plumbing",
      priority: "emergency",
      source: "tenant_request",
      contactName: "Maya Ellis",
      contactPhone: "555-184-3301",
      permissionToEnter: "appointment_required",
      assignedTech: "ProPlumb Solutions",
      scheduledDate: dateOnly(now),
      scheduledTime: "14:00",
      dueDate: dateOnly(now),
      laborEstimate: 260,
      materialEstimate: 80,
      approvalRequired: false,
      approvalStatus: "not_required",
      attachmentCount: 2,
      automationOptions: { notifyTenant: true, notifyVendor: true, aiPriority: true },
    }, { sequence: 41, now }),
    buildWorkOrder({
      title: "HVAC compressor quote needs approval",
      client: "Northlake Rentals",
      property: "Northlake Villas",
      unitLocation: "Building C roof",
      description: "Vendor recommends compressor replacement before next heat wave.",
      category: "HVAC",
      priority: "high",
      source: "inspection",
      assignedTech: "Sunrise HVAC",
      dueDate: dateOnly(now),
      laborEstimate: 1200,
      materialEstimate: 2850,
      approvalRequired: true,
      approvalLimit: 2500,
      approvalStatus: "pending",
      automationOptions: { aiSummary: true, followUpReminder: true },
    }, { sequence: 42, now }),
    updateWorkOrderStatus(buildWorkOrder({
      title: "Gate keypad intermittent failure",
      client: "Oak Terrace HOA",
      property: "Oak Terrace",
      unitLocation: "Main entrance",
      description: "Resident reports keypad sometimes fails after rain.",
      category: "Security",
      priority: "medium",
      source: "email",
      assignedTech: "Spark Electric LLC",
      scheduledDate: dateOnly(now),
      scheduledTime: "09:30",
      laborEstimate: 180,
      materialEstimate: 120,
      approvalRequired: false,
    }, { sequence: 43, now }), "in_progress", "Operations", "Tech checked in on site."),
    updateWorkOrderStatus(buildWorkOrder({
      title: "Backordered dishwasher pump",
      client: "Ridgeway Management",
      property: "Ridgeway Duplexes",
      unitLocation: "1221-B",
      description: "Dishwasher pump ordered; waiting on vendor ETA.",
      category: "Appliance",
      priority: "medium",
      source: "phone_call",
      assignedTech: "Ace Appliance",
      laborEstimate: 160,
      materialEstimate: 240,
      approvalStatus: "approved",
    }, { sequence: 44, now }), "waiting_on_parts", "Operations", "Part ordered from vendor."),
    updateWorkOrderStatus(buildWorkOrder({
      title: "Hallway light fixture replacement",
      client: "Harbor Point PM",
      property: "Harbor Point Apartments",
      unitLocation: "Building A hallway",
      description: "Replace cracked fixture cover and test switch.",
      category: "Electrical",
      priority: "low",
      source: "manual",
      assignedTech: "Spark Electric LLC",
      laborEstimate: 90,
      materialEstimate: 45,
    }, { sequence: 45, now }), "ready_for_review", "Operations", "Photos uploaded for manager review."),
  ];
}
