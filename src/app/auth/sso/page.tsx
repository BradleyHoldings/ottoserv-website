"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SSOHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const d = searchParams.get("d");
    if (!d) {
      router.push("/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(d));
      const { name, email, role, company } = payload;

      const token =
        role === "super_admin" ? "super_admin_token" :
        role === "demo" ? "demo_token" :
        `client_token`;

      const isSuperAdmin = role === "super_admin";
      localStorage.setItem("ottoserv_token", token);
      localStorage.setItem("ottoserv_client", JSON.stringify({
        name: name || email || "User",
        business_name: company || (isSuperAdmin ? "OttoServ" : "Client"),
      }));
      localStorage.setItem("ottoserv_current_user", JSON.stringify({
        id: email || "user",
        name: name || email || "User",
        email: email || "",
        role: role || "user",
        company: company || "",
        isOttoServEmployee: isSuperAdmin,
        clientAccess: isSuperAdmin ? ["all"] : [],
        permissions: isSuperAdmin
          ? ["view_all_clients", "manage_client_services", "view_aggregate_analytics", "system_admin", "billing_admin"]
          : ["view_own_data"],
      }));

      if (role === "super_admin") {
        router.push("/dashboard/admin");
      } else {
        router.push("/dashboard/command-center");
      }
    } catch {
      router.push("/login");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Signing you in…</p>
      </div>
    </div>
  );
}

export default function SSOPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SSOHandler />
    </Suspense>
  );
}
