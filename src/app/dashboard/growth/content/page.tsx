"use client";

import { useState } from "react";
import Link from "next/link";
import {
  mockContentLibrary,
  mockContentPerformance,
  type ContentPiece,
} from "@/lib/mockData";

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-900/40 text-pink-400 border-pink-800",
  facebook: "bg-blue-900/40 text-blue-400 border-blue-800",
  linkedin: "bg-sky-900/40 text-sky-400 border-sky-800",
  google: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  email: "bg-purple-900/40 text-purple-400 border-purple-800",
};

const PLATFORMS = ["all", "instagram", "facebook", "linkedin", "google", "email"];
const NICHES = ["all", "property_management"];
const CRITIC_STATUSES = ["all", "pass", "fail", "pending"];
const DIST_STATUSES = ["all", "draft", "scheduled", "published"];

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${
        PLATFORM_COLORS[platform] ?? "bg-gray-800 text-gray-400 border-gray-700"
      }`}
    >
      {platform}
    </span>
  );
}

function CriticBadge({ status, score }: { status: string; score: number | null }) {
  const colors: Record<string, string> = {
    pass: "bg-green-900/40 text-green-400 border-green-800",
    fail: "bg-red-900/40 text-red-400 border-red-800",
    pending: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  };
  const label =
    status === "pass"
      ? `✓ ${score ?? ""}`
      : status === "fail"
      ? `✗ ${score ?? ""}`
      : "⏳";
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${colors[status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {label}
    </span>
  );
}

function DistBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-800 text-gray-400 border-gray-700",
    scheduled: "bg-blue-900/40 text-blue-400 border-blue-800",
    published: "bg-green-900/40 text-green-400 border-green-800",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${colors[status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {status}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-gray-500 text-xs">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-blue-600"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? "All" : o}
          </option>
        ))}
      </select>
    </div>
  );
}

function GenerateForm({ onClose }: { onClose: () => void }) {
  const [niche, setNiche] = useState("property_management");
  const [platform, setPlatform] = useState("linkedin");
  const [context, setContext] = useState("");
  const [count, setCount] = useState(3);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1117] border border-gray-800 rounded-xl w-full max-w-lg">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Generate Content</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">
            ✕
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Niche</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-blue-600"
            >
              <option value="property_management">Property Management</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-blue-600"
            >
              {["instagram", "facebook", "linkedin", "google", "email"].map((p) => (
                <option key={p} value={p} className="capitalize">
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Offer Context</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              placeholder="Describe what you want to promote or the angle to take..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Count</label>
            <input
              type="number"
              value={count}
              min={1}
              max={10}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            Generate {count} piece{count !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  piece,
  onClose,
}: {
  piece: ContentPiece;
  onClose: () => void;
}) {
  const perf = mockContentPerformance.find((p) => p.content_id === piece.id);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0f1117] border border-gray-800 rounded-t-xl sm:rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#0f1117] px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={piece.platform} />
            <CriticBadge status={piece.critic_status} score={piece.critic_score} />
            <DistBadge status={piece.distribution_status} />
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Full post preview */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
              Full Post
            </p>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <p className="text-white text-sm font-semibold">{piece.hook}</p>
              <p className="text-gray-300 text-sm whitespace-pre-line">{piece.body}</p>
              <p className="text-blue-400 text-sm">{piece.cta}</p>
            </div>
          </div>

          {/* Emotional trigger + hypothesis */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1.5">
                Emotional Trigger
              </p>
              <span className="text-xs px-2 py-1 rounded border bg-violet-900/30 text-violet-400 border-violet-800">
                {piece.emotional_trigger}
              </span>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1.5">
                Hypothesis
              </p>
              <p className="text-gray-300 text-sm">{piece.hypothesis}</p>
            </div>
          </div>

          {/* Critic evaluation */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
              Critic Evaluation
            </p>
            <div
              className={`border rounded-lg p-4 ${
                piece.critic_status === "pass"
                  ? "bg-green-900/10 border-green-900/50"
                  : piece.critic_status === "fail"
                  ? "bg-red-900/10 border-red-900/50"
                  : "bg-yellow-900/10 border-yellow-900/50"
              }`}
            >
              {piece.critic_score !== null && (
                <p className="text-lg font-bold text-white mb-1">
                  Score: {piece.critic_score}/100
                </p>
              )}
              {piece.critic_notes ? (
                <p className="text-gray-300 text-sm">{piece.critic_notes}</p>
              ) : (
                <p className="text-gray-500 text-sm">Awaiting critic evaluation...</p>
              )}
            </div>
          </div>

          {/* Performance metrics */}
          {perf ? (
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
                Performance
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: "Impressions", value: perf.impressions.toLocaleString(), color: "text-blue-400" },
                  { label: "Engagements", value: perf.engagements.toLocaleString(), color: "text-yellow-400" },
                  { label: "Eng. Rate", value: `${perf.engagement_rate}%`, color: "text-green-400" },
                  { label: "CTR", value: `${perf.ctr}%`, color: "text-purple-400" },
                  { label: "Saves", value: perf.saves, color: "text-pink-400" },
                  { label: "DMs", value: perf.dms, color: "text-sky-400" },
                ].map((m) => (
                  <div key={m.label} className="bg-gray-900 border border-gray-800 rounded p-3 text-center">
                    <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-gray-500 text-xs">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Scheduled / published dates */}
          {(piece.scheduled_for || piece.published_at) && (
            <div className="text-xs text-gray-500">
              {piece.scheduled_for && (
                <p>
                  Scheduled:{" "}
                  {new Date(piece.scheduled_for).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {piece.published_at && (
                <p>
                  Published:{" "}
                  {new Date(piece.published_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          )}

          {/* Revision history placeholder */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
              Revision History
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="w-24 flex-shrink-0">{piece.created_at}</span>
                <span>v1 — Initial generation</span>
              </div>
              {piece.critic_status !== "pending" && (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="w-24 flex-shrink-0">{piece.created_at}</span>
                  <span>Critic review complete — {piece.critic_status}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContentLibraryPage() {
  const [nicheFilter, setNicheFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [criticFilter, setCriticFilter] = useState("all");
  const [distFilter, setDistFilter] = useState("all");
  const [selectedPiece, setSelectedPiece] = useState<ContentPiece | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  const filtered = mockContentLibrary.filter((c) => {
    if (nicheFilter !== "all" && c.niche !== nicheFilter) return false;
    if (platformFilter !== "all" && c.platform !== platformFilter) return false;
    if (criticFilter !== "all" && c.critic_status !== criticFilter) return false;
    if (distFilter !== "all" && c.distribution_status !== distFilter) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/growth"
              className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
            >
              Growth Engine
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-white text-sm font-medium">Content Library</span>
          </div>
          <h1 className="text-white text-xl font-bold">Content Library</h1>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          + Generate Content
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-5 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
        <FilterSelect label="Niche" value={nicheFilter} options={NICHES} onChange={setNicheFilter} />
        <FilterSelect label="Platform" value={platformFilter} options={PLATFORMS} onChange={setPlatformFilter} />
        <FilterSelect label="Critic" value={criticFilter} options={CRITIC_STATUSES} onChange={setCriticFilter} />
        <FilterSelect label="Status" value={distFilter} options={DIST_STATUSES} onChange={setDistFilter} />
        <span className="ml-auto text-gray-500 text-xs self-center">
          {filtered.length} of {mockContentLibrary.length} pieces
        </span>
      </div>

      {/* Content list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No content matches the current filters.
          </div>
        ) : (
          filtered.map((piece) => (
            <button
              key={piece.id}
              onClick={() => setSelectedPiece(piece)}
              className="w-full text-left bg-gray-900 border border-gray-800 rounded-lg px-4 py-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium line-clamp-1 mb-1">
                    {piece.hook}
                  </p>
                  <p className="text-gray-500 text-xs line-clamp-1">{piece.body}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center flex-shrink-0">
                  <PlatformBadge platform={piece.platform} />
                  <CriticBadge status={piece.critic_status} score={piece.critic_score} />
                  <DistBadge status={piece.distribution_status} />
                  <span className="text-xs px-2 py-0.5 rounded border bg-violet-900/30 text-violet-400 border-violet-800 hidden sm:inline">
                    {piece.emotional_trigger}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {selectedPiece && (
        <DetailPanel piece={selectedPiece} onClose={() => setSelectedPiece(null)} />
      )}
      {showGenerate && <GenerateForm onClose={() => setShowGenerate(false)} />}
    </div>
  );
}
