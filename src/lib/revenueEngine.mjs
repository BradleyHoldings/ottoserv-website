export const DAILY_REVENUE_CHANNELS = [
  "linkedin_post",
  "linkedin_comment",
  "linkedin_dm",
  "facebook_post_or_group",
  "reddit_comment_or_post",
  "quora_answer",
  "website_blog_post",
  "seo_page",
  "geo_aieo_answer_page",
  "email_outreach",
  "email_follow_up",
  "phone_call_retell_morgan",
  "dm_reply",
  "comment_reply",
  "asset_request",
];

export const APPROVAL_REQUIRED_ACTIONS = [
  "new_pricing_or_guarantee",
  "sensitive_client_message",
  "new_outbound_campaign_launch",
  "calls_to_new_unapproved_list",
  "new_stripe_product_or_pricing",
  "production_deploy",
  "credential_or_security_change",
  "new_production_n8n_activation",
  "high_risk_legal_reputation_financial_action",
];

export const EVIDENCE_REQUIREMENTS = {
  linkedin_post: "Live LinkedIn post URL or screenshot proof.",
  linkedin_comment: "Comment URL or screenshot proof.",
  linkedin_dm: "DM sent proof and recipient context.",
  facebook_post_or_group: "Live Facebook post/group URL or screenshot proof.",
  reddit_comment_or_post: "Reddit URL and account-safe screenshot proof.",
  quora_answer: "Quora answer URL or screenshot proof.",
  website_blog_post: "Published URL, deployment record, and metadata proof.",
  seo_page: "Published URL, sitemap/internal-link proof, metadata proof.",
  geo_aieo_answer_page: "Published URL, answer-target query, metadata, and schema proof.",
  email_outreach: "Email sent record, recipient, timestamp, and reply tracking id.",
  email_follow_up: "Follow-up sent record, recipient, timestamp, and prior context.",
  phone_call_retell_morgan: "Retell call record, call id, outcome, and next action.",
  dm_reply: "Reply screenshot or platform URL with response context.",
  comment_reply: "Reply URL or screenshot proof.",
  asset_request: "Generated asset URL/path and provider/job id.",
  codex_repair: "Commit hash, test output, build output, and route check when relevant.",
  cowork_execution: "Cowork output URL/screenshot/file and execution notes.",
};

const CONTENT_FORMATS = [
  "Founder POV",
  "Insight post",
  "Lesson learned",
  "Educational post",
  "Contrarian take",
  "Process breakdown",
  "Story-based post",
  "Case-study-style post",
  "Comparison post",
  "Short video",
  "Carousel",
  "Image",
  "Blog post",
  "Reddit/Quora answer",
  "SEO/GEO/AIEO page",
];

const REPAIR_ROUTES = [
  { match: /credential|auth|login|session|expired/i, category: "Credential/auth issue", owner: "Cowork", queue: "coworkExecution" },
  { match: /missing data|no data|required field|empty/i, category: "Missing data", owner: "Codex", queue: "codexRepair" },
  { match: /approval|policy|blocked/i, category: "Policy/approval blocked", owner: "Jonathan", queue: "approval" },
  { match: /quality|repetitive|billboard|copy/i, category: "Content quality issue", owner: "Hermes", queue: "approval" },
  { match: /platform limitation|rate limit|unsupported/i, category: "Platform limitation", owner: "Cowork", queue: "coworkExecution" },
  { match: /n8n|workflow/i, category: "n8n workflow failure", owner: "Codex", queue: "codexRepair" },
  { match: /deploy|website|build|page|route/i, category: "Website/deployment failure", owner: "Codex", queue: "codexRepair" },
  { match: /retell|call|morgan|phone/i, category: "Retell/calling failure", owner: "Codex", queue: "codexRepair" },
  { match: /airtable|supabase|database|db|record/i, category: "Airtable/Supabase data issue", owner: "Codex", queue: "codexRepair" },
];

function clean(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function today(now = new Date().toISOString()) {
  return new Date(now).toISOString().slice(0, 10);
}

function makeId(prefix, seed) {
  const base = clean(seed).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${prefix}-${base || Math.random().toString(16).slice(2, 8)}`;
}

function defaultContentAngles(intentionalAngle = "") {
  return [
    clean(intentionalAngle) || "front office handoff bottlenecks",
    "owner time lost to scattered follow-up",
    "tenant maintenance routing and escalation",
    "lead response SLA before adding more tools",
    "before/after operating visibility",
  ];
}

function defaultOutreachAngles() {
  return [
    "recent inbound lead handling",
    "after-hours response coverage",
    "leasing or estimate follow-up gaps",
    "owner visibility into unhandled requests",
  ];
}

function channelAction(channel, index, input) {
  const lowRisk = ["linkedin_comment", "reddit_comment_or_post", "quora_answer", "email_follow_up", "comment_reply", "dm_reply"].includes(channel);
  return createQueueItem({
    id: makeId("daily", `${today(input.now)}-${channel}`),
    channel,
    target_audience: input.icpFocus || "property managers and home service operators",
    offer_cta: input.offerFocus || "$299 front office leak check pilot",
    content_angle: defaultContentAngles(input.intentionalAngle)[index % defaultContentAngles(input.intentionalAngle).length],
    draft_copy_or_instructions: `Execute ${channel.replace(/_/g, " ")} for today's ICP and offer. Keep it specific, useful, and evidence-backed.`,
    execution_owner: channel.includes("phone") ? "Retell/Morgan" : channel.includes("seo") || channel.includes("website") || channel.includes("blog") ? "Codex" : "Cowork",
    risk_level: lowRisk ? "low" : "medium",
    approval_required: !lowRisk && ["linkedin_dm", "email_outreach", "phone_call_retell_morgan"].includes(channel),
    evidence_requirement: EVIDENCE_REQUIREMENTS[channel] || "Execution proof and result/outcome.",
    status: "planned",
    next_action: lowRisk ? "execute" : "review_then_execute",
  });
}

export function createDailyRevenuePlan(input = {}) {
  const runDate = today(input.now);
  const channelActions = DAILY_REVENUE_CHANNELS.map((channel, index) => channelAction(channel, index, input));
  const brokenRails = asArray(input.brokenRails);
  const repairSeed = brokenRails.map((rail) =>
    createRepairPacket({ item_id: rail, channel: rail, expected_behavior: "Execution rail runs daily.", actual_behavior: "Rail is marked broken.", evidence_logs: [] })
  );
  if (brokenRails.length && !repairSeed.some((item) => item.owner === "Codex")) {
    repairSeed.push({
      id: makeId("repair", "revenue-loop-integrity"),
      queue: "codexRepair",
      owner: "Codex",
      category: "Codex repair required",
      what_failed: "Revenue loop execution rail integrity",
      expected_behavior: "Broken execution rails are visible, classified, and repaired through the right owner.",
      actual_behavior: `Broken rails reported: ${brokenRails.join(", ")}`,
      evidence_logs: brokenRails,
      likely_files_or_workflows: ["src/lib/revenueEngine.mjs", "src/lib/dashboardApi.ts", "docs/agent-fallback-rules.md"],
      acceptance_criteria: ["Every broken rail has an owner, repair item, and verification step."],
      verification_steps: ["Run revenue engine tests.", "Verify dashboard state shows repair status.", "Confirm rail owner can receive the packet."],
      status: "open",
      created_at: new Date().toISOString(),
    });
  }

  return {
    run_date: runDate,
    schedule: "Monday-Saturday morning and afternoon",
    cycles: [
      { id: "morning", starts_local: "09:00", objective: "Plan, queue, approve only what needs approval, and start execution rails." },
      { id: "afternoon", starts_local: "14:00", objective: "Verify evidence, repair failures, follow up replies, and move booked-call work." },
    ],
    icp_focus: input.icpFocus || "property managers and home service companies with front office handoff pain",
    offer_focus: input.offerFocus || "$299 front office leak check pilot",
    content_angles: defaultContentAngles(input.intentionalAngle),
    outreach_angles: defaultOutreachAngles(),
    channel_actions: channelActions,
    lead_follow_up_actions: ["Review new A-tier leads", "Send approved B-tier follow-ups", "Route C-tier leads to enrichment"],
    call_queue_actions: ["Queue approved A-tier calls to Retell/Morgan", "Require call id and outcome before completion"],
    website_seo_geo_aieo_actions: ["Create one answer-targeted page or brief", "Update internal links", "Verify metadata/schema"],
    revenue_risks: asArray(input.revenueRisks),
    broken_execution_rails: brokenRails,
    repair_queue_seed: repairSeed,
    execution_queue_seed: channelActions.filter((item) => item.execution_owner === "Cowork" || item.execution_owner === "Retell/Morgan"),
    approval_queue_seed: channelActions.filter((item) => item.approval_required),
  };
}

export function createQueueItem(input = {}) {
  const channel = clean(input.channel) || "manual_revenue_action";
  const now = clean(input.created_at) || new Date().toISOString();
  const executionOwner = clean(input.execution_owner) || "Jarvis";
  return {
    id: clean(input.id) || makeId("rev", `${channel}-${clean(input.target_audience)}-${clean(input.content_angle)}`),
    channel,
    target_audience: clean(input.target_audience) || "OttoServ ICP",
    offer_cta: clean(input.offer_cta) || "Front office leak check",
    content_angle: clean(input.content_angle) || "operational bottleneck",
    draft_copy_or_instructions: clean(input.draft_copy_or_instructions) || "Execute the approved revenue action.",
    execution_owner: executionOwner,
    owner: executionOwner,
    risk_level: clean(input.risk_level) || "low",
    approval_required: Boolean(input.approval_required),
    evidence_requirement: clean(input.evidence_requirement) || EVIDENCE_REQUIREMENTS[channel] || "Execution proof and outcome.",
    status: clean(input.status) || "queued",
    result_outcome: clean(input.result_outcome),
    next_action: clean(input.next_action) || "execute",
    created_at: now,
    updated_at: now,
    evidence: asArray(input.evidence),
    audit_log: asArray(input.audit_log),
  };
}

function queueFromLead(lead) {
  const tier = clean(lead.tier);
  if (tier === "A-tier" && clean(lead.normalized_phone || lead.phone)) {
    return createQueueItem({
      id: makeId("call", lead.lead_id || lead.company),
      channel: "phone_call_retell_morgan",
      target_audience: clean(lead.company) || "A-tier lead",
      offer_cta: "Book a front office leak check",
      content_angle: "approved A-tier call path",
      draft_copy_or_instructions: "Call during local business hours using Jarvis packet guardrails.",
      execution_owner: "Retell/Morgan",
      risk_level: "medium",
      approval_required: false,
      evidence_requirement: EVIDENCE_REQUIREMENTS.phone_call_retell_morgan,
    });
  }
  if (tier === "B-tier" && clean(lead.email)) {
    return createQueueItem({
      id: makeId("email", lead.lead_id || lead.company),
      channel: "email_outreach",
      target_audience: clean(lead.company) || "B-tier lead",
      offer_cta: "Offer a front office leak check",
      content_angle: "fit-based email outreach",
      draft_copy_or_instructions: "Send approved email-first outreach with source context.",
      execution_owner: "Jarvis",
      risk_level: "medium",
      approval_required: false,
      evidence_requirement: EVIDENCE_REQUIREMENTS.email_outreach,
    });
  }
  return createQueueItem({
    id: makeId("enrich", lead.lead_id || lead.company),
    channel: "lead_enrichment",
    target_audience: clean(lead.company) || "lead needing enrichment",
    offer_cta: "Determine safe next action",
    content_angle: "source evidence and fit check",
    draft_copy_or_instructions: "Enrich with website, contact proof, pain signal, and recommended tier.",
    execution_owner: "Cowork",
    risk_level: "low",
    approval_required: false,
    evidence_requirement: "Source URL, website/contact proof, pain signal or reason no signal exists.",
  });
}

function queueFromSocial(item) {
  return createQueueItem({
    id: makeId("social", item.id || item.post_text || item.content),
    channel: clean(item.platform) === "linkedin" ? "linkedin_post" : "facebook_post_or_group",
    target_audience: clean(item.intended_audience) || "service business owners",
    offer_cta: clean(item.cta_status) || "front office leak check",
    content_angle: clean(item.core_insight_or_reframe || item.topic) || "approved social content",
    draft_copy_or_instructions: clean(item.post_text || item.content) || "Publish approved social content.",
    execution_owner: "Cowork",
    risk_level: "low",
    approval_required: false,
    evidence_requirement: clean(item.platform) === "linkedin" ? EVIDENCE_REQUIREMENTS.linkedin_post : EVIDENCE_REQUIREMENTS.facebook_post_or_group,
  });
}

function queueFromSeo(item) {
  return createQueueItem({
    id: clean(item.id) || makeId("seo", item.topic),
    channel: clean(item.type) === "answer_page" ? "geo_aieo_answer_page" : "seo_page",
    target_audience: "service business buyers searching for OttoServ-fit answers",
    offer_cta: "Request a process audit",
    content_angle: clean(item.topic) || "AI receptionist answer opportunity",
    draft_copy_or_instructions: `Create or update ${clean(item.topic) || "SEO/GEO/AIEO opportunity"} with metadata, schema, and internal links.`,
    execution_owner: "Codex",
    risk_level: "low",
    approval_required: false,
    evidence_requirement: EVIDENCE_REQUIREMENTS.geo_aieo_answer_page,
  });
}

export function buildUnifiedQueues(input = {}) {
  const leads = asArray(input.leads);
  const socialItems = asArray(input.socialItems);
  const seoOpportunities = asArray(input.seoOpportunities);
  const failures = asArray(input.failures);
  const leadQueues = leads.map(queueFromLead);
  const socialQueues = socialItems.map(queueFromSocial);
  const seoQueues = seoOpportunities.map(queueFromSeo);
  const repair = failures.map((failure) => routeFailure(failure).repair_item);

  const calls = leadQueues.filter((item) => item.channel === "phone_call_retell_morgan");
  const outreach = leadQueues.filter((item) => item.channel === "email_outreach");
  const coworkExecution = [...leadQueues.filter((item) => item.execution_owner === "Cowork"), ...socialQueues];
  const codexRepair = repair.filter((item) => item.owner === "Codex");
  const approval = [...leadQueues, ...socialQueues, ...seoQueues].filter((item) => item.approval_required);
  const evidenceInbox = [...leadQueues, ...socialQueues, ...seoQueues].filter((item) => item.status === "completed" && !canMarkComplete(item));

  return {
    content: socialQueues,
    outreach,
    calls,
    seoGeoAieo: seoQueues,
    coworkExecution,
    codexRepair,
    approval,
    evidenceInbox,
    replies: [],
  };
}

export function recordEvidence(item, evidence = {}) {
  const at = clean(evidence.recorded_at) || new Date().toISOString();
  const next = {
    ...item,
    evidence: [
      ...asArray(item.evidence),
      {
        evidence_type: clean(evidence.evidence_type) || "proof",
        evidence_url: clean(evidence.evidence_url),
        evidence_path: clean(evidence.evidence_path),
        result_outcome: clean(evidence.result_outcome),
        recorded_by: clean(evidence.recorded_by) || "RevenueEngine",
        recorded_at: at,
      },
    ],
    result_outcome: clean(evidence.result_outcome) || item.result_outcome,
    status: "completed",
    next_action: "monitor_result",
    updated_at: at,
  };
  return {
    ...next,
    audit_log: [...asArray(item.audit_log), { action: "recordEvidence", actor: clean(evidence.recorded_by) || "RevenueEngine", at, detail: evidence }],
  };
}

export function canMarkComplete(item = {}) {
  const evidence = asArray(item.evidence);
  if (!evidence.length) return false;
  return evidence.some((entry) => clean(entry.evidence_url || entry.evidence_path || entry.result_outcome));
}

export function classifyFailure(failure = {}) {
  const haystack = `${failure.channel || ""} ${failure.expected_behavior || ""} ${failure.actual_behavior || ""} ${asArray(failure.evidence_logs).join(" ")}`;
  const route = REPAIR_ROUTES.find((candidate) => candidate.match.test(haystack)) || {
    category: "Codex repair required",
    owner: "Codex",
    queue: "codexRepair",
  };
  return { category: route.category, owner: route.owner, queue: route.queue };
}

export function createRepairPacket(failure = {}) {
  const classification = classifyFailure(failure);
  return {
    id: makeId("repair", failure.item_id || failure.channel || failure.actual_behavior),
    queue: classification.queue,
    owner: classification.owner,
    category: classification.category,
    what_failed: clean(failure.item_id || failure.channel) || "Revenue engine item",
    expected_behavior: clean(failure.expected_behavior) || "Revenue execution rail should complete with evidence.",
    actual_behavior: clean(failure.actual_behavior) || "Failure was reported without details.",
    evidence_logs: asArray(failure.evidence_logs),
    likely_files_or_workflows: likelyFilesFor(classification.category, failure.channel),
    acceptance_criteria: acceptanceCriteriaFor(classification.category),
    verification_steps: ["Run revenue engine tests.", "Verify dashboard state shows repair status.", "Confirm evidence exists before closing the item."],
    status: "open",
    created_at: new Date().toISOString(),
  };
}

function likelyFilesFor(category, channel = "") {
  if (/Retell/.test(category)) return ["src/lib/outreach/callPackets.ts", "src/app/calls/outcomes/route.ts", "scripts/verify-revenue-flow.mjs"];
  if (/n8n/.test(category)) return ["n8n-workflows.json", "scripts/setup-n8n-workflows.py"];
  if (/Website/.test(category)) return ["src/app", "src/lib/seoContent.ts", "scripts/smoke-routes.mjs"];
  if (/Airtable|Supabase/.test(category)) return ["supabase-schema.sql", "src/lib/dashboardApi.ts"];
  if (/Credential|Platform/.test(category) || /linkedin|facebook|reddit|quora/i.test(channel)) return ["C:\\OttoServ\\Hermes\\data\\cowork_cdp_executor", "docs/agent-fallback-rules.md"];
  return ["src/lib/revenueEngine.mjs", "src/lib/dashboardApi.ts"];
}

function acceptanceCriteriaFor(category) {
  if (/Retell/.test(category)) return ["Call queue accepts approved A-tier lead and produces a call id or explicit blocked reason.", "Call outcome is logged with evidence."];
  if (/Credential/.test(category)) return ["Cowork/browser rail has valid session proof or routes to approval for credential repair."];
  if (/Content/.test(category)) return ["Content item passes billboard-risk guardrails and includes a specific operational insight."];
  return ["Expected behavior is restored.", "Evidence is attached.", "Dashboard health no longer reports this repair as open."];
}

export function routeFailure(failure = {}) {
  const classification = classifyFailure(failure);
  return {
    ...classification,
    repair_item: createRepairPacket(failure),
  };
}

export function getContentIntelligence(input = {}) {
  const recentPosts = asArray(input.recentPosts).map((post) => clean(post).toLowerCase());
  const repeatedBillboardCount = recentPosts.filter((post) => /leaking revenue|missed calls/.test(post)).length;
  const sourceInsights = asArray(input.sourceInsights).map(clean).filter(Boolean);
  const recommended = [
    clean(input.intentionalAngle),
    ...sourceInsights.map((insight) => insight.replace(/^a prospect said\s*/i, "").replace(/\.$/, "")),
    "sales-call objection breakdown",
    "before/after operational improvement",
    "industry-specific workflow problem",
  ].filter(Boolean);

  return {
    billboard_risk: repeatedBillboardCount >= 2 ? "high" : "normal",
    blocked_phrases: repeatedBillboardCount >= 2 ? ["leaking revenue", "missed calls"] : [],
    recommended_angles: [...new Set(recommended)],
    source_inputs: ["OttoServ insights", "Front Office Leak Check findings", "Process audit findings", "Prospect objections", "Sales calls", "Customer pain points", "High-performing posts", "Field observations"],
    formats: CONTENT_FORMATS,
    daily_guardrail: clean(input.intentionalAngle)
      ? `Use ${clean(input.intentionalAngle)} as today's intentional angle; avoid generic billboard phrasing.`
      : "Use one specific operational observation; do not reuse generic leak/missed-call copy unless it is today's intentional angle.",
  };
}

export function getSeoGeoAieoOpportunities(input = {}) {
  const focusTopics = asArray(input.focusTopics).length ? asArray(input.focusTopics) : ["AI receptionist", "front office automation", "missed call recovery"];
  const industries = asArray(input.industries).length ? asArray(input.industries) : ["plumbing", "HVAC", "electrical", "roofing", "property management"];
  const opportunities = [];

  for (const topic of focusTopics) {
    opportunities.push(opportunity("blog_post", `${topic} implementation guide`, topic, industries[0]));
    opportunities.push(opportunity("geo_aieo_answer_page", `What is ${topic} for ${industries[0]}?`, topic, industries[0]));
  }
  for (const industry of industries) {
    opportunities.push(opportunity("industry_page", `AI employee workflows for ${industry}`, focusTopics[0], industry));
    opportunities.push(opportunity("comparison_page", `OttoServ vs generic answering services for ${industry}`, focusTopics[0], industry));
  }
  return opportunities;
}

function opportunity(type, title, topic, industry) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    id: makeId("seo", slug),
    type,
    topic: title,
    target_query: title,
    draft_sections: ["Direct answer", "Who this helps", "Workflow problem", "OttoServ operating fix", "FAQ", "CTA"],
    metadata: {
      title: `${title} | OttoServ`,
      description: `Practical OttoServ guidance on ${topic} for ${industry} teams that need cleaner front office operations.`,
    },
    schema_recommendations: type.includes("answer") ? ["FAQPage", "Article"] : ["Article", "BreadcrumbList"],
    internal_links: ["/front-office-leak-check", "/process-audit", "/ai-receptionist"],
    evidence_requirement: EVIDENCE_REQUIREMENTS.geo_aieo_answer_page,
  };
}

export function getDashboardState(input = {}) {
  const plan = createDailyRevenuePlan(input);
  const seoOpportunities = input.seoOpportunities || getSeoGeoAieoOpportunities({ focusTopics: ["AI receptionist"], industries: ["property management"] }).slice(0, 2);
  const queues = buildUnifiedQueues({ ...input, seoOpportunities });
  const repairQueue = asArray(input.failures).map((failure) => routeFailure(failure).repair_item);
  const brokenRails = repairQueue.map((item) => ({ id: item.id, category: item.category, owner: item.owner, status: item.status }));
  const queueCounts = Object.fromEntries(Object.entries(queues).map(([key, value]) => [key, value.length]));
  const evidenceInbox = Object.values(queues).flat().filter((item) => item.status === "completed" && !canMarkComplete(item));

  return {
    engine: "RevenueEngine",
    todayPlan: plan,
    queues,
    queueCounts,
    approvalQueue: queues.approval,
    evidenceInbox,
    repairQueue,
    brokenRails,
    channelPerformance: input.channelPerformance || {},
    revenueMovement: {
      leads_ready: asArray(input.leads).length,
      calls_ready: queues.calls.length,
      repairs_open: repairQueue.length,
      booked_calls: Number(input.bookedCalls || 0),
    },
    selfRepairStatus: repairQueue.length ? "repairs_open" : "clear",
    nextAction: repairQueue.length ? "repair broken rails before scaling volume" : "run morning queue and verify evidence",
  };
}

export function getHealthStatus(input = {}) {
  const state = getDashboardState(input);
  const evidenceGaps = Object.values(state.queues).flat().filter((item) => item.status === "completed" && !canMarkComplete(item)).length;
  const errors = [];
  if (state.repairQueue.length) errors.push(`${state.repairQueue.length} repair item${state.repairQueue.length === 1 ? "" : "s"} open.`);
  if (evidenceGaps) errors.push(`${evidenceGaps} completed item${evidenceGaps === 1 ? "" : "s"} missing evidence.`);
  return {
    service: "RevenueEngine",
    status: errors.length ? "degraded" : "healthy",
    schedule: "Monday-Saturday morning and afternoon",
    repair_count: state.repairQueue.length,
    evidence_gap_count: evidenceGaps,
    queue_counts: state.queueCounts,
    errors,
  };
}

export function createDailyLoopRun(input = {}) {
  const plan = createDailyRevenuePlan(input);
  const dashboard = getDashboardState(input);
  const health = getHealthStatus(input);
  const allQueues = Object.values(dashboard.queues).flat();
  const maxVolume = Number(input.maxVolume || 10);

  return {
    id: makeId("revenue-loop", `${plan.run_date}-${input.cycle || "daily"}`),
    status: health.repair_count > 0 ? "repair_first" : "ready",
    schedule: plan.schedule,
    volume_policy: "repair-before-scale",
    max_volume: maxVolume,
    plan,
    queues: dashboard.queues,
    health,
    executionPackets: allQueues.slice(0, maxVolume).map((item) => ({
      id: item.id,
      owner: item.execution_owner,
      channel: item.channel,
      instructions: item.draft_copy_or_instructions,
      evidence_requirement: item.evidence_requirement,
      risk_level: item.risk_level,
      approval_required: item.approval_required,
    })),
    repairPackets: dashboard.repairQueue,
  };
}
