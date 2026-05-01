"use client";

import KpiCard from "@/components/dashboard/KpiCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { mockTeamMembers, mockProjects } from "@/lib/mockData";

const TYPE_COLORS: Record<string, string> = {
  employee: "bg-blue-900/40 text-blue-400 border border-blue-800",
  contractor: "bg-purple-900/40 text-purple-400 border border-purple-800",
};

export default function TeamPage() {
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
            {employees} employees · {contractors} contractors
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Add Team Member
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard value={mockTeamMembers.length} label="Team Members" color="blue" />
        <KpiCard value={totalHours} label="Hours This Week" color="green" trend="All active" trendDirection="up" />
        <KpiCard value={`$${totalLaborCost.toLocaleString()}`} label="Payroll This Week" color="yellow" />
        <KpiCard value={mockProjects.filter((p) => p.status === "in_progress").length} label="Active Job Sites" color="purple" />
      </div>

      {/* Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {mockTeamMembers.map((member) => (
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
        ))}
      </div>

      {/* Weekly Timesheet Summary */}
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
                  {member.hourly_rate > 0 ? `$${member.hourly_rate}/hr` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-yellow-400 font-medium">
                  {member.hourly_rate > 0
                    ? `$${(member.hours_this_week * member.hourly_rate).toLocaleString()}`
                    : "—"}
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
          </tbody>
        </table>
      </div>

      {/* Labor Cost by Project Placeholder */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Labor Cost by Project</h2>
        <div className="space-y-3">
          {mockProjects.filter((p) => p.status === "in_progress").map((project) => {
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
        <p className="text-gray-600 text-xs mt-4 text-center">
          Chart view coming soon — connect time-tracking integration for live data
        </p>
      </div>
    </div>
  );
}
