// ─── Hermes spreadsheet seed-lead ingest (sprint priorities 2 + 5) ────────────
//
// THE GAP THIS FILLS
// The "broadened revenue signal" spreadsheet is SEED inventory — public intent
// signals (company, role, pain, source URL, decision-maker proof URL, posted date,
// priority) — but it is NOT in the research-results shape the intake pipeline
// understands, and most rows have NO verified contact path (email/phone). Feeding
// it blindly would either drop everything or, worse, contact leads with no real
// contact path. This module is the safe adapter + validator + controlled-pilot
// selector that turns those rows into validated research-results leads and picks a
// SMALL, policy-eligible pilot set to prove the live rails.
//
// It is PURE (no I/O, no network, no xlsx parsing): callers pass already-parsed row
// objects (header → value). The script layer handles file reading. It enforces:
//   - real contact path required for a live channel (email for email, phone for
//     call); rows without one are NOT pilot-eligible — they are queued for
//     enrichment (Cowork) instead of contacted.
//   - ICP fit (home-service / property-management trades).
//   - public evidence (source URL or snippet) — evidence rules are NOT weakened.
//   - dedupe by domain/email/phone, and per-channel caps for the pilot.
//   - one-channel-per-lead in the pilot (no simultaneous email+call to one lead).
// It SENDS/DIALS NOTHING — it only prepares validated leads + a pilot plan.

function clean(value) {
  return String(value ?? "").trim();
}
function lower(value) {
  return clean(value).toLowerCase();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
// A real phone needs separators/parens between groups. A bare 10-digit run is
// REJECTED — those are almost always URL/job/profile IDs scraped from links, and
// dialing one would contact the wrong party. Verified contact paths only.
const PHONE_RE = /(?:\+?1[\s.\-])?\(\d{3}\)[\s.\-]?\d{3}[\s.\-]?\d{4}|(?:\+?1[\s.\-])?\d{3}[\s.\-]\d{3}[\s.\-]\d{4}/;

// Home-service / property-management ICP keywords (OttoServ's wedge).
const ICP_KEYWORDS = [
  "hvac", "plumb", "electric", "roof", "garage", "landscap", "pest", "clean",
  "restoration", "remodel", "contractor", "mechanical", "refrigerat", "heating",
  "cooling", "air conditioning", "property manage", "real estate", "home service",
  "appliance", "handyman", "septic", "pool", "fire protection", "comfort",
];

// Pull a value from a row by any of several header aliases (case-insensitive).
function pick(row, aliases) {
  const lowered = {};
  for (const [k, v] of Object.entries(row || {})) lowered[lower(k)] = v;
  for (const a of aliases) {
    const v = lowered[lower(a)];
    if (clean(v) && lower(v) !== "none") return clean(v);
  }
  return "";
}

// Strip URLs/domains so IDs embedded in links are never read as contact paths.
function stripUrls(text) {
  return String(text || "").replace(/https?:\/\/\S+/gi, " ").replace(/\bwww\.\S+/gi, " ").replace(/\b[\w-]+\.(?:com|net|org|io|co|us|biz|info)\b\S*/gi, " ");
}

// Find a VERIFIED email / phone in the row's free text (contact path). URL-ish
// columns are skipped entirely, and URLs are stripped from the remaining text, so
// profile/job IDs inside links are never mistaken for a dialable phone.
function findContact(row) {
  const blob = Object.entries(row || {})
    .filter(([k]) => !/url|website|domain|link|source|proof/i.test(k))
    .map(([, v]) => stripUrls(clean(v)))
    .filter(Boolean)
    .join(" \n ");
  const email = (blob.match(EMAIL_RE) || [])[0] || "";
  const phone = (blob.match(PHONE_RE) || [])[0] || "";
  return { email: lower(email), phone: clean(phone) };
}

function isIcpFit(text) {
  const t = lower(text);
  return ICP_KEYWORDS.some((k) => t.includes(k));
}

function tierHintFromPriority(priority) {
  const p = lower(priority);
  if (p === "high") return "A_or_B";
  if (p === "medium") return "B_or_C";
  if (p === "low") return "C";
  return "unknown";
}

/**
 * Map one spreadsheet row → research-results lead shape (the intake contract input).
 * Returns { lead, contact, icp_fit, reasons } where `lead` is null for an unusable
 * (blank) row. Pure.
 */
export function rowToResearchLead(row = {}) {
  const company = pick(row, ["Company", "Business", "Business Name"]);
  const website = pick(row, ["Website/Domain", "Website", "Domain"]);
  const sourceUrl = pick(row, ["Source URL", "Source", "Source Link"]);
  const proofUrl = pick(row, ["Decision-Maker Proof URL", "Proof URL"]);
  const pain = pick(row, ["Project/Pain Details", "Pain Details", "Pain"]);
  const angle = pick(row, ["Suggested OttoServ Angle", "Angle"]);
  const role = pick(row, ["Role", "Title"]);
  const contactName = pick(row, ["Contact Name", "Decision Maker", "Owner"]);
  const opportunity = pick(row, ["Opportunity Type", "Opportunity"]);
  const businessContext = pick(row, ["Business Context", "Context", "Notes"]);
  const postedDate = pick(row, ["Posted Date", "Date", "Posted"]);
  const priority = pick(row, ["Priority"]);
  const verification = pick(row, ["Verification Status", "Verification"]);

  // A row is unusable (blank padding) when it has neither a company nor a website.
  if (!company && !website) return { lead: null, reasons: ["blank_row"] };

  const contact = findContact(row);
  const icpText = `${company} ${role} ${opportunity} ${pain} ${businessContext} ${angle}`;
  const icp_fit = isIcpFit(icpText);

  const lead = {
    business_name: company,
    website,
    email: contact.email,
    phone: contact.phone,
    decision_maker: contactName,
    location: "",
    industry: "",
    intent_type: "operational_pain",
    source_url: sourceUrl || website,
    source_urls: [sourceUrl, proofUrl].filter(Boolean),
    evidence_snippet: pain || opportunity,
    date_of_signal: postedDate,
    pain_point: pain,
    likely_ottoserv_angle: angle,
    risk_compliance_notes: verification ? `Spreadsheet verification: ${verification}.` : "",
    seed_priority: priority,
    seed_priority_tier_hint: tierHintFromPriority(priority),
    lead_source: "broadened_revenue_signal_spreadsheet",
  };
  return { lead, contact, icp_fit, reasons: [] };
}

/**
 * Validate + classify all rows. Returns the usable research leads plus per-lead
 * eligibility flags, and a summary. Pure. Does NOT contact anyone.
 *
 * eligibility per lead:
 *   - icp_fit
 *   - has_email / has_phone (real contact path)
 *   - has_evidence (source URL or snippet)
 *   - email_eligible = icp_fit && has_email && has_evidence && !dnc/!blacklist
 *   - call_eligible  = icp_fit && has_phone && has_evidence && !dnc/!blacklist
 *   - needs_enrichment = icp_fit && has_evidence && !has_email && !has_phone
 */
export function ingestSpreadsheetRows(rows = [], options = {}) {
  const dnc = new Set(asArray(options.dnc).map(lower));
  const blacklist = new Set(asArray(options.blacklist).map(lower));
  const seenDomain = new Set();
  const seenEmail = new Set();
  const seenPhone = new Set();

  const leads = [];
  let blankRows = 0;
  let duplicates = 0;
  for (const row of asArray(rows)) {
    const { lead, contact, icp_fit, reasons } = rowToResearchLead(row);
    if (!lead) { blankRows += 1; continue; }

    // Dedupe by domain / email / phone.
    const host = lower(lead.website).replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    const dupKey = host || lower(lead.email) || clean(lead.phone);
    const isDup = (host && seenDomain.has(host)) || (lead.email && seenEmail.has(lower(lead.email))) || (lead.phone && seenPhone.has(clean(lead.phone)));
    if (isDup) { duplicates += 1; continue; }
    if (host) seenDomain.add(host);
    if (lead.email) seenEmail.add(lower(lead.email));
    if (lead.phone) seenPhone.add(clean(lead.phone));

    const has_email = Boolean(lead.email);
    const has_phone = Boolean(lead.phone);
    const has_evidence = Boolean(clean(lead.source_url) || clean(lead.evidence_snippet));
    const onDnc = dnc.has(lower(lead.email)) || dnc.has(clean(lead.phone)) || blacklist.has(host);

    const email_eligible = icp_fit && has_email && has_evidence && !onDnc;
    const call_eligible = icp_fit && has_phone && has_evidence && !onDnc;
    const needs_enrichment = icp_fit && has_evidence && !has_email && !has_phone;

    leads.push({
      ...lead,
      eligibility: { icp_fit, has_email, has_phone, has_evidence, on_dnc: onDnc, email_eligible, call_eligible, needs_enrichment },
    });
  }

  return {
    leads,
    summary: {
      input_rows: asArray(rows).length,
      usable_leads: leads.length,
      blank_rows: blankRows,
      duplicates,
      icp_fit: leads.filter((l) => l.eligibility.icp_fit).length,
      with_email: leads.filter((l) => l.eligibility.has_email).length,
      with_phone: leads.filter((l) => l.eligibility.has_phone).length,
      email_eligible: leads.filter((l) => l.eligibility.email_eligible).length,
      call_eligible: leads.filter((l) => l.eligibility.call_eligible).length,
      needs_enrichment: leads.filter((l) => l.eligibility.needs_enrichment).length,
    },
  };
}

/**
 * Build a durable actor-queue entry (taskPacket + lifecycle) for a controlled-pilot
 * lead on a given channel. The entry is no_send/no_call by default — it is intent
 * only; the email/call executors send/dial ONLY in explicit live mode with a wired,
 * credentialed transport. Pure. Reuses the same shape the throughput layer produces.
 */
export function pilotToQueueEntry(lead = {}, channel = "email", options = {}) {
  const now = options.now || new Date().toISOString();
  const id = `apx-pilot-${lower(lead.business_name).replace(/[^a-z0-9]+/g, "-").slice(0, 28)}-${channel}`;
  const requiredEvidence = channel === "email"
    ? ["Outbound email evidence: message id, timestamp, recipient, disposition, and next action."]
    : ["Outbound call evidence: call id, timestamp, disposition/outcome, and next action."];
  const actor_packet = {
    task_id: id,
    channel,
    lead_id: lower(lead.website) || lower(lead.email) || clean(lead.phone) || lower(lead.business_name),
    company: clean(lead.business_name),
    contact: { email: lower(lead.email), phone: clean(lead.phone) },
    packet: channel === "email" ? { kind: "email_packet", offer: clean(lead.likely_ottoserv_angle) } : { kind: "call_packet", angle: clean(lead.likely_ottoserv_angle) },
    evidence: { source_url: clean(lead.source_url), snippet: clean(lead.evidence_snippet), pain_point: clean(lead.pain_point), offer_angle: clean(lead.likely_ottoserv_angle) },
    policy: { materialized_via: "controlled_pilot_standing_policy", daily_cap: channel === "email" ? 50 : 20, tier: clean(lead.seed_priority_tier_hint), approved_by: "standing_policy" },
    required_evidence: requiredEvidence,
    mode: clean(options.mode) || "no_send_no_call",
    no_send: (clean(options.mode) || "no_send_no_call") !== "live",
    no_call: (clean(options.mode) || "no_send_no_call") !== "live",
    status: "queued",
  };
  return {
    taskPacket: { task_id: id, actor_packet },
    lifecycle: { assigned_task_id: id, execution_status: "queued", evidence_status: "required", required_evidence: requiredEvidence, submitted_evidence: [], last_status_update_at: now },
  };
}

/**
 * Select a SMALL controlled pilot from ingested leads. Honors caps and the
 * one-channel-per-lead rule (a lead chosen for email is not also chosen for call,
 * unless options.allowDualChannel). Email-eligible and call-eligible leads only;
 * everything else is routed to enrichment. Pure.
 *
 * @param {object} options { emailCap=1, callCap=1, allowDualChannel=false }
 */
export function selectControlledPilot(ingest = {}, options = {}) {
  const emailCap = Number.isFinite(Number(options.emailCap)) ? Number(options.emailCap) : 1;
  const callCap = Number.isFinite(Number(options.callCap)) ? Number(options.callCap) : 1;
  const allowDual = Boolean(options.allowDualChannel);
  const leads = asArray(ingest.leads);

  const chosen = new Set(); // lead keys already placed in the pilot (one channel each)
  const keyOf = (l) => lower(l.website) || lower(l.email) || clean(l.phone) || lower(l.business_name);

  const emailPilot = [];
  for (const l of leads) {
    if (emailPilot.length >= emailCap) break;
    if (!l.eligibility.email_eligible) continue;
    emailPilot.push(l);
    chosen.add(keyOf(l));
  }
  const callPilot = [];
  for (const l of leads) {
    if (callPilot.length >= callCap) break;
    if (!l.eligibility.call_eligible) continue;
    if (!allowDual && chosen.has(keyOf(l))) continue; // no simultaneous dual-channel
    callPilot.push(l);
    chosen.add(keyOf(l));
  }
  const enrichmentQueue = leads.filter((l) => l.eligibility.needs_enrichment).map((l) => ({ business_name: l.business_name, website: l.website, reason: "no_verified_contact_path", route_to: "Cowork" }));

  return {
    email_pilot: emailPilot,
    call_pilot: callPilot,
    enrichment_queue: enrichmentQueue,
    summary: {
      email_pilot: emailPilot.length,
      call_pilot: callPilot.length,
      enrichment_queued: enrichmentQueue.length,
      caps: { emailCap, callCap, allowDualChannel: allowDual },
    },
  };
}
