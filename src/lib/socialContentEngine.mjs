export const CONTENT_PILLARS = [
  "AI/product updates relevant to service businesses",
  "Building/construction/trades industry trends",
  "Revenue leaks and front office breakdowns",
  "Process/operations fixes",
  "OttoServ build-in-public / thought leadership",
];

export const CONTENT_ANGLE_RULES = [
  "missed calls",
  "slow follow-up",
  "admin overload",
  "scheduling chaos",
  "estimate follow-up",
  "labor shortages",
  "customer response-time expectations",
  "CRM mess",
  "lead qualification",
  "revenue leakage",
  "operational visibility",
];

export const CONTENT_MONITORING_TOPICS = {
  aiProductUpdates: [
    "AI tools and product releases",
    "OpenAI",
    "Google",
    "Zapier",
    "n8n",
    "Vapi",
    "Retell",
    "HeyGen",
  ],
  fieldServiceSoftware: [
    "Field service software updates",
    "ServiceTitan",
    "Jobber",
    "Housecall Pro",
    "HubSpot",
  ],
  industryTrends: [
    "construction industry trends",
    "trades labor shortages",
    "material cost trends",
    "data center and infrastructure construction demand",
    "housing trends",
    "remodeling trends",
    "property management trends",
    "service business trends",
    "customer response-time expectations",
    "contractor profitability and operational bottlenecks",
  ],
};

export const CONTENT_LIFECYCLE_STATUSES = [
  "Idea",
  "Researching",
  "Ready for Draft",
  "Drafted",
  "Pending Approval",
  "Approved",
  "Asset Generation",
  "Ready to Publish",
  "Published",
  "Winner",
  "Repurpose",
  "Archived",
];

export const DISTRIBUTION_STATUSES = [
  "Not Ready",
  "Ready for Manual Posting",
  "Ready for Cowork",
  "Ready for Distribution",
  "Submitted to Blotato",
  "Published",
  "Needs Fix",
  "Failed",
  "Needs Approval",
  "No Post Prepared",
];

export const PERFORMANCE_LABELS = ["Dead", "Average", "Promising", "Winner"];

export const requiredAirtableFields = [
  "Topic",
  "Content Pillar",
  "Target Audience",
  "Source Links",
  "Research Summary",
  "Source Link",
  "Factual Summary",
  "Why This Matters",
  "Operational Issue",
  "OttoServ Point of View",
  "Angle",
  "Hook",
  "OttoServ Tie-In",
  "CTA",
  "Script",
  "HeyGen Script",
  "Short Script",
  "LinkedIn Post",
  "Facebook Post",
  "Instagram Caption",
  "X/Twitter Post",
  "Short Caption",
  "Carousel Outline",
  "Front Office Leak Check CTA",
  "Asset Type",
  "Image Prompt",
  "Video Prompt",
  "Image Asset URL",
  "Video Asset URL",
  "Status",
  "Approval Status",
  "Distribution Status",
  "Platforms",
  "Scheduled Date",
  "Published URLs",
  "Views",
  "Watch Time",
  "Likes",
  "Comments",
  "Shares",
  "Leads Generated",
  "Performance Notes",
  "Repurpose Status",
  "Assigned Operator",
  "Published URL",
  "Posted Date",
  "Posting Notes",
  "Needs Fix Reason",
];

export const COWORK_QUEUE_VIEW = {
  name: "Cowork Posting Queue",
  filters: [
    { field: "Approval Status", operator: "is", value: "Approved" },
    { field: "Distribution Status", operator: "is", value: "Ready for Manual Posting" },
    { field: "Scheduled Date", operator: "is empty or on/before", value: "today" },
  ],
  fields: [
    "Topic",
    "Platform",
    "Post Text",
    "Caption",
    "Asset URL",
    "CTA",
    "Scheduled Date",
    "Status",
    "Notes",
  ],
};

const PLATFORM_COPY = {
  linkedin: { label: "LinkedIn Post", opener: "Operator note:" },
  facebook: { label: "Facebook Post", opener: "Quick owner check:" },
  instagram: { label: "Instagram Caption", opener: "Save this ops fix:" },
  twitter: { label: "X/Twitter Post", opener: "Service business ops:" },
};

function clean(value) {
  return String(value || "").trim();
}

function normalizeDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function pickAngle(inputAngle = "") {
  const normalized = clean(inputAngle).toLowerCase();
  return CONTENT_ANGLE_RULES.find((angle) => normalized.includes(angle)) || "slow follow-up";
}

function sentence(value, fallback) {
  const text = clean(value) || fallback;
  return text.endsWith(".") ? text : `${text}.`;
}

function listPhrase(items, fallback) {
  const values = Array.isArray(items) ? items.filter(Boolean).map(clean).filter(Boolean) : [];
  if (values.length === 0) return fallback;
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}

export function buildContentOpportunity(input = {}) {
  const sourceLink = clean(input.sourceLink || input["Source Link"]);
  const topic = clean(input.topic) || "an industry update service businesses should understand";
  const trendType = clean(input.trendType) || "AI/product updates and service business trends";
  const affectedBusinesses = listPhrase(
    input.affectedBusinesses,
    "HVAC, plumbing, roofing, electrical, property management, remodeling, or construction businesses"
  );
  const factualSummary = sentence(
    input.factualSummary,
    `A new ${trendType.toLowerCase()} signal changed how service businesses should think about inbound demand, customer response, or operating visibility`
  );
  const operationalIssue = pickAngle(input.operationalIssue || input.angle || factualSummary);
  const whyThisMatters =
    `This matters to ${affectedBusinesses} because the business impact is rarely the tool itself. The impact shows up in missed calls, slower follow-up, scheduling gaps, admin overload, and jobs that do not get booked while the owner is busy.`;
  const ottoServPointOfView =
    "OttoServ is the AI operations brief for service businesses — translating industry trends, AI updates, and operational changes into practical ways to reduce missed calls, improve follow-up, book more jobs, and run cleaner systems.";
  const frontOfficeLeakCheckCta =
    "Run a front office leak check: look at the last 20 inbound leads and mark every missed call, slow reply, unscheduled estimate, and unclear owner. That is where the revenue leak starts.";
  const hook = `What changed: ${topic}.`;
  const action = `Action: tighten the handoff around ${operationalIssue}. Make sure every call, web lead, estimate request, and scheduling question has a clear next step.`;
  const heyGenScript = [
    "45-60 second HeyGen script:",
    hook,
    factualSummary,
    `Why it matters: ${whyThisMatters}`,
    `The operational issue behind it is ${operationalIssue}.`,
    ottoServPointOfView,
    action,
    frontOfficeLeakCheckCta,
  ].join("\n\n");
  const shortVersion = [
    "15-25 second short version:",
    `${topic} is not just news. For service businesses, it points back to ${operationalIssue}.`,
    "If the update helps you answer faster, follow up cleaner, or see the leak sooner, it matters.",
    "Start with a front office leak check.",
  ].join(" ");
  const linkedInPost = [
    `${hook}`,
    "",
    factualSummary,
    "",
    `Why it matters to ${affectedBusinesses}: the cost usually shows up as missed calls, slow follow-up, scheduling chaos, admin overload, or weak operational visibility.`,
    "",
    `${ottoServPointOfView}`,
    "",
    frontOfficeLeakCheckCta,
  ].join("\n");
  const facebookPost =
    `Owner note: ${topic}\n\n${factualSummary}\n\nThis matters because ${operationalIssue} turns into lost jobs when calls, estimates, and scheduling requests do not get handled quickly.\n\n${frontOfficeLeakCheckCta}`;
  const instagramCaption =
    `${topic}\n\nNot hype. The question is simple: does this help reduce missed calls, slow follow-up, admin overload, or a front office leak?\n\n${frontOfficeLeakCheckCta}`;
  const twitterPost =
    `${topic}: useful for service businesses only if it reduces a revenue leak — missed calls, slow follow-up, scheduling chaos, or admin overload. Start with a front office leak check.`;
  const carouselOutline = [
    `Slide 1: ${topic}`,
    `Slide 2: What changed — ${factualSummary}`,
    `Slide 3: Why ${affectedBusinesses} should care`,
    `Slide 4: The operational issue — ${operationalIssue}`,
    "Slide 5: OttoServ POV — translate the trend into a cleaner front-office system",
    "Slide 6: CTA — run a front office leak check",
  ];

  return {
    sourceLink,
    topic,
    trendType,
    factualSummary,
    whyThisMatters,
    operationalIssue,
    ottoServPointOfView,
    heyGenScript,
    shortVersion,
    linkedInPost,
    facebookPost,
    instagramCaption,
    twitterPost,
    carouselOutline,
    frontOfficeLeakCheckCta,
    status: "Ready for Draft",
    approvalStatus: "Not Submitted",
    distributionStatus: "Not Ready",
  };
}

export function buildStructuredContentDraft(input = {}) {
  const topic = clean(input.topic) || "service business response-time expectations";
  const contentPillar = clean(input.contentPillar) || CONTENT_PILLARS[0];
  const targetAudience = clean(input.targetAudience) || "owners and operators of service businesses";
  const researchSummary = sentence(
    input.researchSummary,
    "Service businesses are under pressure to respond faster while keeping front-office work organized"
  );
  const angle = pickAngle(input.angle || researchSummary);
  const sourceLinks = Array.isArray(input.sourceLinks) ? input.sourceLinks.filter(Boolean) : [];
  const hook = `Most service business owners do not need more AI hype. They need to know how ${topic} affects ${angle}.`;
  const ottoServTieIn =
    "OttoServ is the AI operations brief for service businesses: it turns noisy market and product updates into practical fixes for missed calls, slow follow-up, scheduling chaos, and revenue leakage.";
  const cta = clean(input.cta) || "Want the practical version for your front office? Follow OttoServ for the daily ops brief.";
  const brief = {
    topic,
    contentPillar,
    targetAudience,
    sourceLinks,
    researchSummary,
    angle,
    hook,
    ottoServTieIn,
    cta,
  };
  const script = [
    hook,
    researchSummary,
    `For ${targetAudience}, the question is not whether the tool is impressive. The question is where it removes a real operating bottleneck: ${angle}, missed calls, CRM mess, lead qualification, or slow estimate follow-up.`,
    "The practical move is to pick one leak, define the next-step SLA, and make sure every lead or customer request has an owner, timestamp, and follow-up path.",
    ottoServTieIn,
    cta,
  ].join("\n\n");
  const shortScript = [
    `Here is the owner-friendly version of ${topic}: connect it to ${angle}, not AI hype.`,
    "If it helps your team respond faster, qualify better, or see the revenue leak sooner, it matters.",
    "If it does not change the next step for a customer, ignore it for now.",
    "That is the OttoServ lens.",
  ].join(" ");
  const linkedInPost = `${PLATFORM_COPY.linkedin.opener} ${hook}\n\n${researchSummary}\n\n${ottoServTieIn}\n\n${cta}`;
  const facebookPost = `${PLATFORM_COPY.facebook.opener} ${topic} only matters if it fixes ${angle}, missed calls, or slow follow-up.\n\n${researchSummary}\n\n${cta}`;
  const instagramCaption = `${PLATFORM_COPY.instagram.opener} ${topic}\n\nThe filter: does this reduce ${angle}, admin overload, or revenue leakage?\n\n${cta}`;
  const twitterPost = `${PLATFORM_COPY.twitter.opener} ${topic} is useful only if it fixes ${angle}, missed calls, slow follow-up, or revenue leakage. OttoServ translates the update into the operating move.`;
  const shortCaption = `${topic}: practical if it reduces ${angle} or revenue leakage.`;
  const imagePrompt =
    `Owner-friendly static visual for OttoServ showing a service business front office turning ${angle} into clear next steps. Practical, direct, useful, no generic AI hype.`;
  const videoPrompt =
    `45-60 second Hyperframes video for OttoServ. Topic: ${topic}. Audience: ${targetAudience}. Show the operational pain (${angle}), the practical fix, and the OttoServ tie-in as the AI operations brief for service businesses.`;

  return {
    ...brief,
    script,
    shortScript,
    linkedInPost,
    facebookPost,
    instagramCaption,
    twitterPost,
    shortCaption,
    assetType: "image_and_video",
    imagePrompt,
    videoPrompt,
    status: "Drafted",
    approvalStatus: "Pending Approval",
    distributionStatus: "Not Ready",
  };
}

export function buildAssetGenerationRequests(draft, options = {}) {
  const assetType = clean(options.assetType || draft?.assetType || "image_and_video");
  const requests = [];

  if (assetType === "image" || assetType === "image_and_video") {
    requests.push({
      provider: "openai-image",
      kind: "image",
      prompt: draft.imagePrompt,
      outputField: "Image Asset URL",
    });
  }

  if (assetType === "video" || assetType === "image_and_video") {
    requests.push({
      provider: "hyperframes",
      kind: "video",
      prompt: draft.videoPrompt,
      outputField: "Video Asset URL",
    });
  }

  return requests;
}

function normalizeQueueRow(row = {}) {
  return {
    id: row.id,
    topic: row.topic || row.Topic || "",
    platform: row.platform || row.Platform || "",
    postText: row.postText || row["Post Text"] || row.content || "",
    caption: row.caption || row.Caption || "",
    assetUrl: row.assetUrl || row["Asset URL"] || row.imageAssetUrl || row.videoAssetUrl || "",
    cta: row.cta || row.CTA || "",
    scheduledDate: row.scheduledDate || row["Scheduled Date"] || row.scheduled_at || null,
    status: row.status || row.Status || "",
    notes: row.notes || row.Notes || "",
    assignedOperator: row.assignedOperator || row["Assigned Operator"] || "",
    publishedUrl: row.publishedUrl || row["Published URL"] || "",
    postedDate: row.postedDate || row["Posted Date"] || null,
    postingNotes: row.postingNotes || row["Posting Notes"] || "",
    needsFixReason: row.needsFixReason || row["Needs Fix Reason"] || "",
  };
}

export function filterCoworkPostingQueue(rows = [], now = new Date()) {
  const today = normalizeDateOnly(now);

  return rows
    .filter((row) => {
      const approval = row.approvalStatus || row["Approval Status"];
      const distribution = row.distributionStatus || row["Distribution Status"];
      const scheduled = row.scheduledDate || row["Scheduled Date"] || row.scheduled_at;
      const scheduledDay = normalizeDateOnly(scheduled);

      return (
        approval === "Approved" &&
        distribution === "Ready for Manual Posting" &&
        (!scheduledDay || !today || scheduledDay <= today)
      );
    })
    .map(normalizeQueueRow);
}

export function buildBlotatoDistributionPayload(record = {}) {
  const approval = record.approvalStatus || record["Approval Status"];
  const distribution = record.distributionStatus || record["Distribution Status"];

  if (approval !== "Approved") {
    throw new Error("Cannot distribute content before Approval Status is Approved.");
  }
  if (!["Ready for Distribution", "Ready for Manual Posting"].includes(distribution)) {
    throw new Error("Distribution Status must be ready before building a publishing payload.");
  }

  return {
    source: "airtable",
    recordId: record.id,
    platform: record.platform || record.Platform,
    text: record.postText || record["Post Text"] || record.content || "",
    caption: record.caption || record.Caption || "",
    mediaUrl: record.assetUrl || record["Asset URL"] || record.videoAssetUrl || record.imageAssetUrl || "",
    scheduledAt: record.scheduledDate || record["Scheduled Date"] || null,
    requiresHumanApproval: false,
  };
}

export function classifyPerformance(metrics = {}) {
  const views = Number(metrics.views || 0);
  const watchTime = Number(metrics.watchTime || 0);
  const likes = Number(metrics.likes || 0);
  const comments = Number(metrics.comments || 0);
  const shares = Number(metrics.shares || 0);
  const leadsGenerated = Number(metrics.leadsGenerated || 0);
  const engagement = likes + comments * 2 + shares * 3;
  const engagementRate = views > 0 ? engagement / views : 0;
  const watchSignal = views > 0 ? watchTime / views : 0;

  let label = "Dead";
  if (views >= 3000 || leadsGenerated >= 2 || engagementRate >= 0.04 || watchSignal >= 0.4) {
    label = "Winner";
  } else if (views >= 1500 || leadsGenerated >= 1 || engagementRate >= 0.025) {
    label = "Promising";
  } else if (views >= 500 || engagement > 10) {
    label = "Average";
  }

  return {
    label,
    engagementRate,
    repurposeOptions:
      label === "Winner"
        ? ["short video", "carousel", "longer post", "blog/article", "ad creative candidate"]
        : label === "Promising"
          ? ["another short video", "carousel"]
          : [],
  };
}

const SOCIAL_WORKFLOW_STATUSES = [
  "draft",
  "pending_review",
  "reviewed",
  "approved",
  "routed_to_executor",
  "published",
  "failed",
  "fallback",
  "rejected",
];

const DEFAULT_SOCIAL_ITEM = {
  id: "",
  platform: "linkedin",
  content_type: "post",
  post_text: "",
  asset_path: "",
  asset_url: "",
  status: "draft",
  content_category: "",
  core_insight_or_reframe: "",
  intended_audience: "",
  cta_status: "not_ready",
  billboard_risk_score: 0,
  social_strategy_review: null,
  created_by: "Codex",
  reviewed_by: "",
  approved_by: "",
  created_at: "",
  reviewed_at: "",
  approved_at: "",
  scheduled_for: "",
  handed_to_cowork_at: "",
  published_at: "",
  published_url: "",
  evidence_path: "",
  evidence_url: "",
  failure_reason: "",
  fallback_owner: "",
  next_action: "submit_for_review",
  learning_tags: [],
  performance_notes: "",
  audit_log: [],
  executor: "",
  executor_handoff: null,
};

function isoNow(clock) {
  const value = typeof clock === "function" ? clock() : new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix, sequence) {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

function normalizeSocialStatus(value = "") {
  const status = clean(value).toLowerCase();
  if (["pending", "pending approval", "pending_review", "needs approval"].includes(status)) return "pending_review";
  if (["ready_to_publish", "ready to publish", "approved"].includes(status)) return "approved";
  if (["routed", "routed_to_executor", "ready for cowork"].includes(status)) return "routed_to_executor";
  if (["published", "posted"].includes(status)) return "published";
  if (["failed", "needs fix"].includes(status)) return "failed";
  if (["rejected"].includes(status)) return "rejected";
  return SOCIAL_WORKFLOW_STATUSES.includes(status) ? status : "draft";
}

function appendAudit(item, action, actor, detail, at) {
  const entry = {
    action,
    actor: clean(actor) || "SocialEngine",
    detail: detail || {},
    at,
  };
  return {
    ...item,
    audit_log: [...(Array.isArray(item.audit_log) ? item.audit_log : []), entry],
  };
}

function ensureItemShape(input = {}, now, id) {
  const item = {
    ...DEFAULT_SOCIAL_ITEM,
    ...input,
    id: clean(input.id) || id,
    platform: clean(input.platform) || DEFAULT_SOCIAL_ITEM.platform,
    content_type: clean(input.content_type || input.contentType) || DEFAULT_SOCIAL_ITEM.content_type,
    post_text: clean(input.post_text || input.postText || input.content),
    asset_path: clean(input.asset_path || input.assetPath),
    asset_url: clean(input.asset_url || input.assetUrl || input.mediaUrl),
    status: normalizeSocialStatus(input.status),
    content_category: clean(input.content_category || input.contentCategory || input.contentPillar),
    core_insight_or_reframe: clean(input.core_insight_or_reframe || input.coreInsightOrReframe || input.angle),
    intended_audience: clean(input.intended_audience || input.intendedAudience || input.targetAudience),
    cta_status: clean(input.cta_status || input.ctaStatus) || DEFAULT_SOCIAL_ITEM.cta_status,
    billboard_risk_score: Number(input.billboard_risk_score ?? input.billboardRiskScore ?? 0),
    created_by: clean(input.created_by || input.createdBy) || DEFAULT_SOCIAL_ITEM.created_by,
    reviewed_by: clean(input.reviewed_by || input.reviewedBy),
    approved_by: clean(input.approved_by || input.approvedBy),
    created_at: clean(input.created_at || input.createdAt) || now,
    reviewed_at: clean(input.reviewed_at || input.reviewedAt),
    approved_at: clean(input.approved_at || input.approvedAt),
    scheduled_for: clean(input.scheduled_for || input.scheduledFor || input.scheduled_at),
    handed_to_cowork_at: clean(input.handed_to_cowork_at || input.handedToCoworkAt),
    published_at: clean(input.published_at || input.publishedAt || input.postedDate),
    published_url: clean(input.published_url || input.publishedUrl),
    evidence_path: clean(input.evidence_path || input.evidencePath),
    evidence_url: clean(input.evidence_url || input.evidenceUrl),
    failure_reason: clean(input.failure_reason || input.failureReason || input.needsFixReason),
    fallback_owner: clean(input.fallback_owner || input.fallbackOwner),
    next_action: clean(input.next_action || input.nextAction) || DEFAULT_SOCIAL_ITEM.next_action,
    learning_tags: Array.isArray(input.learning_tags || input.learningTags) ? input.learning_tags || input.learningTags : [],
    performance_notes: clean(input.performance_notes || input.performanceNotes || input.notes),
    audit_log: Array.isArray(input.audit_log || input.auditLog) ? input.audit_log || input.auditLog : [],
    executor: clean(input.executor || input.assigned_operator || input.assignedOperator),
    executor_handoff: input.executor_handoff || input.executorHandoff || null,
  };

  if (!item.post_text) {
    item.next_action = "complete_draft";
  }

  return item;
}

export function normalizeSocialWorkflowItem(input = {}, options = {}) {
  const now = options.now || clean(input.created_at || input.createdAt) || new Date().toISOString();
  const id = clean(input.id) || createId("social", 1);
  return ensureItemShape(input, now, id);
}

export function normalizePlatformSocialRecord(record = {}) {
  const mediaUrls = Array.isArray(record.media_urls) ? record.media_urls : [];
  const status = normalizeSocialStatus(record.status || record.approval_status);
  const distribution = clean(record.distribution_status);
  const routed =
    status === "approved" &&
    (distribution === "Ready for Manual Posting" || distribution === "Ready for Cowork" || distribution === "Ready for Distribution");
  const workflowStatus = record.published_at ? "published" : routed ? "routed_to_executor" : status;
  const nextAction =
    clean(record.next_action) ||
    (workflowStatus === "pending_review"
      ? "hermes_review"
      : workflowStatus === "approved"
        ? "route_to_executor"
        : workflowStatus === "routed_to_executor"
          ? "await_evidence"
          : workflowStatus === "failed"
            ? "assign_fallback"
            : workflowStatus === "published"
              ? "monitor_performance"
              : "submit_for_review");

  return normalizeSocialWorkflowItem({
    id: record.id,
    platform: record.platform || "facebook",
    content_type: record.content_type || "post",
    post_text: record.content || record.post_text || record.caption || "",
    asset_url: record.asset_url || record.video_asset_url || record.image_asset_url || mediaUrls[0] || "",
    status: workflowStatus,
    content_category: record.topic || record.title || record.content_category || "",
    core_insight_or_reframe: record.angle || record.core_insight_or_reframe || "",
    intended_audience: record.target_audience || record.intended_audience || "",
    cta_status: record.cta || (Array.isArray(record.hashtags) ? record.hashtags.join(" ") : ""),
    billboard_risk_score: record.billboard_risk_score || 0,
    social_strategy_review: record.social_strategy_review || null,
    created_by: record.created_by_agent_id || record.created_by || "Codex",
    reviewed_by: record.reviewed_by || "",
    approved_by: record.approved_by || "",
    created_at: record.created_at,
    reviewed_at: record.reviewed_at,
    approved_at: record.approved_at,
    scheduled_for: record.scheduled_at || record.scheduled_for || "",
    handed_to_cowork_at: record.handed_to_cowork_at || "",
    published_at: record.published_at || record.posted_date || "",
    published_url: record.published_url || (Array.isArray(record.published_urls) ? record.published_urls[0] : "") || "",
    evidence_path: record.evidence_path || "",
    evidence_url: record.evidence_url || "",
    failure_reason: record.failure_reason || record.rejection_reason || record.needs_fix_reason || "",
    fallback_owner: record.fallback_owner || "",
    next_action: nextAction,
    learning_tags: record.learning_tags || [],
    performance_notes: record.performance_notes || record.notes || record.posting_notes || "",
    executor: record.assigned_operator || record.executor || (routed ? "Cowork" : ""),
    executor_handoff: record.executor_handoff || null,
  });
}

export function createMemorySocialWorkflowStore(initialItems = []) {
  const records = new Map();
  let sequence = 1;

  for (const raw of initialItems) {
    const id = clean(raw.id) || createId("social", sequence++);
    records.set(id, ensureItemShape(raw, clean(raw.created_at) || new Date().toISOString(), id));
  }

  return {
    kind: "memory",
    async create(item) {
      records.set(item.id, clone(item));
      return clone(item);
    },
    async update(id, updater) {
      const current = records.get(id);
      if (!current) throw new Error(`Social item ${id} was not found.`);
      const next = updater(clone(current));
      records.set(id, clone(next));
      return clone(next);
    },
    async get(id) {
      const item = records.get(id);
      return item ? clone(item) : null;
    },
    async list(filters = {}) {
      const values = [...records.values()].map(clone);
      if (!filters.status) return values;
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      return values.filter((item) => statuses.includes(item.status));
    },
    nextId() {
      return createId("social", sequence++);
    },
  };
}

function toDashboardPost(item) {
  return {
    id: item.id,
    topic: item.content_category || item.core_insight_or_reframe || item.post_text.slice(0, 80),
    content: item.post_text,
    caption: item.post_text,
    platform: item.platform,
    status:
      item.status === "pending_review" || item.status === "reviewed"
        ? "pending"
        : item.status === "routed_to_executor"
          ? "approved"
          : item.status === "fallback"
            ? "failed"
            : item.status,
    scheduled_at: item.scheduled_for || null,
    published_at: item.published_at || null,
    created_by_agent: item.created_by,
    approval_status:
      item.status === "approved" || item.status === "routed_to_executor" || item.status === "published"
        ? "approved"
        : item.status === "rejected"
          ? "rejected"
          : item.status === "pending_review" || item.status === "reviewed"
            ? "pending_review"
            : "not_submitted",
    distribution_status:
      item.status === "published"
        ? "Published"
        : item.status === "routed_to_executor"
          ? "Ready for Manual Posting"
          : item.status === "failed"
            ? "Needs Fix"
            : "Not Ready",
    rejection_reason: item.status === "rejected" ? item.failure_reason : null,
    media_urls: [item.asset_url].filter(Boolean),
    asset_url: item.asset_url || null,
    emotional_trigger: null,
    cta: item.cta_status,
    assigned_operator: item.executor,
    published_url: item.published_url || null,
    posted_date: item.published_at || null,
    posting_notes: item.performance_notes || null,
    needs_fix_reason: item.failure_reason || null,
    notes: item.performance_notes || "",
    fallback_owner: item.fallback_owner,
    next_action: item.next_action,
  };
}

function toCoworkQueueRow(item) {
  return normalizeQueueRow({
    id: item.id,
    topic: item.content_category || item.core_insight_or_reframe || item.post_text.slice(0, 80),
    platform: item.platform,
    postText: item.post_text,
    caption: item.post_text,
    assetUrl: item.asset_url,
    cta: item.cta_status,
    scheduledDate: item.scheduled_for || null,
    status: item.status === "routed_to_executor" ? "Ready to Publish" : item.status,
    notes: item.performance_notes,
    assignedOperator: item.executor,
    publishedUrl: item.published_url,
    postedDate: item.published_at || null,
    postingNotes: item.performance_notes,
    needsFixReason: item.failure_reason,
  });
}

function buildCounts(items) {
  return {
    drafts: items.filter((item) => item.status === "draft").length,
    pending_review: items.filter((item) => item.status === "pending_review" || item.status === "reviewed").length,
    approved: items.filter((item) => item.status === "approved").length,
    routed_to_executor: items.filter((item) => item.status === "routed_to_executor").length,
    published: items.filter((item) => item.status === "published").length,
    failed: items.filter((item) => item.status === "failed").length,
    fallback: items.filter((item) => item.status === "fallback").length,
  };
}

const NEXT_ACTION_PRIORITY = {
  hermes_review: 10,
  approval_required: 20,
  route_to_executor: 30,
  record_executor_handoff: 40,
  await_evidence: 50,
  assign_fallback: 60,
  fallback_review: 70,
  submit_for_review: 80,
};

export function createSocialEngine(options = {}) {
  const store = options.store || createMemorySocialWorkflowStore(options.initialItems || []);
  const clock = options.now || (() => new Date().toISOString());

  async function change(id, action, actor, detail, mutate) {
    const at = isoNow(clock);
    return store.update(id, (current) => appendAudit(mutate(current, at), action, actor, detail, at));
  }

  return {
    storage: store.kind || "custom",

    async createDraft(input = {}) {
      const at = isoNow(clock);
      const id = clean(input.id) || (typeof store.nextId === "function" ? store.nextId() : createId("social", Date.now()));
      const item = appendAudit(ensureItemShape({ ...input, status: "draft", next_action: "submit_for_review" }, at, id), "createDraft", input.created_by || "Codex", { platform: input.platform }, at);
      return store.create(item);
    },

    async listDrafts(filters = {}) {
      return store.list(filters);
    },

    async submitForReview(id) {
      return change(id, "submitForReview", "Codex", {}, (item, at) => ({
        ...item,
        status: "pending_review",
        next_action: "hermes_review",
        reviewed_at: "",
        reviewed_by: "",
        social_strategy_review: item.social_strategy_review || null,
        submitted_at: at,
      }));
    },

    async reviewDraft(id, strategyReview = {}) {
      return change(id, "reviewDraft", strategyReview.reviewed_by || "Hermes", strategyReview, (item, at) => ({
        ...item,
        status: "reviewed",
        reviewed_by: clean(strategyReview.reviewed_by) || "Hermes",
        reviewed_at: at,
        social_strategy_review: strategyReview,
        next_action: strategyReview.recommendation === "reject" ? "rejection_recommended" : "approval_required",
      }));
    },

    async approveDraft(id, approval = {}) {
      return change(id, "approveDraft", approval.approved_by || "Jonathan", approval, (item, at) => ({
        ...item,
        status: "approved",
        approved_by: clean(approval.approved_by) || "Jonathan",
        approved_at: at,
        scheduled_for: clean(approval.scheduled_for || approval.scheduledFor) || item.scheduled_for,
        next_action: "route_to_executor",
      }));
    },

    async rejectDraft(id, reason) {
      const detail = typeof reason === "object" ? reason : { reason };
      return change(id, "rejectDraft", detail.rejected_by || "Hermes", detail, (item) => ({
        ...item,
        status: "rejected",
        failure_reason: clean(detail.reason) || "Rejected by reviewer.",
        next_action: "revise_or_archive",
      }));
    },

    async routeApprovedItem(id, executor) {
      return change(id, "routeApprovedItem", "Hermes", { executor }, (item, at) => ({
        ...item,
        status: "routed_to_executor",
        executor: clean(executor) || "Cowork",
        handed_to_cowork_at: clean(executor).toLowerCase() === "cowork" || !executor ? at : item.handed_to_cowork_at,
        fallback_owner: "",
        next_action: "record_executor_handoff",
      }));
    },

    async recordExecutorHandoff(id, handoff = {}) {
      return change(id, "recordExecutorHandoff", handoff.executor || "Cowork", handoff, (item, at) => ({
        ...item,
        status: "routed_to_executor",
        executor: clean(handoff.executor) || item.executor || "Cowork",
        executor_handoff: handoff,
        handed_to_cowork_at: item.handed_to_cowork_at || at,
        next_action: "await_evidence",
      }));
    },

    async recordEvidence(id, evidence = {}) {
      return change(id, "recordEvidence", evidence.recorded_by || "Cowork", evidence, (item, at) => ({
        ...item,
        status: "published",
        published_at: clean(evidence.published_at || evidence.publishedAt) || at,
        published_url: clean(evidence.published_url || evidence.publishedUrl) || item.published_url,
        evidence_path: clean(evidence.evidence_path || evidence.evidencePath) || item.evidence_path,
        evidence_url: clean(evidence.evidence_url || evidence.evidenceUrl) || item.evidence_url,
        performance_notes: clean(evidence.performance_notes || evidence.performanceNotes) || item.performance_notes,
        next_action: "monitor_performance",
      }));
    },

    async markFailed(id, failure = {}) {
      return change(id, "markFailed", failure.failed_by || "SocialEngine", failure, (item) => ({
        ...item,
        status: "failed",
        failure_reason: clean(failure.failure_reason || failure.failureReason) || "Execution failed without a recorded reason.",
        next_action: "assign_fallback",
      }));
    },

    async assignFallback(id, fallbackOwner) {
      return change(id, "assignFallback", "Hermes", { fallbackOwner }, (item) => ({
        ...item,
        status: "fallback",
        fallback_owner: clean(fallbackOwner) || "Codex",
        next_action: "fallback_review",
      }));
    },

    async getDashboardState() {
      const items = await store.list();
      const counts = buildCounts(items);
      const approvalQueue = items.filter((item) => item.status === "pending_review" || item.status === "reviewed").map(toDashboardPost);
      const coworkQueue = items.filter((item) => item.status === "routed_to_executor").map(toCoworkQueueRow);
      const failureQueue = items.filter((item) => item.status === "failed" || item.status === "fallback").map(toDashboardPost);
      const posts = items.map(toDashboardPost);
      const nextActions = items
        .filter((item) => item.next_action && item.status !== "published")
        .map((item) => ({ id: item.id, action: item.next_action, status: item.status, owner: item.fallback_owner || item.executor || item.reviewed_by || item.created_by }))
        .sort((a, b) => (NEXT_ACTION_PRIORITY[a.action] || 999) - (NEXT_ACTION_PRIORITY[b.action] || 999));

      return {
        source: store.kind || "custom",
        counts,
        posts,
        approvalQueue,
        coworkQueue,
        failureQueue,
        nextActions,
        auditSummary: items.map((item) => ({ id: item.id, events: item.audit_log.length, last_event: item.audit_log.at(-1)?.action || "" })),
      };
    },

    async getHealthStatus() {
      const items = await store.list();
      const failed = items.filter((item) => item.status === "failed").length;
      const fallback = items.filter((item) => item.status === "fallback").length;
      const errors = [];
      if (failed) errors.push(`${failed} failed social item${failed === 1 ? "" : "s"} need fallback assignment.`);
      if (fallback) errors.push(`${fallback} social item${fallback === 1 ? "" : "s"} assigned to fallback.`);

      return {
        service: "SocialEngine",
        status: errors.length ? "degraded" : "healthy",
        storage: store.kind || "custom",
        item_count: items.length,
        failed_count: failed,
        fallback_count: fallback,
        errors,
      };
    },

    async getAuditTrail(id) {
      const item = await store.get(id);
      if (!item) throw new Error(`Social item ${id} was not found.`);
      return item.audit_log;
    },
  };
}
