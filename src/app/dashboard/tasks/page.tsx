"use client";

import { useState, useEffect } from "react";
import DataTable, { Column } from "@/components/dashboard/DataTable";
import StatusBadge from "@/components/dashboard/StatusBadge";
import PriorityBadge from "@/components/dashboard/PriorityBadge";
import { mockTasks, mockProjects, Task } from "@/lib/mockData";
import { getTasks, getToken } from "@/lib/dashboardApi";

const STATUS_OPTIONS = ["all", "open", "in_progress", "overdue", "waiting", "needs_approval", "done"];
const PRIORITY_OPTIONS = ["all", "urgent", "high", "medium", "low"];

const projectName = (id: string | null) => {
  if (!id) return "—";
  return mockProjects.find((p) => p.id === id)?.project_name ?? id;
};

type TaskRow = Task & Record<string, unknown>;

const COLUMNS: Column<TaskRow>[] = [
  {
    key: "title",
    label: "Task",
    render: (row) => <span className="text-white">{row.title}</span>,
  },
  {
    key: "project_id",
    label: "Project",
    render: (row) => (
      <span className="text-gray-400 text-xs">{projectName(row.project_id)}</span>
    ),
  },
  {
    key: "priority",
    label: "Priority",
    sortable: true,
    render: (row) => <PriorityBadge priority={row.priority} />,
  },
  {
    key: "status",
    label: "Status",
    render: (row) => <StatusBadge status={row.status} />,
  },
  { key: "assigned_to", label: "Assigned To", sortable: true },
  { key: "due_date", label: "Due Date", sortable: true },
];

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [tasks, setTasks] = useState(mockTasks);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      getTasks(token).then((data) => { if (data) setTasks(data); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  const filtered = tasks.filter((t) => {
    const statusOk = statusFilter === "all" || t.status === statusFilter;
    const priorityOk = priorityFilter === "all" || t.priority === priorityFilter;
    return statusOk && priorityOk;
  });

  const overdueCount = tasks.filter((t) => t.status === "overdue").length;
  const openCount = tasks.filter((t) => t.status === "open").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">
            {openCount} open · {overdueCount} overdue
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + New Task
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-gray-500 text-xs mb-2 font-medium">STATUS</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {s === "all" ? "All" : s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-2 font-medium">PRIORITY</p>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    priorityFilter === p
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-white font-medium">No tasks match your filters</p>
          <p className="text-gray-500 text-sm mt-1">Try adjusting the filters above</p>
        </div>
      ) : (
        <DataTable<TaskRow>
          data={filtered as TaskRow[]}
          columns={COLUMNS}
          searchable
          searchPlaceholder="Search tasks..."
          searchFields={["title", "assigned_to", "status"]}
        />
      )}
    </div>
  );
}
