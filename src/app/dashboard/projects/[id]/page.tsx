"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import ActionStateModal from "@/components/dashboard/ActionStateModal";
import EmptyState from "@/components/dashboard/EmptyState";
import StatusBadge from "@/components/dashboard/StatusBadge";
import {
  buildProject,
  getProjectFinancials,
  getProjectInsights,
  RISK_LABELS,
  sampleProjects,
} from "@/lib/projects.mjs";

type Project = {
  id: string;
  projectName: string;
  clientName: string;
  clientId?: string;
  address: string;
  projectType: string;
  status: string;
  stage: string;
  startDate: string;
  targetCompletionDate: string;
  contractValue: number;
  estimatedCost: number;
  actualCost: number;
  grossProfit: number;
  marginPercent: number;
  projectManager: string;
  priority: string;
  progressPercent: number;
  nextMilestone: string;
  riskStatus: string;
  notes: string;
  openWorkOrders: number;
  linkedWorkOrders: unknown[];
  linkedTasks: unknown[];
  linkedInvoices: unknown[];
  documents: unknown[];
  milestones: Array<{ id: string; title: string; dueDate: string; status: string }>;
  activity: Array<{ id: string; title: string; description: string; createdAt: string; type: string }>;
  createdAt: string;
  updatedAt: string;
};

type PlaceholderName = "document" | "milestone" | "vendor" | "invoice" | "ai";

const STORAGE_KEY = "ottoserv_projects_local";
const secondaryButton = "rounded-lg border border-gray-700 bg-[#1f2937] px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700";
const primaryButton = "rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700";

function currency(value = 0) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function riskLabel(risk: string) {
  return (RISK_LABELS as Record<string, string>)[risk] || labelize(risk || "healthy");
}

function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map((project, index) => buildProject(project, { sequence: index + 1 }) as Project) : [];
  } catch {
    return [];
  }
}

function RiskBadge({ risk }: { risk: string }) {
  const classes: Record<string, string> = {
    healthy: "border-emerald-800 bg-emerald-950/40 text-emerald-300",
    needs_attention: "border-yellow-800 bg-yellow-950/40 text-yellow-300",
    at_risk: "border-orange-800 bg-orange-950/40 text-orange-300",
    over_budget: "border-red-800 bg-red-950/40 text-red-300",
    past_due: "border-red-800 bg-red-950/40 text-red-300",
  };
  return <span className={`rounded border px-2 py-0.5 text-xs font-medium ${classes[risk] || classes.healthy}`}>{riskLabel(risk)}</span>;
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#0b1220] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-200">{value}</p>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-800 bg-[#111827] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project] = useState<Project | null>(() => {
    const localProjects = loadProjects();
    const found = localProjects.find((item) => item.id === id);
    if (found) return found;
    if (process.env.NODE_ENV !== "production") {
      return (sampleProjects() as Project[]).find((item) => item.id === id) || null;
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState("Overview");
  const [placeholder, setPlaceholder] = useState<PlaceholderName | null>(null);

  const financials = useMemo(() => getProjectFinancials(project || {}), [project]);
  const insights = useMemo(() => getProjectInsights(project || {}), [project]);

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        description="This project is not available in local project state yet. Create a project from the Projects page, then open its detail view."
        actions={[{ label: "Back to Projects", href: "/dashboard/projects" }]}
      />
    );
  }

  const tabs = ["Overview", "Work Orders", "Job Costing", "Schedule", "Team/Labor", "Vendors", "Documents", "Invoices", "Activity", "AI Insights"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/projects" className="text-gray-500 hover:text-white">Back to Projects</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">{project.projectName}</span>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="font-mono text-xs text-gray-600">{project.id}</p>
            <h1 className="mt-1 text-2xl font-bold text-white">{project.projectName}</h1>
            <p className="mt-1 text-sm text-gray-500">{project.clientName} / {project.address || "No address yet"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={project.status} size="md" />
              <RiskBadge risk={project.riskStatus} />
              <span className="rounded border border-gray-700 bg-[#0b1220] px-2 py-0.5 text-xs text-gray-300">{labelize(project.priority)} priority</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/work-orders?projectId=${project.id}&new=1`} className={primaryButton}>Create Work Order</Link>
            <Link href={`/dashboard/job-costing?projectId=${project.id}&new=1`} className={secondaryButton}>Add Cost</Link>
            <Link href={`/dashboard/tasks?projectId=${project.id}&new=1`} className={secondaryButton}>Add Task</Link>
            <button onClick={() => setPlaceholder("document")} className={secondaryButton}>Upload Files</button>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-400">Progress</span>
            <span className="font-medium text-white">{project.progressPercent}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-800">
            <div className="h-2.5 rounded-full bg-blue-500" style={{ width: `${Math.min(project.progressPercent, 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-2">
            <Info label="Client" value={project.clientName} />
            <Info label="Address" value={project.address || "-"} />
            <Info label="Status" value={labelize(project.status)} />
            <Info label="Stage" value={project.stage} />
            <Info label="Project Manager" value={project.projectManager || "Unassigned"} />
            <Info label="Start Date" value={project.startDate || "-"} />
            <Info label="Target Completion" value={project.targetCompletionDate || "-"} />
            <Info label="Contract Value" value={currency(project.contractValue)} />
            <Info label="Estimated Cost" value={currency(project.estimatedCost)} />
            <Info label="Actual Cost" value={currency(project.actualCost)} />
            <Info label="Gross Profit" value={currency(financials.grossProfit)} />
            <Info label="Margin" value={`${financials.marginPercent}%`} />
            <Info label="Next Milestone" value={project.nextMilestone || "No milestone set"} />
            <Info label="Risk Status" value={riskLabel(project.riskStatus)} />
          </div>
          <Section title="Notes">
            <p className="text-sm leading-relaxed text-gray-400">{project.notes || "No notes yet."}</p>
          </Section>
        </div>
      )}

      {activeTab === "Work Orders" && (
        <Section title="Linked Work Orders" action={<Link href={`/dashboard/work-orders?projectId=${project.id}&new=1`} className={primaryButton}>Create Work Order</Link>}>
          <EmptyState title="No linked work orders" description="Create a work order from this project to track field execution, scheduling, labor, materials, and closeout." actions={[{ label: "Create Work Order", href: `/dashboard/work-orders?projectId=${project.id}&new=1` }]} />
        </Section>
      )}

      {activeTab === "Job Costing" && (
        <Section title="Job Costing" action={<Link href={`/dashboard/job-costing?projectId=${project.id}&new=1`} className={primaryButton}>Add Cost</Link>}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Info label="Estimated Cost" value={currency(project.estimatedCost)} />
            <Info label="Actual Cost" value={currency(project.actualCost)} />
            <Info label="Variance" value={currency(project.estimatedCost - project.actualCost)} />
          </div>
        </Section>
      )}

      {activeTab === "Schedule" && (
        <Section title="Schedule" action={<button onClick={() => setPlaceholder("milestone")} className={primaryButton}>Add Milestone</button>}>
          {project.milestones.length === 0 ? (
            <EmptyState title="No milestones yet" description="Milestones and site visits will appear here once schedule tracking is connected." actions={[{ label: "Add Milestone", onClick: () => setPlaceholder("milestone") }, { label: "Schedule Site Visit", href: `/dashboard/calendar?projectId=${project.id}&new=1`, variant: "secondary" }]} />
          ) : (
            <div className="space-y-2">{project.milestones.map((milestone) => <div key={milestone.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0b1220] px-4 py-3 text-sm"><span className="text-white">{milestone.title}</span><span className="text-gray-500">{milestone.dueDate || "No due date"}</span></div>)}</div>
          )}
        </Section>
      )}

      {activeTab === "Team/Labor" && (
        <Section title="Team / Labor" action={<Link href={`/dashboard/team?projectId=${project.id}&new=1`} className={primaryButton}>Add Labor Entry</Link>}>
          <EmptyState title="No labor entries yet" description="Labor entries will connect this project to team utilization and job costing." actions={[{ label: "Add Labor Entry", href: `/dashboard/team?projectId=${project.id}&new=1` }]} />
        </Section>
      )}

      {activeTab === "Vendors" && (
        <Section title="Vendors / Subcontractors" action={<Link href={`/dashboard/vendors?projectId=${project.id}&new=1`} className={primaryButton}>Add Vendor/Subcontractor</Link>}>
          <EmptyState title="No vendors linked" description="Link vendors and subcontractors to coordinate assignments, approvals, and costs." actions={[{ label: "Add Vendor/Subcontractor", href: `/dashboard/vendors?projectId=${project.id}&new=1` }]} />
        </Section>
      )}

      {activeTab === "Documents" && (
        <Section title="Documents" action={<button onClick={() => setPlaceholder("document")} className={primaryButton}>Upload Files</button>}>
          <EmptyState title="No documents yet" description="Upload is not connected yet. Documents, photos, proposals, and closeout files will appear here once storage is wired." actions={[{ label: "Upload Files", onClick: () => setPlaceholder("document") }, { label: "Open Documents", href: `/dashboard/documents?projectId=${project.id}`, variant: "secondary" }]} />
        </Section>
      )}

      {activeTab === "Invoices" && (
        <Section title="Invoices" action={<button onClick={() => setPlaceholder("invoice")} className={primaryButton}>Create Invoice</button>}>
          <EmptyState title="Invoices module not connected yet" description="Invoice handoff will connect projects to Financials when project-linked invoicing is wired." actions={[{ label: "View Financials", href: `/dashboard/financials?projectId=${project.id}` }, { label: "Create Invoice", onClick: () => setPlaceholder("invoice"), variant: "secondary" }]} />
        </Section>
      )}

      {activeTab === "Activity" && (
        <Section title="Activity">
          <div className="space-y-3">
            {project.activity.map((activity) => (
              <div key={activity.id} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-white">{activity.title}</p>
                <p className="text-xs text-gray-500">{new Date(activity.createdAt).toLocaleString()}</p>
                <p className="mt-1 text-sm text-gray-400">{activity.description}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {activeTab === "AI Insights" && (
        <Section title="AI Insights" action={<button onClick={() => setPlaceholder("ai")} className={secondaryButton}>Generate Project Summary</button>}>
          <div className="space-y-3">
            {insights.map((insight) => (
              <div key={insight.title} className="rounded-lg border border-gray-800 bg-[#0b1220] p-4">
                <p className="text-sm font-medium text-white">{insight.title}</p>
                <p className="mt-1 text-sm text-gray-400">{insight.description}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <PlaceholderModal placeholder={placeholder} onClose={() => setPlaceholder(null)} />
    </div>
  );
}

function PlaceholderModal({ placeholder, onClose }: { placeholder: PlaceholderName | null; onClose: () => void }) {
  const content: Record<PlaceholderName, { title: string; description: string }> = {
    document: { title: "Upload Not Connected Yet", description: "Project files will connect to dashboard document storage when the upload backend is wired." },
    milestone: { title: "Milestone Workflow", description: "Milestone creation will connect to tasks/calendar once schedule backend support is ready." },
    vendor: { title: "Vendor Link", description: "Vendor/subcontractor linking routes to the Vendors module for now." },
    invoice: { title: "Invoices Module Not Connected Yet", description: "Project-linked invoice creation will connect through Financials." },
    ai: { title: "Project Summary AI", description: "Rule-based insights are shown now. Full AI project summaries need the Jarvis project endpoint." },
  };
  const state = placeholder ? content[placeholder] : null;
  return <ActionStateModal open={Boolean(state)} kind="coming_soon" featureName={state?.title || "Project workflow"} description={state?.description} onClose={onClose} />;
}
