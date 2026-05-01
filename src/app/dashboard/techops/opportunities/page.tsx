"use client";

import { useState } from "react";
import Link from "next/link";
import {
  mockTechOpsOpportunities,
  OPPORTUNITY_TYPES,
  TechOpsOpportunity,
} from "@/lib/mockData";

const STATUS_LABELS: Record<TechOpsOpportunity["status"], string> = {
  new: "New",
  reviewing: "Reviewing",
  approved: "Approved",
  response_drafted: "Response Drafted",
  won: "Won",
};

const STATUS_COLORS: Record<TechOpsOpportunity["status"], string> = {
  new: "bg-gray-800 text-gray-300 border-gray-700",
  reviewing: "bg-blue-900/40 text-blue-400 border-blue-800",
  approved: "bg-green-900/40 text-green-400 border-green-800",
  response_drafted: "bg-purple-900/40 text-purple-400 border-purple-800",
  won: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
};

const ACTION_LABELS: Record<TechOpsOpportunity["recommended_action"], string> = {
  pursue: "Pursue",
  request_info: "Request Info",
  ignore: "Ignore",
  human_review: "Human Review",
};

const ACTION_COLORS: Record<TechOpsOpportunity["recommended_action"], string> = {
  pursue: "bg-green-900/40 text-green-400 border-green-800",
  request_info: "bg-blue-900/40 text-blue-400 border-blue-800",
  ignore: "bg-gray-800 text-gray-400 border-gray-700",
  human_review: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
};

const TYPE_LABELS: Record<string, string> = {
  remote_it: "Remote IT",
  computer_repair: "Computer Repair",
  msp_overflow: "MSP Overflow",
  smart_home: "Smart Home",
  networking: "Networking",
  wifi_install: "Wi-Fi Install",
  printer: "Printer",
  cctv: "CCTV",
  access_control: "Access Control",
  av_conference: "AV / Conference",
  low_voltage: "Low Voltage",
  field_dispatch: "Field Dispatch",
  pm_tech: "PM Tech",
  vendor_program: "Vendor Program",
};

function scoreColor(score: number) {
  if (score >= 7) return "text-green-400";
  if (score >= 5) return "text-yellow-400";
  return "text-red-400";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  const barColor =
    value >= 7 ? "bg-green-500" : value >= 5 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-400 text-xs">{label}</span>
        <span className={`text-xs font-bold ${scoreColor(value)}`}>{value}/10</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const STATUS_ALL = "all";
const ACTION_ALL = "all";
const TYPE_ALL = "all";

export default function OpportunitiesPage() {
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL);
  const [typeFilter, setTypeFilter] = useState<string>(TYPE_ALL);
  const [actionFilter, setActionFilter] = useState<string>(ACTION_ALL);
  const [minScore, setMinScore] = useState<number>(0);
  const [selected, setSelected] = useState<TechOpsOpportunity | null>(null);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [jobText, setJobText] = useState("");
  const [scoring, setScoring] = useState(false);
  const [mockScoreResult, setMockScoreResult] = useState<null | Record<string, number>>(null);

  const data = mockTechOpsOpportunities;

  const filtered = data.filter((o) => {
    if (statusFilter !== STATUS_ALL && o.status !== statusFilter) return false;
    if (typeFilter !== TYPE_ALL && o.type !== typeFilter) return false;
    if (actionFilter !== ACTION_ALL && o.recommended_action !== actionFilter) return false;
    if (o.scores.overall < minScore) return false;
    return true;
  });

  const totalCount = data.length;
  const highFitCount = data.filter((o) => o.scores.overall >= 7).length;
  const pendingCount = data.filter((o) => o.status === "new" || o.status === "reviewing").length;
  const draftedCount = data.filter((o) => o.status === "response_drafted").length;
  const wonCount = data.filter((o) => o.status === "won").length;

  function handleScoreIt() {
    if (!jobText.trim()) return;
    setScoring(true);
    setTimeout(() => {
      setMockScoreResult({ fit: 7, margin: 6, risk: 4, urgency: 5, overall: 6 });
      setScoring(false);
    }, 1200);
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/techops"
          className="text-gray-500 hover:text-white text-sm transition-colors"
        >
          ← Back to TechOps
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">TechOps Opportunities</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} of {totalCount} opportunities
          </p>
        </div>
        <button
          onClick={() => { setAnalyzeOpen(true); setMockScoreResult(null); setJobText(""); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Analyze Job Description
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total", value: totalCount, color: "text-white" },
          { label: "High-Fit (≥7)", value: highFitCount, color: "text-green-400" },
          { label: "Pending Review", value: pendingCount, color: "text-yellow-400" },
          { label: "Response Drafted", value: draftedCount, color: "text-purple-400" },
          { label: "Won This Month", value: wonCount, color: "text-emerald-400" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-[#111827] border border-gray-800 rounded-xl p-4"
          >
            <p className="text-gray-500 text-xs mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#111827] border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={STATUS_ALL}>All Statuses</option>
          {(["new", "reviewing", "approved", "response_drafted", "won"] as const).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[#111827] border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={TYPE_ALL}>All Types</option>
          {OPPORTUNITY_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-[#111827] border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={ACTION_ALL}>All Actions</option>
          {(["pursue", "request_info", "ignore", "human_review"] as const).map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <label className="text-gray-500 text-xs">Min Score</label>
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="bg-[#111827] border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {[0, 3, 5, 7, 9].map((n) => (
              <option key={n} value={n}>{n === 0 ? "Any" : `${n}+`}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Opportunity Cards */}
      {filtered.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-10 text-center text-gray-500">
          No opportunities match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((opp) => (
            <button
              key={opp.id}
              onClick={() => setSelected(opp)}
              className="bg-[#111827] border border-gray-800 hover:border-gray-600 rounded-xl p-5 text-left transition-colors cursor-pointer w-full"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-sm leading-tight truncate">
                    {opp.company}
                  </h3>
                  <p className="text-gray-500 text-xs mt-0.5">{opp.source}</p>
                </div>
                <span
                  className={`text-4xl font-black leading-none flex-shrink-0 ${scoreColor(opp.scores.overall)}`}
                >
                  {opp.scores.overall}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
                  {TYPE_LABELS[opp.type] ?? opp.type}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[opp.status]}`}
                >
                  {STATUS_LABELS[opp.status]}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${ACTION_COLORS[opp.recommended_action]}`}
                >
                  {ACTION_LABELS[opp.recommended_action]}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <span>📍 {opp.location}</span>
                <span className="text-gray-600">·</span>
                <span
                  className={opp.remote_possible ? "text-blue-400" : "text-gray-500"}
                >
                  {opp.remote_possible ? "Remote OK" : "On-site"}
                </span>
              </div>

              <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
                {opp.scope_summary}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelected(null)}
          />
          <div className="relative w-full max-w-xl h-full bg-[#111827] border-l border-gray-800 overflow-y-auto">
            <div className="sticky top-0 bg-[#111827] border-b border-gray-800 px-6 py-4 flex items-start justify-between z-10">
              <div className="min-w-0 pr-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[selected.status]}`}
                  >
                    {STATUS_LABELS[selected.status]}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
                    {TYPE_LABELS[selected.type] ?? selected.type}
                  </span>
                </div>
                <h2 className="text-white font-bold text-lg truncate">{selected.company}</h2>
                <p className="text-gray-500 text-xs">
                  {selected.location} · {selected.remote_possible ? "Remote OK" : "On-site"} · via {selected.source}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-white text-2xl leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Scope */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-2">Scope Summary</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{selected.scope_summary}</p>
              </div>

              {/* Scores */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400 text-xs font-medium uppercase">Score Breakdown</h3>
                  <span className={`text-3xl font-black ${scoreColor(selected.scores.overall)}`}>
                    {selected.scores.overall}
                    <span className="text-gray-600 text-sm font-normal">/10</span>
                  </span>
                </div>
                <div className="space-y-3">
                  <ScoreBar label="Fit" value={selected.scores.fit} />
                  <ScoreBar label="Margin" value={selected.scores.margin} />
                  <ScoreBar label="Risk (lower = safer)" value={selected.scores.risk} />
                  <ScoreBar label="Urgency" value={selected.scores.urgency} />
                </div>
              </div>

              {/* Recommended Action */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-2">
                  Recommended Action
                </h3>
                <span
                  className={`inline-block text-sm px-3 py-1 rounded-full border font-medium ${ACTION_COLORS[selected.recommended_action]}`}
                >
                  {ACTION_LABELS[selected.recommended_action]}
                </span>
              </div>

              {/* Skills & Tools */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                  Skills Required
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selected.skills_required.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 border border-blue-800 text-blue-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Tools Needed</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selected.tools_required.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Drafted Response */}
              {selected.drafted_response ? (
                <div className="bg-[#0f1117] border border-purple-900/40 rounded-xl p-4">
                  <h3 className="text-purple-400 text-xs font-medium uppercase mb-3">
                    Drafted Response
                  </h3>
                  <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                    {selected.drafted_response}
                  </pre>
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-700/40 text-green-400 text-sm font-medium rounded-lg transition-colors">
                      Approve to Send
                    </button>
                    <button className="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-700/40 text-purple-400 text-sm font-medium rounded-lg transition-colors">
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Response</h3>
                  <p className="text-gray-500 text-sm mb-3">No response drafted yet.</p>
                  <button className="w-full py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-700/40 text-purple-400 text-sm font-medium rounded-lg transition-colors">
                    Generate Response
                  </button>
                </div>
              )}

              {/* Meta */}
              <p className="text-gray-600 text-xs text-right">Created {selected.created_at}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analyze Job Description Modal */}
      {analyzeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setAnalyzeOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">Analyze Job Description</h2>
              <button
                onClick={() => setAnalyzeOpen(false)}
                className="text-gray-500 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Paste a job posting or opportunity description and Jarvis will score it for fit,
              margin, risk, and urgency.
            </p>
            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Paste job description here…"
              rows={8}
              className="w-full bg-[#0f1117] border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none mb-4"
            />

            {mockScoreResult && (
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4 mb-4 space-y-3">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-2">Score Results</h3>
                {Object.entries(mockScoreResult).map(([k, v]) => (
                  <ScoreBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v} />
                ))}
              </div>
            )}

            <button
              onClick={handleScoreIt}
              disabled={scoring || !jobText.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/40 disabled:text-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {scoring ? "Scoring…" : "Score It"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
