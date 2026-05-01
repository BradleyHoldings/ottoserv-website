"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { platformFetch } from "@/lib/platformApi";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_agent: string;
  created_at: string;
}

interface Approval {
  id: string;
  task_title: string;
  agent: string;
  action: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  department: string;
  status: string;
}

interface AuditEvent {
  id: string;
  timestamp: string;
  event_type: string;
  action: string;
  risk_level: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-800 text-gray-400",
  medium: "bg-yellow-900/40 text-yellow-400",
  high: "bg-orange-900/40 text-orange-400",
  critical: "bg-red-900/40 text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-900/40 text-yellow-400",
  in_progress: "bg-blue-900/40 text-blue-400",
  completed: "bg-green-900/40 text-green-400",
  failed: "bg-red-900/40 text-red-400",
  approved: "bg-green-900/40 text-green-400",
  rejected: "bg-red-900/40 text-red-400",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded capitalize ${colorClass}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
  };
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
      <p className={`text-3xl font-bold ${colorMap[color] ?? "text-white"}`}>{value}</p>
      <p className="text-gray-400 text-xs mt-1.5">{label}</p>
    </div>
  );
}

function DashCard({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        {typeof count === "number" && (
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function PlatformDashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      platformFetch("/tasks?limit=10").then((r) => r.json()),
      platformFetch("/approvals?status=pending").then((r) => r.json()),
      platformFetch("/agents").then((r) => r.json()),
      platformFetch("/audit?limit=5").then((r) => r.json()),
    ])
      .then(([tasksData, approvalsData, agentsData, auditData]) => {
        setTasks(Array.isArray(tasksData) ? tasksData : (tasksData.tasks ?? []));
        setApprovals(Array.isArray(approvalsData) ? approvalsData : (approvalsData.approvals ?? []));
        setAgents(Array.isArray(agentsData) ? agentsData : (agentsData.agents ?? []));
        setAuditEvents(Array.isArray(auditData) ? auditData : (auditData.events ?? []));
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load dashboard data.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => t.status === "in_progress" || t.status === "pending").length;
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const departments = new Set(agents.map((a) => a.department)).size;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-xl font-bold">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Overview of your automation platform</p>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Active Tasks" value={activeTasks} color="blue" />
        <SummaryCard label="Pending Approvals" value={approvals.length} color="yellow" />
        <SummaryCard label="Departments" value={departments || agents.length > 0 ? departments : "—"} color="purple" />
        <SummaryCard label="Recent Audit Events" value={auditEvents.length} color="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent tasks */}
        <DashCard title="Recent Tasks" count={tasks.length}>
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">No tasks yet.</p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {tasks.slice(0, 8).map((task) => (
                <li key={task.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{task.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{task.assigned_agent}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      label={task.priority}
                      colorClass={PRIORITY_COLORS[task.priority] ?? "bg-gray-800 text-gray-400"}
                    />
                    <Badge
                      label={task.status}
                      colorClass={STATUS_COLORS[task.status] ?? "bg-gray-800 text-gray-400"}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashCard>

        {/* Pending approvals */}
        <DashCard title="Pending Approvals" count={approvals.length}>
          {approvals.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">No pending approvals.</p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {approvals.slice(0, 6).map((approval) => (
                <li key={approval.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{approval.task_title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {approval.agent} — {approval.action}
                    </p>
                  </div>
                  <Link
                    href="/platform/approvals"
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashCard>

        {/* Agent registry */}
        <DashCard title="Agent Registry" count={agents.length}>
          {agents.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">No agents registered.</p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {agents.slice(0, 6).map((agent) => (
                <li key={agent.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">{agent.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{agent.department}</p>
                  </div>
                  <span
                    className={`flex items-center gap-1.5 text-xs ${
                      agent.status === "active" ? "text-green-400" : "text-gray-500"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full inline-block ${
                        agent.status === "active" ? "bg-green-400" : "bg-gray-600"
                      }`}
                    />
                    {agent.status === "active" ? "Active" : "Inactive"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashCard>

        {/* Quick actions */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h3 className="text-white font-semibold text-sm mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/platform/tasks"
              className="flex flex-col items-center justify-center gap-2 bg-[#1f2937] hover:bg-gray-700 border border-gray-700 rounded-lg p-4 transition-colors text-center"
            >
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-white text-sm font-medium">Create Task</span>
            </Link>
            <Link
              href="/platform/audit"
              className="flex flex-col items-center justify-center gap-2 bg-[#1f2937] hover:bg-gray-700 border border-gray-700 rounded-lg p-4 transition-colors text-center"
            >
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-white text-sm font-medium">View Audit Log</span>
            </Link>
            <Link
              href="/platform/approvals"
              className="flex flex-col items-center justify-center gap-2 bg-[#1f2937] hover:bg-gray-700 border border-gray-700 rounded-lg p-4 transition-colors text-center"
            >
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white text-sm font-medium">
                Approvals
                {approvals.length > 0 && (
                  <span className="ml-1.5 bg-yellow-600 text-white text-xs rounded-full px-1.5 py-0.5">
                    {approvals.length}
                  </span>
                )}
              </span>
            </Link>
            <Link
              href="/platform/agents"
              className="flex flex-col items-center justify-center gap-2 bg-[#1f2937] hover:bg-gray-700 border border-gray-700 rounded-lg p-4 transition-colors text-center"
            >
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
              <span className="text-white text-sm font-medium">Manage Agents</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
