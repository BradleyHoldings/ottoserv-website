"use client";

import { useEffect, useState } from "react";
import { platformFetch } from "@/lib/platformApi";

interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  assigned_agent: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Agent {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ["all", "pending", "in_progress", "completed", "failed"];
const PRIORITY_OPTIONS = ["all", "low", "medium", "high", "critical"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-900/40 text-yellow-400",
  in_progress: "bg-blue-900/40 text-blue-400",
  completed: "bg-green-900/40 text-green-400",
  failed: "bg-red-900/40 text-red-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-800 text-gray-400",
  medium: "bg-yellow-900/40 text-yellow-400",
  high: "bg-orange-900/40 text-orange-400",
  critical: "bg-red-900/40 text-red-400",
};

const INPUT_CLASS =
  "w-full bg-[#1f2937] border border-gray-700 text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";

const SELECT_CLASS =
  "bg-[#1f2937] border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors";

export default function PlatformTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newTask, setNewTask] = useState({
    title: "",
    type: "",
    priority: "medium",
    description: "",
    assigned_agent: "",
  });

  useEffect(() => {
    Promise.all([
      platformFetch("/tasks").then((r) => r.json()),
      platformFetch("/agents").then((r) => r.json()),
    ])
      .then(([tasksData, agentsData]) => {
        setTasks(Array.isArray(tasksData) ? tasksData : (tasksData.tasks ?? []));
        setAgents(Array.isArray(agentsData) ? agentsData : (agentsData.agents ?? []));
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load tasks.");
        setLoading(false);
      });
  }, []);

  const filtered = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (agentFilter !== "all" && t.assigned_agent !== agentFilter) return false;
    return true;
  });

  const handleCreateChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setNewTask((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setCreateError("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setCreateError("");
    try {
      const res = await platformFetch("/tasks", {
        method: "POST",
        body: JSON.stringify(newTask),
      });
      const data = await res.json();
      const created: Task = data.task ?? data;
      setTasks((prev) => [created, ...prev]);
      setShowCreateForm(false);
      setNewTask({ title: "", type: "", priority: "medium", description: "", assigned_agent: "" });
    } catch (err) {
      if ((err as Error).message !== "Unauthorized") {
        setCreateError("Failed to create task. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Tasks</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage and track automation tasks</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + New Task
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Create task form */}
      {showCreateForm && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">Create New Task</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {createError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
              {createError}
            </div>
          )}
          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
              <input
                name="title"
                type="text"
                required
                value={newTask.title}
                onChange={handleCreateChange}
                className={INPUT_CLASS}
                placeholder="Task title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
              <input
                name="type"
                type="text"
                value={newTask.type}
                onChange={handleCreateChange}
                className={INPUT_CLASS}
                placeholder="e.g. data_processing, email_campaign"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Priority</label>
              <select name="priority" value={newTask.priority} onChange={handleCreateChange} className={`${INPUT_CLASS}`}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Assign to Agent</label>
              <select name="assigned_agent" value={newTask.assigned_agent} onChange={handleCreateChange} className={`${INPUT_CLASS}`}>
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
              <textarea
                name="description"
                rows={3}
                value={newTask.description}
                onChange={handleCreateChange}
                className={`${INPUT_CLASS} resize-none`}
                placeholder="Describe the task..."
              />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-[#1f2937] border border-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-md transition-colors"
              >
                {submitting ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <span className="text-gray-400 text-sm">Filter:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={SELECT_CLASS}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All Statuses" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className={SELECT_CLASS}
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p === "all" ? "All Priorities" : p.replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="all">All Agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <span className="text-gray-500 text-sm ml-auto">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Task list */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading tasks...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No tasks match the current filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 font-medium px-5 py-3">Title</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Priority</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">Agent</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden xl:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, i) => (
                <tr
                  key={task.id}
                  className={`border-b border-gray-800 last:border-0 ${
                    i % 2 === 0 ? "" : "bg-white/[0.02]"
                  }`}
                >
                  <td className="px-5 py-3">
                    <p className="text-white font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                    {task.type?.replace(/_/g, " ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${PRIORITY_COLORS[task.priority] ?? "bg-gray-800 text-gray-400"}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${STATUS_COLORS[task.status] ?? "bg-gray-800 text-gray-400"}`}>
                      {task.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{task.assigned_agent || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 hidden xl:table-cell">
                    {task.created_at ? new Date(task.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
