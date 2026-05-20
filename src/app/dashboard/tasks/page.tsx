"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ActionStateModal from "@/components/dashboard/ActionStateModal";
import DashboardModal from "@/components/dashboard/DashboardModal";
import EmptyState from "@/components/dashboard/EmptyState";
import PriorityBadge from "@/components/dashboard/PriorityBadge";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { getProjects, getTasks, hasPlatformAccess } from "@/lib/dashboardApi";
import {
  approveTask,
  archiveTask,
  assignTask,
  buildTask,
  createTaskFromSuggestion,
  filterTasks,
  getSuggestedTasks,
  getTaskSummary,
  isTaskOverdue,
  markTaskDone,
  rejectTask,
  snoozeTask,
  startTask,
  TASK_PRIORITIES,
  TASK_RECURRENCES,
  TASK_SOURCES,
  TASK_STATUSES,
  TASK_TYPES,
  TASK_VISIBILITIES,
  validateTaskInput,
} from "@/lib/tasks.mjs";

type TaskRecord = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  source: string;
  assignedTo: string;
  createdBy: string;
  clientId?: string;
  leadId?: string;
  projectId?: string;
  workOrderId?: string;
  invoiceId?: string;
  estimateId?: string;
  automationId?: string;
  reportId?: string;
  dueDate: string;
  reminderDate?: string;
  completedAt?: string;
  completedBy?: string;
  approvalRequired: boolean;
  approvalStatus: string;
  rejectionReason?: string;
  visibility: string;
  recurrence: string;
  attachments: unknown[];
  relatedRecordType?: string;
  relatedRecordId?: string;
  relatedRecordLabel?: string;
  relatedRecordHref?: string;
  createdAt: string;
  updatedAt: string;
  activityLog: { timestamp: string; actor: string; action: string; detail?: string }[];
};

type ProjectOption = { id: string; projectName?: string; project_name?: string; clientName?: string; client_name?: string };
type TaskForm = {
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  dueDate: string;
  reminderDate: string;
  assignedTo: string;
  relatedRecordType: string;
  relatedRecordId: string;
  relatedRecordLabel: string;
  source: string;
  visibility: string;
  approvalRequired: boolean;
  recurrence: string;
};

const STORAGE_KEY = "ottoserv_tasks_local";
const ASSIGNEES = ["Operations", "Avery", "Morgan", "Field Team", "Jarvis"];

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  type: "general",
  priority: "medium",
  status: "open",
  dueDate: "",
  reminderDate: "",
  assignedTo: "Operations",
  relatedRecordType: "project",
  relatedRecordId: "",
  relatedRecordLabel: "",
  source: "manual",
  visibility: "client_visible",
  approvalRequired: false,
  recurrence: "none",
};

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeApiTask(task: Record<string, unknown>, index: number): TaskRecord {
  return buildTask(
    {
      id: String(task.id ?? ""),
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      source: task.source,
      assignedTo: task.assignedTo ?? task.assigned_to,
      createdBy: task.createdBy ?? task.created_by,
      clientId: task.clientId ?? task.client_id,
      leadId: task.leadId ?? task.lead_id,
      projectId: task.projectId ?? task.project_id,
      workOrderId: task.workOrderId ?? task.work_order_id,
      invoiceId: task.invoiceId ?? task.invoice_id,
      estimateId: task.estimateId ?? task.estimate_id,
      automationId: task.automationId ?? task.automation_id,
      reportId: task.reportId ?? task.report_id,
      dueDate: task.dueDate ?? task.due_date,
      reminderDate: task.reminderDate ?? task.reminder_date,
      approvalRequired: task.approvalRequired ?? task.approval_required,
      approvalStatus: task.approvalStatus ?? task.approval_status,
      visibility: task.visibility,
      recurrence: task.recurrence,
      relatedRecordType: task.relatedRecordType ?? task.related_type,
      relatedRecordId: task.relatedRecordId ?? task.related_id,
      relatedRecordLabel: task.relatedRecordLabel ?? task.related_label,
      createdAt: task.createdAt ?? task.created_at,
      updatedAt: task.updatedAt ?? task.updated_at,
      activityLog: Array.isArray(task.activityLog) ? task.activityLog : [],
    },
    { sequence: index + 1, actor: "OttoServ" },
  ) as TaskRecord;
}

function readStoredTasks(): TaskRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function writeStoredTasks(tasks: TaskRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-5 right-5 z-[70] rounded-xl border border-blue-800 bg-blue-950 px-4 py-3 text-sm text-blue-100 shadow-2xl">
      {message}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  active,
  onClick,
}: {
  label: string;
  value: number;
  helper: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-colors ${
        active ? "border-blue-500 bg-blue-950/30" : "border-gray-800 bg-[#111827] hover:border-gray-700 hover:bg-[#132033]"
      }`}
    >
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-gray-200">{label}</p>
      <p className="mt-1 text-xs text-gray-500">{helper}</p>
    </button>
  );
}

function TaskModal({
  open,
  mode,
  form,
  errors,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  form: TaskForm;
  errors: string[];
  onChange: (patch: Partial<TaskForm>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const hasContent = Object.entries(form).some(([key, value]) => key !== "approvalRequired" && value && value !== EMPTY_FORM[key as keyof TaskForm]);
  const handleClose = () => {
    if (hasContent && !window.confirm("Discard this task draft?")) return;
    onClose();
  };

  return (
    <DashboardModal
      open={open}
      title={mode === "edit" ? "Edit Task" : "New Task"}
      description="Capture manual work, client follow-up, approvals, and Otto/Jarvis operational actions."
      size="lg"
      onClose={handleClose}
      footer={
        <>
          <button onClick={handleClose} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={onSubmit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Save Task
          </button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        {errors.length > 0 && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {errors.join(", ")} required.
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Title *</label>
          <input
            value={form.title}
            onChange={(event) => onChange({ title: event.target.value })}
            className="w-full rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
            className="w-full rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Task Type" value={form.type} options={TASK_TYPES} onChange={(type) => onChange({ type })} />
          <SelectField label="Priority" value={form.priority} options={TASK_PRIORITIES} onChange={(priority) => onChange({ priority })} />
          <SelectField label="Status" value={form.status} options={TASK_STATUSES.filter((status) => status !== "archived")} onChange={(status) => onChange({ status })} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="Due Date" type="date" value={form.dueDate} onChange={(dueDate) => onChange({ dueDate })} />
          <InputField label="Reminder Date" type="date" value={form.reminderDate} onChange={(reminderDate) => onChange({ reminderDate })} />
          <InputField label="Assigned To" value={form.assignedTo} onChange={(assignedTo) => onChange({ assignedTo })} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField
            label="Related Record Type"
            value={form.relatedRecordType}
            options={["project", "work_order", "lead", "crm", "invoice", "automation", "report", "none"]}
            onChange={(relatedRecordType) => onChange({ relatedRecordType })}
          />
          <InputField label="Related Record ID" value={form.relatedRecordId} onChange={(relatedRecordId) => onChange({ relatedRecordId })} />
          <InputField label="Related Record Label" value={form.relatedRecordLabel} onChange={(relatedRecordLabel) => onChange({ relatedRecordLabel })} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Source" value={form.source} options={TASK_SOURCES} onChange={(source) => onChange({ source })} />
          <SelectField label="Visibility" value={form.visibility} options={TASK_VISIBILITIES} onChange={(visibility) => onChange({ visibility })} />
          <SelectField label="Recurrence" value={form.recurrence} options={TASK_RECURRENCES} onChange={(recurrence) => onChange({ recurrence })} />
        </div>
        <label className="flex items-center gap-3 rounded-lg border border-gray-800 bg-[#0b1220] px-3 py-3 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={form.approvalRequired}
            onChange={(event) => onChange({ approvalRequired: event.target.checked })}
            className="h-4 w-4 rounded border-gray-700 bg-gray-900"
          />
          Approval required
        </label>
        <div className="rounded-lg border border-dashed border-gray-700 bg-[#0b1220] px-4 py-4 text-sm text-gray-400">
          Attachments placeholder. File upload will connect here when dashboard storage is wired.
        </div>
      </div>
    </DashboardModal>
  );
}

function InputField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
      />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "none" ? "None" : labelize(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [assignTarget, setAssignTarget] = useState<TaskRecord | null>(null);
  const [assignValue, setAssignValue] = useState("Operations");
  const [snoozeTarget, setSnoozeTarget] = useState<TaskRecord | null>(null);
  const [customSnoozeDate, setCustomSnoozeDate] = useState("");
  const [rejectTarget, setRejectTarget] = useState<TaskRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionModal, setActionModal] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: "", description: "" });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
    type: "all",
    assignedTo: "all",
    source: "all",
    visibility: "all",
    projectId: "all",
  });

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([getTasks(), getProjects()])
      .then(([apiTasks, apiProjects]) => {
        if (cancelled) return;
        const normalized = (Array.isArray(apiTasks) ? apiTasks : []).map((task, index) => normalizeApiTask(task, index));
        const stored = readStoredTasks();
        setTasks([...stored, ...normalized.filter((task) => !stored.some((storedTask) => storedTask.id === task.id))]);
        setProjects(Array.isArray(apiProjects) ? apiProjects : []);
      })
      .catch(() => {
        if (!cancelled) setError("Tasks could not be loaded. Local task actions still work.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loading) writeStoredTasks(tasks);
  }, [loading, tasks]);

  const summary = useMemo(() => getTaskSummary(tasks), [tasks]);
  const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);
  const projectOptions = projects.map((project) => ({ id: project.id, label: project.projectName || project.project_name || project.id }));
  const activeSuggestions = getSuggestedTasks().filter((suggestion) => !dismissedSuggestions.includes(suggestion.id));
  const platformAccess = hasPlatformAccess();

  const updateTask = (id: string, updater: (task: TaskRecord) => TaskRecord, message: string) => {
    setTasks((current) => current.map((task) => (task.id === id ? updater(task) : task)));
    notify(message);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors([]);
    setShowTaskModal(true);
  };

  const openEditModal = (task: TaskRecord) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      status: task.status === "archived" ? "open" : task.status,
      dueDate: task.dueDate || "",
      reminderDate: task.reminderDate || "",
      assignedTo: task.assignedTo || "Operations",
      relatedRecordType: task.relatedRecordType || "project",
      relatedRecordId: task.relatedRecordId || "",
      relatedRecordLabel: task.relatedRecordLabel || "",
      source: task.source || "manual",
      visibility: task.visibility || "client_visible",
      approvalRequired: Boolean(task.approvalRequired),
      recurrence: task.recurrence || "none",
    });
    setFormErrors([]);
    setShowTaskModal(true);
  };

  const submitTask = () => {
    const validation = validateTaskInput(form);
    if (!validation.valid) {
      setFormErrors(validation.missing);
      return;
    }

    if (editingId) {
      const existing = tasks.find((task) => task.id === editingId);
      if (!existing) return;
      const updated = buildTask(
        {
          ...existing,
          ...form,
          id: existing.id,
          createdAt: existing.createdAt,
          activityLog: existing.activityLog,
          approvalStatus: form.approvalRequired ? existing.approvalStatus === "approved" ? "approved" : "pending" : "none",
        },
        { actor: "Operations" },
      ) as TaskRecord;
      setTasks((current) => current.map((task) => (task.id === editingId ? { ...updated, activityLog: [{ timestamp: new Date().toISOString(), actor: "Operations", action: "Task updated" }, ...existing.activityLog] } : task)));
      notify("Task updated.");
    } else {
      const task = buildTask(form, { sequence: tasks.length + 1, actor: "Operations" }) as TaskRecord;
      setTasks((current) => [task, ...current]);
      notify("Task created.");
    }

    setShowTaskModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const setQuickFilter = (status: string) => {
    setFilters((current) => ({ ...current, status }));
  };

  const createSuggestedTask = (suggestion: ReturnType<typeof getSuggestedTasks>[number]) => {
    const task = createTaskFromSuggestion(suggestion, { sequence: tasks.length + 1, actor: "Otto" }) as TaskRecord;
    setTasks((current) => [task, ...current]);
    setDismissedSuggestions((current) => [...current, suggestion.id]);
    notify("Otto suggested task created.");
  };

  const today = new Date();
  const laterToday = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} />}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">Manage team work, approvals, follow-ups, and Otto/Jarvis action items.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSuggestionsOpen(true)} className="rounded-lg border border-blue-800 bg-blue-950/30 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-900/40">
            View Suggested Tasks
          </button>
          <button onClick={() => setActionModal({ open: true, title: "Task templates coming soon", description: "Templates will let you reuse recurring operational checklists once the backend template library is wired." })} className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800">
            Create Template
          </button>
          <button onClick={openCreateModal} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + New Task
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 px-4 py-3 text-sm text-yellow-200">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Open Tasks" value={summary.openTasks} helper="Active work not archived or done" active={filters.status === "all"} onClick={() => setQuickFilter("all")} />
        <SummaryCard label="Due Today" value={summary.dueToday} helper="Tasks dated for today" active={filters.status === "due_today"} onClick={() => setFilters((current) => ({ ...current, status: "all", dueDate: laterToday } as typeof current & { dueDate?: string }))} />
        <SummaryCard label="Overdue" value={summary.overdue} helper="Past due and still open" active={filters.status === "overdue"} onClick={() => setQuickFilter("overdue")} />
        <SummaryCard label="Needs Approval" value={summary.needsApproval} helper="Waiting on a decision" active={filters.status === "needs_approval"} onClick={() => setQuickFilter("needs_approval")} />
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#111827] p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search title, description, assignee, client, project, or related record..."
            className="rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
          <FilterSelect label="Status" value={filters.status} options={["all", ...TASK_STATUSES, "overdue"]} onChange={(status) => setFilters((current) => ({ ...current, status }))} />
          <FilterSelect label="Priority" value={filters.priority} options={["all", ...TASK_PRIORITIES]} onChange={(priority) => setFilters((current) => ({ ...current, priority }))} />
          <FilterSelect label="Type" value={filters.type} options={["all", ...TASK_TYPES]} onChange={(type) => setFilters((current) => ({ ...current, type }))} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <FilterSelect label="Assigned To" value={filters.assignedTo} options={["all", ...Array.from(new Set([...ASSIGNEES, ...tasks.map((task) => task.assignedTo).filter(Boolean)]))]} onChange={(assignedTo) => setFilters((current) => ({ ...current, assignedTo }))} />
          <FilterSelect label="Source" value={filters.source} options={["all", ...TASK_SOURCES]} onChange={(source) => setFilters((current) => ({ ...current, source }))} />
          <FilterSelect label="Visibility" value={filters.visibility} options={["all", ...TASK_VISIBILITIES]} onChange={(visibility) => setFilters((current) => ({ ...current, visibility }))} />
          <FilterSelect label="Project" value={filters.projectId} options={["all", ...projectOptions.map((project) => project.id)]} optionLabels={Object.fromEntries(projectOptions.map((project) => [project.id, project.label]))} onChange={(projectId) => setFilters((current) => ({ ...current, projectId }))} />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl border border-gray-800 bg-[#111827]" />)}
        </div>
      ) : tasks.length === 0 ? (
        platformAccess ? (
          <EmptyState
            icon="Tasks"
            title="No tasks yet"
            description="Create a task manually, accept an Otto suggestion, or set up task templates for recurring work."
            actions={[
              { label: "Create Task", onClick: openCreateModal, variant: "primary" },
              { label: "View Suggested Tasks", onClick: () => setSuggestionsOpen(true), variant: "secondary" },
              { label: "Create Template", onClick: () => setActionModal({ open: true, title: "Task templates coming soon", description: "Templates will connect to recurring SOPs, automations, and project checklists." }), variant: "secondary" },
            ]}
          />
        ) : (
          <EmptyState variant="integration_required" title="Sign in required" description="Reconnect your dashboard session to load tasks for this workspace." />
        )
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon="Filter"
          title="No tasks match these filters"
          description="Adjust filters or create a new task for this work queue."
          actions={[
            { label: "Clear Filters", onClick: () => setFilters({ search: "", status: "all", priority: "all", type: "all", assignedTo: "all", source: "all", visibility: "all", projectId: "all" }), variant: "secondary" },
            { label: "Create Task", onClick: openCreateModal, variant: "primary" },
          ]}
        />
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              overdue={isTaskOverdue(task)}
              onView={() => setSelectedTask(task)}
              onEdit={() => openEditModal(task)}
              onStart={() => updateTask(task.id, (current) => startTask(current, "Operations") as TaskRecord, "Task started.")}
              onDone={() => updateTask(task.id, (current) => markTaskDone(current, "Operations") as TaskRecord, "Task completed.")}
              onSnooze={() => setSnoozeTarget(task)}
              onAssign={() => { setAssignTarget(task); setAssignValue(task.assignedTo || "Operations"); }}
              onArchive={() => updateTask(task.id, (current) => archiveTask(current, "Operations") as TaskRecord, "Task archived.")}
              onApprove={() => updateTask(task.id, (current) => approveTask(current, "Operations") as TaskRecord, "Task approved.")}
              onReject={() => { setRejectTarget(task); setRejectionReason(""); }}
            />
          ))}
        </div>
      )}

      <TaskModal
        open={showTaskModal}
        mode={editingId ? "edit" : "create"}
        form={form}
        errors={formErrors}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onClose={() => setShowTaskModal(false)}
        onSubmit={submitTask}
      />

      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={(task) => {
          setSelectedTask(null);
          openEditModal(task);
        }}
      />

      <SuggestedTasksModal
        open={suggestionsOpen}
        suggestions={activeSuggestions}
        onClose={() => setSuggestionsOpen(false)}
        onCreate={createSuggestedTask}
        onDismiss={(id) => setDismissedSuggestions((current) => [...current, id])}
      />

      <DashboardModal
        open={Boolean(assignTarget)}
        title="Reassign Task"
        onClose={() => setAssignTarget(null)}
        footer={
          <>
            <button onClick={() => setAssignTarget(null)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800">Cancel</button>
            <button
              onClick={() => {
                if (!assignTarget) return;
                updateTask(assignTarget.id, (task) => assignTask(task, assignValue, "Operations") as TaskRecord, "Task assigned.");
                setAssignTarget(null);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Assign
            </button>
          </>
        }
      >
        <InputField label="Assigned To" value={assignValue} onChange={setAssignValue} />
      </DashboardModal>

      <DashboardModal
        open={Boolean(snoozeTarget)}
        title="Snooze Task"
        description="Move the due date and keep the work visible."
        onClose={() => setSnoozeTarget(null)}
      >
        <div className="grid gap-2">
          {[
            ["Later today", laterToday],
            ["Tomorrow", tomorrow.toISOString().slice(0, 10)],
            ["Next week", nextWeek.toISOString().slice(0, 10)],
          ].map(([label, date]) => (
            <button
              key={label}
              onClick={() => {
                if (!snoozeTarget) return;
                updateTask(snoozeTarget.id, (task) => snoozeTask(task, date, "Operations") as TaskRecord, "Task snoozed.");
                setSnoozeTarget(null);
              }}
              className="rounded-lg border border-gray-700 px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
            >
              {label}
            </button>
          ))}
          <div className="mt-2 flex gap-2">
            <input type="date" value={customSnoozeDate} onChange={(event) => setCustomSnoozeDate(event.target.value)} className="flex-1 rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white" />
            <button
              onClick={() => {
                if (!snoozeTarget || !customSnoozeDate) return;
                updateTask(snoozeTarget.id, (task) => snoozeTask(task, customSnoozeDate, "Operations") as TaskRecord, "Task snoozed.");
                setSnoozeTarget(null);
                setCustomSnoozeDate("");
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Custom
            </button>
          </div>
        </div>
      </DashboardModal>

      <DashboardModal
        open={Boolean(rejectTarget)}
        title="Reject Task"
        description="A rejection reason is required so the next owner knows what to fix."
        onClose={() => setRejectTarget(null)}
        footer={
          <>
            <button onClick={() => setRejectTarget(null)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800">Cancel</button>
            <button
              onClick={() => {
                if (!rejectTarget || !rejectionReason.trim()) return;
                updateTask(rejectTarget.id, (task) => rejectTask(task, rejectionReason, "Operations") as TaskRecord, "Task rejected.");
                setRejectTarget(null);
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Reject
            </button>
          </>
        }
      >
        <textarea rows={4} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white" placeholder="What needs to change?" />
      </DashboardModal>

      <ActionStateModal
        open={actionModal.open}
        kind="coming_soon"
        title={actionModal.title}
        description={actionModal.description}
        primaryLabel="Got it"
        onClose={() => setActionModal({ open: false, title: "", description: "" })}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  optionLabels = {},
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  optionLabels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-medium uppercase text-gray-500">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
        {options.map((option) => (
          <option key={`${label}-${option}`} value={option}>
            {option === "all" ? `All ${label}` : optionLabels[option] || labelize(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TaskCard({
  task,
  overdue,
  onView,
  onEdit,
  onStart,
  onDone,
  onSnooze,
  onAssign,
  onArchive,
  onApprove,
  onReject,
}: {
  task: TaskRecord;
  overdue: boolean;
  onView: () => void;
  onEdit: () => void;
  onStart: () => void;
  onDone: () => void;
  onSnooze: () => void;
  onAssign: () => void;
  onArchive: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <article className="rounded-xl border border-gray-800 bg-[#111827] p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-white">{task.title}</h2>
            <StatusBadge status={overdue ? "overdue" : task.status} />
            <PriorityBadge priority={task.priority} />
            <span className="rounded border border-gray-700 bg-gray-900 px-2 py-0.5 text-xs capitalize text-gray-300">{labelize(task.type)}</span>
            <span className="rounded border border-blue-900 bg-blue-950/40 px-2 py-0.5 text-xs capitalize text-blue-200">{labelize(task.source)}</span>
          </div>
          {task.description && <p className="mt-2 line-clamp-2 text-sm text-gray-400">{task.description}</p>}
          <div className="mt-3 grid gap-2 text-xs text-gray-500 md:grid-cols-4">
            <span>Due: <strong className={overdue ? "text-red-300" : "text-gray-300"}>{task.dueDate || "No date"}</strong></span>
            <span>Assigned: <strong className="text-gray-300">{task.assignedTo}</strong></span>
            <span>Visibility: <strong className="text-gray-300">{labelize(task.visibility)}</strong></span>
            <span>Updated: <strong className="text-gray-300">{task.updatedAt?.slice(0, 10)}</strong></span>
          </div>
          {task.relatedRecordLabel && (
            <div className="mt-2 text-xs text-gray-400">
              Related: {task.relatedRecordHref ? <Link href={task.relatedRecordHref} className="text-blue-300 hover:text-blue-200">{task.relatedRecordLabel}</Link> : task.relatedRecordLabel}
            </div>
          )}
          {task.approvalRequired && <p className="mt-2 text-xs text-yellow-200">Approval: {labelize(task.approvalStatus)}</p>}
        </div>
        <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
          <SmallButton onClick={onView}>View</SmallButton>
          <SmallButton onClick={onEdit}>Edit</SmallButton>
          {task.status !== "in_progress" && task.status !== "done" && <SmallButton onClick={onStart}>Start</SmallButton>}
          {task.status !== "done" && <SmallButton onClick={onDone}>Mark Done</SmallButton>}
          <SmallButton onClick={onSnooze}>Snooze</SmallButton>
          <SmallButton onClick={onAssign}>Assign</SmallButton>
          {task.approvalStatus === "pending" && <SmallButton onClick={onApprove}>Approve</SmallButton>}
          {task.approvalStatus === "pending" && <SmallButton onClick={onReject}>Reject</SmallButton>}
          {task.status !== "archived" && <SmallButton onClick={onArchive}>Archive</SmallButton>}
        </div>
      </div>
    </article>
  );
}

function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-800">
      {children}
    </button>
  );
}

function TaskDetailDrawer({ task, onClose, onEdit }: { task: TaskRecord | null; onClose: () => void; onEdit: (task: TaskRecord) => void }) {
  if (!task) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/70" aria-label="Close task details" onClick={onClose} />
      <aside className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-gray-800 bg-[#0b1220] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">{task.id}</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{task.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white">X</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge status={isTaskOverdue(task) ? "overdue" : task.status} size="md" />
          <PriorityBadge priority={task.priority} size="md" />
          <span className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-300">{labelize(task.type)}</span>
          <span className="rounded border border-blue-900 px-3 py-1 text-sm text-blue-200">{labelize(task.source)}</span>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Info label="Assigned To" value={task.assignedTo} />
          <Info label="Due Date" value={task.dueDate || "No due date"} />
          <Info label="Reminder" value={task.reminderDate || "No reminder"} />
          <Info label="Visibility" value={labelize(task.visibility)} />
          <Info label="Approval" value={labelize(task.approvalStatus)} />
          <Info label="Created By" value={task.createdBy} />
        </div>
        <section className="mt-6 rounded-xl border border-gray-800 bg-[#111827] p-4">
          <h3 className="font-semibold text-white">Description</h3>
          <p className="mt-2 text-sm text-gray-400">{task.description || "No description added yet."}</p>
        </section>
        <section className="mt-4 rounded-xl border border-gray-800 bg-[#111827] p-4">
          <h3 className="font-semibold text-white">Related Record</h3>
          <p className="mt-2 text-sm text-gray-400">{task.relatedRecordLabel || "No related record linked."}</p>
          {task.relatedRecordHref && <Link href={task.relatedRecordHref} className="mt-3 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Open Related Page</Link>}
        </section>
        <section className="mt-4 rounded-xl border border-gray-800 bg-[#111827] p-4">
          <h3 className="font-semibold text-white">AI Recommendation</h3>
          <p className="mt-2 text-sm text-gray-400">
            {isTaskOverdue(task) ? "This task is overdue. Reassign it, snooze it with a realistic due date, or mark it done if the work is complete." : "No urgent AI recommendation for this task."}
          </p>
        </section>
        <section className="mt-4 rounded-xl border border-gray-800 bg-[#111827] p-4">
          <h3 className="font-semibold text-white">Activity</h3>
          <div className="mt-3 space-y-3">
            {task.activityLog.map((entry, index) => (
              <div key={`${entry.timestamp}-${index}`} className="border-l border-gray-700 pl-3">
                <p className="text-sm font-medium text-gray-200">{entry.action}</p>
                <p className="text-xs text-gray-500">{entry.actor} · {entry.timestamp?.slice(0, 16).replace("T", " ")}</p>
                {entry.detail && <p className="mt-1 text-xs text-gray-400">{entry.detail}</p>}
              </div>
            ))}
          </div>
        </section>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => onEdit(task)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit Task</button>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#111827] p-3">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-200">{value}</p>
    </div>
  );
}

function SuggestedTasksModal({
  open,
  suggestions,
  onClose,
  onCreate,
  onDismiss,
}: {
  open: boolean;
  suggestions: ReturnType<typeof getSuggestedTasks>;
  onClose: () => void;
  onCreate: (suggestion: ReturnType<typeof getSuggestedTasks>[number]) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <DashboardModal open={open} title="Suggested Tasks" description="Otto recommendations are local placeholders until live automation signals are connected." size="lg" onClose={onClose}>
      {suggestions.length === 0 ? (
        <EmptyState title="No suggestions right now" description="Dismissed suggestions are hidden for this session." />
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-xl border border-gray-800 bg-[#0b1220] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold text-white">{suggestion.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{suggestion.reason}</p>
                  <p className="mt-2 text-xs text-blue-200">{suggestion.suggestedAction}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => onCreate(suggestion)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">Create Task</button>
                  <button onClick={() => onDismiss(suggestion.id)} className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-800">Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardModal>
  );
}
