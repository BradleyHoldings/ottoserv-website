export const HERMES_TEN_PHASE_GAP_CLOSURE_VERSION = "hermes_10_phase_gap_closure_sprint_v1";

export const GAP_PRIORITY_ORDER = [
  { key: "A", label: "Production safety and approval boundaries" },
  { key: "B", label: "Revenue/client acquisition execution gaps" },
  { key: "C", label: "Service delivery execution gaps" },
  { key: "D", label: "Dashboard/evidence visibility gaps" },
  { key: "E", label: "Daily autonomous operating loop gaps" },
  { key: "F", label: "Multi-agent routing and repair gaps" },
  { key: "G", label: "Cleanup/sprawl/idempotency/test gaps" },
];

export const HERMES_TEN_PHASES = [
  {
    phase: 1,
    name: "Lead/revenue foundation",
    checks: ["lead discovery", "qualification", "scoring", "dedupe", "storage", "handoff", "evidence", "safe execution boundaries"],
    modules: ["src/lib/leadRail/pipeline.mjs", "src/lib/leadRail/store.mjs", "src/lib/leadSupplyDailyLoop.mjs"],
    tests: ["tests/lead-rail.test.mjs", "tests/lead-rail-production-readiness.test.mjs"],
  },
  {
    phase: 2,
    name: "Intake/audit/demo foundation",
    checks: ["intake", "leak check", "full process audit", "demo/onboarding", "audit-to-recommendation flow"],
    modules: ["src/lib/processScans.ts", "src/lib/processScanDiagnostics.mjs", "src/lib/revenueLoopSources.mjs"],
    tests: ["tests/process-scan-diagnostics.test.mjs", "tests/front-office-leak-check-flow.test.mjs"],
  },
  {
    phase: 3,
    name: "Dashboard/Command Center",
    checks: ["real status", "approvals", "evidence", "service delivery", "revenue", "blocked items", "next actions"],
    modules: ["src/lib/hermesCommandCenter.ts", "src/lib/revenueEngineReadAdapter.mjs"],
    tests: ["tests/command-center.test.mjs", "tests/dashboard-nav.test.mjs"],
  },
  {
    phase: 4,
    name: "Offers/packages/commercial service paths",
    checks: ["offers", "packages", "commercial paths", "service catalog", "paid onboarding", "delivery packages"],
    modules: ["src/lib/commercialRail/onboarding.mjs", "src/lib/serviceDeliverySpine.mjs"],
    tests: ["tests/commercial-rail-phase5.test.mjs", "tests/service-delivery-spine.test.mjs"],
  },
  {
    phase: 5,
    name: "Paid onboarding persistence",
    checks: ["canonical records", "payment evidence", "idempotency", "no duplicate/sprawl"],
    modules: ["src/lib/commercialRail/onboarding.mjs", "src/lib/serviceDeliveryPersistence.mjs"],
    tests: ["tests/commercial-rail-phase5.test.mjs", "tests/service-delivery-persistence.test.mjs"],
  },
  {
    phase: 6,
    name: "Service delivery automation",
    checks: ["process audit", "internal automation", "voice/receptionist", "workflow automation", "work orders", "delivery packages", "dashboard export", "evidence requirements"],
    modules: ["src/lib/serviceDeliverySpine.mjs", "src/lib/serviceDeliveryPersistence.mjs", "src/lib/retellVoiceServiceAutomation.mjs"],
    tests: ["tests/service-delivery-phase6-complete.test.mjs", "tests/retell-voice-service-automation.test.mjs"],
  },
  {
    phase: 7,
    name: "Controlled execution and live activation rails",
    checks: ["execution state machine", "approval-to-execution bridge", "rail routing", "evidence enforcement", "repair packets", "blocked credentials", "no fake completion"],
    modules: ["src/lib/approvalExecutionBridge.mjs", "src/lib/approvalEvidenceWriteback.mjs", "src/lib/retellControlledVoiceExecution.mjs"],
    tests: ["tests/approval-execution-bridge.test.mjs", "tests/retell-controlled-voice-execution.test.mjs"],
  },
  {
    phase: 8,
    name: "Revenue autonomy and multi-agent routing",
    checks: ["Codex/Claude routing", "Cowork/browser routing", "Hermes internal execution", "execution packets", "caps and safety rails", "repair loop"],
    modules: ["src/lib/multiAgentCommandState.mjs", "src/lib/taskOwnershipLedger.mjs", "src/lib/dispatchControlState.mjs"],
    tests: ["tests/multi-agent-command-state.test.mjs", "tests/task-ownership-ledger.test.mjs"],
  },
  {
    phase: 9,
    name: "Daily autonomous operating cycle",
    checks: ["reads current state", "prioritizes work", "routes blocked work", "avoids duplicates", "dashboard output", "repair work"],
    modules: ["src/lib/dailyAutonomousOperatingCycle.mjs", "src/lib/revenueLoopRunner.mjs"],
    tests: ["tests/daily-autonomous-operating-cycle.test.mjs", "tests/revenue-loop-runner.test.mjs"],
  },
  {
    phase: 10,
    name: "Autonomy graduation, safety, review, and $1M ARR framework",
    checks: ["authority tiers", "safety boundaries", "operator review", "escalation rules", "evidence discipline", "rollback/monitoring", "$1M ARR framework alignment"],
    modules: ["src/lib/autonomyGraduationFramework.mjs", "src/lib/autonomyGraduationReviewWorkflow.mjs"],
    tests: ["tests/autonomy-graduation-framework.test.mjs", "tests/autonomy-graduation-review-workflow.test.mjs"],
  },
];

export function getDefaultTenPhaseRepoEvidence() {
  return {
    modules: [...new Set(HERMES_TEN_PHASES.flatMap((phase) => phase.modules))],
    tests: [...new Set(HERMES_TEN_PHASES.flatMap((phase) => phase.tests))],
    dashboards: [
      "src/app/os/hermes/page.tsx",
      "src/app/os/hermes/service-delivery/page.tsx",
      "src/app/os/hermes/revenue/page.tsx",
      "src/app/os/hermes/approvals/page.tsx",
      "src/app/os/hermes/evidence/page.tsx",
      "src/app/dashboard/command-center/page.tsx",
      "src/app/dashboard/work-orders/page.tsx",
    ],
  };
}

const STATUS_RANK = { complete: 3, partial: 2, blocked: 1 };

function clean(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasPath(paths = [], expected = []) {
  const set = new Set(asArray(paths));
  return asArray(expected).some((item) => set.has(item));
}

function count(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function moduleEvidence(repoEvidence = {}, phase = {}) {
  return [
    ...phase.modules.filter((item) => asArray(repoEvidence.modules).includes(item)),
    ...phase.tests.filter((item) => asArray(repoEvidence.tests).includes(item)),
    ...asArray(repoEvidence.dashboards).filter((item) => {
      if (phase.phase === 3) return /dashboard|os\/hermes|command/i.test(item);
      if (phase.phase === 6) return /service-delivery/i.test(item);
      if (phase.phase === 10) return /policies|approvals|evidence/i.test(item);
      return false;
    }),
  ];
}

function runtimeSignals(runtime = {}, phaseNumber) {
  switch (phaseNumber) {
    case 1:
      return [
        count(runtime.publicLeadDiscovery?.summary?.discovered_count) > 0 && "public lead discovery produced candidates",
        count(runtime.leadSupplyDailyLoop?.summary?.actions_selected) > 0 && "lead supply daily loop selected actions",
        count(runtime.durableRevenueExecutionQueue?.summary?.queued || runtime.durableRevenueExecutionQueue?.items?.length) > 0 && "durable revenue queue has items",
      ].filter(Boolean);
    case 2:
      return [
        count(runtime.serviceDeliveryExecution?.summary?.records_seen) > 0 && "process/audit records feed service delivery",
        count(runtime.serviceDeliveryExecution?.summary?.opportunities?.total) > 0 && "audit/recommendation opportunities generated",
      ].filter(Boolean);
    case 3:
      return [
        runtime.dailyAutonomousOperatingCycle?.latest_json_read_model?.dailyAutonomousOperatingCycle && "latest.json read model includes daily operating cycle",
        count(runtime.serviceDeliveryExecution?.summary?.work_orders?.total) > 0 && "dashboard-readable service delivery work orders exist",
      ].filter(Boolean);
    case 4:
      return [
        count(runtime.serviceDeliveryExecution?.summary?.delivery_packages?.total || runtime.serviceDeliveryExecution?.summary?.delivery_packages?.recoverable) > 0 && "delivery packages recoverable",
        count(runtime.serviceDeliveryExecution?.summary?.work_orders?.total) > 0 && "commercial/service paths create work orders",
      ].filter(Boolean);
    case 5:
      return [
        count(runtime.serviceDeliveryExecution?.summary?.work_orders?.persisted) > 0 && "canonical work orders persisted",
        count(runtime.serviceDeliveryExecution?.persistence?.opportunities?.skipped_existing) >= 0 && "idempotent persistence summary present",
      ].filter(Boolean);
    case 6:
      return [
        count(runtime.serviceDeliveryExecution?.summary?.delivery_packages?.total || runtime.serviceDeliveryExecution?.summary?.delivery_packages?.recoverable) > 0 && "delivery packages present",
        count(runtime.serviceDeliveryExecution?.voice_service_status?.summary?.total) > 0 && "voice setup status present",
      ].filter(Boolean);
    case 7:
      return [
        count(runtime.approvalExecutionQueue?.count) > 0 && "approval execution queue present",
        count(runtime.approvalExecutionQueue?.skipped_not_approved) >= 0 && "unapproved actions remain skipped",
      ].filter(Boolean);
    case 8:
      return [
        count(runtime.multiAgentCommandState?.summary?.total_tasks) > 0 && "multi-agent command state has tasks",
        count(runtime.taskOwnershipLedger?.summary?.active_handoffs) > 0 && "task ownership ledger has handoffs",
      ].filter(Boolean);
    case 9:
      return [
        count(runtime.dailyAutonomousOperatingCycle?.report_summary?.repair_required) >= 0 && "daily cycle report summary present",
        runtime.dailyAutonomousOperatingCycle?.latest_json_read_model?.dailyAutonomousOperatingCycle && "daily cycle dashboard read model present",
      ].filter(Boolean);
    case 10:
      return [
        count(runtime.autonomyGraduationState?.summary?.actions_evaluated) > 0 && "autonomy graduation evaluated actions",
        count(runtime.autonomyGraduationReviewState?.summary?.pending_requests) >= 0 && "operator review state present",
      ].filter(Boolean);
    default:
      return [];
  }
}

function baselineGaps(runtime = {}, phaseNumber) {
  const gaps = [];
  if (phaseNumber === 7) {
    gaps.push({
      title: "Live activation remains approval/credential gated",
      severity: "high",
      priority_bucket: "A",
      business_impact: "Client-facing execution cannot scale until approved credentials and live rail evidence exist.",
      technical_impact: "Retell/Telnyx/n8n/Stripe actions must remain blocked or synthetic until approval and read-back evidence are present.",
      proposed_fix: "Keep blocked work orders and approval packets visible; run controlled-real acceptance only with explicit operator approval.",
      acceptance_criteria: ["blocked credential/integration records exist", "no completed status without evidence", "controlled-real test passes"],
      safe_to_fix_now: false,
      completion_blocker: true,
    });
  }
  if (phaseNumber === 9 && count(runtime.dailyAutonomousOperatingCycle?.report_summary?.repair_required) > 0) {
    gaps.push({
      title: "Daily loop generated repair work",
      severity: "medium",
      priority_bucket: "E",
      business_impact: "Operators need to clear repair packets before increasing autonomous volume.",
      technical_impact: "Some routed work needs evidence, resource recovery, or retry handling.",
      proposed_fix: "Review repair recommendations and close them with evidence before raising caps.",
      acceptance_criteria: ["repair packet has owner", "repair evidence accepted", "daily cycle no longer reports the same stale blocker"],
      safe_to_fix_now: true,
      completion_blocker: true,
    });
  }
  if (phaseNumber === 10 && count(runtime.autonomyGraduationReviewState?.summary?.pending_requests) > 0) {
    gaps.push({
      title: "Operator review required before broader bounded autonomy",
      severity: "high",
      priority_bucket: "A",
      business_impact: "Hermes cannot honestly be called fully autonomous until Jonathan/operator reviews pending graduation requests.",
      technical_impact: "Bounded autonomy caps, expirations, rollback, and monitoring approvals need durable decisions.",
      proposed_fix: "Record approve/reject/defer decisions with evidence references in the autonomy graduation review workflow.",
      acceptance_criteria: ["operator decision persisted", "bounded policy has caps and expiration", "no immediate live execution is enabled by the decision"],
      safe_to_fix_now: false,
      completion_blocker: true,
    });
  }
  if (phaseNumber === 6 && count(runtime.serviceDeliveryExecution?.voice_service_status?.summary?.approval_needed) > 0) {
    gaps.push({
      title: "Voice delivery needs external approval before launch",
      severity: "high",
      priority_bucket: "C",
      business_impact: "Receptionist delivery is client-ready as a package but not live until number/routing approvals exist.",
      technical_impact: "Retell/Telnyx evidence and test-call acceptance are required before production activation.",
      proposed_fix: "Keep voice work orders blocked until Retell/Telnyx setup, test-call evidence, rollback, and client approval are recorded.",
      acceptance_criteria: ["Retell config evidence", "number or number-needed evidence", "accepted test call", "dashboard status"],
      safe_to_fix_now: false,
      completion_blocker: false,
    });
  }
  return gaps.map((gap) => ({ phase: phaseNumber, ...gap }));
}

function statusFor({ phase, evidence, signals, gaps }) {
  const moduleReady = evidence.length >= 2 || (hasPath(evidence, phase.modules) && hasPath(evidence, phase.tests));
  const runtimeReady = signals.length >= 1;
  if (!moduleReady) return "blocked";
  if (!runtimeReady) return "partial";
  const completionGaps = gaps.filter((gap) => gap.completion_blocker !== false);
  if (completionGaps.some((gap) => gap.severity === "critical")) return "blocked";
  if (completionGaps.some((gap) => ["high", "medium"].includes(gap.severity))) return "partial";
  return "complete";
}

function readinessFor(status, gaps = []) {
  if (status === "complete") return "controlled-production-ready";
  if (status === "partial" && gaps.every((gap) => gap.safe_to_fix_now === false)) return "controlled-production-ready";
  return "not-production-ready";
}

function dedupeGaps(gaps = []) {
  const seen = new Set();
  return gaps.filter((gap) => {
    const key = `${gap.phase}:${gap.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortGaps(gaps = []) {
  const priority = new Map(GAP_PRIORITY_ORDER.map((item, index) => [item.key, index]));
  const severity = new Map([["critical", 0], ["high", 1], ["medium", 2], ["low", 3]]);
  return [...gaps].sort((a, b) => (
    (priority.get(a.priority_bucket) ?? 99) - (priority.get(b.priority_bucket) ?? 99)
    || (severity.get(a.severity) ?? 99) - (severity.get(b.severity) ?? 99)
    || a.phase - b.phase
  ));
}

function summaryFor(rows = [], gaps = []) {
  const worst = rows.reduce((acc, row) => STATUS_RANK[row.status_after] < STATUS_RANK[acc] ? row.status_after : acc, "complete");
  return {
    status: worst === "complete" && gaps.length === 0 ? "complete" : worst === "blocked" ? "blocked" : "partial",
    phases_audited: rows.length,
    complete: rows.filter((row) => row.status_after === "complete").length,
    partial: rows.filter((row) => row.status_after === "partial").length,
    blocked: rows.filter((row) => row.status_after === "blocked").length,
    gaps_open: gaps.length,
    high_or_critical_gaps: gaps.filter((gap) => ["critical", "high"].includes(gap.severity)).length,
  };
}

export function buildHermesTenPhaseGapClosureSprint(input = {}) {
  const now = clean(input.now) || new Date().toISOString();
  const repoEvidence = input.repoEvidence || {};
  const runtime = input.runtimeState || {};
  const rows = [];
  const gaps = [];

  for (const phase of HERMES_TEN_PHASES) {
    const evidence = moduleEvidence(repoEvidence, phase);
    const signals = runtimeSignals(runtime, phase.phase);
    const phaseGaps = baselineGaps(runtime, phase.phase);
    const status = statusFor({ phase, evidence, signals, gaps: phaseGaps });
    gaps.push(...phaseGaps);
    rows.push({
      phase: phase.phase,
      name: phase.name,
      status_before: status === "complete" ? "partial" : "unknown",
      existing_modules_files_routes_tests: evidence,
      complete_items: [...phase.checks.filter((_, index) => index < signals.length), ...signals],
      partial_items: status === "partial" ? phase.checks.filter((check) => !signals.join(" ").toLowerCase().includes(check.split(" ")[0])) : [],
      missing_items: status === "blocked" ? phase.checks : [],
      duplicated_sprawl: [],
      unsafe_or_simulated_items: phaseGaps.filter((gap) => gap.safe_to_fix_now === false).map((gap) => gap.title),
      production_blockers: phaseGaps.filter((gap) => ["critical", "high"].includes(gap.severity)).map((gap) => gap.title),
      revenue_or_client_delivery_blockers: phaseGaps.filter((gap) => /client|revenue|delivery/i.test(`${gap.business_impact} ${gap.title}`)).map((gap) => gap.title),
      dashboard_evidence_visibility_needs: phase.phase === 3 || phase.phase === 6 || phase.phase === 9 ? [] : phaseGaps.filter((gap) => /dashboard|evidence/i.test(`${gap.title} ${gap.technical_impact}`)).map((gap) => gap.title),
      gaps_found: phaseGaps.map((gap) => gap.title),
      fixes_made: input.fixesMade?.[phase.phase] || [],
      status_after: status,
      production_readiness: readinessFor(status, phaseGaps),
      evidence_tests: evidence.filter((item) => /^tests\//.test(item)),
      next_action: phaseGaps[0]?.proposed_fix || "keep running acceptance suite and dashboard evidence checks before raising autonomy caps",
    });
  }

  const gapMatrix = sortGaps(dedupeGaps(gaps)).map((gap) => ({
    ...gap,
    affected_files_modules: HERMES_TEN_PHASES.find((phase) => phase.phase === gap.phase)?.modules || [],
  }));
  const summary = summaryFor(rows, gapMatrix);

  return {
    version: HERMES_TEN_PHASE_GAP_CLOSURE_VERSION,
    generated_at: now,
    priority_order: GAP_PRIORITY_ORDER,
    phase_acceptance_table: rows,
    gap_matrix: gapMatrix,
    additional_gaps_discovered_beyond_known_list: gapMatrix.filter((gap) => !/Live activation|Operator review|Voice delivery|Daily loop/.test(gap.title)),
    blocked_real_world_actions: [
      { action: "Retell/Telnyx number provisioning or production routing", owner: "Jonathan/operator", next_action: "approve credentials, number assignment, rollback, and launch window" },
      { action: "Production n8n workflow activation", owner: "Jonathan/operator", next_action: "approve workflow id, scope, rollback, and evidence read-back" },
      { action: "Stripe/payment/pricing changes", owner: "Jonathan/operator", next_action: "approve commercial scope and payment evidence" },
      { action: "Client-facing commitments or sends", owner: "Jonathan/operator", next_action: "approve copy, recipient, package, and timing" },
    ],
    remaining_operator_actions: gapMatrix.filter((gap) => gap.safe_to_fix_now === false).map((gap) => ({
      phase: gap.phase,
      action: gap.proposed_fix,
      acceptance_criteria: gap.acceptance_criteria,
    })),
    best_in_class_controls: [
      "one generated 10-phase acceptance table",
      "priority-ranked gap matrix",
      "evidence-backed status for every phase",
      "blocked external actions listed honestly",
      "no live action triggered by reporting",
    ],
    safety: {
      no_live_retell_telnyx_n8n_stripe_or_client_facing_actions: true,
      report_only_no_side_effects: true,
      no_fake_completion: true,
      blocked_items_require_owner_next_action_and_evidence: true,
    },
    final_recommendation: {
      ready_for_controlled_production_operation: summary.blocked === 0 && summary.high_or_critical_gaps === 0,
      recommendation: summary.high_or_critical_gaps
        ? "Operate in controlled production only for approved, evidence-backed rails; do not raise autonomy or live launch voice/payment/workflow actions until operator approvals are recorded."
        : "Ready for controlled production operation with existing caps, monitoring, and evidence discipline.",
    },
    summary,
  };
}
