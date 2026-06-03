import assert from "node:assert/strict";
import test from "node:test";

import {
  APPROVAL_REQUIRED_ACTIONS,
  DAILY_REVENUE_CHANNELS,
  EVIDENCE_REQUIREMENTS,
  createDailyRevenuePlan,
  createQueueItem,
  buildUnifiedQueues,
  recordEvidence,
  canMarkComplete,
  classifyFailure,
  createRepairPacket,
  routeFailure,
  getDashboardState,
  getContentIntelligence,
  getSeoGeoAieoOpportunities,
  createDailyLoopRun,
} from "../src/lib/revenueEngine.mjs";

const NOW = "2026-06-02T09:00:00.000Z";

test("daily revenue plan defines command focus and every required revenue lane", () => {
  const plan = createDailyRevenuePlan({
    now: NOW,
    icpFocus: "property managers with leasing and maintenance call leakage",
    offerFocus: "$299 front office leak check pilot",
    revenueRisks: ["Retell queue has no verified call evidence"],
    brokenRails: ["linkedin-session"],
  });

  assert.equal(plan.run_date, "2026-06-02");
  assert.equal(plan.cycles.length, 2);
  assert.equal(plan.icp_focus, "property managers with leasing and maintenance call leakage");
  assert.equal(plan.offer_focus, "$299 front office leak check pilot");
  assert.ok(plan.content_angles.length >= 4);
  assert.ok(plan.outreach_angles.length >= 4);
  assert.deepEqual(plan.channel_actions.map((action) => action.channel), DAILY_REVENUE_CHANNELS);
  assert.ok(plan.revenue_risks.includes("Retell queue has no verified call evidence"));
  assert.ok(plan.broken_execution_rails.includes("linkedin-session"));
  assert.ok(plan.repair_queue_seed.some((item) => item.owner === "Codex"));
  assert.ok(plan.execution_queue_seed.some((item) => item.owner === "Cowork"));
  assert.ok(plan.approval_queue_seed.every((item) => item.approval_required === true));
});

test("unified queues cover content outreach calls SEO evidence approvals execution and repair", () => {
  const queues = buildUnifiedQueues({
    now: NOW,
    leads: [
      {
        lead_id: "lead-a",
        company: "Tampa Rentals PM",
        tier: "A-tier",
        normalized_phone: "8132220198",
        email: "owner@example.com",
        status: "ready_to_call",
      },
      {
        lead_id: "lead-b",
        company: "Orlando HVAC",
        tier: "B-tier",
        email: "ops@example.com",
        status: "ready_to_email",
      },
    ],
    socialItems: [{ id: "social-1", platform: "linkedin", status: "routed_to_executor", post_text: "Founder POV draft" }],
    seoOpportunities: [{ id: "seo-1", topic: "AI receptionist for HVAC", type: "answer_page" }],
  });

  assert.deepEqual(Object.keys(queues).sort(), [
    "approval",
    "calls",
    "codexRepair",
    "content",
    "coworkExecution",
    "evidenceInbox",
    "outreach",
    "replies",
    "seoGeoAieo",
  ].sort());
  assert.equal(queues.calls[0].channel, "phone_call_retell_morgan");
  assert.equal(queues.outreach[0].channel, "email_outreach");
  assert.equal(queues.content[0].execution_owner, "Cowork");
  assert.equal(queues.seoGeoAieo[0].channel, "geo_aieo_answer_page");
  assert.ok(queues.calls[0].evidence_requirement.includes("Retell call record"));
});

test("queue item completion is blocked until required evidence is recorded", () => {
  const item = createQueueItem({
    channel: "linkedin_post",
    target_audience: "property managers",
    offer_cta: "Book a front office leak check",
    content_angle: "Founder POV on maintenance call handoffs",
    draft_copy_or_instructions: "Post the approved founder POV draft.",
    execution_owner: "Cowork",
    risk_level: "low",
    approval_required: false,
    evidence_requirement: EVIDENCE_REQUIREMENTS.linkedin_post,
  });

  assert.equal(item.status, "queued");
  assert.equal(canMarkComplete(item), false);

  const withEvidence = recordEvidence(item, {
    evidence_type: "live_url",
    evidence_url: "https://linkedin.com/feed/update/123",
    result_outcome: "Posted and visible.",
    recorded_by: "Cowork",
  });

  assert.equal(withEvidence.status, "completed");
  assert.equal(canMarkComplete(withEvidence), true);
  assert.equal(withEvidence.result_outcome, "Posted and visible.");
  assert.equal(withEvidence.audit_log.at(-1).action, "recordEvidence");
});

test("failure router classifies breakage and creates Codex or execution repair packets", () => {
  const codexFailure = {
    item_id: "call-1",
    channel: "phone_call_retell_morgan",
    expected_behavior: "Retell/Morgan call queue should accept the approved A-tier lead.",
    actual_behavior: "API returned 500 and no call id was created.",
    evidence_logs: ["POST /calls/outcomes missing retell_call_id"],
  };
  const codexPacket = createRepairPacket(codexFailure);

  assert.equal(classifyFailure(codexFailure).category, "Retell/calling failure");
  assert.equal(codexPacket.owner, "Codex");
  assert.match(codexPacket.acceptance_criteria[0], /call queue/i);
  assert.ok(codexPacket.verification_steps.includes("Run revenue engine tests."));

  const coworkFailure = {
    item_id: "linkedin-1",
    channel: "linkedin_comment",
    expected_behavior: "Cowork should post the approved comment.",
    actual_behavior: "Browser session expired before posting.",
    evidence_logs: ["LinkedIn auth prompt screenshot"],
  };
  const route = routeFailure(coworkFailure);

  assert.equal(route.category, "Credential/auth issue");
  assert.equal(route.repair_item.owner, "Cowork");
  assert.equal(route.repair_item.queue, "coworkExecution");
});

test("dashboard state explains plan queues evidence repair broken rails and next action", () => {
  const state = getDashboardState({
    now: NOW,
    leads: [{ lead_id: "lead-a", company: "Tampa Rentals PM", tier: "A-tier", normalized_phone: "8132220198", status: "ready_to_call" }],
    failures: [
      {
        item_id: "n8n-1",
        channel: "n8n_workflow",
        expected_behavior: "Daily revenue workflow runs morning cycle.",
        actual_behavior: "n8n execution failed with missing credential.",
        evidence_logs: ["n8n execution 123 failed"],
      },
    ],
    socialItems: [{ id: "social-1", platform: "linkedin", status: "routed_to_executor", post_text: "Approved social post" }],
  });

  assert.equal(state.engine, "RevenueEngine");
  assert.equal(state.todayPlan.run_date, "2026-06-02");
  assert.equal(state.queueCounts.calls, 1);
  assert.equal(state.queueCounts.coworkExecution, 1);
  assert.equal(state.repairQueue.length, 1);
  assert.equal(state.brokenRails.length, 1);
  assert.equal(state.evidenceInbox.length, 0);
  assert.match(state.nextAction, /repair/i);
});

test("content intelligence prevents repetitive billboard copy unless selected", () => {
  const intelligence = getContentIntelligence({
    recentPosts: [
      "You are leaking revenue from missed calls.",
      "Missed calls are leaking revenue every day.",
      "Stop leaking revenue from missed calls.",
    ],
    sourceInsights: ["A prospect said tenant maintenance calls are the real bottleneck."],
    intentionalAngle: "tenant maintenance handoff",
  });

  assert.equal(intelligence.billboard_risk, "high");
  assert.ok(intelligence.blocked_phrases.includes("leaking revenue"));
  assert.ok(intelligence.recommended_angles.includes("tenant maintenance handoff"));
  assert.ok(intelligence.formats.includes("Founder POV"));
  assert.doesNotMatch(intelligence.daily_guardrail, /repeat missed calls/i);
});

test("SEO GEO and AIEO opportunities include answer pages metadata schema and links", () => {
  const opportunities = getSeoGeoAieoOpportunities({
    focusTopics: ["AI receptionist", "process audits"],
    industries: ["HVAC", "property management"],
  });

  assert.ok(opportunities.some((item) => item.type === "blog_post"));
  assert.ok(opportunities.some((item) => item.type === "geo_aieo_answer_page"));
  assert.ok(opportunities.every((item) => item.metadata.title));
  assert.ok(opportunities.every((item) => item.schema_recommendations.length >= 1));
  assert.ok(opportunities.every((item) => item.internal_links.length >= 1));
});

test("daily loop run packages morning and afternoon execution without scaling volume first", () => {
  const run = createDailyLoopRun({
    now: NOW,
    leads: [{ lead_id: "lead-a", company: "Tampa Rentals PM", tier: "A-tier", normalized_phone: "8132220198", status: "ready_to_call" }],
    maxVolume: 5,
  });

  assert.equal(run.status, "ready");
  assert.equal(run.schedule, "Monday-Saturday morning and afternoon");
  assert.equal(run.volume_policy, "repair-before-scale");
  assert.equal(run.plan.cycles.length, 2);
  assert.equal(run.health.status, "healthy");
  assert.ok(run.executionPackets.some((packet) => packet.owner === "Retell/Morgan"));
  assert.ok(APPROVAL_REQUIRED_ACTIONS.includes("new_outbound_campaign_launch"));
});
