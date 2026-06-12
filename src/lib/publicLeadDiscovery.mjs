import { createHash } from "node:crypto";

import {
  classifyBuyingStage,
  classifyLeadReadiness,
  detectPainIntentSignals,
  matchOttoServOffer,
  runLeadSupplyDailyLoop,
} from "./leadSupplyDailyLoop.mjs";

export const PUBLIC_LEAD_DISCOVERY_VERSION = "phase7e_public_lead_discovery_v1";

const SOURCE_REGISTRY = [
  ["google_business_profile_candidates", "Google Business Profile / local business search candidates queued from approved search or manual export."],
  ["business_website_candidates", "Business websites and contact pages found from public evidence."],
  ["local_directory_candidates", "Local directories and trade service directories."],
  ["chamber_member_directory_candidates", "Chamber/member directories."],
  ["trade_association_directory_candidates", "Trade association directories."],
  ["public_review_signal_candidates", "Public review snippets and rating signals."],
  ["public_hiring_signal_candidates", "Public hiring signals for receptionist, dispatcher, admin, coordinator, or office roles."],
  ["public_social_forum_intent_candidates", "Public social/forum posts that express operational intent or pain."],
  ["cowork_manual_research_candidates", "Cowork/manual research packets and returned candidates."],
];

const ICP_PATTERNS = [
  ["plumbers", /plumb/i],
  ["hvac_companies", /\bhvac\b|air conditioning|heating|cooling/i],
  ["electricians", /electric/i],
  ["roofers", /roof/i],
  ["remodelers", /remodel|renovation|contractor/i],
  ["property_managers", /property\s*manag|community association|hoa|apartment/i],
];

const TARGET_CITIES = new Set(["orlando", "tampa", "jacksonville", "miami", "cocoa", "melbourne", "brevard"]);
const ACTIVE_INTENT_RE = /ai receptionist|phone answering|answering service|crm|scheduling automation|automation help|need.*automation|looking for.*automation/i;

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePhone(value) {
  return clean(value).replace(/[^\d+]/g, "");
}

function normalizeEmail(value) {
  return lower(value);
}

function normalizeDomain(value) {
  const raw = lower(value).replace(/^https?:\/\//, "").replace(/^www\./, "");
  return raw.split("/")[0].replace(/:\d+$/, "");
}

function companyKey(value) {
  return lower(value).replace(/\b(llc|inc|co|company|corp|corporation|the)\b/g, "").replace(/[^a-z0-9]+/g, "");
}

function slug(value, fallback = "lead") {
  return lower(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
}

function hash8(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 8);
}

function has(value) {
  return Boolean(clean(value));
}

function domainAlias(value) {
  const domain = normalizeDomain(value);
  return domain ? `domain:${domain}` : "";
}

function emailAlias(value) {
  const email = normalizeEmail(value);
  return email ? `email:${email}` : "";
}

function phoneAlias(value) {
  const phone = normalizePhone(value);
  return phone ? `phone:${phone}` : "";
}

function companyAlias(value) {
  const company = companyKey(value);
  return company ? `company:${company}` : "";
}

function sourceEvidence(record = {}) {
  return clean(record.source_url || record.listing_url || record.profile_url || record.evidence_url || record.source_note);
}

function evidenceText(record = {}) {
  return [
    record.public_signal,
    record.evidence_snippet,
    record.review_snippet,
    record.hiring_snippet,
    record.intent_signal,
    record.notes,
    record.source_note,
  ].map(clean).filter(Boolean).join(" ");
}

function classifyIcp(record = {}) {
  const haystack = [record.niche, record.industry, record.category, record.company_name, record.company].map(clean).join(" ");
  const match = ICP_PATTERNS.find(([, re]) => re.test(haystack));
  return { fit: match ? "qualified_fit" : "outside_initial_icp", segment: match?.[0] || "" };
}

function classifyGeography(record = {}) {
  const city = lower(record.city || record.locality || record.market);
  const state = clean(record.state || record.region).toUpperCase();
  const location = lower(record.location);
  const inFlorida = state === "FL" || /\bflorida\b|\bfl\b/.test(location);
  const cityMatch = TARGET_CITIES.has(city) || [...TARGET_CITIES].some((target) => location.includes(target));
  return {
    targeted: inFlorida && (cityMatch || !city),
    state: state || (inFlorida ? "FL" : ""),
    city: clean(record.city || record.locality || record.market),
    market: cityMatch ? city : inFlorida ? "florida" : "outside_initial_geography",
  };
}

function contactability(record = {}) {
  const email = normalizeEmail(record.email || record.contact_email);
  const phone = normalizePhone(record.phone || record.normalized_phone || record.telephone);
  if (email && phone) return "email_and_phone_public";
  if (email) return "email_public";
  if (phone) return "phone_public";
  if (has(record.website || record.domain || record.url)) return "website_only";
  return "no_contact_path";
}

function publicLeadId(record = {}) {
  return clean(record.lead_id || record.id) || `phase7e-${slug(record.company_name || record.company)}-${hash8([
    record.website || record.domain || record.url,
    record.email,
    record.phone,
    record.source_url,
  ].join("|"))}`;
}

function toLeadRecord(record = {}, sourceType, now) {
  const geo = classifyGeography(record);
  const text = evidenceText(record);
  const evidence = sourceEvidence(record);
  const website = clean(record.website || record.domain || record.url);
  return {
    lead_id: publicLeadId(record),
    company_name: clean(record.company_name || record.company || record.business_name || record.name),
    contact_name: clean(record.contact_name || record.owner || record.contact),
    website,
    email: normalizeEmail(record.email || record.contact_email),
    normalized_phone: normalizePhone(record.normalized_phone || record.phone || record.telephone),
    phone_verified: Boolean(record.phone || record.normalized_phone || record.telephone),
    city: geo.city,
    state: geo.state,
    industry: clean(record.industry || record.category || record.niche),
    niche: clean(record.niche || record.industry || record.category),
    source_type: sourceType,
    source_evidence: evidence || clean(record.source_note),
    pain_notes: text,
    score: Number(record.score || 0),
    tier: clean(record.tier) || "B-tier",
    eligibility: clean(record.eligibility) || "email_eligible",
    record_status: clean(record.record_status || record.status) || "accepted",
    pipeline_stage: ACTIVE_INTENT_RE.test(text) ? "active_intent" : clean(record.pipeline_stage || record.stage) || "contact_ready",
    version: Number(record.version || 1),
    created_at: clean(record.created_at) || now,
    updated_at: clean(record.updated_at) || now,
    public_discovery: {
      source_type: sourceType,
      source_url: evidence,
      source_note: clean(record.source_note),
      contactability: contactability(record),
    },
  };
}

function identity(lead = {}) {
  return {
    company: companyKey(lead.company_name),
    domain: normalizeDomain(lead.website),
    email: normalizeEmail(lead.email),
    phone: normalizePhone(lead.normalized_phone),
  };
}

function block(id, reason, detail = {}) {
  return { lead_id: clean(id), reason, ...detail };
}

function recentContactSet(rows = []) {
  const out = new Set();
  for (const row of asArray(rows)) {
    for (const value of [emailAlias(row.email), phoneAlias(row.phone || row.normalized_phone), domainAlias(row.website)]) {
      if (value) out.add(value);
    }
  }
  return out;
}

function doNotContactSet(values = []) {
  const out = new Set();
  for (const value of asArray(values)) {
    const raw = lower(value);
    if (!raw) continue;
    out.add(raw);
    if (raw.includes("@")) out.add(`email:${raw}`);
    else if (/\d/.test(raw)) out.add(`phone:${normalizePhone(raw)}`);
    else out.add(`domain:${normalizeDomain(raw)}`);
  }
  return out;
}

function hasDnc(lead, dnc) {
  const aliases = [lead.email, normalizeDomain(lead.website), lead.normalized_phone, companyKey(lead.company_name)]
    .map(lower)
    .filter(Boolean);
  const structured = [emailAlias(lead.email), domainAlias(lead.website), phoneAlias(lead.normalized_phone), companyAlias(lead.company_name)].filter(Boolean);
  return [...aliases, ...structured].some((key) => dnc.has(key));
}

function evidencePresent(lead = {}) {
  return Boolean(clean(lead.source_evidence) || clean(lead.pain_notes));
}

export function getPublicLeadDiscoverySourceRegistry() {
  return {
    version: PUBLIC_LEAD_DISCOVERY_VERSION,
    mode: "controlled_source_adapters_no_scraping",
    sources: SOURCE_REGISTRY.map(([source_type, description]) => ({
      source_type,
      description,
      execution_mode: /cowork|website/.test(source_type) ? "queued_or_manual_research" : "provided_records_only",
      no_direct_outreach: true,
    })),
    target_icps: ICP_PATTERNS.map(([segment]) => segment),
    target_geography: {
      state: "FL",
      cities: ["Orlando", "Tampa", "Jacksonville", "Miami", "Cocoa", "Melbourne", "Brevard"],
    },
  };
}

export function classifyPublicLeadReadiness(record = {}) {
  const lead = record.lead_id ? record : toLeadRecord(record, clean(record.source_type) || "public_business_discovery_queue", new Date().toISOString());
  const base = classifyLeadReadiness(lead);
  const text = clean(lead.pain_notes || record.public_signal || record.evidence_snippet);
  if (!evidencePresent(lead)) return { ...base, readiness_state: "manual_review", reason: "missing_public_evidence" };
  if (!has(lead.email) && !has(lead.normalized_phone)) return { ...base, readiness_state: "needs_enrichment", reason: "missing_public_contact_path" };
  if (ACTIVE_INTENT_RE.test(text)) return { ...base, readiness_state: "active_intent", reason: "active_public_intent_signal" };
  return { ...base, readiness_state: base.readiness === "contact_ready" ? "contact_ready" : base.readiness };
}

function confidenceScore({ icp, geo, readiness, signals, lead }) {
  let score = 20;
  if (icp.fit === "qualified_fit") score += 25;
  if (geo.targeted) score += 20;
  if (asArray(signals.signals).length) score += 15;
  if (readiness.readiness_state === "active_intent") score += 15;
  if (["email_and_phone_public", "email_public", "phone_public"].includes(contactability(lead))) score += 10;
  if (evidencePresent(lead)) score += 10;
  return Math.min(100, score);
}

function enrichCandidate(lead) {
  const readiness = classifyPublicLeadReadiness(lead);
  const buying = classifyBuyingStage(lead);
  const signals = detectPainIntentSignals(lead);
  const offer = matchOttoServOffer(lead);
  const icp = classifyIcp(lead);
  const geo = classifyGeography(lead);
  const confidence = confidenceScore({ icp, geo, readiness, signals, lead });
  return {
    ...lead,
    source_type: clean(lead.source_type),
    contactability: contactability(lead),
    icp_fit: icp.fit,
    icp_segment: icp.segment,
    targeted_geography: geo.targeted,
    pain_intent_signals: signals.signals,
    buying_stage: buying.stage,
    readiness_state: readiness.readiness_state,
    matched_offer: offer,
    confidence_score: confidence,
    recommended_next_action: readiness.readiness_state === "needs_enrichment"
      ? "Cowork_browser_research_packet"
      : readiness.readiness_state === "manual_review" ? "manual_review" : "phase7_queue_handoff",
  };
}

function coworkPacket(candidate, now) {
  return {
    packet_id: `phase7e-cowork-${slug(candidate.lead_id)}`,
    packet_type: "public_lead_research",
    assigned_agent: "Cowork",
    lead_id: candidate.lead_id,
    company: candidate.company_name,
    objective: "Verify public source evidence, contact path, ICP fit, and pain/intent signals. Do not contact the company.",
    forbidden_actions: ["No outreach", "No login-only scraping", "No posting/commenting/DMs", "No production browser actions"],
    inputs: {
      website: candidate.website,
      company_name: candidate.company_name,
      source_evidence: candidate.source_evidence,
      city: candidate.city,
      state: candidate.state,
    },
    required_evidence: ["Public source URL or source note", "Verified contact path or unavailable reason", "Pain/intent signal evidence"],
    created_at: now,
  };
}

export function runPublicLeadDiscovery(input = {}) {
  const now = input.now || new Date().toISOString();
  const sourceTypes = new Set(SOURCE_REGISTRY.map(([key]) => key));
  const dnc = doNotContactSet(input.doNotContact || input.dnc);
  const recent = recentContactSet(input.recentContactHistory);
  const existingAliases = new Set(asArray(input.existingAliases).map(lower));
  const seen = { company: new Map(), domain: new Map(), email: new Map(), phone: new Map() };
  const blocked = [];
  const accepted = [];
  let recordsSeen = 0;

  for (const source of asArray(input.sources)) {
    const sourceType = clean(source.source_type);
    if (!sourceTypes.has(sourceType)) continue;
    for (const record of asArray(source.records)) {
      recordsSeen += 1;
      const lead = toLeadRecord(record, sourceType, now);
      const id = clean(lead.lead_id);
      const icp = classifyIcp(lead);
      const geo = classifyGeography(lead);
      if (icp.fit !== "qualified_fit" || !geo.targeted) {
        blocked.push(block(id, "outside_initial_icp_or_geography", { company_name: lead.company_name, source_type: sourceType }));
        continue;
      }
      if (hasDnc(lead, dnc) || lower(lead.record_status) === "do_not_contact") {
        blocked.push(block(id, "do_not_contact", { company_name: lead.company_name }));
        continue;
      }
      const aliases = [companyAlias(lead.company_name), domainAlias(lead.website), emailAlias(lead.email), phoneAlias(lead.normalized_phone)].filter(Boolean);
      if (aliases.some((alias) => existingAliases.has(alias))) {
        blocked.push(block(id, "existing_alias_match", { company_name: lead.company_name }));
        continue;
      }
      if (aliases.some((alias) => recent.has(alias))) {
        blocked.push(block(id, "recent_contact_history", { company_name: lead.company_name }));
        continue;
      }
      const key = identity(lead);
      const duplicate =
        (key.domain && seen.domain.get(key.domain) && ["duplicate_domain", seen.domain.get(key.domain)])
        || (key.email && seen.email.get(key.email) && ["duplicate_email", seen.email.get(key.email)])
        || (key.phone && seen.phone.get(key.phone) && ["duplicate_phone", seen.phone.get(key.phone)])
        || (key.company && seen.company.get(key.company) && ["duplicate_company", seen.company.get(key.company)]);
      if (duplicate) {
        blocked.push(block(id, duplicate[0], { canonical_lead_id: duplicate[1], company_name: lead.company_name }));
        continue;
      }
      accepted.push(enrichCandidate(lead));
      if (key.company) seen.company.set(key.company, id);
      if (key.domain) seen.domain.set(key.domain, id);
      if (key.email) seen.email.set(key.email, id);
      if (key.phone) seen.phone.set(key.phone, id);
    }
  }

  const coworkPackets = accepted
    .filter((candidate) => ["needs_enrichment", "manual_review"].includes(candidate.readiness_state))
    .map((candidate) => coworkPacket(candidate, now));
  const leadSupplyReport = runLeadSupplyDailyLoop({
    sources: [{ source_type: "public_business_discovery_queue", records: accepted }],
    now,
    approvals: input.leadSupplyOptions || { approvalPresent: true, approvedSenders: ["ottoserv.com"] },
    doNotContact: input.doNotContact || input.dnc,
  });
  const signalCounts = {};
  for (const signal of accepted.flatMap((candidate) => candidate.pain_intent_signals)) {
    signalCounts[signal] = (signalCounts[signal] || 0) + 1;
  }

  return {
    version: PUBLIC_LEAD_DISCOVERY_VERSION,
    generated_at: now,
    registry: getPublicLeadDiscoverySourceRegistry(),
    summary: {
      discovered_count: recordsSeen,
      accepted_count: accepted.length,
      qualified_count: accepted.filter((candidate) => candidate.icp_fit === "qualified_fit").length,
      needs_enrichment_count: accepted.filter((candidate) => candidate.readiness_state === "needs_enrichment").length,
      duplicate_blocked_count: blocked.filter((record) => /^duplicate_|existing_alias/.test(record.reason)).length,
      dnc_blocked_count: blocked.filter((record) => record.reason === "do_not_contact").length,
      blocked_count: blocked.length,
      pain_intent_signals_found: accepted.reduce((sum, candidate) => sum + candidate.pain_intent_signals.length, 0),
      cowork_packets_created: coworkPackets.length,
    },
    candidates: accepted,
    blocked_records: blocked,
    pain_intent_signal_distribution: signalCounts,
    top_recommended_prospects: [...accepted].sort((a, b) => b.confidence_score - a.confidence_score).slice(0, 10),
    cowork_packets: coworkPackets,
    leadSupplySources: [{ source_type: "public_business_discovery_queue", records: accepted }],
    leadSupplyReport,
    next_operator_action: coworkPackets.length
      ? "dispatch_public_lead_cowork_research_packets"
      : accepted.length ? "review_public_leads_in_durable_revenue_queue" : "add_controlled_public_discovery_sources",
    safety: {
      no_live_email_sent: true,
      no_live_call_placed: true,
      no_dm_or_social_post: true,
      no_retell_production_activation: true,
      no_stripe_or_n8n_triggered: true,
      no_aggressive_scraping: true,
    },
  };
}
