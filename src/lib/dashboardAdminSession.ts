export interface DashboardAdminSession {
  email: string;
  name: string;
}

export interface DashboardUserSession extends DashboardAdminSession {
  id: string;
  role: "super_admin" | "demo" | "client";
  isOttoServEmployee: boolean;
  clientAccess: string[];
  permissions: string[];
  company?: string;
}

export function readDashboardUserSession(token: string | undefined, userRaw: string | undefined): DashboardUserSession | null {
  if (!token || !userRaw) return null;

  try {
    const user = JSON.parse(userRaw) as Partial<DashboardUserSession>;
    if (!user.email || !user.name || !user.id) return null;
    if (user.role !== "super_admin" && user.role !== "demo" && user.role !== "client") return null;

    const expectedToken =
      user.role === "super_admin" ? "super_admin_token" :
      user.role === "demo" ? "demo_token" :
      `client_${user.id}_token`;

    if (token !== expectedToken) return null;

    return {
      id: sanitizeSessionText(user.id),
      email: sanitizeSessionText(user.email),
      name: sanitizeSessionText(user.name || user.email),
      role: user.role,
      isOttoServEmployee: user.isOttoServEmployee === true,
      clientAccess: Array.isArray(user.clientAccess) ? user.clientAccess.map(sanitizeSessionText) : [],
      permissions: Array.isArray(user.permissions) ? user.permissions.map(sanitizeSessionText) : [],
      ...(user.company ? { company: sanitizeSessionText(user.company) } : {}),
    };
  } catch {
    return null;
  }
}

export function readDashboardAdminSession(token: string | undefined, userRaw: string | undefined): DashboardAdminSession | null {
  const session = readDashboardUserSession(token, userRaw);
  if (!session || session.role !== "super_admin" || session.isOttoServEmployee !== true) return null;

  return {
    email: session.email,
    name: session.name,
  };
}

function sanitizeSessionText(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}
