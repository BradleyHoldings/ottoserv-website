"use client";

import { useState } from "react";
import KpiCard from "@/components/dashboard/KpiCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import ComingSoonBanner from "@/components/dashboard/ComingSoonBanner";
import EmptyState from "@/components/dashboard/EmptyState";
import ActionStateModal from "@/components/dashboard/ActionStateModal";

interface Invoice {
  id: string;
  client_name: string;
  amount: number;
  issued_date: string;
  due_date: string;
  status: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
}

const f = {
  revenue_this_month: 0,
  revenue_last_month: 0,
  gross_profit_this_month: 0,
  gross_profit_last_month: 0,
  ytd_revenue: 0,
  outstanding_receivables: 0,
  overdue_amount: 0,
  expenses_this_month: 0,
  expenses_last_month: 0,
  ytd_expenses: 0,
  ytd_gross_profit: 0,
};
const mockInvoices: Invoice[] = [];
const mockExpenses: Expense[] = [];

const MARGIN_PCT = 0;
const MARGIN_LAST = 0;
const REV_CHANGE = 0;

const INVOICE_TABS = ["all", "overdue", "sent", "paid", "draft"];

const CATEGORY_COLORS: Record<string, string> = {
  Materials: "bg-blue-500",
  Supplies: "bg-purple-500",
  Vehicle: "bg-yellow-500",
  Labor: "bg-green-500",
  Other: "bg-gray-500",
};

export default function FinancialsPage() {
  const [invoiceTab, setInvoiceTab] = useState("all");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const filteredInvoices =
    invoiceTab === "all"
      ? mockInvoices
      : mockInvoices.filter((inv) => inv.status === invoiceTab);

  const totalOutstanding = mockInvoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.amount, 0);

  // Build expense breakdown
  const expenseByCategory = mockExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  const totalExpenses = Object.values(expenseByCategory).reduce((s, v) => s + v, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Financials</h1>
        <p className="text-gray-500 text-sm mt-1">No financials connected yet</p>
      </div>

      <ComingSoonBanner
        tone="integration_required"
        title="Financials not yet wired"
        description="Revenue, profit, and invoice data will appear once you connect QuickBooks, Stripe, or another billing source."
        action={{ label: "Open integrations", href: "/dashboard/integrations" }}
      />


      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          value={`$${f.revenue_this_month.toLocaleString()}`}
          label="Revenue This Month"
          color="green"
          trend={`${REV_CHANGE > 0 ? "+" : ""}${REV_CHANGE}% vs last month`}
          trendDirection={REV_CHANGE >= 0 ? "up" : "down"}
        />
        <KpiCard
          value={`$${totalOutstanding.toLocaleString()}`}
          label="Outstanding Receivables"
          color="yellow"
          trend={`$${f.overdue_amount.toLocaleString()} overdue`}
          trendDirection="down"
        />
        <KpiCard
          value={`$${f.gross_profit_this_month.toLocaleString()}`}
          label="Gross Profit"
          color="blue"
          trend={f.gross_profit_last_month > 0
            ? `+${Math.round(((f.gross_profit_this_month - f.gross_profit_last_month) / f.gross_profit_last_month) * 100)}% vs last month`
            : "No prior month data"}
          trendDirection="up"
        />
        <KpiCard
          value={`${MARGIN_PCT}%`}
          label="Gross Margin"
          color="purple"
          trend={`${MARGIN_PCT > MARGIN_LAST ? "↑" : "↓"} ${MARGIN_LAST}% last month`}
          trendDirection={MARGIN_PCT >= MARGIN_LAST ? "up" : "down"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue vs Expenses bar chart */}
        <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-5">Revenue vs Expenses</h3>
          <div className="space-y-5">
            {[
              {
                label: "This Month Revenue",
                value: f.revenue_this_month,
                max: 60000,
                color: "bg-green-500",
              },
              {
                label: "This Month Expenses",
                value: f.expenses_this_month,
                max: 60000,
                color: "bg-red-500",
              },
              {
                label: "Last Month Revenue",
                value: f.revenue_last_month,
                max: 60000,
                color: "bg-green-800",
              },
              {
                label: "Last Month Expenses",
                value: f.expenses_last_month,
                max: 60000,
                color: "bg-red-900",
              },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-400">{bar.label}</span>
                  <span className="text-white font-medium tabular-nums">
                    ${bar.value.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${bar.color} transition-all`}
                    style={{ width: `${(bar.value / bar.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-gray-500 text-xs mb-1">YTD Revenue</p>
              <p className="text-green-400 font-bold text-lg tabular-nums">
                ${f.ytd_revenue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">YTD Expenses</p>
              <p className="text-red-400 font-bold text-lg tabular-nums">
                ${f.ytd_expenses.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">YTD Profit</p>
              <p className="text-blue-400 font-bold text-lg tabular-nums">
                ${f.ytd_gross_profit.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-5">Expense Breakdown</h3>
          {totalExpenses === 0 ? (
            <EmptyState
              variant="integration_required"
              title="No expenses connected"
              description="Connect accounting or card data to track expense categories here."
              actions={[{ label: "Open integrations", href: "/dashboard/integrations" }]}
              className="py-10"
            />
          ) : (
            <>
              <div className="space-y-3">
                {Object.entries(expenseByCategory).map(([cat, amt]) => {
                  const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{cat}</span>
                        <span className="text-white tabular-nums">${amt.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${CATEGORY_COLORS[cat] ?? "bg-gray-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-gray-600 text-xs mt-0.5">{pct}% of total</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Tracked</span>
                  <span className="text-white font-medium tabular-nums">
                    ${totalExpenses.toLocaleString()}
                  </span>
                </div>
              </div>
              </>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Invoices</h3>
          <button
            onClick={() => setInvoiceModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            + New Invoice
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {INVOICE_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setInvoiceTab(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                invoiceTab === t
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Invoice</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Client</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Amount</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Issued</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Due</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <EmptyState
                      variant="integration_required"
                      title="No invoices yet"
                      description="Connect billing data or create an invoice after accounting is configured."
                      actions={[
                        { label: "Connect billing", href: "/dashboard/integrations" },
                        { label: "Create invoice", onClick: () => setInvoiceModalOpen(true), variant: "secondary" },
                      ]}
                      className="py-10"
                    />
                  </td>
                </tr>
              ) : filteredInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-800 last:border-0 hover:bg-[#1a2230] cursor-pointer">
                  <td className="px-4 py-3 text-blue-400 font-medium">{inv.id}</td>
                  <td className="px-4 py-3 text-gray-300">{inv.client_name}</td>
                  <td className="px-4 py-3 text-white font-medium tabular-nums">
                    ${inv.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{inv.issued_date}</td>
                  <td className="px-4 py-3 text-gray-400">{inv.due_date}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ActionStateModal
        open={invoiceModalOpen}
        kind="integration_required"
        integrationName="QuickBooks or Stripe"
        description="Connect a billing source to create, sync, and send invoices from OttoServ."
        primaryHref="/dashboard/integrations"
        onClose={() => setInvoiceModalOpen(false)}
      />
    </div>
  );
}
