// ─── Hermes call rail (Autonomy v2, milestone: call-rail closure) ─────────────
//
// THE GAP THIS FILLS
// The named #1 operating blocker — "Call rail idle: A-tier lead ready to call but
// no call outcomes recorded" — was UNDETECTABLE and UNCLOSEABLE in-repo. The
// selector can recommend an approved call and the approval→execution bridge can
// route it to the Morgan/Retell rail, but nothing:
//   1. MEASURED whether the call rail is actually producing outcomes (idle vs.
//      active), so the scorecard could not flag "call rail idle";
//   2. turned an approved A-tier call into a concrete Retell/Morgan CALL PACKET
//      the actor can dial from; or
//   3. let a (simulated) call OUTCOME flow back into the evidence path so the rail
//      stops reading as idle.
// So Hermes could see "A-tier lead, phone, evidence" and still sit blocked.
//
// This module is that missing call-rail layer. It is PURE + deterministic and
// composes the existing systems (approval→execution bridge shapes, actor evidence
// intake submission shape, lead-intent lead shape). It adds NO parallel store.
//
// SAFETY: it triggers NO calls. `buildCallPacket` returns a proposal an approved
// actor dials from; `simulateCallOutcome` returns a CLEARLY-FLAGGED simulated
// record (never a real dial) that rides the existing evidence-intake write-back.
// Every revenue-moving call stays approval-gated upstream (recommend_approved_call).

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function lower(value) {
  return clean(value).toLowerCase();
}
function slug(value) {
  return lower(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}
function daysBetween(iso, now) {
  const t = Date.parse(clean(iso));
  if (Number.isNaN(t)) return null;
  return (Date.parse(now) - t) / 86_400_000;
}

// A lead carries usable public evidence (citation), mirroring the selector.
function leadHasEvidence(lead) {
  return Boolean(clean(lead.source_url) || asArray(lead.intent?.source_urls).some(Boolean));
}

// Recency window (days) for "recent call outcomes". Tunable.
export const CALL_RAIL_RECENT_DAYS = 7;

// Is this approval/execution queue item a CALL task (Morgan/Retell rail)?
export function isCallTask(item = {}) {
  const lc = item.lifecycle || item;
  const tp = item.taskPacket || {};
  const rail = lower(lc.execution_rail || tp.execution_rail);
  const agent = lower(lc.assigned_agent || tp.assigned_agent);
  const action = lower(tp.requested_action || tp.mission_title);
  if (rail === "morgan") return true;
  if (/morgan|retell/.test(agent)) return true;
  if (/\bcall\b|\bdial\b|\bphone\b|cold[-\s]?call/.test(action)) return true;
  return false;
}

// Has this call task recorded an OUTCOME? (evidence submitted or task closed.)
function hasRecordedOutcome(lc = {}) {
  const status = clean(lc.execution_status);
  if (["evidence_submitted", "hermes_reviewing", "completed"].includes(status)) return true;
  return asArray(lc.submitted_evidence).some((e) => clean(e.evidence_reference) || clean(e.evidence_summary));
}

// Leads that are READY for an A-tier call: A-tier, not rejected, has a phone and
// public evidence. These create the "demand" the call rail must serve.
export function callReadyATierLeads(leads = []) {
  return asArray(leads)
    .filter((l) => clean(l.status) !== "rejected")
    .filter((l) => clean(l.tier) === "A-tier" && clean(l.normalized_phone) && leadHasEvidence(l))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
}

/**
 * Detect the state of the call rail. Pure + deterministic.
 *
 * @param {object} state { leads?, document?, ledger?, now? }
 * @returns {
 *   status: 'idle' | 'stale' | 'healthy' | 'no_demand',
 *   call_ready_a_tier, call_tasks, recorded_outcomes, recent_outcomes,
 *   most_recent_outcome_at, detail, top_call_ready[] }
 */
export function detectCallRailState(state = {}, options = {}) {
  const now = state.now || options.now || new Date().toISOString();
  const recentDays = Number(options.recentDays ?? CALL_RAIL_RECENT_DAYS);

  const ready = callReadyATierLeads(state.leads);

  // Outcomes from the approval→execution queue (authoritative lifecycle state).
  const items = asArray(state.document?.approvalExecutionQueue?.items);
  const callTasks = items.filter(isCallTask);
  const outcomeTasks = callTasks.filter((i) => hasRecordedOutcome(i.lifecycle || {}));

  // Outcomes from the operating ledger (call-task status changes / evidence).
  const ledgerOutcomes = asArray(state.ledger).filter((e) => {
    const t = clean(e.event_type);
    const src = lower(e.source_type);
    const isCallish = /call|morgan|retell/.test(lower(e.source_id)) || /call|morgan|retell/.test(lower(e.action));
    if (src === "execution_task" && (t === "evidence_submitted" || (t === "status_changed" && clean(e.to_status) === "completed"))) {
      return isCallish;
    }
    return false;
  });

  const outcomeTimestamps = [
    ...outcomeTasks.map((i) => clean(i.lifecycle?.last_status_update_at) || clean(i.taskPacket?.created_at)),
    ...ledgerOutcomes.map((e) => clean(e.ts)),
  ].filter(Boolean);

  const recordedOutcomes = outcomeTasks.length + ledgerOutcomes.length;
  const recentOutcomes = outcomeTimestamps.filter((ts) => {
    const d = daysBetween(ts, now);
    return d !== null && d <= recentDays;
  }).length;
  const mostRecent = outcomeTimestamps
    .map((ts) => Date.parse(ts))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => b - a)[0];

  let status;
  let detail;
  if (!ready.length && recordedOutcomes === 0) {
    status = "no_demand";
    detail = "No call-ready A-tier leads and no call outcomes — the call rail has nothing to serve yet.";
  } else if (ready.length && recordedOutcomes === 0) {
    status = "idle";
    detail = `${ready.length} A-tier lead(s) ready to call but ZERO call outcomes recorded — the call rail is idle.`;
  } else if (ready.length && recentOutcomes === 0) {
    status = "stale";
    detail = `${ready.length} A-tier lead(s) ready to call and no call outcomes in the last ${recentDays} day(s).`;
  } else {
    status = "healthy";
    detail = `${recentOutcomes} recent call outcome(s) recorded across ${callTasks.length} call task(s).`;
  }

  return {
    status,
    call_ready_a_tier: ready.length,
    call_tasks: callTasks.length,
    recorded_outcomes: recordedOutcomes,
    recent_outcomes: recentOutcomes,
    recent_window_days: recentDays,
    most_recent_outcome_at: mostRecent ? new Date(mostRecent).toISOString() : null,
    detail,
    top_call_ready: ready.slice(0, 5).map((l) => ({
      lead_id: clean(l.lead_id) || slug(l.company),
      company: clean(l.company),
      score: Number(l.score || 0),
    })),
  };
}

// Standing call guardrails reused on every packet so it can never read as "just dial".
export const CALL_RAIL_GUARDRAILS = [
  "Dial only after Jonathan approval is recorded for THIS lead.",
  "Call only during the lead's local business hours.",
  "Respect do-not-call, blacklist, negative-response, cooldown windows, and max-attempt caps.",
  "Do NOT claim guaranteed revenue/cost outcomes or imply review of private call logs.",
  "Log the outcome (call id, disposition, summary, next action) via evidence intake.",
];

/**
 * Build a Retell/Morgan CALL PACKET for an approved A-tier call. Pure — returns a
 * proposal the actor dials from. Triggers no call.
 *
 * @param {object} lead   lead-intent NormalizedLead-compatible
 * @param {object} options { now?, task_id? }
 */
export function buildCallPacket(lead = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const id = clean(lead.lead_id) || slug(lead.company) || "lead";
  const company = clean(lead.company) || "the company";
  const contact = clean(lead.contact_name) || "the person who handles inbound calls";
  const industry = clean(lead.industry) || "service business";
  const angle = clean(lead.intent?.likely_ottoserv_angle) || "AI Lead Handler: answer calls, recover missed calls, qualify and book.";
  const offer = clean(lead.intent?.recommended_offer) || "AI Lead Handler for property managers and home service companies.";
  const evidenceUrls = [clean(lead.source_url), ...asArray(lead.intent?.source_urls).map(clean)].filter(Boolean);

  return {
    kind: "retell_morgan_call_packet",
    schema_version: "1.0",
    generated_at: now,
    lead_id: id,
    execution_rail: "morgan",
    assigned_agent: "Morgan",
    requires_recorded_approval: true,
    related_task_id: clean(options.task_id) || `apx-na-lead-${slug(id)}-call`,
    company,
    contact_name: contact,
    phone: clean(lead.normalized_phone) || clean(lead.phone),
    industry,
    tier: clean(lead.tier) || "A-tier",
    score: Number(lead.score || 0),
    pain_signal: clean(lead.pain_signal) || clean(lead.buying_signal) || "missed-call / slow-follow-up risk",
    personalization_angle: evidenceUrls[0]
      ? `Reference the captured public evidence: ${evidenceUrls[0]}.`
      : `Reference ${company}'s apparent ${industry} workflow and ask how missed calls are handled today.`,
    offer_angle: offer,
    first_call_objective: "Confirm fit, learn how inbound leads/missed calls are handled today, and book a short audit/demo if there is active pain.",
    suggested_opener: `Hi ${contact}, this is OttoServ. We help ${industry} teams stop losing work from missed calls and slow follow-up. Quick question — when ${company} misses a call or gets an after-hours inquiry, what happens right now?`,
    qualification_questions: [
      "How are inbound calls and after-hours inquiries handled today?",
      "Roughly how many calls/leads slip through in a busy week?",
      "Who follows up, and how fast?",
      "What would booking more of those turn into for the business?",
    ],
    objection_handling: {
      "we_have_a_receptionist": "Great — this catches the overflow, after-hours, and missed calls your receptionist can't, and books straight to your calendar.",
      "too_busy_to_set_up": "Setup is on us; you just confirm your call flow and calendar. First value in days, not weeks.",
      "send_info": "Happy to — let's book a 15-minute audit so I send the version that fits your workflow, not a generic deck.",
    },
    source_evidence: evidenceUrls,
    guardrails: CALL_RAIL_GUARDRAILS,
    required_evidence: ["Retell/Morgan call id, disposition/outcome, call summary, and next action."],
    outcome_contract: {
      disposition: "one of: booked_demo | callback_scheduled | not_interested | no_answer | voicemail | bad_number | do_not_call",
      submit_via: "submitActorEvidence({ task_id, actor:'Morgan', evidence:{ evidence_type:'call_outcome', evidence_summary, evidence_reference: call_id }, advance_to })",
    },
    safety_note: "PACKET ONLY — do not dial before a recorded approval for this lead. No call is placed by generating this packet.",
  };
}

// Valid simulated dispositions and whether each closes the loop as a usable outcome.
export const CALL_DISPOSITIONS = {
  booked_demo: { closes_loop: true, next_action: "Open implementation work order / schedule the audit." },
  callback_scheduled: { closes_loop: true, next_action: "Schedule the callback within cooldown and log it." },
  not_interested: { closes_loop: true, next_action: "Mark lead status; do not re-contact within cooldown." },
  voicemail: { closes_loop: true, next_action: "Log attempt; queue one follow-up within attempt cap." },
  no_answer: { closes_loop: true, next_action: "Log attempt; queue retry within attempt cap + cooldown." },
  bad_number: { closes_loop: true, next_action: "Flag lead for re-verification (phone)." },
  do_not_call: { closes_loop: true, next_action: "Add to do-not-call; never re-contact." },
};

/**
 * Build a CLEARLY-FLAGGED simulated call outcome for a packet. Pure — NO real
 * call. Returns the simulated record plus a `submission` ready for the existing
 * `submitActorEvidence` write-back path (so the rail stops reading as idle in
 * fixtures/tests without contacting anyone).
 *
 * @param {object} packet  buildCallPacket output (or { related_task_id, lead_id })
 * @param {object} outcome { disposition?, call_id?, summary?, actor? }
 * @param {object} options { now? }
 */
export function simulateCallOutcome(packet = {}, outcome = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const disposition = CALL_DISPOSITIONS[clean(outcome.disposition)] ? clean(outcome.disposition) : "booked_demo";
  const meta = CALL_DISPOSITIONS[disposition];
  const taskId = clean(outcome.task_id) || clean(packet.related_task_id);
  const leadId = clean(packet.lead_id) || clean(outcome.lead_id);
  const callId = clean(outcome.call_id) || `sim-call-${slug(leadId)}-${slug(now)}`;
  const actor = clean(outcome.actor) || "Morgan";
  const company = clean(packet.company) || leadId;
  const summary = clean(outcome.summary)
    || `[SIMULATED] ${disposition.replace(/_/g, " ")} on call to ${company}. No real dial — fixture/operating-cycle exercise only.`;

  return {
    simulated: true,
    call_id: callId,
    lead_id: leadId,
    task_id: taskId,
    disposition,
    closes_loop: meta.closes_loop,
    outcome_summary: summary,
    next_action: meta.next_action,
    recorded_at: now,
    // Ready to hand straight to submitActorEvidence (evidence write-back path).
    submission: {
      task_id: taskId,
      actor,
      evidence: {
        evidence_type: "simulated_call_outcome",
        evidence_summary: summary,
        evidence_reference: callId,
        submitted_at: now,
        redaction_status: "unredacted",
      },
      advance_to: "evidence_submitted",
    },
  };
}
