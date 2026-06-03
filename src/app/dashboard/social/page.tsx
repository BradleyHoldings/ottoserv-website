"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { SOCIAL_PLATFORMS, SocialPost } from "@/lib/mockData";
import {
  getLiveSocialState,
  approveSocialPost,
  rejectSocialPost,
  submitSocialPost,
  handoffSocialPost,
  failSocialPost,
  assignSocialFallback,
  recordSocialEvidence,
  type SocialOpsHealth,
} from "@/lib/dashboardApi";
import { type CoworkQueueRow } from "@/lib/socialContentEngine.mjs";

// ─── Helpers ────────────────────────────────────────────────────────────────

type WorkflowItem = Record<string, any>;

function platformMeta(id: string) {
  return SOCIAL_PLATFORMS.find((p) => p.id === id) ?? { name: id, icon: "🔌", color: "#6b7280" };
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDatetime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function fmtAgo(iso: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const POST_STATUS_COLORS: Record<SocialPost["status"], string> = {
  draft:     "bg-gray-800 text-gray-400 border-gray-700",
  pending:   "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  approved:  "bg-blue-900/40 text-blue-400 border-blue-800",
  scheduled: "bg-purple-900/40 text-purple-400 border-purple-800",
  published: "bg-green-900/40 text-green-400 border-green-800",
  rejected:  "bg-red-900/40 text-red-400 border-red-800",
  failed:    "bg-red-900/40 text-orange-400 border-orange-800",
};

const RISK_COLOR = (score: number) =>
  score >= 60 ? "text-red-400" : score >= 30 ? "text-yellow-400" : "text-green-400";

// ─── Calendar helpers ────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function postsForDay(posts: SocialPost[], year: number, month: number, day: number) {
  return posts.filter((p) => {
    const iso = p.scheduled_at ?? p.published_at;
    if (!iso) return false;
    const d = new Date(iso);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });
}

// ─── Strategy review block (Task 4 fields surfaced) ──────────────────────────

function StrategyReview({ item }: { item: WorkflowItem | undefined }) {
  if (!item) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-400 bg-[#0d1117] border border-gray-800 rounded-lg p-2">
      <div><span className="text-gray-600">Category:</span> {item.content_category || "—"}</div>
      <div>
        <span className="text-gray-600">Billboard risk:</span>{" "}
        <span className={RISK_COLOR(Number(item.billboard_risk_score) || 0)}>
          {item.billboard_risk_score ?? 0}
        </span>
      </div>
      <div><span className="text-gray-600">CTA:</span> {item.cta_status || "—"}</div>
      <div><span className="text-gray-600">Audience:</span> {item.intended_audience || "—"}</div>
      <div className="col-span-2"><span className="text-gray-600">Insight/reframe:</span> {item.core_insight_or_reframe || "—"}</div>
      {item.reviewed_by && (
        <div className="col-span-2"><span className="text-gray-600">Reviewed by:</span> {item.reviewed_by}</div>
      )}
      {Array.isArray(item.learning_tags) && item.learning_tags.length > 0 && (
        <div className="col-span-2">
          {item.learning_tags.map((t: string) => (
            <span key={t} className="mr-1 text-gray-500">#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────

function PostCard({
  post,
  item,
  onApprove,
  onReject,
  onHandoff,
  onFail,
  onFallback,
  onEvidence,
  onSubmit,
  showBulk,
  checked,
  onCheck,
  busy,
}: {
  post: SocialPost & Record<string, any>;
  item?: WorkflowItem;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onHandoff?: (id: string) => void;
  onFail?: (id: string) => void;
  onFallback?: (id: string) => void;
  onEvidence?: (id: string) => void;
  onSubmit?: (id: string) => void;
  showBulk?: boolean;
  checked?: boolean;
  onCheck?: (id: string) => void;
  busy?: boolean;
}) {
  const meta = platformMeta(post.platform);
  const statusCls = POST_STATUS_COLORS[post.status as SocialPost["status"]] ?? POST_STATUS_COLORS.draft;

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
      <div className="h-1" style={{ backgroundColor: meta.color }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          {showBulk && (
            <input
              type="checkbox"
              checked={!!checked}
              onChange={() => onCheck?.(post.id)}
              className="mt-1 accent-blue-500 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ backgroundColor: meta.color + "22", color: meta.color }}
              >
                {meta.icon} {meta.name}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded border ${statusCls}`}>{post.status}</span>
              {item?.status && item.status !== post.status && (
                <span className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400">
                  {item.status}
                </span>
              )}
              {post.created_by_agent && (
                <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-900/50">
                  🤖 {post.created_by_agent}
                </span>
              )}
            </div>

            <p className="text-gray-300 text-sm leading-snug mb-2 line-clamp-3">
              {(post.content || "").slice(0, 220)}{(post.content || "").length > 220 ? "…" : ""}
            </p>

            <StrategyReview item={item} />

            {post.rejection_reason && (
              <div className="bg-red-900/20 border border-red-900/40 rounded-lg p-2 my-2">
                <p className="text-red-400 text-xs"><span className="font-medium">Rejected: </span>{post.rejection_reason}</p>
              </div>
            )}

            {/* Fallback / failure (Task 8) */}
            {(item?.failure_reason || post.needs_fix_reason) && post.status === "failed" && (
              <div className="bg-orange-900/20 border border-orange-900/40 rounded-lg p-2 my-2 text-xs">
                <p className="text-orange-400">⚠ {item?.failure_reason || post.needs_fix_reason}</p>
                <p className="text-gray-400 mt-1">
                  Fallback owner: <span className="text-white">{post.fallback_owner || item?.fallback_owner || "—"}</span>
                  {" · "}Next: {post.next_action || item?.next_action || "—"}
                </p>
              </div>
            )}

            {/* Evidence (Task 7) */}
            {(post.published_url || item?.evidence_path || item?.evidence_url) && (
              <div className="bg-green-900/15 border border-green-900/40 rounded-lg p-2 my-2 text-xs space-y-0.5">
                {post.published_url && (
                  <p>🔗 <a href={post.published_url} target="_blank" rel="noreferrer" className="text-green-400 hover:underline break-all">{post.published_url}</a></p>
                )}
                {item?.evidence_url && (
                  <p className="text-gray-400">📄 evidence: <span className="break-all">{item.evidence_url}</span></p>
                )}
                {item?.evidence_path && (
                  <p className="text-gray-500 break-all">🗂 {item.evidence_path}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap mt-1">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {post.scheduled_at && <span>📅 {fmtDatetime(post.scheduled_at)}</span>}
                {post.published_at && <span>✅ Published {fmtDate(post.published_at)}</span>}
                {item?.next_action && post.status !== "failed" && (
                  <span className="text-gray-600">→ {item.next_action}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-800">
          {onApprove && (
            <button disabled={busy} onClick={() => onApprove(post.id)} className="flex-1 min-w-[90px] py-1.5 text-xs font-medium rounded-lg bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-900/50 transition-colors disabled:opacity-40">
              ✓ Approve
            </button>
          )}
          {onReject && (
            <button disabled={busy} onClick={() => onReject(post.id)} className="flex-1 min-w-[90px] py-1.5 text-xs font-medium rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40 transition-colors disabled:opacity-40">
              ✕ Reject
            </button>
          )}
          {onHandoff && (
            <button disabled={busy} onClick={() => onHandoff(post.id)} className="flex-1 min-w-[120px] py-1.5 text-xs font-medium rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40 transition-colors disabled:opacity-40">
              → Hand to Cowork
            </button>
          )}
          {onFail && (
            <button disabled={busy} onClick={() => onFail(post.id)} className="flex-1 min-w-[120px] py-1.5 text-xs font-medium rounded-lg bg-orange-900/20 hover:bg-orange-900/30 text-orange-400 border border-orange-900/40 transition-colors disabled:opacity-40">
              ⚠ Simulate Cowork fail
            </button>
          )}
          {onEvidence && (
            <button disabled={busy} onClick={() => onEvidence(post.id)} className="flex-1 min-w-[120px] py-1.5 text-xs font-medium rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-900/40 transition-colors disabled:opacity-40">
              ✅ Record evidence
            </button>
          )}
          {onFallback && (
            <button disabled={busy} onClick={() => onFallback(post.id)} className="flex-1 min-w-[120px] py-1.5 text-xs font-medium rounded-lg bg-yellow-900/20 hover:bg-yellow-900/30 text-yellow-400 border border-yellow-900/40 transition-colors disabled:opacity-40">
              ↩ Assign fallback
            </button>
          )}
          {onSubmit && (
            <button disabled={busy} onClick={() => onSubmit(post.id)} className="flex-1 min-w-[120px] py-1.5 text-xs font-medium rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40 transition-colors disabled:opacity-40">
              Submit for approval
            </button>
          )}
          <Link href="/dashboard/social/post" className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1f2937] hover:bg-gray-700 text-gray-400 border border-gray-700 transition-colors">
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Health panel (Task 9) ────────────────────────────────────────────────────

function HealthStat({ label, value, tone = "text-white" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="bg-[#0d1117] border border-gray-800 rounded-lg px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function HealthPanel({ health }: { health: SocialOpsHealth | null }) {
  if (!health) return null;
  const connected = health.backend_connected;
  return (
    <div className="mb-6 rounded-xl border border-gray-800 bg-[#111827] p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm font-semibold text-white">Social Ops Health</span>
          <span className={`text-xs px-2 py-0.5 rounded border ${connected ? "border-green-800 text-green-400" : "border-red-800 text-red-400"}`}>
            {connected ? `backend connected · ${health.backend_status || "healthy"}` : "backend disconnected"}
          </span>
        </div>
        <span className="text-[11px] text-gray-500 break-all">source: {health.data_source}</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
        <HealthStat label="Drafts" value={health.drafts_count} />
        <HealthStat label="Pending approval" value={health.pending_approval_count} tone="text-yellow-400" />
        <HealthStat label="Awaiting Cowork" value={health.approved_awaiting_cowork_count} tone="text-blue-400" />
        <HealthStat label="Published" value={health.published_count} tone="text-green-400" />
        <HealthStat label="Failed/stalled" value={health.failed_stalled_count} tone={health.failed_stalled_count ? "text-orange-400" : "text-white"} />
        <HealthStat label="Total" value={health.total_count} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
        <div className="text-gray-400">Codex prep: <span className="text-gray-300">{fmtAgo(health.last_codex_content_prep)}</span></div>
        <div className="text-gray-400">Hermes review: <span className="text-gray-300">{fmtAgo(health.last_hermes_social_review)}</span></div>
        <div className="text-gray-400">Approval: <span className="text-gray-300">{fmtAgo(health.last_approval_writeback)}</span></div>
        <div className="text-gray-400">Cowork handoff: <span className="text-gray-300">{fmtAgo(health.last_cowork_handoff)}</span></div>
        <div className="text-gray-400">Cowork evidence: <span className="text-gray-300">{fmtAgo(health.last_cowork_evidence)}</span></div>
      </div>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = "calendar" | "approval" | "cowork" | "published" | "fallback" | "drafts";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "calendar", label: "Content Calendar", icon: "📅" },
  { id: "approval", label: "Approval Queue", icon: "⏳" },
  { id: "cowork", label: "Cowork Queue", icon: "C" },
  { id: "published", label: "Published", icon: "✅" },
  { id: "fallback", label: "Fallback", icon: "⚠" },
  { id: "drafts", label: "Drafts", icon: "📝" },
];

function CoworkQueueTable({ rows }: { rows: CoworkQueueRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="font-medium text-white">Cowork queue is clear</p>
        <p className="text-sm mt-1">Approved posts handed to Cowork will appear here.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#111827]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800 text-sm">
          <thead className="bg-[#0d1117] text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {["Topic", "Platform", "Post Text", "CTA", "Scheduled", "Status", "Published URL", "Notes"].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="max-w-[200px] px-4 py-3 font-medium text-white">{row.topic || "Untitled"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{row.platform || "-"}</td>
                <td className="min-w-[240px] max-w-[340px] px-4 py-3 text-gray-300"><p className="line-clamp-4 whitespace-pre-wrap">{row.postText || "-"}</p></td>
                <td className="max-w-[140px] px-4 py-3 text-gray-300">{row.cta || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-400">{row.scheduledDate ? fmtDatetime(row.scheduledDate) : "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{row.status || "-"}</td>
                <td className="max-w-[200px] px-4 py-3">
                  {row.publishedUrl ? <a href={row.publishedUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 break-all">{row.publishedUrl}</a> : <span className="text-gray-600">-</span>}
                </td>
                <td className="max-w-[220px] px-4 py-3 text-gray-400">{row.notes || row.postingNotes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-800 px-4 py-3 text-xs text-gray-500">
        Cowork executes from this queue, then writes the published URL + evidence back to the same SocialEngine record.
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<Tab>("approval");
  const [posts, setPosts] = useState<(SocialPost & Record<string, any>)[]>([]);
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [coworkQueue, setCoworkQueue] = useState<CoworkQueueRow[]>([]);
  const [health, setHealth] = useState<SocialOpsHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const itemsById = useMemo(() => {
    const map = new Map<string, WorkflowItem>();
    for (const it of items) map.set(it.id, it);
    return map;
  }, [items]);

  const load = useCallback(async () => {
    const live = await getLiveSocialState();
    if (!live) {
      setError("Could not reach the SocialEngine API (/api/social).");
      return;
    }
    setError(null);
    setPosts((live.state.posts || []) as (SocialPost & Record<string, any>)[]);
    setItems(live.items || []);
    setCoworkQueue(live.state.coworkQueue || []);
    setHealth(live.health || null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [load]);

  // Optimistic-ish: run the API action, then refetch the durable state.
  async function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
      setSelectedIds((s) => { const n = new Set(s); n.delete(id); return n; });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const handleApprove = (id: string) => run(id, () => approveSocialPost(id));
  const handleReject  = (id: string) => run(id, () => rejectSocialPost(id, "Rejected via dashboard"));
  const handleSubmit  = (id: string) => run(id, () => submitSocialPost(id));
  const handleHandoff = (id: string) => run(id, () => handoffSocialPost(id));
  const handleFail    = (id: string) => run(id, () => failSocialPost(id, "Cowork unavailable / stalled (simulated)"));
  const handleFallback = (id: string) => run(id, () => assignSocialFallback(id, "Hermes"));
  const handleEvidence = (id: string) => {
    const url = typeof window !== "undefined"
      ? window.prompt("Published URL for this post (evidence):", "https://")
      : null;
    if (!url) return;
    run(id, () => recordSocialEvidence(id, { published_url: url, recorded_by: "Cowork" }));
  };

  async function handleBulkApprove() {
    const ids = [...selectedIds];
    setBusyId("bulk");
    try {
      for (const id of ids) await approveSocialPost(id);
      await load();
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk approve failed");
    } finally {
      setBusyId(null);
    }
  }

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const calendarCells = useMemo(() => buildCalendarGrid(calYear, calMonth), [calYear, calMonth]);

  const pendingPosts   = posts.filter((p) => p.status === "pending");
  const publishedPosts = posts.filter((p) => p.status === "published");
  const draftPosts     = posts.filter((p) => p.status === "draft");
  const failedPosts    = posts.filter((p) => p.status === "failed");
  const approvedPosts  = posts.filter((p) => p.status === "approved");
  const calPosts       = posts.filter((p) => p.status === "scheduled" || p.status === "published");

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selectedIds.size === pendingPosts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pendingPosts.map((p) => p.id)));
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Social Media</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pendingPosts.length} pending approval · {approvedPosts.length + coworkQueue.length} awaiting Cowork · {publishedPosts.length} published · {failedPosts.length} fallback
          </p>
        </div>
        <Link href="/dashboard/social/post" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
          + New Post
        </Link>
      </div>

      <HealthPanel health={health} />

      {error && (
        <div className="mb-4 rounded-lg border border-red-900/50 bg-red-900/20 px-3 py-2 text-sm text-red-400">{error}</div>
      )}

      {!loading && posts.length === 0 && !error && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-[#111827] p-6 text-center text-gray-400">
          <p className="font-medium text-white">No social records yet</p>
          <p className="text-sm mt-1">Codex drafts land here via the SocialEngine. Create one with “+ New Post”.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111827] border border-gray-800 rounded-xl p-1 mb-6 w-fit overflow-x-auto" data-demo-target="social-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            {tab.icon} {tab.label}
            {tab.id === "approval" && pendingPosts.length > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">{pendingPosts.length}</span>
            )}
            {tab.id === "cowork" && (approvedPosts.length + coworkQueue.length) > 0 && (
              <span className="ml-1.5 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{approvedPosts.length + coworkQueue.length}</span>
            )}
            {tab.id === "fallback" && failedPosts.length > 0 && (
              <span className="ml-1.5 bg-orange-500 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">{failedPosts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Calendar */}
      {activeTab === "calendar" && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); }} className="px-3 py-1.5 bg-[#111827] border border-gray-800 text-gray-400 hover:text-white rounded-lg text-sm transition-colors">←</button>
            <h2 className="text-white font-semibold text-lg">{MONTH_NAMES[calMonth]} {calYear}</h2>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); }} className="px-3 py-1.5 bg-[#111827] border border-gray-800 text-gray-400 hover:text-white rounded-lg text-sm transition-colors">→</button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => <div key={d} className="text-center text-xs text-gray-500 font-medium py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-800 border border-gray-800 rounded-xl overflow-hidden">
            {calendarCells.map((day, idx) => {
              const dayPosts = day ? postsForDay(calPosts, calYear, calMonth, day) : [];
              const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
              return (
                <div key={idx} className={`min-h-[96px] p-2 ${day ? "bg-[#111827]" : "bg-[#0d1117]"}`}>
                  {day && (
                    <>
                      <span className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full mb-1 ${isToday ? "bg-blue-600 text-white" : "text-gray-400"}`}>{day}</span>
                      <div className="space-y-0.5">
                        {dayPosts.slice(0, 3).map((p) => {
                          const meta = platformMeta(p.platform);
                          return (
                            <div key={p.id} className="text-xs px-1.5 py-0.5 rounded truncate" style={{ backgroundColor: meta.color + "33", color: meta.color }} title={(p.content || "").slice(0, 80)}>
                              {meta.icon} {(p.content || "").slice(0, 18)}…
                            </div>
                          );
                        })}
                        {dayPosts.length > 3 && <p className="text-xs text-gray-500">+{dayPosts.length - 3} more</p>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approval Queue */}
      {activeTab === "approval" && (
        <div>
          {pendingPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-medium text-white">Queue is clear</p>
              <p className="text-sm mt-1">No posts waiting for approval</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4 p-3 bg-[#111827] border border-gray-800 rounded-xl">
                <input type="checkbox" checked={selectedIds.size === pendingPosts.length && pendingPosts.length > 0} onChange={toggleSelectAll} className="accent-blue-500" />
                <span className="text-sm text-gray-400">{selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}</span>
                {selectedIds.size > 0 && (
                  <button onClick={handleBulkApprove} disabled={busyId === "bulk"} className="ml-auto px-4 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-900/50 text-sm font-medium rounded-lg transition-colors disabled:opacity-40">
                    ✓ Approve Selected ({selectedIds.size})
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingPosts.map((post) => (
                  <PostCard key={post.id} post={post} item={itemsById.get(post.id)} onApprove={handleApprove} onReject={handleReject} showBulk checked={selectedIds.has(post.id)} onCheck={toggleSelect} busy={busyId === post.id} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Cowork Queue (approved + handed) */}
      {activeTab === "cowork" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-4">
            <p className="text-sm font-medium text-white">Cowork Posting Queue</p>
            <p className="mt-1 text-sm text-gray-500">Approved items wait for a Hermes→Cowork handoff packet, then Cowork executes and returns evidence.</p>
          </div>
          {approvedPosts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Approved — ready for handoff ({approvedPosts.length})</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {approvedPosts.map((post) => (
                  <PostCard key={post.id} post={post} item={itemsById.get(post.id)} onHandoff={handleHandoff} busy={busyId === post.id} />
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 mt-4">Handed to Cowork ({coworkQueue.length})</h3>
            <CoworkQueueTable rows={coworkQueue} />
            {coworkQueue.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {posts.filter((p) => itemsById.get(p.id)?.status === "routed_to_executor").map((post) => (
                  <PostCard key={post.id} post={post} item={itemsById.get(post.id)} onEvidence={handleEvidence} onFail={handleFail} busy={busyId === post.id} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Published */}
      {activeTab === "published" && (
        <div>
          {publishedPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-500"><p className="text-4xl mb-3">📭</p><p className="font-medium text-white">Nothing published yet</p></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {publishedPosts.map((post) => <PostCard key={post.id} post={post} item={itemsById.get(post.id)} />)}
            </div>
          )}
        </div>
      )}

      {/* Fallback / Failed (Task 8) */}
      {activeTab === "fallback" && (
        <div>
          {failedPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-500"><p className="text-4xl mb-3">🟢</p><p className="font-medium text-white">No failed or stalled tasks</p><p className="text-sm mt-1">Tasks that stall in Cowork land here with an owner and next action — they never disappear.</p></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {failedPosts.map((post) => (
                <PostCard key={post.id} post={post} item={itemsById.get(post.id)} onFallback={handleFallback} onEvidence={handleEvidence} busy={busyId === post.id} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drafts */}
      {activeTab === "drafts" && (
        <div>
          {draftPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-500"><p className="text-4xl mb-3">📝</p><p className="font-medium text-white">No drafts</p><Link href="/dashboard/social/post" className="text-blue-400 text-sm hover:underline mt-2 inline-block">Create your first post →</Link></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {draftPosts.map((post) => <PostCard key={post.id} post={post} item={itemsById.get(post.id)} onSubmit={handleSubmit} busy={busyId === post.id} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
