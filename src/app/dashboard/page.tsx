"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Jobs", href: "/dashboard/jobs" },
  { label: "Appointments", href: "/dashboard/appointments" },
  { label: "Tasks", href: "/dashboard/tasks" },
  { label: "Billing", href: "/dashboard/billing" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("ottoserv_auth_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="bg-[#0a0a0a] min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[#111827] border-r border-gray-800 flex flex-col py-8 px-4 shrink-0">
        <Link href="/" className="text-lg font-bold text-white mb-8 hover:text-blue-400 transition-colors">
          OttoServ
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-md px-3 py-2 text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-8">
          <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Active Jobs */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Active Jobs</h2>
              <ul className="space-y-3">
                {[
                  "Workflow Mapping — Acme Corp",
                  "Lead Automation Build — BrightWave",
                  "System Integration — Hillside HVAC",
                ].map((job) => (
                  <li key={job} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                    {job}
                  </li>
                ))}
              </ul>
            </div>

            {/* Upcoming Appointments */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Upcoming Appointments</h2>
              <ul className="space-y-3">
                {[
                  { label: "Check-in Call — Acme Corp", date: "Apr 29, 10:00 AM" },
                  { label: "Kickoff Meeting — BrightWave", date: "May 2, 2:00 PM" },
                ].map((appt) => (
                  <li key={appt.label} className="text-sm">
                    <p className="text-gray-200">{appt.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{appt.date}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Open Tasks */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Open Tasks</h2>
              <ul className="space-y-2">
                {[
                  "Review process map draft",
                  "Send CRM integration credentials",
                  "Approve automation workflow",
                  "Schedule training session",
                  "Sign off on go-live checklist",
                ].map((task) => (
                  <li key={task} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="w-4 h-4 border border-gray-600 rounded shrink-0 mt-0.5"></span>
                    {task}
                  </li>
                ))}
              </ul>
            </div>

            {/* Billing Status */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Billing Status</h2>
              <div className="text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-300">Invoice #1042</span>
                  <span className="text-yellow-400 font-medium">Due May 15</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-300">Invoice #1041</span>
                  <span className="text-green-400 font-medium">Paid</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-300">Invoice #1040</span>
                  <span className="text-green-400 font-medium">Paid</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 md:col-span-2 xl:col-span-2">
              <h2 className="text-white font-semibold text-lg mb-4">Recent Activity</h2>
              <ul className="space-y-4">
                {[
                  {
                    action: "Process map delivered for Acme Corp",
                    time: "2 hours ago",
                  },
                  {
                    action: "BrightWave CRM integration testing complete",
                    time: "Yesterday",
                  },
                  {
                    action: "New task added: Schedule training session",
                    time: "2 days ago",
                  },
                ].map((activity) => (
                  <li key={activity.action} className="flex items-start gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                    <div>
                      <p className="text-gray-200">{activity.action}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{activity.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
