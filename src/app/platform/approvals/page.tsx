"use client";

import { useEffect, useState } from "react";
import { platformFetch } from "@/lib/platformApi";

interface Approval {
  id: string;
  task_id: string;
  task_title: string;
  agent: string;
  action: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-900/40 text-yellow-400",
  approved: "bg-green-900/40 text-green-400",
  rejected: "bg-red-900/40 text-red-400",
};

export default function PlatformApprovalsPage() {
  const [pending, setPending] = useState<Approval[]>([]);
  const [history, setHistory] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPayload, setExpandedPayload] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      platformFetch("/approvals?status=pending").then((r) => r.json()),
      platformFetch("/approvals?status=reviewed&limit=20").then((r) => r.json()),
    ])
      .then(([pendingData, historyData]) => {
        setPending(Array.isArray(pendingData) ? pendingData : (pendingData.approvals ?? []));
        setHistory(Array.isArray(historyData) ? historyData : (historyData.approvals ?? []));
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load approvals.");
        setLoading(false);
      });
  }, []);

  const handleDecision = async (id: string, decision: "approve" | "reject") => {
    setProcessing(id);
    try {
      const res = await platformFetch(`/approvals/${id}/${decision}`, { method: "POST" });
      const data = await res.json();
      const updated: Approval = data.approval ?? data;
      setPending((prev) => prev.filter((a) => a.id !== id));
      setHistory((prev) => [updated, ...prev]);
    } catch (err) {
      if ((err as Error).message !== "Unauthorized") {
        setError(`Failed to ${decision} approval.`);
      }
    } finally {
      setProcessing(null);
    }
  };

  const togglePayload = (id: string) => {
    setExpandedPayload((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-xl font-bold">Approvals</h1>
        <p className="text-gray-400 text-sm mt-0.5">Review and approve pending agent actions</p>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Pending approvals */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-white font-semibold">Pending</h2>
          {pending.length > 0 && (
            <span className="bg-yellow-600 text-white text-xs rounded-full px-2 py-0.5 font-medium">
              {pending.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center text-gray-400 text-sm">
            Loading approvals...
          </div>
        ) : pending.length === 0 ? (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">No pending approvals.</p>
            <p className="text-gray-600 text-xs mt-1">All agent actions are up to date.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((approval) => (
              <div
                key={approval.id}
                className="bg-[#111827] border border-gray-800 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-white font-medium">{approval.task_title}</p>
                    <p className="text-gray-400 text-sm mt-0.5">
                      <span className="text-gray-300">{approval.agent}</span> wants to{" "}
                      <span className="text-blue-400">{approval.action}</span>
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      Requested {approval.created_at ? new Date(approval.created_at).toLocaleString() : "—"}
                    </p>
                  </div>
                  <span className="bg-yellow-900/40 text-yellow-400 text-xs px-2 py-0.5 rounded shrink-0">
                    Pending
                  </span>
                </div>

                {/* Payload toggle */}
                <div>
                  <button
                    onClick={() => togglePayload(approval.id)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${expandedPayload === approval.id ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    View proposed payload
                  </button>
                  {expandedPayload === approval.id && (
                    <pre className="mt-2 bg-[#0a0a0a] border border-gray-800 rounded-md p-3 text-xs text-gray-300 overflow-auto max-h-48">
                      {JSON.stringify(approval.payload ?? {}, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecision(approval.id, "approve")}
                    disabled={processing === approval.id}
                    className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-white text-sm font-medium py-2 rounded-md transition-colors"
                  >
                    {processing === approval.id ? "Processing..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleDecision(approval.id, "reject")}
                    disabled={processing === approval.id}
                    className="flex-1 bg-[#1f2937] hover:bg-red-900/60 disabled:opacity-50 border border-gray-700 hover:border-red-700 text-gray-300 hover:text-red-300 text-sm font-medium py-2 rounded-md transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approval history */}
      <section>
        <h2 className="text-white font-semibold mb-4">History</h2>
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
          {history.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No approval history yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Task</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Agent</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Action</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Decision</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">Reviewed</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden xl:table-cell">By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((approval, i) => (
                  <tr
                    key={approval.id}
                    className={`border-b border-gray-800 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
                  >
                    <td className="px-5 py-3 text-white">{approval.task_title}</td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{approval.agent}</td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{approval.action}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded capitalize ${STATUS_COLORS[approval.status] ?? "bg-gray-800 text-gray-400"}`}>
                        {approval.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {approval.reviewed_at ? new Date(approval.reviewed_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden xl:table-cell">
                      {approval.reviewed_by || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
