export const PLATFORM_API_BASE = "https://platform.ottoserv.com";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ottoserv_platform_token");
}

export function getPlatformUser(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("ottoserv_platform_user");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function platformLogout(): void {
  localStorage.removeItem("ottoserv_platform_token");
  localStorage.removeItem("ottoserv_platform_user");
  window.location.href = "/platform/login";
}

export async function platformFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const res = await fetch(`${PLATFORM_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) {
    window.location.href = "/platform/login";
    throw new Error("Unauthorized");
  }
  return res;
}
