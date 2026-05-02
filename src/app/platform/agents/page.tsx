"use client";

import { useEffect, useState } from "react";
import { platformFetch } from "@/lib/platformApi";

interface Agent {
  id: string;
  agent_id: string;
  name: string;
  department: string;
  purpose: string;
  status: string;
  allowed_task_types: string;
  max_autonomy_level: string;
  default_model: string;
  agent_class: string;
}

const AUTONOMY_COLORS: Record<string, string> = {
  low: "bg-green-900/40 text-green-400",
  medium: "bg-yellow-900/40 text-yellow-400",
  high: "bg-red-900/40 text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-900/40 text-green-400",
  inactive: "bg-red-900/40 text-red-400",
  pending: "bg-yellow-900/40 text-yellow-400",
};

export default function PlatformAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await platformFetch("/agents");
        const data = await response.json();
        
        if (response.ok) {
          // Handle both array and object responses
          const agentList = Array.isArray(data) ? data : (data.agents || []);
          setAgents(agentList);
        } else {
          setError(data.detail || data.error || "Failed to load agents");
        }
      } catch (err) {
        console.error("Error fetching agents:", err);
        setError("Unable to connect to the platform API");
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const parseTaskTypes = (taskTypesString: string): string[] => {
    try {
      return JSON.parse(taskTypesString || "[]");
    } catch {
      return [];
    }
  };

  const toggleAgent = async (agentId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      
      const response = await platformFetch(`/agents/${agentId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setAgents(prev =>
          prev.map(agent =>
            agent.agent_id === agentId
              ? { ...agent, status: newStatus }
              : agent
          )
        );
      } else {
        console.error("Failed to update agent status");
      }
    } catch (err) {
      console.error("Error toggling agent:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Agents</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading agents...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Agents</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-red-400 mb-4">⚠️ {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Agents</h1>
          <p className="text-gray-400 mt-1">
            Manage and monitor your AI agent team ({agents.length} total)
          </p>
        </div>
        <div className="text-sm text-gray-400">
          Live Data • Updated in real-time
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No agents found</p>
          <p className="text-gray-500 text-sm mt-2">
            Agents will appear here once they are registered in the system
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-white">{agent.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[agent.status] || STATUS_COLORS.inactive}`}>
                      {agent.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${AUTONOMY_COLORS[agent.max_autonomy_level] || AUTONOMY_COLORS.medium}`}>
                      {agent.max_autonomy_level} autonomy
                    </span>
                    {agent.agent_class && (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-900/40 text-blue-400">
                        {agent.agent_class}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-300 mb-4">{agent.purpose}</p>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-400">Department:</span>
                      <span className="text-sm text-gray-300 ml-2">{agent.department || "General"}</span>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-400">Model:</span>
                      <span className="text-sm text-gray-300 ml-2">{agent.default_model || "claude-sonnet-4"}</span>
                    </div>
                    
                    {agent.allowed_task_types && (
                      <div>
                        <span className="text-sm font-medium text-gray-400">Capabilities:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {parseTaskTypes(agent.allowed_task_types).slice(0, 6).map((task: string) => (
                            <span
                              key={task}
                              className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded"
                            >
                              {task.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {parseTaskTypes(agent.allowed_task_types).length > 6 && (
                            <span className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded">
                              +{parseTaskTypes(agent.allowed_task_types).length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => toggleAgent(agent.agent_id, agent.status)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      agent.status === "active" ? "bg-green-600" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        agent.status === "active" ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}