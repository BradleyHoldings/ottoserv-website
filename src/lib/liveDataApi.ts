// Live Data API - No Mock Data Fallbacks for Admin Users
// This replaces dashboardApi.ts for admin/super-admin users

const LIVE_API_URL = "https://api.ottoserv.com";
const A2A_GATEWAY_URL = "https://gateway.ottoserv.com";
const CONTRACTOR_OS_URL = "https://api.ottoserv.com";
const ENTERPRISE_PLATFORM_URL = "https://platform.ottoserv.com";

interface UserContext {
  userId: string;
  role: 'super_admin' | 'admin' | 'user' | 'demo';
  clientAccess: string[];
  isOttoServEmployee: boolean;
}

export function getUserContext(): UserContext | null {
  if (typeof window === "undefined") return null;
  
  const stored = localStorage.getItem("ottoserv_user_context");
  return stored ? JSON.parse(stored) : null;
}

export function setUserContext(context: UserContext) {
  if (typeof window !== "undefined") {
    localStorage.setItem("ottoserv_user_context", JSON.stringify(context));
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ottoserv_token");
}

// Live API calls - NO MOCK FALLBACKS
async function fetchLiveApi(url: string, token: string): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Request-Source": "admin-dashboard"
      },
    });

    if (response.status === 401) {
      // Force re-login
      if (typeof window !== "undefined") {
        localStorage.removeItem("ottoserv_token");
        localStorage.removeItem("ottoserv_user_context");
        window.location.href = "/login";
      }
      return null;
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Live API Error:", error);
    // Return structured error instead of mock data
    return {
      error: true,
      message: "Live API unavailable",
      timestamp: new Date().toISOString()
    };
  }
}

// Admin Dashboard - Aggregate Data
export async function getAdminDashboard(token: string) {
  const context = getUserContext();
  if (!context?.isOttoServEmployee) {
    throw new Error("Unauthorized: Admin access required");
  }

  return await fetchLiveApi(`${ENTERPRISE_PLATFORM_URL}/admin/dashboard`, token);
}

// Client Management
export async function getClients(token: string) {
  const context = getUserContext();
  if (!context?.isOttoServEmployee) {
    throw new Error("Unauthorized: Admin access required");
  }

  return await fetchLiveApi(`${ENTERPRISE_PLATFORM_URL}/admin/clients`, token);
}

export async function updateClientServices(token: string, clientId: string, services: any) {
  const context = getUserContext();
  if (!context?.isOttoServEmployee) {
    throw new Error("Unauthorized: Admin access required");
  }

  try {
    const response = await fetch(`${ENTERPRISE_PLATFORM_URL}/admin/clients/${clientId}/services`, {
      method: 'PUT',
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(services)
    });

    if (!response.ok) throw new Error(`Update failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Service update error:", error);
    return { error: true, message: "Update failed" };
  }
}

// Aggregate Analytics
export async function getAggregateAnalytics(token: string) {
  const context = getUserContext();
  if (!context?.isOttoServEmployee) {
    throw new Error("Unauthorized: Admin access required");
  }

  return await fetchLiveApi(`${ENTERPRISE_PLATFORM_URL}/analytics/aggregate`, token);
}

export async function getClientAnalytics(token: string, clientId: string) {
  const context = getUserContext();
  if (!context?.isOttoServEmployee && !context?.clientAccess.includes(clientId)) {
    throw new Error("Unauthorized: Client access required");
  }

  return await fetchLiveApi(`${ENTERPRISE_PLATFORM_URL}/analytics/client/${clientId}`, token);
}

// Live Client Data (No Mock Fallbacks)
export async function getLiveProjects(token: string, clientId?: string) {
  const endpoint = clientId 
    ? `${CONTRACTOR_OS_URL}/clients/${clientId}/projects`
    : `${CONTRACTOR_OS_URL}/projects`;
    
  return await fetchLiveApi(endpoint, token);
}

export async function getLiveLeads(token: string, clientId?: string) {
  const endpoint = clientId 
    ? `${A2A_GATEWAY_URL}/clients/${clientId}/leads`
    : `${A2A_GATEWAY_URL}/leads`;
    
  return await fetchLiveApi(endpoint, token);
}

export async function getLiveCalls(token: string, clientId?: string) {
  const endpoint = clientId 
    ? `${A2A_GATEWAY_URL}/clients/${clientId}/calls`
    : `${A2A_GATEWAY_URL}/calls`;
    
  return await fetchLiveApi(endpoint, token);
}

export async function getLiveFinancials(token: string, clientId?: string) {
  const endpoint = clientId 
    ? `${CONTRACTOR_OS_URL}/clients/${clientId}/financials`
    : `${CONTRACTOR_OS_URL}/financials`;
    
  return await fetchLiveApi(endpoint, token);
}

// Data Source Indicators
export function getDataSourceIndicator(isLive: boolean, isAggregate: boolean = false) {
  if (!isLive) {
    return {
      icon: "🎭",
      text: "DEMO DATA",
      color: "orange",
      description: "Simulated data for demonstration"
    };
  }

  if (isAggregate) {
    return {
      icon: "🌍",
      text: "LIVE AGGREGATE",
      color: "blue",
      description: "Real data across all OttoServ clients"
    };
  }

  return {
    icon: "🔴",
    text: "LIVE DATA",
    color: "red",
    description: "Real client data (updated in real-time)"
  };
}

// User Role Checks
export function canAccessAdmin(): boolean {
  const context = getUserContext();
  return Boolean(context?.isOttoServEmployee && 
         (context.role === 'super_admin' || context.role === 'admin'));
}

export function canAccessClient(clientId: string): boolean {
  const context = getUserContext();
  return Boolean(context?.isOttoServEmployee || context?.clientAccess.includes(clientId));
}

// Initialize Admin User (for Jonathan)
export function initializeAdminUser() {
  const adminContext: UserContext = {
    userId: "jonathan-bradley",
    role: "super_admin",
    clientAccess: ["all"],
    isOttoServEmployee: true
  };

  setUserContext(adminContext);
  
  // Set admin token (in real implementation, this would come from login)
  if (typeof window !== "undefined") {
    localStorage.setItem("ottoserv_token", "admin_token_placeholder");
  }
}

// Data fetching with clear source indication
export async function getDashboardData(token: string, isDemoMode: boolean = false) {
  const context = getUserContext();
  
  if (isDemoMode || context?.role === 'demo') {
    // Explicitly return demo data
    return {
      source: "demo",
      data: {
        message: "Demo data would be loaded here",
        clients: 3,
        revenue: 3600,
        calls: 1247
      }
    };
  }

  // For admin users, always use live data
  if (context?.isOttoServEmployee) {
    const liveData = await getAdminDashboard(token);
    return {
      source: "live_aggregate",
      data: liveData
    };
  }

  // For client users, get their specific data
  const clientData = await fetchLiveApi(`${ENTERPRISE_PLATFORM_URL}/client/dashboard`, token);
  return {
    source: "live_client",
    data: clientData
  };
}

export default {
  getAdminDashboard,
  getClients,
  updateClientServices,
  getAggregateAnalytics,
  getClientAnalytics,
  getLiveProjects,
  getLiveLeads,
  getLiveCalls,
  getLiveFinancials,
  getDataSourceIndicator,
  canAccessAdmin,
  canAccessClient,
  initializeAdminUser,
  getDashboardData
};