"use client";

import { useState } from "react";
import { mockMarketingPosts, MarketingPost } from "@/lib/mockData";

const PLATFORM_ICONS: Record<string, string> = {
  Facebook: "📘",
  Instagram: "📸",
  Twitter: "🐦",
  LinkedIn: "💼",
};

const PLATFORM_COLORS: Record<string, string> = {
  Facebook: "bg-blue-900/40 text-blue-400 border-blue-800",
  Instagram: "bg-pink-900/40 text-pink-400 border-pink-800",
  Twitter: "bg-sky-900/40 text-sky-400 border-sky-800",
  LinkedIn: "bg-blue-900/40 text-blue-400 border-blue-800",
};

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-900/40 text-green-400 border-green-800",
  scheduled: "bg-blue-900/40 text-blue-400 border-blue-800",
  draft: "bg-gray-800 text-gray-400 border-gray-700",
  pending_approval: "bg-orange-900/40 text-orange-400 border-orange-800",
};

const TABS = ["all", "published", "scheduled", "draft"] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MarketingPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [editingPost, setEditingPost] = useState<MarketingPost | null>(null);

  const filtered =
    tab === "all" ? mockMarketingPosts : mockMarketingPosts.filter((p) => p.status === tab);

  const publishedCount = mockMarketingPosts.filter((p) => p.status === "published").length;
  const scheduledCount = mockMarketingPosts.filter((p) => p.status === "scheduled").length;
  const draftCount = mockMarketingPosts.filter((p) => p.status === "draft").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketing</h1>
          <p className="text-gray-500 text-sm mt-1">
            {publishedCount} published · {scheduledCount} scheduled · {draftCount} drafts
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Create Post
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Total Likes",
            value: mockMarketingPosts.reduce((s, p) => s + p.likes, 0),
            icon: "❤️",
            color: "text-red-400",
          },
          {
            label: "Total Comments",
            value: mockMarketingPosts.reduce((s, p) => s + p.comments, 0),
            icon: "💬",
            color: "text-blue-400",
          },
          {
            label: "Posts This Month",
            value: publishedCount + scheduledCount,
            icon: "📅",
            color: "text-purple-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center gap-4"
          >
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-400 text-sm">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-blue-600 text-white"
                : "bg-[#111827] text-gray-400 hover:text-white border border-gray-800"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((post) => (
          <div
            key={post.id}
            className="bg-[#111827] border border-gray-800 rounded-xl p-5 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{PLATFORM_ICONS[post.platform] ?? "📱"}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${
                    PLATFORM_COLORS[post.platform] ?? "bg-gray-800 text-gray-400"
                  }`}
                >
                  {post.platform}
                </span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded border ${
                  STATUS_COLORS[post.status] ?? "bg-gray-800 text-gray-400"
                }`}
              >
                {post.status}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-white font-semibold text-sm mb-2 leading-snug">{post.title}</h3>

            {/* Content preview */}
            <p className="text-gray-400 text-sm leading-relaxed flex-1 line-clamp-3">
              {post.content}
            </p>

            {/* Date */}
            <div className="mt-3 pt-3 border-t border-gray-800">
              {post.published_at && (
                <p className="text-gray-500 text-xs">Published {formatDate(post.published_at)}</p>
              )}
              {post.scheduled_for && (
                <p className="text-blue-400 text-xs">Scheduled {formatDate(post.scheduled_for)}</p>
              )}
              {!post.published_at && !post.scheduled_for && (
                <p className="text-gray-600 text-xs">Draft — not scheduled</p>
              )}
            </div>

            {/* Engagement */}
            {(post.likes > 0 || post.comments > 0) && (
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                <span>❤️ {post.likes}</span>
                <span>💬 {post.comments}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              {post.status === "draft" && (
                <>
                  <button
                    onClick={() => setEditingPost(post)}
                    className="flex-1 py-1.5 text-xs bg-[#1f2937] hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button className="flex-1 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40 rounded-lg transition-colors">
                    Schedule
                  </button>
                </>
              )}
              {post.status === "scheduled" && (
                <>
                  <button
                    onClick={() => setEditingPost(post)}
                    className="flex-1 py-1.5 text-xs bg-[#1f2937] hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button className="flex-1 py-1.5 text-xs bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40 rounded-lg transition-colors">
                    Unschedule
                  </button>
                </>
              )}
              {post.status === "published" && (
                <button className="flex-1 py-1.5 text-xs bg-[#1f2937] hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg transition-colors">
                  View Post
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Create new post card */}
        <button className="bg-[#111827] border-2 border-dashed border-gray-700 hover:border-blue-700 rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-colors min-h-[200px]">
          <span className="text-3xl">✍️</span>
          <div className="text-center">
            <p className="text-gray-400 font-medium text-sm">Create New Post</p>
            <p className="text-gray-600 text-xs mt-1">Draft, schedule, or post directly</p>
          </div>
        </button>
      </div>

      {/* Edit Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditingPost(null)} />
          <div className="relative bg-[#111827] border border-gray-700 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold">Edit Post</h2>
              <button
                onClick={() => setEditingPost(null)}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Title</label>
                <input
                  type="text"
                  defaultValue={editingPost.title}
                  className="w-full bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Content</label>
                <textarea
                  rows={4}
                  defaultValue={editingPost.content}
                  className="w-full bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Platform</label>
                <select
                  defaultValue={editingPost.platform}
                  className="w-full bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                >
                  <option>Facebook</option>
                  <option>Instagram</option>
                  <option>Twitter</option>
                  <option>LinkedIn</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingPost(null)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingPost(null)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
