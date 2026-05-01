"use client";

import { useState } from "react";
import Link from "next/link";
import { mockResources, mockUsageLog, type MarketplaceResource } from "@/lib/mockData";

// Show the first resource as the demo detail — in production this would use searchParams/id
const DEMO_RESOURCE = mockResources[0];

function typeBadge(type: MarketplaceResource["type"]) {
  const map = {
    tool: "bg-blue-900/60 text-blue-300 border-blue-700",
    workflow: "bg-purple-900/60 text-purple-300 border-purple-700",
    template: "bg-green-900/60 text-green-300 border-green-700",
    human: "bg-orange-900/60 text-orange-300 border-orange-700",
  };
  const label = { tool: "Tool", workflow: "Workflow", template: "Template", human: "Human" };
  return (
    <span className={`text-sm px-3 py-1 rounded-full border font-medium ${map[type]}`}>
      {label[type]}
    </span>
  );
}

function riskBadge(risk: MarketplaceResource["risk_level"]) {
  const map = {
    low: "bg-emerald-900/40 text-emerald-300 border-emerald-700",
    medium: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
    high: "bg-red-900/40 text-red-300 border-red-700",
  };
  const desc = {
    low: "Low risk — auto-approval eligible for trusted agents.",
    medium: "Medium risk — requires human approval before first use.",
    high: "High risk — restricted to owner-level approval only.",
  };
  return (
    <div className={`rounded-xl border p-4 ${map[risk]}`}>
      <p className="font-semibold text-sm capitalize">{risk} Risk</p>
      <p className="text-xs opacity-80 mt-1">{desc[risk]}</p>
    </div>
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
    <span className="flex items-center gap-1.5 text-sm text-gray-300">
      <span className={`w-2 h-2 rounded-full ${map[status]}`} />
      {labels[status]}
    </span>
  );
}

function costBreakdown(r: MarketplaceResource) {
  if (r.cost_model === "free") {
    return (
      <div className="space-y-1">
        <p className="text-emerald-400 font-bold text-xl">Free</p>
        <p className="text-gray-500 text-sm">No usage charges.</p>
      </div>
    );
  }
  if (r.cost_model === "metered") {
    return (
      <div className="space-y-2">
        <p className="text-white font-bold text-xl">${r.cost_amount} <span className="text-gray-400 text-sm font-normal">{r.cost_unit}</span></p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Avg cost/run (this account)</p>
            <p className="text-gray-200">${r.avg_cost_per_run.toFixed(3)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Monthly runs</p>
            <p className="text-gray-200">{r.monthly_uses}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Est. monthly cost</p>
            <p className="text-gray-200">${(r.avg_cost_per_run * r.monthly_uses).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Billing</p>
            <p className="text-gray-200">Per use</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-white font-bold text-xl">${r.cost_amount} <span className="text-gray-400 text-sm font-normal">{r.cost_unit}</span></p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Billing cycle</p>
          <p className="text-gray-200">Flat rate</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Monthly runs</p>
          <p className="text-gray-200">{r.monthly_uses}</p>
        </div>
      </div>
    </div>
  );
}

function monetizationStatusBadge(s: MarketplaceResource["monetization_status"]) {
  const map = {
    unbillable: { color: "bg-red-900/40 text-red-400 border-red-800", label: "Unbillable", desc: "Cost cannot be passed to clients." },
    billable: { color: "bg-emerald-900/40 text-emerald-400 border-emerald-800", label: "Billable", desc: "Cost can be included in client invoices." },
    packaged: { color: "bg-purple-900/40 text-purple-400 border-purple-800", label: "Packaged", desc: "Included in one or more client packages." },
  };
  const { color, label, desc } = map[s];
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs opacity-80 mt-1">{desc}</p>
    </div>
  );
}

export default function ResourceDetailPage() {
  const r = DEMO_RESOURCE;
  const [requested, setRequested] = useState(false);

  const usageEntries = mockUsageLog.filter((e) => e.resource_id === r.id);
  const successRate = usageEntries.length > 0
    ? Math.round((usageEntries.filter((e) => e.success).length / usageEntries.length) * 100)
    : r.success_rate;

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/marketplace" className="hover:text-gray-300 transition-colors">Marketplace</Link>
          <span>/</span>
          <span className="text-gray-300">{r.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{r.name}</h1>
              {typeBadge(r.type)}
            </div>
            <p className="text-gray-400">{r.description}</p>
            <div className="flex items-center gap-4 flex-wrap">
              {statusDot(r.status)}
              <span className="text-gray-500 text-sm">{r.category}</span>
              <span className="text-gray-500 text-sm">{r.success_rate}% success rate</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => setRequested(true)}
              disabled={requested}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                requested
                  ? "bg-emerald-800 text-emerald-300 cursor-default"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {requested ? "✓ Request Submitted" : "Request Access"}
            </button>
            <button className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors">
              Create Package from This
            </button>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-6">

            {/* What it does */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h2 className="text-white font-semibold">What It Does</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{r.what_it_does}</p>
            </div>

            {/* Best for / Not for */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-emerald-400 font-semibold text-sm mb-3">Best For</h3>
                <ul className="space-y-2">
                  {r.best_for.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-red-400 font-semibold text-sm mb-3">Not For</h3>
                <ul className="space-y-2">
                  {r.not_for.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h2 className="text-white font-semibold">Setup Instructions</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{r.setup_instructions}</p>
            </div>

            {/* Approved Agents */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h2 className="text-white font-semibold">Approved Agents</h2>
              {r.approved_agents.length === 0 ? (
                <p className="text-gray-500 text-sm">No agents currently approved. Requires human request.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {r.approved_agents.map((agent) => (
                    <span key={agent} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-full">
                      {agent}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Usage */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h2 className="text-white font-semibold">Recent Usage</h2>
              {usageEntries.length === 0 ? (
                <p className="text-gray-500 text-sm">No usage recorded for this resource yet.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-left">
                        <th className="px-4 py-2.5 text-gray-500 font-medium text-xs">Agent</th>
                        <th className="px-4 py-2.5 text-gray-500 font-medium text-xs">Task</th>
                        <th className="px-4 py-2.5 text-gray-500 font-medium text-xs">Cost</th>
                        <th className="px-4 py-2.5 text-gray-500 font-medium text-xs">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageEntries.map((e) => (
                        <tr key={e.id} className="border-b border-gray-800 last:border-0">
                          <td className="px-4 py-2.5 text-gray-300 text-xs">{e.agent}</td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs max-w-xs">
                            <span className="line-clamp-1">{e.task}</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-300 text-xs">${e.cost.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-xs">
                            {e.success
                              ? <span className="text-emerald-400">✓</span>
                              : <span className="text-red-400">✗</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-4">

            {/* Cost Breakdown */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm">Cost Breakdown</h3>
              {costBreakdown(r)}
            </div>

            {/* Usage Stats */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm">Usage Stats</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 text-xs">Monthly runs</p>
                  <p className="text-white font-semibold">{r.monthly_uses}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Success rate</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${successRate}%` }} />
                    </div>
                    <span className="text-white text-sm font-medium">{successRate}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Avg cost/run</p>
                  <p className="text-white font-semibold">${r.avg_cost_per_run.toFixed(3)}</p>
                </div>
              </div>
            </div>

            {/* Risk Level */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-2">Risk Level</h3>
              {riskBadge(r.risk_level)}
            </div>

            {/* Monetization Status */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-2">Monetization Status</h3>
              {monetizationStatusBadge(r.monetization_status)}
            </div>

            {/* Quick actions */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <h3 className="text-white font-semibold text-sm">Quick Actions</h3>
              <button
                onClick={() => setRequested(true)}
                disabled={requested}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  requested ? "bg-emerald-800 text-emerald-300 cursor-default" : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {requested ? "✓ Requested" : "Request Access"}
              </button>
              <button className="w-full py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors">
                Create Package from This
              </button>
              <Link
                href="/dashboard/marketplace"
                className="block w-full py-2 rounded-lg text-sm font-medium text-center text-gray-400 hover:text-gray-200 transition-colors"
              >
                ← Back to Marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
