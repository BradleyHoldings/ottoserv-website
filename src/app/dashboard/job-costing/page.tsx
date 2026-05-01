"use client";

import { useState } from "react";
import KpiCard from "@/components/dashboard/KpiCard";
import { mockJobCosts, JobCost } from "@/lib/mockData";

function marginColor(margin: number): string {
  if (margin >= 20) return "text-green-400";
  if (margin >= 10) return "text-yellow-400";
  return "text-red-400";
}

function marginBg(margin: number): string {
  if (margin >= 20) return "bg-green-900/30 border-green-800";
  if (margin >= 10) return "bg-yellow-900/30 border-yellow-800";
  return "bg-red-900/30 border-red-800";
}

function riskLabel(margin: number): string {
  if (margin >= 20) return "Healthy";
  if (margin >= 10) return "Watch";
  return "At Risk";
}

function calcMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return Math.round(((revenue - cost) / revenue) * 100);
}

export default function JobCostingPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalEstRevenue = mockJobCosts.reduce((s, j) => s + j.estimated_revenue, 0);
  const totalEstCost = mockJobCosts.reduce((s, j) => s + j.estimated_cost, 0);
  const totalActualCost = mockJobCosts.reduce((s, j) => s + j.actual_cost, 0);
  const totalEstProfit = totalEstRevenue - totalEstCost;
  const totalActualProfit = totalEstRevenue - totalActualCost;
  const avgMargin = Math.round((totalEstProfit / totalEstRevenue) * 100);
  const atRisk = mockJobCosts.filter((j) => calcMargin(j.estimated_revenue, j.actual_cost) < 10).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Job Costing</h1>
        <p className="text-gray-500 text-sm mt-1">Estimated vs. actual cost tracking across all active projects</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard value={`$${totalEstProfit.toLocaleString()}`} label="Total Est. Profit" color="green" />
        <KpiCard value={`$${totalActualProfit.toLocaleString()}`} label="Actual Profit (to date)" color="blue" />
        <KpiCard value={`${avgMargin}%`} label="Avg Est. Margin" color="purple" />
        <KpiCard value={atRisk} label="Projects At Risk" color={atRisk > 0 ? "red" : "green"} trend={atRisk > 0 ? "Below 10% margin" : "All healthy"} trendDirection={atRisk > 0 ? "down" : "up"} />
      </div>

      {/* Projects Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Project Profitability</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 font-medium px-6 py-3">Project</th>
              <th className="text-right text-gray-500 font-medium px-4 py-3">Est. Revenue</th>
              <th className="text-right text-gray-500 font-medium px-4 py-3">Est. Cost</th>
              <th className="text-right text-gray-500 font-medium px-4 py-3">Actual Cost</th>
              <th className="text-right text-gray-500 font-medium px-4 py-3">Variance</th>
              <th className="text-right text-gray-500 font-medium px-4 py-3">Margin %</th>
              <th className="text-center text-gray-500 font-medium px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody>
            {mockJobCosts.map((job) => {
              const variance = job.estimated_cost - job.actual_cost;
              const margin = calcMargin(job.estimated_revenue, job.estimated_cost);
              const isExpanded = expanded === job.project_id;

              return (
                <>
                  <tr
                    key={job.project_id}
                    onClick={() => setExpanded(isExpanded ? null : job.project_id)}
                    className="border-b border-gray-800 hover:bg-gray-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{job.project_name}</p>
                      <p className="text-gray-500 text-xs">{job.client}</p>
                    </td>
                    <td className="px-4 py-4 text-right text-green-400 font-medium">
                      ${job.estimated_revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-300">
                      ${job.estimated_cost.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-300">
                      ${job.actual_cost.toLocaleString()}
                    </td>
                    <td className={`px-4 py-4 text-right font-medium ${variance >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {variance >= 0 ? "+" : ""}${variance.toLocaleString()}
                    </td>
                    <td className={`px-4 py-4 text-right font-bold ${marginColor(margin)}`}>
                      {margin}%
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${marginBg(margin)} ${marginColor(margin)}`}>
                        {riskLabel(margin)}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${job.project_id}-detail`} className="border-b border-gray-800 bg-[#0f1117]">
                      <td colSpan={7} className="px-6 py-4">
                        <p className="text-gray-400 text-xs font-medium uppercase mb-3">Cost Breakdown by Category</p>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                          {job.categories.map((cat) => {
                            const catVariance = cat.estimated - cat.actual;
                            const pct = cat.estimated > 0 ? Math.round((cat.actual / cat.estimated) * 100) : 0;
                            return (
                              <div key={cat.category} className="bg-[#111827] border border-gray-800 rounded-lg p-3">
                                <p className="text-gray-400 text-xs mb-2">{cat.category}</p>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-500">Est</span>
                                  <span className="text-gray-300">${cat.estimated.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs mb-2">
                                  <span className="text-gray-500">Actual</span>
                                  <span className={cat.actual > cat.estimated ? "text-red-400 font-medium" : "text-white"}>
                                    ${cat.actual.toLocaleString()}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-1 mb-1">
                                  <div
                                    className={`h-1 rounded-full ${pct > 100 ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-blue-500"}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <p className={`text-xs font-medium ${catVariance >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {catVariance >= 0 ? "+" : ""}${catVariance.toLocaleString()} variance
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-6 text-xs">
                          <div>
                            <span className="text-gray-500">Cost to Complete (est): </span>
                            <span className="text-white font-medium">${(job.estimated_cost - job.actual_cost).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Forecast at Completion: </span>
                            <span className={`font-medium ${job.actual_cost <= job.estimated_cost ? "text-green-400" : "text-red-400"}`}>
                              ${job.estimated_cost.toLocaleString()} (on budget)
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
