// End-to-end proof of the SocialEngine ↔ dashboard integration path.
//
//   Codex draft -> /dashboard/social (via /api/social) -> approval write-back
//   -> Hermes/Cowork handoff packet -> evidence return -> failure/fallback.
//
// Boots `next start` against an ISOLATED SOCIAL_ENGINE_DATA_DIR (hydrated from the
// committed seed) so it never touches real ledgers and never publishes anything.

import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import { startNextServer, waitForServer, assert } from "./server-test-utils.mjs";

const root = process.cwd();
const port = 3104;
const base = `http://localhost:${port}`;
const dataDir = path.join(root, ".tmp", "test-ledgers", "verify-social-flow");

if (existsSync(dataDir)) rmSync(dataDir, { recursive: true, force: true });
mkdirSync(dataDir, { recursive: true });

const { server, getOutput } = startNextServer(root, port, { SOCIAL_ENGINE_DATA_DIR: dataDir });

async function get(p) {
  const res = await fetch(`${base}${p}`, { cache: "no-store" });
  return { status: res.status, body: await res.json() };
}
async function post(p, body) {
  const res = await fetch(`${base}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

try {
  await waitForServer(`${base}/`, getOutput);

  // 1. Seed hydration: imported IG/LinkedIn evidence + safe test draft are visible.
  let snap = await get("/api/social");
  assert(snap.status === 200, "GET /api/social should return 200");
  assert(Array.isArray(snap.body.items), "response should include items[]");
  const ig = snap.body.items.find((i) => i.published_url === "https://www.instagram.com/p/DZGInobGU-z/");
  assert(ig && ig.status === "published", "imported Instagram evidence should appear as published");
  const li = snap.body.items.find((i) => i.platform === "linkedin" && i.status === "published");
  assert(li && li.evidence_path, "imported LinkedIn engagement evidence should appear with evidence_path");
  const seededTest = snap.body.items.find((i) => i.id === "social-0003");
  assert(seededTest && seededTest.status === "pending_review", "seeded safe test draft should be pending approval");
  console.log("✓ seed: IG + LinkedIn evidence imported, safe test draft pending");

  // 2. Codex creates a new safe test draft (submitted for review).
  const create = await post("/api/social", {
    platform: "linkedin",
    post_text: "[SAFE TEST] missed-call recovery walkthrough — do not publish",
    content_category: "Proof/Process Post",
    core_insight_or_reframe: "Missed calls are missed revenue.",
    intended_audience: "Property managers",
    cta_status: "soft CTA",
    billboard_risk_score: 10,
    created_by: "Codex",
    submit_for_review: true,
  });
  assert(create.status === 201, "POST /api/social should create a draft (201)");
  const id = create.body.item.id;
  assert(id, "created draft should have an id");
  console.log(`✓ create: draft ${id} created and submitted for review`);

  // 3. It appears in the live state as pending, with strategy fields intact.
  snap = await get("/api/social");
  const inState = snap.body.items.find((i) => i.id === id);
  assert(inState && inState.status === "pending_review", "new draft should appear pending_review");
  assert(inState.content_category === "Proof/Process Post", "strategy field content_category should persist");
  assert(inState.core_insight_or_reframe === "Missed calls are missed revenue.", "strategy field insight should persist");
  const pendingPost = snap.body.state.approvalQueue.find((p) => p.id === id);
  assert(pendingPost, "draft should be in the dashboard approvalQueue");
  console.log("✓ dashboard: draft visible in approval queue with strategy fields");

  // 4. Approval write-back (Jonathan approves from dashboard).
  const approve = await post(`/api/social/${id}`, { action: "approve", approved_by: "Jonathan" });
  assert(approve.status === 200 && approve.body.item.status === "approved", "approve should set status=approved");
  assert(approve.body.item.approved_by === "Jonathan", "approver should be recorded");
  assert(approve.body.item.approved_at, "approved_at timestamp should be recorded");
  console.log("✓ approval write-back: approved by Jonathan with timestamp");

  // 5. Hermes → Cowork handoff packet.
  const handoff = await post(`/api/social/${id}`, { action: "handoff" });
  assert(handoff.status === 200, "handoff should succeed");
  assert(handoff.body.item.status === "routed_to_executor", "handoff should route to executor");
  const packet = handoff.body.packet;
  assert(packet && packet.platform && packet.post_text, "handoff packet should include platform + post text");
  assert(Array.isArray(packet.evidence_requirements) && packet.evidence_requirements.length > 0, "packet should list evidence requirements");
  assert(packet.fallback_rule, "packet should include a fallback rule");
  assert(packet.cta_guidance, "packet should include CTA guidance");
  console.log("✓ handoff: Cowork packet created with instructions, CTA guidance, evidence reqs, fallback rule");

  // 6. Failure + fallback (simulate Cowork unavailable). Task must NOT disappear.
  const fail = await post(`/api/social/${id}`, { action: "fail", failure_reason: "Cowork unavailable (simulated)" });
  assert(fail.body.item.status === "failed", "fail should set status=failed");
  assert(fail.body.item.failure_reason.includes("Cowork unavailable"), "failure reason should be recorded");
  const fallback = await post(`/api/social/${id}`, { action: "fallback", fallback_owner: "Hermes" });
  assert(fallback.body.item.status === "fallback", "fallback should set status=fallback");
  assert(fallback.body.item.fallback_owner === "Hermes", "fallback owner should be Hermes");
  assert(fallback.body.item.next_action, "fallback should set a visible next action");
  snap = await get("/api/social");
  const stillThere = snap.body.items.find((i) => i.id === id);
  assert(stillThere && stillThere.status === "fallback", "failed task must remain visible (not disappear)");
  assert(snap.body.state.failureQueue.some((p) => p.id === id), "task should appear in dashboard failureQueue");
  console.log("✓ fallback: failed task held with Hermes owner + next action, visible in failure queue");

  // 7. Evidence return on a separate happy-path item (no real publishing).
  const create2 = await post("/api/social", {
    platform: "facebook",
    post_text: "[SAFE TEST] proof post — do not publish",
    content_category: "Proof/Process Post",
    core_insight_or_reframe: "Show the system working.",
    intended_audience: "Home service operators",
    created_by: "Codex",
    submit_for_review: true,
  });
  const id2 = create2.body.item.id;
  await post(`/api/social/${id2}`, { action: "approve", approved_by: "Jonathan" });
  await post(`/api/social/${id2}`, { action: "handoff" });
  const evidence = await post(`/api/social/${id2}`, {
    action: "evidence",
    published_url: "https://example.com/safe-test-evidence",
    recorded_by: "Cowork",
    performance_notes: "Safe test — simulated evidence return.",
  });
  assert(evidence.body.item.status === "published", "evidence should set status=published");
  assert(evidence.body.item.published_url === "https://example.com/safe-test-evidence", "published_url should be recorded");
  assert(evidence.body.item.published_at, "published_at should be recorded");
  console.log("✓ evidence: Cowork evidence recorded, item published with URL + timestamp");

  // 8. Health/status panel reflects real activity + counts.
  const health = await get("/api/social/health");
  assert(health.body.backend_connected === true, "health should report backend connected");
  assert(health.body.data_source.includes(dataDir), "health should report the durable data source");
  assert(health.body.last_codex_content_prep, "health should report last Codex content prep");
  assert(health.body.last_approval_writeback, "health should report last approval write-back");
  assert(health.body.last_cowork_handoff, "health should report last Cowork handoff");
  assert(health.body.last_cowork_evidence, "health should report last Cowork evidence");
  assert(health.body.published_count >= 3, "health should count published items (2 imported + 1 test)");
  assert(health.body.failed_stalled_count >= 1, "health should count the fallback item");
  console.log("✓ health: panel reflects last-run timestamps + live counts");

  // 9. Durable persistence — records survive on disk in the isolated data dir.
  const onDisk = JSON.parse(readFileSync(path.join(dataDir, "social_drafts.json"), "utf8"));
  assert(onDisk.some((i) => i.id === id && i.status === "fallback"), "fallback item should be persisted on disk");
  assert(onDisk.some((i) => i.id === id2 && i.status === "published"), "published item should be persisted on disk");
  console.log("✓ persistence: workflow state durably written to disk");

  console.log("\nALL SOCIAL FLOW CHECKS PASSED ✅");
} catch (err) {
  console.error("\n❌ verify-social-flow failed:", err.message);
  console.error(getOutput().slice(-2000));
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  rmSync(dataDir, { recursive: true, force: true });
}
