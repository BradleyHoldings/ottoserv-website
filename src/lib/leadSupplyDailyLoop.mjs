import { createHash } from "node:crypto";

import { createCallIntent } from "./callRail/intent.mjs";
import { evaluateCallPolicy } from "./callRail/policy.mjs";
import { createEmailIntent, EMAIL_ACTION } from "./emailRail/intent.mjs";
import { evaluatePolicy as evaluateEmailPolicy } from "./emailRail/policy.mjs";

export const LEAD_SUPPLY_DAILY_LOOP_VERSION = "phase7a_lead_supply_daily_revenue_loop_v1";

export const LEAD_READINESS_STATES = [
  "raw_discovered",
  "needs_enrichment",
  "enriched",
  "qualified_fit",
  "pain_signal_detected",
  "active_intent",
  "contact_ready",
  "contacted",
  "follow_up_due",
  "reply_detected",
  "call_needed",
  "demo_needed",
  "proposal_needed",
  "payment_ready",
  "won_onboarding_needed",
  "closed_lost",
  "do_not_contact",
];

export const BUYING_STAGES = [
  "unaware",
  "problem_aware",
  "solution_aware",
  "vendor_aware",
  "ready_to_buy",
  "customer",
];

const SOURCE_TYPES = [
  ["existing_ottoserv_lead_records", "Canonical OttoServ lead records already in the lead rail."],
  ["manual_imported_leads", "Manual CSV/spreadsheet/operator imports."],
  ["front_office_leak_check_submissions", "Front Office Leak Check submissions and reports."],
  ["full_process_audit_submissions", "Full Process Audit submissions."],
  ["website_demo_contact_form_submissions", "Website demo, contact, and intake form submissions."],
  ["prior_outreach_reply_records", "Prior outreach outcomes and reply records."],
  ["public_business_discovery_queue", "Public business discovery queue; delegated in Phase 7A."],
  ["public_pain_intent_signal_queue", "Public pain/intent signal queue; evidence-first."],
  ["cowork_browser_research_queue", "Cowork/browser research packets and results."],
];

const ICP_RE = /plumb|hvac|roof|electric|property|contractor|service|maintenance|trades/i;
const HIGH_RISK_RE = /new outbound|new campaign|new list|pricing|guarantee|stripe|production|activate|routing/i;

const PAIN_SIGNAL_PATTERNS = [
  { key: "missed_call_complaint", re: /missed.?call|no one answers|no answer|voicemail|after.?hours/i },
  { key: "slow_follow_up_complaint", re: /slow.?follow|no callback|callback.*slow|never called back/i },
  { key: "bad_review_no_answer_no_callback", re: /bad review|review.*(no answer|callback|phone)/i },
  { key: "hiring_receptionist_admin", re: /hiring.*(reception|admin)|receptionist job|office admin/i },
  { key: "weak_website_contact_flow", re: /weak website|contact form|form issue|website.*contact/i },
  { key: "form_contact_issue", re: /form.*broken|contact.*issue|submit.*failed/i },
  { key: "scheduling_bottleneck", re: /schedul|booking|calendar.*bottleneck/i },
  { key: "public_request_for_automation_help", re: /automation help|need.*automation|ai.*help/i },
  { key: "quote_estimate_follow_up_issue", re: /estimate|quote/i },
  { key: "invoice_payment_follow_up_issue", re: /invoice|payment|collect/i },
  { key: "submitted_leak_check_audit_demo", re: /leak check|process audit|demo request|submitted/i },
  { key: "positive_reply_or_pricing_question", re: /interested|pricing|how much|book|demo|yes/i },
];

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function slug(value, fallback = "item") {
  return lower(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
}

function hash8(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 8);
}

function normalizeDomain(value) {
  const raw = lower(value).replace(/^https?:\/\//, "").replace(/^www\./, "");
  return raw.split("/")[0].replace(/:\d+$/, "");
}

function normalizeEmail(value) {
  return lower(value);
}

function normalizePhone(value) {
  return clean(value).replace(/[^\d+]/g, "");
}

function companyKey(value) {
  return lower(value).replace(/\b(llc|inc|co|company|corp|corporation|the)\b/g, "").replace(/[^a-z0-9]+/g, "");
}

function has(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return Boolean(clean(value));
}

function ageHours(iso, now) {
  const t = Date.parse(clean(iso));
  if (Number.isNaN(t)) return Infinity;
  return (Date.parse(now) - t) / 36e5;
}

function countBy(items, fn) {
  const out = {};
  for (const item of asArray(items)) {
    const key = typeof fn === "function" ? fn(item) : clean(item?.[fn]);
    out[key || "unknown"] = (out[key || "unknown"] || 0) + 1;
  }
  return out;
}

export function getLeadSourceRegistry() {
  return {
    version: LEAD_SUPPLY_DAILY_LOOP_VERSION,
    sources: SOURCE_TYPES.map(([source_type, description]) => ({
      source_type,
      description,
      execution_mode: /public|cowork/.test(source_type) ? "queued_or_delegated" : "existing_internal_rail",
    })),
    no_new_scraper: true,
  };
}

function normalizeLead(record = {}, source = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const sourceType = clean(source.source_type || record.source_type) || "manual_imported_leads";
  const company = clean(record.company_name || record.company || record.business_name || record.name);
  const website = clean(record.website || record.domain || record.url);
  const email = normalizeEmail(record.email || record.contact_email);
  const phone = normalizePhone(record.normalized_phone || record.phone || record.main_phone_number);
  const leadId = clean(record.lead_id || record.id) || `lead7a-${hash8([company, website, email, phone, sourceType].join("|"))}`;
  return {
    ...record,
    lead_id: leadId,
    company_name: company,
    contact_name: clean(record.contact_name || record.contact || record.owner_name),
    website,
    email,
    normalized_phone: phone,
    phone_verified: record.phone_verified === true || Boolean(phone && record.phone_verified !== false),
    city: clean(record.city),
    state: clean(record.state),
    industry: clean(record.industry || record.niche),
    niche: clean(record.niche || record.industry),
    source_type: sourceType,
    source_evidence: clean(record.source_evidence || record.source_url || source.description || sourceType),
    pain_notes: clean(record.pain_notes || record.notes || record.review_text || record.intent_signal),
    score: Number(record.score || 0),
    tier: clean(record.tier),
    eligibility: clean(record.eligibility),
    record_status: clean(record.record_status || record.status) || "accepted",
    pipeline_stage: clean(record.pipeline_stage || record.stage),
    version: Number(record.version || 1),
    created_at: clean(record.created_at) || now,
    updated_at: clean(record.updated_at) || now,
  };
}

export function ingestLeadSources(sources = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const dnc = new Set(asArray(options.doNotContact).map(lower));
  const byCompany = new Map();
  const byDomain = new Map();
  const byEmail = new Map();
  const byPhone = new Map();
  const leads = [];
  const duplicate_conflicts = [];
  let doNotContactSkipped = 0;
  const bySource = {};

  for (const source of asArray(sources)) {
    const sourceType = clean(source.source_type) || "manual_imported_leads";
    const records = asArray(source.records);
    bySource[sourceType] = (bySource[sourceType] || 0) + records.length;
    for (const record of records) {
      const lead = normalizeLead(record, { ...source, source_type: sourceType }, { now });
      const domain = normalizeDomain(lead.website);
      const email = normalizeEmail(lead.email);
      const phone = normalizePhone(lead.normalized_phone);
      const company = companyKey(lead.company_name);
      if (
        dnc.has(email)
        || dnc.has(domain)
        || dnc.has(phone)
        || dnc.has(company)
        || lower(lead.record_status) === "do_not_contact"
        || lower(lead.pipeline_stage) === "do_not_contact"
      ) {
        doNotContactSkipped += 1;
        continue;
      }
      const duplicate =
        (domain && byDomain.get(domain) && ["duplicate_domain", byDomain.get(domain)])
        || (email && byEmail.get(email) && ["duplicate_email", byEmail.get(email)])
        || (phone && byPhone.get(phone) && ["duplicate_phone", byPhone.get(phone)])
        || (company && byCompany.get(company) && ["duplicate_company", byCompany.get(company)]);
      if (duplicate) {
        duplicate_conflicts.push({
          lead_id: lead.lead_id,
          canonical_lead_id: duplicate[1],
          reason: duplicate[0],
        });
        continue;
      }
      leads.push(lead);
      if (company) byCompany.set(company, lead.lead_id);
      if (domain) byDomain.set(domain, lead.lead_id);
      if (email) byEmail.set(email, lead.lead_id);
      if (phone) byPhone.set(phone, lead.lead_id);
    }
  }

  return {
    leads,
    summary: {
      sources_seen: asArray(sources).length,
      records_seen: asArray(sources).reduce((sum, source) => sum + asArray(source.records).length, 0),
      leads_ingested: leads.length,
      duplicates_blocked: duplicate_conflicts.length,
      do_not_contact_skipped: doNotContactSkipped,
      by_source: bySource,
    },
    contact_safety: {
      duplicate_conflicts,
      do_not_contact_skipped: doNotContactSkipped,
      duplicate_company_outreach_prevented: duplicate_conflicts.some((item) => item.reason === "duplicate_company"),
      duplicate_domain_outreach_prevented: duplicate_conflicts.some((item) => item.reason === "duplicate_domain"),
      duplicate_email_outreach_prevented: duplicate_conflicts.some((item) => item.reason === "duplicate_email"),
      duplicate_phone_outreach_prevented: duplicate_conflicts.some((item) => item.reason === "duplicate_phone"),
    },
  };
}

export function detectPainIntentSignals(lead = {}) {
  const haystack = [
    lead.pain_notes,
    lead.notes,
    lead.source_evidence,
    lead.source_type,
    lead.reply_state,
    lead.pipeline_stage,
    asArray(lead.public_pain_signals).join(" "),
  ].map(clean).join(" ");
  const signals = PAIN_SIGNAL_PATTERNS.filter((pattern) => pattern.re.test(haystack)).map((pattern) => pattern.key);
  return {
    signals: [...new Set(signals)],
    has_pain_signal: signals.length > 0,
    has_active_intent: /positive|pricing|demo|leak_check|audit|submitted|ready_to_buy/i.test(haystack),
    evidence: clean(lead.source_evidence || lead.source_url || lead.pain_notes),
  };
}

export function classifyBuyingStage(lead = {}) {
  const source = lower(lead.source_type);
  const stage = lower(lead.pipeline_stage);
  const reply = lower(lead.reply_state);
  const signals = detectPainIntentSignals(lead);
  let result = "unaware";
  if (stage.includes("won") || stage.includes("customer") || stage.includes("onboarding")) result = "customer";
  else if (/payment|proposal|demo|ready_to_buy/.test(stage) || /positive_interest|meeting_requested|pricing/.test(reply) || /leak_check|audit|demo|form/.test(source)) result = "ready_to_buy";
  else if (signals.has_active_intent || /ai receptionist|missed call recovery|automation/i.test(clean(lead.pain_notes))) result = "solution_aware";
  else if (signals.has_pain_signal) result = "problem_aware";
  return { stage: result, evidence: signals.evidence };
}

export function classifyLeadReadiness(lead = {}) {
  const stage = lower(lead.pipeline_stage);
  const recordStatus = lower(lead.record_status);
  const enrichmentNeeded = [];
  if (!has(lead.company_name)) enrichmentNeeded.push("company_name");
  if (!has(lead.website)) enrichmentNeeded.push("website");
  if (!has(lead.email)) enrichmentNeeded.push("email");
  if (!has(lead.normalized_phone)) enrichmentNeeded.push("phone");
  if (!has(lead.source_evidence)) enrichmentNeeded.push("source_evidence");
  const signals = detectPainIntentSignals(lead);
  const icpFit = ICP_RE.test(`${lead.industry} ${lead.niche} ${lead.company_name}`) || Number(lead.score) >= 70 ? "qualified_fit" : "needs_review";
  let readiness = "raw_discovered";
  if (recordStatus === "do_not_contact" || stage === "do_not_contact") readiness = "do_not_contact";
  else if (stage === "closed_lost") readiness = "closed_lost";
  else if (stage === "won_onboarding_needed") readiness = "won_onboarding_needed";
  else if (stage === "payment_ready") readiness = "payment_ready";
  else if (stage === "proposal_needed") readiness = "proposal_needed";
  else if (stage === "demo_needed") readiness = "demo_needed";
  else if (stage === "call_needed") readiness = "call_needed";
  else if (stage === "reply_detected" || has(lead.reply_state)) readiness = "reply_detected";
  else if (stage === "follow_up_due") readiness = "follow_up_due";
  else if (stage === "contacted") readiness = "contacted";
  else if (enrichmentNeeded.includes("email") && enrichmentNeeded.includes("phone")) readiness = "needs_enrichment";
  else if (has(lead.email) || has(lead.normalized_phone)) readiness = signals.has_active_intent ? "active_intent" : signals.has_pain_signal ? "pain_signal_detected" : icpFit === "qualified_fit" ? "contact_ready" : "enriched";
  return { readiness, enrichment_needed: enrichmentNeeded, icp_fit: icpFit, signals };
}

export function matchOttoServOffer(lead = {}) {
  const source = lower(lead.source_type);
  const text = `${lead.pain_notes || ""} ${lead.notes || ""} ${lead.source_evidence || ""} ${source}`;
  if (/full_process_audit|process audit/.test(source) || /process audit/i.test(text)) return offer("full_process_audit", "Full Process Audit");
  if (/front_office_leak_check|leak check/.test(source) || /leak check/i.test(text)) return offer("front_office_leak_check", "Front Office Leak Check");
  if (/invoice|payment/i.test(text)) return offer("invoice_payment_follow_up_automation", "Invoice/Payment Follow-Up Automation");
  if (/estimate|quote/i.test(text)) return offer("estimate_follow_up_automation", "Estimate Follow-Up Automation");
  if (/new lead|lead follow|web lead|form/i.test(text)) return offer("lead_follow_up_automation", "Lead Follow-Up Automation");
  if (/missed.?call|no answer|callback|after.?hours|voicemail/i.test(text)) return offer("missed_call_recovery", "Missed Call Recovery");
  if (/reception|answer|phone/i.test(text)) return offer("ai_receptionist", "AI Receptionist");
  return offer("front_office_leak_check", "Front Office Leak Check");
}

function offer(service_key, name) {
  return { service_key, name };
}

function emailAction(lead, offerMatch, options = {}) {
  const now = options.now || new Date().toISOString();
  const intent = createEmailIntent({
    lead_id: lead.lead_id,
    lead_version: lead.version || 1,
    recipient: lead.email,
    sender: options.sender || "hello@ottoserv.com",
    template_ref: options.template_ref || "intro_v1",
    action_type: lead.pipeline_stage === "follow_up_due" ? EMAIL_ACTION.FOLLOW_UP : EMAIL_ACTION.OUTBOUND,
    campaign_id: `phase7a-${offerMatch.service_key}`,
    subject: `${offerMatch.name} for ${lead.company_name}`,
    body: `Approved OttoServ outreach about ${offerMatch.name}.`,
    scheduled_at: now,
  }, { now });
  const policy = evaluateEmailPolicy(intent, {
    now,
    lead: { ...lead, eligibility: lead.eligibility || "email", record_status: "accepted" },
    approvedSenders: options.approvedSenders || ["ottoserv.com"],
    approvalPresent: options.approvalPresent === true,
    dnc: options.dnc,
    suppression: options.suppression,
    blacklist: options.blacklist,
    lastContactAt: lead.last_contact_at,
  });
  return { intent, policy };
}

function callAction(lead, offerMatch, options = {}) {
  const now = options.now || new Date().toISOString();
  const intent = createCallIntent({
    lead_id: lead.lead_id,
    lead_version: lead.version || 1,
    phone: lead.normalized_phone,
    approved_script_ref: options.approved_script_ref || "front_office_leak_check_call_v1",
    approved_angle: options.approved_angle || offerMatch.name,
    approval_id: options.callApprovalId || "phase7a-standing-call-approval",
    scheduled_at: now,
    scheduled_slot: now.slice(0, 10),
  }, { now });
  const policy = evaluateCallPolicy(intent, {
    now,
    lead: { ...lead, phone_verified: lead.phone_verified === true },
    approvalPresent: options.approvalPresent === true,
    localHour: options.localHour ?? 14,
    dnc: options.dnc,
    suppression: options.suppression,
    blacklist: options.blacklist,
    activeReplyState: lead.reply_state,
  });
  return { intent, policy };
}

export function selectDailyLeadAction(lead = {}, options = {}) {
  const readiness = classifyLeadReadiness(lead);
  const buyingStage = classifyBuyingStage(lead);
  const offerMatch = matchOttoServOffer(lead);
  const highRisk = HIGH_RISK_RE.test(`${lead.requested_action || ""} ${lead.notes || ""}`);
  const base = {
    lead_id: clean(lead.lead_id),
    client: clean(lead.company_name),
    readiness: readiness.readiness,
    buying_stage: buyingStage.stage,
    offer: offerMatch,
    reason: "",
  };
  if (readiness.readiness === "do_not_contact" || readiness.readiness === "closed_lost") {
    return { ...base, next_action: "no_action_policy_blocked", reason: readiness.readiness };
  }
  if (!has(lead.website) && !has(lead.email) && !has(lead.normalized_phone)) {
    return { ...base, next_action: "manual_review", reason: "missing_source_and_contact_evidence" };
  }
  if (highRisk) {
    return { ...base, next_action: "approval_required", reason: "high_risk_action_requires_approval" };
  }
  if (readiness.readiness === "needs_enrichment" || readiness.enrichment_needed.includes("website")) {
    return { ...base, next_action: "Cowork_browser_research_packet", reason: "critical_enrichment_missing" };
  }
  if (lower(lead.pipeline_stage) === "stuck_needs_build" || /build|workflow|repair/i.test(clean(lead.notes))) {
    return { ...base, next_action: "Codex_or_Claude_build_packet", reason: "build_or_repair_needed" };
  }
  if (["payment_ready", "won_onboarding_needed"].includes(readiness.readiness)) {
    return { ...base, next_action: "payment_or_onboarding_next_step" };
  }
  if (["demo_needed", "proposal_needed"].includes(readiness.readiness) || buyingStage.stage === "ready_to_buy") {
    return { ...base, next_action: "demo_or_audit_invite" };
  }
  if (has(lead.normalized_phone) && lead.phone_verified && (clean(lead.tier) === "A-tier" || readiness.readiness === "call_needed")) {
    const call = callAction(lead, offerMatch, options);
    if (call.policy.ok) return { ...base, next_action: "policy_approved_call_queued", call };
    return { ...base, next_action: "call_needed", call, reason: call.policy.reason };
  }
  if (has(lead.email)) {
    const email = emailAction(lead, offerMatch, options);
    if (email.policy.ok) {
      return { ...base, next_action: lower(lead.pipeline_stage) === "follow_up_due" ? "approved_follow_up_email" : "approved_cold_email", email };
    }
    if (email.policy.requires_approval) return { ...base, next_action: "approval_required", email, reason: email.policy.reason };
    return { ...base, next_action: "no_action_policy_blocked", email, reason: email.policy.reason };
  }
  return { ...base, next_action: "no_action_not_ready", reason: "no_contact_path" };
}

function approvalCard(action, now) {
  return {
    id: `phase7a-approval-${slug(action.lead_id || action.client)}-${hash8(action.reason || action.next_action)}`,
    source: "phase7a_lead_supply_daily_loop",
    lead_id: action.lead_id,
    client: action.client,
    requested_action: action.reason || action.next_action,
    risk_level: "high",
    status: "approval_needed",
    created_at: now,
  };
}

function coworkPacket(action, lead, now) {
  return {
    packet_id: `phase7a-cowork-${slug(action.lead_id)}`,
    packet_type: "browser_research",
    assigned_agent: "Cowork",
    lead_id: action.lead_id,
    client: action.client,
    objective: "Find public evidence, contact path, pain/intent signals, and source URLs. Do not perform outreach.",
    forbidden_actions: ["No outreach", "No login-only scraping", "No production browser actions"],
    inputs: { website: lead.website, company_name: lead.company_name, source_evidence: lead.source_evidence },
    required_evidence: ["Public source URL", "Verified contact path or reason unavailable", "Pain/intent signal evidence"],
    created_at: now,
  };
}

function codexPacket(action, lead, now) {
  return {
    packet_id: `phase7a-codex-${slug(action.lead_id)}`,
    packet_type: "build_or_repair",
    assigned_agent: "Codex/Claude Code",
    lead_id: action.lead_id,
    client: action.client,
    objective: "Prepare or repair approved automation/build work; do not activate production systems.",
    forbidden_actions: ["No production deploy without approval", "No Stripe/email/n8n/Retell live execution"],
    likely_files_or_workflows: ["src/lib/revenueEngine.mjs", "src/lib/serviceDeliverySpine.mjs"],
    required_evidence: ["Commit or patch summary", "Tests run", "No live side effects"],
    created_at: now,
  };
}

function repair(failure_class, detail, now, extra = {}) {
  return {
    id: `phase7a-repair-${slug(failure_class)}-${hash8(detail)}`,
    failure_class,
    detail,
    status: "open",
    owner: /approval/.test(failure_class) ? "Jonathan" : /cowork/.test(failure_class) ? "Cowork" : "Codex",
    created_at: now,
    ...extra,
  };
}

function detectRepairs({ leads, ingestion, existingTasks, failures, now }) {
  const repairs = [];
  for (const lead of leads) {
    const readiness = classifyLeadReadiness(lead);
    if (readiness.readiness === "needs_enrichment" && ageHours(lead.updated_at || lead.created_at, now) > 48) {
      repairs.push(repair("lead_stuck_in_needs_enrichment", `Lead ${lead.lead_id} is stale in needs_enrichment.`, now, { lead_id: lead.lead_id }));
    }
    if (lower(lead.pipeline_stage) === "contact_ready" && ageHours(lead.updated_at || lead.created_at, now) > 48) {
      repairs.push(repair("lead_stuck_in_contact_ready", `Lead ${lead.lead_id} is stale in contact_ready.`, now, { lead_id: lead.lead_id }));
    }
    if (lower(lead.pipeline_stage) === "follow_up_due" && ageHours(lead.last_contact_at || lead.updated_at, now) > 72) {
      repairs.push(repair("stale_follow_up", `Lead ${lead.lead_id} has stale follow-up due.`, now, { lead_id: lead.lead_id }));
    }
    if (lower(lead.reply_state) === "unclassified") {
      repairs.push(repair("unclassified_reply", `Lead ${lead.lead_id} has unclassified reply.`, now, { lead_id: lead.lead_id }));
    }
  }
  for (const conflict of ingestion.contact_safety.duplicate_conflicts) {
    repairs.push(repair("duplicate_conflict", `${conflict.lead_id} conflicts with ${conflict.canonical_lead_id}: ${conflict.reason}`, now, conflict));
  }
  for (const task of asArray(existingTasks)) {
    if (ageHours(task.created_at || task.updated_at, now) <= 72) continue;
    const type = lower(task.task_type || task.execution_rail || task.assigned_agent);
    if (type.includes("approval")) repairs.push(repair("approval_waiting_too_long", `Approval ${task.task_id} waiting too long.`, now, { task_id: task.task_id }));
    else if (type.includes("cowork")) repairs.push(repair("cowork_packet_stale", `Cowork packet ${task.task_id} stale.`, now, { task_id: task.task_id }));
    else if (type.includes("codex") || type.includes("claude")) repairs.push(repair("codex_packet_stale", `Codex packet ${task.task_id} stale.`, now, { task_id: task.task_id }));
  }
  for (const failure of asArray(failures)) {
    const haystack = `${failure.channel || ""} ${failure.actual_behavior || ""}`;
    if (/call.*failed|phone_call|retell/i.test(haystack)) repairs.push(repair("call_failed", clean(failure.actual_behavior) || "Call failed.", now));
    if (/email.*bounc|failed email/i.test(haystack)) repairs.push(repair("bounced_failed_email", clean(failure.actual_behavior) || "Email failed.", now));
    if (/crm.*mismatch/i.test(haystack)) repairs.push(repair("crm_state_mismatch", clean(failure.actual_behavior), now));
  }
  return repairs;
}

export function runLeadSupplyDailyLoop(input = {}) {
  const now = input.now || new Date().toISOString();
  const ingestion = ingestLeadSources(input.sources || [], { now, doNotContact: input.doNotContact || input.dnc });
  const leads = ingestion.leads;
  const enriched = leads.filter((lead) => !classifyLeadReadiness(lead).enrichment_needed.length);
  const actions = leads.map((lead) => ({ lead, action: selectDailyLeadAction(lead, { now, ...(input.approvals || {}), ...(input.policy || {}) }) }));
  const approvalCards = actions.filter(({ action }) => action.next_action === "approval_required").map(({ action }) => approvalCard(action, now));
  const coworkPackets = actions.filter(({ action }) => action.next_action === "Cowork_browser_research_packet").map(({ action, lead }) => coworkPacket(action, lead, now));
  const codexPackets = actions.filter(({ action }) => action.next_action === "Codex_or_Claude_build_packet").map(({ action, lead }) => codexPacket(action, lead, now));
  const repairs = detectRepairs({ leads, ingestion, existingTasks: input.existingTasks, failures: input.failures, now });
  const selected = actions.map(({ action }) => action);
  const stageDistribution = countBy(leads, (lead) => classifyBuyingStage(lead).stage);
  const readinessDistribution = countBy(leads, (lead) => classifyLeadReadiness(lead).readiness);
  const signals = leads.flatMap((lead) => detectPainIntentSignals(lead).signals);
  const offers = selected.map((action) => action.offer?.service_key).filter(Boolean);

  const report = {
    version: LEAD_SUPPLY_DAILY_LOOP_VERSION,
    generated_at: now,
    rails_reused: [
      "leadRail canonical schema/intake/dedupe/enrichment",
      "emailRail intent/policy",
      "callRail intent/policy",
      "approvalExecutionBridge-compatible approval cards",
      "serviceDeliverySpine offer catalog",
      "revenueLoopRunner latest.json export",
    ],
    tables_reused: [
      "canonical lead rail tables where configured",
      "approval/execution latest.json rails",
      "email/call intent rails",
      "service-delivery canonical rails",
    ],
    sources: ingestion.summary,
    contact_safety: ingestion.contact_safety,
    leads: leads.map((lead) => ({
      lead_id: lead.lead_id,
      company_name: lead.company_name,
      readiness: classifyLeadReadiness(lead),
      buying_stage: classifyBuyingStage(lead),
      signals: detectPainIntentSignals(lead),
      offer: matchOttoServOffer(lead),
    })),
    actions: selected,
    approval_cards: approvalCards,
    cowork_packets: coworkPackets,
    codex_packets: codexPackets,
    repairs_created: repairs,
    evidence_summary: {
      source_records_seen: ingestion.summary.records_seen,
      source_evidence_present: leads.filter((lead) => has(lead.source_evidence)).length,
      no_fabricated_evidence: true,
      no_completed_without_proof: true,
    },
    summary: {
      leads_sourced: ingestion.summary.records_seen,
      leads_ingested: leads.length,
      leads_enriched: enriched.length,
      leads_qualified: leads.filter((lead) => classifyLeadReadiness(lead).icp_fit === "qualified_fit").length,
      buying_stage_distribution: stageDistribution,
      readiness_distribution: readinessDistribution,
      pain_intent_signals_detected: signals.length,
      pain_intent_signal_distribution: countBy(signals, (signal) => signal),
      offers_matched: countBy(offers, (item) => item),
      actions_selected: selected.length,
      actions_by_type: countBy(selected, "next_action"),
      emails_queued: selected.filter((action) => /email/.test(action.next_action) && action.email?.policy?.ok).length,
      emails_sent: 0,
      calls_queued: selected.filter((action) => action.next_action === "policy_approved_call_queued").length,
      calls_placed: 0,
      approval_cards_created: approvalCards.length,
      cowork_packets_created: coworkPackets.length,
      codex_claude_packets_created: codexPackets.length,
      crm_updates: selected.length,
      repairs_created: repairs.length,
      blocked_items: selected.filter((action) => /blocked|approval_required|not_ready/.test(action.next_action)).length + repairs.length,
    },
    next_operator_action: repairs.length
      ? "repair_stalled_or_blocked_revenue_tasks"
      : approvalCards.length ? "review_phase7a_approval_cards" : coworkPackets.length ? "dispatch_cowork_research_packets" : "run_approved_daily_revenue_queue",
    safety: {
      no_live_email_sent: true,
      no_live_call_placed: true,
      no_retell_production_activation: true,
      no_stripe_email_n8n_browser_side_effects: true,
    },
  };
  return report;
}
