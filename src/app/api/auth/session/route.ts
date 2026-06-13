import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDashboardUserSession } from "@/lib/dashboardAdminSession";

export async function GET() {
  const cookieStore = await cookies();
  const session = readDashboardUserSession(
    cookieStore.get("ottoserv_token")?.value,
    cookieStore.get("ottoserv_current_user")?.value,
  );

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      isOttoServEmployee: session.isOttoServEmployee,
      clientAccess: session.clientAccess,
      permissions: session.permissions,
      ...(session.company ? { company: session.company } : {}),
    },
  });
}
