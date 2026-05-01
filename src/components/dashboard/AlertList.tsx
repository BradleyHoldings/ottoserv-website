"use client";

import { Alert } from "@/lib/mockData";

interface AlertListProps {
  alerts: Alert[];
}

const SEVERITY_STYLES: Record<string, string> = {
  high: "text-red-300 bg-red-900/20 border-red-900/50",
  medium: "text-yellow-300 bg-yellow-900/20 border-yellow-900/50",
  low: "text-blue-300 bg-blue-900/20 border-blue-900/50",
};

const TYPE_ICONS: Record<string, string> = {
  overdue_invoice: "💸",
  unanswered_lead: "👤",
  project_behind: "⏰",
  missed_appointment: "📅",
};

export default function AlertList({ alerts }: AlertListProps) {
  const urgentCount = alerts.filter((a) => a.severity === "high").length;

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Priority Alerts</h3>
        {urgentCount > 0 && (
          <span className="text-xs bg-red-900/40 text-red-400 border border-red-900/50 px-2 py-0.5 rounded">
            {urgentCount} urgent
          </span>
        )}
      </div>
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No alerts — you&apos;re all clear!</p>
        ) : (
          alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                SEVERITY_STYLES[alert.severity] || "text-gray-300 bg-gray-800 border-gray-700"
              }`}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">
                {TYPE_ICONS[alert.type] || "⚠️"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{alert.title}</p>
                <p className="text-xs opacity-70 mt-0.5">{alert.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
