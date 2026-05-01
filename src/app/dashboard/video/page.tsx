"use client";

import { useState } from "react";
import Link from "next/link";
import {
  mockVideoRequests,
  mockVideoTemplates,
  mockBrandProfile,
} from "@/lib/mockData";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:            { label: "Draft",            color: "bg-gray-700 text-gray-300" },
  generating:       { label: "Generating",       color: "bg-yellow-500/20 text-yellow-400" },
  pending_approval: { label: "Pending Approval", color: "bg-orange-500/20 text-orange-400" },
  approved:         { label: "Approved",         color: "bg-green-500/20 text-green-400" },
  published:        { label: "Published",        color: "bg-blue-500/20 text-blue-400" },
};

const QA_CONFIG: Record<string, { label: string; color: string }> = {
  pass:    { label: "QA Pass",    color: "text-green-400" },
  fail:    { label: "QA Fail",    color: "text-red-400" },
  pending: { label: "QA Pending", color: "text-gray-500" },
};

function AspectBadge({ ratio }: { ratio: string }) {
  return (
    <span className="text-xs font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">
      {ratio}
    </span>
  );
}

function AspectVisual({ ratio }: { ratio: string }) {
  if (ratio === "9:16") {
    return (
      <div className="flex items-center justify-center w-8 h-14 rounded bg-gray-800 border border-gray-700 flex-shrink-0">
        <span className="text-gray-500 text-[8px] leading-tight text-center">9:16</span>
      </div>
    );
  }
  if (ratio === "1:1") {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded bg-gray-800 border border-gray-700 flex-shrink-0">
        <span className="text-gray-500 text-[8px]">1:1</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-14 h-8 rounded bg-gray-800 border border-gray-700 flex-shrink-0">
      <span className="text-gray-500 text-[8px]">16:9</span>
    </div>
  );
}

export default function VideoPage() {
  const [approvalActions, setApprovalActions] = useState<Record<string, string>>({});

  const total           = mockVideoRequests.length;
  const generating      = mockVideoRequests.filter((r) => r.status === "generating").length;
  const pendingApproval = mockVideoRequests.filter((r) => r.status === "pending_approval").length;
  const approved        = mockVideoRequests.filter((r) => r.status === "approved").length;
  const published       = mockVideoRequests.filter((r) => r.status === "published").length;

  const approvalQueue = mockVideoRequests.filter((r) => r.status === "pending_approval");

  const handleApprovalAction = (id: string, action: string) => {
    setApprovalActions((prev) => ({ ...prev, [id]: action }));
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">🎬 Video Studio</h1>
          <p className="text-gray-400 text-sm mt-1">
            AI-generated video requests, approvals, and publishing pipeline
          </p>
        </div>
        <Link
          href="/dashboard/video/create"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Video Request
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Total Requests",   value: total,           color: "text-white" },
          { label: "Generating",       value: generating,      color: "text-yellow-400" },
          { label: "Pending Approval", value: pendingApproval, color: "text-orange-400" },
          { label: "Approved",         value: approved,        color: "text-green-400" },
          { label: "Published",        value: published,       color: "text-blue-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#1a1f2e] border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">{kpi.label}</p>
            <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Template Gallery + Brand Profile */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Template Gallery */}
        <div className="xl:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">Template Gallery</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {mockVideoTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-[#1a1f2e] border border-gray-800 rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <AspectVisual ratio={tpl.aspect_ratio} />
                  <div>
                    <p className="text-white font-medium text-sm">{tpl.name}</p>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                      {tpl.category}
                    </span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed flex-1">{tpl.description}</p>
                <div className="flex items-center justify-between">
                  <AspectBadge ratio={tpl.aspect_ratio} />
                  <Link
                    href={`/dashboard/video/create?template=${tpl.id}`}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Use Template →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Profile */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Brand Profile</h2>
          <div className="bg-[#1a1f2e] border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-base">O</span>
              </div>
              <div>
                <p className="text-white font-semibold">{mockBrandProfile.name}</p>
                <p className="text-gray-500 text-xs">
                  {mockBrandProfile.font} · {mockBrandProfile.tone}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Colors</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border border-gray-700"
                    style={{ backgroundColor: mockBrandProfile.primary }}
                  />
                  <span className="text-gray-400 text-xs font-mono">{mockBrandProfile.primary}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border border-gray-700"
                    style={{ backgroundColor: mockBrandProfile.secondary }}
                  />
                  <span className="text-gray-400 text-xs font-mono">{mockBrandProfile.secondary}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Tone</p>
              <p className="text-gray-300 text-sm">{mockBrandProfile.tone}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Logo</p>
              <p className="text-gray-400 text-xs font-mono">{mockBrandProfile.logo}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Request Pipeline */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Request Pipeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockVideoRequests.map((req) => {
            const status = STATUS_CONFIG[req.status];
            const qa     = QA_CONFIG[req.qa_status];
            return (
              <div
                key={req.id}
                className="bg-[#1a1f2e] border border-gray-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{req.purpose}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{req.id}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                    {req.agent}
                  </span>
                  <span className="text-xs text-gray-500">{req.platform}</span>
                </div>
                <div className="flex items-center gap-3">
                  <AspectVisual ratio={req.aspect_ratio} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 text-xs truncate">
                      <span className="text-gray-600">Hook: </span>{req.hook}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">
                      <span className="text-gray-600">CTA: </span>{req.cta}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-800">
                  <span className="text-xs text-gray-600 font-mono">{req.template}</span>
                  <span className={`text-xs font-medium ${qa.color}`}>{qa.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Approval Queue */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Approval Queue
          {approvalQueue.length > 0 && (
            <span className="ml-2 text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
              {approvalQueue.length} pending
            </span>
          )}
        </h2>
        {approvalQueue.length === 0 ? (
          <div className="bg-[#1a1f2e] border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-500">No videos pending approval</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvalQueue.map((req) => {
              const action = approvalActions[req.id];
              return (
                <div key={req.id} className="bg-[#1a1f2e] border border-gray-800 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-white font-semibold">{req.purpose}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                          {req.agent}
                        </span>
                        <span className="text-gray-500 text-xs">{req.platform}</span>
                        <AspectBadge ratio={req.aspect_ratio} />
                      </div>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${QA_CONFIG[req.qa_status].color}`}>
                      {QA_CONFIG[req.qa_status].label}
                    </span>
                  </div>

                  {/* Script Preview */}
                  <div className="bg-gray-900/60 rounded-lg p-3 mb-4 space-y-2">
                    <div>
                      <p className="text-gray-600 text-xs uppercase tracking-wide">Hook</p>
                      <p className="text-gray-300 text-sm mt-0.5">{req.hook}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs uppercase tracking-wide">Script</p>
                      <p className="text-gray-400 text-sm mt-0.5 leading-relaxed">{req.script}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs uppercase tracking-wide">CTA</p>
                      <p className="text-gray-300 text-sm mt-0.5">{req.cta}</p>
                    </div>
                  </div>

                  {/* QA Summary */}
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-4">
                    <p className="text-green-400 text-xs font-medium">QA Summary</p>
                    <p className="text-green-300/70 text-xs mt-0.5">
                      Brand colors verified · Font compliance: Inter ✓ · CTA present ✓ · Hook &lt;5s ✓
                    </p>
                  </div>

                  {/* Action Buttons */}
                  {action ? (
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-medium ${
                          action === "approved"
                            ? "text-green-400"
                            : action === "rejected"
                            ? "text-red-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {action === "approved"
                          ? "✓ Approved"
                          : action === "rejected"
                          ? "✗ Rejected"
                          : "⟳ Changes Requested"}
                      </span>
                      <button
                        onClick={() =>
                          setApprovalActions((p) => {
                            const n = { ...p };
                            delete n[req.id];
                            return n;
                          })
                        }
                        className="text-xs text-gray-600 hover:text-gray-400"
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleApprovalAction(req.id, "approved")}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApprovalAction(req.id, "rejected")}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg border border-red-600/30 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprovalAction(req.id, "changes_requested")}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors"
                      >
                        Request Changes
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
