"use client";

import { useState, useMemo } from "react";
import KanbanBoard, { KanbanColumn } from "@/components/dashboard/KanbanBoard";
import DataTable, { Column } from "@/components/dashboard/DataTable";
import { mockDeals, Deal } from "@/lib/mockData";

const STAGES: KanbanColumn[] = [
  { id: "discovery", title: "Discovery", dotColor: "bg-blue-400" },
  { id: "qualified", title: "Qualified", dotColor: "bg-indigo-400" },
  { id: "proposal", title: "Proposal", dotColor: "bg-purple-400" },
  { id: "negotiation", title: "Negotiation", dotColor: "bg-yellow-400" },
  { id: "won", title: "Won", dotColor: "bg-green-400" },
  { id: "lost", title: "Lost", dotColor: "bg-red-400" },
];

const STAGE_COLORS: Record<string, string> = {
  discovery: "bg-blue-900/40 text-blue-400 border-blue-800",
  qualified: "bg-indigo-900/40 text-indigo-400 border-indigo-800",
  proposal: "bg-purple-900/40 text-purple-400 border-purple-800",
  negotiation: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  won: "bg-green-900/40 text-green-400 border-green-800",
  lost: "bg-red-900/40 text-red-400 border-red-800",
};

const AI_RECS: Record<string, string> = {
  discovery:
    "Schedule a discovery call to qualify budget, timeline, and decision-maker. Aim within 48 hours.",
  qualified:
    "High conversion potential. Prepare a tailored proposal and send within 3 business days.",
  proposal:
    "Follow up within 72 hours if no response. Offer a site visit to build confidence.",
  negotiation:
    "Deal is close. Consider a small value-add concession rather than a price cut to protect margin.",
  won: "Contract signed — create project in system, schedule kickoff, and send welcome email.",
  lost: "Send a 30-day re-engagement email. Circumstances change; keep the relationship warm.",
};

function StageBadge({ stage }: { stage: string }) {
  const color =
    STAGE_COLORS[stage] || "bg-gray-800 text-gray-400 border-gray-700";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize ${color}`}
    >
      {stage}
    </span>
  );
}

function ProbabilityBar({ probability }: { probability: number }) {
  const color =
    probability >= 70
      ? "bg-green-500"
      : probability >= 40
      ? "bg-yellow-500"
      : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${probability}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{probability}%</span>
    </div>
  );
}

function formatCurrency(n: number) {
  return "$" + n.toLocaleString();
}

type DealRow = Deal & Record<string, unknown>;

const TABLE_COLUMNS: Column<DealRow>[] = [
  {
    key: "name",
    label: "Deal",
    sortable: true,
    render: (row) => (
      <span className="text-white font-medium">{row.name}</span>
    ),
  },
  {
    key: "value",
    label: "Value",
    sortable: true,
    render: (row) => (
      <span className="text-green-400 font-medium">
        {formatCurrency(row.value)}
      </span>
    ),
  },
  {
    key: "stage",
    label: "Stage",
    render: (row) => <StageBadge stage={row.stage} />,
  },
  {
    key: "probability",
    label: "Probability",
    sortable: true,
    render: (row) => <ProbabilityBar probability={row.probability} />,
  },
  {
    key: "expected_close_date",
    label: "Close Date",
    sortable: true,
  },
  {
    key: "contact_name",
    label: "Contact",
    sortable: true,
  },
  {
    key: "days_in_stage",
    label: "Days in Stage",
    sortable: true,
    render: (row) => (
      <span
        className={
          row.days_in_stage > 10
            ? "text-red-400"
            : row.days_in_stage > 5
            ? "text-yellow-400"
            : "text-gray-400"
        }
      >
        {row.days_in_stage}d
      </span>
    ),
  },
];

export default function DealsPage() {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const openDeals = useMemo(
    () => mockDeals.filter((d) => d.stage !== "won" && d.stage !== "lost"),
    []
  );
  const pipelineValue = useMemo(
    () => openDeals.reduce((sum, d) => sum + d.value, 0),
    [openDeals]
  );
  const wonDeals = mockDeals.filter((d) => d.stage === "won").length;
  const lostDeals = mockDeals.filter((d) => d.stage === "lost").length;
  const winRate =
    wonDeals + lostDeals > 0
      ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100)
      : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Deals Pipeline</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mockDeals.length} deals total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === "kanban"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === "table"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Table
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Deal
          </button>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111827] border border-green-900/40 rounded-xl p-4">
          <p className="text-green-400 text-2xl font-bold tabular-nums">
            {formatCurrency(pipelineValue)}
          </p>
          <p className="text-gray-400 text-sm mt-1">Open Pipeline</p>
          <p className="text-gray-600 text-xs mt-1">
            {openDeals.length} active deals
          </p>
        </div>
        <div className="bg-[#111827] border border-blue-900/40 rounded-xl p-4">
          <p className="text-blue-400 text-2xl font-bold">
            {openDeals.length}
          </p>
          <p className="text-gray-400 text-sm mt-1">Open Deals</p>
          <p className="text-gray-600 text-xs mt-1">Across 4 stages</p>
        </div>
        <div className="bg-[#111827] border border-green-900/40 rounded-xl p-4">
          <p className="text-green-400 text-2xl font-bold">{wonDeals}</p>
          <p className="text-gray-400 text-sm mt-1">Won</p>
          <p className="text-gray-600 text-xs mt-1">
            {formatCurrency(
              mockDeals
                .filter((d) => d.stage === "won")
                .reduce((s, d) => s + d.value, 0)
            )}{" "}
            closed
          </p>
        </div>
        <div className="bg-[#111827] border border-yellow-900/40 rounded-xl p-4">
          <p className="text-yellow-400 text-2xl font-bold">{winRate}%</p>
          <p className="text-gray-400 text-sm mt-1">Win Rate</p>
          <p className="text-gray-600 text-xs mt-1">
            {wonDeals} won / {lostDeals} lost
          </p>
        </div>
      </div>

      {/* Kanban or Table */}
      {view === "kanban" ? (
        <KanbanBoard<Deal>
          columns={STAGES}
          items={mockDeals}
          getItemColumn={(deal) => deal.stage}
          getItemKey={(deal) => deal.id}
          renderCard={(deal) => (
            <button
              onClick={() => setSelectedDeal(deal)}
              className="w-full text-left bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-blue-800 transition-colors"
            >
              <p className="text-white text-sm font-medium leading-snug mb-1">
                {deal.name}
              </p>
              <p className="text-green-400 text-sm font-bold mb-2">
                {formatCurrency(deal.value)}
              </p>
              <p className="text-gray-500 text-xs mb-2">{deal.contact_name}</p>
              <ProbabilityBar probability={deal.probability} />
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-600 text-xs">
                  Close: {deal.expected_close_date}
                </span>
                {deal.days_in_stage > 0 && (
                  <span
                    className={`text-xs ${
                      deal.days_in_stage > 10
                        ? "text-red-400"
                        : "text-gray-600"
                    }`}
                  >
                    {deal.days_in_stage}d
                  </span>
                )}
              </div>
              {deal.assigned_agent && (
                <p className="text-orange-500 text-xs mt-1">
                  🤖 {deal.assigned_agent}
                </p>
              )}
            </button>
          )}
        />
      ) : (
        <DataTable<DealRow>
          data={mockDeals as DealRow[]}
          columns={TABLE_COLUMNS}
          onRowClick={(row) => setSelectedDeal(row as Deal)}
          searchable
          searchPlaceholder="Search deals..."
          searchFields={["name", "contact_name", "company_name", "stage"]}
        />
      )}

      {/* Deal Detail Panel */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedDeal(null)}
          />
          <div className="relative w-full max-w-md h-full bg-[#111827] border-l border-gray-800 overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="min-w-0 pr-2">
                <h2 className="text-lg font-bold text-white leading-snug">
                  {selectedDeal.name}
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  {selectedDeal.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedDeal(null)}
                className="text-gray-500 hover:text-white text-xl leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Stage & Value */}
              <div className="flex items-center gap-3">
                <StageBadge stage={selectedDeal.stage} />
                <span className="text-green-400 text-lg font-bold">
                  {formatCurrency(selectedDeal.value)}
                </span>
              </div>

              {/* Probability */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-xs font-medium uppercase">
                    Probability
                  </h3>
                  <span className="text-white text-sm font-bold">
                    {selectedDeal.probability}%
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedDeal.probability >= 70
                        ? "bg-green-500"
                        : selectedDeal.probability >= 40
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${selectedDeal.probability}%` }}
                  />
                </div>
              </div>

              {/* Deal Details */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                  Deal Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contact</span>
                    <span className="text-white">
                      {selectedDeal.contact_name}
                    </span>
                  </div>
                  {selectedDeal.company_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Company</span>
                      <span className="text-white">
                        {selectedDeal.company_name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    <span className="text-white capitalize">
                      {selectedDeal.source}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expected Close</span>
                    <span className="text-white">
                      {selectedDeal.expected_close_date}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Assigned To</span>
                    <span className="text-white">
                      {selectedDeal.assigned_to}
                    </span>
                  </div>
                  {selectedDeal.assigned_agent && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">AI Agent</span>
                      <span className="text-orange-400">
                        {selectedDeal.assigned_agent}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Days in Stage</span>
                    <span
                      className={
                        selectedDeal.days_in_stage > 10
                          ? "text-red-400"
                          : "text-white"
                      }
                    >
                      {selectedDeal.days_in_stage} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created</span>
                    <span className="text-white">
                      {selectedDeal.created_at}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedDeal.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedDeal.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              {selectedDeal.notes && (
                <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                    Notes
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {selectedDeal.notes}
                  </p>
                </div>
              )}

              {/* AI Recommendation */}
              <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span>🤖</span>
                  <h3 className="text-blue-400 text-xs font-medium uppercase">
                    Jarvis Recommendation
                  </h3>
                </div>
                <p className="text-blue-200 text-sm leading-relaxed">
                  {AI_RECS[selectedDeal.stage] || AI_RECS.discovery}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Log Activity
                </button>
                <button className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700">
                  Move Stage
                </button>
                <button className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700">
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative w-full max-w-lg bg-[#111827] border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">New Deal</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">
                  Deal Name
                </label>
                <input
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                  placeholder="e.g. Smith Kitchen Remodel"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Value ($)
                </label>
                <input
                  type="number"
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                  placeholder="25000"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Stage
                </label>
                <select className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500">
                  <option value="discovery">Discovery</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Contact
                </label>
                <input
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                  placeholder="Contact name"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Expected Close
                </label>
                <input
                  type="date"
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500 resize-none"
                  placeholder="Deal context..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Create Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
