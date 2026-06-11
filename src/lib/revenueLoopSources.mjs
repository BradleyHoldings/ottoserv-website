// ─── Revenue loop source adapter (autonomous/headless plane) ──────────────────
//
// WHY THIS EXISTS
// `src/lib/revenueEngine.mjs` is a pure, deterministic engine. It only produces
// real queues, real failures, real repair packets, and an honest health status
// when it is FED real state. The browser dashboard already feeds it via
// `dashboardApi.getRevenueDashboardState()` (platform JWT → live leads/calls/
// social). The autonomous entrypoint `scripts/revenue-daily-loop.mjs`, however,
// historically called `createDailyLoopRun({ now, cycle, maxVolume })` with NO
// data — so the headless loop always reported "healthy / ready" with empty
// queues even when the cold-lead pipeline was empty. That is the exact opposite
// of a self-checking revenue engine.
//
// This module is the missing glue for the headless plane. It reads the same
// local JSON ledgers the website writes (call-imports leads/outcomes, social
// drafts, process scans) and assembles the `input` object the engine expects,
// PLUS:
//   - staleness/empty-rail detection that surfaces as engine `failures`
//     (so an empty pipeline flips the loop to "repair_first", not a false
//     "ready"),
//   - implementation work-order seeds derived from saved Front Office Leak
//     Check / ProcessScan results (the cold-lead → paid-client → implementation
//     hand-off that previously dead-ended at a report).
//
// It does NOT modify the engine and does NOT require any credentials. All paths
// are overridable so tests can point at a temp dir.

import { promises as fs } from "node:fs";
import path from "node:path";

// ─── Path resolution (all overridable for tests / production) ─────────────────

export function resolveSourcePaths(options = {}) {
  const cwd = options.cwd || process.cwd();
  const callImportDir =
    options.callImportDir ||
    process.env.OTTO_CALL_IMPORT_DATA_DIR ||
    path.join(cwd, "data", "call-imports");
  const socialDir =
    options.socialDir ||
    process.env.SOCIAL_ENGINE_DATA_DIR ||
    path.join(cwd, "data", "social-engine");
  return {
    leads: path.join(callImportDir, "leads.json"),
    callOutcomes: path.join(callImportDir, "call_outcomes.json"),
    formSubmissions: path.join(callImportDir, "form_submissions.json"),
    socialDrafts: path.join(socialDir, "social_drafts.json"),
    socialSeed: path.join(socialDir, "seed", "drafts.json"),
    processScans: options.processScansPath || path.join(cwd, "data", "process_scans.json"),
  };
}

async function readJsonSafe(filePath, fallback) {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value ?? "").trim();
}

function isWithinDays(iso, days, now) {
  const t = Date.parse(clean(iso));
  if (Number.isNaN(t)) return false;
  return Date.parse(now) - t <= days * 24 * 60 * 60 * 1000;
}

// ─── Loaders ──────────────────────────────────────────────────────────────────

export async function loadLeads(paths) {
  return asArray(await readJsonSafe(paths.leads, []));
}

export async function loadCallOutcomes(paths) {
  return asArray(await readJsonSafe(paths.callOutcomes, []));
}

export async function loadProcessScans(paths) {
  const raw = await readJsonSafe(paths.processScans, []);
  // processScans store may persist either an array or { scans: [...] }.
  if (Array.isArray(raw)) return raw;
  return asArray(raw?.scans);
}

const ACTIONABLE_SOCIAL_STATUSES = new Set([
  "draft",
  "pending_review",
  "approved",
  "scheduled",
  "handed_to_cowork",
  "ready",
]);

export async function loadSocialItems(paths) {
  // Prefer the mutable runtime ledger; fall back to the committed seed so the
  // loop still reflects real content state out of the box.
  let items = asArray(await readJsonSafe(paths.socialDrafts, null));
  if (!items.length) items = asArray(await readJsonSafe(paths.socialSeed, []));
  // Only surface items that still need action — published/failed items are not
  // open content work.
  return items.filter((item) => ACTIONABLE_SOCIAL_STATUSES.has(clean(item.status)));
}

// ─── Failure / staleness detection (the self-checking part) ───────────────────
//
// These are emitted as engine `failures` so the existing repair router classifies
// and owns them, and so health flips to degraded/repair_first when a revenue rail
// is empty or stale. Honest empty state must look broken, not "ready".

export function detectFailures({ leads, callOutcomes, paths }) {
  const failures = [];

  // 1. Empty cold-lead pipeline — nothing can move without leads.
  if (!leads.length) {
    failures.push({
      item_id: "lead_discovery_rail",
      channel: "lead_discovery",
      expected_behavior: "Cold-lead pipeline has fresh imported leads daily so outreach and calls can run.",
      actual_behavior: `No leads found in ${paths.leads}. The pipeline is empty (missing data) — revenue cannot move.`,
      evidence_logs: [paths.leads],
    });
  }

  // 2. Call rail idle — A-tier leads are ready to call but no outcomes recorded.
  const aTierReady = leads.filter(
    (lead) => clean(lead.tier) === "A-tier" && clean(lead.normalized_phone || lead.phone),
  );
  if (aTierReady.length && !callOutcomes.length) {
    failures.push({
      item_id: "call_rail_idle",
      channel: "phone_call_retell_morgan",
      expected_behavior: "Approved A-tier leads produce logged call outcomes (call id + result).",
      actual_behavior: `${aTierReady.length} A-tier lead(s) ready to call but no call outcomes have been recorded. Call rail (Retell/Morgan) appears idle.`,
      evidence_logs: [paths.callOutcomes],
    });
  }

  // 3. Call outcomes flagged for human review / bad data — route for repair/review.
  const needsAttention = callOutcomes.filter((o) =>
    ["needs_human_review", "bad_number", "wrong_business"].includes(clean(o.status)),
  );
  for (const outcome of needsAttention) {
    const isData = ["bad_number", "wrong_business"].includes(clean(outcome.status));
    failures.push({
      item_id: clean(outcome.outcome_id) || "call_outcome_attention",
      channel: isData ? "lead_data_quality" : "approval",
      expected_behavior: "Call outcomes are clean or auto-progress without blocking the rail.",
      actual_behavior: isData
        ? `Call outcome ${clean(outcome.status)} for lead ${clean(outcome.lead_id)} indicates a missing/required data problem to clean.`
        : `Call outcome needs human review (blocked pending approval) for lead ${clean(outcome.lead_id)}: ${clean(outcome.summary) || "no summary"}.`,
      evidence_logs: [clean(outcome.recording_link), clean(outcome.transcript_link)].filter(Boolean),
    });
  }

  return failures;
}

export function detectRevenueRisks({ leads, social, scans, now }) {
  const risks = [];
  if (!leads.length) {
    risks.push("Cold-lead pipeline is empty — run lead discovery/import before outreach, calls, or revenue can move.");
  } else {
    const freshLeads = leads.filter((lead) => isWithinDays(lead.created_at, 2, now));
    if (!freshLeads.length) {
      risks.push("No leads imported in the last 2 days — top of funnel is going stale.");
    }
  }
  if (!social.length) {
    risks.push("No actionable social content in the workflow — content rail has nothing queued.");
  }
  const reportReadyScans = scans.filter((s) => clean(s.status) === "report_ready" || clean(s.report_status) === "ready");
  const unactionedScans = reportReadyScans.filter((s) => !clean(s.email_sent_at));
  if (unactionedScans.length) {
    risks.push(
      `${unactionedScans.length} Front Office Leak Check report(s) ready but not yet delivered/followed up — service-delivery hand-off is stalling.`,
    );
  }
  return risks;
}

// ─── Service delivery spine: leak-check / scan → implementation work order ────
//
// Audit found saved scans dead-end at a report. This turns each report-ready scan
// into an implementation work-order SEED so the cold-lead → paid-client →
// implementation path is visible and actionable. We do not create real
// work-order storage here (that's a larger change); these seeds are carried in
// the loop output for Hermes/Codex to action.

export function buildImplementationWorkOrders(scans = []) {
  return scans
    .filter((scan) => clean(scan.status) === "report_ready" || clean(scan.report_status) === "ready")
    .map((scan) => {
      const delivered = Boolean(clean(scan.email_sent_at));
      return {
        id: `impl-${clean(scan.id) || clean(scan.public_report_slug) || "scan"}`,
        source: "front_office_leak_check",
        scan_id: clean(scan.id),
        company: clean(scan.company_name),
        contact: clean(scan.contact_name),
        email: clean(scan.email),
        main_leak: clean(scan.main_leak),
        pilot_recommendation: clean(scan.pilot_recommendation) || clean(scan.recommended_next_step),
        automation_opportunities: asArray(scan.automation_opportunities_json),
        report_url: clean(scan.public_report_url),
        // Pipeline stage gating: report → deliver → scope pilot → proposal/payment
        // → implementation work order. High-risk steps (pricing, payment links,
        // production work) stay approval-gated by policy.
        stage: delivered ? "awaiting_pilot_scope_or_proposal" : "report_ready_awaiting_delivery",
        next_action: delivered
          ? "Scope a 30-day pilot → send approved proposal/payment link → open implementation work order."
          : "Deliver the leak check report, then follow up to scope a pilot.",
        approval_required: true,
        approval_reason: "Proposals, pricing, payment links, and client-facing pilot scopes require Jonathan approval.",
        evidence_requirement: "Signed pilot scope or paid pilot before an implementation work order is opened.",
      };
    });
}

// ─── Assemble the full engine input + service-delivery output ─────────────────

export async function assembleRevenueLoopInput(options = {}) {
  const now = options.now || new Date().toISOString();
  const cycle = options.cycle || "daily";
  const maxVolume = Number(options.maxVolume || 10);
  const paths = resolveSourcePaths(options);

  const [leads, callOutcomes, social, scans] = await Promise.all([
    loadLeads(paths),
    loadCallOutcomes(paths),
    loadSocialItems(paths),
    loadProcessScans(paths),
  ]);

  const failures = detectFailures({ leads, callOutcomes, paths, now });
  const revenueRisks = detectRevenueRisks({ leads, callOutcomes, social, scans, now });
  const serviceDelivery = buildImplementationWorkOrders(scans);
  const bookedCalls = callOutcomes.filter((o) => clean(o.status) === "booked_meeting").length;

  const input = {
    now,
    cycle,
    maxVolume,
    leads,
    socialItems: social,
    failures,
    revenueRisks,
    brokenRails: failures.map((f) => f.item_id),
    bookedCalls,
  };

  return {
    input,
    scans,
    serviceDelivery,
    sources: {
      leads_count: leads.length,
      call_outcomes_count: callOutcomes.length,
      actionable_social_count: social.length,
      process_scans_count: scans.length,
      report_ready_scans: serviceDelivery.length,
      booked_calls: bookedCalls,
      failures_detected: failures.length,
      revenue_risks: revenueRisks.length,
      paths,
    },
  };
}
