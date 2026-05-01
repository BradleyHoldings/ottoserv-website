"use client";

import { useState } from "react";
import Link from "next/link";
import {
  mockNVP,
  mockContentLibrary,
  mockWinningPatterns,
  mockContentPerformance,
  type ContentPiece,
} from "@/lib/mockData";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "voices", label: "Voice Profiles" },
  { id: "pipeline", label: "Content Pipeline" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

const PIPELINE_STAGES = [
  { id: "draft", label: "Draft" },
  { id: "pending", label: "Critic Review" },
  { id: "approved", label: "Approved" },
  { id: "scheduled", label: "Scheduled" },
  { id: "published", label: "Published" },
];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-900/40 text-pink-400 border-pink-800",
  facebook: "bg-blue-900/40 text-blue-400 border-blue-800",
  linkedin: "bg-sky-900/40 text-sky-400 border-sky-800",
  google: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  email: "bg-purple-900/40 text-purple-400 border-purple-800",
};

const STATUS_COLORS: Record<string, string> = {
  pass: "bg-green-900/40 text-green-400 border-green-800",
  fail: "bg-red-900/40 text-red-400 border-red-800",
  pending: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  draft: "bg-gray-800 text-gray-400 border-gray-700",
  scheduled: "bg-blue-900/40 text-blue-400 border-blue-800",
  published: "bg-green-900/40 text-green-400 border-green-800",
};

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
  const label =
    status === "pass"
      ? `✓ Pass${score !== null ? ` ${score}` : ""}`
      : status === "fail"
      ? `✗ Fail${score !== null ? ` ${score}` : ""}`
      : "⏳ Pending";
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border font-medium ${
        STATUS_COLORS[status] ?? "bg-gray-800 text-gray-400 border-gray-700"
      }`}
    >
      {label}
    </span>
  );
}

function DistributionBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    published: "Published",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border font-medium ${
        STATUS_COLORS[status] ?? "bg-gray-800 text-gray-400 border-gray-700"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function ContentCard({ piece }: { piece: ContentPiece }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      <p className="text-white text-sm font-medium leading-snug line-clamp-2 mb-3">
        {piece.hook}
      </p>
      <div className="flex flex-wrap gap-1.5 items-center">
        <PlatformBadge platform={piece.platform} />
        <CriticBadge status={piece.critic_status} score={piece.critic_score} />
        <DistributionBadge status={piece.distribution_status} />
        {piece.emotional_trigger && (
          <span className="text-xs px-2 py-0.5 rounded border bg-violet-900/30 text-violet-400 border-violet-800">
            {piece.emotional_trigger}
          </span>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "yellow" | "purple" | "pink";
}) {
  const colors = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
    pink: "text-pink-400",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function OverviewTab() {
  const published = mockContentLibrary.filter((c) => c.distribution_status === "published");
  const scheduled = mockContentLibrary.filter((c) => c.distribution_status === "scheduled");
  const passCount = mockContentLibrary.filter((c) => c.critic_status === "pass").length;
  const avgEngagement =
    mockContentPerformance.reduce((s, p) => s + p.engagement_rate, 0) /
    mockContentPerformance.length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label="Content Generated" value={mockContentLibrary.length} color="blue" />
        <KpiCard label="Published" value={published.length} color="green" />
        <KpiCard
          label="Avg Engagement Rate"
          value={`${avgEngagement.toFixed(1)}%`}
          sub="across published posts"
          color="yellow"
        />
        <KpiCard label="Critic Pass Rate" value={`${Math.round((passCount / mockContentLibrary.length) * 100)}%`} color="purple" />
        <KpiCard label="Active NVPs" value={1} sub="property_management" color="pink" />
      </div>

      {/* Recent content */}
      <div>
        <h2 className="text-white font-semibold text-base mb-3">Recent Content</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mockContentLibrary.slice(0, 6).map((piece) => (
            <ContentCard key={piece.id} piece={piece} />
          ))}
        </div>
      </div>

      {/* Upcoming scheduled */}
      {scheduled.length > 0 && (
        <div>
          <h2 className="text-white font-semibold text-base mb-3">Upcoming Scheduled</h2>
          <div className="space-y-2">
            {scheduled.map((piece) => (
              <div
                key={piece.id}
                className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
              >
                <PlatformBadge platform={piece.platform} />
                <p className="text-gray-300 text-sm flex-1 truncate">{piece.hook}</p>
                <span className="text-gray-500 text-xs flex-shrink-0">
                  {piece.scheduled_for
                    ? new Date(piece.scheduled_for).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VoiceProfilesTab() {
  const nvp = mockNVP;
  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-base">{nvp.display_name}</h3>
            <p className="text-gray-500 text-xs mt-0.5">
              v{nvp.version} · Last refreshed {nvp.last_refreshed}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded border bg-green-900/40 text-green-400 border-green-800">
              {nvp.confidence}% confidence
            </span>
            <button className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">
              Refresh
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
              Tone Rules
            </p>
            <ul className="space-y-1">
              {nvp.tone_rules.map((rule, i) => (
                <li key={i} className="text-gray-300 text-sm flex gap-2">
                  <span className="text-blue-500 flex-shrink-0">›</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
              Banned Phrases
            </p>
            <div className="flex flex-wrap gap-1.5">
              {nvp.banned_phrases.map((phrase) => (
                <span
                  key={phrase}
                  className="text-xs px-2 py-0.5 rounded border bg-red-900/30 text-red-400 border-red-800"
                >
                  {phrase}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
              Archetypes
            </p>
            <div className="space-y-2">
              {nvp.archetypes.map((arch) => (
                <div key={arch.name} className="bg-gray-800/60 rounded p-2">
                  <p className="text-white text-xs font-medium">{arch.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{arch.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-800 grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
              Preferred Vocabulary
            </p>
            <div className="flex flex-wrap gap-1.5">
              {nvp.vocabulary.preferred.map((word) => (
                <span
                  key={word}
                  className="text-xs px-2 py-0.5 rounded border bg-green-900/20 text-green-400 border-green-900"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
              Trust Signals
            </p>
            <ul className="space-y-1">
              {nvp.trust_signals.map((sig, i) => (
                <li key={i} className="text-gray-300 text-xs flex gap-2">
                  <span className="text-green-500 flex-shrink-0">✓</span>
                  {sig}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Link
        href="/dashboard/growth/research"
        className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        View full research & voice profiles →
      </Link>
    </div>
  );
}

function PipelineTab() {
  const byStage = (stageId: string): ContentPiece[] => {
    if (stageId === "draft")
      return mockContentLibrary.filter(
        (c) => c.distribution_status === "draft" && c.critic_status === "pass"
      );
    if (stageId === "pending")
      return mockContentLibrary.filter((c) => c.critic_status === "pending");
    if (stageId === "approved")
      return mockContentLibrary.filter(
        (c) => c.critic_status === "pass" && c.distribution_status === "draft"
      );
    if (stageId === "scheduled")
      return mockContentLibrary.filter((c) => c.distribution_status === "scheduled");
    if (stageId === "published")
      return mockContentLibrary.filter((c) => c.distribution_status === "published");
    return [];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">
          {mockContentLibrary.length} total pieces across all stages
        </p>
        <Link
          href="/dashboard/growth/content"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Open Content Library →
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {PIPELINE_STAGES.map((stage) => {
          const pieces = byStage(stage.id);
          return (
            <div key={stage.id} className="bg-gray-900 border border-gray-800 rounded-lg">
              <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
                <p className="text-gray-300 text-xs font-medium">{stage.label}</p>
                <span className="text-xs bg-gray-800 text-gray-400 rounded px-1.5 py-0.5">
                  {pieces.length}
                </span>
              </div>
              <div className="p-2 space-y-2 min-h-[120px]">
                {pieces.length === 0 ? (
                  <p className="text-gray-600 text-xs text-center pt-4">Empty</p>
                ) : (
                  pieces.map((piece) => (
                    <div
                      key={piece.id}
                      className="bg-gray-800 rounded p-2 border border-gray-700"
                    >
                      <p className="text-gray-300 text-xs line-clamp-2 mb-1.5">{piece.hook}</p>
                      <div className="flex flex-wrap gap-1">
                        <PlatformBadge platform={piece.platform} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      {/* Top performing */}
      <div>
        <h2 className="text-white font-semibold text-base mb-3">Top Performing Content</h2>
        <div className="space-y-3">
          {mockContentPerformance
            .sort((a, b) => b.engagement_rate - a.engagement_rate)
            .map((perf, idx) => (
              <div
                key={perf.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl font-bold text-gray-700 w-7 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium line-clamp-1 mb-1">
                      {perf.hook_preview}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>
                        <span className="text-yellow-400 font-medium">
                          {perf.engagement_rate}%
                        </span>{" "}
                        engagement
                      </span>
                      <span>
                        <span className="text-blue-400 font-medium">
                          {perf.impressions.toLocaleString()}
                        </span>{" "}
                        impressions
                      </span>
                      <span>
                        <span className="text-purple-400 font-medium">{perf.saves}</span> saves
                      </span>
                      <span>
                        <span className="text-green-400 font-medium">{perf.dms}</span> DMs
                      </span>
                      <span className="capitalize">{perf.platform}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Engagement trend placeholder */}
      <div>
        <h2 className="text-white font-semibold text-base mb-3">Engagement Trend</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 flex items-center justify-center h-40">
          <p className="text-gray-600 text-sm">Chart coming soon — connect analytics source</p>
        </div>
      </div>

      {/* Winning patterns */}
      <div>
        <h2 className="text-white font-semibold text-base mb-3">Winning Patterns</h2>
        <div className="space-y-3">
          {mockWinningPatterns.map((pat) => (
            <div
              key={pat.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded border bg-violet-900/30 text-violet-400 border-violet-800 capitalize">
                  {pat.category.replace("_", " ")}
                </span>
                <p className="text-white text-sm font-medium">{pat.label}</p>
                <span className="ml-auto text-yellow-400 text-sm font-semibold">
                  {pat.avg_engagement_rate}% avg engagement
                </span>
              </div>
              <p className="text-gray-400 text-sm">{pat.insight}</p>
              <p className="text-gray-600 text-xs mt-1">Based on {pat.sample_count} posts</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const platforms = [
    { name: "Instagram", connected: true, handle: "@ottoserv_pm" },
    { name: "LinkedIn", connected: true, handle: "OttoServ" },
    { name: "Facebook", connected: false, handle: null },
    { name: "Email (Mailgun)", connected: true, handle: "growth@ottoserv.io" },
    { name: "Google Business", connected: false, handle: null },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Connected platforms */}
      <div>
        <h2 className="text-white font-semibold text-base mb-3">Connected Platforms</h2>
        <div className="space-y-2">
          {platforms.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-white text-sm font-medium">{p.name}</p>
                {p.handle && <p className="text-gray-500 text-xs">{p.handle}</p>}
              </div>
              {p.connected ? (
                <span className="text-xs px-2 py-0.5 rounded border bg-green-900/40 text-green-400 border-green-800">
                  Connected
                </span>
              ) : (
                <button className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors">
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Posting preferences */}
      <div>
        <h2 className="text-white font-semibold text-base mb-3">Posting Preferences</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-schedule approved content</p>
              <p className="text-gray-500 text-xs">Automatically queue passed content at optimal times</p>
            </div>
            <div className="w-10 h-5 rounded-full bg-blue-600 relative cursor-pointer">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Preferred posting window</p>
              <p className="text-gray-500 text-xs">Tue / Thu · 9am–11am local time</p>
            </div>
            <button className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
              Edit
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Max posts per week</p>
              <p className="text-gray-500 text-xs">Currently: 4 posts/week</p>
            </div>
            <button className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Approval rules */}
      <div>
        <h2 className="text-white font-semibold text-base mb-3">Approval Rules</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Require critic score ≥ 70 to publish</p>
              <p className="text-gray-500 text-xs">Content below threshold is blocked from scheduling</p>
            </div>
            <div className="w-10 h-5 rounded-full bg-blue-600 relative cursor-pointer">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Human approval before publish</p>
              <p className="text-gray-500 text-xs">All content requires owner sign-off even after critic pass</p>
            </div>
            <div className="w-10 h-5 rounded-full bg-blue-600 relative cursor-pointer">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Notify on critic fail</p>
              <p className="text-gray-500 text-xs">Send alert when content fails critic review</p>
            </div>
            <div className="w-10 h-5 rounded-full bg-gray-700 relative cursor-pointer">
              <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GrowthEnginePage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-xl font-bold">Growth Engine</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            OGIS — Omni-Channel Growth Intelligence System
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/growth/content"
            className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
          >
            Content Library
          </Link>
          <Link
            href="/dashboard/growth/research"
            className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
          >
            Research
          </Link>
          <button className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">
            + Generate Content
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "voices" && <VoiceProfilesTab />}
      {activeTab === "pipeline" && <PipelineTab />}
      {activeTab === "analytics" && <AnalyticsTab />}
      {activeTab === "settings" && <SettingsTab />}
    </div>
  );
}
