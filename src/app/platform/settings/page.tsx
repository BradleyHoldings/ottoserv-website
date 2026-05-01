"use client";

import { useEffect, useState } from "react";
import { platformFetch, getPlatformUser } from "@/lib/platformApi";

interface CompanyInfo {
  name: string;
  slug: string;
  industry: string;
  plan: string;
  created_at?: string;
}

interface Department {
  id: string;
  name: string;
  head?: string;
  agent_count?: number;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-900/40 text-purple-400",
  manager: "bg-blue-900/40 text-blue-400",
  operator: "bg-green-900/40 text-green-400",
  viewer: "bg-gray-800 text-gray-400",
};

export default function PlatformSettingsPage() {
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const localUser = getPlatformUser();

  useEffect(() => {
    Promise.all([
      platformFetch("/settings/company").then((r) => r.json()),
      platformFetch("/settings/departments").then((r) => r.json()),
      platformFetch("/settings/users").then((r) => r.json()),
    ])
      .then(([companyData, depsData, usersData]) => {
        setCompany(companyData.company ?? companyData);
        setDepartments(Array.isArray(depsData) ? depsData : (depsData.departments ?? []));
        setUsers(Array.isArray(usersData) ? usersData : (usersData.users ?? []));
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load settings.");
        setLoading(false);
      });
  }, []);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2 className="text-white font-semibold mb-4">{title}</h2>
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">{children}</div>
    </section>
  );

  const Field = ({ label, value }: { label: string; value?: string }) => (
    <div>
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-white text-sm">{value || "—"}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Platform configuration and team management</p>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Company info */}
      <Section title="Company Information">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Field label="Company Name" value={company?.name ?? (localUser as Record<string, string>)?.company} />
            <Field label="Workspace Slug" value={company?.slug} />
            <Field label="Industry" value={company?.industry} />
            <Field
              label="Plan"
              value={company?.plan ? company.plan.replace(/\b\w/g, (c) => c.toUpperCase()) : undefined}
            />
          </div>
        )}
      </Section>

      {/* Departments */}
      <Section title="Departments">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : departments.length === 0 ? (
          <p className="text-gray-500 text-sm">No departments configured.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-white text-sm font-medium">{dept.name}</p>
                  {dept.head && <p className="text-gray-500 text-xs mt-0.5">Head: {dept.head}</p>}
                </div>
                {typeof dept.agent_count === "number" && (
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    {dept.agent_count} agent{dept.agent_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Users */}
      <Section title="Team Members">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-sm">No users found.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 font-medium pb-3">Name</th>
                  <th className="text-left text-gray-400 font-medium pb-3 hidden md:table-cell">Email</th>
                  <th className="text-left text-gray-400 font-medium pb-3">Role</th>
                  <th className="text-left text-gray-400 font-medium pb-3 hidden lg:table-cell">Department</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-800 last:border-0">
                    <td className="py-3 pr-4 text-white">{user.name}</td>
                    <td className="py-3 pr-4 text-gray-400 hidden md:table-cell">{user.email}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded capitalize ${ROLE_COLORS[user.role] ?? "bg-gray-800 text-gray-400"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 hidden lg:table-cell">{user.department || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Integrations placeholder */}
      <Section title="Integrations">
        <div className="space-y-3">
          {[
            { name: "Slack", desc: "Receive notifications and approvals in Slack channels.", status: "not_connected" },
            { name: "Zapier", desc: "Connect tasks and events to 5,000+ apps.", status: "not_connected" },
            { name: "Webhook", desc: "Send real-time events to your own endpoints.", status: "not_connected" },
            { name: "API Access", desc: "Programmatic access via REST API keys.", status: "available" },
          ].map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0"
            >
              <div>
                <p className="text-white text-sm font-medium">{integration.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{integration.desc}</p>
              </div>
              <button
                disabled
                className="text-xs px-3 py-1.5 bg-[#1f2937] text-gray-500 border border-gray-700 rounded-md cursor-not-allowed"
              >
                {integration.status === "available" ? "Configure" : "Coming Soon"}
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
