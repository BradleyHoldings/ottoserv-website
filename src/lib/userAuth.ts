// User Authentication and Role Management for OttoServ
// Handles super admin (Jonathan) vs demo accounts with clear data separation

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'demo' | 'client';
  isOttoServEmployee: boolean;
  clientAccess: string[]; // 'all' for super admin, specific client IDs for clients
  permissions: string[];
}

// Jonathan's super admin profile - LIVE DATA ONLY
export const JONATHAN_SUPER_ADMIN: User = {
  id: 'jonathan-bradley',
  name: 'Jonathan Bradley',
  email: 'jonathan@ottoservco.com',
  role: 'super_admin',
  isOttoServEmployee: true,
  clientAccess: ['all'],
  permissions: [
    'view_all_clients',
    'manage_client_services',
    'view_aggregate_analytics',
    'system_admin',
    'billing_admin'
  ]
};

// Demo user profile - MOCK DATA ONLY
export const DEMO_USER: User = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@ottoserv.com',
  role: 'demo',
  isOttoServEmployee: false,
  clientAccess: ['demo-clients'],
  permissions: ['view_demo_data']
};

// Live client data (no mock)
export const LIVE_CLIENTS = [
  {
    id: 'brandon-croom',
    name: 'Brandon Croom Contracting',
    email: 'brandoncroom50@gmail.com',
    status: 'active',
    plan: 'Founding Partner',
    mrr: 300,
    setupFee: 500,
    onboardedDate: '2026-04-30',
    services: {
      callAI: true,
      leadManagement: true,
      scheduling: true,
      analytics: false,
      integrations: false,
      socialMedia: false,
      videoStudio: false
    },
    metrics: {
      callsHandled: 45,
      leadsGenerated: 12,
      conversionRate: 8.9,
      revenue: 300
    }
  },
  // Add other real clients as they onboard
];

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  
  const stored = localStorage.getItem("ottoserv_current_user");
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User) {
  if (typeof window !== "undefined") {
    localStorage.setItem("ottoserv_current_user", JSON.stringify(user));
  }
}

export function loginAsJonathan() {
  setCurrentUser(JONATHAN_SUPER_ADMIN);
  if (typeof window !== "undefined") {
    localStorage.setItem("ottoserv_token", "super_admin_token");
    window.location.href = "/dashboard/admin";
  }
}

export function loginAsDemo() {
  setCurrentUser(DEMO_USER);
  if (typeof window !== "undefined") {
    localStorage.setItem("ottoserv_token", "demo_token");
    window.location.href = "/demo";
  }
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("ottoserv_current_user");
    localStorage.removeItem("ottoserv_token");
    window.location.href = "/login";
  }
}

export function isLiveDataMode(): boolean {
  const user = getCurrentUser();
  return user?.role === 'super_admin' && user?.isOttoServEmployee === true;
}

export function isDemoMode(): boolean {
  const user = getCurrentUser();
  return user?.role === 'demo';
}

export function canAccessAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'super_admin' && user?.isOttoServEmployee === true;
}

export function canAccessClient(clientId: string): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  // Super admin can access all clients
  if (user.role === 'super_admin' && user.clientAccess.includes('all')) {
    return true;
  }
  
  // Client can only access their own data
  return user.clientAccess.includes(clientId);
}

export function getDataSourceIndicator() {
  const user = getCurrentUser();
  
  if (user?.role === 'demo') {
    return {
      icon: "🎭",
      text: "DEMO DATA",
      color: "orange",
      bgColor: "bg-orange-900/30 border-orange-700",
      textColor: "text-orange-300",
      description: "Simulated data for demonstration purposes only"
    };
  }
  
  if (user?.role === 'super_admin') {
    return {
      icon: "🔴",
      text: "LIVE DATA",
      color: "red",
      bgColor: "bg-red-900/30 border-red-700",
      textColor: "text-red-300",
      description: "Real OttoServ client data (updated in real-time)"
    };
  }
  
  return {
    icon: "👤",
    text: "CLIENT DATA",
    color: "blue",
    bgColor: "bg-blue-900/30 border-blue-700",
    textColor: "text-blue-300",
    description: "Your company's data only"
  };
}

export function getAggregateIndicator() {
  return {
    icon: "🌍",
    text: "ALL CLIENTS AGGREGATE",
    color: "blue",
    bgColor: "bg-blue-900/30 border-blue-700",
    textColor: "text-blue-300",
    description: "Combined data across all OttoServ clients"
  };
}

export function getSingleClientIndicator(clientName: string) {
  return {
    icon: "👤",
    text: `INDIVIDUAL CLIENT: ${clientName.toUpperCase()}`,
    color: "purple",
    bgColor: "bg-purple-900/30 border-purple-700",
    textColor: "text-purple-300",
    description: `Data for ${clientName} only`
  };
}

export default {
  getCurrentUser,
  setCurrentUser,
  loginAsJonathan,
  loginAsDemo,
  logout,
  isLiveDataMode,
  isDemoMode,
  canAccessAdmin,
  canAccessClient,
  getDataSourceIndicator,
  getAggregateIndicator,
  getSingleClientIndicator,
  JONATHAN_SUPER_ADMIN,
  DEMO_USER,
  LIVE_CLIENTS
};