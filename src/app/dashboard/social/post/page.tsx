"use client";

import { useState } from "react";
import Link from "next/link";
import { SOCIAL_PLATFORMS, SocialPlatformId } from "@/lib/mockData";

// ─── Constants ───────────────────────────────────────────────────────────────

const EMOTIONAL_TRIGGERS = [
  { id: "urgency",      label: "Urgency",       icon: "⚡" },
  { id: "curiosity",    label: "Curiosity",      icon: "🤔" },
  { id: "pain_point",   label: "Pain Point",     icon: "😤" },
  { id: "social_proof", label: "Social Proof",   icon: "⭐" },
  { id: "fomo",         label: "FOMO",           icon: "🔥" },
  { id: "authority",    label: "Authority",      icon: "🏆" },
  { id: "empathy",      label: "Empathy",        icon: "❤️" },
];

const CTA_OPTIONS = [
  "Comment below",
  "DM us",
  "Link in bio",
  "Comment YES for more",
  "Save this post",
  "Tag someone who needs this",
  "Book a free call",
  "Custom…",
];

const CHAR_LIMITS: Partial<Record<SocialPlatformId, number>> = {
  twitter: 280,
  facebook: 63206,
  instagram: 2200,
  linkedin: 3000,
  tiktok: 2200,
  google_business: 1500,
};

function platformMeta(id: string) {
  return SOCIAL_PLATFORMS.find((p) => p.id === id)!;
}

// ─── Preview component ────────────────────────────────────────────────────────

function PostPreview({
  platform,
  content,
  mediaUrls,
  cta,
}: {
  platform: SocialPlatformId;
  content: string;
  mediaUrls: string[];
  cta: string;
}) {
  const meta = platformMeta(platform);
  const charLimit = CHAR_LIMITS[platform];
  const displayContent = charLimit ? content.slice(0, charLimit) : content;
  const truncated = charLimit && content.length > charLimit;

  return (
    <div className="bg-[#0d1117] border border-gray-800 rounded-xl overflow-hidden">
      {/* Platform header */}
      <div
        className="px-4 py-3 flex items-center gap-2 border-b border-gray-800"
        style={{ borderLeftWidth: 4, borderLeftColor: meta.color }}
      >
        <span className="text-lg">{meta.icon}</span>
        <span className="text-white font-semibold text-sm">{meta.name}</span>
        {charLimit && (
          <span
            className={`ml-auto text-xs ${
              content.length > charLimit ? "text-red-400" : "text-gray-500"
            }`}
          >
            {content.length}/{charLimit}
          </span>
        )}
      </div>

      {/* Post body mock */}
      <div className="p-4">
        {/* Fake profile row */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: meta.color }}
          >
            O
          </div>
          <div>
            <p className="text-white text-xs font-semibold">OttoServ</p>
            <p className="text-gray-500 text-xs">Just now</p>
          </div>
        </div>

        {/* Content */}
        {displayContent ? (
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
            {displayContent}
            {truncated && (
              <span className="text-gray-500 text-xs"> … [truncated at {charLimit} chars]</span>
            )}
          </p>
        ) : (
          <p className="text-gray-600 text-sm italic">Write something to see the preview…</p>
        )}

        {/* CTA */}
        {cta && (
          <p className="mt-2 text-sm" style={{ color: meta.color }}>
            → {cta}
          </p>
        )}

        {/* Media placeholders */}
        {mediaUrls.filter(Boolean).length > 0 && (
          <div
            className={`mt-3 grid gap-2 ${
              mediaUrls.filter(Boolean).length === 1 ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            {mediaUrls.filter(Boolean).map((url, i) => (
              <div
                key={i}
                className="bg-gray-800 rounded-lg h-32 flex items-center justify-center text-gray-500 text-xs border border-gray-700"
              >
                {url.match(/\.(mp4|mov|webm)$/i) ? "🎬 Video" : "🖼 Image"} #{i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Engagement bar */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-800 text-xs text-gray-600">
          <span>👍 Like</span>
          <span>💬 Comment</span>
          <span>↗️ Share</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PostCreatorPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatformId[]>(["facebook"]);
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>(["", ""]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [emotionalTrigger, setEmotionalTrigger] = useState("");
  const [cta, setCta] = useState("");
  const [customCta, setCustomCta] = useState("");
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatformId>("facebook");
  const [submitted, setSubmitted] = useState<"draft" | "approval" | null>(null);

  const effectiveCta = cta === "Custom…" ? customCta : cta;

  function togglePlatform(id: SocialPlatformId) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    if (!selectedPlatforms.includes(id)) setPreviewPlatform(id);
  }

  function addMediaSlot() {
    setMediaUrls((prev) => [...prev, ""]);
  }

  function updateMedia(idx: number, val: string) {
    setMediaUrls((prev) => prev.map((u, i) => (i === idx ? val : u)));
  }

  function removeMedia(idx: number) {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(mode: "draft" | "approval") {
    setSubmitted(mode);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-5xl mb-4">{submitted === "draft" ? "📝" : "🚀"}</p>
        <h2 className="text-white text-2xl font-bold mb-2">
          {submitted === "draft" ? "Saved as Draft" : "Submitted for Approval"}
        </h2>
        <p className="text-gray-500 mb-6">
          {submitted === "draft"
            ? "Find it in the Drafts tab when you're ready to submit."
            : "Your post is in the Approval Queue. You'll be notified once it's reviewed."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setSubmitted(null)}
            className="px-4 py-2 bg-[#111827] hover:bg-gray-800 text-gray-300 border border-gray-700 rounded-lg text-sm transition-colors"
          >
            Create Another
          </button>
          <Link
            href="/dashboard/social"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            Back to Social Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/social" className="text-gray-500 hover:text-white text-sm transition-colors">
              ← Social Hub
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">Create Post</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Left: Form ──────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Platform selector */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3">Platforms</h2>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.map((p) => {
                const active = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      active
                        ? "text-white border-transparent"
                        : "bg-[#0d1117] text-gray-500 border-gray-800 hover:text-gray-300"
                    }`}
                    style={active ? { backgroundColor: p.color + "33", borderColor: p.color, color: p.color } : {}}
                  >
                    {p.icon} {p.name}
                  </button>
                );
              })}
            </div>
            {selectedPlatforms.length === 0 && (
              <p className="text-yellow-400 text-xs mt-2">Select at least one platform</p>
            )}
          </div>

          {/* Content */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3">Content</h2>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Write your post here. Start with a hook — the first line is what stops the scroll…"
              className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-4 py-3 text-gray-200 text-sm resize-none focus:outline-none focus:border-blue-600 placeholder:text-gray-600"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-600">{content.length} chars</span>
              {selectedPlatforms.map((pid) => {
                const limit = CHAR_LIMITS[pid];
                if (!limit) return null;
                const over = content.length > limit;
                return (
                  <span key={pid} className={`text-xs ${over ? "text-red-400" : "text-gray-600"}`}>
                    {platformMeta(pid).name}: {content.length}/{limit}
                    {over ? " ⚠️" : ""}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Media */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold">Media URLs</h2>
              <button
                onClick={addMediaSlot}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                + Add media
              </button>
            </div>
            <div className="space-y-2">
              {mediaUrls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={url}
                    onChange={(e) => updateMedia(i, e.target.value)}
                    placeholder={`https://… (image or video ${i + 1})`}
                    className="flex-1 bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-blue-600 placeholder:text-gray-600"
                  />
                  <button
                    onClick={() => removeMedia(i)}
                    className="px-2 text-gray-600 hover:text-red-400 text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3">Schedule</h2>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-blue-600 [color-scheme:dark]"
            />
            {!scheduledAt && (
              <p className="text-gray-600 text-xs mt-2">Leave blank to save as draft without a scheduled time</p>
            )}
          </div>

          {/* Emotional trigger + CTA */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3">Emotional Trigger</h2>
            <div className="flex flex-wrap gap-2 mb-5">
              {EMOTIONAL_TRIGGERS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setEmotionalTrigger(emotionalTrigger === t.id ? "" : t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    emotionalTrigger === t.id
                      ? "bg-purple-900/40 text-purple-300 border-purple-700"
                      : "bg-[#0d1117] text-gray-500 border-gray-800 hover:text-gray-300"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <h2 className="text-white font-semibold mb-3">Call to Action</h2>
            <div className="flex flex-wrap gap-2">
              {CTA_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setCta(cta === opt ? "" : opt)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    cta === opt
                      ? "bg-blue-900/40 text-blue-300 border-blue-700"
                      : "bg-[#0d1117] text-gray-500 border-gray-800 hover:text-gray-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {cta === "Custom…" && (
              <input
                value={customCta}
                onChange={(e) => setCustomCta(e.target.value)}
                placeholder="Enter your custom CTA…"
                className="mt-3 w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-blue-600 placeholder:text-gray-600"
              />
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit("draft")}
              disabled={!content.trim()}
              className="flex-1 py-3 bg-[#1f2937] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 border border-gray-700 rounded-xl font-medium text-sm transition-colors"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit("approval")}
              disabled={!content.trim() || selectedPlatforms.length === 0}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors"
            >
              Submit for Approval
            </button>
          </div>
        </div>

        {/* ── Right: Preview ────────────────────────────────────────────────── */}
        <div>
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold">Preview</h2>
              {selectedPlatforms.length > 1 && (
                <div className="flex gap-1">
                  {selectedPlatforms.map((pid) => {
                    const meta = platformMeta(pid);
                    return (
                      <button
                        key={pid}
                        onClick={() => setPreviewPlatform(pid)}
                        className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                          previewPlatform === pid
                            ? "text-white border-transparent"
                            : "bg-[#111827] text-gray-500 border-gray-800"
                        }`}
                        style={previewPlatform === pid ? { backgroundColor: meta.color + "33", borderColor: meta.color, color: meta.color } : {}}
                      >
                        {meta.icon}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedPlatforms.length > 0 ? (
              <PostPreview
                platform={selectedPlatforms.includes(previewPlatform) ? previewPlatform : selectedPlatforms[0]}
                content={content}
                mediaUrls={mediaUrls}
                cta={effectiveCta}
              />
            ) : (
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center text-gray-600 text-sm">
                Select a platform to see the preview
              </div>
            )}

            {/* Post summary */}
            <div className="mt-4 bg-[#111827] border border-gray-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span>Platforms</span>
                <span className="text-gray-300">
                  {selectedPlatforms.length > 0
                    ? selectedPlatforms.map((pid) => platformMeta(pid).icon).join(" ")
                    : "None"}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Schedule</span>
                <span className="text-gray-300">
                  {scheduledAt
                    ? new Date(scheduledAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                    : "No schedule"}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Trigger</span>
                <span className="text-gray-300">
                  {emotionalTrigger
                    ? EMOTIONAL_TRIGGERS.find((t) => t.id === emotionalTrigger)?.label ?? "—"
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>CTA</span>
                <span className="text-gray-300 truncate max-w-[160px]">
                  {effectiveCta || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
