"use client";

import { useState } from "react";
import {
  mockResources,
  mockMonetizationAlerts,
  mockClientPackages,
  mockResourceRequests,
  mockUsageLog,
  type MarketplaceResource,
  type MonetizationAlert,
  type ClientPackage,
  type ResourceRequest,
  type UsageLogEntry,
} from "@/lib/mockData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeBadge(type: MarketplaceResource["type"]) {
  const map = {
    tool: "bg-blue-900/60 text-blue-300 border-blue-700",
    workflow: "bg-purple-900/60 text-purple-300 border-purple-700",
    template: "bg-green-900/60 text-green-300 border-green-700",
    human: "bg-orange-900/60 text-orange-300 border-orange-700",
  };
  const label = { tool: "Tool", workflow: "Workflow", template: "Template", human: "Human" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[type]}`}>
      {label[type]}
    </span>
  );
}

function riskBadge(risk: MarketplaceResource["risk_level"]) {
  const map = {
    low: "bg-emerald-900/40 text-emerald-400 border-emerald-700",
    medium: "bg-yellow-900/40 text-yellow-400 border-yellow-700",
    high: "bg-red-900/40 text-red-400 border-red-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${map[risk]}`}>
      {risk} risk
    </span>
  );
}

function statusDot(status: MarketplaceResource["status"]) {
  const map = {
    available: "bg-emerald-400",
    beta: "bg-yellow-400",
    restricted: "bg-orange-400",
    deprecated: "bg-gray-500",
  };
  const labels = { available: "Available", beta: "Beta", restricted: "Restricted", deprecated: "Deprecated" };
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className={`w-1.5 h-1.5 rounded-full ${map[status]}`} />
      {labels[status]}
    </span>
  );
}

function costLabel(r: MarketplaceResource) {
  if (r.cost_model === "free") return <span className="text-emerald-400 text-xs font-semibold">Free</span>;
  if (r.cost_model === "metered") return <span className="text-blue-300 text-xs">${r.cost_amount}/{r.cost_unit}</span>;
  return <span className="text-gray-300 text-xs">${r.cost_amount}/{r.cost_unit}</span>;
}

function alertTypeBadge(t: MonetizationAlert["alert_type"]) {
  const map = {
    monetization_opportunity: "bg-green-900/50 text-green-300 border-green-700",
    margin_risk: "bg-red-900/50 text-red-300 border-red-700",
    package_candidate: "bg-purple-900/50 text-purple-300 border-purple-700",
  };
  const labels = {
    monetization_opportunity: "Opportunity",
    margin_risk: "Margin Risk",
    package_candidate: "Package Candidate",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[t]}`}>
      {labels[t]}
    </span>
  );
}

function alertStatusBadge(s: MonetizationAlert["status"]) {
  const map = { new: "bg-blue-900/40 text-blue-300", reviewing: "bg-yellow-900/40 text-yellow-300", actioned: "bg-gray-700 text-gray-400" };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${map[s]}`}>{s}</span>;
}

function requestStatusBadge(s: ResourceRequest["status"]) {
  const map = {
    auto_approved: "bg-emerald-900/40 text-emerald-400",
    pending: "bg-yellow-900/40 text-yellow-400",
    approved: "bg-blue-900/40 text-blue-300",
    denied: "bg-red-900/40 text-red-400",
  };
  const labels = { auto_approved: "Auto-Approved", pending: "Pending", approved: "Approved", denied: "Denied" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[s]}`}>{labels[s]}</span>;
}

const ALL_CATEGORIES = ["All", ...Array.from(new Set(mockResources.map((r) => r.category))).sort()];
const ALL_TYPES = ["All", "tool", "workflow", "template", "human"] as const;

// ─── Tab: Browse ──────────────────────────────────────────────────────────────

function BrowseTab() {
  const [category, setCategory] = useState("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  const filtered = mockResources.filter((r) => {
    if (category !== "All" && r.category !== category) return false;
    if (typeFilter !== "All" && r.type !== typeFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search resources…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {ALL_TYPES.map((t) => <option key={t} value={t}>{t === "All" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      <p className="text-gray-500 text-sm">{filtered.length} resource{filtered.length !== 1 ? "s" : ""}</p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((r) => (
          <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm leading-snug truncate">{r.name}</h3>
                <p className="text-gray-500 text-xs mt-0.5">{r.category}</p>
              </div>
              {typeBadge(r.type)}
            </div>

            <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{r.description}</p>

            <div className="flex items-center gap-2 flex-wrap">
              {riskBadge(r.risk_level)}
              {statusDot(r.status)}
            </div>

            <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-800">
              <div className="flex flex-col gap-0.5">
                <span className="text-gray-500 text-xs">Cost</span>
                {costLabel(r)}
              </div>
              <a
                href="/dashboard/marketplace/resource"
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  r.status === "restricted" || r.status === "deprecated"
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : r.cost_model === "free" || r.approved_agents.length > 0
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                }`}
              >
                {r.status === "restricted" ? "Restricted" : r.cost_model === "free" ? "Use" : "Request"}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Packages ────────────────────────────────────────────────────────────

function PackagesTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{mockClientPackages.length} packages</p>
        <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors">
          + Create Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockClientPackages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </div>
  );
}

function PackageCard({ pkg }: { pkg: ClientPackage }) {
  const statusColor = pkg.status === "active" ? "text-emerald-400" : pkg.status === "draft" ? "text-yellow-400" : "text-gray-500";
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-white font-semibold">{pkg.name}</h3>
          <span className={`text-xs font-medium ${statusColor}`}>{pkg.status}</span>
        </div>
        <div className="text-right flex-shrink-0">
          {pkg.setup_fee > 0 && <p className="text-gray-400 text-xs">${pkg.setup_fee} setup</p>}
          <p className="text-white font-bold">${pkg.monthly_fee}<span className="text-gray-500 text-xs font-normal">/mo</span></p>
        </div>
      </div>

      <p className="text-gray-400 text-sm leading-relaxed">{pkg.description}</p>

      <div>
        <p className="text-gray-500 text-xs mb-2">Included resources</p>
        <ul className="space-y-1">
          {pkg.included_resources.map((r) => (
            <li key={r} className="flex items-center gap-2 text-xs text-gray-300">
              <span className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
        <span className="text-gray-500 text-xs">{pkg.times_sold} clients sold</span>
        <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Edit Package →</button>
      </div>
    </div>
  );
}

// ─── Tab: Requests ────────────────────────────────────────────────────────────

function RequestsTab() {
  const pending = mockResourceRequests.filter((r) => r.status === "pending");
  const history = mockResourceRequests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      {/* Pending */}
      <div>
        <h3 className="text-white font-semibold mb-3">Pending Approval ({pending.length})</h3>
        {pending.length === 0 ? (
          <p className="text-gray-500 text-sm">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((req) => (
              <div key={req.id} className="bg-gray-900 border border-yellow-900/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">{req.resource_name}</span>
                    {requestStatusBadge(req.status)}
                  </div>
                  <p className="text-gray-400 text-xs">Requested by: {req.requested_by} · {new Date(req.requested_at).toLocaleString()}</p>
                  <p className="text-gray-300 text-sm mt-1">{req.reason}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium transition-colors">Approve</button>
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-900 text-red-300 font-medium transition-colors">Deny</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <h3 className="text-white font-semibold mb-3">Request History</h3>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-gray-500 font-medium text-xs">Resource</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-xs">Requested By</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-xs">Status</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-xs">Resolved</th>
              </tr>
            </thead>
            <tbody>
              {history.map((req) => (
                <tr key={req.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-gray-200">{req.resource_name}</td>
                  <td className="px-4 py-3 text-gray-400">{req.requested_by}</td>
                  <td className="px-4 py-3">{requestStatusBadge(req.status)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {req.resolved_at ? new Date(req.resolved_at).toLocaleDateString() : "—"}
                    {req.resolved_by && <span className="block text-gray-600">{req.resolved_by}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Usage ───────────────────────────────────────────────────────────────

function UsageTab() {
  const totalCost = mockUsageLog.reduce((s, e) => s + e.cost, 0);
  const successCount = mockUsageLog.filter((e) => e.success).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Runs", value: mockUsageLog.length.toString() },
          { label: "Success Rate", value: `${Math.round((successCount / mockUsageLog.length) * 100)}%` },
          { label: "Total Cost", value: `$${totalCost.toFixed(2)}` },
          { label: "Avg Cost/Run", value: `$${(totalCost / mockUsageLog.length).toFixed(3)}` },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs">{s.label}</p>
            <p className="text-white font-bold text-xl mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Log */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-4 py-3 text-gray-500 font-medium text-xs">Agent</th>
              <th className="px-4 py-3 text-gray-500 font-medium text-xs">Resource</th>
              <th className="px-4 py-3 text-gray-500 font-medium text-xs hidden md:table-cell">Task</th>
              <th className="px-4 py-3 text-gray-500 font-medium text-xs">Cost</th>
              <th className="px-4 py-3 text-gray-500 font-medium text-xs">Result</th>
              <th className="px-4 py-3 text-gray-500 font-medium text-xs hidden lg:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {mockUsageLog.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
                <td className="px-4 py-3 text-gray-300 text-xs">{entry.agent}</td>
                <td className="px-4 py-3 text-gray-200 text-xs">{entry.resource_name}</td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell max-w-xs">
                  <span className="line-clamp-1">{entry.task}</span>
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs">${entry.cost.toFixed(2)}</td>
                <td className="px-4 py-3">
                  {entry.success
                    ? <span className="text-xs text-emerald-400">✓ Success</span>
                    : <span className="text-xs text-red-400">✗ Failed</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                  {new Date(entry.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Monetization ────────────────────────────────────────────────────────

function MonetizationTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{mockMonetizationAlerts.length} signals detected</p>
        <button className="bg-purple-700 hover:bg-purple-600 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors">
          Scan for Opportunities
        </button>
      </div>

      <div className="space-y-4">
        {mockMonetizationAlerts.map((alert) => (
          <div key={alert.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {alertTypeBadge(alert.alert_type)}
                <span className="text-white font-semibold text-sm">{alert.resource_name}</span>
              </div>
              <div className="flex items-center gap-2">
                {alertStatusBadge(alert.status)}
                <span className="text-gray-500 text-xs">{alert.created_at}</span>
              </div>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">{alert.reason}</p>

            {alert.suggested_price && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">Suggested price:</span>
                <span className="text-emerald-400 font-semibold text-sm">{alert.suggested_price}</span>
              </div>
            )}

            <div className="bg-gray-800/60 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Recommended action</p>
              <p className="text-gray-200 text-sm">{alert.recommended_action}</p>
            </div>

            <div className="flex gap-2">
              <button className="text-xs px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-medium transition-colors">
                Take Action
              </button>
              <button className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Spending ────────────────────────────────────────────────────────────

function SpendingTab() {
  const totalSpend = mockUsageLog.reduce((s, e) => s + e.cost, 0);

  const byAgent = mockUsageLog.reduce<Record<string, number>>((acc, e) => {
    acc[e.agent] = (acc[e.agent] || 0) + e.cost;
    return acc;
  }, {});

  const byType = mockUsageLog.reduce<Record<string, number>>((acc, e) => {
    const resource = mockResources.find((r) => r.id === e.resource_id);
    const type = resource?.type || "unknown";
    acc[type] = (acc[type] || 0) + e.cost;
    return acc;
  }, {});

  const unbillable = mockUsageLog.filter((e) => {
    const r = mockResources.find((res) => res.id === e.resource_id);
    return r?.monetization_status === "unbillable";
  });
  const unbillableCost = unbillable.reduce((s, e) => s + e.cost, 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-500 text-xs">Total Marketplace Spend</p>
          <p className="text-white font-bold text-2xl mt-1">${totalSpend.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">This month</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-500 text-xs">Billable Cost</p>
          <p className="text-emerald-400 font-bold text-2xl mt-1">${(totalSpend - unbillableCost).toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">Recoverable from clients</p>
        </div>
        <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-5">
          <p className="text-gray-500 text-xs">Unbillable Cost</p>
          <p className="text-red-400 font-bold text-2xl mt-1">${unbillableCost.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">Cannot be passed to clients</p>
        </div>
      </div>

      {/* Unbillable warnings */}
      {unbillable.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 space-y-2">
          <p className="text-red-400 text-sm font-semibold">Unbillable Cost Warnings</p>
          {unbillable.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-300">{e.resource_name}</span>
              <span className="text-red-400">${e.cost.toFixed(2)}</span>
            </div>
          ))}
          <p className="text-gray-500 text-xs pt-1">Consider packaging these resources or adjusting pricing to recover costs.</p>
        </div>
      )}

      {/* Spend by agent */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Spend by Agent</h3>
        <div className="space-y-3">
          {Object.entries(byAgent).sort((a, b) => b[1] - a[1]).map(([agent, cost]) => (
            <div key={agent} className="flex items-center gap-3">
              <span className="text-gray-300 text-sm w-48 truncate">{agent}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(cost / totalSpend) * 100}%` }}
                />
              </div>
              <span className="text-gray-400 text-sm w-16 text-right">${cost.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Spend by type */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Spend by Resource Type</h3>
        <div className="space-y-3">
          {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, cost]) => (
            <div key={type} className="flex items-center gap-3">
              <span className="text-gray-300 text-sm w-32 capitalize">{type}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${(cost / totalSpend) * 100}%` }}
                />
              </div>
              <span className="text-gray-400 text-sm w-16 text-right">${cost.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ["Browse", "Packages", "Requests", "Usage", "Monetization", "Spending"] as const;
type Tab = typeof TABS[number];

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<Tab>("Browse");

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Agent Resource Marketplace</h1>
            <p className="text-gray-400 text-sm mt-1">Browse, request, and manage tools, workflows, templates, and human services for your agents.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {mockResources.filter((r) => r.status === "available").length} resources available
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1 w-fit flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "Browse" && <BrowseTab />}
        {activeTab === "Packages" && <PackagesTab />}
        {activeTab === "Requests" && <RequestsTab />}
        {activeTab === "Usage" && <UsageTab />}
        {activeTab === "Monetization" && <MonetizationTab />}
        {activeTab === "Spending" && <SpendingTab />}
      </div>
    </div>
  );
}
