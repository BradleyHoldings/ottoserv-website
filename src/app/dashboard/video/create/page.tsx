"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { mockVideoTemplates, mockBrandProfile } from "@/lib/mockData";

const PLATFORMS   = ["Instagram Reels", "TikTok", "YouTube", "LinkedIn", "Facebook", "Internal / Slack", "Twitter/X"];
const ASPECT_RATIOS = ["9:16", "16:9", "1:1"] as const;
const PRIORITIES  = ["Low", "Medium", "High", "Urgent"];
const DURATIONS   = ["15s", "30s", "60s", "90s", "2min", "3min", "5min+"];
const AUDIENCES   = [
  "Property Managers",
  "Field Service Owners",
  "Small Business Teams",
  "Contractors",
  "Internal Team",
];

function CreateVideoForm() {
  const searchParams   = useSearchParams();
  const router         = useRouter();
  const defaultTemplate = searchParams.get("template") ?? "";

  const [form, setForm] = useState({
    purpose:         "",
    platform:        "",
    aspect_ratio:    "16:9",
    template:        defaultTemplate,
    script:          "",
    hook:            "",
    cta:             "",
    brand_profile:   mockBrandProfile.name,
    target_duration: "60s",
    audience:        "",
    priority:        "Medium",
  });

  const [submitted, setSubmitted] = useState(false);

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => router.push("/dashboard/video"), 1500);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-5xl">🎬</div>
          <p className="text-white font-semibold text-xl">Video request submitted!</p>
          <p className="text-gray-400 text-sm">Redirecting to Video Studio…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Purpose */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Purpose *</label>
        <input
          type="text"
          required
          value={form.purpose}
          onChange={(e) => set("purpose", e.target.value)}
          placeholder="e.g. Showcase lead automation for Instagram"
          className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Platform + Aspect Ratio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Platform *</label>
          <select
            required
            value={form.platform}
            onChange={(e) => set("platform", e.target.value)}
            className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Select platform</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
          <div className="flex gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => set("aspect_ratio", ratio)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  form.aspect_ratio === ratio
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-[#1a1f2e] border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Template</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {mockVideoTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => set("template", tpl.id)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                form.template === tpl.id
                  ? "bg-blue-600/20 border-blue-500 text-white"
                  : "bg-[#1a1f2e] border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              <p className="font-medium text-sm">{tpl.name}</p>
              <p className="text-xs mt-0.5 opacity-70">
                {tpl.aspect_ratio} · {tpl.category}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Hook */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Hook *</label>
        <input
          type="text"
          required
          value={form.hook}
          onChange={(e) => set("hook", e.target.value)}
          placeholder="e.g. What if your leads followed up themselves?"
          className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Script */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Script *</label>
        <textarea
          required
          rows={5}
          value={form.script}
          onChange={(e) => set("script", e.target.value)}
          placeholder="Write the full video script here…"
          className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {/* CTA */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Call to Action *</label>
        <input
          type="text"
          required
          value={form.cta}
          onChange={(e) => set("cta", e.target.value)}
          placeholder="e.g. Book a free demo today"
          className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Duration + Audience + Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Target Duration</label>
          <select
            value={form.target_duration}
            onChange={(e) => set("target_duration", e.target.value)}
            className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
          <select
            value={form.audience}
            onChange={(e) => set("audience", e.target.value)}
            className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Select audience</option>
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
          <select
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
            className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Brand Profile */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Brand Profile</label>
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">O</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">{mockBrandProfile.name}</p>
            <p className="text-gray-500 text-xs">
              {mockBrandProfile.font} · {mockBrandProfile.tone}
            </p>
          </div>
          <div className="flex gap-2">
            <div
              className="w-5 h-5 rounded-full border border-gray-600"
              style={{ backgroundColor: mockBrandProfile.primary }}
            />
            <div
              className="w-5 h-5 rounded-full border border-gray-600"
              style={{ backgroundColor: mockBrandProfile.secondary }}
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
        >
          Generate Video
        </button>
        <Link
          href="/dashboard/video"
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg border border-gray-700 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

export default function CreateVideoPage() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/video"
          className="text-gray-500 hover:text-gray-300 text-sm mb-3 inline-block"
        >
          ← Back to Video Studio
        </Link>
        <h1 className="text-2xl font-bold text-white">New Video Request</h1>
        <p className="text-gray-400 text-sm mt-1">
          Define your video and let the AI agent generate it
        </p>
      </div>
      <Suspense fallback={<div className="text-gray-400 text-sm">Loading…</div>}>
        <CreateVideoForm />
      </Suspense>
    </div>
  );
}
