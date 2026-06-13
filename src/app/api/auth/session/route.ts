import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDashboardAdminSession } from "@/lib/dashboardAdminSession";

export async function GET() {
  const cookieStore = await cookies();
  const session = readDashboardAdminSession(
    cookieStore.get("ottoserv_token")?.value,
    cookieStore.get("ottoserv_current_user")?.value,
  );

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      email: session.email,
      name: session.name,
      role: "super_admin",
      isOttoServEmployee: true,
    },
  });
}
