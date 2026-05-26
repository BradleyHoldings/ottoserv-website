export const DASHBOARD_ROLES = [
  "client_owner",
  "client_manager",
  "sales_rep",
  "field_worker",
  "ottoserv_admin",
];

export const DEFAULT_OPEN_SECTIONS = [
  "Command",
  "Sales & Customers",
  "Jobs & Operations",
];

const OWNER_MANAGER = ["client_owner", "client_manager", "ottoserv_admin"];
const OWNER_ADMIN = ["client_owner", "ottoserv_admin"];
const SALES_ROLES = ["client_owner", "client_manager", "sales_rep", "ottoserv_admin"];
const OPS_ROLES = ["client_owner", "client_manager", "field_worker", "ottoserv_admin"];
const OFFICE_ROLES = ["client_owner", "client_manager", "sales_rep", "ottoserv_admin"];
const INTERNAL_ONLY = ["ottoserv_admin"];

export const dashboardNavSections = [
  {
    label: "Command",
    items: [
      {
        label: "Command Center",
        icon: "C",
        href: "/dashboard/command-center",
        roles: ["client_owner", "client_manager", "ottoserv_admin"],
        badgeKey: "command",
      },
      {
        label: "Ask Jarvis",
        icon: "J",
        href: "/dashboard/jarvis",
        roles: ["client_owner", "client_manager", "sales_rep", "ottoserv_admin"],
      },
    ],
  },
  {
    label: "Sales & Customers",
    items: [
      { label: "Leads", icon: "L", href: "/dashboard/leads", roles: SALES_ROLES, badgeKey: "leads" },
      { label: "CRM", icon: "R", href: "/dashboard/crm", roles: SALES_ROLES },
      { label: "Inbox", icon: "I", href: "/dashboard/inbox", roles: OFFICE_ROLES, badgeKey: "inbox" },
      { label: "Calendar", icon: "K", href: "/dashboard/calendar", roles: DASHBOARD_ROLES, badgeKey: "calendar" },
    ],
  },
  {
    label: "Jobs & Operations",
    items: [
      { label: "Projects", icon: "P", href: "/dashboard/projects", roles: OWNER_MANAGER },
      { label: "Work Orders", icon: "W", href: "/dashboard/work-orders", roles: OPS_ROLES, badgeKey: "workOrders" },
      { label: "Tasks", icon: "T", href: "/dashboard/tasks", roles: OPS_ROLES, badgeKey: "tasks" },
      { label: "Materials", icon: "M", href: "/dashboard/materials", roles: OPS_ROLES, badgeKey: "materials" },
      { label: "Job Costing", icon: "$", href: "/dashboard/job-costing", roles: OWNER_MANAGER },
      { label: "Vendors & Subs", icon: "V", href: "/dashboard/vendors", roles: OWNER_MANAGER },
      { label: "Team / Labor", icon: "E", href: "/dashboard/team", roles: OPS_ROLES },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Financials", icon: "F", href: "/dashboard/financials", roles: OWNER_MANAGER },
      { label: "Invoices", icon: "N", href: "/dashboard/financials?action=new-invoice", roles: OWNER_MANAGER, isComingSoon: true },
      { label: "Payments", icon: "Y", href: "/dashboard/financials?action=payments", roles: OWNER_MANAGER, isComingSoon: true },
      { label: "Reports", icon: "A", href: "/dashboard/reports", roles: ["client_owner", "client_manager", "sales_rep", "ottoserv_admin"], badgeKey: "reports" },
    ],
  },
  {
    label: "Marketing & Growth",
    items: [
      { label: "Marketing", icon: "M", href: "/dashboard/marketing", roles: SALES_ROLES },
      { label: "Social Media", icon: "S", href: "/dashboard/social", roles: SALES_ROLES },
      { label: "Video Studio", icon: "V", href: "/dashboard/video", roles: OWNER_MANAGER },
      { label: "Growth Engine", icon: "G", href: "/dashboard/growth", roles: OWNER_MANAGER },
      { label: "Social Intelligence", icon: "Q", href: "/dashboard/growth/intelligence", roles: OWNER_MANAGER },
    ],
  },
  {
    label: "Intelligence & Automation",
    items: [
      { label: "Intelligence", icon: "X", href: "/dashboard/intelligence", roles: OWNER_MANAGER },
      { label: "Process Intel", icon: "Z", href: "/dashboard/processes", roles: OWNER_MANAGER },
      { label: "Process Scans", icon: "S", href: "/dashboard/process-scans", roles: INTERNAL_ONLY, isInternal: true },
      { label: "Automations", icon: "U", href: "/dashboard/automations", roles: OWNER_MANAGER, badgeKey: "automations" },
      { label: "AI Agents", icon: "B", href: "/dashboard/agents", roles: OWNER_ADMIN, featureFlag: "aiAgents" },
      { label: "SOPs", icon: "O", href: "/dashboard/sops", roles: OWNER_MANAGER },
    ],
  },
  {
    label: "Files",
    items: [
      { label: "Documents", icon: "D", href: "/dashboard/documents", roles: ["client_owner", "client_manager", "field_worker", "ottoserv_admin"] },
    ],
  },
  {
    label: "Settings & Admin",
    items: [
      { label: "Integrations", icon: "I", href: "/dashboard/integrations", roles: OWNER_MANAGER },
      { label: "Settings", icon: "S", href: "/dashboard/settings", roles: OWNER_MANAGER },
      { label: "Marketplace", icon: "K", href: "/dashboard/marketplace", roles: OWNER_ADMIN, featureFlag: "marketplace" },
      { label: "Platform Admin", icon: "A", href: "/dashboard/admin", roles: INTERNAL_ONLY, isInternal: true },
    ],
  },
  {
    label: "Internal / OttoServ-only",
    items: [
      { label: "TechOps", icon: "T", href: "/dashboard/techops", roles: INTERNAL_ONLY, isInternal: true },
      { label: "Deployments", icon: "D", href: "/dashboard/deployments", roles: INTERNAL_ONLY, isInternal: true },
    ],
  },
];

export const CREATE_ACTIONS = [
  { label: "New Lead", href: "/dashboard/leads?action=new" },
  { label: "New Contact", href: "/dashboard/crm?action=new" },
  { label: "New Project", href: "/dashboard/projects?action=new" },
  { label: "New Task", href: "/dashboard/tasks?action=new" },
  { label: "New Work Order", href: "/dashboard/work-orders?action=new" },
  { label: "New Invoice", href: "/dashboard/financials?action=new-invoice" },
  { label: "Upload Document", href: "/dashboard/documents?action=upload" },
  { label: "Ask Jarvis", href: "/dashboard/jarvis" },
];

export const QUICK_ACTIONS = [
  { label: "New Lead", href: "/dashboard/leads?action=new" },
  { label: "New Work Order", href: "/dashboard/work-orders?action=new" },
  { label: "Upload Document", href: "/dashboard/documents?action=upload" },
  { label: "Ask Jarvis", href: "/dashboard/jarvis" },
];

export function getDefaultOpenSections() {
  return [...DEFAULT_OPEN_SECTIONS];
}

export function normalizeDashboardRole(user) {
  const rawRole = user?.dashboardRole || user?.role || "client_owner";
  if (rawRole === "super_admin" || rawRole === "otto_internal_admin") return "ottoserv_admin";
  if (rawRole === "demo" || rawRole === "client") return "client_owner";
  if (DASHBOARD_ROLES.includes(rawRole)) return rawRole;
  return "client_owner";
}

export function getFeatureFlags(user) {
  return {
    aiAgents: user?.role === "super_admin" || user?.featureFlags?.aiAgents === true,
    marketplace: user?.role === "super_admin" || user?.featureFlags?.marketplace === true,
    ...(user?.featureFlags || {}),
  };
}

export function canShowNavItem(item, role, featureFlags = {}) {
  if (!item.roles?.includes(role)) return false;
  if (role !== "ottoserv_admin" && item.isInternal) return false;
  if (item.featureFlag && role !== "ottoserv_admin" && featureFlags[item.featureFlag] !== true) {
    return false;
  }
  return true;
}

export function getVisibleNavSections({ role = "client_owner", featureFlags = {} } = {}) {
  return dashboardNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canShowNavItem(item, role, featureFlags)),
    }))
    .filter((section) => section.items.length > 0);
}

export function filterNavSections(sections, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.label.toLowerCase().includes(q)),
    }))
    .filter((section) => section.items.length > 0);
}

export function isNavItemActive(href, pathname) {
  const cleanHref = String(href || "").split("?")[0];
  const cleanPathname = String(pathname || "").split("?")[0];
  if (!cleanHref || cleanHref === "#") return false;
  return cleanPathname === cleanHref || cleanPathname.startsWith(`${cleanHref}/`);
}

export function getSectionsToOpenForPath(sections, pathname) {
  return sections
    .filter((section) => section.items.some((item) => isNavItemActive(item.href, pathname)))
    .map((section) => section.label);
}

export function getNavBadges(counts = {}, demoMode = false) {
  if (!demoMode && Object.keys(counts).length === 0) return {};
  return Object.entries(counts).reduce((acc, [key, value]) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) acc[key] = numeric;
    return acc;
  }, {});
}
