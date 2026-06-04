// ─── Hermes outbound rail handoff (Autonomy v2, sprint priorities 4 + 5) ──────
//
// THE GAP THIS FILLS
// The durable actor queue holds materialized email/call packets, but nothing turns
// them into send-ready drafts / call-ready packets for the rails. This module is
// that handoff. It is PURE and SAFE: it produces a draft (email) or a call-ready
// packet (call) and runs the full preflight — contact path, required-evidence
// contract, public evidence/source, DNC/blacklist, cooldown, business hours (calls),
// per-attempt + per-day caps, and sensitive/upset/new-campaign content — but it
// SENDS NOTHING and DIALS NOTHING. mode is no_send/no_call by default; `live` is
// reserved for a future, explicitly-approved real adapter with safe credentials.
//
// Outcomes per packet:
//   - ready    → preflight passed; draft/call-ready packet attached; would_send/
//                would_dial reflect mode (false unless live).
//   - blocked  → a hard prerequisite/guardrail failed (missing contact/evidence,
//                DNC, cooldown, off-hours, max attempts). Never sent.
//   - gated    → over-cap / sensitive / upset / new-campaign → needs Jonathan.

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function lower(value) {
  return clean(value).toLowerCase();
}

export const RAIL_HANDOFF_DEFAULT_MODE = "no_send_no_call";
export const DEFAULT_COOLDOWN_DAYS = 3;
export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_BUSINESS_HOURS = { start: 8, end: 18 }; // local hours, inclusive-exclusive

const SENSITIVE_TEXT = [
  /\bupset\b|\bangry\b|complaint|escalat|frustrat|unhappy|\birate\b/i,
  /refund|chargeback|cancellation|\blegal\b|complian/i,
  /custom\s+(pric|offer|quote|guarantee|discount)/i,
  /new\s+(campaign|segment|audience|list|icp)/i,
];

// Detect a content/flag reason this packet must be GATED rather than sent.
function gateReasonFor(entry, flags) {
  if (flags) {
    if (flags.upset || flags.upset_customer) return "upset_customer";
    if (flags.sensitive || flags.high_emotion) return "sensitive";
    if (flags.negative_reply) return "negative_reply_needs_judgment";
    if (flags.new_campaign || flags.new_segment) return "new_campaign_or_segment";
    if (flags.custom_offer || flags.custom_pricing) return "custom_offer";
  }
  const p = entry.actor_packet || {};
  const text = lower(`${p.company} ${p.evidence?.snippet} ${p.evidence?.offer_angle} ${p.packet?.offer} ${p.packet?.angle}`);
  for (const re of SENSITIVE_TEXT) if (re.test(text)) return "sensitive_content";
  return "";
}

// Hard preflight: returns a block reason or "" when clear. `ctx` carries the
// runtime guardrail state (DNC set, cooldown info, business hours, attempts).
function blockReasonFor(entry, channel, ctx) {
  const p = entry.actor_packet || {};
  const contact = p.contact || {};
  const dnc = ctx.dnc instanceof Set ? ctx.dnc : new Set(asArray(ctx.dnc).map(lower));
  const blacklist = ctx.blacklist instanceof Set ? ctx.blacklist : new Set(asArray(ctx.blacklist).map(lower));

  // Contact path.
  const target = channel === "email" ? lower(contact.email) : clean(contact.phone);
  if (!target) return "missing_contact_path";

  // Evidence contract + public evidence (do not weaken evidence rules).
  if (!asArray(p.required_evidence).length) return "missing_evidence_contract";
  if (!clean(p.evidence?.source_url)) return "missing_public_evidence";

  // DNC / blacklist.
  if (dnc.has(lower(target)) || blacklist.has(lower(target)) || dnc.has(lower(p.lead_id))) return "dnc_or_blacklist";

  // Cooldown since last contact.
  const lastAt = clean(ctx.lastContactedAt?.[p.lead_id]);
  if (lastAt) {
    const days = (Date.parse(ctx.now) - Date.parse(lastAt)) / 86_400_000;
    const cooldown = Number(ctx.cooldownDays ?? DEFAULT_COOLDOWN_DAYS);
    if (Number.isFinite(days) && days < cooldown) return "cooldown_window";
  }

  // Per-lead max attempts (mainly calls).
  const attempts = Number(ctx.attempts?.[p.lead_id] || 0);
  if (channel === "call" && attempts >= Number(ctx.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)) return "max_attempts_reached";

  // Business hours (calls only). Hour resolved from ctx.localHour (caller supplies
  // the lead-local hour) or the now timestamp's UTC hour as a safe fallback.
  if (channel === "call") {
    const hours = ctx.businessHours || DEFAULT_BUSINESS_HOURS;
    const hour = Number.isFinite(ctx.localHour) ? ctx.localHour : new Date(ctx.now).getUTCHours();
    if (hour < hours.start || hour >= hours.end) return "outside_business_hours";
  }
  return "";
}

// Build a safe email draft from the actor packet — no pricing/guarantees, no send.
function buildEmailDraft(entry) {
  const p = entry.actor_packet || {};
  const company = clean(p.company) || "your team";
  const angle = clean(p.evidence?.offer_angle) || clean(p.packet?.offer) || "AI Lead Handler";
  const pain = clean(p.evidence?.pain_point);
  const subject = pain ? `Quick idea for ${company}: stop losing leads to ${pain.slice(0, 40)}` : `Quick idea for ${company} on missed leads`;
  const body = [
    `Hi ${company} team,`,
    pain
      ? `Saw a public note suggesting ${company} may be dealing with: ${pain}.`
      : `Reaching out about inbound lead handling for ${company}.`,
    `We help property managers and home-service businesses with ${angle} — answering calls, recovering missed calls, qualifying, and booking — so fewer leads slip.`,
    `Worth a quick look? Happy to share a 2-minute example.`,
    `— OttoServ`,
  ].join("\n\n");
  return {
    to: lower(p.contact?.email),
    subject,
    body,
    evidence_citation: clean(p.evidence?.source_url),
    required_evidence: asArray(p.required_evidence),
  };
}

// Build a call-ready packet (opener + qualifying questions) — no dial.
function buildCallReady(entry) {
  const p = entry.actor_packet || {};
  const company = clean(p.company) || "the company";
  const angle = clean(p.evidence?.offer_angle) || "AI Lead Handler";
  return {
    to: clean(p.contact?.phone),
    opener: `Hi, this is OttoServ. We help ${company}-type businesses stop losing work from missed calls and slow follow-up. Quick question — when a call is missed or comes in after hours, what happens right now?`,
    offer_angle: angle,
    qualifying_questions: [
      "How are inbound calls and after-hours inquiries handled today?",
      "Roughly how many calls go unanswered in a busy week?",
      "What happens to a lead that calls after hours?",
    ],
    do_not_say: ["No guaranteed revenue/cost claims.", "Do not imply access to private call logs."],
    evidence_citation: clean(p.evidence?.source_url),
    required_evidence: asArray(p.required_evidence),
  };
}

function prepareOne(entry, channel, ctx) {
  const p = entry.actor_packet || {};
  // Cap check (over-cap → gated, not blocked): sentToday vs the packet's daily cap.
  const sent = Number(ctx.sentToday?.[channel] || 0);
  const cap = Number(p.policy?.daily_cap);
  const flags = ctx.flags?.[clean(p.task_id)];

  const gate = gateReasonFor(entry, flags) || (Number.isFinite(cap) && sent >= cap ? "daily_cap_reached_limit_increase" : "");
  if (gate) {
    return { task_id: p.task_id, channel, lead_id: p.lead_id, status: "gated", gate_reason: gate, would_send: false, would_dial: false };
  }
  const block = blockReasonFor(entry, channel, ctx);
  if (block) {
    return { task_id: p.task_id, channel, lead_id: p.lead_id, status: "blocked", block_reason: block, would_send: false, would_dial: false };
  }
  const live = clean(ctx.mode) === "live";
  const out = {
    task_id: p.task_id,
    channel,
    lead_id: p.lead_id,
    company: p.company,
    status: "ready",
    required_evidence: asArray(p.required_evidence),
    would_send: channel === "email" ? live : false,
    would_dial: channel === "call" ? live : false,
    sent: false,
    dialed: false,
  };
  if (channel === "email") out.draft = buildEmailDraft(entry);
  else out.call_ready = buildCallReady(entry);
  return out;
}

export function prepareEmailHandoff(entry, ctx = {}) {
  return prepareOne(entry, "email", { mode: RAIL_HANDOFF_DEFAULT_MODE, now: new Date().toISOString(), ...ctx });
}
export function prepareCallHandoff(entry, ctx = {}) {
  return prepareOne(entry, "call", { mode: RAIL_HANDOFF_DEFAULT_MODE, now: new Date().toISOString(), ...ctx });
}

/**
 * Prepare handoffs for a whole actor queue. `queue` is readActorQueue() output.
 * Pure — sends/dials nothing. Returns per-channel results + a summary.
 */
export function prepareRailHandoffs(queue = [], ctx = {}) {
  const merged = { mode: RAIL_HANDOFF_DEFAULT_MODE, now: new Date().toISOString(), ...ctx };
  const email = [];
  const call = [];
  for (const entry of asArray(queue)) {
    const channel = clean(entry.actor_packet?.channel);
    if (channel === "email") email.push(prepareEmailHandoff(entry, merged));
    else if (channel === "call") call.push(prepareCallHandoff(entry, merged));
  }
  const count = (arr, s) => arr.filter((x) => x.status === s).length;
  return {
    generated_at: merged.now,
    mode: merged.mode,
    email,
    call,
    summary: {
      email: { ready: count(email, "ready"), blocked: count(email, "blocked"), gated: count(email, "gated") },
      call: { ready: count(call, "ready"), blocked: count(call, "blocked"), gated: count(call, "gated") },
      sent: 0,
      dialed: 0,
    },
  };
}
