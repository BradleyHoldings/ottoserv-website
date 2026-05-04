"use client";

import { useState, useEffect } from "react";
import KanbanBoard, { KanbanColumn } from "@/components/dashboard/KanbanBoard";
import DataTable, { Column } from "@/components/dashboard/DataTable";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { mockLeads, Lead } from "@/lib/mockData";
import { getLeads, getToken } from "@/lib/dashboardApi";

const STAGES: KanbanColumn[] = [
  { id: "new", title: "New", dotColor: "bg-blue-400" },
  { id: "contacted", title: "Contacted", dotColor: "bg-blue-400" },
  { id: "qualified", title: "Qualified", dotColor: "bg-purple-400" },
  { id: "estimate_scheduled", title: "Estimate Scheduled", dotColor: "bg-yellow-400" },
  { id: "estimate_sent", title: "Estimate Sent", dotColor: "bg-orange-400" },
  { id: "follow_up", title: "Follow-Up", dotColor: "bg-orange-400" },
  { id: "won", title: "Won", dotColor: "bg-green-400" },
  { id: "lost", title: "Lost", dotColor: "bg-red-400" },
];

const SOURCE_ICONS: Record<string, string> = {
  referral: "👥",
  google: "🔍",
  facebook: "📘",
  website: "🌐",
  yelp: "⭐",
};

const SCORE_COLOR = (score: number) =>
  score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";

type LeadRow = Lead & Record<string, unknown>;

const TABLE_COLUMNS: Column<LeadRow>[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (row) => <span className="text-white font-medium">{row.name}</span>,
  },
  { key: "phone", label: "Phone" },
  { key: "service_needed", label: "Service", sortable: true },
  { key: "budget", label: "Budget" },
  {
    key: "source",
    label: "Source",
    render: (row) => (
      <span>
        {SOURCE_ICONS[row.source] || "📌"} {row.source}
      </span>
    ),
  },
  {
    key: "lead_score",
    label: "Score",
    sortable: true,
    render: (row) => (
      <span className={`font-bold ${SCORE_COLOR(row.lead_score)}`}>{row.lead_score}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (row) => <StatusBadge status={row.status} />,
  },
  { key: "created_at", label: "Created", sortable: true },
];

const EMPTY_LEAD_FORM = {
  name: "", phone: "", email: "", service_needed: "",
  source: "referral", budget: "",
};

export default function LeadsPage() {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState(mockLeads);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_LEAD_FORM);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newLead: Lead = {
      id: Date.now().toString(),
      name: form.name,
      phone: form.phone,
      email: form.email,
      service_needed: form.service_needed,
      source: form.source,
      budget: form.budget,
      status: "new",
      lead_score: 50,
      assigned_to: "Unassigned",
      created_at: new Date().toISOString().slice(0, 10),
    };
    setLeads((prev) => [newLead, ...prev]);
    setForm(EMPTY_LEAD_FORM);
    setShowModal(false);
  }

  useEffect(() => {
    const token = getToken();
    if (token) {
      getLeads(token).then((data) => { if (data) setLeads(data); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <div data-demo-target="leads-pipeline">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">{leads.length} leads in pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === "kanban" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === "table" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Table
            </button>
          </div>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            + New Lead
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard<Lead>
          columns={STAGES}
          items={leads}
          getItemColumn={(lead) => lead.status}
          getItemKey={(lead) => lead.id}
          renderCard={(lead) => (
            <button
              onClick={() => setSelectedLead(lead)}
              className="w-full text-left bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-blue-800 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-white text-sm font-medium leading-snug">{lead.name}</p>
                <span className={`text-xs font-bold flex-shrink-0 ${SCORE_COLOR(lead.lead_score)}`}>
                  {lead.lead_score}
                </span>
              </div>
              <p className="text-gray-400 text-xs mb-2">{lead.service_needed}</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">{lead.budget}</span>
                <span className="text-gray-600 text-xs">
                  {SOURCE_ICONS[lead.source] || "📌"} {lead.source}
                </span>
              </div>
              <p className="text-gray-600 text-xs mt-1">{lead.created_at}</p>
            </button>
          )}
        />
      ) : (
        <DataTable<LeadRow>
          data={leads as LeadRow[]}
          columns={TABLE_COLUMNS}
          onRowClick={setSelectedLead}
          searchable
          searchPlaceholder="Search leads..."
          searchFields={["name", "email", "service_needed", "source"]}
        />
      )}

      {/* New Lead Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-semibold text-lg">New Lead</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Name *</label>
                  <input required type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Service Needed</label>
                  <input type="text" value={form.service_needed} onChange={(e) => setForm((f) => ({ ...f, service_needed: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Source</label>
                  <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="referral">Referral</option>
                    <option value="google">Google</option>
                    <option value="facebook">Facebook</option>
                    <option value="website">Website</option>
                    <option value="yelp">Yelp</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Budget</label>
                <input type="text" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} placeholder="e.g. $5,000 - $10,000" className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Panel */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedLead(null)}
          />
          <div className="relative w-full max-w-md h-full bg-[#111827] border-l border-gray-800 overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedLead.name}</h2>
                <p className="text-gray-400 text-sm">{selectedLead.id}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Contact</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="text-white">{selectedLead.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="text-blue-400">{selectedLead.email}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Lead Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service</span>
                    <span className="text-white">{selectedLead.service_needed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Budget</span>
                    <span className="text-white">{selectedLead.budget}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    <span className="text-white capitalize">{selectedLead.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Assigned</span>
                    <span className="text-white">{selectedLead.assigned_to}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created</span>
                    <span className="text-white">{selectedLead.created_at}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Score & Status</h3>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${SCORE_COLOR(selectedLead.lead_score)}`}>
                      {selectedLead.lead_score}
                    </p>
                    <p className="text-gray-500 text-xs">Lead Score</p>
                  </div>
                  <StatusBadge status={selectedLead.status} size="md" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Schedule Estimate
                </button>
                <button className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700">
                  Send Email
                </button>
                <button className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700">
                  Convert to Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
