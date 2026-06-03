import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { writeFileSync } from "node:fs";
import os from "node:os";

import { createSocialEngine } from "../src/lib/socialContentEngine.mjs";
import {
  createFileSocialWorkflowStore,
  resolveWritableDataDir,
} from "../src/lib/socialWorkflowStore.mjs";
import { selectSocialStore } from "../src/lib/socialEngineServer.mjs";
import { supabaseConfigured } from "../src/lib/socialSupabaseStore.mjs";

function freshEngine(dir) {
  // A new engine + store each call proves state is durable, not in-memory.
  const store = createFileSocialWorkflowStore({
    filePath: path.join(dir, "social_drafts.json"),
    seedPath: null,
  });
  return createSocialEngine({ store });
}

test("file store persists the full social workflow across engine instances", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "social-engine-"));
  try {
    // Create + submit on one engine instance.
    const e1 = freshEngine(dir);
    const draft = await e1.createDraft({
      platform: "linkedin",
      post_text: "[SAFE TEST] persistence check",
      content_category: "Proof/Process Post",
      core_insight_or_reframe: "Durable source of truth.",
      intended_audience: "Operators",
      created_by: "Codex",
    });
    await e1.submitForReview(draft.id);

    // A brand-new engine instance must see it (proves filesystem persistence).
    const e2 = freshEngine(dir);
    const afterSubmit = await e2.getDashboardState();
    assert.ok(afterSubmit.posts.some((p) => p.id === draft.id), "draft persists to a new engine");

    // Approval write-back survives.
    const e3 = freshEngine(dir);
    const approved = await e3.approveDraft(draft.id, { approved_by: "Jonathan" });
    assert.equal(approved.status, "approved");
    assert.equal(approved.approved_by, "Jonathan");
    assert.ok(approved.approved_at, "approved_at recorded");

    // Handoff + evidence survive.
    const e4 = freshEngine(dir);
    await e4.routeApprovedItem(draft.id, "Cowork");
    const handed = await e4.recordExecutorHandoff(draft.id, { executor: "Cowork" });
    assert.equal(handed.status, "routed_to_executor");

    const e5 = freshEngine(dir);
    const published = await e5.recordEvidence(draft.id, {
      published_url: "https://example.com/safe-test",
      recorded_by: "Cowork",
    });
    assert.equal(published.status, "published");
    assert.equal(published.published_url, "https://example.com/safe-test");

    // Audit log accumulates across instances.
    const trail = await freshEngine(dir).getAuditTrail(draft.id);
    const actions = trail.map((t) => t.action);
    assert.ok(actions.includes("createDraft"));
    assert.ok(actions.includes("approveDraft"));
    assert.ok(actions.includes("recordEvidence"));

    assert.ok(existsSync(path.join(dir, "social_drafts.json")), "drafts file written to disk");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("failed tasks remain visible with a fallback owner (never disappear)", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "social-engine-fb-"));
  try {
    const engine = freshEngine(dir);
    const d = await engine.createDraft({ platform: "instagram", post_text: "[SAFE TEST] fallback", created_by: "Codex" });
    await engine.approveDraft(d.id, { approved_by: "Jonathan" });
    await engine.routeApprovedItem(d.id, "Cowork");
    await engine.markFailed(d.id, { failure_reason: "Cowork unavailable (simulated)" });
    const fb = await engine.assignFallback(d.id, "Hermes");

    assert.equal(fb.status, "fallback");
    assert.equal(fb.fallback_owner, "Hermes");
    assert.ok(fb.next_action, "fallback has a next action");

    const state = await freshEngine(dir).getDashboardState();
    assert.ok(state.failureQueue.some((p) => p.id === d.id), "failed task stays in failure queue");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("filesystem store falls back to a writable dir when the target is read-only (Vercel EROFS guard)", async () => {
  // Simulate an unwritable target by nesting a dir under a regular file, which
  // makes mkdir fail (ENOTDIR) even as root — mirrors /var/task read-only EROFS.
  const tmpFile = path.join(mkdtempSync(path.join(tmpdir(), "social-ro-")), "blocker");
  writeFileSync(tmpFile, "x");
  const unwritablePreferred = path.join(tmpFile, "social-engine"); // under a file → unwritable

  const resolved = resolveWritableDataDir(unwritablePreferred);
  assert.equal(resolved.writable, true, "resolver should fall back to a writable directory");
  assert.ok(resolved.dir.startsWith(os.tmpdir()), "fallback should live under os.tmpdir()");

  // A writable preferred dir should be used as-is (no needless fallback).
  const okDir = mkdtempSync(path.join(tmpdir(), "social-ok-"));
  const okResolved = resolveWritableDataDir(okDir);
  assert.equal(okResolved.dir, okDir, "writable preferred dir is used directly");
  assert.equal(okResolved.writable, true);

  // The store backed by the resolved fallback dir must read/write normally.
  const store = createFileSocialWorkflowStore({
    filePath: path.join(resolved.dir, `ro-test-${Date.now()}.json`),
    seedPath: null,
  });
  assert.equal(store.writable, true, "store on the fallback dir is writable");
  const created = await store.create({ id: "social-ro-1", status: "draft", post_text: "x", audit_log: [] });
  assert.equal(created.id, "social-ro-1");
  assert.ok(await store.get("social-ro-1"), "item is readable from the fallback dir");
  rmSync(okDir, { recursive: true, force: true });
});

test("store selection: filesystem by default, Supabase when configured/forced", async () => {
  const saved = {
    store: process.env.SOCIAL_ENGINE_STORE,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
  };
  try {
    // Default (no Supabase env) → filesystem.
    delete process.env.SOCIAL_ENGINE_STORE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    assert.equal(supabaseConfigured(), false);
    assert.equal(selectSocialStore().type, "filesystem", "defaults to filesystem without Supabase");

    // Supabase env present (no network call happens until a method is used).
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "service-key-test";
    assert.equal(supabaseConfigured(), true);
    assert.equal(selectSocialStore().type, "supabase", "uses Supabase when configured");
    assert.equal(selectSocialStore().writable, true, "Supabase store is writable");

    // Forced filesystem overrides auto-detection.
    process.env.SOCIAL_ENGINE_STORE = "filesystem";
    assert.equal(selectSocialStore().type, "filesystem", "SOCIAL_ENGINE_STORE=filesystem forces filesystem");
  } finally {
    for (const [k, v] of [["SOCIAL_ENGINE_STORE", saved.store], ["NEXT_PUBLIC_SUPABASE_URL", saved.url], ["SUPABASE_SERVICE_KEY", saved.key]]) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
