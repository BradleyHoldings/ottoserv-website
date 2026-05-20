"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import KpiCard from "@/components/dashboard/KpiCard";
import ComingSoonBanner from "@/components/dashboard/ComingSoonBanner";
import {
  getCrmActivities,
  getCrmCompanies,
  getCrmContacts,
  getCrmDeals,
  getCrmTasks,
  hasPlatformAccess,
} from "@/lib/dashboardApi";
import {
  computeCrmMetrics,
  createCrmActivity,
  formatCrmDateTime,
  formatCurrency,
  getJarvisCrmResponse,
  getPipelineBreakdown,
  normalizeContact,
  normalizeCrmCollections,
  normalizeDeal,
  normalizeTask,
} from "@/lib/crm.mjs";

type CrmCollections = {
  contacts: CrmContact[];
  companies: CrmCompany[];
  deals: CrmDeal[];
  tasks: CrmTask[];
  activities: CrmActivity[];
};

type CrmContact = {
  id: string;
  firstName: string;
  fullName: string;
  status: string;
};

type CrmCompany = { id: string; name: string };
type CrmDeal = { id: string; name: string; stage: string; value: number; status: string };
type CrmTask = { id: string; title: string; status: string };
type CrmActivity = {
  id: string;
  type: string;
  title: string;
  description: string;
  contactName?: string;
  companyName?: string;
  dealName?: string;
  createdAt: string;
};

type ModalName = "contact" | "import" | "deal" | "task" | "jarvis" | "draft" | null;

const EMPTY_CRM = normalizeCrmCollections({});

const QUICK_LINKS = [
  { href: "/dashboard/crm/contacts", label: "Contacts", desc: "People and leads" },
  { href: "/dashboard/crm/companies", label: "Companies", desc: "Accounts" },
  { href: "/dashboard/crm/deals", label: "Deals", desc: "Open pipeline" },
  { href: "/dashboard/crm/activity", label: "Activity", desc: "All CRM activity" },
];

const JARVIS_PROMPTS = [
  "Which leads need follow-up today?",
  "What's the total pipeline value this month?",
  "Who are my highest-value prospects?",
  "Draft a follow-up email for a selected contact.",
];

const STAGE_COLORS: Record<string, string> = {
  new: "bg-sky-500",
  discovery: "bg-blue-500",
  qualified: "bg-indigo-500",
  "proposal sent": "bg-purple-500",
  negotiation: "bg-yellow-500",
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: "bg-blue-900/40 text-blue-300 border-blue-800",
  email: "bg-indigo-900/40 text-indigo-300 border-indigo-800",
  sms: "bg-cyan-900/40 text-cyan-300 border-cyan-800",
  form: "bg-emerald-900/40 text-emerald-300 border-emerald-800",
  note: "bg-gray-800 text-gray-300 border-gray-700",
  task: "bg-green-900/40 text-green-300 border-green-800",
  deal_change: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
  appointment: "bg-purple-900/40 text-purple-300 border-purple-800",
  invoice: "bg-orange-900/40 text-orange-300 border-orange-800",
  work_order: "bg-red-900/40 text-red-300 border-red-800",
  automation: "bg-blue-900/40 text-blue-300 border-blue-800",
};

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="text-gray-400 text-xs mb-1 block">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500 placeholder:text-gray-500";

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <section className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#111827] border border-gray-700 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            x
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function activityText(type: string) {
  return type.replace(/_/g, " ");
}

export default function CRMPage() {
  const [crm, setCrm] = useState<CrmCollections>(EMPTY_CRM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState<ModalName>(null);
  const [toast, setToast] = useState("");
  const [jarvisPrompt, setJarvisPrompt] = useState(JARVIS_PROMPTS[0]);
  const [draftContact, setDraftContact] = useState("");
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getCrmContacts().catch(() => []),
      getCrmDeals().catch(() => []),
      getCrmCompanies().catch(() => []),
      getCrmActivities().catch(() => []),
      getCrmTasks().catch(() => []),
    ])
      .then(([contacts, deals, companies, activities, tasks]) => {
        if (cancelled) return;
        setCrm(normalizeCrmCollections({ contacts, deals, companies, activities, tasks }));
        setLoadError("");
      })
      .catch(() => {
        if (cancelled) return;
        setCrm(EMPTY_CRM);
        setLoadError("CRM data is temporarily unavailable. You can still use local CRM actions safely.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => computeCrmMetrics(crm), [crm]);
  const pipeline = useMemo(() => getPipelineBreakdown(crm.deals), [crm.deals]);
  const recentActivities = crm.activities.slice(0, 8);
  const platformAccess = hasPlatformAccess();
  const isEmpty =
    !loading &&
    crm.contacts.length === 0 &&
    crm.deals.length === 0 &&
    crm.activities.length === 0 &&
    crm.companies.length === 0 &&
    crm.tasks.length === 0;
  const jarvisResponse = getJarvisCrmResponse(jarvisPrompt, crm);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }

  function handleAddContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const contact = normalizeContact({
      id: `local-contact-${Date.now()}`,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.company,
      phone: data.phone,
      email: data.email,
      status: data.status,
      source: data.source,
      owner: data.owner,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setCrm((current) => ({
      ...current,
      contacts: [contact, ...current.contacts],
      activities: [
        createCrmActivity({
          type: "note",
          title: "Contact added",
          description: `Contact added: ${contact.fullName}`,
          contactId: contact.id,
          contactName: contact.fullName,
        }),
        ...current.activities,
      ],
    }));
    setModal(null);
    notify("Contact added locally. Backend save wiring is still pending.");
  }

  function handleCreateDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const deal = normalizeDeal({
      id: `local-deal-${Date.now()}`,
      name: data.dealName,
      contactName: data.linkedTo,
      companyName: data.linkedTo,
      stage: data.stage,
      value: data.value,
      expectedCloseDate: data.expectedCloseDate,
      owner: data.owner,
      notes: data.notes,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setCrm((current) => ({
      ...current,
      deals: [deal, ...current.deals],
      activities: [
        createCrmActivity({
          type: "deal_change",
          title: "Deal created",
          description: `Deal created: ${deal.name}`,
          dealId: deal.id,
          dealName: deal.name,
        }),
        ...current.activities,
      ],
    }));
    setModal(null);
    notify("Deal created locally. Backend save wiring is still pending.");
  }

  function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const task = normalizeTask({
      id: `local-task-${Date.now()}`,
      title: data.title,
      contactName: data.linkedTo,
      companyName: data.linkedTo,
      dealName: data.linkedTo,
      dueDate: data.dueDate,
      priority: data.priority,
      assignedTo: data.assignedTo,
      notes: data.notes,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setCrm((current) => ({
      ...current,
      tasks: [task, ...current.tasks],
      activities: [
        createCrmActivity({
          type: "task",
          title: "Task created",
          description: `Task created: ${task.title}`,
        }),
        ...current.activities,
      ],
    }));
    setModal(null);
    notify("Task created locally. Backend save wiring is still pending.");
  }

  function handleDraft() {
    const selected = crm.contacts.find((contact) =>
      contact.fullName.toLowerCase().includes(draftContact.toLowerCase().trim())
    );
    if (!selected) {
      setDraftMessage("No matching contact found. Choose an existing contact or add the contact first.");
      return;
    }
    setDraftMessage(
      `Subject: Quick follow-up from OttoServ\n\nHi ${selected.firstName || selected.fullName},\n\nI wanted to follow up on your recent conversation with OttoServ. Are you still looking for help with your front-office workflow or lead follow-up process?\n\nBest,\nOttoServ`
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM</h1>
          <p className="text-gray-500 text-sm mt-1">
            Customer relationships, pipeline, follow-ups, and Jarvis actions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModal("contact")} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            Add Contact
          </button>
          <button onClick={() => setModal("import")} className="px-3 py-2 bg-[#1f2937] hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg border border-gray-700 transition-colors">
            Import Contacts
          </button>
          <button onClick={() => setModal("deal")} className="px-3 py-2 bg-[#1f2937] hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg border border-gray-700 transition-colors">
            Create Deal
          </button>
          <button onClick={() => setModal("task")} className="px-3 py-2 bg-[#1f2937] hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg border border-gray-700 transition-colors">
            Create Task
          </button>
          <button onClick={() => setModal("jarvis")} className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors">
            Ask Jarvis
          </button>
        </div>
      </div>

      {toast && (
        <div className="mb-4 border border-blue-900/50 bg-blue-950/30 text-blue-200 rounded-lg px-4 py-3 text-sm">
          {toast}
        </div>
      )}

      {loadError && (
        <div className="mb-4 border border-red-900/50 bg-red-950/30 text-red-200 rounded-lg px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      {!platformAccess && (
        <div className="mb-6">
          <ComingSoonBanner tone="auth" />
        </div>
      )}

      {isEmpty && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-[#111827] p-6">
          <p className="text-white font-semibold">No CRM records yet</p>
          <p className="text-gray-400 text-sm mt-2 max-w-2xl">
            Add a contact, import a CSV, or create the first deal/task. This page now stays usable even when contacts, companies, deals, tasks, and activities are empty.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => setModal("contact")} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              Add Contact
            </button>
            <button onClick={() => setModal("import")} className="px-3 py-2 bg-[#1f2937] hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg border border-gray-700 transition-colors">
              Import CSV
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard value={loading ? "..." : metrics.totalContacts} label="Total Contacts" color="blue" />
        <KpiCard value={loading ? "..." : metrics.activeLeads} label="Active Leads" color="purple" />
        <KpiCard value={loading ? "..." : metrics.openDeals} label="Open Deals" color="yellow" />
        <KpiCard value={loading ? "..." : formatCurrency(metrics.pipelineValue)} label="Pipeline Value" color="green" />
        <KpiCard value={loading ? "..." : metrics.tasksDue} label="Tasks Due" color="red" />
        <KpiCard value={loading ? "..." : `${metrics.winRate}%`} label="Win Rate" color="green" trend={`${metrics.wonDeals} of ${metrics.wonDeals + metrics.lostDeals} closed`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <h2 className="text-white font-semibold mb-3">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUICK_LINKS.map((link) => {
                const count =
                  link.label === "Contacts"
                    ? crm.contacts.length
                    : link.label === "Companies"
                      ? crm.companies.length
                      : link.label === "Deals"
                        ? metrics.openDeals
                        : crm.activities.length;
                return (
                  <Link key={link.href} href={link.href} className="bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-blue-800 focus:border-blue-600 focus:outline-none transition-colors">
                    <p className="text-white font-medium text-sm">{link.label}</p>
                    <p className="text-blue-400 text-2xl font-bold tabular-nums mt-2">{count}</p>
                    <p className="text-gray-500 text-xs mt-1">{link.desc}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold">Recent Activity</h2>
              <Link href="/dashboard/crm/activity" className="text-blue-400 hover:text-blue-300 text-sm">
                View all
              </Link>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              {recentActivities.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-300 text-sm font-medium">No CRM activity yet</p>
                  <p className="text-gray-500 text-sm mt-1">New contacts, deals, tasks, calls, invoices, work orders, and automations will appear here.</p>
                </div>
              ) : (
                recentActivities.map((activity, index) => (
                  <div key={activity.id} className={`flex items-start gap-3 p-4 ${index < recentActivities.length - 1 ? "border-b border-gray-800" : ""}`}>
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 text-sm leading-snug">{activity.description}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {[activity.contactName, activity.companyName, activity.dealName].filter(Boolean).join(" / ") || activity.title}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-gray-600 text-xs whitespace-nowrap">{formatCrmDateTime(activity.createdAt)}</p>
                      <span className={`inline-flex items-center mt-1 rounded border px-1.5 py-0.5 text-xs font-medium ${ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS.note}`}>
                        {activityText(activity.type)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="bg-[#111827] border border-gray-800 rounded-xl p-4">
            <h2 className="text-white font-semibold mb-3">Ask Jarvis about CRM</h2>
            <div className="bg-[#0f1117] border border-gray-700 rounded-lg p-3 mb-4">
              <p className="text-gray-300 text-sm font-medium">{jarvisResponse.title}</p>
              <p className="text-gray-400 text-sm mt-2 leading-relaxed">{jarvisResponse.body}</p>
            </div>
            <div className="space-y-2">
              {JARVIS_PROMPTS.map((prompt) => (
                <button key={prompt} onClick={() => setJarvisPrompt(prompt)} className="w-full text-left px-3 py-2 bg-[#0f1117] border border-gray-700 hover:border-blue-700 rounded-lg text-gray-400 hover:text-white text-sm transition-colors">
                  {prompt}
                </button>
              ))}
            </div>
            <button onClick={() => setModal("jarvis")} className="w-full mt-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors">
              Open Jarvis Panel
            </button>
          </section>

          <section className="bg-[#111827] border border-gray-800 rounded-xl p-4">
            <h3 className="text-white font-medium text-sm mb-3">Pipeline Breakdown</h3>
            <div className="space-y-2">
              {pipeline.map((row) => (
                <div key={row.stage} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${STAGE_COLORS[row.stage] || "bg-gray-500"} flex-shrink-0`} />
                  <span className="text-gray-400 capitalize w-24">{row.stage}</span>
                  <span className="text-gray-500">{row.count} deal{row.count === 1 ? "" : "s"}</span>
                  <span className="ml-auto text-gray-300 font-medium">{row.value > 0 ? formatCurrency(row.value) : "$0"}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {modal === "contact" && (
        <Modal title="Add Contact" onClose={() => setModal(null)}>
          <form onSubmit={handleAddContact} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First name"><input name="firstName" className={inputClass} required /></Field>
            <Field label="Last name"><input name="lastName" className={inputClass} required /></Field>
            <Field label="Company"><input name="company" className={inputClass} /></Field>
            <Field label="Phone"><input name="phone" className={inputClass} /></Field>
            <Field label="Email"><input name="email" type="email" className={inputClass} /></Field>
            <Field label="Status"><select name="status" className={inputClass}><option value="lead">Lead</option><option value="active">Active</option><option value="customer">Customer</option></select></Field>
            <Field label="Source"><input name="source" className={inputClass} placeholder="Website, call, referral" /></Field>
            <Field label="Owner"><input name="owner" className={inputClass} placeholder="Owner or agent" /></Field>
            <Field label="Notes" wide><textarea name="notes" rows={3} className={inputClass} /></Field>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">Save Contact</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "import" && (
        <Modal title="Import Contacts" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="border border-dashed border-gray-700 rounded-xl p-6 text-center bg-[#0f1117]">
              <p className="text-gray-200 font-medium">Upload CSV</p>
              <p className="text-gray-500 text-sm mt-1">CSV parsing and backend import are coming soon. This flow will map first name, last name, company, phone, email, status, source, owner, and notes.</p>
              <input type="file" accept=".csv" className="mt-4 text-sm text-gray-400" onChange={() => notify("CSV selected. Import processing requires backend wiring.")} />
            </div>
            <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
              <p className="text-gray-300 text-sm font-medium">Field mapping and duplicate detection</p>
              <p className="text-gray-500 text-sm mt-2">Before final import, OttoServ will preview mapped fields and flag likely duplicates by email, phone, and company.</p>
            </div>
            <button onClick={() => notify("CRM import flow coming soon. Backend import endpoint required.")} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
              Validate CSV
            </button>
          </div>
        </Modal>
      )}

      {modal === "deal" && (
        <Modal title="Create Deal" onClose={() => setModal(null)}>
          <form onSubmit={handleCreateDeal} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Deal name" wide><input name="dealName" className={inputClass} required /></Field>
            <Field label="Contact or company"><input name="linkedTo" className={inputClass} placeholder="Contact or company name" /></Field>
            <Field label="Stage"><select name="stage" className={inputClass}><option value="new">New</option><option value="discovery">Discovery</option><option value="qualified">Qualified</option><option value="proposal sent">Proposal Sent</option><option value="negotiation">Negotiation</option></select></Field>
            <Field label="Value"><input name="value" type="number" min="0" className={inputClass} /></Field>
            <Field label="Expected close date"><input name="expectedCloseDate" type="date" className={inputClass} /></Field>
            <Field label="Owner"><input name="owner" className={inputClass} /></Field>
            <Field label="Notes" wide><textarea name="notes" rows={3} className={inputClass} /></Field>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">Create Deal</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "task" && (
        <Modal title="Create Task" onClose={() => setModal(null)}>
          <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title" wide><input name="title" className={inputClass} required /></Field>
            <Field label="Linked contact/company/deal"><input name="linkedTo" className={inputClass} /></Field>
            <Field label="Due date"><input name="dueDate" type="date" className={inputClass} /></Field>
            <Field label="Priority"><select name="priority" className={inputClass}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></Field>
            <Field label="Assigned to"><input name="assignedTo" className={inputClass} /></Field>
            <Field label="Notes" wide><textarea name="notes" rows={3} className={inputClass} /></Field>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">Create Task</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "jarvis" && (
        <Modal title="Ask Jarvis About CRM" onClose={() => setModal(null)}>
          <div className="space-y-3">
            {JARVIS_PROMPTS.map((prompt) => (
              <button key={prompt} onClick={() => {
                setJarvisPrompt(prompt);
                if (prompt.toLowerCase().includes("draft")) setModal("draft");
              }} className="w-full text-left p-3 bg-[#0f1117] border border-gray-700 rounded-lg hover:border-blue-700 text-gray-300 text-sm">
                {prompt}
              </button>
            ))}
            <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
              <p className="text-white text-sm font-medium">{jarvisResponse.title}</p>
              <p className="text-gray-400 text-sm mt-2">{jarvisResponse.body}</p>
            </div>
          </div>
        </Modal>
      )}

      {modal === "draft" && (
        <Modal title="Draft Follow-up Email" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Contact name">
              <input value={draftContact} onChange={(event) => setDraftContact(event.target.value)} className={inputClass} placeholder="Type an existing contact name" />
            </Field>
            <button onClick={handleDraft} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
              Draft Email
            </button>
            {draftMessage && <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-[#0f1117] border border-gray-800 rounded-xl p-4">{draftMessage}</pre>}
          </div>
        </Modal>
      )}
    </div>
  );
}
