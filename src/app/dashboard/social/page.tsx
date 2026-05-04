"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { mockSocialPosts, SOCIAL_PLATFORMS, SocialPost } from "@/lib/mockData";
import { getPlatformSocialPosts } from "@/lib/dashboardApi";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const POST_STATUS_COLORS: Record<SocialPost["status"], string> = {
  draft:     "bg-gray-800 text-gray-400 border-gray-700",
  pending:   "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  approved:  "bg-blue-900/40 text-blue-400 border-blue-800",
  scheduled: "bg-purple-900/40 text-purple-400 border-purple-800",
  published: "bg-green-900/40 text-green-400 border-green-800",
  rejected:  "bg-red-900/40 text-red-400 border-red-800",
  failed:    "bg-red-900/40 text-orange-400 border-orange-800",
};

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

// ─── Post Card ───────────────────────────────────────────────────────────────

function PostCard({
  post,
  onApprove,
  onReject,
  showBulk,
  checked,
  onCheck,
}: {
  post: SocialPost;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showBulk?: boolean;
  checked?: boolean;
  onCheck?: (id: string) => void;
}) {
  const meta = platformMeta(post.platform);
  const statusCls = POST_STATUS_COLORS[post.status];

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
      {/* Platform color bar */}
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
            {/* Header row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ backgroundColor: meta.color + "22", color: meta.color }}
              >
                {meta.icon} {meta.name}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded border ${statusCls}`}>
                {post.status}
              </span>
              {post.created_by_agent && (
                <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-900/50">
                  🤖 {post.created_by_agent}
                </span>
              )}
            </div>

            {/* Content preview */}
            <p className="text-gray-300 text-sm leading-snug mb-2 line-clamp-3">
              {post.content.slice(0, 160)}{post.content.length > 160 ? "…" : ""}
            </p>

            {/* Rejection reason */}
            {post.rejection_reason && (
              <div className="bg-red-900/20 border border-red-900/40 rounded-lg p-2 mb-2">
                <p className="text-red-400 text-xs">
                  <span className="font-medium">Rejected: </span>{post.rejection_reason}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {post.scheduled_at && (
                  <span>📅 {fmtDatetime(post.scheduled_at)}</span>
                )}
                {post.published_at && (
                  <span>✅ Published {fmtDate(post.published_at)}</span>
                )}
                {post.emotional_trigger && (
                  <span className="text-gray-600">#{post.emotional_trigger}</span>
                )}
              </div>

              {/* Engagement */}
              {post.engagement && (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>❤️ {post.engagement.likes}</span>
                  <span>💬 {post.engagement.comments}</span>
                  <span>↗️ {post.engagement.shares}</span>
                  <span>👁 {post.engagement.reach.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {(onApprove || onReject) && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
            {onApprove && (
              <button
                onClick={() => onApprove(post.id)}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-900/50 transition-colors"
              >
                ✓ Approve
              </button>
            )}
            {onReject && (
              <button
                onClick={() => onReject(post.id)}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40 transition-colors"
              >
                ✕ Reject
              </button>
            )}
            <Link
              href="/dashboard/social/post"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1f2937] hover:bg-gray-700 text-gray-400 border border-gray-700 transition-colors"
            >
              Edit
            </Link>
          </div>
        )}

        {/* Draft actions */}
        {post.status === "draft" && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
            <Link
              href="/dashboard/social/post"
              className="flex-1 py-1.5 text-xs font-medium text-center rounded-lg bg-[#1f2937] hover:bg-gray-700 text-gray-400 border border-gray-700 transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={() => onApprove?.(post.id)}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40 transition-colors"
            >
              Submit for Approval
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = "calendar" | "approval" | "published" | "drafts";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "calendar", label: "Content Calendar", icon: "📅" },
  { id: "approval", label: "Approval Queue", icon: "⏳" },
  { id: "published", label: "Published", icon: "✅" },
  { id: "drafts", label: "Drafts", icon: "📝" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [posts, setPosts] = useState<SocialPost[]>(mockSocialPosts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getPlatformSocialPosts().then((realPosts) => {
      if (realPosts && realPosts.length > 0) setPosts(realPosts);
    });
  }, []);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const calendarCells = useMemo(() => buildCalendarGrid(calYear, calMonth), [calYear, calMonth]);

  const pendingPosts   = posts.filter((p) => p.status === "pending");
  const publishedPosts = posts.filter((p) => p.status === "published");
  const draftPosts     = posts.filter((p) => p.status === "draft");
  const calPosts       = posts.filter((p) => p.status === "scheduled" || p.status === "published");

  function handleApprove(id: string) {
    setPosts((prev) =>
      prev.map((p) => p.id === id ? { ...p, status: "approved" as const, approval_status: "approved" as const } : p)
    );
    setSelectedIds((s) => { const n = new Set(s); n.delete(id); return n; });
  }

  function handleReject(id: string) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "rejected" as const, approval_status: "rejected" as const, rejection_reason: "Rejected via dashboard" }
          : p
      )
    );
    setSelectedIds((s) => { const n = new Set(s); n.delete(id); return n; });
  }

  function handleBulkApprove() {
    setPosts((prev) =>
      prev.map((p) =>
        selectedIds.has(p.id)
          ? { ...p, status: "approved" as const, approval_status: "approved" as const }
          : p
      )
    );
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === pendingPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingPosts.map((p) => p.id)));
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Social Media</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pendingPosts.length} pending approval · {calPosts.length} scheduled · {draftPosts.length} drafts
          </p>
        </div>
        <Link
          href="/dashboard/social/post"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Post
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111827] border border-gray-800 rounded-xl p-1 mb-6 w-fit" data-demo-target="social-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.icon} {tab.label}
            {tab.id === "approval" && pendingPosts.length > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
                {pendingPosts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Calendar Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "calendar" && (
        <div>
          {/* Month nav */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
                else setCalMonth((m) => m - 1);
              }}
              className="px-3 py-1.5 bg-[#111827] border border-gray-800 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
            >
              ←
            </button>
            <h2 className="text-white font-semibold text-lg">
              {MONTH_NAMES[calMonth]} {calYear}
            </h2>
            <button
              onClick={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
                else setCalMonth((m) => m + 1);
              }}
              className="px-3 py-1.5 bg-[#111827] border border-gray-800 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
            >
              →
            </button>
          </div>

          {/* Day header */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-xs text-gray-500 font-medium py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-px bg-gray-800 border border-gray-800 rounded-xl overflow-hidden">
            {calendarCells.map((day, idx) => {
              const dayPosts = day ? postsForDay(calPosts, calYear, calMonth, day) : [];
              const isToday =
                day === now.getDate() &&
                calMonth === now.getMonth() &&
                calYear === now.getFullYear();

              return (
                <div
                  key={idx}
                  className={`min-h-[96px] p-2 ${
                    day ? "bg-[#111827]" : "bg-[#0d1117]"
                  }`}
                >
                  {day && (
                    <>
                      <span
                        className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full mb-1 ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : "text-gray-400"
                        }`}
                      >
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {dayPosts.slice(0, 3).map((p) => {
                          const meta = platformMeta(p.platform);
                          return (
                            <div
                              key={p.id}
                              className="text-xs px-1.5 py-0.5 rounded truncate"
                              style={{ backgroundColor: meta.color + "33", color: meta.color }}
                              title={p.content.slice(0, 80)}
                            >
                              {meta.icon} {p.content.slice(0, 18)}…
                            </div>
                          );
                        })}
                        {dayPosts.length > 3 && (
                          <p className="text-xs text-gray-500">+{dayPosts.length - 3} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Approval Queue Tab ────────────────────────────────────────────────── */}
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
              {/* Bulk controls */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-[#111827] border border-gray-800 rounded-xl">
                <input
                  type="checkbox"
                  checked={selectedIds.size === pendingPosts.length}
                  onChange={toggleSelectAll}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                </span>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleBulkApprove}
                    className="ml-auto px-4 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-900/50 text-sm font-medium rounded-lg transition-colors"
                  >
                    ✓ Approve Selected ({selectedIds.size})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    showBulk
                    checked={selectedIds.has(post.id)}
                    onCheck={toggleSelect}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Published Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "published" && (
        <div>
          {publishedPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-medium text-white">Nothing published yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {publishedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Drafts Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "drafts" && (
        <div>
          {draftPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">📝</p>
              <p className="font-medium text-white">No drafts</p>
              <Link href="/dashboard/social/post" className="text-blue-400 text-sm hover:underline mt-2 inline-block">
                Create your first post →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {draftPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onApprove={(id) =>
                    setPosts((prev) =>
                      prev.map((p) =>
                        p.id === id
                          ? { ...p, status: "pending" as const, approval_status: "pending_review" as const }
                          : p
                      )
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
