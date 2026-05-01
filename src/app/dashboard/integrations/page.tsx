"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getIntegrations, getToken } from "@/lib/dashboardApi";
import {
  mockIntegrations,
  mockSocialConnections,
  SOCIAL_PLATFORMS,
  Integration,
  SocialConnection,
} from "@/lib/mockData";

// ─── Software integrations (unchanged extra set) ────────────────────────────

const EXTRA_INTEGRATIONS: Integration[] = [
  { id: "INT-011", name: "HubSpot CRM", description: "Sync leads and contacts with CRM", status: "not_connected", category: "Sales" },
  { id: "INT-012", name: "Slack", description: "Get real-time alerts in Slack channels", status: "not_connected", category: "Communication" },
  { id: "INT-013", name: "CompanyCam", description: "Job site photo documentation", status: "not_connected", category: "Operations" },
  { id: "INT-014", name: "ServiceTitan", description: "Field service management platform", status: "not_connected", category: "Operations" },
  { id: "INT-015", name: "Xero", description: "Alternative accounting and invoicing", status: "not_connected", category: "Finance" },
  { id: "INT-016", name: "Zapier", description: "Connect to 5,000+ apps and workflows", status: "not_connected", category: "Productivity" },
];

const allIntegrations = [...mockIntegrations, ...EXTRA_INTEGRATIONS];

const CATEGORY_ICONS: Record<string, string> = {
  Finance: "💰",
  Productivity: "📅",
  Communication: "💬",
  Marketing: "📣",
  Sales: "💼",
  Operations: "🔧",
};

const SOFTWARE_STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  connected: { label: "Connected", dot: "bg-green-400", badge: "bg-green-900/40 text-green-400 border-green-800" },
  not_connected: { label: "Not Connected", dot: "bg-gray-600", badge: "bg-gray-800 text-gray-400 border-gray-700" },
  error: { label: "Error", dot: "bg-red-400 animate-pulse", badge: "bg-red-900/40 text-red-400 border-red-800" },
};

const SOCIAL_STATUS_CONFIG: Record<
  SocialConnection["status"],
  { label: string; dot: string; badge: string; buttonLabel: string; buttonClass: string }
> = {
  connected: {
    label: "Connected",
    dot: "bg-green-400",
    badge: "bg-green-900/40 text-green-400 border-green-800",
    buttonLabel: "Disconnect",
    buttonClass: "bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40",
  },
  needs_reconnect: {
    label: "Needs Reconnect",
    dot: "bg-yellow-400 animate-pulse",
    badge: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    buttonLabel: "Reconnect",
    buttonClass: "bg-yellow-900/20 hover:bg-yellow-900/30 text-yellow-400 border border-yellow-900/40",
  },
  disconnected: {
    label: "Disconnected",
    dot: "bg-gray-600",
    badge: "bg-gray-800 text-gray-400 border-gray-700",
    buttonLabel: "Connect",
    buttonClass: "bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40",
  },
};

function platformMeta(id: string) {
  return SOCIAL_PLATFORMS.find((p) => p.id === id) ?? { name: id, icon: "🔌", color: "#6b7280" };
}

function formatSync(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

const categories = ["All", ...Array.from(new Set(allIntegrations.map((i) => i.category)))];

export default function IntegrationsPage() {
  const [socialConns, setSocialConns] = useState(mockSocialConnections);
  const [integrations, setIntegrations] = useState(allIntegrations);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "connected" | "not_connected">("all");

  useEffect(() => {
    const token = getToken();
    if (token) {
      getIntegrations(token).then((data) => {
        if (data) setIntegrations([...data, ...EXTRA_INTEGRATIONS]);
      });
    }
  }, []);

  const connectedCount = integrations.filter((i) => i.status === "connected").length;
  const errorCount = integrations.filter((i) => i.status === "error").length;
  const socialConnectedCount = socialConns.filter((c) => c.status === "connected").length;
  const socialWarningCount = socialConns.filter((c) => c.status === "needs_reconnect").length;

  const filtered = integrations.filter((i) => {
    const catOk = categoryFilter === "All" || i.category === categoryFilter;
    const statusOk = statusFilter === "all" || i.status === statusFilter;
    return catOk && statusOk;
  });

  function handleSocialToggle(id: string) {
    setSocialConns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.status === "connected") return { ...c, status: "disconnected" as const, last_sync: c.last_sync };
        return { ...c, status: "connected" as const, last_sync: new Date().toISOString() };
      })
    );
  }

  function handleSoftwareToggle(id: string) {
    setIntegrations((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const next = i.status === "connected" ? "not_connected" : "connected";
        return { ...i, status: next, connected_at: next === "connected" ? new Date().toISOString().slice(0, 10) : undefined };
      })
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="text-gray-500 text-sm mt-1">
            {socialConnectedCount} social · {connectedCount} software connected
            {(errorCount > 0 || socialWarningCount > 0) && (
              <span className="text-yellow-400"> · {errorCount + socialWarningCount} need attention</span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/social"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Manage Posts →
        </Link>
      </div>

      {/* ── Social Accounts ────────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Social Accounts</h2>
          <span className="text-xs text-gray-500">
            {socialConnectedCount} of {socialConns.length} connected
          </span>
        </div>

        {socialWarningCount > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 mb-4 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-yellow-400 font-medium text-sm">
                {socialWarningCount} social account{socialWarningCount > 1 ? "s need" : " needs"} reconnection
              </p>
              <p className="text-yellow-400/70 text-xs">Token expired or permissions revoked — reconnect to resume publishing</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Connected / configured accounts */}
          {socialConns.map((conn) => {
            const meta = platformMeta(conn.platform);
            const cfg = SOCIAL_STATUS_CONFIG[conn.status];
            const expDays = daysUntil(conn.token_expires);
            const tokenWarning = expDays !== null && expDays < 7;

            return (
              <div
                key={conn.id}
                className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden"
                style={{ borderTopColor: meta.color, borderTopWidth: 3 }}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: meta.color + "22" }}
                      >
                        {meta.icon}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm">{meta.name}</h3>
                        {conn.account_name && (
                          <p className="text-gray-400 text-xs truncate max-w-[140px]">{conn.account_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className={`text-xs px-2 py-0.5 rounded border ${cfg.badge}`}>{cfg.label}</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="space-y-1 mb-4">
                    <p className="text-gray-600 text-xs">
                      Last synced: <span className="text-gray-400">{formatSync(conn.last_sync)}</span>
                    </p>
                    {conn.token_expires && (
                      <p className={`text-xs ${tokenWarning ? "text-red-400 font-medium" : "text-gray-600"}`}>
                        Token expires:{" "}
                        <span>
                          {tokenWarning
                            ? `⚠️ In ${expDays} day${expDays === 1 ? "" : "s"}`
                            : new Date(conn.token_expires).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Permissions */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(Object.entries(conn.permissions) as [string, boolean][]).map(([perm, granted]) => (
                      <span
                        key={perm}
                        className={`text-xs px-2 py-0.5 rounded ${
                          granted
                            ? "bg-green-900/30 text-green-400 border border-green-900/50"
                            : "bg-gray-800/50 text-gray-600 border border-gray-800 line-through"
                        }`}
                      >
                        {perm.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSocialToggle(conn.id)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${cfg.buttonClass}`}
                    >
                      {cfg.buttonLabel}
                    </button>
                    {conn.status === "connected" && (
                      <button className="px-3 py-2 text-xs bg-[#1f2937] hover:bg-gray-700 text-gray-400 rounded-lg border border-gray-700 transition-colors">
                        Manage Permissions
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Unconnected platform cards for platforms not in socialConns */}
          {SOCIAL_PLATFORMS.filter(
            (p) => !socialConns.some((c) => c.platform === p.id)
          ).map((meta) => (
            <div
              key={meta.id}
              className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden opacity-60 hover:opacity-90 transition-opacity"
              style={{ borderTopColor: meta.color, borderTopWidth: 3 }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: meta.color + "22" }}
                  >
                    {meta.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{meta.name}</h3>
                    <p className="text-gray-500 text-xs">Not connected</p>
                  </div>
                </div>
                <button className="w-full py-2 rounded-lg text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40 transition-colors">
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Software Integrations ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Software Integrations</h2>
          <span className="text-xs text-gray-500">
            {connectedCount} connected · {allIntegrations.length - connectedCount} available
          </span>
        </div>

        {errorCount > 0 && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4 flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <p className="text-red-400 font-medium text-sm">
                {errorCount} integration{errorCount > 1 ? "s have" : " has"} connection errors
              </p>
              <p className="text-red-400/70 text-xs">Check your connected accounts and re-authorize if needed</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex gap-2">
            {(["all", "connected", "not_connected"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-blue-600 text-white"
                    : "bg-[#111827] text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                {s === "all" ? "All" : s === "connected" ? "Connected" : "Not Connected"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === cat ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {cat !== "All" && (CATEGORY_ICONS[cat] ?? "🔌")} {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((integration) => {
            const cfg = SOFTWARE_STATUS_CONFIG[integration.status] ?? SOFTWARE_STATUS_CONFIG.not_connected;
            const isConnected = integration.status === "connected";
            const isError = integration.status === "error";

            return (
              <div
                key={integration.id}
                className={`bg-[#111827] border rounded-xl p-5 ${isError ? "border-red-900" : "border-gray-800"}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">
                      {CATEGORY_ICONS[integration.category] ?? "🔌"}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{integration.name}</h3>
                      <span className="text-gray-500 text-xs">{integration.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className={`text-xs px-2 py-0.5 rounded border ${cfg.badge}`}>{cfg.label}</span>
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-3 leading-snug">{integration.description}</p>

                {integration.connected_at && (
                  <p className="text-gray-600 text-xs mb-3">Connected {integration.connected_at}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSoftwareToggle(integration.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isConnected || isError
                        ? "bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40"
                        : "bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40"
                    }`}
                  >
                    {isConnected ? "Disconnect" : isError ? "Reconnect" : "Connect"}
                  </button>
                  {isConnected && (
                    <button className="px-3 py-2 bg-[#1f2937] hover:bg-gray-700 text-gray-400 text-xs rounded-lg border border-gray-700 transition-colors">
                      Settings
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
