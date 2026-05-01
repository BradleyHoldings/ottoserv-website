"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("ottoserv_token");
    const clientStr = localStorage.getItem("ottoserv_client");
    if (!token || !clientStr) {
      router.push("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#0a0a0a]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 min-h-[calc(100vh-4rem)]">
        <Topbar />
        <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
