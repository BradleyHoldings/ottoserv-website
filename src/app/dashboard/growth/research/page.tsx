"use client";

import { useState } from "react";
import Link from "next/link";
import { mockNVP } from "@/lib/mockData";

// ── Mock research data (local, not in mockData.ts) ────────────────────────────

interface ResearchEntry {
  id: string;
  niche: string;
  source: string;
  source_type: "reddit" | "forum" | "review" | "survey" | "interview" | "social";
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  themes: string[];
  collected_at: string;
}

const mockResearchFeed: ResearchEntry[] = [
  {
    id: "RES-001",
    niche: "property_management",
    source: "r/propertymanagement",
    source_type: "reddit",
    content:
      "We had a tenant leave after 4 years because maintenance took 3 weeks to fix a leaking faucet. She was otherwise happy and paid on time. I can't stop thinking about how avoidable that was.",
    sentiment: "negative",
    themes: ["maintenance delays", "tenant retention", "avoidable churn"],
    collected_at: "2026-04-28",
  },
  {
    id: "RES-002",
    niche: "property_management",
    source: "BiggerPockets Forum",
    source_type: "forum",
    content:
      "The difference between 8% and 4% vacancy rate across my 120-unit portfolio is about $58k/year in lost rent. I used to think vacancy was just part of the game. Now I treat every empty day like money out of my pocket.",
    sentiment: "neutral",
    themes: ["vacancy loss", "NOI", "portfolio math", "mindset shift"],
    collected_at: "2026-04-27",
  },
  {
    id: "RES-003",
    niche: "property_management",
    source: "Google Reviews — PropertyWare",
    source_type: "review",
    content:
      "The software promised 'seamless onboarding' but took 6 weeks to get fully set up. My team stopped using it after month 2. I've been burned by software promises before — I need proof of fast setup before I'll try anything new.",
    sentiment: "negative",
    themes: ["onboarding friction", "adoption failure", "software skepticism", "trust deficit"],
    collected_at: "2026-04-26",
  },
  {
    id: "RES-004",
    niche: "property_management",
    source: "PM Industry Survey 2026",
    source_type: "survey",
    content:
      "68% of property managers report that delinquency is their #1 operational stressor. Of those, only 24% have a documented early-warning process. Most respond reactively after the 5th of the month.",
    sentiment: "neutral",
    themes: ["delinquency", "reactive ops", "stress", "process gaps"],
    collected_at: "2026-04-25",
  },
  {
    id: "RES-005",
    niche: "property_management",
    source: "Operator Interview — 200-unit PM, Phoenix",
    source_type: "interview",
    content:
      "The thing that actually moved my renewal rate from 61% to 78% wasn't the unit upgrades — it was calling every tenant at day 60 of their lease just to check in. No agenda. Just 'how's everything going?' People renew when they feel seen.",
    sentiment: "positive",
    themes: ["tenant retention", "proactive communication", "lease renewal", "human touch"],
    collected_at: "2026-04-24",
  },
  {
    id: "RES-006",
    niche: "property_management",
    source: "LinkedIn Comments — PM niche",
    source_type: "social",
    content:
      "Every PM I know has a maintenance backlog they're embarrassed by. It's not laziness — it's volume. When you have 180 units and 2 maintenance people, the math just doesn't work. I need help with triage, not more work orders.",
    sentiment: "negative",
    themes: ["maintenance backlog", "staffing constraints", "triage", "scale problems"],
    collected_at: "2026-04-23",
  },
];

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: "connected" | "pending" | "disconnected";
  last_pulled: string | null;
  entry_count: number;
}

const mockDataSources: DataSource[] = [
  { id: "DS-001", name: "r/propertymanagement", type: "Reddit", status: "connected", last_pulled: "2026-04-28", entry_count: 142 },
  { id: "DS-002", name: "BiggerPockets Forum", type: "Forum Scrape", status: "connected", last_pulled: "2026-04-27", entry_count: 88 },
  { id: "DS-003", name: "Google Reviews (PM Software)", type: "Review Aggregator", status: "connected", last_pulled: "2026-04-26", entry_count: 54 },
  { id: "DS-004", name: "PM Industry Survey 2026", type: "Survey Data", status: "connected", last_pulled: "2026-04-25", entry_count: 12 },
  { id: "DS-005", name: "LinkedIn PM Community", type: "Social Listening", status: "pending", last_pulled: null, entry_count: 0 },
  { id: "DS-006", name: "Operator Interviews", type: "Qualitative", status: "connected", last_pulled: "2026-04-24", entry_count: 7 },
];

// ── Components ────────────────────────────────────────────────────────────────

const SENTIMENT_COLORS = {
  positive: "bg-green-900/40 text-green-400 border-green-800",
  negative: "bg-red-900/40 text-red-400 border-red-800",
  neutral: "bg-gray-800 text-gray-400 border-gray-700",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  forum: "Forum",
  review: "Review",
  survey: "Survey",
  interview: "Interview",
  social: "Social",
};

function ResearchCard({ entry }: { entry: ResearchEntry }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded border bg-gray-800 text-gray-400 border-gray-700">
          {SOURCE_TYPE_LABELS[entry.source_type]}
        </span>
        <span className="text-gray-500 text-xs">{entry.source}</span>
        <span
          className={`ml-auto text-xs px-2 py-0.5 rounded border font-medium ${
            SENTIMENT_COLORS[entry.sentiment]
          }`}
        >
          {entry.sentiment}
        </span>
      </div>
      <p className="text-gray-300 text-sm leading-relaxed">{entry.content}</p>
      <div className="flex flex-wrap gap-1.5">
        {entry.themes.map((theme) => (
          <span
            key={theme}
            className="text-xs px-2 py-0.5 rounded border bg-violet-900/20 text-violet-400 border-violet-900"
          >
            {theme}
          </span>
        ))}
      </div>
      <p className="text-gray-600 text-xs">{entry.collected_at}</p>
    </div>
  );
}

function StartResearchModal({ onClose }: { onClose: () => void }) {
  const [niche, setNiche] = useState("property_management");
  const [sources, setSources] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1117] border border-gray-800 rounded-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Start Research</h2>
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
            <label className="text-gray-400 text-xs block mb-1.5">Sources (comma-separated)</label>
            <textarea
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              rows={3}
              placeholder="e.g. r/propertymanagement, BiggerPockets, G2 reviews..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>
          <p className="text-gray-500 text-xs">
            The research agent will scrape and analyze each source, extract themes and sentiment,
            and update the Niche Voice Profile with new findings.
          </p>
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
            Start Research
          </button>
        </div>
      </div>
    </div>
  );
}

// ── NVP Detail View ───────────────────────────────────────────────────────────

function NVPDetail() {
  const nvp = mockNVP;
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-base">{nvp.display_name} Voice Profile</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            v{nvp.version} · Last refreshed {nvp.last_refreshed} · {nvp.niche}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded border bg-green-900/40 text-green-400 border-green-800">
            {nvp.confidence}% confidence
          </span>
          <button className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">
            Refresh NVP
          </button>
        </div>
      </div>

      {/* Tone rules */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">
          Tone Rules
        </p>
        <ul className="space-y-2">
          {nvp.tone_rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-blue-500 mt-0.5 flex-shrink-0">›</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Banned phrases */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">
          Banned Phrases
        </p>
        <div className="flex flex-wrap gap-2">
          {nvp.banned_phrases.map((phrase) => (
            <span
              key={phrase}
              className="text-xs px-2 py-1 rounded border bg-red-900/20 text-red-400 border-red-900"
            >
              ✗ {phrase}
            </span>
          ))}
        </div>
      </div>

      {/* Vocabulary */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">
          Vocabulary
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-xs mb-2">Preferred</p>
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
            <p className="text-gray-500 text-xs mb-2">Avoided</p>
            <div className="flex flex-wrap gap-1.5">
              {nvp.vocabulary.avoided.map((word) => (
                <span
                  key={word}
                  className="text-xs px-2 py-0.5 rounded border bg-gray-800 text-gray-500 border-gray-700"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Triggers */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">
          Triggers
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-xs mb-2">Emotional</p>
            <ul className="space-y-1">
              {nvp.triggers.emotional.map((t, i) => (
                <li key={i} className="text-gray-300 text-sm flex gap-2">
                  <span className="text-pink-500 flex-shrink-0">♥</span> {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-2">Logical</p>
            <ul className="space-y-1">
              {nvp.triggers.logical.map((t, i) => (
                <li key={i} className="text-gray-300 text-sm flex gap-2">
                  <span className="text-blue-500 flex-shrink-0">📊</span> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Objections */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">
          Common Objections
        </p>
        <ul className="space-y-2">
          {nvp.objections.map((obj, i) => (
            <li key={i} className="text-gray-300 text-sm flex gap-2">
              <span className="text-red-500 flex-shrink-0 mt-0.5">!</span>
              {obj}
            </li>
          ))}
        </ul>
      </div>

      {/* Trust signals */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">
          Trust Signals
        </p>
        <ul className="space-y-2">
          {nvp.trust_signals.map((sig, i) => (
            <li key={i} className="text-gray-300 text-sm flex gap-2">
              <span className="text-green-500 flex-shrink-0">✓</span>
              {sig}
            </li>
          ))}
        </ul>
      </div>

      {/* Archetypes */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">
          Buyer Archetypes
        </p>
        <div className="space-y-3">
          {nvp.archetypes.map((arch) => (
            <div key={arch.name} className="border border-gray-800 rounded-lg p-3 bg-gray-800/40">
              <p className="text-white text-sm font-semibold mb-1">{arch.name}</p>
              <p className="text-gray-400 text-sm">{arch.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [activeSection, setActiveSection] = useState<"nvp" | "feed" | "sources">("nvp");
  const [showStartResearch, setShowStartResearch] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");

  const filteredFeed =
    sentimentFilter === "all"
      ? mockResearchFeed
      : mockResearchFeed.filter((e) => e.sentiment === sentimentFilter);

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
            <span className="text-white text-sm font-medium">Research & Voice Profiles</span>
          </div>
          <h1 className="text-white text-xl font-bold">Research & Voice Profiles</h1>
        </div>
        <button
          onClick={() => setShowStartResearch(true)}
          className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          + Start Research
        </button>
      </div>

      {/* Section nav */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {[
          { id: "nvp", label: "Voice Profile" },
          { id: "feed", label: "Research Feed" },
          { id: "sources", label: "Data Sources" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id as typeof activeSection)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeSection === s.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Voice Profile */}
      {activeSection === "nvp" && <NVPDetail />}

      {/* Research Feed */}
      {activeSection === "feed" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {(["all", "positive", "negative", "neutral"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSentimentFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                    sentimentFilter === s
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <span className="text-gray-500 text-xs ml-auto">
              {filteredFeed.length} entries
            </span>
          </div>
          <div className="space-y-3">
            {filteredFeed.map((entry) => (
              <ResearchCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* Data Sources */}
      {activeSection === "sources" && (
        <div className="space-y-3">
          {mockDataSources.map((src) => (
            <div
              key={src.id}
              className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{src.name}</p>
                <p className="text-gray-500 text-xs">
                  {src.type}
                  {src.last_pulled ? ` · Last pulled ${src.last_pulled}` : ""}
                  {src.entry_count > 0 ? ` · ${src.entry_count} entries` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {src.status === "connected" ? (
                  <span className="text-xs px-2 py-0.5 rounded border bg-green-900/40 text-green-400 border-green-800">
                    Connected
                  </span>
                ) : src.status === "pending" ? (
                  <span className="text-xs px-2 py-0.5 rounded border bg-yellow-900/40 text-yellow-400 border-yellow-800">
                    Pending
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded border bg-gray-800 text-gray-500 border-gray-700">
                    Disconnected
                  </span>
                )}
                <button className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
                  Sync
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showStartResearch && (
        <StartResearchModal onClose={() => setShowStartResearch(false)} />
      )}
    </div>
  );
}
