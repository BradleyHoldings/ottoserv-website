// OttoServ OS Dashboard data layer.
//
// All real data lives on the OttoServ enterprise platform (FastAPI) at
// PLATFORM_URL. The dashboard pages call these helpers, which forward the
// user's platform JWT (`ottoserv_platform_token` in localStorage). The
// backend enforces per-company tenancy via the company_id baked into the JWT
// — so each company sees only its own leads, calls, social posts, etc.
//
// Helpers return `null` (or an empty array on list endpoints) when the user
// has no platform JWT or when the backend has no data. We intentionally do
// NOT fall back to mock data — empty state ≠ fake activity.

const PLATFORM_URL =
  process.env.NEXT_PUBLIC_OTTOSERV_PLATFORM_URL || "https://platform.ottoserv.com";

async function fetchPlatformApi(path: string): Promise<any> {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ottoserv_platform_token")
        : null;
    if (!token) return null;
    const res = await fetch(`${PLATFORM_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      // Stale/expired JWT — drop it so the next login refreshes.
      if (typeof window !== "undefined") {
        localStorage.removeItem("ottoserv_platform_token");
        localStorage.removeItem("ottoserv_platform_user");
      }
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ottoserv_token");
}

export function getPlatformToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ottoserv_platform_token");
}

export function hasPlatformAccess(): boolean {
  return !!getPlatformToken();
}

// ─── Leads ──────────────────────────────────────────────────────────────────

export type DashboardLead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  service_needed: string;
  budget: string;
  status: string;
  lead_score: number;
  assigned_to: string;
  created_at: string;
};

export async function getPlatformLeads(): Promise<DashboardLead[]> {
  const data = await fetchPlatformApi("/crm/leads");
  if (!data?.leads) return [];
  return data.leads.map((l: any) => ({
    id: l.id,
    name: l.title,
    phone: l.contact?.phone || "",
    email: l.contact?.email || "",
    source: l.source || "direct",
    service_needed: l.description || "",
    budget: l.estimated_value ? `$${l.estimated_value}` : "",
    status: l.status || "new",
    lead_score:
      l.urgency === "low" ? 75 : l.urgency === "high" ? 95 : 80,
    assigned_to: l.owner_user_id || "Unassigned",
    created_at: l.created_at?.split("T")[0] || "",
  }));
}

// Back-compat — many pages still call getLeads(token).
export async function getLeads(_token?: string): Promise<DashboardLead[]> {
  return getPlatformLeads();
}

// ─── Social ─────────────────────────────────────────────────────────────────

export async function getPlatformSocialPosts(): Promise<any[]> {
  const data = await fetchPlatformApi("/social/posts");
  if (!data?.posts) return [];
  return data.posts.map((p: any) => ({
    id: p.id,
    content: p.content || "",
    platform: p.platform || "facebook",
    status:
      p.status === "pending_approval"
        ? "pending"
        : p.status || "draft",
    scheduled_at: p.scheduled_at || null,
    published_at: p.published_at || null,
    created_by_agent: p.created_by_agent_id || null,
    approval_status:
      p.status === "approved"
        ? "approved"
        : p.status === "pending_approval"
        ? "pending_review"
        : "not_submitted",
    rejection_reason: p.rejection_reason || null,
    media_urls: p.media_urls || [],
    emotional_trigger: null,
    cta: p.hashtags?.join(" ") || null,
    engagement: null,
  }));
}

// ─── Calls ──────────────────────────────────────────────────────────────────

export type RecentCall = {
  id: string;
  contact: string;          // pulled from task_title — "Outbound call to NAME (PHONE)"
  phone: string;
  agent: string;
  status: string;           // in_progress | completed | failed | blocked
  outcome: string;          // human-readable status label
  call_id: string | null;   // Retell call_id if the call landed
  blocker: string | null;
  created_at: string;
};

const CALL_TITLE_RE = /^Outbound call to (.+?) \((\+?[\d]+(?:[^\d)]*)*?)\)\s*$/;

function parseCallTitle(title: string): { name: string; phone: string } {
  const m = title.match(CALL_TITLE_RE);
  if (m) return { name: m[1].trim(), phone: m[2].trim() };
  return { name: title.replace(/^Outbound call to\s*/i, "").trim(), phone: "" };
}

export type LeadSupply = {
  asOf: string;
  targetPerDay: number;
  attained: number;
  attainmentPct: number;
  totalsToday: { calls: number; completed: number; dispatched: number; failed: number; blocked: number; in_progress: number };
  dedupBlocked: number;
  otherBlocked: number;
  bySource: Record<string, Record<string, number>>;
  scope: "platform" | "company";
};

export async function getLeadSupply(): Promise<LeadSupply | null> {
  const data = await fetchPlatformApi("/calls/lead-supply");
  if (!data) return null;
  return {
    asOf: data.as_of,
    targetPerDay: Number(data.target_per_day || 200),
    attained: Number(data.attained || 0),
    attainmentPct: Number(data.attainment_pct || 0),
    totalsToday: data.totals_today || { calls: 0, completed: 0, dispatched: 0, failed: 0, blocked: 0, in_progress: 0 },
    dedupBlocked: Number(data.dedup_blocked || 0),
    otherBlocked: Number(data.other_blocked || 0),
    bySource: data.by_source || {},
    scope: data.scope || "company",
  };
}

export async function getRecentCalls(limit = 50): Promise<RecentCall[]> {
  const data = await fetchPlatformApi(`/calls/recent?limit=${limit}`);
  if (!data?.items) return [];
  return data.items.map((row: any) => {
    const { name, phone } = parseCallTitle(row.task_title || "");
    return {
      id: row.id,
      contact: name,
      phone,
      agent: row.owner_agent || "morgan",
      status: row.status,
      outcome:
        row.status === "completed"
          ? "Connected"
          : row.status === "blocked"
          ? "Blocked"
          : row.status === "failed"
          ? "Failed"
          : "In progress",
      call_id: row.proof_artifact || row.executor_reference || null,
      blocker: row.blocker || row.failure_reason || null,
      created_at: row.created_at,
    };
  });
}

export async function getScheduledCalls(): Promise<any[]> {
  const data = await fetchPlatformApi("/calls/scheduled");
  if (!data?.items) return [];
  return data.items;
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export async function getTasks(_token?: string): Promise<any[]> {
  const data = await fetchPlatformApi("/tasks");
  if (!data) return [];
  return data.tasks || data || [];
}

export async function getCrmTasks(): Promise<any[]> {
  const data = await fetchPlatformApi("/crm/tasks");
  return data?.tasks || [];
}

// ─── CRM (deals / companies / contacts / activities) ────────────────────────

export async function getCrmDeals(): Promise<any[]> {
  const data = await fetchPlatformApi("/crm/deals");
  return data?.deals || [];
}

export async function getCrmCompanies(): Promise<any[]> {
  const data = await fetchPlatformApi("/crm/companies");
  return data?.companies || [];
}

export async function getCrmContacts(): Promise<any[]> {
  const data = await fetchPlatformApi("/crm/contacts");
  return data?.contacts || [];
}

export async function getCrmActivities(): Promise<any[]> {
  const data = await fetchPlatformApi("/crm/activities");
  return data?.activities || [];
}

// ─── Approvals ──────────────────────────────────────────────────────────────

export async function getApprovals(): Promise<any[]> {
  const data = await fetchPlatformApi("/approvals");
  return data?.approvals || [];
}

// ─── Agents ─────────────────────────────────────────────────────────────────

export async function getAgents(): Promise<any[]> {
  const data = await fetchPlatformApi("/agents");
  return data?.agents || [];
}

// ─── Dashboard summary (CRM-backed) ────────────────────────────────────────

export type DashboardSummary = {
  kpis: Array<{ label: string; value: string | number; trend?: string }>;
  brief: { content: string } | null;
  alerts: Array<{ title: string; description: string; severity: string }>;
  recent_activity: any[];
  overdue_tasks: any[];
  due_today: any[];
};

export async function getDashboard(_token?: string): Promise<DashboardSummary | null> {
  const data = await fetchPlatformApi("/crm/dashboard");
  if (!data) return null;
  const summary = data.summary || {};
  const overdue = data.overdue_tasks || [];
  const dueToday = data.due_today || [];
  const recent = data.recent_activity || [];

  const kpis = [
    {
      label: "New Leads",
      value:
        summary.new_leads_count ??
        summary.active_leads ??
        summary.lead_count ??
        0,
    },
    {
      label: "Open Deals",
      value:
        summary.open_deals_count ??
        summary.open_deals ??
        summary.deal_count ??
        0,
    },
    {
      label: "Pipeline Value",
      value:
        typeof summary.pipeline_value === "number"
          ? `$${summary.pipeline_value.toLocaleString()}`
          : "$0",
    },
    {
      label: "Due Today",
      value: summary.due_today_count ?? dueToday.length ?? 0,
    },
    {
      label: "Overdue",
      value: summary.overdue_tasks_count ?? overdue.length ?? 0,
    },
  ];

  const alerts = overdue.slice(0, 5).map((t: any) => ({
    title: t.title || "Overdue task",
    description: t.due_date
      ? `Was due ${t.due_date}`
      : "Action required",
    severity: "high",
  }));

  return {
    kpis,
    brief:
      summary.brief || summary.summary
        ? { content: summary.brief || summary.summary }
        : null,
    alerts,
    recent_activity: recent,
    overdue_tasks: overdue,
    due_today: dueToday,
  };
}

// ─── Stubs for modules that don't have a backend yet ────────────────────────
// These return empty arrays so dashboard pages render empty states instead of
// fake activity. When the backend ships an endpoint, swap the implementation
// here; no page changes needed.

export async function getProjects(_token?: string): Promise<any[]> {
  return [];
}
export async function getProject(_token: string, _id: string): Promise<any | null> {
  return null;
}
export async function getAutomations(_token?: string): Promise<any[]> {
  return [];
}
export async function getSOPs(_token?: string): Promise<any[]> {
  return [];
}
export async function getReports(_token?: string): Promise<any[]> {
  return [];
}
export async function getIntegrations(_token?: string): Promise<any[]> {
  return [];
}
export async function getMarketingPosts(_token?: string): Promise<any[]> {
  return [];
}
export async function getFinancials(_token?: string): Promise<{
  summary: any;
  invoices: any[];
  expenses: any[];
}> {
  return { summary: null, invoices: [], expenses: [] };
}
export async function getMaterials(_token?: string): Promise<any[]> {
  return [];
}
export async function getMessages(_token?: string): Promise<any[]> {
  return [];
}
export async function getCalendarEvents(_token?: string): Promise<any[]> {
  return [];
}
