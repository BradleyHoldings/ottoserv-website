"use client";

import { useState } from "react";
import AutomationCard from "@/components/dashboard/AutomationCard";
import { mockAutomations, Automation } from "@/lib/mockData";

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations);

  function handleToggle(id: string, makeActive: boolean) {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: makeActive ? "active" : "paused" } : a
      )
    );
  }

  const activeCount = automations.filter((a) => a.status === "active").length;
  const needsAttention = automations.filter(
    (a) => a.status === "needs_attention" || a.status === "error"
  ).length;
  const totalRuns = automations.reduce((s, a) => s + a.success_count + a.failure_count, 0);
  const totalSuccess = automations.reduce((s, a) => s + a.success_count, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Automations</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeCount} active · {needsAttention > 0 ? `${needsAttention} need attention` : "all systems normal"}
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + New Automation
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          <p className="text-gray-400 text-sm mt-1">Active</p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">
            {automations.filter((a) => a.status === "paused").length}
          </p>
          <p className="text-gray-400 text-sm mt-1">Paused</p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400 tabular-nums">{totalRuns}</p>
          <p className="text-gray-400 text-sm mt-1">Total Runs</p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">
            {totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0}%
          </p>
          <p className="text-gray-400 text-sm mt-1">Success Rate</p>
        </div>
      </div>

      {/* Needs Attention Alert */}
      {needsAttention > 0 && (
        <div className="bg-orange-900/20 border border-orange-800 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-orange-400 font-medium text-sm">
              {needsAttention} automation{needsAttention > 1 ? "s" : ""} need attention
            </p>
            <p className="text-orange-400/70 text-xs">
              Review the flagged automations below and check connected systems
            </p>
          </div>
        </div>
      )}

      {/* Automation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {automations.map((automation) => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
