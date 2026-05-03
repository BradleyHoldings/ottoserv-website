import {
  mockKpis,
  mockBrief,
  mockAlerts,
  mockLeads,
  mockProjects,
  mockTasks,
  mockAutomations,
  mockSOPs,
  mockReports,
  mockIntegrations,
  mockMarketingPosts,
  mockInvoices,
  mockExpenses,
  mockMaterials,
  mockMessages,
  mockCalendarEvents,
  mockFinancialSummary,
} from "./mockData";

const API_URL = "https://api.ottoserv.com";
const PLATFORM_URL = "https://platform.ottoserv.com";
const API_KEY = "c4f8a2d9e3b7c105a6d2f8e9c4b710a5f6d2e8c9f4a710b5c6d2f8e9c4a710b5";

async function fetchApi(path: string, token: string) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        "X-API-Key": API_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      if (typeof window !== "undefined") window.location.href = "/login";
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchPlatformApi(path: string): Promise<any> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("ottoserv_platform_token") : null;
    if (!token) return null;
    const res = await fetch(`${PLATFORM_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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

export async function getPlatformLeads() {
  const data = await fetchPlatformApi("/crm/leads");
  if (!data?.leads) return null;
  return data.leads.map((l: any) => ({
    id: l.id,
    name: l.title,
    phone: l.contact?.phone || "",
    email: l.contact?.email || "",
    source: l.source || "direct",
    service_needed: l.description || "",
    budget: l.estimated_value ? `$${l.estimated_value}` : "",
    status: l.status || "new",
    lead_score: l.urgency === "low" ? 75 : l.urgency === "high" ? 95 : 80,
    assigned_to: l.owner_user_id || "Jonathan",
    created_at: l.created_at?.split("T")[0] || "",
  }));
}

export async function getPlatformSocialPosts() {
  const data = await fetchPlatformApi("/social/posts");
  if (!data?.posts) return null;
  return data.posts.map((p: any) => ({
    id: p.id,
    content: p.content || "",
    platform: p.platform || "facebook",
    status: p.status === "pending_approval" ? "pending" : p.status || "draft",
    scheduled_at: p.scheduled_at || null,
    published_at: p.published_at || null,
    created_by_agent: p.created_by_agent_id || null,
    approval_status: p.status === "approved" ? "approved" : p.status === "pending_approval" ? "pending_review" : "not_submitted",
    rejection_reason: p.rejection_reason || null,
    media_urls: p.media_urls || [],
    emotional_trigger: null,
    cta: p.hashtags?.join(" ") || null,
    engagement: null,
  }));
}

export async function getDashboard(token: string) {
  const data = await fetchApi("/dashboard", token);
  return data || { kpis: mockKpis, brief: mockBrief, alerts: mockAlerts };
}

export async function getLeads(token: string) {
  const platformLeads = await getPlatformLeads();
  if (platformLeads && platformLeads.length > 0) return platformLeads;
  const data = await fetchApi("/leads", token);
  return data || mockLeads;
}

export async function getProjects(token: string) {
  const data = await fetchApi("/projects", token);
  return data || mockProjects;
}

export async function getProject(token: string, id: string) {
  const data = await fetchApi(`/projects/${id}`, token);
  return data || mockProjects.find((p) => p.id === id) || mockProjects[0];
}

export async function getTasks(token: string) {
  const data = await fetchApi("/tasks", token);
  return data || mockTasks;
}

export async function getAutomations(token: string) {
  const data = await fetchApi("/automations", token);
  return data || mockAutomations;
}

export async function getSOPs(token: string) {
  const data = await fetchApi("/sops", token);
  return data || mockSOPs;
}

export async function getReports(token: string) {
  const data = await fetchApi("/reports", token);
  return data || mockReports;
}

export async function getIntegrations(token: string) {
  const data = await fetchApi("/integrations", token);
  return data || mockIntegrations;
}

export async function getMarketingPosts(token: string) {
  const data = await fetchApi("/marketing", token);
  return data || mockMarketingPosts;
}

export async function getFinancials(token: string) {
  const data = await fetchApi("/financials", token);
  return data || { summary: mockFinancialSummary, invoices: mockInvoices, expenses: mockExpenses };
}

export async function getMaterials(token: string) {
  const data = await fetchApi("/materials", token);
  return data || mockMaterials;
}

export async function getMessages(token: string) {
  const data = await fetchApi("/inbox", token);
  return data || mockMessages;
}

export async function getCalendarEvents(token: string) {
  const data = await fetchApi("/calendar", token);
  return data || mockCalendarEvents;
}
