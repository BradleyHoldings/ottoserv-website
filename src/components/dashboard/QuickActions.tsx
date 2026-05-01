"use client";

import Link from "next/link";

interface QuickAction {
  label: string;
  emoji: string;
  href: string;
  variant?: "primary" | "secondary";
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: "New Lead", emoji: "👤", href: "/dashboard/leads", variant: "primary" },
  { label: "New Task", emoji: "📋", href: "/dashboard/tasks", variant: "primary" },
  { label: "Ask Jarvis", emoji: "🤖", href: "/dashboard/jarvis", variant: "primary" },
  { label: "Log Expense", emoji: "💸", href: "/dashboard/financials", variant: "secondary" },
  { label: "New Project", emoji: "🏗️", href: "/dashboard/projects", variant: "secondary" },
  { label: "View Reports", emoji: "📈", href: "/dashboard/reports", variant: "secondary" },
];

interface QuickActionsProps {
  actions?: QuickAction[];
}

export default function QuickActions({ actions = DEFAULT_ACTIONS }: QuickActionsProps) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              action.variant === "primary"
                ? "bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-900/50"
                : "bg-[#1f2937] hover:bg-gray-700 text-gray-300 border border-gray-700"
            }`}
          >
            <span className="text-base">{action.emoji}</span>
            <span>{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
