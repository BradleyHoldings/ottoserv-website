"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canAccessAdmin, getCurrentUser } from "@/lib/userAuth";

const hermesNavItems = [
  { href: "/os/hermes", label: "Command" },
  { href: "/os/hermes/agents", label: "Agents" },
  { href: "/os/hermes/missions", label: "Missions" },
  { href: "/os/hermes/approvals", label: "Approvals" },
  { href: "/os/hermes/evidence", label: "Evidence" },
  { href: "/os/hermes/revenue", label: "Revenue" },
  { href: "/os/hermes/service-delivery", label: "Delivery" },
  { href: "/os/hermes/policies", label: "Policies" },
];

export default function HermesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("ottoserv_token");
    const user = getCurrentUser();

    if (!token || !user || !canAccessAdmin()) {
      router.replace("/login");
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#080b10] flex items-center justify-center">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-100">
          Securing Hermes command channel...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b10] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-white/10 bg-black/30 p-5 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r lg:p-6">
          <Link href="/dashboard/command-center" className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
            OttoServ OS
          </Link>
          <div className="mt-4">
            <p className="text-2xl font-black tracking-tight">Hermes Command</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Secure operating console for agents, missions, approvals, evidence, and revenue movement.
            </p>
          </div>

          <nav className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {hermesNavItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/os/hermes" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "border-blue-400/50 bg-blue-500/15 text-white shadow-[0_0_30px_rgba(0,132,255,.16)]"
                      : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100">
            High-risk actions stay approval-gated. This console unlocks work through Hermes, not around Hermes.
          </div>
        </aside>

        <main className="flex-1 p-5 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
