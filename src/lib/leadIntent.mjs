// ─── Lead intent / enrichment pipeline ────────────────────────────────────────
//
// THE GAP THIS FILLS
// The existing importer (src/lib/outreach/leadImport.ts) scores leads on
// location + ICP/pain *terms* only — "a business with a phone number". It has no
// concept of recent buying/operational *intent*, no evidence, and no recency
// window. The revenue loop therefore reports an empty/low-quality pipeline.
//
// This module adds the missing intent/enrichment layer as PURE, deterministic
// functions: a schema, intent-weighted scoring (recent intent weighted heavily),
// A/B/C/reject tiering, dedupe, and a pipeline builder that produces the daily
// queues. It outputs leads in a shape that is a SUPERSET of the existing
// NormalizedLead, so they drop straight into the revenue loop's input path
// (data/call-imports/leads.json) with no engine change — and carry the rich
// enrichment fields for Hermes/Cowork/Jonathan.
//
// SAFETY: this file triggers NOTHING (no outreach, no network). It only
// normalizes/scores already-researched leads. A lead can only be marked
// high-intent when it has public, recent, explainable evidence (source_url or an
// evidence snippet) — otherwise it is downgraded and routed to Cowork to verify.

export const INTENT_TYPES = [
  "explicit_buying_intent",
  "operational_pain",
  "hiring_signal",
  "growth_signal",
  "bad_review_pattern",
  "missed_call_or_response_issue",
  "software_or_integration_need",
  "process_bottleneck",
  "other",
];

export const SIGNAL_WINDOWS = ["last_30_days", "last_90_days", "evergreen_fit"];

export const RECOMMENDED_OFFERS = [
  "Front Office Leak Check",
  "Process Audit",
  "AI Receptionist",
  "automation implementation",
  "integration help",
  "other",
];

export const NEXT_ACTIONS = ["call", "email", "cowork_research", "linkedin_task", "hold", "reject"];

// ICP categories OttoServ targets.
const ICP_PATTERNS = [
  { re: /plumb/i, category: "plumbing" },
  { re: /hvac|heating|cooling|air\s*condition/i, category: "hvac" },
  { re: /electric/i, category: "electrical" },
  { re: /roof/i, category: "roofing" },
  { re: /remodel|renovat|general\s*contractor|contracting|construction/i, category: "remodeling_contractor" },
  { re: /property\s*manage|propert(y|ies)|leasing|rental|hoa|apartment/i, category: "property_management" },
  { re: /landscap|cleaning|pest|garage|fencing|paint|flooring|locksmith|appliance|handyman|septic|pool/i, category: "home_services" },
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

function digitsOnly(value) {
  return clean(value).replace(/[^\d]/g, "");
}

function hostOf(url) {
  const m = clean(url).toLowerCase().match(/^(?:https?:\/\/)?(?:www\.)?([^/]+)/);
  return m ? m[1] : "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function detectIcpCategory(text) {
  const t = lower(text);
  for (const { re, category } of ICP_PATTERNS) {
    if (re.test(t)) return category;
  }
  return "";
}

/** Days between an ISO date and `now`; Infinity when unparseable/missing. */
function ageDays(iso, now) {
  const t = Date.parse(clean(iso));
  if (Number.isNaN(t)) return Infinity;
  return (Date.parse(now) - t) / 86_400_000;
}

export function signalWindowFor(dateOfSignal, now = new Date().toISOString()) {
  const age = ageDays(dateOfSignal, now);
  if (age <= 30) return "last_30_days";
  if (age <= 90) return "last_90_days";
  return "evergreen_fit";
}

function hasEvidence(lead) {
  return Boolean(clean(lead.evidence_snippet) || asArray(lead.source_urls).some(Boolean) || clean(lead.source_url));
}

function recommendedOfferFor(intentType, painText) {
  const p = lower(painText);
  if (intentType === "missed_call_or_response_issue" || /missed call|phone coverage|after.?hours|voicemail|answer/.test(p)) return "AI Receptionist";
  if (intentType === "software_or_integration_need" || /integrat|crm|software|sync|api/.test(p)) return "integration help";
  if (intentType === "process_bottleneck" || /schedul|dispatch|admin|paperwork|workflow|billing|invoic/.test(p)) return "Process Audit";
  if (intentType === "growth_signal" || intentType === "hiring_signal") return "automation implementation";
  return "Front Office Leak Check";
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
//
// Recent intent is weighted heavily, per the operating rubric. Returns
// { score, reasons, window } where window may be downgraded when evidence is
// missing (cannot claim recent high-intent without public proof).

export function scoreIntentLead(lead, now = new Date().toISOString()) {
  const reasons = [];
  let score = 0;

  const category = clean(lead.industry) || detectIcpCategory(`${lead.business_name} ${lead.intent_evidence_summary} ${lead.pain_point}`);
  const isIcp = Boolean(category);
  if (isIcp) { score += 10; reasons.push(`+10 ICP fit (${category})`); }

  const intentType = INTENT_TYPES.includes(lead.intent_type) ? lead.intent_type : "other";
  const evidence = hasEvidence(lead);

  // Recent high-intent requires public evidence; otherwise downgrade the window
  // so we never label a lead high-intent without proof.
  let window = lead.signal_window && SIGNAL_WINDOWS.includes(lead.signal_window)
    ? lead.signal_window
    : signalWindowFor(lead.date_of_signal, now);
  const highIntentType = ["explicit_buying_intent", "operational_pain", "missed_call_or_response_issue", "software_or_integration_need", "process_bottleneck"].includes(intentType);
  if (highIntentType && !evidence && window !== "evergreen_fit") {
    window = "evergreen_fit";
    reasons.push("intent downgraded: no public evidence (verify before outreach)");
  }

  const W = (a, b, c) => (window === "last_30_days" ? a : window === "last_90_days" ? b : c);
  switch (intentType) {
    case "explicit_buying_intent": score += W(50, 35, 15); reasons.push(`+${W(50, 35, 15)} explicit buying intent (${window})`); break;
    case "operational_pain": score += W(40, 30, 12); reasons.push(`+${W(40, 30, 12)} operational pain (${window})`); break;
    case "missed_call_or_response_issue": score += W(42, 30, 12); reasons.push(`+${W(42, 30, 12)} missed-call/response issue (${window})`); break;
    case "software_or_integration_need": score += W(34, 24, 12); reasons.push(`+${W(34, 24, 12)} software/integration need (${window})`); break;
    case "process_bottleneck": score += W(34, 24, 12); reasons.push(`+${W(34, 24, 12)} process bottleneck (${window})`); break;
    case "hiring_signal": score += W(28, 22, 10); reasons.push(`+${W(28, 22, 10)} hiring for admin/dispatch/ops (${window})`); break;
    case "bad_review_pattern": score += 25; reasons.push("+25 repeated bad reviews (response/scheduling/no-shows)"); break;
    case "growth_signal": score += 15; reasons.push("+15 growth signal"); break;
    default: score += 5; reasons.push("+5 other/weak signal");
  }

  const phone = digitsOnly(lead.phone);
  const hasPhone = phone.length >= 10;
  const email = lower(lead.email);
  const hasEmail = EMAIL_RE.test(email);
  const hasWebsite = Boolean(hostOf(lead.website));
  if (hasPhone) { score += 6; reasons.push("+6 phone present"); }
  if (hasEmail) { score += 4; reasons.push("+4 email present"); }

  const badFit = /vendor|agency selling|spam|mlm|not a business/i.test(`${lead.business_name} ${lead.intent_evidence_summary}`);
  if (badFit) { score -= 60; reasons.push("-60 bad-fit/vendor signal"); }

  score = Math.max(0, Math.min(100, score));
  const reachable = hasPhone || hasEmail || hasWebsite;
  return { score, reasons, window, category, intentType, hasPhone, hasEmail, hasWebsite, hasEvidence: evidence, reachable, badFit };
}

export function tierForIntent(s) {
  if (s.badFit || !s.reachable || s.score < 20) return "Reject";
  // A: recent, evidence-backed, callable, strong. The window+evidence+phone gates
  // are the real guard; the numeric floor just screens weak fits.
  if (s.score >= 65 && s.hasPhone && s.window === "last_30_days" && s.hasEvidence) return "A-tier";
  if (s.score >= 45 && (s.hasEmail || s.hasPhone)) return "B-tier";
  return "C-tier";
}

function nextActionFor(tier, scored) {
  if (tier === "Reject") return "reject";
  // High-intent claim missing evidence → verify via Cowork first.
  if (!scored.hasEvidence && ["explicit_buying_intent", "operational_pain", "missed_call_or_response_issue"].includes(scored.intentType)) {
    return "cowork_research";
  }
  if (tier === "A-tier") return "call";
  if (tier === "B-tier") return "email";
  return "cowork_research";
}

// ─── Normalize one researched/enriched lead into the full schema ──────────────

export function normalizeEnrichedLead(raw = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const scored = scoreIntentLead(raw, now);
  const tier = tierForIntent(scored);
  const offer = clean(raw.recommended_offer) || recommendedOfferFor(scored.intentType, raw.pain_point);
  const sourceUrls = asArray(raw.source_urls).map(clean).filter(Boolean);
  if (clean(raw.source_url)) sourceUrls.unshift(clean(raw.source_url));
  const company = clean(raw.business_name) || clean(raw.company);
  const phone = digitsOnly(raw.phone);
  const nextAction = nextActionFor(tier, scored);
  const evidenceRequired = scored.hasEvidence
    ? "Recorded public evidence on file; confirm freshness before outreach."
    : "Public, recent, explainable evidence (source URL or snippet) required before any outreach.";

  return {
    // identity / contact
    lead_id: clean(raw.lead_id) || `li-${(company || "lead").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32)}-${digitsOnly(now).slice(-6)}`,
    business_name: company,
    website: clean(raw.website),
    phone: clean(raw.phone),
    normalized_phone: scored.hasPhone ? phone : "",
    email: lower(raw.email),
    location: clean(raw.location),
    industry: scored.category || clean(raw.industry),
    decision_maker: clean(raw.decision_maker || raw.contact_name),
    // signal / intent
    source_urls: sourceUrls,
    date_of_signal: clean(raw.date_of_signal),
    signal_window: scored.window,
    intent_type: scored.intentType,
    intent_evidence_summary: clean(raw.intent_evidence_summary),
    evidence_snippet: clean(raw.evidence_snippet),
    pain_point: clean(raw.pain_point),
    likely_ottoserv_angle: clean(raw.likely_ottoserv_angle) || `${offer} for ${scored.category || "service business"} ${scored.intentType.replace(/_/g, " ")}`,
    recommended_offer: RECOMMENDED_OFFERS.includes(offer) ? offer : "Front Office Leak Check",
    // scoring / routing
    score: scored.score,
    tier,
    score_reasons: scored.reasons,
    recommended_next_action: nextAction,
    risk_compliance_notes: clean(raw.risk_compliance_notes) || (scored.hasEvidence ? "Public source only." : "Unverified intent — verify public evidence before contact."),
    last_enriched_date: now,
    evidence_required: evidenceRequired,
  };
}

// ─── Dedupe ─────────────────────────────────────────────────────────────────

function dedupeKeys(lead) {
  const keys = [];
  if (clean(lead.normalized_phone)) keys.push(`p:${lead.normalized_phone}`);
  if (clean(lead.email)) keys.push(`e:${lower(lead.email)}`);
  const host = hostOf(lead.website);
  if (host) keys.push(`w:${host}`);
  if (clean(lead.business_name) && clean(lead.location)) keys.push(`c:${lower(lead.business_name)}|${lower(lead.location)}`);
  return keys;
}

export function dedupeEnrichedLeads(leads = []) {
  const seen = new Set();
  const out = [];
  for (const lead of asArray(leads)) {
    const keys = dedupeKeys(lead);
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    out.push(lead);
  }
  return out;
}

// ─── Map to the revenue loop's NormalizedLead-compatible input ────────────────

export function toRevenueLoopLead(lead) {
  const status =
    lead.tier === "A-tier" ? "ready_to_call" :
    lead.tier === "B-tier" ? "ready_to_email" :
    lead.tier === "C-tier" ? "needs_enrichment" : "rejected";
  const owner =
    lead.tier === "A-tier" ? "jarvis" :
    lead.tier === "B-tier" || lead.tier === "C-tier" ? "cowork" : "codex";
  return {
    // Core NormalizedLead fields the revenue loop consumes.
    lead_id: lead.lead_id,
    company: lead.business_name,
    contact_name: lead.decision_maker,
    phone: lead.phone,
    normalized_phone: lead.normalized_phone,
    email: lead.email,
    website_url: lead.website,
    industry: lead.industry,
    city: lead.location,
    state: "",
    source_url: lead.source_urls[0] || "",
    notes: lead.intent_evidence_summary,
    buying_signal: lead.intent_type,
    pain_signal: lead.pain_point,
    timezone: "",
    score: lead.score,
    tier: lead.tier,
    score_reasons: lead.score_reasons,
    status,
    suggested_owner: owner,
    scheduled_call_local: null,
    created_at: clean(lead.date_of_signal) || lead.last_enriched_date,
    // Enrichment superset (engine ignores; Hermes/dashboard can use).
    intent: {
      signal_window: lead.signal_window,
      intent_type: lead.intent_type,
      recommended_offer: lead.recommended_offer,
      recommended_next_action: lead.recommended_next_action,
      likely_ottoserv_angle: lead.likely_ottoserv_angle,
      source_urls: lead.source_urls,
      evidence_required: lead.evidence_required,
      risk_compliance_notes: lead.risk_compliance_notes,
    },
  };
}

// ─── Pipeline builder ─────────────────────────────────────────────────────────

export function buildLeadPipeline(rawLeads = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const minRecentIntent = Number(options.minRecentIntent ?? 3);

  const normalized = dedupeEnrichedLeads(asArray(rawLeads).map((raw) => normalizeEnrichedLead(raw, { now })));
  const accepted = normalized.filter((l) => l.tier !== "Reject");
  const rejected = normalized.filter((l) => l.tier === "Reject");

  const high_intent_30d = accepted.filter((l) => l.signal_window === "last_30_days");
  const medium_intent_90d = accepted.filter((l) => l.signal_window === "last_90_days");
  const qualified_icp = accepted.filter((l) => l.signal_window === "evergreen_fit");

  const a_tier_calls = accepted.filter((l) => l.tier === "A-tier");
  const b_tier_emails = accepted.filter((l) => l.tier === "B-tier");
  const cowork_research = accepted.filter((l) => l.recommended_next_action === "cowork_research");

  const lowRecentIntent = high_intent_30d.length < minRecentIntent;
  const repairPacket = lowRecentIntent
    ? {
        id: `repair-lead-intent-${now.slice(0, 10)}`,
        queue: "coworkExecution",
        owner: "Cowork",
        category: "Low recent-intent lead volume",
        what_failed: "lead_intent_pipeline",
        expected_behavior: `At least ${minRecentIntent} evidence-backed high-intent (last_30_days) leads available daily.`,
        actual_behavior: `Only ${high_intent_30d.length} high-intent (last_30_days) lead(s) found. Run Cowork intent research to refill.`,
        evidence_logs: [],
        verification_steps: ["Complete the attached Cowork research tasks.", "Re-run npm run lead:intake.", "Confirm high_intent_30d >= threshold."],
        status: "open",
        created_at: now,
      }
    : null;

  return {
    generated_at: now,
    summary: {
      total_input: asArray(rawLeads).length,
      accepted: accepted.length,
      rejected: rejected.length,
      high_intent_30d: high_intent_30d.length,
      medium_intent_90d: medium_intent_90d.length,
      qualified_icp: qualified_icp.length,
      a_tier_calls: a_tier_calls.length,
      b_tier_emails: b_tier_emails.length,
      cowork_research: cowork_research.length,
      low_recent_intent: lowRecentIntent,
    },
    high_intent_30d,
    medium_intent_90d,
    qualified_icp,
    queues: { a_tier_calls, b_tier_emails, cowork_research, rejected },
    revenueLoopLeads: accepted.map(toRevenueLoopLead),
    repairPacket,
  };
}
