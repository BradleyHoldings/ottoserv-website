export interface DashboardAdminSession {
  email: string;
  name: string;
}

export function readDashboardAdminSession(token: string | undefined, userRaw: string | undefined): DashboardAdminSession | null {
  if (token !== "super_admin_token" || !userRaw) return null;

  try {
    const user = JSON.parse(userRaw) as { email?: string; name?: string; role?: string; isOttoServEmployee?: boolean };
    if (user.role !== "super_admin" || user.isOttoServEmployee !== true || !user.email) return null;

    return {
      email: sanitizeSessionText(user.email),
      name: sanitizeSessionText(user.name || user.email),
    };
  } catch {
    return null;
  }
}

function sanitizeSessionText(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}
