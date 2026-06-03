export type HermesAgentStatus =
  | "idle"
  | "active"
  | "blocked"
  | "waiting_for_approval"
  | "complete"
  | "failed";

export type HermesRiskLevel = "low" | "medium" | "high" | "critical";

export interface HermesAgent {
  id: string;
  name: string;
  role: string;
  type: string;
  currentMission: string;
  currentTask: string;
  status: HermesAgentStatus;
  lastActivity: string;
  assignedBy: string;
  owner: string;
  toolsAllowed: string[];
  riskLevel: HermesRiskLevel;
  revenueImpact: string;
  evidenceRequired: string[];
  evidenceSubmitted: string[];
  blockers: string[];
  nextAction: string;
}

export interface HermesMission {
  id: string;
  title: string;
  businessObjective: string;
  assignedAgent: string;
  assignedBy: string;
  priority: "critical" | "high" | "medium" | "low";
  status: HermesAgentStatus | "reviewing";
  dueWindow: string;
  requiredEvidence: string[];
  submittedEvidence: string[];
  hermesReviewResult: string;
  blockers: string[];
  nextAction: string;
  relatedEntity: string;
  revenueImpact: string;
  approvalRequirement: string;
}

export interface HermesApproval {
  id: string;
  requestedAction: string;
  reason: string;
  riskLevel: HermesRiskLevel;
  expectedBusinessOutcome: string;
  unlocks: string;
  approvalType: "one_time" | "recurring_policy";
}

export interface HermesEvidence {
  id: string;
  sourceAgent: string;
  missionId: string;
  type: string;
  summary: string;
  submittedAt: string;
  reviewStatus: "accepted" | "pending" | "needs_revision";
}

export interface HermesRevenueMetric {
  label: string;
  value: string;
  movement: string;
}

export interface HermesServiceDeliveryItem {
  prospect: string;
  leakCheckResult: string;
  processAuditResult: string;
  revenueLeaks: string[];
  operationalGaps: string[];
  automationOpportunities: string[];
  recommendedWorkflows: string[];
  workflowMatch: string;
  missingWorkflowRequests: string[];
  implementationPackets: string[];
  deliverables: string[];
  nextAction: string;
}

export interface HermesPolicyPermission {
  category: string;
  canDoWithoutApproval: string[];
  requiresApproval: string[];
  forbidden: string[];
  unlockedActions: string[];
  expiringApprovals: string[];
  spawnableAgents: string[];
  approvalRequiredAgents: string[];
}

export const hermesAgents: HermesAgent[] = [
  {
    id: "hermes-jarvis",
    name: "Hermes/Jarvis",
    role: "Co-CEO / Orchestrator",
    type: "Autonomous company operator",
    currentMission: "Move today's revenue-critical operating loop forward",
    currentTask: "Prioritize agent missions, approvals, blockers, and evidence review",
    status: "active",
    lastActivity: "2026-06-01 09:42 ET",
    assignedBy: "Jonathan",
    owner: "Hermes",
    toolsAllowed: ["Delegation queue", "Daily operating loop", "Evidence review", "Policy engine"],
    riskLevel: "medium",
    revenueImpact: "Coordinates all revenue movement and client delivery throughput",
    evidenceRequired: ["Operating loop update", "Delegation queue entry", "Review decision"],
    evidenceSubmitted: ["Daily loop snapshot", "Mission priority stack"],
    blockers: ["Needs approval for any external write or payment-authority action"],
    nextAction: "Review blocked missions and request Jonathan approval where policy requires it",
  },
  {
    id: "codex",
    name: "Codex",
    role: "Builder / Implementation Engineer",
    type: "Code implementation agent",
    currentMission: "Increase Front Office Leak Check conversion",
    currentTask: "Fix double-click CTA path and improve output visual flowchart",
    status: "active",
    lastActivity: "2026-06-01 09:36 ET",
    assignedBy: "Hermes",
    owner: "Hermes",
    toolsAllowed: ["Repository edit", "Build verification", "Screenshots", "Commit evidence"],
    riskLevel: "medium",
    revenueImpact: "More completed audits and booked sales calls",
    evidenceRequired: ["URL", "Screenshot", "Test result", "Commit hash"],
    evidenceSubmitted: ["Implementation note pending"],
    blockers: [],
    nextAction: "Ship verified UI change and submit evidence package",
  },
  {
    id: "cowork",
    name: "Cowork",
    role: "Browser Outreach / LinkedIn / Reddit Execution",
    type: "External browser execution agent",
    currentMission: "Validate high-intent service business conversations",
    currentTask: "Prepare outreach queue without posting until approval is granted",
    status: "waiting_for_approval",
    lastActivity: "2026-06-01 09:15 ET",
    assignedBy: "Hermes",
    owner: "Hermes",
    toolsAllowed: ["Browser research", "Draft outreach", "Queue updates"],
    riskLevel: "high",
    revenueImpact: "Creates qualified lead conversations for demos",
    evidenceRequired: ["Lead URL", "Draft copy", "Send result", "Before/after status"],
    evidenceSubmitted: ["Draft queue IDs"],
    blockers: ["External posting and messaging require approval"],
    nextAction: "Request approval for the next outreach batch",
  },
  {
    id: "morgan",
    name: "Morgan",
    role: "Voice Agent / Sales + Demo + Follow-up",
    type: "Client-facing voice agent",
    currentMission: "Convert qualified replies into scheduled demos",
    currentTask: "Follow up with demo-ready prospects after Hermes approval",
    status: "idle",
    lastActivity: "2026-06-01 08:50 ET",
    assignedBy: "Hermes",
    owner: "Hermes",
    toolsAllowed: ["Call scripts", "Call logs", "Follow-up notes"],
    riskLevel: "high",
    revenueImpact: "Turns demand into booked sales meetings",
    evidenceRequired: ["Call log", "Transcript", "Outcome", "Next step"],
    evidenceSubmitted: [],
    blockers: ["Outbound voice actions require approval"],
    nextAction: "Wait for approved call queue",
  },
  {
    id: "growth-agent",
    name: "Growth Agent",
    role: "Content + Demand Generation",
    type: "Content and campaign agent",
    currentMission: "Create demand around missed revenue leak symptoms",
    currentTask: "Draft LinkedIn content from today's service delivery findings",
    status: "active",
    lastActivity: "2026-06-01 09:21 ET",
    assignedBy: "Hermes",
    owner: "Hermes",
    toolsAllowed: ["Content drafts", "Campaign queue", "Performance notes"],
    riskLevel: "medium",
    revenueImpact: "Feeds inbound awareness and reply volume",
    evidenceRequired: ["Draft", "Source insight", "Approval status"],
    evidenceSubmitted: ["Draft angle list"],
    blockers: ["Publishing requires approval"],
    nextAction: "Submit three draft posts for review",
  },
  {
    id: "ops-agent",
    name: "Ops Agent",
    role: "Service Delivery / Client Success",
    type: "Delivery operations agent",
    currentMission: "Convert audits into implementation packets",
    currentTask: "Map detected operational gaps to existing n8n workflow templates",
    status: "active",
    lastActivity: "2026-06-01 09:03 ET",
    assignedBy: "Hermes",
    owner: "Hermes",
    toolsAllowed: ["Service delivery spine", "Client packet drafts", "Workflow catalog"],
    riskLevel: "medium",
    revenueImpact: "Shortens time from diagnosis to paid implementation",
    evidenceRequired: ["Client record ID", "Workflow match", "Deliverable checklist"],
    evidenceSubmitted: ["Workflow match notes"],
    blockers: [],
    nextAction: "Prepare Codex implementation packets for missing workflows",
  },
  {
    id: "sentinel",
    name: "Sentinel",
    role: "QA / Security / Compliance Review",
    type: "Review and control agent",
    currentMission: "Keep agent execution inside policy boundaries",
    currentTask: "Review high-risk approvals and completion evidence",
    status: "active",
    lastActivity: "2026-06-01 09:30 ET",
    assignedBy: "Hermes",
    owner: "Hermes",
    toolsAllowed: ["Policy checks", "Security review", "Evidence validation"],
    riskLevel: "low",
    revenueImpact: "Prevents unsafe actions from interrupting revenue systems",
    evidenceRequired: ["Review result", "Policy reference", "Risk note"],
    evidenceSubmitted: ["Approval gate checklist"],
    blockers: [],
    nextAction: "Audit external-write requests before Hermes unlocks them",
  },
  {
    id: "research-agent",
    name: "Research Agent",
    role: "Lead Research / Market Intel",
    type: "Research agent",
    currentMission: "Find service businesses with urgent front-office leakage signals",
    currentTask: "Enrich high-fit prospects before outreach",
    status: "active",
    lastActivity: "2026-06-01 08:57 ET",
    assignedBy: "Hermes",
    owner: "Hermes",
    toolsAllowed: ["Public web research", "Lead notes", "Market intel"],
    riskLevel: "low",
    revenueImpact: "Improves lead quality and outreach relevance",
    evidenceRequired: ["Source URL", "Lead fit note", "Rejected/validated status"],
    evidenceSubmitted: ["Validated lead batch"],
    blockers: [],
    nextAction: "Push validated leads to Hermes review queue",
  },
  {
    id: "finance-agent",
    name: "Finance Agent",
    role: "Stripe / Revenue / Payment Links",
    type: "Revenue operations agent",
    currentMission: "Remove friction from proposal-to-payment handoff",
    currentTask: "Prepare payment link requests for approved prospects",
    status: "waiting_for_approval",
    lastActivity: "2026-06-01 08:44 ET",
    assignedBy: "Hermes",
    owner: "Hermes",
    toolsAllowed: ["Revenue event tracking", "Payment link draft metadata"],
    riskLevel: "critical",
    revenueImpact: "Converts won opportunities into cash collected",
    evidenceRequired: ["Stripe payment link ID", "Recipient", "Amount", "Send status"],
    evidenceSubmitted: [],
    blockers: ["Payment authority requires Jonathan approval"],
    nextAction: "Request one-time approval before creating or sending payment links",
  },
];

export const hermesMissions: HermesMission[] = [
  {
    id: "HM-2026-0601-001",
    title: "Increase Front Office Leak Check conversion",
    businessObjective: "More completed audits and booked calls from high-intent visitors",
    assignedAgent: "Codex",
    assignedBy: "Hermes",
    priority: "critical",
    status: "active",
    dueWindow: "Today, before revenue review",
    requiredEvidence: ["URL", "Screenshots", "Test result", "Commit hash"],
    submittedEvidence: ["Pending implementation evidence"],
    hermesReviewResult: "Awaiting verified completion",
    blockers: [],
    nextAction: "Finish CTA path fix, verify output flow, submit evidence",
    relatedEntity: "Front Office Leak Check funnel",
    revenueImpact: "Raises audit completion rate and call bookings",
    approvalRequirement: "No approval needed for low-risk code changes; evidence required before complete",
  },
  {
    id: "HM-2026-0601-002",
    title: "Prepare approved outreach wave for validated leads",
    businessObjective: "Create qualified conversations without bypassing external-write controls",
    assignedAgent: "Cowork",
    assignedBy: "Hermes",
    priority: "high",
    status: "waiting_for_approval",
    dueWindow: "Today, after lead validation",
    requiredEvidence: ["Lead URLs", "Outreach drafts", "Queue IDs", "Approval decision"],
    submittedEvidence: ["Lead queue draft"],
    hermesReviewResult: "Blocked pending Jonathan approval",
    blockers: ["External messaging approval required"],
    nextAction: "Jonathan reviews approve/reject/revise cards in Approval Center",
    relatedEntity: "Validated contractor lead queue",
    revenueImpact: "Feeds demo pipeline with qualified owners",
    approvalRequirement: "One-time approval for this outreach batch",
  },
  {
    id: "HM-2026-0601-003",
    title: "Convert audit findings into service delivery packets",
    businessObjective: "Turn diagnosed leaks into implementation-ready client work",
    assignedAgent: "Ops Agent",
    assignedBy: "Hermes",
    priority: "high",
    status: "active",
    dueWindow: "Next 24 hours",
    requiredEvidence: ["Client record ID", "Recommended workflows", "Missing workflow requests"],
    submittedEvidence: ["Workflow match notes"],
    hermesReviewResult: "Needs packet completeness review",
    blockers: [],
    nextAction: "Create Codex-ready implementation packets for missing workflows",
    relatedEntity: "Service delivery spine",
    revenueImpact: "Speeds delivery and creates implementation upsell paths",
    approvalRequirement: "Approval required before client-facing deliverables are sent",
  },
  {
    id: "HM-2026-0601-004",
    title: "Protect payment authority while preparing revenue collection",
    businessObjective: "Keep payment actions fast but approval-gated",
    assignedAgent: "Finance Agent",
    assignedBy: "Hermes",
    priority: "medium",
    status: "waiting_for_approval",
    dueWindow: "When proposal is accepted",
    requiredEvidence: ["Amount", "Recipient", "Stripe payment link ID", "Send status"],
    submittedEvidence: [],
    hermesReviewResult: "Cannot execute until policy unlock exists",
    blockers: ["Payment link creation/send approval required"],
    nextAction: "Prepare request card with amount, reason, and expected outcome",
    relatedEntity: "Payment links",
    revenueImpact: "Turns accepted proposals into received payments",
    approvalRequirement: "Jonathan approval required for each payment-authority action",
  },
];

export const hermesApprovals: HermesApproval[] = [
  {
    id: "HA-001",
    requestedAction: "Send first approved Cowork outreach batch",
    reason: "Validated lead queue is ready, but external messaging is high-risk",
    riskLevel: "high",
    expectedBusinessOutcome: "Start qualified conversations for Leak Check demos",
    unlocks: "Hermes can release Cowork to send only the reviewed batch",
    approvalType: "one_time",
  },
  {
    id: "HA-002",
    requestedAction: "Create Stripe payment link for accepted implementation package",
    reason: "Payment authority must stay gated even when revenue opportunity is warm",
    riskLevel: "critical",
    expectedBusinessOutcome: "Collect implementation setup revenue",
    unlocks: "Finance Agent can create the specific payment link and submit Stripe ID evidence",
    approvalType: "one_time",
  },
];

export const hermesEvidence: HermesEvidence[] = [
  {
    id: "HE-001",
    sourceAgent: "Research Agent",
    missionId: "HM-2026-0601-002",
    type: "URL",
    summary: "Validated lead source URLs added to outreach queue",
    submittedAt: "2026-06-01 08:57 ET",
    reviewStatus: "accepted",
  },
  {
    id: "HE-002",
    sourceAgent: "Ops Agent",
    missionId: "HM-2026-0601-003",
    type: "Before/after status",
    summary: "Mapped three revenue leaks to existing workflow templates",
    submittedAt: "2026-06-01 09:03 ET",
    reviewStatus: "pending",
  },
];

export const hermesRevenueMetrics: HermesRevenueMetric[] = [
  { label: "New leads validated", value: "18", movement: "+6 today" },
  { label: "Rejected leads", value: "7", movement: "Quality gate held" },
  { label: "Outreach sent", value: "0", movement: "Awaiting approval" },
  { label: "Replies received", value: "3", movement: "+1 warm reply" },
  { label: "Calls queued", value: "2", movement: "Morgan ready" },
  { label: "Calls completed", value: "1", movement: "Follow-up pending" },
  { label: "Demos booked", value: "1", movement: "Needs prep packet" },
  { label: "Leak Checks completed", value: "4", movement: "+2 since last loop" },
  { label: "Payment links sent", value: "0", movement: "Approval gated" },
  { label: "Payments received", value: "$0", movement: "No new receipts today" },
  { label: "Clients onboarded", value: "1", movement: "Delivery active" },
  { label: "Implementations started", value: "2", movement: "Codex packets forming" },
];

export const hermesServiceDeliveryItems: HermesServiceDeliveryItem[] = [
  {
    prospect: "Brandon Croom Contracting",
    leakCheckResult: "High missed-call and slow follow-up risk",
    processAuditResult: "Manual intake creates scheduling and estimate leakage",
    revenueLeaks: ["Missed after-hours calls", "No structured follow-up cadence", "Estimate status not visible"],
    operationalGaps: ["No centralized lead state", "Manual call notes", "Disconnected payment handoff"],
    automationOpportunities: ["AI intake", "Lead status sync", "Estimate follow-up workflow"],
    recommendedWorkflows: ["Missed-call recovery", "Estimate follow-up", "Payment link handoff"],
    workflowMatch: "2 existing n8n workflows match; 1 missing payment handoff variant",
    missingWorkflowRequests: ["Stripe payment link approval and send tracker"],
    implementationPackets: ["Codex packet: payment handoff tracker"],
    deliverables: ["Leak summary", "Recommended automation sequence", "Implementation scope"],
    nextAction: "Package deliverables after Hermes evidence review",
  },
];

export const hermesPolicyPermissions: HermesPolicyPermission[] = [
  {
    category: "Autonomous execution",
    canDoWithoutApproval: ["Read structured Hermes outputs", "Draft missions", "Validate evidence", "Prepare implementation packets"],
    requiresApproval: ["External posting", "Outbound messaging", "Voice calls", "Payment links", "Production workflow writes"],
    forbidden: ["Expose provider keys", "Show raw secret-bearing prompts", "Run unrestricted action endpoints"],
    unlockedActions: ["Low-risk code changes with evidence", "Internal lead research", "Draft-only content generation"],
    expiringApprovals: ["Cowork outreach batch approval expires after reviewed batch is sent"],
    spawnableAgents: ["Research Agent", "Sentinel review worker", "Draft-only content worker"],
    approvalRequiredAgents: ["Agents with external write access", "Payment-authority agents", "Client-facing delivery agents"],
  },
];

export function getHermesCommandSummary() {
  const activeAgents = hermesAgents.filter((agent) => agent.status === "active").length;
  const blockedAgents = hermesAgents.filter((agent) => agent.status === "blocked" || agent.status === "waiting_for_approval").length;
  const approvalsWaiting = hermesApprovals.length;
  const criticalMissions = hermesMissions.filter((mission) => mission.priority === "critical").length;

  return {
    activeAgents,
    blockedAgents,
    approvalsWaiting,
    criticalMissions,
  };
}

export function formatHermesLabel(value: string) {
  return value.replace(/_/g, " ");
}
