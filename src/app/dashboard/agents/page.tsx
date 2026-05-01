"use client";

import { useState } from "react";
import { mockAgentActivity, AgentAction } from "@/lib/mockData";

const AGENTS = [
  { name: "Growth Agent", emoji: "📣", description: "Generates social posts, review requests, and lead nurture content", successRate: 94 },
  { name: "Operations Agent", emoji: "⚙️", description: "Monitors project budgets, schedules, and flags risks", successRate: 98 },
  { name: "Project Agent", emoji: "🏗️", description: "Tracks milestones, task progress, and site visit summaries", successRate: 91 },
  { name: "Finance Agent", emoji: "💰", description: "Sends invoice reminders, categorizes expenses, tracks cash flow", successRate: 97 },
  { name: "Customer Service Agent", emoji: "💬", description: "Drafts client replies, schedules walkthroughs, sends updates", successRate: 88 },
  { name: "Reporting Agent", emoji: "📈", description: "Generates weekly/monthly reports and performance summaries", successRate: 100 },
  { name: "Data Prep Agent", emoji: "🗂️", description: "Categorizes receipts, normalizes data, preps imports", successRate: 72 },
];

const STATUS_STYLES: Record<string, string> = {
  idle: "bg-gray-800 text-gray-400 border-gray-700",
  running: "bg-blue-900/40 text-blue-400 border-blue-800",
  waiting_approval: "bg-orange-900/40 text-orange-400 border-orange-800",
  completed: "bg-green-900/40 text-green-400 border-green-800",
  failed: "bg-red-900/40 text-red-400 border-red-800",
};

const STATUS_DOTS: Record<string, string> = {
  idle: "bg-gray-500",
  running: "bg-blue-400 animate-pulse",
  waiting_approval: "bg-orange-400",
  completed: "bg-green-400",
  failed: "bg-red-400",
};

function getAgentStatus(agentName: string): string {
  const latest = mockAgentActivity.find((a) => a.agent_name === agentName);
  return latest?.status ?? "idle";
}

function getAgentLastTask(agentName: string): string {
  const latest = mockAgentActivity.find((a) => a.agent_name === agentName);
  return latest?.task ?? "No recent activity";
}

export default function AgentsPage() {
  const [approvals, setApprovals] = useState<AgentAction[]>(
    mockAgentActivity.filter((a) => a.requires_approval && a.status === "waiting_approval")
  );

  function handleApprove(id: string) {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  }

  function handleReject(id: string) {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  }

  const pendingCount = approvals.length;
  const completedCount = mockAgentActivity.filter((a) => a.status === "completed").length;
  const failedCount = mockAgentActivity.filter((a) => a.status === "failed").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Agents</h1>
        <p className="text-gray-500 text-sm mt-1">
          {pendingCount} pending approval · {completedCount} completed today · {failedCount} failed
        </p>
      </div>

      {/* Approvals Queue */}
      {approvals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            Approvals Needed ({approvals.length})
          </h2>
          <div className="space-y-3">
            {approvals.map((action) => (
              <div key={action.id} className="bg-[#111827] border border-orange-900/40 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-orange-400 text-xs font-medium">{action.agent_name}</span>
                      {action.project && (
                        <span className="text-gray-600 text-xs">· {action.project}</span>
                      )}
                    </div>
                    <p className="text-white text-sm font-medium">{action.task}</p>
                  </div>
                  <span className="text-gray-500 text-xs flex-shrink-0">
                    {new Date(action.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {action.result && (
                  <p className="text-gray-400 text-sm bg-[#0f1117] border border-gray-800 rounded-lg px-3 py-2 mb-3 italic">
                    "{action.result}"
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(action.id)}
                    className="flex-1 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReject(action.id)}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    ✗ Reject
                  </button>
                  <button className="px-4 py-2 bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 text-sm font-medium rounded-lg transition-colors border border-blue-800">
                    ✏️ Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Cards Grid */}
      <div className="mb-8">
        <h2 className="text-white font-semibold mb-3">Agent Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {AGENTS.map((agent) => {
            const status = getAgentStatus(agent.name);
            const lastTask = getAgentLastTask(agent.name);
            return (
              <div key={agent.name} className="bg-[#111827] border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{agent.emoji}</span>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{agent.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${STATUS_DOTS[status]}`} />
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${STATUS_STYLES[status]}`}>
                      {status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                <p className="text-gray-500 text-xs mb-3">{agent.description}</p>
                <div className="border-t border-gray-800 pt-3 text-xs">
                  <p className="text-gray-500 mb-1">Last Task</p>
                  <p className="text-gray-300 line-clamp-2">{lastTask}</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Success Rate</span>
                  <span className={`font-medium ${agent.successRate >= 90 ? "text-green-400" : agent.successRate >= 75 ? "text-yellow-400" : "text-red-400"}`}>
                    {agent.successRate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-0">
          {mockAgentActivity.map((action, i) => (
            <div
              key={action.id}
              className={`flex items-start gap-4 py-4 ${i < mockAgentActivity.length - 1 ? "border-b border-gray-800" : ""}`}
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOTS[action.status]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-gray-400 text-xs font-medium">{action.agent_name}</span>
                  {action.project && (
                    <span className="text-gray-600 text-xs">· {action.project}</span>
                  )}
                </div>
                <p className="text-white text-sm">{action.task}</p>
                {action.result && (
                  <p className="text-gray-500 text-xs mt-0.5">{action.result}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_STYLES[action.status]}`}>
                  {action.status.replace(/_/g, " ")}
                </span>
                <p className="text-gray-600 text-xs mt-1">
                  {new Date(action.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
