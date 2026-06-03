// ─── Cowork lead-intent research task generator ───────────────────────────────
//
// When the pipeline lacks recent-intent leads, Hermes must NOT invent data. The
// safe, honest mechanism is to dispatch precise browser/manual research tasks to
// Cowork with exact search queries, the enrichment fields to capture, evidence
// requirements, scoring rules, and compliance limits. Cowork returns enriched
// lead rows that feed back through the lead-intent pipeline (npm run lead:intake).
//
// PURE + SAFE: builds task descriptions only. No scraping, no network, no outreach.
// Channels here are PUBLIC search surfaces; closed/private groups are explicitly
// out of scope unless Cowork has permission.

const ICP_QUERY_TERMS = {
  plumbing: "plumber OR plumbing company",
  hvac: "HVAC OR heating and cooling company",
  electrical: "electrician OR electrical contractor",
  roofing: "roofer OR roofing company",
  remodeling_contractor: "remodeler OR general contractor OR home renovation",
  property_management: "property management OR property manager OR leasing office",
  home_services: "home service business (landscaping, cleaning, pest, pool, handyman)",
};

const PAIN_PHRASES = [
  "missing calls / can't keep up with the phones",
  "no one answers after hours / losing leads after hours",
  "slow to follow up on leads / quotes",
  "scheduling / dispatch is a mess",
  "drowning in admin / paperwork / invoicing",
  "need help with CRM / software integration",
  "hiring a dispatcher / office admin / call center",
  "bad reviews about no-shows / response time / missed appointments",
];

// Public surfaces Cowork can research, with per-source query templates and the
// evidence each requires. Closed communities require explicit permission.
function sourceTasks(icpTerm, location) {
  const loc = location ? ` ${location}` : "";
  return [
    {
      source: "reddit_public",
      access: "public_search",
      queries: [
        `site:reddit.com (${icpTerm}) (missed calls OR after hours OR scheduling OR dispatch OR follow up OR CRM)`,
        `reddit small business owner ${icpTerm} "missing calls" OR "can't keep up with the phone"`,
        `reddit (r/smallbusiness OR r/Entrepreneur OR r/HVAC OR r/Plumbing OR r/electricians) ${icpTerm} answering service OR receptionist`,
      ],
      evidence_required: "Permalink to the public post/comment + the exact quoted snippet + post date.",
    },
    {
      source: "google_reviews",
      access: "public_search",
      queries: [
        `${icpTerm}${loc} google reviews "didn't answer" OR "never called back" OR "no show" OR "couldn't reach"`,
        `${icpTerm}${loc} reviews response time scheduling complaints`,
      ],
      evidence_required: "Business profile URL + 2+ review snippets about response/scheduling + review dates.",
    },
    {
      source: "job_posts_public",
      access: "public_search",
      queries: [
        `${icpTerm}${loc} hiring "dispatcher" OR "office administrator" OR "call center" OR "receptionist" OR "scheduler"`,
        `indeed OR ziprecruiter ${icpTerm}${loc} dispatcher OR front office`,
      ],
      evidence_required: "Job posting URL + role title + posting date (hiring ops/admin = operational strain).",
    },
    {
      source: "linkedin_public_posts",
      access: "public_search_only",
      queries: [
        `site:linkedin.com/posts ${icpTerm} (missed calls OR scheduling OR follow up OR hiring dispatcher)`,
        `${icpTerm}${loc} owner linkedin post operations bottleneck`,
      ],
      evidence_required: "Public post URL + snippet + date. Do NOT use private/connection-only content.",
    },
    {
      source: "directories_and_websites",
      access: "public_search",
      queries: [
        `${icpTerm}${loc} site:*.com contact (phone, contact form)`,
        `${icpTerm}${loc} "request a quote" OR "contact us" small team`,
      ],
      evidence_required: "Company website URL + phone/contact-form presence (for ICP-fit/evergreen leads).",
    },
    {
      source: "trade_forums",
      access: "public_search",
      queries: [
        `(${icpTerm}) forum (answering service OR missed calls OR scheduling software OR dispatch) site:contractortalk.com OR site:hvac-talk.com`,
      ],
      evidence_required: "Thread URL + quoted operator pain + date.",
    },
  ];
}

export const LEAD_INTENT_SCORING_RULES = {
  very_high: "Explicit problem/request in last 30 days (e.g. 'we keep missing calls, what do people use?').",
  high: "Relevant operational pain in last 90 days.",
  medium_high: "Hiring admin/dispatcher/call-center/ops role, OR repeated bad reviews about response time/scheduling/no-shows.",
  medium: "Strong ICP fit but no recent intent (evergreen_fit).",
  reject: "Poor fit, vendor/agency, or no contact path.",
  evidence_rule: "Never mark a lead high-intent without a public, recent, explainable source URL + snippet + date.",
};

const ENRICHMENT_FIELDS = [
  "business_name", "website", "phone", "email", "location", "industry", "decision_maker",
  "source_url (and source_urls)", "date_of_signal", "intent_type", "intent_evidence_summary",
  "evidence_snippet", "pain_point", "likely_ottoserv_angle", "recommended_offer",
];

/**
 * Build Cowork research task packets to refill the intent pipeline.
 * @param {object} options { icps?: string[], location?: string, now?: string,
 *   targetPerIcp?: number, reason?: string }
 */
export function buildLeadIntentResearchTasks(options = {}) {
  const now = options.now || new Date().toISOString();
  const icps = Array.isArray(options.icps) && options.icps.length
    ? options.icps
    : ["plumbing", "hvac", "electrical", "roofing", "remodeling_contractor", "property_management"];
  const location = options.location || "";
  const targetPerIcp = Number(options.targetPerIcp || 5);

  const tasks = icps.map((icp) => {
    const icpTerm = ICP_QUERY_TERMS[icp] || icp;
    return {
      task_id: `cowork-intent-${icp}-${now.slice(0, 10)}`,
      source: "lead_intent_research",
      execution_rail: "cowork",
      assigned_agent: "Cowork",
      mission_title: `Find ${targetPerIcp}+ evidence-backed intent leads: ${icp}${location ? ` (${location})` : ""}`,
      business_objective: "Refill OttoServ's recent-intent lead pipeline with public, evidence-backed leads.",
      icp,
      requested_action:
        `Research PUBLIC sources for ${icpTerm} showing recent operational pain or buying intent ` +
        `(${PAIN_PHRASES.join("; ")}). Capture ${targetPerIcp}+ leads with the enrichment fields below.`,
      sources: sourceTasks(icpTerm, location),
      enrichment_fields_to_capture: ENRICHMENT_FIELDS,
      scoring_rules: LEAD_INTENT_SCORING_RULES,
      evidence_requirements: [
        "Every high-intent lead MUST include a public source URL, an exact quoted snippet, and the date.",
        "Prefer signals from the last 30 days; then last 90 days; then ICP-fit (evergreen).",
        "Record date_of_signal so the pipeline can compute the signal window.",
      ],
      forbidden_actions: [
        "Do NOT contact, email, call, or DM any lead.",
        "Do NOT scrape or join private/closed groups without explicit permission.",
        "Do NOT fabricate evidence or infer intent without a citation.",
        "Do NOT violate any platform's terms of service.",
      ],
      success_criteria: [
        `${targetPerIcp}+ leads returned in the lead-intent input shape.`,
        "Each high-intent lead has source_url + snippet + date.",
        "Output is valid JSON ready for `npm run lead:intake`.",
      ],
      output_format: "JSON array of enriched lead objects (see data/lead-intent/examples/research-results.example.json).",
      risk_level: "low",
      priority: "high",
      created_at: now,
      status: "queued",
      reason: options.reason || "Recent-intent lead volume below threshold.",
    };
  });

  return { generated_at: now, count: tasks.length, tasks };
}
