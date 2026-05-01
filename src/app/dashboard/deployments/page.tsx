"use client";

import { useState } from "react";
import {
  mockDeployment,
  mockToolInventory,
  mockAgentRoster,
  mockPermissionMatrix,
  mockChangeRequests,
  mockMaintenanceStatus,
} from "@/lib/mockData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ModelBadge({ model }: { model: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ottoserv_managed: { label: "Managed", cls: "bg-blue-900/50 text-blue-300 border-blue-700" },
    hybrid: { label: "Hybrid", cls: "bg-purple-900/50 text-purple-300 border-purple-700" },
    client_owned: { label: "Client-Owned", cls: "bg-gray-800 text-gray-300 border-gray-600" },
  };
  const { label, cls } = map[model] ?? { label: model, cls: "bg-gray-800 text-gray-300 border-gray-600" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{label}</span>
  );
}

function HealthDot({ health }: { health: string }) {
  const cls =
    health === "healthy"
      ? "bg-green-400"
      : health === "degraded"
      ? "bg-yellow-400"
      : "bg-red-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} mr-1.5`} />;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    intake: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
    active: "bg-green-900/40 text-green-300 border-green-700",
    paused: "bg-gray-800 text-gray-400 border-gray-600",
    offboarding: "bg-red-900/40 text-red-300 border-red-700",
    connected: "bg-green-900/40 text-green-300 border-green-700",
    error: "bg-red-900/40 text-red-300 border-red-700",
    pending: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
    completed: "bg-blue-900/40 text-blue-300 border-blue-700",
    rejected: "bg-red-900/40 text-red-300 border-red-700",
  };
  const cls = map[status] ?? "bg-gray-800 text-gray-400 border-gray-600";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function SensitivityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    low: "text-gray-400",
    medium: "text-yellow-400",
    high: "text-red-400",
  };
  return <span className={`text-xs font-medium capitalize ${map[level] ?? "text-gray-400"}`}>{level}</span>;
}

function BoolCell({ val }: { val: boolean }) {
  return val ? (
    <span className="text-green-400 font-bold">✓</span>
  ) : (
    <span className="text-gray-600">—</span>
  );
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div className="space-y-4">
      <div className="bg-[#161b2e] border border-gray-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white font-semibold text-lg">{mockDeployment.company}</h2>
            <p className="text-gray-500 text-sm mt-0.5">Deployment ID: {mockDeployment.id}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ModelBadge model={mockDeployment.model} />
            <StatusPill status={mockDeployment.status} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Health">
            <span className="flex items-center text-white text-sm font-medium">
              <HealthDot health={mockDeployment.health} />
              <span className="capitalize">{mockDeployment.health}</span>
            </span>
          </Stat>
          <Stat label="Tools Connected">
            <span className="text-white text-lg font-semibold">{mockDeployment.tools}</span>
          </Stat>
          <Stat label="Active Agents">
            <span className="text-white text-lg font-semibold">{mockDeployment.agents}</span>
          </Stat>
          <Stat label="Status">
            <StatusPill status={mockDeployment.status} />
          </Stat>
        </div>
      </div>

      <div className="bg-[#161b2e] border border-gray-800 rounded-xl p-5">
        <h3 className="text-gray-300 font-medium mb-3">Quick Links</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: "Tool Inventory", tab: "tools" },
            { label: "Agent Roster", tab: "agents" },
            { label: "Permissions", tab: "permissions" },
            { label: "Maintenance", tab: "maintenance" },
            { label: "Change Requests", tab: "changes" },
            { label: "Handoff Package", tab: "handoff" },
          ].map(({ label }) => (
            <div
              key={label}
              className="bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2 text-gray-400 text-sm hover:text-white hover:border-gray-600 cursor-pointer transition-colors"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-3">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      {children}
    </div>
  );
}

function ToolInventoryTab() {
  return (
    <div className="bg-[#161b2e] border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h2 className="text-white font-semibold">Tool Inventory</h2>
        <p className="text-gray-500 text-sm mt-0.5">All connected integrations for this deployment</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 font-medium px-5 py-3">Tool</th>
              <th className="text-left text-gray-500 font-medium px-5 py-3">Integration Method</th>
              <th className="text-left text-gray-500 font-medium px-5 py-3">Status</th>
              <th className="text-left text-gray-500 font-medium px-5 py-3">Data Sensitivity</th>
            </tr>
          </thead>
          <tbody>
            {mockToolInventory.map((tool) => (
              <tr key={tool.id} className="border-b border-gray-800/60 hover:bg-gray-800/20 transition-colors">
                <td className="px-5 py-3 text-white font-medium">{tool.name}</td>
                <td className="px-5 py-3 text-gray-400">{tool.integration_method}</td>
                <td className="px-5 py-3">
                  <StatusPill status={tool.status} />
                </td>
                <td className="px-5 py-3">
                  <SensitivityBadge level={tool.data_sensitivity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgentRosterTab() {
  return (
    <div className="space-y-4">
      {mockAgentRoster.map((agent) => (
        <div key={agent.id} className="bg-[#161b2e] border border-gray-800 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{agent.name}</span>
                <StatusPill status={agent.status} />
              </div>
              <p className="text-gray-500 text-sm mt-0.5">{agent.department}</p>
            </div>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Allowed Actions</p>
              <ul className="space-y-1">
                {agent.allowed_actions.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-gray-300 text-sm">
                    <span className="text-green-400 text-xs">✓</span> {a}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Requires Approval</p>
              <ul className="space-y-1">
                {agent.requires_approval.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-yellow-300 text-sm">
                    <span className="text-yellow-400 text-xs">⚠</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PermissionsTab() {
  const cols = ["read", "create", "update", "send", "restricted"] as const;
  return (
    <div className="bg-[#161b2e] border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h2 className="text-white font-semibold">Permission Matrix</h2>
        <p className="text-gray-500 text-sm mt-0.5">What each agent is allowed to do</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 font-medium px-5 py-3">Agent</th>
              {cols.map((c) => (
                <th key={c} className="text-center text-gray-500 font-medium px-4 py-3 capitalize">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockPermissionMatrix.map((row) => (
              <tr key={row.agent} className="border-b border-gray-800/60 hover:bg-gray-800/20 transition-colors">
                <td className="px-5 py-3 text-white font-medium">{row.agent}</td>
                {cols.map((c) => (
                  <td key={c} className="px-4 py-3 text-center">
                    <BoolCell val={row[c]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-gray-800 flex gap-5 text-xs text-gray-500">
        <span><span className="text-green-400 font-bold mr-1">✓</span>Allowed</span>
        <span><span className="text-gray-600 font-bold mr-1">—</span>Not granted</span>
      </div>
    </div>
  );
}

function MaintenanceTab() {
  const s = mockMaintenanceStatus;
  const checks = [
    { label: "Failed Tasks", value: s.failed_tasks, ok: s.failed_tasks === 0 },
    { label: "Pending Escalations", value: s.pending_escalations, ok: s.pending_escalations === 0 },
    { label: "Stale Integrations", value: s.stale_integrations, ok: s.stale_integrations === 0 },
  ];
  return (
    <div className="space-y-4">
      <div className="bg-[#161b2e] border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Health Check Results</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {checks.map(({ label, value, ok }) => (
            <div
              key={label}
              className={`rounded-lg border p-4 ${ok ? "border-green-800 bg-green-900/10" : "border-yellow-800 bg-yellow-900/10"}`}
            >
              <p className="text-gray-400 text-xs mb-1">{label}</p>
              <p className={`text-2xl font-bold ${ok ? "text-green-400" : "text-yellow-400"}`}>{value}</p>
              <p className={`text-xs mt-1 ${ok ? "text-green-500" : "text-yellow-500"}`}>{ok ? "All clear" : "Needs attention"}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#161b2e] border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Schedule</h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">Next Scheduled Report:</span>
          <span className="text-blue-300 font-medium">{s.next_report}</span>
        </div>
      </div>
    </div>
  );
}

function ChangesTab() {
  return (
    <div className="space-y-4">
      {mockChangeRequests.map((req) => (
        <div key={req.id} className="bg-[#161b2e] border border-gray-800 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-medium">{req.title}</span>
                <StatusPill status={req.status} />
              </div>
              <p className="text-gray-500 text-sm mt-1">{req.description}</p>
              <p className="text-gray-600 text-xs mt-2">
                Requested by <span className="text-gray-400">{req.requested_by}</span> on {req.date}
              </p>
            </div>
            {req.status === "pending" && (
              <div className="flex gap-2 flex-shrink-0">
                <button className="text-xs px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white transition-colors">
                  Approve
                </button>
                <button className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors">
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function HandoffTab() {
  const sections = [
    {
      title: "Runbook",
      description: "Step-by-step operational procedures for daily system management.",
      items: [
        "Morning health check — verify all integrations are connected",
        "Review overnight agent activity log for anomalies",
        "Process any pending approval requests before 9am",
        "Escalate failed tasks to OttoServ support within 4 hours",
      ],
    },
    {
      title: "Admin Guide",
      description: "How to manage the deployment from the OttoServ admin console.",
      items: [
        "Login at app.ottoserv.io with admin credentials",
        "Navigate to Deployments → Brandon Croom Construction",
        "Use the Permissions tab to grant or revoke agent access",
        "Change Requests can be approved or rejected under the Changes tab",
      ],
    },
    {
      title: "User Guide",
      description: "What the client sees and how to use the client-facing portal.",
      items: [
        "Client portal available at /dashboard/deployments/client-view",
        "Client can see connected tools, active agents, and recent activity",
        "Approval requests appear in the Pending Approvals section",
        "Support contact: support@ottoserv.io or (555) 000-0000",
      ],
    },
  ];

  const infra = [
    { component: "Orchestration", owner: "OttoServ", notes: "Fully managed" },
    { component: "QuickBooks OAuth", owner: "Client", notes: "Client rotates tokens annually" },
    { component: "Gmail / Google Calendar", owner: "Client", notes: "Shared service account" },
    { component: "Phone (Twilio)", owner: "OttoServ", notes: "Sub-account per client" },
    { component: "Data Storage", owner: "OttoServ", notes: "Encrypted at rest, US region" },
  ];

  return (
    <div className="space-y-5">
      {sections.map((sec) => (
        <div key={sec.title} className="bg-[#161b2e] border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-1">{sec.title}</h3>
          <p className="text-gray-500 text-sm mb-3">{sec.description}</p>
          <ul className="space-y-1.5">
            {sec.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-300 text-sm">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">›</span> {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="bg-[#161b2e] border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Infrastructure Ownership</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 font-medium px-5 py-3">Component</th>
                <th className="text-left text-gray-500 font-medium px-5 py-3">Owner</th>
                <th className="text-left text-gray-500 font-medium px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {infra.map((row) => (
                <tr key={row.component} className="border-b border-gray-800/60 hover:bg-gray-800/20">
                  <td className="px-5 py-3 text-white">{row.component}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${row.owner === "OttoServ" ? "text-blue-400" : "text-gray-300"}`}>
                      {row.owner}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "tools", label: "Tool Inventory" },
  { id: "agents", label: "Agent Roster" },
  { id: "permissions", label: "Permissions" },
  { id: "maintenance", label: "Maintenance" },
  { id: "changes", label: "Change Requests" },
  { id: "handoff", label: "Handoff Package" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DeploymentsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="min-h-screen bg-[#0f1117] p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Deployment Management</h1>
        <p className="text-gray-500 text-sm mt-1">Manage client deployments, tools, agents, and handoff packages</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? "text-blue-400 border-b-2 border-blue-400 bg-blue-950/20"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "tools" && <ToolInventoryTab />}
      {activeTab === "agents" && <AgentRosterTab />}
      {activeTab === "permissions" && <PermissionsTab />}
      {activeTab === "maintenance" && <MaintenanceTab />}
      {activeTab === "changes" && <ChangesTab />}
      {activeTab === "handoff" && <HandoffTab />}
    </div>
  );
}
