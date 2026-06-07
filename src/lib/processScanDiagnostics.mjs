const GAP_LABELS = {
  missed_calls_messages: "Calls/messages get missed",
  follow_up_depends_on_memory: "Follow-up depends on memory",
  no_clear_owner: "No clear owner for the next step",
  slow_response: "Leads wait too long for a response",
  inconsistent_payment_reminders: "Payment/invoice reminders are inconsistent",
  status_not_updated: "Status is not updated in the CRM or admin system",
  too_many_tools: "The team uses too many tools or inboxes",
  customers_ask_more_than_once: "Customers have to ask more than once",
  lost_opportunities_unknown: "We do not know how many opportunities are being lost",
  other: "Other",
};

const WORKFLOW_CONFIG = {
  invoice_payment_follow_up: {
    name: "Invoice/payment follow-up workflow",
    trigger: "Invoice/payment follow-up request received",
    channel: "inbox / invoice tool / admin system",
    action: "Team checks invoice, customer, and payment status",
    outcome: "Payment or follow-up status is resolved",
    recommendation: "Invoice Follow-Up Agent",
    bestJob:
      "capture invoice/payment follow-up requests, assign the next action, trigger reminders, and update the team when payment or follow-up status changes.",
    noReplace: ["Final financial decisions", "Human judgment on disputes or exceptions", "Accounting system controls"],
    measurements: [
      "Missed follow-ups reduced",
      "Response time improved",
      "Number of recovered opportunities",
      "Number of reminders triggered",
      "Number of unresolved handoffs still needing human review",
    ],
  },
  scheduling: {
    name: "Scheduling request workflow",
    trigger: "Scheduling request received",
    channel: "phone / form / inbox / scheduling tool",
    action: "Team checks availability and confirms the next step",
    outcome: "Appointment or estimate slot is confirmed",
    recommendation: "Scheduling Assistant",
    bestJob:
      "capture scheduling requests, confirm availability context, assign an owner, trigger reminders, and update the schedule or CRM.",
    noReplace: ["Final dispatch judgment", "Pricing exceptions", "Human handling for unusual availability conflicts"],
    measurements: [
      "Time to first scheduling response",
      "Appointments confirmed",
      "Back-and-forth messages reduced",
      "Overdue scheduling requests",
      "Unresolved handoffs needing review",
    ],
  },
  estimate_follow_up: {
    name: "Estimate follow-up workflow",
    trigger: "Estimate follow-up opportunity received",
    channel: "CRM / inbox / estimate tool",
    action: "Team checks estimate status and contacts the prospect",
    outcome: "Prospect receives next step or estimate decision",
    recommendation: "Estimate Follow-Up Agent",
    bestJob:
      "track open estimates, assign follow-up ownership, send reminders, and surface stalled estimates before they go cold.",
    noReplace: ["Final pricing decisions", "Scope changes", "Human judgment on exceptions"],
    measurements: [
      "Open estimates followed up",
      "Response time improved",
      "Recovered opportunities",
      "Reminder volume",
      "Stalled handoffs still needing review",
    ],
  },
  missed_calls: {
    name: "Missed call workflow",
    trigger: "Call or message arrives",
    channel: "phone / voicemail / text / answering service",
    action: "Team reviews missed call and decides next action",
    outcome: "Caller receives response and next step",
    recommendation: "Front Desk AI",
    bestJob:
      "answer or triage missed calls, capture lead details, assign urgency, and route summaries to the right person.",
    noReplace: ["Emergency judgment", "Final service approval", "Human handling for sensitive exceptions"],
    measurements: [
      "Missed calls recovered",
      "Speed to lead improved",
      "Qualified opportunities captured",
      "Escalations routed",
      "Unhandled calls remaining",
    ],
  },
  lead_intake: {
    name: "Lead intake workflow",
    trigger: "New lead request received",
    channel: "form / phone / email / text",
    action: "Team qualifies the request and assigns follow-up",
    outcome: "Lead is qualified, routed, and tracked",
    recommendation: "Lead Intake Agent",
    bestJob:
      "capture lead details, qualify fit, assign owner and urgency, and update the team with a clean next action.",
    noReplace: ["Final sales decisions", "Human judgment on fit exceptions", "Complex pricing conversations"],
    measurements: [
      "New leads captured",
      "Speed to first response",
      "Qualified opportunities",
      "Owner assignment rate",
      "Unresolved handoffs",
    ],
  },
  crm_admin_updates: {
    name: "CRM/admin update workflow",
    trigger: "Admin status change or customer update received",
    channel: "CRM / inbox / spreadsheet / admin system",
    action: "Team copies context between tools and updates status",
    outcome: "CRM/admin record is accurate and visible",
    recommendation: "CRM Update Agent",
    bestJob:
      "capture status changes, summarize context, assign ownership, and keep CRM/admin records updated.",
    noReplace: ["Final operational judgment", "Approval controls", "Human review for ambiguous records"],
    measurements: [
      "Records updated",
      "Duplicate entry reduced",
      "Time to status update",
      "Exceptions routed",
      "Unresolved admin gaps",
    ],
  },
  other: {
    name: "Front office workflow",
    trigger: "Front-office request received",
    channel: "call / form / email / text / admin trigger",
    action: "Team reviews the request and decides next action",
    outcome: "Workflow reaches a tracked outcome",
    recommendation: "Front Office Workflow Assistant",
    bestJob:
      "capture structured details, assign owner and urgency, trigger reminders, and keep status visible.",
    noReplace: ["Final business decisions", "Human judgment on exceptions", "Financial or approval controls"],
    measurements: [
      "Response time improved",
      "Follow-ups completed",
      "Recovered opportunities",
      "Reminders triggered",
      "Unresolved bottlenecks",
    ],
  },
};

export function getGapLabel(value) {
  return GAP_LABELS[value] || String(value || "").replaceAll("_", " ");
}

export function getClarificationQuestions(input = {}) {
  const answers = input.clarification_answers || {};
  const tags = input.gap_tags || [];
  const questions = [];

  if (input.audio_status !== "enabled" && !answers.summary) {
    questions.push({
      id: "summary",
      label: "Briefly explain what happened in the recording.",
      placeholder: "Where does the request start, who handles it, and where does it usually slow down?",
    });
  }
  if (!input.software_used && !answers.status_tracking) {
    questions.push({
      id: "status_tracking",
      label: "What tool currently tracks the status?",
      placeholder: "QuickBooks, ServiceTitan, Buildium, Google Sheet, inbox, none...",
    });
  }
  if ((tags.includes("no_clear_owner") || !answers.owner) && !answers.owner) {
    questions.push({
      id: "owner",
      label: "Who owns the next step after this request comes in?",
      placeholder: "Dispatcher, office manager, bookkeeper, whoever sees it first...",
    });
  }
  if ((tags.includes("follow_up_depends_on_memory") || tags.includes("slow_response")) && !answers.follow_up) {
    questions.push({
      id: "follow_up",
      label: "What happens if no one follows up within 24 hours?",
      placeholder: "Nothing, someone checks later, reminder fires, manager escalates...",
    });
  }
  if (!answers.customer_confirmation) {
    questions.push({
      id: "customer_confirmation",
      label: "Does the customer receive a confirmation?",
      placeholder: "Yes by text/email, only if someone manually sends it, no...",
    });
  }
  if ((tags.includes("follow_up_depends_on_memory") || tags.includes("inconsistent_payment_reminders")) && !answers.reminders) {
    questions.push({
      id: "reminders",
      label: "Are reminders manual or automated?",
      placeholder: "Manual calendar reminder, CRM automation, no reminder system...",
    });
  }

  return questions.slice(0, 5);
}

export function createWorkflowDiagnostics(input = {}) {
  const config = WORKFLOW_CONFIG[input.main_leak] || WORKFLOW_CONFIG.other;
  const tags = normalizeArray(input.gap_tags);
  const answers = input.clarification_answers || {};
  const audioStatus = input.audio_status || "unknown";
  const hasRecording = input.recording_status === "recorded_upload_pending" || input.recording_status === "uploaded";
  const hasAudio = audioStatus === "enabled";
  const hasNotes = Boolean(clean(input.current_process_description) || clean(answers.summary));
  const answeredCount = Object.values(answers).filter((value) => clean(value)).length;
  const confidence = buildConfidence({ hasRecording, hasAudio, hasTags: tags.length > 0, hasNotes, answeredCount });
  const reported = buildReported(input, tags, answers);
  const couldNotConfirm = buildUnknowns(input, tags, answers, audioStatus);
  const currentStateMap = buildCurrentStateMap(input, config, tags, answers, couldNotConfirm, confidence.level);
  const futureStateMap = buildFutureStateMap(input, config, confidence.level);
  const leaks = buildLeaks(input, tags, answers, couldNotConfirm);
  const observed = buildObserved(input, config, audioStatus);
  const revenueRisks = buildRevenueRisks(input, tags, answers, config);
  const automationOpportunities = buildAutomationOpportunities(input, tags, answers, config);
  const priorityRanking = buildPriorityRanking(input, tags, answers, couldNotConfirm);
  const nextActions = buildNextActions(input, tags, answers);

  return {
    reportConfidence: confidence,
    observed,
    reported,
    couldNotConfirm,
    currentStateMap,
    futureStateMap,
    topWorkflowLeaks: leaks,
    revenueRisks,
    automationOpportunities,
    priorityRanking,
    nextActions,
    informationGaps: couldNotConfirm,
    aiRecommendation: buildRecommendation(input, config, tags),
  };
}

function buildConfidence({ hasRecording, hasAudio, hasTags, hasNotes, answeredCount }) {
  if (hasRecording && hasTags && (hasAudio || hasNotes || answeredCount >= 3)) {
    return {
      level: "High",
      reason: hasAudio
        ? "Screen recording, audio narration, gap tags, and supporting answers were provided."
        : "Screen recording, gap tags, and strong written answers were provided.",
    };
  }
  if (hasRecording && (hasTags || hasNotes || answeredCount > 0)) {
    return {
      level: "Medium",
      reason: hasAudio
        ? "Screen recording and audio narration were provided, but some workflow details still need confirmation."
        : "Screen recording and supporting context were provided, but no audio narration was captured.",
    };
  }
  return {
    level: "Low",
    reason: hasRecording
      ? "The workflow recording was limited, no narration was captured, and key ownership/follow-up details could not be confirmed."
      : "No screen recording was available, so this report relies on selected gaps and written answers.",
  };
}

function buildObserved(input, config, audioStatus) {
  const observed = [];
  if (input.recording_status === "recorded_upload_pending" || input.recording_status === "uploaded") {
    observed.push(`A screen recording was captured for the ${config.name.toLowerCase()}.`);
    observed.push(`Request appears to start through ${config.channel}.`);
  } else {
    observed.push("No screen recording was captured.");
  }
  if (audioStatus === "enabled") {
    observed.push("Audio narration was captured with the recording.");
  } else if (audioStatus === "blocked") {
    observed.push("Microphone access was blocked, so narration was not captured.");
  } else {
    observed.push("No narration was captured.");
  }
  return observed;
}

function buildReported(input, tags, answers) {
  const reported = [];
  if (tags.length) reported.push(`Selected gap tags: ${tags.map(getGapLabel).join(", ")}.`);
  if (clean(input.current_process_description)) reported.push(`Written workflow notes: ${clean(input.current_process_description)}`);
  for (const [key, value] of Object.entries(answers)) {
    if (clean(value)) reported.push(`${humanize(key)}: ${clean(value)}`);
  }
  return reported.length ? reported : ["No supporting written details were provided."];
}

function buildUnknowns(input, tags, answers, audioStatus) {
  const unknowns = [];
  if (audioStatus !== "enabled") unknowns.push("No narration was captured.");
  if (!clean(answers.owner) && !tags.includes("no_clear_owner")) unknowns.push("Whether owner assignment is clear.");
  if (!clean(input.software_used) && !clean(answers.status_tracking)) unknowns.push("Whether CRM/status is updated.");
  if (!clean(answers.customer_confirmation)) unknowns.push("Whether customer confirmation is sent.");
  if (!clean(answers.reminders) && !tags.includes("follow_up_depends_on_memory")) unknowns.push("Whether reminders are automated.");
  if (!clean(answers.follow_up)) unknowns.push("Whether there is a fallback if the owner does not act.");
  if (!tags.includes("lost_opportunities_unknown")) unknowns.push("Whether missed opportunities are tracked.");
  return Array.from(new Set(unknowns));
}

function buildCurrentStateMap(input, config, tags, answers, unknowns, confidenceLevel) {
  const ownerKnown = clean(answers.owner);
  const remindersKnown = clean(answers.reminders);
  const statusKnown = clean(input.software_used) || clean(answers.status_tracking);
  const confirmationKnown = clean(answers.customer_confirmation);
  const ownerGap = tags.includes("no_clear_owner") || !ownerKnown;
  const reminderGap = tags.includes("follow_up_depends_on_memory") || tags.includes("inconsistent_payment_reminders") || !remindersKnown;
  const visibilityGap = tags.includes("status_not_updated") || !statusKnown;

  const nodes = [
    node("start", "trigger", config.trigger, `Workflow type: ${config.name}`, "inferred", "confirmed"),
    node("channel", "manual_step", `Request enters ${config.channel}`, "Based on selected workflow type and intake context.", "inferred", "confirmed"),
    node("action", "manual_step", config.action, clean(input.current_process_description) || "Detailed team action was not fully described.", clean(input.current_process_description) ? "reported" : "inferred", "confirmed"),
    node("owner_decision", "decision", ownerKnown ? `Is owner assigned? ${ownerKnown}` : "Is owner assigned?", ownerKnown ? `Reported owner: ${ownerKnown}` : "Owner assignment was not confirmed.", ownerKnown ? "reported" : "unknown", ownerGap ? "gap" : "confirmed"),
    node("owner_leak", ownerGap ? "leak" : "system_step", ownerGap ? "Leak: accountability gap" : `Owner confirmed: ${ownerKnown}`, ownerGap ? "No clear owner means the next step can stall." : ownerKnown, ownerGap ? "reported" : "reported", ownerGap ? "gap" : "confirmed", ownerGap ? "high" : undefined, ownerGap ? "Confirm and automate owner assignment." : undefined),
    node("reminder_decision", "decision", "Is follow-up scheduled?", remindersKnown ? `Reported reminders: ${remindersKnown}` : "Reminder system was not confirmed.", remindersKnown ? "reported" : "unknown", reminderGap ? "gap" : "confirmed"),
    node("reminder_leak", reminderGap ? "leak" : "system_step", reminderGap ? "Leak: memory-based follow-up" : "Reminder path confirmed", reminderGap ? "Follow-up appears to depend on a person remembering the next step." : remindersKnown, reminderGap ? "reported" : "reported", reminderGap ? "gap" : "confirmed", reminderGap ? "high" : undefined, reminderGap ? "Automate reminders and escalation." : undefined),
    node("status_decision", "decision", "Is status updated?", statusKnown ? `Reported tracking: ${clean(input.software_used) || clean(answers.status_tracking)}` : "CRM/admin status update was not confirmed.", statusKnown ? "reported" : "unknown", visibilityGap ? "gap" : "confirmed"),
    node("status_leak", visibilityGap ? "leak" : "system_step", visibilityGap ? "Leak: team visibility gap" : "Status path confirmed", visibilityGap ? "The team may not have a reliable source of truth for status." : clean(input.software_used) || clean(answers.status_tracking), visibilityGap ? "unknown" : "reported", visibilityGap ? "gap" : "confirmed", visibilityGap ? "medium" : undefined, visibilityGap ? "Write structured status back to the CRM/admin system." : undefined),
    node("confirmation", confirmationKnown ? "manual_step" : "unknown", confirmationKnown ? "Customer confirmation reported" : "Unknown: customer confirmation not visible", confirmationKnown || "No customer confirmation was confirmed in the recording or answers.", confirmationKnown ? "reported" : "unknown", confirmationKnown ? "confirmed" : "unconfirmed"),
    node("outcome", "outcome", config.outcome, confidenceLevel === "Low" ? "Outcome is inferred from workflow type." : "Target outcome for this front-office workflow.", "inferred", "confirmed"),
  ];

  return {
    workflowName: config.name,
    confidence: confidenceLevel,
    nodes,
    edges: [
      edge("start", "channel"),
      edge("channel", "action"),
      edge("action", "owner_decision"),
      edge("owner_decision", "owner_leak", ownerGap ? "No / unknown" : "Yes"),
      edge("owner_leak", "reminder_decision"),
      edge("reminder_decision", "reminder_leak", reminderGap ? "No / unknown" : "Yes"),
      edge("reminder_leak", "status_decision"),
      edge("status_decision", "status_leak", visibilityGap ? "No / unknown" : "Yes"),
      edge("status_leak", "confirmation"),
      edge("confirmation", "outcome"),
    ],
    unknowns,
  };
}

function buildFutureStateMap(input, config, confidenceLevel) {
  const recommendation = config.recommendation;
  return {
    workflowName: `Recommended ${config.name}`,
    confidence: confidenceLevel,
    nodes: [
      node("future_start", "trigger", "Call / form / email / text / admin trigger", "The future workflow starts from the same front-office demand.", "inferred", "recommended"),
      node("future_capture", "automation", `${recommendation} captures structured details`, "Customer, issue, urgency, owner, and next action are captured immediately.", "inferred", "recommended"),
      node("future_assign", "automation", "Owner, urgency, and next action assigned", "The workflow no longer depends on whoever remembers first.", "inferred", "recommended"),
      node("future_reminder", "automation", "Reminder and escalation scheduled", "Follow-up is tracked until it is resolved or escalated.", "inferred", "recommended"),
      node("future_update", "system_step", "CRM/admin status updated", "The team gets a visible source of truth.", "inferred", "recommended"),
      node("future_dashboard", "outcome", "Dashboard tracks open follow-ups and bottlenecks", "Pilot measurement shows whether the workflow improved.", "inferred", "recommended"),
    ],
    edges: [
      edge("future_start", "future_capture"),
      edge("future_capture", "future_assign"),
      edge("future_assign", "future_reminder"),
      edge("future_reminder", "future_update"),
      edge("future_update", "future_dashboard"),
    ],
  };
}

function buildLeaks(input, tags, answers, unknowns) {
  const leaks = tags.map((tag) => getGapLabel(tag));
  if (!clean(answers.owner) && !tags.includes("no_clear_owner")) leaks.push("Owner assignment could not be confirmed");
  if (!clean(answers.reminders) && !tags.includes("follow_up_depends_on_memory")) leaks.push("Reminder system could not be confirmed");
  if ((!clean(input.software_used) && !clean(answers.status_tracking)) && !tags.includes("status_not_updated")) {
    leaks.push("CRM/admin status update could not be confirmed");
  }
  if (unknowns.includes("No narration was captured.")) leaks.push("No narration was captured, limiting diagnostic detail");
  return Array.from(new Set(leaks)).slice(0, 8);
}

function buildRevenueRisks(input, tags, answers, config) {
  const risks = [];
  const volume = clean(input.monthly_lead_volume);
  if (tags.includes("slow_response") || clean(answers.follow_up)) {
    risks.push(risk("Slow response can turn warm demand cold", volume ? `Roughly ${volume} monthly opportunities may be exposed when first response or follow-up waits on a person.` : "Lead value is exposed when first response or follow-up waits on a person.", "high"));
  }
  if (tags.includes("no_clear_owner") || !clean(answers.owner)) {
    risks.push(risk("Unclear ownership creates dropped handoffs", "When the next owner is unclear, the workflow can stall between intake, qualification, scheduling, and close.", "high"));
  }
  if (tags.includes("status_not_updated") || !clean(input.software_used || answers.status_tracking)) {
    risks.push(risk("Status visibility is weak", "If the CRM/admin status is late or missing, managers cannot see which opportunities are open, overdue, or lost.", "medium"));
  }
  if (tags.includes("lost_opportunities_unknown")) {
    risks.push(risk("Lost revenue is not measured", "The team may know work feels leaky without knowing how many calls, leads, estimates, or payments are actually recovered.", "medium"));
  }
  if (risks.length === 0) {
    risks.push(risk(`${config.name} still needs measurement`, "No severe leak tag was selected, so the main revenue risk is lack of before/after measurement.", "low"));
  }
  return risks;
}

function buildAutomationOpportunities(input, tags, answers, config) {
  const tracking = clean(input.software_used) || clean(answers.status_tracking) || "the CRM/admin system";
  const opportunities = [
    `Capture ${config.name.toLowerCase()} details at the first touch and write a structured summary to ${tracking}.`,
    "Assign owner, urgency, and next action immediately instead of relying on whoever sees the request first.",
  ];
  if (tags.includes("follow_up_depends_on_memory") || tags.includes("slow_response") || clean(answers.follow_up)) {
    opportunities.push("Trigger follow-up reminders and escalation when no action happens inside the agreed response window.");
  }
  if (tags.includes("status_not_updated") || clean(tracking)) {
    opportunities.push(`Update ${tracking} with status, source, owner, and unresolved handoff notes.`);
  }
  opportunities.push("Track recovered opportunities, overdue handoffs, and remaining manual exceptions during the 30-day pilot.");
  return Array.from(new Set(opportunities));
}

function buildPriorityRanking(input, tags, answers, unknowns) {
  const items = [];
  if (tags.includes("no_clear_owner") || !clean(answers.owner)) {
    items.push(priority("P1", "Owner assignment", "Define the first accountable owner and automate assignment at intake.", "high"));
  }
  if (tags.includes("slow_response") || tags.includes("follow_up_depends_on_memory") || !clean(answers.follow_up)) {
    items.push(priority("P1", "Follow-up timing", "Set a response SLA, reminder, and escalation path for stalled requests.", "high"));
  }
  if (tags.includes("status_not_updated") || unknowns.some((item) => /CRM|status/i.test(item))) {
    items.push(priority("P2", "Status visibility", "Write status and next action to the system of record.", "medium"));
  }
  if (!clean(answers.customer_confirmation)) {
    items.push(priority("P2", "Customer confirmation", "Send a confirmation so the customer knows the request was captured.", "medium"));
  }
  if (items.length === 0) {
    items.push(priority("P3", "Pilot measurement", "Baseline response time, follow-up completion, and unresolved handoffs.", "low"));
  }
  return items;
}

function buildNextActions(input, tags, answers) {
  const actions = [];
  actions.push(`Assign a named owner for ${clean(input.process_name) || "this workflow"} at the moment the request arrives.`);
  if (tags.includes("slow_response") || tags.includes("follow_up_depends_on_memory") || clean(answers.follow_up)) {
    actions.push("Set the first response SLA and create an escalation rule for anything still untouched after the SLA.");
  }
  actions.push(`Confirm the source of truth for status updates: ${clean(input.software_used) || clean(answers.status_tracking) || "CRM, inbox, spreadsheet, or admin system"}.`);
  if (!clean(answers.customer_confirmation)) {
    actions.push("Decide what customer confirmation should be sent automatically after intake.");
  }
  actions.push("Use the 30-day pilot to measure response speed, completed follow-ups, recovered opportunities, and unresolved handoffs.");
  return Array.from(new Set(actions)).slice(0, 6);
}

function buildRecommendation(input, config, tags) {
  return {
    name: config.recommendation,
    bestFirstJob: `Best first job: ${config.bestJob}`,
    whatItWouldDo: [
      `Capture ${config.name.toLowerCase()} requests from calls, forms, email, text, or admin entries`,
      "Identify the customer, issue, urgency, owner, and next step",
      "Send internal summaries to the right person",
      "Trigger reminders when no action has happened",
      "Update the dashboard or CRM with status",
    ],
    whatItWouldNotReplace: config.noReplace,
    pilotMeasurements: config.measurements,
    basedOn: tags.length
      ? `Recommendation is based on the selected workflow and reported gaps: ${tags.map(getGapLabel).join(", ")}.`
      : "Recommendation is based on the selected workflow type and missing-context analysis.",
  };
}

function node(id, type, label, description, source, status, severity, recommendation) {
  return {
    id,
    type,
    label,
    description,
    source,
    status,
    ...(severity ? { severity } : {}),
    evidence: [description].filter(Boolean),
    ...(recommendation ? { recommendation } : {}),
  };
}

function edge(from, to, label) {
  return { from, to, ...(label ? { label } : {}) };
}

function risk(title, impact, severity) {
  return { title, impact, severity };
}

function priority(priority, title, action, severity) {
  return { priority, title, action, severity };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function humanize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/^\w/, (match) => match.toUpperCase());
}
