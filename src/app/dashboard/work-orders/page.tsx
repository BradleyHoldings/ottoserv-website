"use client";

import { FormEvent, useMemo, useState } from "react";
import ActionStateModal from "@/components/dashboard/ActionStateModal";
import DashboardModal from "@/components/dashboard/DashboardModal";
import EmptyState from "@/components/dashboard/EmptyState";
import PriorityBadge from "@/components/dashboard/PriorityBadge";
import StatusBadge from "@/components/dashboard/StatusBadge";
import {
  addWorkOrderActivity,
  ageInDays,
  buildWorkOrder,
  filterWorkOrders,
  getWorkOrderSummary,
  isWorkOrderOverdue,
  sampleWorkOrders,
  uniqueOptions,
  updateWorkOrderStatus,
  validateWorkOrderInput,
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_COLUMNS,
  WORK_ORDER_SOURCES,
  WORK_ORDER_STATUSES,
  STATUS_LABELS,
} from "@/lib/workOrders.mjs";

type WorkOrderStatus =
  | "draft"
  | "new"
  | "needs_approval"
  | "scheduled"
  | "in_progress"
  | "waiting_on_client"
  | "waiting_on_parts"
  | "ready_for_review"
  | "completed"
  | "invoiced"
  | "canceled";

type WorkOrderPriority = "low" | "medium" | "high" | "emergency";

type WorkOrderSource =
  | "manual"
  | "tenant_request"
  | "phone_call"
  | "email"
  | "website_form"
  | "inspection"
  | "recurring_maintenance"
  | "ai_created";

interface WorkOrderActivity {
  timestamp: string;
  actor: string;
  action: string;
  detail?: string;
}

interface WorkOrder {
  id: string;
  title: string;
  client: string;
  project?: string;
  property: string;
  unitLocation?: string;
  location?: string;
  description: string;
  notes?: string;
  category: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  source: WorkOrderSource;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  preferredContactMethod?: string;
  permissionToEnter?: string;
  assignedTech?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  requestedDateTime?: string;
  dueDate?: string;
  laborEstimate?: number;
  materialEstimate?: number;
  estimatedCost?: number;
  approvalRequired?: boolean;
  approvalLimit?: number;
  approvalStatus?: "not_required" | "pending" | "approved" | "denied";
  attachmentCount?: number;
  aiStatus?: string;
  automationActivity: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  archived?: boolean;
  activityLog: WorkOrderActivity[];
}

interface Filters {
  search: string;
  client: string;
  property: string;
  priority: string;
  category: string;
  status: string;
  assignedTech: string;
  dueDate: string;
  source: string;
  overdueOnly: boolean;
}

type PlaceholderName =
  | "import"
  | "message"
  | "export"
  | "settings"
  | "task"
  | "calendar"
  | "labor"
  | "materials"
  | "invoice"
  | "notifyTenant"
  | "notifyVendor"
  | "approval";

const EMPTY_FILTERS: Filters = {
  search: "",
  client: "",
  property: "",
  priority: "",
  category: "",
  status: "",
  assignedTech: "",
  dueDate: "",
  source: "",
  overdueOnly: false,
};

const inputClass = "w-full rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none";
const labelClass = "space-y-1 text-sm text-gray-300";
const actionButtonClass = "rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700";
const successActionButtonClass = "rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600";
const dangerActionButtonClass = "rounded-lg bg-red-950 px-3 py-2 text-sm text-red-200 hover:bg-red-900";

function currency(value?: number) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function statusLabel(status: string) {
  return (STATUS_LABELS as Record<string, string>)[status] || status.replace(/_/g, " ");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-white">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#111827] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{helper}</p>
    </div>
  );
}

export default function WorkOrdersPage() {
  const [view, setView] = useState<"kanban" | "table">(() => {
    if (typeof window === "undefined") return "kanban";
    return localStorage.getItem("ottoserv_work_orders_view") === "table" ? "table" : "kanban";
  });
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => sampleWorkOrders() as WorkOrder[]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [createOpen, setCreateOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("action") === "new";
  });
  const [detail, setDetail] = useState<WorkOrder | null>(null);
  const [success, setSuccess] = useState<WorkOrder | null>(null);
  const [placeholder, setPlaceholder] = useState<PlaceholderName | null>(null);
  const [validationError, setValidationError] = useState("");
  const [sortKey, setSortKey] = useState<keyof WorkOrder>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => filterWorkOrders(workOrders, filters) as WorkOrder[], [workOrders, filters]);
  const summary = useMemo(() => getWorkOrderSummary(workOrders), [workOrders]);
  const clients = useMemo(() => uniqueOptions(workOrders, "client") as string[], [workOrders]);
  const properties = useMemo(() => uniqueOptions(workOrders, "property") as string[], [workOrders]);
  const assignedTechs = useMemo(() => uniqueOptions(workOrders, "assignedTech") as string[], [workOrders]);
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortDir, sortKey]);

  function updateFilter(key: keyof Filters, value: string | boolean) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function setPreferredView(nextView: "kanban" | "table") {
    setView(nextView);
    localStorage.setItem("ottoserv_work_orders_view", nextView);
  }

  function upsertWorkOrder(next: WorkOrder) {
    setWorkOrders((prev) => prev.map((wo) => (wo.id === next.id ? next : wo)));
    setDetail(next);
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      title: String(form.get("title") || ""),
      client: String(form.get("client") || ""),
      project: String(form.get("project") || ""),
      property: String(form.get("property") || ""),
      unitLocation: String(form.get("unitLocation") || ""),
      description: String(form.get("description") || ""),
      notes: String(form.get("notes") || ""),
      category: String(form.get("category") || ""),
      priority: String(form.get("priority") || ""),
      source: String(form.get("source") || "manual"),
      contactName: String(form.get("contactName") || ""),
      contactPhone: String(form.get("contactPhone") || ""),
      contactEmail: String(form.get("contactEmail") || ""),
      preferredContactMethod: String(form.get("preferredContactMethod") || "phone"),
      permissionToEnter: String(form.get("permissionToEnter") || "unknown"),
      assignedTech: String(form.get("assignedTech") || ""),
      scheduledDate: String(form.get("scheduledDate") || ""),
      scheduledTime: String(form.get("scheduledTime") || ""),
      dueDate: String(form.get("dueDate") || ""),
      laborEstimate: Number(form.get("laborEstimate") || 0),
      materialEstimate: Number(form.get("materialEstimate") || 0),
      estimatedCost: Number(form.get("estimatedCost") || 0),
      approvalRequired: form.get("approvalRequired") === "yes",
      approvalLimit: Number(form.get("approvalLimit") || 0),
      approvalStatus: String(form.get("approvalStatus") || "not_required"),
      attachmentCount: 0,
      automationOptions: {
        notifyTenant: form.get("notifyTenant") === "on",
        notifyVendor: form.get("notifyVendor") === "on",
        aiSummary: form.get("aiSummary") === "on",
        aiCategory: form.get("aiSummary") === "on",
        aiPriority: form.get("aiPriority") === "on",
        followUpReminder: form.get("followUpReminder") === "on",
        requireCloseout: form.get("requireCloseout") === "on",
      },
    };
    const validation = validateWorkOrderInput(input);
    if (!validation.valid) {
      setValidationError(`Missing required fields: ${validation.missing.join(", ")}`);
      return;
    }
    const workOrder = buildWorkOrder(input, { sequence: workOrders.length + 47, actor: "Command Center" }) as WorkOrder;
    setWorkOrders((prev) => [workOrder, ...prev]);
    setCreateOpen(false);
    setSuccess(workOrder);
    setValidationError("");
  }

  function handleStatus(status: WorkOrderStatus, detailText = "") {
    if (!detail) return;
    const updated = updateWorkOrderStatus(detail, status, "Operations", detailText) as WorkOrder;
    upsertWorkOrder(updated);
  }

  function handleActivity(action: string, placeholderName: PlaceholderName, detailText: string) {
    if (detail) {
      const updated = addWorkOrderActivity(detail, action, detailText, "Operations") as WorkOrder;
      upsertWorkOrder(updated);
    }
    setPlaceholder(placeholderName);
  }

  function handleSort(key: keyof WorkOrder) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function exportCsv() {
    if (filtered.length === 0) {
      setPlaceholder("export");
      return;
    }
    const header = ["id", "title", "client", "property", "unitLocation", "priority", "category", "status", "assignedTech", "scheduledDate", "createdAt", "updatedAt", "estimatedCost", "approvalStatus"];
    const lines = [header.join(","), ...filtered.map((wo) => header.map((key) => `"${String(wo[key as keyof WorkOrder] ?? "").replace(/"/g, '""')}"`).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "work-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Work Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Capture, assign, schedule, track, notify, and close operational work.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCreateOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ Create Work Order</button>
          <button onClick={() => setPlaceholder("import")} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">Import Work Orders</button>
          <button onClick={() => setPlaceholder("message")} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">Create from Call / Email / Text</button>
          <button onClick={exportCsv} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">Export</button>
          <button onClick={() => setPlaceholder("settings")} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">Work Order Settings</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
        <SummaryCard label="Open Work Orders" value={summary.open} helper="Not completed, invoiced, or canceled" />
        <SummaryCard label="Urgent / Overdue" value={summary.urgentOverdue} helper="High-priority or past due" />
        <SummaryCard label="Scheduled Today" value={summary.scheduledToday} helper="Crew or vendor calendar" />
        <SummaryCard label="Waiting on Parts" value={summary.waitingOnParts} helper="Parts/vendor dependency" />
        <SummaryCard label="Completed This Week" value={summary.completedThisWeek} helper="Closed in current week" />
        <SummaryCard label="Avg. Time to Complete" value={`${summary.averageTimeToComplete}d`} helper="Completed orders" />
        <SummaryCard label="Est. / Approved Spend" value={currency(summary.estimatedApprovedSpend)} helper="Approved or no approval required" />
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#111827] p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-semibold text-white">Work Order Pipeline</h2>
            <p className="mt-1 text-sm text-gray-500">{filtered.length} visible / {workOrders.length} total</p>
          </div>
          <div className="flex w-fit overflow-hidden rounded-lg border border-gray-800 bg-[#0b1220]">
            <button onClick={() => setPreferredView("kanban")} className={`px-4 py-2 text-sm ${view === "kanban" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>Kanban</button>
            <button onClick={() => setPreferredView("table")} className={`px-4 py-2 text-sm ${view === "table" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>Table</button>
          </div>
        </div>

        <FiltersPanel
          filters={filters}
          clients={clients}
          properties={properties}
          assignedTechs={assignedTechs}
          onChange={updateFilter}
          onReset={() => setFilters(EMPTY_FILTERS)}
        />

        {workOrders.length === 0 ? (
          <EmptyState
            title="No work orders yet"
            description="Create your first work order, import existing maintenance requests, or let OttoServ create one from a call, email, or tenant message."
            actions={[
              { label: "Create Work Order", onClick: () => setCreateOpen(true) },
              { label: "Import Work Orders", onClick: () => setPlaceholder("import"), variant: "secondary" },
              { label: "Create from Message", onClick: () => setPlaceholder("message"), variant: "secondary" },
            ]}
            className="mt-5"
          />
        ) : view === "kanban" ? (
          <KanbanView workOrders={filtered} onSelect={setDetail} />
        ) : (
          <TableView workOrders={sorted} onSelect={setDetail} onSort={handleSort} sortKey={sortKey} sortDir={sortDir} onStatus={(wo, status) => {
            const updated = updateWorkOrderStatus(wo, status, "Operations") as WorkOrder;
            setWorkOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          }} />
        )}
      </div>

      <CreateWorkOrderModal open={createOpen} validationError={validationError} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />

      {detail && (
        <DetailDrawer
          workOrder={detail}
          onClose={() => setDetail(null)}
          onStatus={handleStatus}
          onActivity={handleActivity}
          onEdit={() => setPlaceholder("settings")}
          onArchive={() => {
            const canceled = updateWorkOrderStatus(detail, "canceled", "Operations", "Canceled or archived from detail drawer.") as WorkOrder;
            const updated = addWorkOrderActivity({ ...canceled, archived: true }, "Work order archived", "", "Operations") as WorkOrder;
            upsertWorkOrder(updated);
          }}
        />
      )}

      {success && (
        <DashboardModal open={success !== null} title="Work order created" description={`${success.id} is now in ${STATUS_LABELS[success.status]}.`} onClose={() => setSuccess(null)} footer={
          <>
            <button onClick={() => { setDetail(success); setSuccess(null); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">View Work Order</button>
            <button onClick={() => { setSuccess(null); setCreateOpen(true); }} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Create Another</button>
            <button onClick={() => setPlaceholder("task")} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Assign Vendor</button>
            <button onClick={() => setPlaceholder("calendar")} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Schedule Now</button>
            <button onClick={() => setPlaceholder("notifyTenant")} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Notify Tenant</button>
          </>
        } />
      )}

      <PlaceholderModal placeholder={placeholder} onClose={() => setPlaceholder(null)} />
    </div>
  );
}

function FiltersPanel({
  filters,
  clients,
  properties,
  assignedTechs,
  onChange,
  onReset,
}: {
  filters: Filters;
  clients: string[];
  properties: string[];
  assignedTechs: string[];
  onChange: (key: keyof Filters, value: string | boolean) => void;
  onReset: () => void;
}) {
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      <input value={filters.search} onChange={(event) => onChange("search", event.target.value)} placeholder="Search work orders" className={inputClass} />
      <SelectFilter value={filters.client} onChange={(value) => onChange("client", value)} options={clients} label="All clients" />
      <SelectFilter value={filters.property} onChange={(value) => onChange("property", value)} options={properties} label="All properties" />
      <select value={filters.priority} onChange={(event) => onChange("priority", event.target.value)} className={inputClass}>
        <option value="">All priorities</option>
        {["low", "medium", "high", "emergency"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
      </select>
      <select value={filters.category} onChange={(event) => onChange("category", event.target.value)} className={inputClass}>
        <option value="">All categories</option>
        {WORK_ORDER_CATEGORIES.map((category: string) => <option key={category} value={category}>{category}</option>)}
      </select>
      <select value={filters.status} onChange={(event) => onChange("status", event.target.value)} className={inputClass}>
        <option value="">All statuses</option>
        {WORK_ORDER_STATUSES.map((status: string) => <option key={status} value={status}>{statusLabel(status)}</option>)}
      </select>
      <SelectFilter value={filters.assignedTech} onChange={(value) => onChange("assignedTech", value)} options={assignedTechs} label="All techs/vendors" />
      <input value={filters.dueDate} onChange={(event) => onChange("dueDate", event.target.value)} type="date" className={inputClass} />
      <select value={filters.source} onChange={(event) => onChange("source", event.target.value)} className={inputClass}>
        <option value="">All sources</option>
        {WORK_ORDER_SOURCES.map((source: { id: string; label: string }) => <option key={source.id} value={source.id}>{source.label}</option>)}
      </select>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={filters.overdueOnly} onChange={(event) => onChange("overdueOnly", event.target.checked)} />
          Overdue only
        </label>
        <button onClick={onReset} className="text-xs text-blue-400 hover:text-blue-300">Reset</button>
      </div>
    </div>
  );
}

function SelectFilter({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: string[]; label: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      <option value="">{label}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function KanbanView({ workOrders, onSelect }: { workOrders: WorkOrder[]; onSelect: (workOrder: WorkOrder) => void }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {WORK_ORDER_COLUMNS.map((column: { id: string; title: string; dotColor: string; match?: string[] }) => {
        const columnStatuses = column.match || [column.id];
        const columnOrders = workOrders.filter((wo) => columnStatuses.includes(wo.status));
        return (
          <div key={column.id} className="w-80 flex-shrink-0">
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${column.dotColor}`} />
              <h3 className="text-sm font-medium text-white">{column.title}</h3>
              <span className="ml-auto rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{columnOrders.length}</span>
            </div>
            <div className="space-y-3">
              {columnOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-800 bg-[#0b1220] p-5 text-center text-xs text-gray-600">No work orders</div>
              ) : (
                columnOrders.map((wo) => <WorkOrderCard key={wo.id} workOrder={wo} onClick={() => onSelect(wo)} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkOrderCard({ workOrder, onClick }: { workOrder: WorkOrder; onClick: () => void }) {
  const overdue = isWorkOrderOverdue(workOrder);
  return (
    <button onClick={onClick} className="w-full rounded-xl border border-gray-800 bg-[#0b1220] p-4 text-left transition hover:border-blue-700 hover:bg-[#111827]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-gray-500">{workOrder.id}</span>
        <PriorityBadge priority={workOrder.priority} />
      </div>
      <p className="font-semibold leading-snug text-white">{workOrder.title}</p>
      <p className="mt-1 text-xs text-gray-400">{workOrder.client}</p>
      <p className="text-xs text-gray-500">{workOrder.property}{workOrder.unitLocation ? ` / ${workOrder.unitLocation}` : ""}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <span>{workOrder.category}</span>
        <span className="text-right">{workOrder.assignedTech || "Unassigned"}</span>
        <span>{workOrder.scheduledDate || "Unscheduled"} {workOrder.scheduledTime || ""}</span>
        <span className="text-right">{ageInDays(workOrder)}d old</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {workOrder.estimatedCost ? <span className="rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-300">{currency(workOrder.estimatedCost)}</span> : null}
        {workOrder.attachmentCount ? <span className="rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-300">{workOrder.attachmentCount} photos</span> : null}
        {workOrder.aiStatus ? <span className="rounded border border-blue-900 bg-blue-950/40 px-2 py-0.5 text-xs text-blue-200">{workOrder.aiStatus}</span> : null}
      </div>
      {overdue && <p className="mt-3 rounded-lg border border-red-900 bg-red-950/30 px-2 py-1 text-xs text-red-300">Overdue / SLA risk</p>}
    </button>
  );
}

function TableView({
  workOrders,
  onSelect,
  onSort,
  sortKey,
  sortDir,
  onStatus,
}: {
  workOrders: WorkOrder[];
  onSelect: (workOrder: WorkOrder) => void;
  onSort: (key: keyof WorkOrder) => void;
  sortKey: keyof WorkOrder;
  sortDir: "asc" | "desc";
  onStatus: (workOrder: WorkOrder, status: WorkOrderStatus) => void;
}) {
  const headers: Array<[keyof WorkOrder, string]> = [
    ["id", "Work Order #"],
    ["title", "Title"],
    ["client", "Client"],
    ["property", "Property"],
    ["unitLocation", "Unit/Location"],
    ["priority", "Priority"],
    ["category", "Category"],
    ["status", "Status"],
    ["assignedTech", "Assigned Tech/Vendor"],
    ["scheduledDate", "Scheduled Date"],
    ["createdAt", "Created Date"],
    ["updatedAt", "Last Update"],
    ["estimatedCost", "Estimated Cost"],
    ["approvalStatus", "Approval Status"],
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
          {workOrders.length === 0 ? (
            <tr><td colSpan={headers.length + 1} className="px-4 py-10 text-center text-gray-500">No matching work orders.</td></tr>
          ) : (
            workOrders.map((wo) => (
              <tr key={wo.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-400">{wo.id}</td>
                <td className="min-w-56 px-4 py-3 text-white">{wo.title}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{wo.client}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{wo.property}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-400">{wo.unitLocation || "-"}</td>
                <td className="px-4 py-3"><PriorityBadge priority={wo.priority} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{wo.category}</td>
                <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{wo.assignedTech || "Unassigned"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-400">{wo.scheduledDate || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-400">{wo.createdAt.split("T")[0]}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-400">{wo.updatedAt.split("T")[0]}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{currency(wo.estimatedCost)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{wo.approvalStatus?.replace(/_/g, " ") || "not required"}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => onSelect(wo)} className="text-xs text-blue-400 hover:text-blue-300">View</button>
                    <button onClick={() => onSelect(wo)} className="text-xs text-gray-300 hover:text-white">Edit</button>
                    <button onClick={() => onStatus(wo, "scheduled")} className="text-xs text-gray-300 hover:text-white">Schedule</button>
                    <button onClick={() => onStatus(wo, "completed")} className="text-xs text-emerald-400 hover:text-emerald-300">Mark Complete</button>
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

function CreateWorkOrderModal({ open, onClose, onSubmit, validationError }: { open: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; validationError: string }) {
  return (
    <DashboardModal open={open} title="Create Work Order" description="Capture the request, assignment, schedule, approval, and automation options in one flow." onClose={onClose} size="lg">
      <form onSubmit={onSubmit} className="space-y-6">
        {validationError && <div className="rounded-lg border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-200">{validationError}</div>}
        <FormSection title="Basic Info">
          <Field label="Work Order Title *"><input name="title" required className={inputClass} /></Field>
          <Field label="Client *"><input name="client" required className={inputClass} /></Field>
          <Field label="Project"><input name="project" className={inputClass} /></Field>
          <Field label="Property *"><input name="property" required className={inputClass} /></Field>
          <Field label="Unit / Location"><input name="unitLocation" className={inputClass} /></Field>
          <Field label="Category *"><select name="category" required className={inputClass}><option value="">Choose category</option>{WORK_ORDER_CATEGORIES.map((category: string) => <option key={category}>{category}</option>)}</select></Field>
          <Field label="Priority *"><select name="priority" required className={inputClass}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="emergency">Emergency</option></select></Field>
        </FormSection>
        <FormSection title="Request Details">
          <div className="md:col-span-2"><Field label="Description *"><textarea name="description" required rows={4} className={inputClass} /></Field></div>
          <Field label="Request Source"><select name="source" className={inputClass}>{WORK_ORDER_SOURCES.map((source: { id: string; label: string }) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></Field>
          <Field label="Contact Person"><input name="contactName" className={inputClass} /></Field>
          <Field label="Contact Phone"><input name="contactPhone" className={inputClass} /></Field>
          <Field label="Contact Email"><input name="contactEmail" type="email" className={inputClass} /></Field>
          <Field label="Preferred Contact Method"><select name="preferredContactMethod" className={inputClass}><option>phone</option><option>email</option><option>sms</option></select></Field>
          <Field label="Permission to Enter"><select name="permissionToEnter" className={inputClass}><option value="permission_granted">Permission granted</option><option value="appointment_required">Appointment required</option><option value="call_before_entering">Call before entering</option><option value="tenant_present">Tenant must be present</option><option value="unknown">Unknown</option></select></Field>
          <Field label="Attachments/photos"><input disabled value="Upload placeholder - storage not wired yet" readOnly className={`${inputClass} cursor-not-allowed opacity-60`} /></Field>
          <div className="md:col-span-2"><Field label="Notes"><textarea name="notes" rows={3} className={inputClass} /></Field></div>
        </FormSection>
        <FormSection title="Assignment & Scheduling">
          <Field label="Assigned Tech/Vendor"><input name="assignedTech" className={inputClass} /></Field>
          <Field label="Scheduled Date"><input name="scheduledDate" type="date" className={inputClass} /></Field>
          <Field label="Scheduled Time"><input name="scheduledTime" type="time" className={inputClass} /></Field>
          <Field label="Due Date"><input name="dueDate" type="date" className={inputClass} /></Field>
          <Field label="Labor Estimate"><input name="laborEstimate" type="number" min="0" className={inputClass} /></Field>
          <Field label="Material Estimate"><input name="materialEstimate" type="number" min="0" className={inputClass} /></Field>
          <Field label="Estimated Cost"><input name="estimatedCost" type="number" min="0" className={inputClass} /></Field>
          <Field label="Approval Required"><select name="approvalRequired" className={inputClass}><option value="no">No</option><option value="yes">Yes</option></select></Field>
          <Field label="Approval Limit"><input name="approvalLimit" type="number" min="0" className={inputClass} /></Field>
          <Field label="Approval Status"><select name="approvalStatus" className={inputClass}><option value="not_required">Not Required</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="denied">Denied</option></select></Field>
        </FormSection>
        <FormSection title="Automation Options">
          <Checkbox name="notifyTenant" label="Notify tenant/client after creation" />
          <Checkbox name="notifyVendor" label="Notify assigned tech/vendor" />
          <Checkbox name="aiSummary" label="Ask AI to summarize and categorize" />
          <Checkbox name="aiPriority" label="Ask AI to suggest priority" />
          <Checkbox name="followUpReminder" label="Create follow-up reminder" />
          <Checkbox name="requireCloseout" label="Require completion notes/photos before closing" />
        </FormSection>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Cancel</button>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create Work Order</button>
        </div>
      </form>
    </DashboardModal>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionHeader title={title} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Checkbox({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-gray-800 bg-[#0b1220] px-3 py-2 text-sm text-gray-300">
      <input name={name} type="checkbox" />
      {label}
    </label>
  );
}

function DetailDrawer({
  workOrder,
  onClose,
  onStatus,
  onActivity,
  onEdit,
  onArchive,
}: {
  workOrder: WorkOrder;
  onClose: () => void;
  onStatus: (status: WorkOrderStatus, detail?: string) => void;
  onActivity: (action: string, placeholderName: PlaceholderName, detail: string) => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/60" aria-label="Close details" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto border-l border-gray-800 bg-[#111827] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-gray-500">{workOrder.id}</p>
            <h2 className="mt-1 text-xl font-bold text-white">{workOrder.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={workOrder.status} size="md" />
              <PriorityBadge priority={workOrder.priority} size="md" />
              {isWorkOrderOverdue(workOrder) && <span className="rounded border border-red-900 bg-red-950/40 px-2 py-1 text-sm text-red-200">Overdue</span>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white">X</button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Info label="Client" value={workOrder.client} />
          <Info label="Property" value={workOrder.property} />
          <Info label="Unit/location" value={workOrder.unitLocation || "-"} />
          <Info label="Category" value={workOrder.category} />
          <Info label="Contact person" value={workOrder.contactName || "-"} />
          <Info label="Permission to enter" value={(workOrder.permissionToEnter || "unknown").replace(/_/g, " ")} />
          <Info label="Assigned tech/vendor" value={workOrder.assignedTech || "Unassigned"} />
          <Info label="Schedule" value={`${workOrder.scheduledDate || "Unscheduled"} ${workOrder.scheduledTime || ""}`} />
          <Info label="Estimated cost" value={currency(workOrder.estimatedCost)} />
          <Info label="Approval status" value={(workOrder.approvalStatus || "not_required").replace(/_/g, " ")} />
        </div>

        <div className="mt-5 rounded-xl border border-gray-800 bg-[#0b1220] p-4">
          <SectionHeader title="Scope / Description" />
          <p className="text-sm leading-relaxed text-gray-300">{workOrder.description}</p>
          {workOrder.notes && <p className="mt-3 text-sm text-gray-500">{workOrder.notes}</p>}
        </div>

        <div className="mt-5 rounded-xl border border-gray-800 bg-[#0b1220] p-4">
          <SectionHeader title="Actions" />
          <div className="flex flex-wrap gap-2">
            <button onClick={onEdit} className={actionButtonClass}>Edit</button>
            <button onClick={() => onActivity("Linked task requested", "task", "Create task workflow opened from this work order.")} className={actionButtonClass}>Create Task</button>
            <button onClick={() => onActivity("Calendar event requested", "calendar", "Add to calendar workflow opened.")} className={actionButtonClass}>Add to Calendar</button>
            <button onClick={() => onActivity("Assign vendor requested", "task", "Vendor assignment workflow opened.")} className={actionButtonClass}>Assign Vendor</button>
            <button onClick={() => onActivity("Schedule requested", "calendar", "Calendar workflow opened.")} className={actionButtonClass}>Schedule</button>
            <button onClick={() => onActivity("Labor entry requested", "labor", "Labor tracking workflow opened.")} className={actionButtonClass}>Add Labor</button>
            <button onClick={() => onActivity("Material entry requested", "materials", "Materials workflow opened.")} className={actionButtonClass}>Add Materials</button>
            <button onClick={() => onActivity("Invoice creation requested", "invoice", "Invoice workflow opened for this work order.")} className={actionButtonClass}>Create Invoice</button>
            <button onClick={() => onActivity("Approval requested", "approval", "Approval request workflow opened.")} className={actionButtonClass}>Request Approval</button>
            <button onClick={() => onActivity("Tenant notification requested", "notifyTenant", "Tenant notification workflow opened.")} className={actionButtonClass}>Notify Tenant</button>
            <button onClick={() => onActivity("Vendor notification requested", "notifyVendor", "Vendor notification workflow opened.")} className={actionButtonClass}>Notify Vendor</button>
            <button onClick={() => onStatus("in_progress", "Work started.")} className={actionButtonClass}>Mark In Progress</button>
            <button onClick={() => onStatus("waiting_on_client", "Waiting on client response or access.")} className={actionButtonClass}>Mark Waiting on Client</button>
            <button onClick={() => onStatus("waiting_on_parts", "Waiting on parts/vendor.")} className={actionButtonClass}>Mark Waiting on Parts</button>
            <button onClick={() => onStatus("ready_for_review", "Ready for manager review.")} className={actionButtonClass}>Mark Ready for Review</button>
            <button onClick={() => onStatus("completed", "Completed from detail drawer.")} className={successActionButtonClass}>Mark Completed</button>
            <button onClick={() => onStatus("invoiced", "Invoice handoff requested.")} className={successActionButtonClass}>Mark Invoiced</button>
            <button onClick={onArchive} className={dangerActionButtonClass}>Cancel/Archive</button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-[#0b1220] p-4">
            <SectionHeader title="Attachments" subtitle="Upload storage is not wired yet." />
            <p className="text-sm text-gray-400">{workOrder.attachmentCount || 0} photos/files attached.</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-[#0b1220] p-4">
            <SectionHeader title="AI / Automation Activity" />
            {workOrder.automationActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No automation activity yet.</p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-300">{workOrder.automationActivity.map((item) => <li key={item}>{item}</li>)}</ul>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-gray-800 bg-[#0b1220] p-4">
          <SectionHeader title="Notes / Comments" />
          <textarea className={inputClass} rows={3} placeholder="Add note placeholder - backend comments coming soon" />
        </div>

        <div className="mt-5 rounded-xl border border-gray-800 bg-[#0b1220] p-4">
          <SectionHeader title="Activity Log" />
          <div className="space-y-3">
            {workOrder.activityLog.map((activity, index) => (
              <div key={`${activity.timestamp}-${index}`} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-white">{activity.action}</p>
                <p className="text-xs text-gray-500">{activity.actor} / {new Date(activity.timestamp).toLocaleString()}</p>
                {activity.detail && <p className="mt-1 text-sm text-gray-400">{activity.detail}</p>}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#0b1220] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-200 capitalize">{value}</p>
    </div>
  );
}

function PlaceholderModal({ placeholder, onClose }: { placeholder: PlaceholderName | null; onClose: () => void }) {
  const content: Record<PlaceholderName, { title: string; description: string }> = {
    import: {
      title: "Import Work Orders",
      description: "Import from CSV, AppFolio, Buildium, Propertyware, Rent Manager, Google Sheets, Airtable, or email inbox.",
    },
    message: {
      title: "Create from Call / Email / Text",
      description: "Paste a transcript, email, tenant message, or note. AI will extract title, issue, category, urgency, contact, property, and next action when the backend is wired.",
    },
    export: {
      title: "Export Work Orders",
      description: "No filtered work orders are available to export yet.",
    },
    settings: {
      title: "Work Order Settings",
      description: "Configure statuses, categories, required fields, notification templates, approval thresholds, vendor list, and follow-up timing.",
    },
    task: {
      title: "Create Task / Assign Vendor",
      description: "This will create linked tasks and vendor assignments once task/vendor backend wiring is connected.",
    },
    calendar: {
      title: "Add to Calendar",
      description: "Calendar sync will create or update scheduled work order appointments.",
    },
    labor: {
      title: "Add Labor",
      description: "Labor entry will connect to Team / Labor and Job Costing.",
    },
    materials: {
      title: "Add Materials",
      description: "Material entry will connect to Materials and purchasing workflows.",
    },
    invoice: {
      title: "Create Invoice",
      description: "Invoice creation will connect this work order to Financials.",
    },
    notifyTenant: {
      title: "Notify Tenant",
      description: "Tenant/client notification templates will send updates by SMS or email.",
    },
    notifyVendor: {
      title: "Notify Vendor",
      description: "Vendor notification templates will send assignment and schedule details.",
    },
    approval: {
      title: "Request Approval",
      description: "Approval routing will send the scope and estimated spend to the client/owner.",
    },
  };
  const state = placeholder ? content[placeholder] : null;
  return (
    <ActionStateModal
      open={Boolean(state)}
      kind="coming_soon"
      featureName={state?.title || "Work order workflow"}
      description={state?.description}
      onClose={onClose}
    />
  );
}
