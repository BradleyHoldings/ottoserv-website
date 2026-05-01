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

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ottoserv_token");
}

export async function getDashboard(token: string) {
  const data = await fetchApi("/dashboard", token);
  return data || { kpis: mockKpis, brief: mockBrief, alerts: mockAlerts };
}

export async function getLeads(token: string) {
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
