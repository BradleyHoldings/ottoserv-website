import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTENT_ANGLE_RULES,
  CONTENT_LIFECYCLE_STATUSES,
  CONTENT_MONITORING_TOPICS,
  DISTRIBUTION_STATUSES,
  COWORK_QUEUE_VIEW,
  OFFICIAL_SOCIAL_ACCOUNT_REGISTRY,
  buildAssetGenerationRequests,
  buildSocialDistributionOpsReadModel,
  buildBlotatoDistributionPayload,
  buildContentOpportunity,
  buildStructuredContentDraft,
  classifyPerformance,
  createSocialEngine,
  filterCoworkPostingQueue,
  requiredAirtableFields,
} from "../src/lib/socialContentEngine.mjs";

test("official OttoServ social registry keeps Blotato as distribution tool, not growth engine", () => {
  const model = buildSocialDistributionOpsReadModel();

  assert.deepEqual(model.priority_order, [
    "linkedin",
    "facebook",
    "instagram",
    "tiktok",
    "x",
    "threads",
    "pinterest",
    "bluesky",
  ]);
  assert.equal(model.summary.total_accounts, 8);
  assert.equal(model.summary.connected_to_blotato, 0);
  assert.equal(model.status, "blocked_pending_account_confirmation");
  assert.equal(model.production_posting_allowed, false);
  assert.equal(model.tool_roles.blotato.role, "social_distribution_and_repurposing");
  assert.equal(model.tool_roles.hermes.responsibility, "prepare_daily_content_engagement_packet_and_track_conversations_replies_leads_followups_next_actions");
  assert.equal(model.tool_roles.cowork.responsibility, "browser_side_posting_comments_replies_dms_groups_and_evidence_when_needed");
  assert.equal(model.tool_roles.retell.allowed_use, "approved_calls_only");
  assert.ok(model.next_actions.includes("Jonathan confirms official account handles and Blotato connection status."));

  const linkedIn = model.accounts.find((account) => account.platform === "linkedin");
  assert.equal(linkedIn.priority, 1);
  assert.equal(linkedIn.connected_to_blotato, false);
  assert.equal(linkedIn.login_session_status, "unknown");
  assert.ok(linkedIn.allowed_actions.includes("schedule_or_repurpose_via_blotato_after_approval"));
  assert.ok(linkedIn.allowed_actions.includes("cowork_browser_engagement_after_approval"));
  assert.ok(linkedIn.evidence_requirements.includes("approved_content_packet_id"));

  const facebook = model.accounts.find((account) => account.platform === "facebook");
  assert.equal(facebook.priority, 2);
  assert.ok(facebook.allowed_actions.includes("facebook_page_and_group_engagement_after_approval"));

  assert.deepEqual(OFFICIAL_SOCIAL_ACCOUNT_REGISTRY.map((account) => account.platform), model.priority_order);
});

test("required Airtable fields include content engine and Cowork posting fields", () => {
  assert.ok(requiredAirtableFields.includes("Topic"));
  assert.ok(requiredAirtableFields.includes("Script"));
  assert.ok(requiredAirtableFields.includes("Image Prompt"));
  assert.ok(requiredAirtableFields.includes("Distribution Status"));
  assert.ok(requiredAirtableFields.includes("Assigned Operator"));
  assert.ok(requiredAirtableFields.includes("Needs Fix Reason"));
  assert.ok(requiredAirtableFields.includes("Factual Summary"));
  assert.ok(requiredAirtableFields.includes("Why This Matters"));
  assert.ok(requiredAirtableFields.includes("Operational Issue"));
  assert.ok(requiredAirtableFields.includes("OttoServ Point of View"));
  assert.ok(requiredAirtableFields.includes("HeyGen Script"));
  assert.ok(requiredAirtableFields.includes("Carousel Outline"));
  assert.ok(requiredAirtableFields.includes("Front Office Leak Check CTA"));
});

test("monitoring topics cover AI/product updates and building/construction industry trends", () => {
  assert.ok(CONTENT_MONITORING_TOPICS.aiProductUpdates.includes("OpenAI"));
  assert.ok(CONTENT_MONITORING_TOPICS.aiProductUpdates.includes("HeyGen"));
  assert.ok(CONTENT_MONITORING_TOPICS.fieldServiceSoftware.includes("ServiceTitan"));
  assert.ok(CONTENT_MONITORING_TOPICS.fieldServiceSoftware.includes("Housecall Pro"));
  assert.ok(CONTENT_MONITORING_TOPICS.industryTrends.includes("material cost trends"));
  assert.ok(CONTENT_MONITORING_TOPICS.industryTrends.includes("data center and infrastructure construction demand"));
  assert.ok(CONTENT_MONITORING_TOPICS.industryTrends.includes("contractor profitability and operational bottlenecks"));
});

test("lifecycle statuses preserve human approval before publishing", () => {
  assert.deepEqual(CONTENT_LIFECYCLE_STATUSES.slice(0, 5), [
    "Idea",
    "Researching",
    "Ready for Draft",
    "Drafted",
    "Pending Approval",
  ]);
  assert.ok(CONTENT_LIFECYCLE_STATUSES.indexOf("Approved") < CONTENT_LIFECYCLE_STATUSES.indexOf("Ready to Publish"));
  assert.ok(CONTENT_ANGLE_RULES.includes("missed calls"));
  assert.ok(CONTENT_ANGLE_RULES.includes("revenue leakage"));
  assert.ok(DISTRIBUTION_STATUSES.includes("Ready for Cowork"));
  assert.ok(DISTRIBUTION_STATUSES.includes("Needs Approval"));
  assert.ok(DISTRIBUTION_STATUSES.includes("No Post Prepared"));
});

test("structured content draft ties topic back to OttoServ operating pain", () => {
  const draft = buildStructuredContentDraft({
    topic: "new AI scheduling assistants",
    contentPillar: "AI/product updates relevant to service businesses",
    targetAudience: "remodeling company owners",
    sourceLinks: ["https://example.com/source"],
    researchSummary: "AI scheduling tools are getting better at handling routine appointment coordination.",
    angle: "scheduling chaos",
  });

  assert.equal(draft.topic, "new AI scheduling assistants");
  assert.equal(draft.angle, "scheduling chaos");
  assert.match(draft.hook, /service business|owner|operator/i);
  assert.match(draft.ottoServTieIn, /AI operations brief/i);
  assert.match(draft.script, /slow follow-up|scheduling chaos|missed calls|revenue leak/i);
  assert.ok(draft.shortScript.length < draft.script.length);
  assert.match(draft.linkedInPost, /AI operations brief/i);
  assert.match(draft.imagePrompt, /owner-friendly/i);
  assert.match(draft.videoPrompt, /45-60 second/i);
});

test("content opportunity produces owner-friendly trend translation with all channel outputs", () => {
  const opportunity = buildContentOpportunity({
    sourceLink: "https://example.com/servicetitan-update",
    topic: "ServiceTitan launches a faster online booking workflow",
    trendType: "Field service software updates",
    affectedBusinesses: ["HVAC", "plumbing", "electrical"],
    factualSummary: "ServiceTitan added a booking workflow intended to reduce friction between inbound demand and scheduled jobs.",
    operationalIssue: "slow follow-up",
  });

  assert.equal(opportunity.sourceLink, "https://example.com/servicetitan-update");
  assert.match(opportunity.factualSummary, /ServiceTitan added/);
  assert.match(opportunity.whyThisMatters, /HVAC|plumbing|electrical/);
  assert.match(opportunity.operationalIssue, /slow follow-up/);
  assert.match(opportunity.ottoServPointOfView, /AI operations brief for service businesses/i);
  assert.match(opportunity.heyGenScript, /45-60 second/i);
  assert.match(opportunity.heyGenScript, /missed calls|follow-up|book more jobs|front office/i);
  assert.match(opportunity.shortVersion, /15-25 second/i);
  assert.match(opportunity.linkedInPost, /what changed/i);
  assert.match(opportunity.facebookPost, /owner/i);
  assert.match(opportunity.instagramCaption, /front office leak/i);
  assert.match(opportunity.twitterPost, /revenue leak|follow-up|calls/i);
  assert.equal(opportunity.carouselOutline.length, 6);
  assert.match(opportunity.frontOfficeLeakCheckCta, /front office leak check/i);
});

test("asset requests use provider-style payloads without locking future vendors", () => {
  const draft = buildStructuredContentDraft({
    topic: "estimate follow-up leaks",
    contentPillar: "Revenue leaks and front office breakdowns",
    targetAudience: "trade business owners",
    researchSummary: "Many estimate requests stall after the first quote.",
    angle: "estimate follow-up",
  });
  const requests = buildAssetGenerationRequests(draft, { assetType: "image_and_video" });

  assert.deepEqual(requests.map((request) => request.provider), ["openai-image", "hyperframes"]);
  assert.equal(requests[0].kind, "image");
  assert.equal(requests[1].kind, "video");
  assert.match(requests[1].prompt, /estimate follow-up/i);
});

test("Cowork queue filters approved manual posts due today or earlier", () => {
  const rows = [
    {
      id: "due",
      topic: "missed calls",
      platform: "linkedin",
      postText: "Post this",
      caption: "Caption",
      assetUrl: "https://assets.example.com/a.png",
      cta: "Book a call",
      scheduledDate: "2026-05-26T09:00:00Z",
      status: "Ready to Publish",
      approvalStatus: "Approved",
      distributionStatus: "Ready for Manual Posting",
      notes: "Priority",
    },
    {
      id: "future",
      approvalStatus: "Approved",
      distributionStatus: "Ready for Manual Posting",
      scheduledDate: "2026-05-27T09:00:00Z",
    },
    {
      id: "not-approved",
      approvalStatus: "Pending",
      distributionStatus: "Ready for Manual Posting",
      scheduledDate: "2026-05-26T09:00:00Z",
    },
  ];

  const queue = filterCoworkPostingQueue(rows, new Date("2026-05-26T12:00:00Z"));

  assert.equal(COWORK_QUEUE_VIEW.name, "Cowork Posting Queue");
  assert.deepEqual(queue.map((row) => row.id), ["due"]);
  assert.deepEqual(Object.keys(queue[0]), [
    "id",
    "topic",
    "platform",
    "postText",
    "caption",
    "assetUrl",
    "cta",
    "scheduledDate",
    "status",
    "notes",
    "assignedOperator",
    "publishedUrl",
    "postedDate",
    "postingNotes",
    "needsFixReason",
  ]);
});

test("Blotato handoff consumes same approved ready-for-distribution shape", () => {
  const payload = buildBlotatoDistributionPayload({
    id: "post-1",
    platform: "linkedin",
    postText: "Useful operator post",
    caption: "Useful operator caption",
    assetUrl: "https://assets.example.com/video.mp4",
    approvalStatus: "Approved",
    distributionStatus: "Ready for Distribution",
    scheduledDate: "2026-05-26T15:00:00Z",
  });

  assert.deepEqual(payload, {
    source: "airtable",
    recordId: "post-1",
    platform: "linkedin",
    text: "Useful operator post",
    caption: "Useful operator caption",
    mediaUrl: "https://assets.example.com/video.mp4",
    scheduledAt: "2026-05-26T15:00:00Z",
    requiresHumanApproval: false,
  });
});

test("performance classifier marks winners and repurposing options", () => {
  assert.equal(classifyPerformance({ views: 80, likes: 1, comments: 0, shares: 0, leadsGenerated: 0 }).label, "Dead");
  assert.equal(classifyPerformance({ views: 1200, likes: 20, comments: 3, shares: 1, leadsGenerated: 0 }).label, "Average");

  const winner = classifyPerformance({ views: 4000, watchTime: 1900, likes: 180, comments: 40, shares: 25, leadsGenerated: 4 });
  assert.equal(winner.label, "Winner");
  assert.deepEqual(winner.repurposeOptions, ["short video", "carousel", "longer post", "blog/article", "ad creative candidate"]);
});

test("SocialEngine owns draft approval routing evidence fallback and audit lifecycle", async () => {
  const engine = createSocialEngine({ now: () => "2026-06-02T14:00:00.000Z" });

  const draft = await engine.createDraft({
    platform: "linkedin",
    content_type: "post",
    post_text: "Service businesses lose jobs when after-hours calls wait until morning.",
    content_category: "Revenue leaks and front office breakdowns",
    core_insight_or_reframe: "Missed calls are a dispatch problem, not just a phone problem.",
    intended_audience: "property managers and home service owners",
    cta_status: "ready",
    billboard_risk_score: 2,
    created_by: "Codex",
    learning_tags: ["missed-calls", "follow-up"],
  });

  assert.equal(draft.status, "draft");
  assert.equal(draft.next_action, "submit_for_review");

  const submitted = await engine.submitForReview(draft.id);
  assert.equal(submitted.status, "pending_review");
  assert.equal(submitted.next_action, "hermes_review");

  const reviewed = await engine.reviewDraft(draft.id, {
    reviewed_by: "Hermes",
    risk_notes: "Billboard-safe and tied to operating pain.",
    recommendation: "approve",
  });
  assert.equal(reviewed.reviewed_by, "Hermes");
  assert.equal(reviewed.next_action, "approval_required");

  const approved = await engine.approveDraft(draft.id, { approved_by: "Jonathan", scheduled_for: "2026-06-02T18:00:00.000Z" });
  assert.equal(approved.status, "approved");
  assert.equal(approved.next_action, "route_to_executor");

  const routed = await engine.routeApprovedItem(draft.id, "Cowork");
  assert.equal(routed.status, "routed_to_executor");
  assert.equal(routed.fallback_owner, "");

  const handedOff = await engine.recordExecutorHandoff(draft.id, {
    executor: "Cowork",
    handoff_id: "cowork-social-001",
    handoff_url: "https://cowork.example/tasks/cowork-social-001",
  });
  assert.equal(handedOff.next_action, "await_evidence");

  const withEvidence = await engine.recordEvidence(draft.id, {
    published_url: "https://linkedin.com/feed/update/123",
    evidence_url: "https://evidence.example/social/123",
    performance_notes: "Published by Cowork with screenshot proof.",
  });
  assert.equal(withEvidence.status, "published");
  assert.equal(withEvidence.next_action, "monitor_performance");

  const failed = await engine.markFailed(draft.id, {
    failure_reason: "LinkedIn session expired during verification.",
    failed_by: "Cowork",
  });
  assert.equal(failed.status, "failed");
  assert.equal(failed.next_action, "assign_fallback");

  const fallback = await engine.assignFallback(draft.id, "Codex");
  assert.equal(fallback.fallback_owner, "Codex");
  assert.equal(fallback.next_action, "fallback_review");

  const audit = await engine.getAuditTrail(draft.id);
  assert.deepEqual(audit.map((entry) => entry.action), [
    "createDraft",
    "submitForReview",
    "reviewDraft",
    "approveDraft",
    "routeApprovedItem",
    "recordExecutorHandoff",
    "recordEvidence",
    "markFailed",
    "assignFallback",
  ]);
});

test("SocialEngine returns dashboard state and health from one workflow source", async () => {
  const engine = createSocialEngine({ now: () => "2026-06-02T14:00:00.000Z" });
  await engine.createDraft({
    platform: "twitter",
    content_type: "post",
    post_text: "A clean intake handoff beats another disconnected reminder.",
    created_by: "Codex",
  });

  const pending = await engine.createDraft({
    platform: "facebook",
    content_type: "post",
    post_text: "Every missed call needs an owner and a timestamp.",
    created_by: "Codex",
  });
  await engine.submitForReview(pending.id);

  const approved = await engine.createDraft({
    platform: "linkedin",
    content_type: "post",
    post_text: "After-hours calls are a revenue system test.",
    created_by: "Codex",
  });
  await engine.submitForReview(approved.id);
  await engine.reviewDraft(approved.id, { reviewed_by: "Hermes", recommendation: "approve" });
  await engine.approveDraft(approved.id, { approved_by: "Jonathan" });
  await engine.routeApprovedItem(approved.id, "Cowork");

  const failed = await engine.createDraft({
    platform: "instagram",
    content_type: "post",
    post_text: "Slow estimate follow-up quietly kills booked revenue.",
    created_by: "Codex",
  });
  await engine.markFailed(failed.id, { failure_reason: "Asset missing", failed_by: "Hermes" });

  const state = await engine.getDashboardState();
  assert.deepEqual(state.counts, {
    drafts: 1,
    pending_review: 1,
    approved: 0,
    routed_to_executor: 1,
    published: 0,
    failed: 1,
    fallback: 0,
  });
  assert.deepEqual(state.approvalQueue.map((item) => item.id), [pending.id]);
  assert.deepEqual(state.coworkQueue.map((item) => item.id), [approved.id]);
  assert.deepEqual(state.failureQueue.map((item) => item.id), [failed.id]);
  assert.equal(state.nextActions[0].action, "hermes_review");

  const health = await engine.getHealthStatus();
  assert.equal(health.service, "SocialEngine");
  assert.equal(health.storage, "memory");
  assert.equal(health.item_count, 4);
  assert.equal(health.status, "degraded");
  assert.match(health.errors[0], /1 failed social item/);
});
