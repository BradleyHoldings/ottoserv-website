"use client";

import { useState } from "react";
import DataTable, { Column } from "@/components/dashboard/DataTable";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { mockMaterials, mockExpenses, Material, Expense } from "@/lib/mockData";

type MaterialRow = Material & Record<string, unknown>;
type ExpenseRow = Expense & Record<string, unknown>;

const MAT_COLUMNS: Column<MaterialRow>[] = [
  {
    key: "name",
    label: "Material",
    render: (row) => <span className="text-white font-medium">{row.name}</span>,
  },
  { key: "category", label: "Category", sortable: true },
  {
    key: "quantity",
    label: "Qty",
    render: (row) => (
      <span className="text-gray-300 tabular-nums">
        {row.quantity} {row.unit}
      </span>
    ),
  },
  {
    key: "unit_cost",
    label: "Unit Cost",
    sortable: true,
    render: (row) => (
      <span className="text-gray-300 tabular-nums">${row.unit_cost.toLocaleString()}</span>
    ),
  },
  {
    key: "unit_cost",
    label: "Total",
    render: (row) => (
      <span className="text-white font-medium tabular-nums">
        ${(row.quantity * row.unit_cost).toLocaleString()}
      </span>
    ),
  },
  { key: "supplier", label: "Supplier", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => <StatusBadge status={row.status} />,
  },
];

const EXP_COLUMNS: Column<ExpenseRow>[] = [
  {
    key: "vendor",
    label: "Vendor",
    render: (row) => <span className="text-white font-medium">{row.vendor}</span>,
  },
  { key: "description", label: "Description" },
  { key: "category", label: "Category", sortable: true },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    render: (row) => (
      <span className="text-white font-medium tabular-nums">${row.amount.toLocaleString()}</span>
    ),
  },
  { key: "date", label: "Date", sortable: true },
  {
    key: "receipt_status",
    label: "Receipt",
    render: (row) => <StatusBadge status={row.receipt_status} />,
  },
];

const TABS = ["materials", "receipts"] as const;

export default function MaterialsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("materials");
  const [uploading, setUploading] = useState(false);

  const totalMaterialValue = mockMaterials.reduce(
    (s, m) => s + m.quantity * m.unit_cost,
    0
  );
  const unmatchedCount = mockExpenses.filter((e) => e.receipt_status === "unmatched").length;

  function simulateUpload() {
    setUploading(true);
    setTimeout(() => setUploading(false), 1500);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Materials & Receipts</h1>
          <p className="text-gray-500 text-sm mt-1">
            ${totalMaterialValue.toLocaleString()} in tracked materials ·{" "}
            {unmatchedCount} unmatched receipts
          </p>
        </div>
        <button
          onClick={simulateUpload}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {uploading ? (
            <>
              <span className="animate-spin text-xs">⏳</span> Uploading…
            </>
          ) : (
            <>📎 Upload Receipt</>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "On Site",
            count: mockMaterials.filter((m) => m.status === "on_site").length,
            color: "text-green-400",
          },
          {
            label: "Ordered",
            count: mockMaterials.filter((m) => m.status === "ordered").length,
            color: "text-blue-400",
          },
          {
            label: "Pending",
            count: mockMaterials.filter((m) => m.status === "pending").length,
            color: "text-yellow-400",
          },
          {
            label: "Unmatched Receipts",
            count: unmatchedCount,
            color: "text-orange-400",
          },
        ].map((card) => (
          <div key={card.label} className="bg-[#111827] border border-gray-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${card.color}`}>{card.count}</p>
            <p className="text-gray-400 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-blue-600 text-white"
                : "bg-[#111827] text-gray-400 hover:text-white border border-gray-800"
            }`}
          >
            {t === "materials" ? "Materials Inventory" : "Receipts & Expenses"}
          </button>
        ))}
      </div>

      {tab === "materials" ? (
        <DataTable<MaterialRow>
          data={mockMaterials as MaterialRow[]}
          columns={MAT_COLUMNS}
          searchable
          searchPlaceholder="Search materials..."
          searchFields={["name", "category", "supplier", "status"]}
        />
      ) : (
        <DataTable<ExpenseRow>
          data={mockExpenses as ExpenseRow[]}
          columns={EXP_COLUMNS}
          searchable
          searchPlaceholder="Search expenses..."
          searchFields={["vendor", "description", "category"]}
        />
      )}
    </div>
  );
}
