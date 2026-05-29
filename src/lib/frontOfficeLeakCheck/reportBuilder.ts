import type {
  FrontOfficeAuditInput,
  FrontOfficePremiumReport,
  LeakFinding,
  ParsedFrontOfficeNotes,
  ProcessMapStep,
  RecommendedAutomation,
} from "./reportContract";

function readSectionValue(
  notes: ParsedFrontOfficeNotes,
  section: string,
  key: string,
): string | undefined {
  const value = notes.sections?.[section]?.[key];
  if (value == null || value === "") return undefined;
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function hasAnySignal(signals: string[], patterns: string[]): boolean {
  const joined = signals.join(" ").toLowerCase();
  return patterns.some((pattern) => joined.includes(pattern));
}

function cleanLabel(value: string | undefined | null, fallback: string): string {
  if (!value || value.trim().length === 0) return fallback;
  return value.trim();
}

function makeFinding(
  title: string,
  severity: LeakFinding["severity"],
  observedEvidence: string,
  revenueImpact: string,
  customerExperienceImpact: string,
  recommendedFix: string,
): LeakFinding {
  return {
    title,
    severity,
    observedEvidence,
    revenueImpact,
    customerExperienceImpact,
    recommendedFix,
    approvalRequirement: "Internal preview only. Jonathan approval required before client delivery, workflow automation, or production changes.",
  };
}

function buildProcessMap(findings: LeakFinding[], tools: string): ProcessMapStep[] {
  const base: ProcessMapStep[] = [
    {
      label: "Lead arrives",
      currentState: "Prospect submits the Front Office Leak Check intake.",
      premiumState: "Capture source, urgency, service fit, and owner in one structured intake record.",
      risk: "Weak source tracking makes follow-up and revenue attribution harder.",
    },
    {
      label: "Triage and qualification",
      currentState: "Review intake fields, pain tags, and notes manually.",
      premiumState: "Classify leak severity, response urgency, and next-best action before outreach.",
      risk: "High-intent prospects can stall if triage is inconsistent.",
    },
    {
      label: "Follow-up plan",
      currentState: "Use the submitted bottleneck and contact preferences to prepare next steps.",
      premiumState: "Create an approval-gated follow-up package with audit summary, proposed fixes, and owner.",
      risk: "Manual follow-up can become slow or generic without a packaged recommendation.",
    },
    {
      label: "Automation roadmap",
      currentState: tools ? `Existing tools noted: ${tools}.` : "Existing tools are not clearly captured yet.",
      premiumState: "Map missed calls, routing, CRM, reminders, and reporting into a phased automation plan.",
      risk: "Tool gaps remain hidden until delivery unless documented early.",
    },
  ];

  if (findings.length > 0) {
    base.splice(2, 0, {
      label: "Leak diagnosis",
      currentState: `${findings.length} front-office leak signal${findings.length === 1 ? "" : "s"} detected from intake data.`,
      premiumState: "Turn each leak into evidence, impact, recommended fix, and approval requirement.",
      risk: "Findings can sound generic if evidence is not tied to intake data.",
    });
  }

  return base;
}

function buildMermaidPreview(steps: ProcessMapStep[]): string {
  const lines = ["flowchart LR"];
  steps.forEach((step, index) => {
    const id = `S${index + 1}`;
    const label = step.label.replace(/["<>]/g, "");
    lines.push(`  ${id}["${label}"]`);
    if (index > 0) lines.push(`  S${index} --> ${id}`);
  });
  return lines.join("\n");
}

export function buildFrontOfficeLeakCheckReport(
  audit: FrontOfficeAuditInput,
  parsedNotes: ParsedFrontOfficeNotes,
): FrontOfficePremiumReport {
  const companyName = cleanLabel(audit.company_name, "Unspecified company");
  const industry = cleanLabel(audit.business_type, "Industry not specified");
  const painSignals = [
    ...(parsedNotes.pain_tags || []),
    ...(audit.pain_points || []),
    parsedNotes.intake_summary || "",
    audit.biggest_operational_bottleneck || "",
    audit.audit_findings || "",
    audit.recommendations || "",
  ].filter(Boolean);

  const callVolume = readSectionValue(parsedNotes, "lead_intake", "call_volume");
  const missedCalls = readSectionValue(parsedNotes, "lead_intake", "missed_calls");
  const afterHours = readSectionValue(parsedNotes, "lead_intake", "after_hours");
  const responseTime = readSectionValue(parsedNotes, "follow_up", "response_time");
  const followUp = readSectionValue(parsedNotes, "follow_up", "follow_up_process");
  const scheduling = readSectionValue(parsedNotes, "scheduling", "booking_process");
  const tools = cleanLabel(
    audit.current_tools_or_crm || readSectionValue(parsedNotes, "tools_systems", "current_tools"),
    "",
  );

  const findings: LeakFinding[] = [];

  if (hasAnySignal(painSignals, ["missed", "no answer", "voicemail", "call back"])) {
    findings.push(makeFinding(
      "Missed-call capture risk",
      "high",
      missedCalls || "Submitted intake references missed-call or call-back risk.",
      "Missed calls can become lost booked jobs when urgency is high.",
      "Prospects may move to competitors if the business does not respond quickly.",
      "Create an approval-gated missed-call follow-up path with owner, timing, and escalation rules.",
    ));
  }

  if (hasAnySignal(painSignals, ["after hours", "after-hours", "evening", "weekend"])) {
    findings.push(makeFinding(
      "After-hours coverage gap",
      "medium",
      afterHours || "Submitted intake references after-hours coverage concern.",
      "After-hours inquiries often carry high buying intent and can leak revenue overnight or on weekends.",
      "Customers may feel ignored before the first conversation starts.",
      "Define a safe after-hours response plan before adding automation or voice coverage.",
    ));
  }

  if (hasAnySignal(painSignals, ["slow", "follow", "response", "inconsistent"])) {
    findings.push(makeFinding(
      "Follow-up consistency gap",
      "high",
      responseTime || followUp || "Submitted intake references slow or inconsistent follow-up.",
      "Slow follow-up can reduce close rate even when lead volume is healthy.",
      "Prospects receive uneven service depending on who sees the lead first.",
      "Standardize a follow-up checklist and draft message sequence for Jonathan approval.",
    ));
  }

  if (hasAnySignal(painSignals, ["manual", "spreadsheet", "crm", "handoff", "admin"]) || tools) {
    findings.push(makeFinding(
      "Manual handoff and visibility gap",
      "medium",
      tools ? `Current tools/process context: ${tools}.` : "Submitted intake references manual process or handoff friction.",
      "Manual tracking makes it harder to see which leads need action and where revenue is stuck.",
      "Customers can experience repeated questions, delays, or unclear ownership.",
      "Create a read-only workflow map before recommending CRM, dashboard, or automation changes.",
    ));
  }

  if (findings.length === 0) {
    findings.push(makeFinding(
      "Insufficient leak evidence captured",
      "low",
      "The current intake does not provide enough structured evidence to name a specific leak confidently.",
      "Revenue impact cannot be estimated until more intake detail is captured.",
      "The prospect may still benefit from a clearer discovery step before recommendations.",
      "Ask targeted follow-up questions before producing a client-facing audit.",
    ));
  }

  const processMap = buildProcessMap(findings, tools);

  const automations: RecommendedAutomation[] = [
    {
      title: "Missed-call follow-up sequence",
      purpose: "Create a consistent response path for calls or inquiries that do not get immediate attention.",
      blockedUntilApproval: true,
    },
    {
      title: "Lead triage dashboard",
      purpose: "Show urgency, source, owner, status, and next action in one review surface.",
      blockedUntilApproval: true,
    },
    {
      title: "Daily front-office leak review",
      purpose: "Summarize stuck leads, slow follow-up, open approvals, and operational risks.",
      blockedUntilApproval: true,
    },
  ];

  const missingInformation = [
    callVolume ? "" : "Call or inquiry volume is not clearly captured.",
    missedCalls ? "" : "Missed-call count or pattern is not clearly captured.",
    responseTime ? "" : "Average first-response time is not clearly captured.",
    scheduling ? "" : "Booking/scheduling workflow detail is incomplete.",
    tools ? "" : "Current CRM/tooling context is incomplete.",
  ].filter(Boolean);

  return {
    templateName: "front_office_leak_check_premium_report_v1_internal_preview",
    statusLabel: "Internal preview only - not client delivery",
    auditId: audit.id,
    companyName,
    industry,
    executiveSummary: `${companyName} appears to be at the discovery stage for a Front Office Leak Check. This preview converts submitted intake evidence into a sellable audit structure while keeping delivery, automation, and production actions approval-gated.`,
    leakFindings: findings,
    processMap,
    mermaidPreview: buildMermaidPreview(processMap),
    revenueRiskImpact: [
      "Missed or slow follow-up can reduce booked-job conversion before service quality is ever evaluated.",
      "Manual handoffs make it harder to know which leads are stuck, which owner is accountable, and what should happen next.",
      "A premium report should make the revenue leak visible, specific, and actionable without claiming unsupported savings.",
    ],
    recommendedAutomations: automations,
    followUpPlan: [
      "Review this internal preview against the original intake record.",
      "Fill missing data before sending anything client-facing.",
      "Ask Jonathan to approve any client delivery, workflow automation, or production implementation step.",
      "Use the report structure to prepare a concise follow-up conversation and Codex-ready implementation brief.",
    ],
    missingInformation,
    sourceEvidence: [
      parsedNotes.intake_summary ? "Parsed notes intake_summary" : "Audit request row",
      parsedNotes.pain_tags?.length ? "Parsed notes pain_tags" : "Audit pain_points/status fields",
      Object.keys(parsedNotes.sections || {}).length ? "Parsed sectioned intake data" : "Legacy/unsectioned intake data",
      audit.audit_findings ? "Existing audit_findings field" : "No existing audit_findings field content",
      audit.recommendations ? "Existing recommendations field" : "No existing recommendations field content",
    ],
    approvalGates: [
      "Jonathan approval required before client delivery.",
      "Jonathan approval required before PDF/export or email delivery.",
      "Jonathan approval required before n8n, CRM, voice, or platform automation.",
      "Jonathan approval required before production deployment.",
    ],
  };
}
