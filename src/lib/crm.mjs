const CLOSED_STAGES = new Set(["won", "lost", "closed", "closed won", "closed lost"]);

export const CRM_STAGES = [
  "new",
  "discovery",
  "qualified",
  "proposal sent",
  "negotiation",
  "won",
  "lost",
];

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateText(value) {
  const raw = text(value);
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function normalizeStage(value) {
  const stage = text(value, "new").toLowerCase().replace(/_/g, " ");
  if (stage === "proposal") return "proposal sent";
  return stage;
}

export function isOpenDeal(deal) {
  const status = text(deal?.status).toLowerCase();
  const stage = normalizeStage(deal?.stage);
  return status !== "closed" && !CLOSED_STAGES.has(stage);
}

export function normalizeContact(contact = {}) {
  const firstName = text(contact.firstName ?? contact.first_name);
  const lastName = text(contact.lastName ?? contact.last_name);
  const fullName = text(
    contact.fullName ?? contact.full_name,
    `${firstName} ${lastName}`.trim() || "Unnamed contact"
  );

  return {
    ...contact,
    id: text(contact.id, `contact-${cryptoSafeId()}`),
    firstName,
    lastName,
    fullName,
    companyId: text(contact.companyId ?? contact.company_id),
    companyName: text(contact.companyName ?? contact.company_name),
    phone: text(contact.phone),
    email: text(contact.email),
    status: text(contact.status ?? contact.contact_type, "lead").toLowerCase(),
    source: text(contact.source, "manual"),
    owner: text(contact.owner ?? contact.assigned_to, "Unassigned"),
    lastContactedAt: text(contact.lastContactedAt ?? contact.last_contacted_at),
    nextFollowUpAt: text(contact.nextFollowUpAt ?? contact.next_follow_up_at),
    notes: text(contact.notes ?? contact.notes_summary),
    createdAt: dateText(contact.createdAt ?? contact.created_at),
    updatedAt: dateText(contact.updatedAt ?? contact.updated_at ?? contact.createdAt ?? contact.created_at),
  };
}

export function normalizeCompany(company = {}) {
  return {
    ...company,
    id: text(company.id, `company-${cryptoSafeId()}`),
    name: text(company.name, "Unnamed company"),
    website: text(company.website),
    phone: text(company.phone),
    email: text(company.email),
    address: text(company.address),
    mainContactId: text(company.mainContactId ?? company.main_contact_id),
    owner: text(company.owner ?? company.assigned_to, "Unassigned"),
    createdAt: dateText(company.createdAt ?? company.created_at),
    updatedAt: dateText(company.updatedAt ?? company.updated_at ?? company.createdAt ?? company.created_at),
  };
}

export function normalizeDeal(deal = {}) {
  return {
    ...deal,
    id: text(deal.id, `deal-${cryptoSafeId()}`),
    name: text(deal.name ?? deal.dealName ?? deal.deal_name, "Untitled deal"),
    contactId: text(deal.contactId ?? deal.contact_id),
    contactName: text(deal.contactName ?? deal.contact_name),
    companyId: text(deal.companyId ?? deal.company_id),
    companyName: text(deal.companyName ?? deal.company_name),
    stage: normalizeStage(deal.stage),
    value: number(deal.value),
    probability: number(deal.probability),
    expectedCloseDate: text(deal.expectedCloseDate ?? deal.expected_close_date),
    status: text(deal.status, isOpenDeal(deal) ? "open" : "closed"),
    owner: text(deal.owner ?? deal.assigned_to, "Unassigned"),
    notes: text(deal.notes),
    nextFollowUpAt: text(deal.nextFollowUpAt ?? deal.next_follow_up_at),
    priority: text(deal.priority, "normal"),
    createdAt: dateText(deal.createdAt ?? deal.created_at),
    updatedAt: dateText(deal.updatedAt ?? deal.updated_at ?? deal.createdAt ?? deal.created_at),
  };
}

export function normalizeTask(task = {}) {
  return {
    ...task,
    id: text(task.id, `task-${cryptoSafeId()}`),
    title: text(task.title, "Untitled task"),
    contactId: text(task.contactId ?? task.contact_id),
    contactName: text(task.contactName ?? task.contact_name),
    companyId: text(task.companyId ?? task.company_id),
    companyName: text(task.companyName ?? task.company_name),
    dealId: text(task.dealId ?? task.deal_id),
    dealName: text(task.dealName ?? task.deal_name),
    dueDate: text(task.dueDate ?? task.due_date),
    priority: text(task.priority, "normal"),
    assignedTo: text(task.assignedTo ?? task.assigned_to, "Unassigned"),
    status: text(task.status, "open").toLowerCase(),
    notes: text(task.notes),
    createdAt: dateText(task.createdAt ?? task.created_at),
    updatedAt: dateText(task.updatedAt ?? task.updated_at ?? task.createdAt ?? task.created_at),
  };
}

export function normalizeActivity(activity = {}) {
  const type = text(activity.type, "note").toLowerCase().replace(/ /g, "_");
  const title = text(activity.title, "CRM activity");
  return {
    ...activity,
    id: text(activity.id, `activity-${cryptoSafeId()}`),
    type,
    title,
    description: text(activity.description, "CRM activity logged."),
    contactId: text(activity.contactId ?? activity.contact_id),
    contactName: text(activity.contactName ?? activity.contact_name),
    companyId: text(activity.companyId ?? activity.company_id),
    companyName: text(activity.companyName ?? activity.company_name),
    dealId: text(activity.dealId ?? activity.deal_id),
    dealName: text(activity.dealName ?? activity.deal_name),
    createdBy: text(activity.createdBy ?? activity.created_by ?? activity.user_or_agent, "OttoServ"),
    createdAt: dateText(activity.createdAt ?? activity.created_at ?? activity.timestamp),
  };
}

export function normalizeCrmCollections(data = {}) {
  return {
    contacts: asArray(data.contacts).map(normalizeContact),
    companies: asArray(data.companies).map(normalizeCompany),
    deals: asArray(data.deals).map(normalizeDeal),
    tasks: asArray(data.tasks).map(normalizeTask),
    activities: asArray(data.activities).map(normalizeActivity),
  };
}

export function computeCrmMetrics(crm) {
  const contacts = asArray(crm.contacts);
  const deals = asArray(crm.deals);
  const tasks = asArray(crm.tasks);
  const openDeals = deals.filter(isOpenDeal);
  const wonDeals = deals.filter((deal) => normalizeStage(deal.stage) === "won").length;
  const lostDeals = deals.filter((deal) => normalizeStage(deal.stage) === "lost").length;
  const closedDeals = wonDeals + lostDeals;

  return {
    totalContacts: contacts.length,
    activeLeads: contacts.filter((contact) => ["lead", "new", "active"].includes(text(contact.status).toLowerCase())).length,
    openDeals: openDeals.length,
    pipelineValue: openDeals.reduce((sum, deal) => sum + number(deal.value), 0),
    weightedPipelineValue: openDeals.reduce(
      (sum, deal) => sum + number(deal.value) * (number(deal.probability) / 100 || 0),
      0
    ),
    tasksDue: tasks.filter((task) => ["open", "overdue", "todo", "pending"].includes(text(task.status).toLowerCase())).length,
    winRate: closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0,
    wonDeals,
    lostDeals,
  };
}

export function getPipelineBreakdown(deals) {
  return ["new", "discovery", "qualified", "proposal sent", "negotiation"].map((stage) => {
    const stageDeals = asArray(deals).filter((deal) => normalizeStage(deal.stage) === stage && isOpenDeal(deal));
    return {
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, deal) => sum + number(deal.value), 0),
    };
  });
}

export function createCrmActivity(input) {
  return normalizeActivity({
    id: `activity-${cryptoSafeId()}`,
    createdAt: new Date().toISOString(),
    createdBy: "Owner",
    ...input,
  });
}

export function getJarvisCrmResponse(prompt, crm) {
  const normalizedPrompt = text(prompt).toLowerCase();
  const metrics = computeCrmMetrics(crm);
  const today = new Date().toISOString().slice(0, 10);

  if (normalizedPrompt.includes("follow-up")) {
    const dueTasks = asArray(crm.tasks).filter((task) => {
      const due = text(task.dueDate).slice(0, 10);
      return due && due <= today && !["closed", "done", "completed", "won", "lost"].includes(text(task.status).toLowerCase());
    });
    const dueDeals = asArray(crm.deals).filter((deal) => {
      const due = text(deal.nextFollowUpAt).slice(0, 10);
      return due && due <= today && isOpenDeal(deal);
    });
    const dueContacts = asArray(crm.contacts).filter((contact) => {
      const due = text(contact.nextFollowUpAt).slice(0, 10);
      return due && due <= today && !["closed", "won", "lost", "archived"].includes(text(contact.status).toLowerCase());
    });

    if (!dueTasks.length && !dueDeals.length && !dueContacts.length) {
      return {
        title: "Follow-ups due today",
        body: "No follow-ups are due today. When CRM tasks, contacts, or deals have next follow-up dates, Jarvis will surface them here.",
      };
    }

    return {
      title: "Follow-ups due today",
      body: [...dueTasks, ...dueDeals, ...dueContacts]
        .slice(0, 6)
        .map((item) => item.title || item.name || item.fullName)
        .join(", "),
    };
  }

  if (normalizedPrompt.includes("pipeline value")) {
    return {
      title: "Pipeline value",
      body: `Open pipeline is ${formatCurrency(metrics.pipelineValue)}. Weighted pipeline is ${formatCurrency(metrics.weightedPipelineValue)} when deal probability is available.`,
    };
  }

  if (normalizedPrompt.includes("highest-value")) {
    const prospects = asArray(crm.deals)
      .filter(isOpenDeal)
      .sort((a, b) => number(b.value) - number(a.value))
      .slice(0, 5);
    return {
      title: "Highest-value prospects",
      body: prospects.length
        ? prospects.map((deal) => `${deal.name} (${formatCurrency(deal.value)})`).join(", ")
        : "No open deals yet. Create a deal and Jarvis will rank prospects by value, stage, recency, and priority.",
    };
  }

  if (normalizedPrompt.includes("draft")) {
    return {
      title: "Draft follow-up email",
      body: "Choose a contact in the CRM draft panel, then Jarvis can prepare a follow-up email from their latest notes and open deals.",
      action: "draft",
    };
  }

  return {
    title: "CRM assistant",
    body: "Jarvis can summarize follow-ups, pipeline value, high-value prospects, and draft CRM follow-up emails from the data currently loaded on this page.",
  };
}

export function formatCurrency(value) {
  return `$${Math.round(number(value)).toLocaleString()}`;
}

export function formatCrmDateTime(value) {
  const date = new Date(text(value));
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function cryptoSafeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
