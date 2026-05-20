export const PROJECT_TYPES = [
  "Remodel",
  "Repair",
  "Maintenance",
  "New Construction",
  "Turnover",
  "Inspection",
  "Service Call",
  "Other",
];

export const PROJECT_STATUSES = ["planning", "in_progress", "on_hold", "complete", "archived"];

export const PROJECT_STAGES = [
  "Lead/Estimate",
  "Approved",
  "Scheduled",
  "Active",
  "Paused",
  "Completed",
  "Closed",
];

export const PROJECT_PRIORITIES = ["low", "normal", "high", "urgent"];

export const RISK_LABELS = {
  healthy: "Healthy",
  needs_attention: "Needs Attention",
  at_risk: "At Risk",
  over_budget: "Over Budget",
  past_due: "Past Due",
};

const REQUIRED_FIELDS = ["projectName", "clientName", "projectType"];
const ACTIVE_STATUSES = new Set(["in_progress", "active"]);
const CLOSED_STATUSES = new Set(["complete", "completed", "closed", "archived"]);

function clean(value, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function toNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function formatProjectId(sequence, now) {
  const year = new Date(now).getFullYear();
  return `PRJ-${year}-${String(sequence).padStart(5, "0")}`;
}

function normalizeStatus(status) {
  const value = clean(status, "planning").toLowerCase().replace(/[\s-]+/g, "_");
  if (value === "active") return "in_progress";
  if (value === "completed") return "complete";
  if (value === "paused") return "on_hold";
  return value;
}

function stageForStatus(status) {
  if (status === "planning") return "Lead/Estimate";
  if (status === "in_progress") return "Active";
  if (status === "on_hold") return "Paused";
  if (status === "complete") return "Completed";
  if (status === "archived") return "Closed";
  return "Lead/Estimate";
}

function daysBetween(start, end) {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.floor((b - a) / 86_400_000);
}

function isPastDate(value, now = new Date().toISOString()) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date(now);
  if (Number.isNaN(date.getTime()) || Number.isNaN(today.getTime())) return false;
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function defaultMilestones(now) {
  const start = new Date(now);
  return [
    { id: "milestone-scope", title: "Scope confirmed", dueDate: start.toISOString().slice(0, 10), status: "open" },
    { id: "milestone-schedule", title: "Schedule crew/vendor", dueDate: start.toISOString().slice(0, 10), status: "open" },
    { id: "milestone-closeout", title: "Closeout and invoice", dueDate: "", status: "open" },
  ];
}

export function validateProjectInput(input = {}) {
  const missing = REQUIRED_FIELDS.filter((field) => !clean(input[field]));
  return { valid: missing.length === 0, missing };
}

export function getProjectFinancials(project = {}) {
  const contractValue = toNumber(project.contractValue ?? project.estimated_revenue);
  const estimatedCost = toNumber(project.estimatedCost ?? project.estimated_cost);
  const actualCost = toNumber(project.actualCost ?? project.actual_cost);
  const grossProfit = contractValue - actualCost;
  const estimatedGrossProfit = contractValue - estimatedCost;
  const marginPercent = contractValue > 0 ? Math.round((grossProfit / contractValue) * 100) : 0;
  const estimatedMarginPercent = contractValue > 0 ? Math.round((estimatedGrossProfit / contractValue) * 100) : 0;
  return { contractValue, estimatedCost, actualCost, grossProfit, estimatedGrossProfit, marginPercent, estimatedMarginPercent };
}

export function inferRiskStatus(project = {}, now = new Date().toISOString()) {
  const financials = getProjectFinancials(project);
  if (financials.actualCost > financials.estimatedCost && financials.estimatedCost > 0) return "over_budget";
  if (isPastDate(project.targetCompletionDate ?? project.target_completion, now) && !CLOSED_STATUSES.has(normalizeStatus(project.status))) return "past_due";
  if (financials.marginPercent > 0 && financials.marginPercent < 25) return "needs_attention";
  return clean(project.riskStatus ?? project.risk_status, "healthy").toLowerCase().replace(/[\s-]+/g, "_");
}

export function buildProject(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const status = normalizeStatus(input.status);
  const financials = getProjectFinancials(input);
  const progressPercent = toNumber(input.progressPercent ?? input.percent_complete ?? (status === "complete" ? 100 : 0));
  const project = {
    id: clean(input.id, formatProjectId(options.sequence || 1, now)),
    projectName: clean(input.projectName ?? input.project_name),
    clientName: clean(input.clientName ?? input.client_name),
    clientId: clean(input.clientId ?? input.client_id),
    address: clean(input.address),
    projectType: clean(input.projectType ?? input.project_type, "Other"),
    status,
    stage: clean(input.stage ?? input.phase, stageForStatus(status)),
    startDate: clean(input.startDate ?? input.start_date),
    targetCompletionDate: clean(input.targetCompletionDate ?? input.target_completion),
    contractValue: financials.contractValue,
    estimatedCost: financials.estimatedCost,
    actualCost: financials.actualCost,
    grossProfit: financials.grossProfit,
    marginPercent: financials.marginPercent,
    projectManager: clean(input.projectManager ?? input.project_manager, "Unassigned"),
    priority: clean(input.priority, "normal").toLowerCase(),
    progressPercent,
    nextMilestone: clean(input.nextMilestone ?? input.next_milestone, input.createDefaultMilestones ? "Scope confirmed" : ""),
    riskStatus: clean(input.riskStatus ?? input.risk_status, ""),
    notes: clean(input.notes),
    openWorkOrders: toNumber(input.openWorkOrders ?? input.open_work_orders),
    linkedWorkOrders: Array.isArray(input.linkedWorkOrders) ? input.linkedWorkOrders : [],
    linkedTasks: Array.isArray(input.linkedTasks) ? input.linkedTasks : [],
    linkedInvoices: Array.isArray(input.linkedInvoices) ? input.linkedInvoices : [],
    documents: Array.isArray(input.documents) ? input.documents : [],
    milestones: Array.isArray(input.milestones)
      ? input.milestones
      : input.createDefaultMilestones
        ? defaultMilestones(now)
        : [],
    activity: Array.isArray(input.activity) ? input.activity : [],
    createdAt: input.createdAt || input.created_at || now,
    updatedAt: input.updatedAt || input.updated_at || now,
    archivedAt: input.archivedAt || input.archived_at || null,
  };

  project.riskStatus = project.riskStatus || inferRiskStatus(project, now);
  project.activity = [
    {
      id: `activity-${project.id}`,
      type: "project_created",
      title: "Project created",
      description: `${project.projectName} was created.`,
      createdAt: now,
    },
    ...project.activity,
  ];

  return project;
}

export function addProjectActivity(project, title, description = "", type = "project_updated") {
  const now = new Date().toISOString();
  return {
    ...project,
    updatedAt: now,
    activity: [
      { id: `activity-${now}`, type, title, description, createdAt: now },
      ...(Array.isArray(project.activity) ? project.activity : []),
    ],
  };
}

export function archiveProject(project) {
  const now = new Date().toISOString();
  return addProjectActivity({ ...project, status: "archived", archivedAt: now }, "Project archived", "Project archived locally.", "project_archived");
}

export function getProjectSummary(projects = []) {
  const activeProjects = projects.filter((project) => ACTIVE_STATUSES.has(normalizeStatus(project.status))).length;
  const totalContractValue = projects.reduce((sum, project) => sum + getProjectFinancials(project).contractValue, 0);
  const estimatedCost = projects.reduce((sum, project) => sum + getProjectFinancials(project).estimatedCost, 0);
  const actualCost = projects.reduce((sum, project) => sum + getProjectFinancials(project).actualCost, 0);
  const grossProfit = totalContractValue - actualCost;
  const marginPercent = totalContractValue > 0 ? Math.round((grossProfit / totalContractValue) * 100) : 0;
  const openWorkOrders = projects.reduce((sum, project) => sum + toNumber(project.openWorkOrders ?? project.open_work_orders), 0);
  const projectsAtRisk = projects.filter((project) => ["needs_attention", "at_risk", "over_budget", "past_due"].includes(project.riskStatus)).length;
  return { activeProjects, totalContractValue, estimatedCost, actualCost, grossProfit, marginPercent, openWorkOrders, projectsAtRisk };
}

export function getFilterCounts(projects = []) {
  return {
    all: projects.length,
    in_progress: projects.filter((project) => normalizeStatus(project.status) === "in_progress").length,
    planning: projects.filter((project) => normalizeStatus(project.status) === "planning").length,
    complete: projects.filter((project) => normalizeStatus(project.status) === "complete").length,
    on_hold: projects.filter((project) => normalizeStatus(project.status) === "on_hold").length,
  };
}

export function filterProjects(projects = [], filters = {}) {
  const status = filters.status || "all";
  const query = clean(filters.search).toLowerCase();
  return projects.filter((project) => {
    if (status !== "all" && normalizeStatus(project.status) !== status) return false;
    if (query) {
      const haystack = [
        project.projectName,
        project.clientName,
        project.address,
        project.projectType,
        project.status,
      ].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortProjects(projects = [], sortKey = "updatedAt", direction = "desc") {
  return [...projects].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const numeric = ["contractValue", "estimatedCost", "actualCost", "marginPercent"].includes(sortKey);
    const compare = numeric ? toNumber(av) - toNumber(bv) : String(av || "").localeCompare(String(bv || ""));
    return direction === "asc" ? compare : -compare;
  });
}

export function getProjectInsights(project = {}, now = new Date().toISOString()) {
  const financials = getProjectFinancials(project);
  const status = normalizeStatus(project.status);
  const insights = [];

  if (financials.actualCost > financials.estimatedCost && financials.estimatedCost > 0) {
    insights.push({ severity: "high", title: "Project is over budget", description: "Actual cost is higher than estimated cost." });
  }
  if (isPastDate(project.targetCompletionDate, now) && !CLOSED_STATUSES.has(status)) {
    insights.push({ severity: "high", title: "Project is past target completion", description: "Target completion date has passed and the project is not complete." });
  }
  if (status === "in_progress" && toNumber(project.openWorkOrders) === 0 && (!project.linkedWorkOrders || project.linkedWorkOrders.length === 0)) {
    insights.push({ severity: "medium", title: "No work orders linked", description: "Active projects should usually have at least one work order or operational task." });
  }
  if (daysBetween(project.updatedAt, now) >= 7) {
    insights.push({ severity: "medium", title: "Project may need follow-up", description: "No update has been recorded in seven or more days." });
  }
  if (financials.contractValue > 0 && financials.marginPercent < 25) {
    insights.push({ severity: "medium", title: "Low margin", description: `Current margin is ${financials.marginPercent}%.` });
  }

  if (insights.length === 0) {
    insights.push({ severity: "low", title: "No major project risks", description: "The project looks healthy based on the data currently available." });
  }
  return insights;
}

export function sampleProjects(now = new Date().toISOString()) {
  return [
    buildProject({
      projectName: "Master Bathroom Renovation",
      clientName: "Sandra Okafor",
      address: "2201 River Rd",
      projectType: "Remodel",
      status: "in_progress",
      startDate: "2026-04-21",
      targetCompletionDate: "2026-06-05",
      contractValue: 18500,
      estimatedCost: 14000,
      actualCost: 7200,
      projectManager: "Operations",
      priority: "normal",
      progressPercent: 55,
      nextMilestone: "Rough plumbing inspection",
      openWorkOrders: 2,
      notes: "Client wants weekly Friday updates.",
      createDefaultMilestones: true,
    }, { sequence: 1, now }),
    buildProject({
      projectName: "Northlake Turnover Package",
      clientName: "Northlake Rentals",
      address: "Northlake Villas, Building C",
      projectType: "Turnover",
      status: "planning",
      startDate: "2026-05-24",
      targetCompletionDate: "2026-06-12",
      contractValue: 9600,
      estimatedCost: 6100,
      actualCost: 400,
      projectManager: "Avery",
      priority: "high",
      progressPercent: 10,
      nextMilestone: "Owner approval",
      openWorkOrders: 1,
      riskStatus: "needs_attention",
    }, { sequence: 2, now }),
  ];
}
