"use client";

import { useState } from "react";
import KanbanBoard, { KanbanColumn } from "@/components/dashboard/KanbanBoard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import PriorityBadge from "@/components/dashboard/PriorityBadge";
import { mockWorkOrders, WorkOrder } from "@/lib/mockData";

const COLUMNS: KanbanColumn[] = [
  { id: "new", title: "New", dotColor: "bg-blue-500" },
  { id: "scheduled", title: "Scheduled", dotColor: "bg-purple-500" },
  { id: "in_progress", title: "In Progress", dotColor: "bg-yellow-500" },
  { id: "waiting_on_parts", title: "Waiting on Parts", dotColor: "bg-orange-500" },
  { id: "completed", title: "Completed", dotColor: "bg-green-500" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-900/40 text-red-400 border border-red-800",
  high: "bg-orange-900/40 text-orange-400 border border-orange-800",
  medium: "bg-yellow-900/40 text-yellow-400 border border-yellow-800",
  low: "bg-gray-800 text-gray-400 border border-gray-700",
};

function WorkOrderCard({ wo }: { wo: WorkOrder }) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-blue-800 transition-colors cursor-pointer">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-gray-500 text-xs font-mono">{wo.id}</span>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[wo.priority]}`}>
          {wo.priority}
        </span>
      </div>
      <p className="text-white text-sm font-medium leading-snug mb-1">{wo.description}</p>
      <p className="text-gray-400 text-xs mb-3">{wo.client} · {wo.property}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>👷 {wo.assigned_tech}</span>
        <span>📅 {wo.scheduled_date}</span>
      </div>
    </div>
  );
}

const TABLE_COLUMNS_ALL = ["new", "scheduled", "in_progress", "waiting_on_parts", "completed", "invoiced"];

const EMPTY_WO_FORM = {
  client: "", property: "", description: "",
  priority: "medium" as WorkOrder["priority"], assigned_tech: "", scheduled_date: "",
};

export default function WorkOrdersPage() {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(mockWorkOrders);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_WO_FORM);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newWO: WorkOrder = {
      id: `WO-${Date.now().toString().slice(-4)}`,
      client: form.client,
      property: form.property,
      description: form.description,
      status: "new",
      priority: form.priority,
      assigned_tech: form.assigned_tech,
      scheduled_date: form.scheduled_date,
    };
    setWorkOrders((prev) => [newWO, ...prev]);
    setForm(EMPTY_WO_FORM);
    setShowModal(false);
  }

  const kanbanOrders = workOrders.filter((wo) => wo.status !== "invoiced");
  const total = workOrders.length;
  const openCount = workOrders.filter((wo) => !["completed", "invoiced"].includes(wo.status)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Work Orders</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total · {openCount} open</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === "kanban" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === "table" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              Table
            </button>
          </div>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            + Create Work Order
          </button>
        </div>
      </div>

      {/* New Work Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-semibold text-lg">New Work Order</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Client *</label>
                  <input required type="text" value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Property</label>
                  <input type="text" value={form.property} onChange={(e) => setForm((f) => ({ ...f, property: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Description *</label>
                <textarea required rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as WorkOrder["priority"] }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Scheduled Date</label>
                  <input type="date" value={form.scheduled_date} onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Assigned Tech</label>
                <input type="text" value={form.assigned_tech} onChange={(e) => setForm((f) => ({ ...f, assigned_tech: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {view === "kanban" ? (
        <KanbanBoard<WorkOrder>
          columns={COLUMNS}
          items={kanbanOrders}
          getItemColumn={(wo) => wo.status}
          getItemKey={(wo) => wo.id}
          renderCard={(wo) => <WorkOrderCard wo={wo} />}
        />
      ) : (
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 font-medium px-4 py-3">WO ID</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Client</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Description</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Priority</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Assigned</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Date</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => (
                <tr key={wo.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{wo.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-white">{wo.client}</p>
                    <p className="text-gray-500 text-xs">{wo.property}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs">
                    <span className="line-clamp-2">{wo.description}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[wo.priority]}`}>
                      {wo.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{wo.assigned_tech}</td>
                  <td className="px-4 py-3 text-gray-400">{wo.scheduled_date}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={wo.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
