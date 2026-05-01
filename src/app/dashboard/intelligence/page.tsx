"use client";

import { useState } from "react";
import {
  mockMaterialTrends,
  mockIntelRecommendations,
  mockCostAssumptions,
  mockPermitActivity,
  mockRiskAlerts,
  type IntelRecommendation,
  type RiskAlert,
} from "@/lib/mockData";

const TABS = [
  { id: "market", label: "Market Pulse" },
  { id: "estimates", label: "Estimate Intelligence" },
  { id: "radar", label: "Opportunity Radar" },
  { id: "pricing", label: "Pricing Assistant" },
  { id: "risks", label: "Risk Alerts" },
  { id: "jarvis", label: "Jarvis Recommendations" },
];

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-green-900/40 text-green-400 border-green-800"
      : value >= 60
      ? "bg-yellow-900/40 text-yellow-400 border-yellow-800"
      : "bg-red-900/40 text-red-400 border-red-800";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
      {value}% confidence
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
  confidence,
  lastUpdated,
}: {
  title: string;
  subtitle?: string;
  confidence?: number;
  lastUpdated: string;
}) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-white font-semibold text-lg">{title}</h2>
        {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-gray-500 text-xs">Last updated: {lastUpdated}</span>
        {confidence !== undefined && <ConfidenceBadge value={confidence} />}
      </div>
    </div>
  );
}

function ChangeArrow({ value }: { value: number }) {
  if (value > 0)
    return <span className="text-red-400 font-medium">▲ {value.toFixed(1)}%</span>;
  if (value < 0)
    return <span className="text-green-400 font-medium">▼ {Math.abs(value).toFixed(1)}%</span>;
  return <span className="text-gray-400">— 0.0%</span>;
}

function StatusDot({ status }: { status: "green" | "yellow" | "red" }) {
  const color =
    status === "green"
      ? "bg-green-400"
      : status === "yellow"
      ? "bg-yellow-400"
      : "bg-red-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function MarketPulseTab() {
  return (
    <div>
      <SectionHeader
        title="Material Price Index"
        subtitle="Relative cost index vs. baseline (100 = stable). Sourced from BLS PPI and regional supplier data."
        confidence={81}
        lastUpdated="Apr 30, 2026"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mockMaterialTrends.map((t) => (
          <div key={t.category} className="bg-[#111827] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">{t.category}</span>
              <StatusDot status={t.status} />
            </div>
            <div className="text-2xl font-bold text-white mb-3">{t.index_value}</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>30d</span>
                <ChangeArrow value={t.change_30d} />
              </div>
              <div className="flex justify-between text-gray-400">
                <span>90d</span>
                <ChangeArrow value={t.change_90d} />
              </div>
              <div className="flex justify-between text-gray-400">
                <span>12m</span>
                <ChangeArrow value={t.change_12m} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Stable / Declining</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Moderate Increase</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Significant Spike</span>
      </div>
    </div>
  );
}

function AgeBadge({ days }: { days: number }) {
  const color =
    days <= 30
      ? "bg-green-900/40 text-green-400 border-green-800"
      : days <= 60
      ? "bg-yellow-900/40 text-yellow-400 border-yellow-800"
      : "bg-red-900/40 text-red-400 border-red-800";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
      {days}d old
    </span>
  );
}

function ConfidenceLabelBadge({ value }: { value: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-green-900/40 text-green-400 border-green-800",
    medium: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    low: "bg-red-900/40 text-red-400 border-red-800",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[value]}`}>
      {value}
    </span>
  );
}

function EstimateIntelligenceTab() {
  return (
    <div>
      <SectionHeader
        title="Cost Assumptions Library"
        subtitle="Stored unit costs used in estimates. Review and update regularly to maintain accurate pricing."
        confidence={76}
        lastUpdated="Apr 30, 2026"
      />
      <div className="flex justify-end mb-4">
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors">
          + Add Assumption
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockCostAssumptions.map((a) => (
          <div key={a.id} className="bg-[#111827] border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">{a.category}</span>
                <p className="text-white font-medium mt-0.5">{a.label}</p>
              </div>
              <AgeBadge days={a.age_days} />
            </div>
            <div className="text-2xl font-bold text-blue-400 mb-3">
              {a.unit.startsWith("$/") ? `$${a.value}` : a.value}
              <span className="text-sm text-gray-400 font-normal ml-1">{a.unit}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Updated {a.last_updated}</span>
              <ConfidenceLabelBadge value={a.confidence} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpportunityRadarTab() {
  return (
    <div>
      <SectionHeader
        title="Opportunity Radar"
        subtitle="Permit activity near your service area. Early outreach to permit holders improves conversion rates."
        confidence={68}
        lastUpdated="Apr 30, 2026"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {mockPermitActivity.map((p) => (
          <div key={p.id} className="bg-[#111827] border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">{p.city}</span>
                <p className="text-white font-medium mt-0.5">{p.permit_type}</p>
              </div>
              <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-full font-medium">
                {p.zip}
              </span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{p.count}</div>
            <p className="text-gray-400 text-xs mb-3">permits filed · {p.value_range}</p>
            <p className="text-gray-500 text-xs">Most recent: {p.recent_date}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Upcoming Integrations</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {["ATTOM Data", "Shovels.ai", "PermitStack"].map((name) => (
            <div key={name} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg p-3">
              <span className="text-gray-300 text-sm font-medium">{name}</span>
              <span className="text-xs bg-gray-800 text-gray-500 border border-gray-700 px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
          <p className="text-gray-400 text-sm">Have permit data? Upload a CSV to import manually.</p>
          <button className="px-4 py-2 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white text-sm rounded-lg transition-colors">
            Upload Permits
          </button>
        </div>
      </div>
    </div>
  );
}

function PricingAssistantTab() {
  const marginTarget = mockCostAssumptions.find((a) => a.label === "Margin Target");
  const laborRate = mockCostAssumptions.find((a) => a.label === "Hourly Labor Rate");
  const highPriority = mockIntelRecommendations.filter(
    (r) => r.type === "pricing" || r.type === "cost"
  );

  return (
    <div>
      <SectionHeader
        title="Pricing Assistant"
        subtitle="Margin health and pricing recommendations based on current market conditions."
        confidence={82}
        lastUpdated="Apr 30, 2026"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111827] border border-green-800/40 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Margin Target</p>
          <div className="text-4xl font-bold text-green-400">{marginTarget?.value}%</div>
          <p className="text-gray-500 text-xs mt-2">Updated {marginTarget?.last_updated}</p>
        </div>
        <div className="bg-[#111827] border border-blue-800/40 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Hourly Labor Rate</p>
          <div className="text-4xl font-bold text-blue-400">${laborRate?.value}/hr</div>
          <p className="text-gray-500 text-xs mt-2">Updated {laborRate?.last_updated}</p>
        </div>
      </div>

      <h3 className="text-white font-semibold mb-3">Pricing Recommendations</h3>
      <div className="space-y-3">
        {highPriority.map((rec) => (
          <div key={rec.id} className="bg-[#111827] border border-gray-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{rec.title}</p>
                <p className="text-gray-400 text-sm mt-1">{rec.summary}</p>
                <p className="text-gray-500 text-xs mt-2">Next: {rec.next_action}</p>
              </div>
              <ConfidenceBadge value={rec.confidence} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const RISK_STYLES: Record<RiskAlert["severity"], string> = {
  high: "border-red-800/60 bg-red-950/20",
  medium: "border-yellow-800/60 bg-yellow-950/20",
  low: "border-gray-700 bg-[#111827]",
};

const RISK_BADGE: Record<RiskAlert["severity"], string> = {
  high: "bg-red-900/40 text-red-400 border-red-800",
  medium: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  low: "bg-gray-800 text-gray-400 border-gray-700",
};

const RISK_ICONS: Record<RiskAlert["type"], string> = {
  weather: "🌩️",
  material_spike: "📈",
  fuel: "⛽",
  expired_data: "⚠️",
};

function RiskAlertsTab() {
  return (
    <div>
      <SectionHeader
        title="Risk Alerts"
        subtitle="Active risks affecting your projects, pricing, and operations."
        confidence={85}
        lastUpdated="Apr 30, 2026"
      />
      <div className="space-y-4">
        {mockRiskAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`border rounded-xl p-4 ${RISK_STYLES[alert.severity]}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{RISK_ICONS[alert.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-white font-medium">{alert.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RISK_BADGE[alert.severity]}`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">{alert.description}</p>
                <p className="text-gray-500 text-xs mt-2">Affects: {alert.affected} · {alert.date}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PRIORITY_BADGE: Record<IntelRecommendation["priority"], string> = {
  high: "bg-red-900/40 text-red-400 border-red-800",
  medium: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  low: "bg-gray-800 text-gray-400 border-gray-700",
};

const TYPE_COLORS: Record<IntelRecommendation["type"], string> = {
  pricing: "bg-blue-900/40 text-blue-400 border-blue-800",
  opportunity: "bg-green-900/40 text-green-400 border-green-800",
  risk: "bg-red-900/40 text-red-400 border-red-800",
  cost: "bg-orange-900/40 text-orange-400 border-orange-800",
  timing: "bg-purple-900/40 text-purple-400 border-purple-800",
};

function JarvisRecommendationsTab() {
  const [statuses, setStatuses] = useState<Record<string, IntelRecommendation["status"]>>(
    Object.fromEntries(mockIntelRecommendations.map((r) => [r.id, r.status]))
  );

  function act(id: string, action: "accepted" | "dismissed" | "snoozed") {
    setStatuses((prev) => ({ ...prev, [id]: action }));
  }

  const visible = mockIntelRecommendations.filter(
    (r) => statuses[r.id] === "new"
  );
  const acted = mockIntelRecommendations.filter(
    (r) => statuses[r.id] !== "new"
  );

  return (
    <div>
      <SectionHeader
        title="Jarvis Recommendations"
        subtitle="AI-generated recommendations based on market data, project performance, and business patterns."
        confidence={79}
        lastUpdated="Apr 30, 2026"
      />
      {visible.length === 0 && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          All recommendations have been reviewed.
        </div>
      )}
      <div className="space-y-4">
        {visible.map((rec) => (
          <div key={rec.id} className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[rec.type]}`}>
                    {rec.type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_BADGE[rec.priority]}`}>
                    {rec.priority} priority
                  </span>
                  <ConfidenceBadge value={rec.confidence} />
                </div>
                <p className="text-white font-semibold">{rec.title}</p>
                <p className="text-gray-300 text-sm mt-1">{rec.summary}</p>
              </div>
            </div>

            <div className="bg-gray-900/60 rounded-lg p-3 mb-3">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Reasoning</p>
              <p className="text-gray-300 text-sm">{rec.reasoning}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                <span className="text-gray-400">Source:</span> {rec.source}
                <span className="mx-2 text-gray-700">·</span>
                <span className="text-gray-400">Next:</span> {rec.next_action}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => act(rec.id, "snoozed")}
                  className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 rounded-lg transition-colors"
                >
                  Snooze
                </button>
                <button
                  onClick={() => act(rec.id, "dismissed")}
                  className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => act(rec.id, "accepted")}
                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {acted.length > 0 && (
        <div className="mt-6">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">Reviewed</p>
          <div className="space-y-2">
            {acted.map((rec) => (
              <div key={rec.id} className="bg-gray-900/40 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
                <p className="text-gray-500 text-sm truncate">{rec.title}</p>
                <span className="text-xs text-gray-600 capitalize flex-shrink-0 ml-3">{statuses[rec.id]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntelligencePage() {
  const [activeTab, setActiveTab] = useState("market");

  const alertCount = mockRiskAlerts.filter((r) => r.severity === "high").length;
  const recCount = mockIntelRecommendations.filter((r) => r.status === "new").length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🔮</span>
            <h1 className="text-white text-2xl font-bold">Intelligence Center</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Market signals, pricing intelligence, and AI-driven recommendations for your business.
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-[#111827] border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map((tab) => {
            const badge =
              tab.id === "risks" && alertCount > 0
                ? alertCount
                : tab.id === "jarvis" && recCount > 0
                ? recCount
                : null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {tab.label}
                {badge && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "market" && <MarketPulseTab />}
          {activeTab === "estimates" && <EstimateIntelligenceTab />}
          {activeTab === "radar" && <OpportunityRadarTab />}
          {activeTab === "pricing" && <PricingAssistantTab />}
          {activeTab === "risks" && <RiskAlertsTab />}
          {activeTab === "jarvis" && <JarvisRecommendationsTab />}
        </div>
      </div>
    </div>
  );
}
