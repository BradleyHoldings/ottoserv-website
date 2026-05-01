"use client";

import { useState } from "react";
import {
  mockDeployment,
  mockToolInventory,
  mockAgentRoster,
  mockChangeRequests,
} from "@/lib/mockData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    connected: "bg-green-900/40 text-green-300 border-green-700",
    error: "bg-red-900/40 text-red-300 border-red-700",
    pending: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
    active: "bg-green-900/40 text-green-300 border-green-700",
    paused: "bg-gray-800 text-gray-400 border-gray-600",
    completed: "bg-blue-900/40 text-blue-300 border-blue-700",
  };
  const cls = map[status] ?? "bg-gray-800 text-gray-400 border-gray-600";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function ToolIcon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    QuickBooks: "💰",
    Gmail: "📧",
    "Google Calendar": "📅",
    Spreadsheets: "📊",
    Phone: "📞",
  };
  return <span className="text-xl">{icons[name] ?? "🔌"}</span>;
}

// ─── Mock recent activity ─────────────────────────────────────────────────────

const recentActivity = [
  { time: "Today 9:14am", agent: "Lead Response Agent", action: "Sent intro SMS to new lead: Marcus Webb", type: "send" },
  { time: "Today 8:02am", agent: "Operations Agent", action: "Updated project status to In Progress: Kitchen Remodel #4412", type: "update" },
  { time: "Yesterday 5:30pm", agent: "Reporting Agent", action: "Generated weekly revenue summary report", type: "report" },
  { time: "Yesterday 2:15pm", agent: "Lead Response Agent", action: "Created CRM contact for Priya Nair", type: "create" },
  { time: "Yesterday 11:00am", agent: "Operations Agent", action: "Created work order for Roof Inspection – Thompson property", type: "create" },
];

const pendingApprovals = [
  { id: "pa_001", agent: "Lead Response Agent", action: "Schedule estimate call for Marcus Webb on May 3 at 10am", time: "Today 9:15am" },
  { id: "pa_002", agent: "Operations Agent", action: "Send invoice #INV-0091 to Johnson Kitchen ($4,200)", time: "Today 7:50am" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientViewPage() {
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!requestText.trim()) return;
    setSubmitted(true);
    setRequestText("");
  }

  return (
    <div className="min-h-screen bg-[#0f1117] p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-white text-2xl font-bold">{mockDeployment.company}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your OttoServ AI Operations Dashboard</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
          <span className="text-green-400 font-medium">System Healthy</span>
        </div>
      </div>

      {/* Connected Tools */}
      <section>
        <h2 className="text-gray-300 font-semibold mb-3">Connected Tools</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {mockToolInventory.map((tool) => (
            <div
              key={tool.id}
              className="bg-[#161b2e] border border-gray-800 rounded-xl p-4 flex flex-col items-center gap-2 text-center"
            >
              <ToolIcon name={tool.name} />
              <p className="text-white text-sm font-medium">{tool.name}</p>
              <StatusPill status={tool.status} />
            </div>
          ))}
        </div>
      </section>

      {/* Active Agents */}
      <section>
        <h2 className="text-gray-300 font-semibold mb-3">Active Agents</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {mockAgentRoster.map((agent) => (
            <div key={agent.id} className="bg-[#161b2e] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium text-sm">{agent.name}</span>
                <StatusPill status={agent.status} />
              </div>
              <p className="text-gray-500 text-xs mb-3">{agent.department}</p>
              <div className="space-y-1">
                {agent.allowed_actions.slice(0, 2).map((a) => (
                  <p key={a} className="text-gray-400 text-xs flex items-center gap-1.5">
                    <span className="text-green-400">✓</span> {a}
                  </p>
                ))}
                {agent.allowed_actions.length > 2 && (
                  <p className="text-gray-600 text-xs">+{agent.allowed_actions.length - 2} more actions</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Agent Activity */}
      <section>
        <h2 className="text-gray-300 font-semibold mb-3">Recent Agent Activity</h2>
        <div className="bg-[#161b2e] border border-gray-800 rounded-xl divide-y divide-gray-800">
          {recentActivity.map((item, i) => (
            <div key={i} className="px-5 py-3 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-gray-300 text-sm">{item.action}</p>
                <p className="text-gray-600 text-xs mt-0.5">
                  <span className="text-gray-500">{item.agent}</span> · {item.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending Approvals */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-gray-300 font-semibold">Pending Approvals</h2>
          {pendingApprovals.length > 0 && (
            <span className="text-xs bg-yellow-900/50 text-yellow-300 border border-yellow-700 px-2 py-0.5 rounded-full font-medium">
              {pendingApprovals.length}
            </span>
          )}
        </div>
        <div className="space-y-3">
          {pendingApprovals.map((item) => (
            <div key={item.id} className="bg-[#161b2e] border border-yellow-800/50 rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{item.action}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {item.agent} · {item.time}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors">
                  Approve
                </button>
                <button className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg transition-colors">
                  Reject
                </button>
              </div>
            </div>
          ))}
          {pendingApprovals.length === 0 && (
            <p className="text-gray-600 text-sm">No pending approvals.</p>
          )}
        </div>
      </section>

      {/* Recent Change Requests */}
      <section>
        <h2 className="text-gray-300 font-semibold mb-3">Your Change Requests</h2>
        <div className="bg-[#161b2e] border border-gray-800 rounded-xl divide-y divide-gray-800">
          {mockChangeRequests.map((req) => (
            <div key={req.id} className="px-5 py-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{req.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{req.date}</p>
              </div>
              <StatusPill status={req.status} />
            </div>
          ))}
        </div>
      </section>

      {/* Integration Policy */}
      <section>
        <h2 className="text-gray-300 font-semibold mb-3">Integration Policy</h2>
        <div className="bg-[#161b2e] border border-gray-800 rounded-xl p-5 grid sm:grid-cols-2 gap-5">
          <div>
            <p className="text-green-400 text-xs font-semibold uppercase tracking-wide mb-2">What agents can do</p>
            <ul className="space-y-1.5">
              {[
                "Read your connected business data",
                "Send messages on your behalf (with approval)",
                "Create and update records in connected tools",
                "Generate and export reports",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-gray-300 text-sm">
                  <span className="text-green-400 flex-shrink-0">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-2">What agents cannot do</p>
            <ul className="space-y-1.5">
              {[
                "Delete records or data",
                "Make payments or transfers",
                "Change user passwords or permissions",
                "Access data outside connected integrations",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-gray-300 text-sm">
                  <span className="text-red-400 flex-shrink-0">✕</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Request a Change + Support */}
      <section className="grid sm:grid-cols-2 gap-4">
        <div className="bg-[#161b2e] border border-gray-800 rounded-xl p-5">
          <h2 className="text-gray-300 font-semibold mb-1">Request a Change</h2>
          <p className="text-gray-500 text-sm mb-3">Need to add a tool, adjust an agent, or change a workflow?</p>
          {submitted ? (
            <div className="bg-green-900/20 border border-green-800 rounded-lg px-4 py-3 text-green-300 text-sm">
              Request submitted! We'll review it within 1 business day.
            </div>
          ) : requestOpen ? (
            <div className="space-y-3">
              <textarea
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                rows={3}
                placeholder="Describe what you'd like changed..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-600 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors font-medium"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setRequestOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setRequestOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors font-medium"
            >
              Request a Change
            </button>
          )}
        </div>

        <div className="bg-[#161b2e] border border-gray-800 rounded-xl p-5">
          <h2 className="text-gray-300 font-semibold mb-1">Support</h2>
          <p className="text-gray-500 text-sm mb-3">Something not working? Reach out anytime.</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-gray-500">📧</span>
              <span>support@ottoserv.io</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-gray-500">📞</span>
              <span>(555) 000-0000</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-xs mt-2">
              <span>Response time: 1 business day</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
