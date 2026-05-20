"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import DemoModeProvider from "@/components/demo/DemoModeProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem("ottoserv_token") && localStorage.getItem("ottoserv_client"));
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!ready) {
      router.push("/login");
    }
  }, [ready, router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <DemoModeProvider>
      <div className="flex" style={{backgroundColor: 'var(--otto-gray-900)'}}>
        <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0 min-h-[calc(100vh-4rem)]">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </DemoModeProvider>
  );
}
