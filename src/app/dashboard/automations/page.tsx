"use client";

import { useState } from "react";
import AutomationCard from "@/components/dashboard/AutomationCard";
import { mockAutomations, Automation } from "@/lib/mockData";

const EMPTY_AUTO_FORM = { name: "", trigger: "new_lead", action: "send_email", description: "" };

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_AUTO_FORM);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newAuto: Automation = {
      id: Date.now().toString(),
      name: form.name,
      description: form.description,
      status: "paused",
      last_run: "Never",
      next_run: null,
      success_count: 0,
      failure_count: 0,
      connected_systems: [],
    };
    setAutomations((prev) => [newAuto, ...prev]);
    setForm(EMPTY_AUTO_FORM);
    setShowModal(false);
  }

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
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
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

      {/* New Automation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-semibold text-lg">New Automation</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Name *</label>
                <input required type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Trigger</label>
                  <select value={form.trigger} onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="new_lead">New Lead</option>
                    <option value="form_submit">Form Submit</option>
                    <option value="job_complete">Job Complete</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Action</label>
                  <select value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="send_email">Send Email</option>
                    <option value="send_sms">Send SMS</option>
                    <option value="create_task">Create Task</option>
                    <option value="notify_team">Notify Team</option>
                    <option value="update_crm">Update CRM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Save</button>
              </div>
            </form>
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
