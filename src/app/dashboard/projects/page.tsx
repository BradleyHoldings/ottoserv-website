"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ActionStateModal from "@/components/dashboard/ActionStateModal";
import DashboardModal from "@/components/dashboard/DashboardModal";
import EmptyState from "@/components/dashboard/EmptyState";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { getProjects } from "@/lib/dashboardApi";
import {
  archiveProject,
  buildProject,
  filterProjects,
  getFilterCounts,
  getProjectSummary,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  RISK_LABELS,
  sampleProjects,
  sortProjects,
  validateProjectInput,
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
  archivedAt: string | null;
};

type PlaceholderName = "import" | "file" | "changeOrder" | "invoice" | "archive";

const STORAGE_KEY = "ottoserv_projects_local";
const inputClass = "w-full rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none";
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

function saveProjects(projects: Project[]) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="mb-1 block text-xs font-medium text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function KpiCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#111827] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{helper}</p>
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const classes: Record<string, string> = {
    healthy: "border-emerald-800 bg-emerald-950/40 text-emerald-300",
    needs_attention: "border-yellow-800 bg-yellow-950/40 text-yellow-300",
    at_risk: "border-orange-800 bg-orange-950/40 text-orange-300",
    over_budget: "border-red-800 bg-red-950/40 text-red-300",
    past_due: "border-red-800 bg-red-950/40 text-red-300",
  };
  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${classes[risk] || classes.healthy}`}>
      {riskLabel(risk)}
    </span>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [validationError, setValidationError] = useState("");
  const [toast, setToast] = useState("");
  const [placeholder, setPlaceholder] = useState<PlaceholderName | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);

  useEffect(() => {
    let cancelled = false;
    const localProjects = loadProjects();

    getProjects()
      .then((data) => {
        if (cancelled) return;
        const normalized = Array.isArray(data) && data.length
          ? data.map((project, index) => buildProject(project, { sequence: index + 1 }) as Project)
          : localProjects;
        setProjects(normalized);
        setLoadError("");
      })
      .catch(() => {
        if (cancelled) return;
        setProjects(localProjects);
        setLoadError("Project data is temporarily unavailable. Local project actions are still safe.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => getProjectSummary(projects), [projects]);
  const counts = useMemo(() => getFilterCounts(projects), [projects]);
  const filteredProjects = useMemo(() => {
    const filtered = filterProjects(projects, { status: statusFilter, search }) as Project[];
    return sortProjects(filtered, sortKey, sortDir) as Project[];
  }, [projects, search, sortDir, sortKey, statusFilter]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }

  function persist(nextProjects: Project[]) {
    setProjects(nextProjects);
    saveProjects(nextProjects);
  }

  function openCreate() {
    setEditingProject(null);
    setValidationError("");
    setShowModal(true);
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setValidationError("");
    setShowModal(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      id: editingProject?.id,
      projectName: String(form.get("projectName") || ""),
      clientName: String(form.get("clientName") || ""),
      clientId: String(form.get("clientId") || ""),
      projectType: String(form.get("projectType") || ""),
      address: String(form.get("address") || ""),
      status: String(form.get("status") || "planning"),
      startDate: String(form.get("startDate") || ""),
      targetCompletionDate: String(form.get("targetCompletionDate") || ""),
      contractValue: Number(form.get("contractValue") || 0),
      estimatedCost: Number(form.get("estimatedCost") || 0),
      actualCost: editingProject?.actualCost || 0,
      projectManager: String(form.get("projectManager") || ""),
      priority: String(form.get("priority") || "normal"),
      notes: String(form.get("notes") || ""),
      progressPercent: editingProject?.progressPercent || 0,
      nextMilestone: editingProject?.nextMilestone || "",
      openWorkOrders: editingProject?.openWorkOrders || 0,
      createDefaultMilestones: form.get("createDefaultMilestones") === "on",
      createdAt: editingProject?.createdAt,
      activity: editingProject?.activity,
      milestones: editingProject?.milestones,
      linkedWorkOrders: editingProject?.linkedWorkOrders,
      linkedTasks: editingProject?.linkedTasks,
      linkedInvoices: editingProject?.linkedInvoices,
      documents: editingProject?.documents,
    };

    const validation = validateProjectInput(input);
    if (!validation.valid) {
      setValidationError(`Missing required fields: ${validation.missing.join(", ")}`);
      return;
    }

    const project = buildProject(input, { sequence: projects.length + 1, actor: "Operations" }) as Project;
    const nextProjects = editingProject
      ? projects.map((item) => (item.id === editingProject.id ? project : item))
      : [project, ...projects];
    persist(nextProjects);
    setShowModal(false);
    setEditingProject(null);
    notify(editingProject ? "Project updated locally." : "Project created locally. Backend save wiring is pending.");

    if (!editingProject && form.get("createFirstWorkOrder") === "on") {
      window.location.href = `/dashboard/work-orders?projectId=${encodeURIComponent(project.id)}&new=1`;
    }
  }

  function archiveSelected() {
    if (!archiveTarget) return;
    const archived = archiveProject(archiveTarget) as Project;
    persist(projects.map((project) => (project.id === archived.id ? archived : project)));
    setArchiveTarget(null);
    notify("Project archived locally.");
  }

  function routeTo(path: string) {
    window.location.href = path;
  }

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">Manage active jobs, linked work orders, costs, tasks, documents, and billing handoffs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openCreate} className={primaryButton}>+ New Project</button>
          <button onClick={() => setPlaceholder("import")} className={secondaryButton}>Import Projects</button>
          <button onClick={() => routeTo("/dashboard/work-orders?new=1")} className={secondaryButton}>Add Work Order</button>
          <button onClick={() => routeTo("/dashboard/tasks?new=1")} className={secondaryButton}>Add Task</button>
        </div>
      </div>

      {toast && <div className="rounded-lg border border-blue-900/50 bg-blue-950/30 px-4 py-3 text-sm text-blue-200">{toast}</div>}
      {loadError && <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">{loadError}</div>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Active Projects" value={loading ? "..." : summary.activeProjects} helper="Currently in progress" />
        <KpiCard label="Total Contract Value" value={loading ? "..." : currency(summary.totalContractValue)} helper="All non-filtered projects" />
        <KpiCard label="Estimated Cost" value={loading ? "..." : currency(summary.estimatedCost)} helper="Planned job cost" />
        <KpiCard label="Actual Cost" value={loading ? "..." : currency(summary.actualCost)} helper="Cost to date" />
        <KpiCard label="Gross Profit / Margin" value={loading ? "..." : `${currency(summary.grossProfit)} / ${summary.marginPercent}%`} helper="Current portfolio margin" />
        <KpiCard label="Open Work Orders" value={loading ? "..." : summary.openWorkOrders} helper="Linked operational work" />
        <KpiCard label="Projects At Risk" value={loading ? "..." : summary.projectsAtRisk} helper="Needs attention or worse" />
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#111827] p-5">
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {["all", ...PROJECT_STATUSES.filter((status) => status !== "archived")].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === status ? "bg-blue-600 text-white" : "border border-gray-800 bg-[#0b1220] text-gray-400 hover:text-white"}`}
              >
                {status === "all" ? "All" : labelize(status)} {counts[status as keyof typeof counts] ?? 0}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, clients, addresses, or types" className={inputClass} />
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value)} className={inputClass}>
              <option value="updatedAt">Sort by updated date</option>
              <option value="targetCompletionDate">Sort by target completion</option>
              <option value="contractValue">Sort by contract value</option>
              <option value="riskStatus">Sort by risk status</option>
            </select>
          </div>
        </div>

        {projects.length === 0 && !loading ? (
          <EmptyState
            title="No projects yet"
            description="Create your first project to connect scope, work orders, tasks, job costing, invoices, files, and activity in one place."
            actions={[
              { label: "Create Project", onClick: openCreate },
              { label: "Import Projects", onClick: () => setPlaceholder("import"), variant: "secondary" },
            ]}
          />
        ) : (
          <ProjectTable
            projects={filteredProjects}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onEdit={openEdit}
            onArchive={setArchiveTarget}
            onPlaceholder={setPlaceholder}
          />
        )}

        {process.env.NODE_ENV !== "production" && projects.length === 0 && (
          <button
            onClick={() => {
              const demo = sampleProjects() as Project[];
              persist(demo);
              notify("Demo projects loaded locally.");
            }}
            className="mt-4 text-xs text-gray-600 hover:text-gray-300"
          >
            Load demo projects
          </button>
        )}
      </div>

      <ProjectModal
        open={showModal}
        project={editingProject}
        validationError={validationError}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmArchiveModal
        project={archiveTarget}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={archiveSelected}
      />

      <PlaceholderModal placeholder={placeholder} onClose={() => setPlaceholder(null)} />
    </div>
  );
}

function ProjectTable({
  projects,
  sortKey,
  sortDir,
  onSort,
  onEdit,
  onArchive,
  onPlaceholder,
}: {
  projects: Project[];
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onPlaceholder: (name: PlaceholderName) => void;
}) {
  const headers = [
    ["projectName", "Project Name"],
    ["clientName", "Client Name"],
    ["address", "Address"],
    ["projectType", "Project Type"],
    ["status", "Status"],
    ["startDate", "Start Date"],
    ["targetCompletionDate", "Target Completion"],
    ["contractValue", "Contract Value"],
    ["estimatedCost", "Estimated Cost"],
    ["actualCost", "Actual Cost"],
    ["marginPercent", "Margin %"],
    ["openWorkOrders", "Open Work Orders"],
    ["nextMilestone", "Next Milestone"],
    ["riskStatus", "Risk Status"],
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-900/40">
          <tr className="border-b border-gray-800">
            {headers.map(([key, label]) => (
              <th key={key} onClick={() => onSort(key)} className="cursor-pointer whitespace-nowrap px-4 py-3 text-left font-medium text-gray-400 hover:text-white">
                {label}{sortKey === key ? <span className="ml-1 text-blue-400">{sortDir === "asc" ? "up" : "down"}</span> : null}
              </th>
            ))}
            <th className="px-4 py-3 text-left font-medium text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 ? (
            <tr><td colSpan={headers.length + 1} className="px-4 py-10 text-center text-gray-500">No matching projects.</td></tr>
          ) : (
            projects.map((project) => (
              <tr key={project.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30">
                <td className="min-w-60 px-4 py-3">
                  <Link href={`/dashboard/projects/${project.id}`} className="font-medium text-white hover:text-blue-300">{project.projectName}</Link>
                  <p className="mt-0.5 font-mono text-xs text-gray-600">{project.id}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{project.clientName}</td>
                <td className="min-w-52 px-4 py-3 text-gray-400">{project.address || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{project.projectType}</td>
                <td className="px-4 py-3"><StatusBadge status={project.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-400">{project.startDate || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-400">{project.targetCompletionDate || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{currency(project.contractValue)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{currency(project.estimatedCost)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{currency(project.actualCost)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{project.marginPercent}%</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{project.openWorkOrders}</td>
                <td className="min-w-52 px-4 py-3 text-gray-400">{project.nextMilestone || "No milestone set"}</td>
                <td className="px-4 py-3"><RiskBadge risk={project.riskStatus} /></td>
                <td className="min-w-[360px] px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/projects/${project.id}`} className="text-xs text-blue-400 hover:text-blue-300">View</Link>
                    <button onClick={() => onEdit(project)} className="text-xs text-gray-300 hover:text-white">Edit</button>
                    <Link href={`/dashboard/work-orders?projectId=${project.id}&new=1`} className="text-xs text-gray-300 hover:text-white">Create Work Order</Link>
                    <Link href={`/dashboard/job-costing?projectId=${project.id}&new=1`} className="text-xs text-gray-300 hover:text-white">Add Cost</Link>
                    <Link href={`/dashboard/tasks?projectId=${project.id}&new=1`} className="text-xs text-gray-300 hover:text-white">Add Task</Link>
                    <button onClick={() => onPlaceholder("file")} className="text-xs text-gray-300 hover:text-white">Upload File</button>
                    <button onClick={() => onPlaceholder("changeOrder")} className="text-xs text-gray-300 hover:text-white">Change Order</button>
                    <button onClick={() => onPlaceholder("invoice")} className="text-xs text-gray-300 hover:text-white">Create Invoice</button>
                    <button onClick={() => onArchive(project)} className="text-xs text-red-400 hover:text-red-300">Archive</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProjectModal({
  open,
  project,
  validationError,
  onClose,
  onSubmit,
}: {
  open: boolean;
  project: Project | null;
  validationError: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <DashboardModal open={open} title={project ? "Edit Project" : "New Project"} description="Capture the project, client, schedule, budget, ownership, and next workflow." onClose={onClose} size="lg">
      <form onSubmit={onSubmit} className="space-y-5">
        {validationError && <div className="rounded-lg border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-200">{validationError}</div>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Project Name *"><input name="projectName" required defaultValue={project?.projectName || ""} className={inputClass} /></Field>
          <Field label="Client Name *"><input name="clientName" required defaultValue={project?.clientName || ""} className={inputClass} /></Field>
          <Field label="Client / CRM Contact"><input name="clientId" defaultValue={project?.clientId || ""} placeholder="CRM contact ID or name" className={inputClass} /></Field>
          <Field label="Project Type *"><select name="projectType" required defaultValue={project?.projectType || "Repair"} className={inputClass}>{PROJECT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
          <Field label="Address" wide><input name="address" defaultValue={project?.address || ""} className={inputClass} /></Field>
          <Field label="Status"><select name="status" defaultValue={project?.status || "planning"} className={inputClass}><option value="planning">Planning</option><option value="in_progress">In Progress</option><option value="on_hold">On Hold</option><option value="complete">Complete</option><option value="archived">Archived</option></select></Field>
          <Field label="Project Manager"><input name="projectManager" defaultValue={project?.projectManager || ""} className={inputClass} /></Field>
          <Field label="Start Date"><input name="startDate" type="date" defaultValue={project?.startDate || ""} className={inputClass} /></Field>
          <Field label="Target Completion"><input name="targetCompletionDate" type="date" defaultValue={project?.targetCompletionDate || ""} className={inputClass} /></Field>
          <Field label="Contract Value"><input name="contractValue" type="number" min="0" defaultValue={project?.contractValue || ""} className={inputClass} /></Field>
          <Field label="Estimated Cost"><input name="estimatedCost" type="number" min="0" defaultValue={project?.estimatedCost || ""} className={inputClass} /></Field>
          <Field label="Priority"><select name="priority" defaultValue={project?.priority || "normal"} className={inputClass}>{PROJECT_PRIORITIES.map((priority) => <option key={priority} value={priority}>{labelize(priority)}</option>)}</select></Field>
          <Field label="Notes" wide><textarea name="notes" rows={3} defaultValue={project?.notes || ""} className={inputClass} /></Field>
          {!project && (
            <>
              <label className="flex items-center gap-2 rounded-lg border border-gray-800 bg-[#0b1220] px-3 py-2 text-sm text-gray-300">
                <input name="createDefaultMilestones" type="checkbox" /> Create default milestones
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-800 bg-[#0b1220] px-3 py-2 text-sm text-gray-300">
                <input name="createFirstWorkOrder" type="checkbox" /> Create first work order after saving
              </label>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" className={primaryButton}>{project ? "Save Changes" : "Create Project"}</button>
        </div>
      </form>
    </DashboardModal>
  );
}

function ConfirmArchiveModal({ project, onCancel, onConfirm }: { project: Project | null; onCancel: () => void; onConfirm: () => void }) {
  return (
    <DashboardModal open={Boolean(project)} title="Archive Project" description={project ? `Archive ${project.projectName}? It will remain in local project history.` : ""} onClose={onCancel} footer={
      <>
        <button onClick={onCancel} className={secondaryButton}>Cancel</button>
        <button onClick={onConfirm} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600">Archive</button>
      </>
    }>
      <p className="text-sm text-gray-400">Archiving hides the project from active filters and records an activity entry. Backend archive wiring is still pending.</p>
    </DashboardModal>
  );
}

function PlaceholderModal({ placeholder, onClose }: { placeholder: PlaceholderName | null; onClose: () => void }) {
  const content: Record<PlaceholderName, { title: string; description: string }> = {
    import: {
      title: "Import Projects",
      description: "Project import from CSV, Google Sheets, CRM, or property management systems is coming soon.",
    },
    file: {
      title: "Upload Files",
      description: "Document/photo upload UI is ready for backend storage wiring. Use Documents once storage is connected.",
    },
    changeOrder: {
      title: "Create Change Order",
      description: "Change orders will track scope changes, approvals, contract deltas, and invoice handoff.",
    },
    invoice: {
      title: "Create Invoice",
      description: "Invoices are not a standalone route yet. This will connect to Financials with the project ID.",
    },
    archive: {
      title: "Archive Project",
      description: "Archive confirmation is handled in the project table.",
    },
  };
  const state = placeholder ? content[placeholder] : null;
  return <ActionStateModal open={Boolean(state)} kind="coming_soon" featureName={state?.title || "Project workflow"} description={state?.description} onClose={onClose} />;
}
