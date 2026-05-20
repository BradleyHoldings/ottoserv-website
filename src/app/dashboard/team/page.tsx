"use client";

import { useState } from "react";
import KpiCard from "@/components/dashboard/KpiCard";
import ComingSoonBanner from "@/components/dashboard/ComingSoonBanner";
import EmptyState from "@/components/dashboard/EmptyState";
import ActionStateModal from "@/components/dashboard/ActionStateModal";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  type: "employee" | "contractor";
  hours_this_week: number;
  hourly_rate: number;
  jobs_assigned: number;
  phone: string;
}

interface TeamProject {
  id: string;
  project_name: string;
  status: string;
  estimated_cost: number;
  actual_cost: number;
}

const mockTeamMembers: TeamMember[] = [];
const mockProjects: TeamProject[] = [];

const TYPE_COLORS: Record<TeamMember["type"], string> = {
  employee: "bg-blue-900/40 text-blue-400 border border-blue-800",
  contractor: "bg-purple-900/40 text-purple-400 border border-purple-800",
};

export default function TeamPage() {
  const [teamSetupOpen, setTeamSetupOpen] = useState(false);
  const activeProjects = mockProjects.filter((p) => p.status === "in_progress");
  const totalHours = mockTeamMembers.reduce((s, m) => s + m.hours_this_week, 0);
  const totalLaborCost = mockTeamMembers
    .filter((m) => m.hourly_rate > 0)
    .reduce((s, m) => s + m.hours_this_week * m.hourly_rate, 0);
  const employees = mockTeamMembers.filter((m) => m.type === "employee").length;
  const contractors = mockTeamMembers.filter((m) => m.type === "contractor").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Team / Labor</h1>
          <p className="text-gray-500 text-sm mt-1">
            {employees} employees / {contractors} contractors
          </p>
        </div>
        <button
          onClick={() => setTeamSetupOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Team Member
        </button>
      </div>

      <ComingSoonBanner
        tone="not_configured"
        title="Team and labor tracking not configured"
        description="Add a team roster manually after setup, or connect payroll/time tracking when the integration is ready."
        action={{ label: "Open team setup", onClick: () => setTeamSetupOpen(true) }}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard value={mockTeamMembers.length} label="Team Members" color="blue" />
        <KpiCard value={totalHours} label="Hours This Week" color="green" trend="No active timesheets" trendDirection="up" />
        <KpiCard value={`$${totalLaborCost.toLocaleString()}`} label="Payroll This Week" color="yellow" />
        <KpiCard value={activeProjects.length} label="Active Job Sites" color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {mockTeamMembers.length === 0 ? (
          <div className="md:col-span-2">
            <EmptyState
              variant="not_configured"
              title="No team members yet"
              description="Set up your roster to assign labor, track weekly hours, and link crews to jobs."
              actions={[{ label: "Add team member", onClick: () => setTeamSetupOpen(true) }]}
            />
          </div>
        ) : (
          mockTeamMembers.map((member) => (
            <div key={member.id} className="bg-[#111827] border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/30 border border-blue-600/50 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                    {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{member.name}</h3>
                    <p className="text-gray-400 text-sm">{member.role}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[member.type]}`}>
                  {member.type}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs mb-4">
                <div>
                  <p className="text-gray-500 mb-0.5">Hours / Week</p>
                  <p className="text-white font-medium">{member.hours_this_week}h</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Jobs Assigned</p>
                  <p className="text-white font-medium">{member.jobs_assigned}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Rate</p>
                  <p className="text-green-400 font-medium">
                    {member.hourly_rate > 0 ? `$${member.hourly_rate}/hr` : "Salaried"}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
                <span className="text-gray-500 text-xs">{member.phone}</span>
                {member.hourly_rate > 0 && (
                  <span className="text-yellow-400 text-xs font-medium">
                    ${(member.hours_this_week * member.hourly_rate).toLocaleString()} this week
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Weekly Timesheet Summary</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 font-medium px-6 py-3">Team Member</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Type</th>
              <th className="text-right text-gray-500 font-medium px-4 py-3">Hours</th>
              <th className="text-right text-gray-500 font-medium px-4 py-3">Rate</th>
              <th className="text-right text-gray-500 font-medium px-4 py-3">Week Total</th>
            </tr>
          </thead>
          <tbody>
            {mockTeamMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8">
                  <EmptyState
                    variant="not_configured"
                    title="No timesheets available"
                    description="Timesheet totals will appear after team members and time tracking are configured."
                    actions={[{ label: "Open setup", onClick: () => setTeamSetupOpen(true) }]}
                    className="py-10"
                  />
                </td>
              </tr>
            ) : (
              <>
                {mockTeamMembers.map((member) => (
                  <tr key={member.id} className="border-b border-gray-800 last:border-0">
                    <td className="px-6 py-3">
                      <p className="text-white">{member.name}</p>
                      <p className="text-gray-500 text-xs">{member.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[member.type]}`}>
                        {member.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{member.hours_this_week}h</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {member.hourly_rate > 0 ? `$${member.hourly_rate}/hr` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-yellow-400 font-medium">
                      {member.hourly_rate > 0
                        ? `$${(member.hours_this_week * member.hourly_rate).toLocaleString()}`
                        : "-"}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-800/20">
                  <td colSpan={2} className="px-6 py-3 text-gray-400 font-medium text-sm">Totals</td>
                  <td className="px-4 py-3 text-right text-white font-bold">{totalHours}h</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right text-yellow-400 font-bold">
                    ${totalLaborCost.toLocaleString()}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Labor Cost by Project</h2>
        {activeProjects.length === 0 ? (
          <EmptyState
            variant="integration_required"
            title="No active labor cost data"
            description="Connect projects and time tracking to compare estimated vs actual labor."
            actions={[{ label: "Open integrations", href: "/dashboard/integrations" }]}
            className="py-10"
          />
        ) : (
          <div className="space-y-3">
            {activeProjects.map((project) => {
              const laborEst = Math.round(project.estimated_cost * 0.4);
              const laborActual = Math.round(project.actual_cost * 0.45);
              const pct = laborEst > 0 ? Math.round((laborActual / laborEst) * 100) : 0;
              return (
                <div key={project.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{project.project_name}</span>
                    <span className="text-gray-400">
                      ${laborActual.toLocaleString()} / ${laborEst.toLocaleString()} est
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${pct > 100 ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-blue-500"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ActionStateModal
        open={teamSetupOpen}
        kind="not_configured"
        featureName="Team / Labor"
        description="Team creation needs roster settings or a payroll/time-tracking integration before it can save live team members."
        primaryHref="/dashboard/settings?panel=team"
        onClose={() => setTeamSetupOpen(false)}
      />
    </div>
  );
}
