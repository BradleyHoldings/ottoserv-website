// Hermes authenticated-browser DM executor. Safe by default: no send unless mode
// is explicitly "live" and a browser provider is wired. Evidence is created only
// from a real provider response containing a message id or thread URL.

import { promises as fs } from "node:fs";
import { loadRevenueDocument } from "./actorEvidenceIntake.mjs";
import { readActorQueue } from "./hermesActorQueue.mjs";
import { attachExecutionEvidence, advanceExecutionStatus } from "./approvalExecutionBridge.mjs";
import { upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";
import { recordLedgerEvents } from "./hermesOperatingLedger.mjs";

function clean(value) { return String(value ?? "").trim(); }
function asArray(value) { return Array.isArray(value) ? value : []; }
function lower(value) { return clean(value).toLowerCase(); }
function resolved(status) { return ["evidence_submitted", "hermes_reviewing", "completed", "cancelled"].includes(clean(status)); }

export const DM_EXECUTOR_DEFAULT_MODE = "no_send";
export const SUPPORTED_DM_PLATFORMS = ["linkedin", "facebook", "instagram", "x", "reddit"];

export function normalizeDmPlatform(value) {
  const p = lower(value).replace(/^twitter$/, "x");
  return SUPPORTED_DM_PLATFORMS.includes(p) ? p : "";
}

function dmPreflight(entry, ctx = {}) {
  const packet = entry?.actor_packet || entry?.taskPacket?.actor_packet || {};
  const body = packet.packet || {};
  const profileUrl = clean(body.profile_url || packet.contact?.profile_url || packet.profile_url);
  const platform = normalizeDmPlatform(body.platform || packet.platform || packet.channel?.replace(/_dm$/, ""));
  const message = clean(body.message || body.text || packet.message);
  const targetKey = lower(profileUrl || packet.lead_id || packet.company);
  const dnc = new Set(asArray(ctx.dnc).map(lower));
  const blacklist = new Set(asArray(ctx.blacklist).map(lower));
  const flags = asArray(ctx.flags).map(lower);

  if (!platform) return { status: "blocked", reason: "unsupported_or_missing_platform" };
  if (!profileUrl || !/^https?:\/\//i.test(profileUrl)) return { status: "blocked", reason: "missing_verified_profile_url" };
  if (!message) return { status: "blocked", reason: "missing_dm_message" };
  if (dnc.has(targetKey) || blacklist.has(targetKey)) return { status: "blocked", reason: "dnc_or_blacklist" };
  if (flags.some((f) => /upset|legal|refund|chargeback|custom.pric|guarantee|sensitive/.test(f))) {
    return { status: "gated", reason: "sensitive_or_exception_case" };
  }
  return { status: "ready", packet: { ...body, platform, profile_url: profileUrl, message } };
}

function evidenceFromDm(result, packet, now) {
  const messageId = clean(result?.message_id || result?.id);
  const threadUrl = clean(result?.thread_url);
  if (!messageId && !threadUrl) return null;
  const sentAt = clean(result?.sent_at) || now;
  return {
    evidence_type: "social_dm_sent",
    evidence_reference: messageId || threadUrl,
    evidence_summary: `DM sent on ${packet.platform} to ${packet.profile_url} at ${sentAt}; status=${clean(result?.status) || "sent"}; thread=${threadUrl || "n/a"}.`,
    submitted_by_agent: "Hermes",
    submitted_at: sentAt,
    redaction_status: "unredacted",
    evidence_metadata: {
      platform: packet.platform,
      profile_url: packet.profile_url,
      thread_url: threadUrl,
      screenshot_url: clean(result?.screenshot_url),
      message_id: messageId,
    },
  };
}

export async function executeDmQueue(document = {}, ctx = {}) {
  const now = ctx.now || new Date().toISOString();
  const mode = clean(ctx.mode) || DM_EXECUTOR_DEFAULT_MODE;
  const live = mode === "live";
  const provider = ctx.provider && typeof ctx.provider.sendDm === "function" ? ctx.provider : null;
  const items = asArray(document?.approvalExecutionQueue?.items);
  const entries = readActorQueue(document).filter((e) => ["dm", "social_dm"].includes(clean(e.actor_packet?.channel)) || /_dm$/.test(clean(e.actor_packet?.channel)));
  const entryByTask = new Map(entries.map((e) => [clean(e.actor_packet?.task_id || e.taskPacket?.task_id), e]));
  const nextItems = items.slice();
  const results = [];
  const ledgerEvents = [];
  let sent = 0;

  for (let i = 0; i < nextItems.length; i += 1) {
    const item = nextItems[i];
    const lc = item.lifecycle || {};
    const packet = item.taskPacket?.actor_packet || {};
    const channel = clean(packet.channel);
    if (!["dm", "social_dm"].includes(channel) && !/_dm$/.test(channel)) continue;
    const taskId = clean(packet.task_id || item.taskPacket?.task_id || lc.assigned_task_id);
    if (resolved(lc.execution_status)) { results.push({ task_id: taskId, status: "skipped", reason: `already_${clean(lc.execution_status)}` }); continue; }
    const pre = dmPreflight(entryByTask.get(taskId) || { actor_packet: packet }, ctx);
    if (pre.status !== "ready") { results.push({ task_id: taskId, status: pre.status, reason: pre.reason }); continue; }
    if (!live) { results.push({ task_id: taskId, status: "prepared", sent: false, platform: pre.packet.platform, profile_url: pre.packet.profile_url }); continue; }
    if (!provider) { results.push({ task_id: taskId, status: "no_browser_provider", sent: false }); continue; }

    let result;
    try { result = await provider.sendDm(pre.packet); }
    catch (error) {
      const failed = advanceExecutionStatus(lc, "failed", { now });
      if (failed.ok) nextItems[i] = { ...item, lifecycle: failed.lifecycle };
      results.push({ task_id: taskId, status: "failed", sent: false, reason: clean(error?.message) || "browser_provider_error" });
      ledgerEvents.push({ event_type: "status_changed", source_type: "execution_task", source_id: taskId, actor: "Hermes", to_status: "failed", outcome: "failure", detail: "DM browser execution failed.", dedupe_key: `${taskId}|failed` });
      continue;
    }

    const evidence = evidenceFromDm(result, pre.packet, now);
    if (!evidence) { results.push({ task_id: taskId, status: "failed", sent: false, reason: "provider_returned_no_dm_evidence" }); continue; }
    const withEvidence = attachExecutionEvidence(lc, evidence, { now });
    const completed = advanceExecutionStatus(withEvidence, "completed", { now });
    const finalLifecycle = completed.ok ? completed.lifecycle : withEvidence;
    nextItems[i] = { ...item, lifecycle: finalLifecycle };
    sent += 1;
    results.push({ task_id: taskId, status: "sent", sent: true, platform: pre.packet.platform, message_id: clean(result?.message_id), thread_url: clean(result?.thread_url), lifecycle_status: clean(finalLifecycle.execution_status) });
    ledgerEvents.push({ event_type: "status_changed", source_type: "execution_task", source_id: taskId, actor: "Hermes", to_status: clean(finalLifecycle.execution_status), outcome: "success", detail: `DM sent on ${pre.packet.platform}; evidence recorded.`, dedupe_key: `${taskId}|${clean(finalLifecycle.execution_status)}` });
  }

  const failed = results.filter((r) => r.status === "failed").length;
  const changed = sent > 0 || failed > 0;
  const nextDocument = changed ? { ...document, approvalExecutionQueue: { ...document.approvalExecutionQueue, items: nextItems } } : document;
  const summary = {
    mode,
    provider_wired: Boolean(provider),
    candidates: results.length,
    sent,
    prepared: results.filter((r) => r.status === "prepared").length,
    blocked: results.filter((r) => r.status === "blocked").length,
    gated: results.filter((r) => r.status === "gated").length,
    failed,
    no_browser_provider: results.filter((r) => r.status === "no_browser_provider").length,
    skipped: results.filter((r) => r.status === "skipped").length,
  };
  return { document: nextDocument, results, summary, ledgerEvents };
}

export async function applyDmExecution(options = {}) {
  const now = options.now || new Date().toISOString();
  const loaded = options.document !== undefined ? { available: true, document: options.document, source: { kind: "injected" } } : await loadRevenueDocument(options);
  if (!loaded.available) return { ok: false, reason: "state_unavailable", results: [], summary: null };
  const result = await executeDmQueue(loaded.document, { ...options, now });
  const changed = result.summary.sent > 0 || result.summary.failed > 0;
  let local = false;
  let supabase = { ok: false, skipped: true, reason: "disabled" };
  if (changed) {
    if (options.writeLocal !== false && loaded.source.kind === "local_file") {
      await fs.writeFile(loaded.source.file, `${JSON.stringify(result.document, null, 2)}\n`, "utf8");
      local = true;
    }
    if (options.persistSupabase !== false) supabase = await upsertRevenueState(result.document);
    if (options.recordLedger !== false && result.ledgerEvents.length) await recordLedgerEvents(result.ledgerEvents, { ...options, now });
  }
  return { ok: true, ...result, persisted: { local, supabase } };
}
