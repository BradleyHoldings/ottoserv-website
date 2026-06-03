"use client";

import { useState, useEffect } from "react";
import {
  type SIAPost,
  type SIATemplate,
  type SIAPainType,
} from "@/lib/mockData";
import { getLiveSocialState, type SocialOpsHealth } from "@/lib/dashboardApi";

const mockSIAPosts: SIAPost[] = [];
const mockSIATemplates: SIATemplate[] = [];

type IntentLevel = "high" | "medium" | "low";

function intentLevel(score: number): IntentLevel {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

const INTENT_CONFIG: Record<IntentLevel, { label: string; cls: string }> = {
  high: { label: "High Intent", cls: "bg-red-900/40 text-red-400 border-red-800" },
  medium: { label: "Med Intent", cls: "bg-yellow-900/40 text-yellow-400 border-yellow-800" },
  low: { label: "Low Intent", cls: "bg-green-900/40 text-green-400 border-green-800" },
};

const PAIN_CONFIG: Record<SIAPainType, { label: string; cls: string }> = {
  lead_volume: { label: "Lead Volume", cls: "bg-blue-900/40 text-blue-400 border-blue-800" },
  lead_quality: { label: "Lead Quality", cls: "bg-purple-900/40 text-purple-400 border-purple-800" },
  operations: { label: "Operations", cls: "bg-orange-900/40 text-orange-400 border-orange-800" },
  unknown: { label: "Unknown", cls: "bg-gray-800 text-gray-400 border-gray-700" },
};

function IntentBadge({ score }: { score: number }) {
  const level = intentLevel(score);
  const { label, cls } = INTENT_CONFIG[level];
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cls}`}>
      {label} · {score}
    </span>
  );
}

function PainBadge({ type }: { type: SIAPainType }) {
  const { label, cls } = PAIN_CONFIG[type];
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cls}`}>
      {label}
    </span>
  );
}

function PlatformBadge({ platform, subreddit }: { platform: string; subreddit: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded border font-medium bg-orange-950/40 text-orange-300 border-orange-900/60 capitalize">
      {platform} · {subreddit}
    </span>
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
  color?: "blue" | "green" | "yellow" | "purple" | "pink" | "amber";
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
    pink: "text-pink-400",
    amber: "text-amber-400",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ── Approval Queue ────────────────────────────────────────────────────────────

function ApprovalCard({
  post,
  onAction,
}: {
  post: SIAPost;
  onAction: (id: string, action: "approve" | "reject" | "regenerate") => void;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <PlatformBadge platform={post.platform} subreddit={post.subreddit} />
          <IntentBadge score={post.intent_score} />
          <PainBadge type={post.pain_type} />
        </div>
        <span className="text-gray-500 text-xs flex-shrink-0 mt-0.5">
          {new Date(post.detected_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          today
        </span>
      </div>

      <div>
        <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">Detected Post</p>
        <p className="text-gray-300 text-sm leading-relaxed bg-gray-800/60 rounded px-3 py-2.5 border border-gray-700/50 italic">
          &ldquo;{post.post_excerpt}&rdquo;
        </p>
        <p className="text-gray-600 text-xs mt-1.5">u/{post.author}</p>
      </div>

      <div>
        <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">Generated Comment</p>
        <p className="text-gray-200 text-sm leading-relaxed bg-blue-950/30 rounded px-3 py-2.5 border border-blue-900/40">
          {post.generated_comment}
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onAction(post.id, "approve")}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => onAction(post.id, "reject")}
          className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 text-xs font-medium rounded border border-red-800 transition-colors"
        >
          Reject
        </button>
        <button
          onClick={() => onAction(post.id, "regenerate")}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded border border-gray-700 transition-colors"
        >
          ↺ Regenerate
        </button>
      </div>
    </div>
  );
}

// ── Active Engagements ────────────────────────────────────────────────────────

const ENGAGEMENT_STATUS: Record<string, { label: string; cls: string }> = {
  commented: { label: "Commented", cls: "bg-blue-900/40 text-blue-400 border-blue-800" },
  replied: { label: "Reply Received", cls: "bg-green-900/40 text-green-400 border-green-800" },
  dm_sent: { label: "DM Sent", cls: "bg-purple-900/40 text-purple-400 border-purple-800" },
};

function EngagementCard({ post }: { post: SIAPost }) {
  const status = ENGAGEMENT_STATUS[post.status];
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <PlatformBadge platform={post.platform} subreddit={post.subreddit} />
          {status && (
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${status.cls}`}>
              {status.label}
            </span>
          )}
          <PainBadge type={post.pain_type} />
        </div>
        {post.engagement_score !== null && (
          <div className="text-right flex-shrink-0">
            <p className="text-gray-500 text-[11px]">Score</p>
            <p className="text-green-400 font-bold text-sm">{post.engagement_score}</p>
          </div>
        )}
      </div>

      <p className="text-gray-400 text-sm leading-relaxed bg-gray-800/40 rounded px-3 py-2 border border-gray-700/40 italic line-clamp-2">
        &ldquo;{post.post_excerpt}&rdquo;
      </p>

      <div>
        <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">Our comment</p>
        <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
          {post.generated_comment}
        </p>
      </div>

      <div className="flex items-center gap-4 pt-1 text-xs text-gray-500">
        <span>
          <span className="text-white font-medium">{post.reply_count}</span> replies
        </span>
        {post.dm_triggered && (
          <span className="px-2 py-0.5 rounded border font-medium bg-purple-900/40 text-purple-400 border-purple-800">
            DM Triggered
          </span>
        )}
      </div>
    </div>
  );
}

// ── Winning Templates ─────────────────────────────────────────────────────────

function TemplateCard({ tpl }: { tpl: SIATemplate }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-white font-medium text-sm">{tpl.name}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span
              className={`text-xs px-2 py-0.5 rounded border font-medium ${
                tpl.type === "dm"
                  ? "bg-purple-900/40 text-purple-400 border-purple-800"
                  : "bg-blue-900/40 text-blue-400 border-blue-800"
              }`}
            >
              {tpl.type === "dm" ? "DM Opener" : "Comment"}
            </span>
            <PainBadge type={tpl.target_pain} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-green-400 font-bold text-base">{tpl.reply_rate}</p>
          <p className="text-gray-500 text-xs">reply rate</p>
        </div>
      </div>

      <p className="text-gray-400 text-sm leading-relaxed bg-gray-800/40 rounded px-3 py-2.5 border border-gray-700/40 line-clamp-4">
        {tpl.content}
      </p>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>
          <span className="text-white font-medium">{tpl.times_used}×</span> used
        </span>
        <span>
          <span className="text-white font-medium">{tpl.conversions}</span> conversions
        </span>
      </div>
    </div>
  );
}

// ── Engagement Funnel ─────────────────────────────────────────────────────────

type FunnelStage = { label: string; value: number; color: string };

function EngagementFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(stages[0]?.value || 0, 1);
  const first = stages[0]?.value || 0;
  const last = stages[stages.length - 1]?.value || 0;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
      {stages.map((stage, i) => {
        const prevVal = i > 0 ? stages[i - 1].value : null;
        const dropPct = prevVal ? Math.round((stage.value / prevVal) * 100) : null;
        return (
          <div key={stage.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 font-medium">{stage.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{stage.value}</span>
                {dropPct !== null && (
                  <span className="text-gray-500 text-xs">({dropPct}% of prev)</span>
                )}
              </div>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full ${stage.color} rounded-full`} style={{ width: `${(stage.value / max) * 100}%` }} />
            </div>
          </div>
        );
      })}
      <p className="text-gray-600 text-xs pt-1">
        Draft → published rate: {first ? ((last / first) * 100).toFixed(1) : "0.0"}% (live SocialEngine pipeline)
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SocialIntelligencePage() {
  const [queuePosts, setQueuePosts] = useState<SIAPost[]>(
    mockSIAPosts.filter((p) => p.status === "pending_approval")
  );

  // Live social/revenue intelligence from the SocialEngine (was static before).
  const [health, setHealth] = useState<SocialOpsHealth | null>(null);
  const [published, setPublished] = useState<Array<Record<string, any>>>([]);

  useEffect(() => {
    let cancelled = false;
    getLiveSocialState().then((live) => {
      if (cancelled || !live) return;
      setHealth(live.health);
      setPublished((live.items || []).filter((i: any) => i.status === "published"));
    });
    return () => { cancelled = true; };
  }, []);

  const activePosts = mockSIAPosts.filter((p) =>
    ["commented", "replied", "dm_sent"].includes(p.status)
  );

  function handleAction(id: string, action: "approve" | "reject" | "regenerate") {
    if (action === "approve" || action === "reject") {
      setQueuePosts((prev) => prev.filter((p) => p.id !== id));
    }
  }

  const funnelStages: FunnelStage[] = [
    { label: "Drafts", value: health?.drafts_count ?? 0, color: "bg-blue-600" },
    { label: "Pending approval", value: health?.pending_approval_count ?? 0, color: "bg-sky-500" },
    { label: "Approved / awaiting Cowork", value: health?.approved_awaiting_cowork_count ?? 0, color: "bg-purple-500" },
    { label: "Published", value: health?.published_count ?? 0, color: "bg-green-500" },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-white text-xl font-bold">Social Intelligence Hub</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Live social/revenue pipeline from the SocialEngine, plus AI-detected buying signals.
        </p>
        <p className="text-gray-600 text-xs mt-1">
          {health
            ? <>Data source: <span className="text-gray-400 break-all">{health.data_source}</span> · backend {health.backend_connected ? "connected" : "disconnected"}</>
            : "Connecting to SocialEngine…"}
        </p>
      </div>

      {/* Live SocialEngine KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Drafts" value={health?.drafts_count ?? 0} color="blue" sub="in pipeline" />
        <KpiCard label="Pending Approval" value={health?.pending_approval_count ?? 0} color="yellow" sub="need review" />
        <KpiCard label="Awaiting Cowork" value={health?.approved_awaiting_cowork_count ?? 0} color="purple" sub="approved" />
        <KpiCard label="Published" value={health?.published_count ?? 0} color="green" sub="with evidence" />
        <KpiCard label="Failed / Fallback" value={health?.failed_stalled_count ?? 0} color="pink" sub="needs owner" />
        <KpiCard label="Total Records" value={health?.total_count ?? 0} color="amber" />
      </div>

      {/* Published evidence (live) */}
      <div>
        <div className="mb-4">
          <h2 className="text-white font-semibold text-base">Published Evidence</h2>
          <p className="text-gray-500 text-xs mt-0.5">Live published records with proof URLs from the SocialEngine</p>
        </div>
        {published.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center"><p className="text-gray-400 text-sm">No published evidence yet</p></div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {published.map((p) => (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded border border-gray-700 text-gray-300 capitalize">{p.platform}</span>
                  <span className="px-2 py-0.5 rounded border border-green-800 text-green-400">{p.content_category || "published"}</span>
                </div>
                <p className="text-gray-300 text-sm line-clamp-3">{p.post_text}</p>
                {p.published_url && (
                  <a href={p.published_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline break-all">{p.published_url}</a>
                )}
                {p.evidence_url && <p className="text-gray-500 text-xs break-all">evidence: {p.evidence_url}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval Queue */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold text-base">Reddit Comment Approval Queue</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Separate intent monitor. Social post approvals live in /dashboard/social.
            </p>
          </div>
          {queuePosts.length > 0 && (
            <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
              {queuePosts.length} pending
            </span>
          )}
        </div>
        {queuePosts.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-sm">Queue is clear — no comments pending approval</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queuePosts.map((post) => (
              <ApprovalCard key={post.id} post={post} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>

      {/* Active Engagements */}
      <div>
        <div className="mb-4">
          <h2 className="text-white font-semibold text-base">Active Engagements</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Posts we commented on — tracking replies and DM triggers
          </p>
        </div>
        {activePosts.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-sm">No active engagements</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activePosts.map((post) => (
              <EngagementCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* Templates + Funnel */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <h2 className="text-white font-semibold text-base">Winning Templates</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Top-performing comment and DM templates
            </p>
          </div>
          <div className="space-y-4">
            {mockSIATemplates.map((tpl) => (
              <TemplateCard key={tpl.id} tpl={tpl} />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4">
            <h2 className="text-white font-semibold text-base">Social Pipeline Funnel</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Live SocialEngine: drafts → pending → approved → published
            </p>
          </div>
          <EngagementFunnel stages={funnelStages} />
        </div>
      </div>
    </div>
  );
}
