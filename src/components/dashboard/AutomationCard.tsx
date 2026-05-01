"use client";

import { Automation } from "@/lib/mockData";

interface AutomationCardProps {
  automation: Automation;
  onToggle: (id: string, makeActive: boolean) => void;
}

const STATUS_CONFIG: Record<string, { dot: string; label: string; labelColor: string }> = {
  active: { dot: "bg-green-400", label: "Active", labelColor: "text-green-400" },
  paused: { dot: "bg-yellow-400", label: "Paused", labelColor: "text-yellow-400" },
  needs_attention: { dot: "bg-orange-400 animate-pulse", label: "Needs Attention", labelColor: "text-orange-400" },
  error: { dot: "bg-red-400", label: "Error", labelColor: "text-red-400" },
};

function formatTime(ts: string | null) {
  if (!ts) return "Never";
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AutomationCard({ automation, onToggle }: AutomationCardProps) {
  const cfg = STATUS_CONFIG[automation.status] || {
    dot: "bg-gray-400",
    label: automation.status,
    labelColor: "text-gray-400",
  };
  const isActive = automation.status === "active";

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <h4 className="text-white font-medium text-sm">{automation.name}</h4>
            <span className={`text-xs ${cfg.labelColor} ml-auto flex-shrink-0`}>{cfg.label}</span>
          </div>
          <p className="text-gray-400 text-sm leading-snug">{automation.description}</p>
        </div>
        <button
          onClick={() => onToggle(automation.id, !isActive)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isActive
              ? "bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50"
              : "bg-green-900/30 text-green-400 hover:bg-green-900/50"
          }`}
        >
          {isActive ? "Pause" : "Resume"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {automation.connected_systems.map((s) => (
          <span key={s} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded">
            {s}
          </span>
        ))}
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>Last run: {formatTime(automation.last_run)}</span>
        <span>
          <span className="text-green-400">{automation.success_count} ok</span>
          {automation.failure_count > 0 && (
            <span className="text-red-400 ml-2">{automation.failure_count} failed</span>
          )}
        </span>
      </div>

      {automation.next_run && (
        <p className="text-xs text-gray-600 mt-1">
          Next: {formatTime(automation.next_run)}
        </p>
      )}
    </div>
  );
}
