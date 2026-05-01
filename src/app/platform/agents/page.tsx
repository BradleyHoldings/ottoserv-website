"use client";

import { useEffect, useState } from "react";
import { platformFetch } from "@/lib/platformApi";

interface Agent {
  id: string;
  name: string;
  department: string;
  purpose: string;
  status: string;
  allowed_tasks: string[];
  autonomy_level: string;
}

const STATIC_AGENTS: Agent[] = [
  {
    id: "agent-sales",
    name: "Sales Agent",
    department: "Sales",
    purpose: "Automates lead qualification, follow-ups, and CRM data entry.",
    status: "active",
    allowed_tasks: ["lead_qualification", "crm_update", "email_followup", "pipeline_report"],
    autonomy_level: "medium",
  },
  {
    id: "agent-marketing",
    name: "Marketing Agent",
    department: "Marketing",
    purpose: "Manages campaign scheduling, content distribution, and analytics reporting.",
    status: "active",
    allowed_tasks: ["campaign_schedule", "content_publish", "analytics_report", "social_post"],
    autonomy_level: "medium",
  },
  {
    id: "agent-hr",
    name: "HR Agent",
    department: "Human Resources",
    purpose: "Handles onboarding workflows, document collection, and policy reminders.",
    status: "active",
    allowed_tasks: ["onboarding_workflow", "document_request", "policy_reminder", "offboarding"],
    autonomy_level: "low",
  },
  {
    id: "agent-finance",
    name: "Finance Agent",
    department: "Finance",
    purpose: "Processes invoices, flags anomalies, and generates expense summaries.",
    status: "active",
    allowed_tasks: ["invoice_processing", "expense_summary", "anomaly_detection", "budget_report"],
    autonomy_level: "low",
  },
  {
    id: "agent-it",
    name: "IT Agent",
    department: "IT",
    purpose: "Manages ticket routing, system health checks, and access provisioning.",
    status: "active",
    allowed_tasks: ["ticket_routing", "health_check", "access_provision", "patch_notify"],
    autonomy_level: "high",
  },
  {
    id: "agent-ops",
    name: "Operations Agent",
    department: "Operations",
    purpose: "Monitors workflows, tracks KPIs, and escalates bottlenecks.",
    status: "active",
    allowed_tasks: ["workflow_monitor", "kpi_tracking", "escalation", "capacity_report"],
    autonomy_level: "medium",
  },
  {
    id: "agent-support",
    name: "Support Agent",
    department: "Customer Support",
    purpose: "Triages incoming tickets, drafts responses, and escalates critical issues.",
    status: "inactive",
    allowed_tasks: ["ticket_triage", "response_draft", "escalation", "satisfaction_survey"],
    autonomy_level: "medium",
  },
  {
    id: "agent-legal",
    name: "Legal Agent",
    department: "Legal & Compliance",
    purpose: "Reviews contract summaries, flags compliance issues, and tracks deadlines.",
    status: "inactive",
    allowed_tasks: ["contract_summary", "compliance_flag", "deadline_track", "policy_update"],
    autonomy_level: "low",
  },
];

const AUTONOMY_COLORS: Record<string, string> = {
  low: "bg-green-900/40 text-green-400",
  medium: "bg-yellow-900/40 text-yellow-400",
  high: "bg-red-900/40 text-red-400",
};

export default function PlatformAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(STATIC_AGENTS);
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(STATIC_AGENTS.map((a) => [a.id, a.status === "active"]))
  );

  useEffect(() => {
    platformFetch("/agents")
      .then((r) => r.json())
      .then((data) => {
        const list: Agent[] = Array.isArray(data) ? data : (data.agents ?? []);
        if (list.length > 0) {
          setAgents(list);
          setActiveToggles(Object.fromEntries(list.map((a) => [a.id, a.status === "active"])));
        }
      })
      .catch(() => {
        // Keep static fallback agents
      });
  }, []);

  const toggleAgent = (id: string) => {
    setActiveToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-xl font-bold">Agent Registry</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {agents.filter((a) => activeToggles[a.id]).length} of {agents.length} agents active
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const isActive = activeToggles[agent.id] ?? agent.status === "active";
          return (
            <div
              key={agent.id}
              className={`bg-[#111827] border rounded-xl p-5 flex flex-col gap-4 transition-colors ${
                isActive ? "border-gray-800" : "border-gray-800/50 opacity-70"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white font-semibold text-sm">{agent.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{agent.department}</p>
                </div>
                {/* Active toggle */}
                <button
                  onClick={() => toggleAgent(agent.id)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    isActive ? "bg-blue-600" : "bg-gray-700"
                  }`}
                  role="switch"
                  aria-checked={isActive}
                  title={isActive ? "Deactivate agent" : "Activate agent"}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      isActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Purpose */}
              <p className="text-gray-400 text-xs leading-relaxed">{agent.purpose}</p>

              {/* Autonomy level */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">Autonomy:</span>
                <span className={`text-xs px-2 py-0.5 rounded capitalize ${AUTONOMY_COLORS[agent.autonomy_level] ?? "bg-gray-800 text-gray-400"}`}>
                  {agent.autonomy_level}
                </span>
              </div>

              {/* Allowed tasks */}
              <div>
                <p className="text-gray-500 text-xs mb-1.5">Allowed tasks</p>
                <div className="flex flex-wrap gap-1">
                  {agent.allowed_tasks.map((task) => (
                    <span
                      key={task}
                      className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded"
                    >
                      {task.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-1.5 mt-auto pt-1 border-t border-gray-800">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-400" : "bg-gray-600"}`}
                />
                <span className={`text-xs ${isActive ? "text-green-400" : "text-gray-500"}`}>
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
