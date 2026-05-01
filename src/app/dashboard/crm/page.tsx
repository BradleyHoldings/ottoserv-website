"use client";

import Link from "next/link";
import KpiCard from "@/components/dashboard/KpiCard";
import {
  mockContacts,
  mockDeals,
  mockCRMActivities,
  mockTasks,
  mockCompanies,
} from "@/lib/mockData";

const ACTIVITY_ICONS: Record<string, string> = {
  call: "📞",
  email: "📧",
  meeting: "🤝",
  note: "📝",
  task_completed: "✅",
  deal_stage_change: "🔄",
  lead_created: "➕",
  ai_action: "🤖",
};

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-900/40 text-blue-400 border-blue-800",
  email: "bg-indigo-900/40 text-indigo-400 border-indigo-800",
  meeting: "bg-purple-900/40 text-purple-400 border-purple-800",
  note: "bg-gray-800 text-gray-400 border-gray-700",
  task_completed: "bg-green-900/40 text-green-400 border-green-800",
  deal_stage_change: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  lead_created: "bg-blue-900/40 text-blue-400 border-blue-800",
  ai_action: "bg-orange-900/40 text-orange-400 border-orange-800",
};

const totalContacts = mockContacts.length;
const activeLeads = mockContacts.filter((c) => c.contact_type === "lead").length;
const openDeals = mockDeals.filter((d) => d.stage !== "won" && d.stage !== "lost");
const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
const wonDeals = mockDeals.filter((d) => d.stage === "won").length;
const lostDeals = mockDeals.filter((d) => d.stage === "lost").length;
const winRate =
  wonDeals + lostDeals > 0
    ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100)
    : 0;
const tasksDue = mockTasks.filter(
  (t) => t.status === "open" || t.status === "overdue"
).length;

const recentActivities = mockCRMActivities.slice(0, 10);

const QUICK_LINKS = [
  {
    href: "/dashboard/crm/contacts",
    emoji: "👤",
    label: "Contacts",
    count: mockContacts.length,
    desc: "People & leads",
  },
  {
    href: "/dashboard/crm/companies",
    emoji: "🏢",
    label: "Companies",
    count: mockCompanies.length,
    desc: "Accounts",
  },
  {
    href: "/dashboard/crm/deals",
    emoji: "💰",
    label: "Deals",
    count: openDeals.length,
    desc: "Open pipeline",
  },
  {
    href: "/dashboard/crm/activity",
    emoji: "📋",
    label: "Activity",
    count: mockCRMActivities.length,
    desc: "All activities",
  },
];

const JARVIS_PROMPTS = [
  "Which leads need follow-up today?",
  "What's the total pipeline value this month?",
  "Who are my highest-value prospects?",
  "Draft a follow-up email for Robert Chen",
];

function formatCurrency(n: number) {
  return "$" + n.toLocaleString();
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function CRMPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">CRM</h1>
        <p className="text-gray-500 text-sm mt-1">
          Customer relationships — contacts, deals, and activity
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard value={totalContacts} label="Total Contacts" color="blue" />
        <KpiCard value={activeLeads} label="Active Leads" color="purple" />
        <KpiCard value={openDeals.length} label="Open Deals" color="yellow" />
        <KpiCard
          value={formatCurrency(pipelineValue)}
          label="Pipeline Value"
          color="green"
        />
        <KpiCard value={tasksDue} label="Tasks Due" color="red" />
        <KpiCard
          value={`${winRate}%`}
          label="Win Rate"
          color="green"
          trend={`${wonDeals} of ${wonDeals + lostDeals} closed`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col: Quick Access + Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Access */}
          <div>
            <h2 className="text-white font-semibold mb-3">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-blue-800 transition-colors"
                >
                  <div className="text-2xl mb-2">{link.emoji}</div>
                  <p className="text-white font-medium text-sm">{link.label}</p>
                  <p className="text-blue-400 text-xl font-bold">{link.count}</p>
                  <p className="text-gray-500 text-xs">{link.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold">Recent Activity</h2>
              <Link
                href="/dashboard/crm/activity"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View all →
              </Link>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              {recentActivities.map((act, i) => (
                <div
                  key={act.id}
                  className={`flex items-start gap-3 p-4 ${
                    i < recentActivities.length - 1
                      ? "border-b border-gray-800"
                      : ""
                  }`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {ACTIVITY_ICONS[act.type] || "📌"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-sm leading-snug">
                      {act.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {act.contact_name && (
                        <span className="text-gray-500 text-xs">
                          {act.contact_name}
                        </span>
                      )}
                      {act.company_name && (
                        <span className="text-gray-600 text-xs">
                          · {act.company_name}
                        </span>
                      )}
                      {act.deal_name && (
                        <span className="text-gray-600 text-xs truncate max-w-[140px]">
                          · {act.deal_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-gray-600 text-xs whitespace-nowrap">
                      {formatTimestamp(act.timestamp)}
                    </p>
                    <span
                      className={`inline-flex items-center mt-1 rounded border px-1.5 py-0.5 text-xs font-medium ${
                        ACTIVITY_TYPE_COLORS[act.type] ||
                        "bg-gray-800 text-gray-400 border-gray-700"
                      }`}
                    >
                      {act.type.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col: Ask Jarvis */}
        <div>
          <h2 className="text-white font-semibold mb-3">Ask Jarvis about CRM</h2>
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
            <div className="bg-[#0f1117] border border-gray-700 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  J
                </div>
                <span className="text-gray-400 text-xs font-medium">
                  Jarvis AI
                </span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                I can analyze your pipeline, draft outreach, flag at-risk deals,
                or generate contact summaries. What would you like to know?
              </p>
            </div>
            <div className="space-y-2">
              {JARVIS_PROMPTS.map((prompt) => (
                <Link
                  key={prompt}
                  href={`/dashboard/jarvis?prompt=${encodeURIComponent(prompt)}`}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 bg-[#0f1117] border border-gray-700 hover:border-blue-700 rounded-lg text-gray-400 hover:text-white text-sm transition-colors"
                >
                  <span className="text-blue-600">›</span>
                  {prompt}
                </Link>
              ))}
            </div>
          </div>

          {/* Pipeline Summary */}
          <div className="mt-4 bg-[#111827] border border-gray-800 rounded-xl p-4">
            <h3 className="text-white font-medium text-sm mb-3">
              Pipeline Breakdown
            </h3>
            <div className="space-y-2">
              {[
                { stage: "Discovery", color: "bg-blue-500" },
                { stage: "Qualified", color: "bg-indigo-500" },
                { stage: "Proposal", color: "bg-purple-500" },
                { stage: "Negotiation", color: "bg-yellow-500" },
              ].map(({ stage, color }) => {
                const stageDeals = mockDeals.filter(
                  (d) => d.stage === stage.toLowerCase()
                );
                const stageValue = stageDeals.reduce(
                  (sum, d) => sum + d.value,
                  0
                );
                return (
                  <div key={stage} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
                    <span className="text-gray-400 w-24">{stage}</span>
                    <span className="text-gray-500">
                      {stageDeals.length} deal{stageDeals.length !== 1 ? "s" : ""}
                    </span>
                    <span className="ml-auto text-gray-300 font-medium">
                      {stageValue > 0 ? formatCurrency(stageValue) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
