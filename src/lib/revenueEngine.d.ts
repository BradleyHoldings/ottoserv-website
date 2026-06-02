export const DAILY_REVENUE_CHANNELS: string[];
export const APPROVAL_REQUIRED_ACTIONS: string[];
export const EVIDENCE_REQUIREMENTS: Record<string, string>;

export type RevenueQueueItem = {
  id: string;
  channel: string;
  target_audience: string;
  offer_cta: string;
  content_angle: string;
  draft_copy_or_instructions: string;
  execution_owner: string;
  owner: string;
  risk_level: string;
  approval_required: boolean;
  evidence_requirement: string;
  status: string;
  result_outcome: string;
  next_action: string;
  created_at: string;
  updated_at: string;
  evidence: Array<Record<string, unknown>>;
  audit_log: Array<Record<string, unknown>>;
};

export type RevenuePlan = {
  run_date: string;
  schedule: string;
  cycles: Array<Record<string, unknown>>;
  icp_focus: string;
  offer_focus: string;
  content_angles: string[];
  outreach_angles: string[];
  channel_actions: RevenueQueueItem[];
  lead_follow_up_actions: string[];
  call_queue_actions: string[];
  website_seo_geo_aieo_actions: string[];
  revenue_risks: string[];
  broken_execution_rails: string[];
  repair_queue_seed: Array<Record<string, unknown>>;
  execution_queue_seed: RevenueQueueItem[];
  approval_queue_seed: RevenueQueueItem[];
};

export type UnifiedRevenueQueues = {
  content: RevenueQueueItem[];
  outreach: RevenueQueueItem[];
  calls: RevenueQueueItem[];
  seoGeoAieo: RevenueQueueItem[];
  coworkExecution: RevenueQueueItem[];
  codexRepair: Array<Record<string, unknown>>;
  approval: RevenueQueueItem[];
  evidenceInbox: RevenueQueueItem[];
  replies: RevenueQueueItem[];
};

export type RevenueDashboardState = {
  engine: "RevenueEngine";
  todayPlan: RevenuePlan;
  queues: UnifiedRevenueQueues;
  queueCounts: Record<string, number>;
  approvalQueue: RevenueQueueItem[];
  evidenceInbox: RevenueQueueItem[];
  repairQueue: Array<Record<string, unknown>>;
  brokenRails: Array<Record<string, unknown>>;
  channelPerformance: Record<string, unknown>;
  revenueMovement: Record<string, number>;
  selfRepairStatus: string;
  nextAction: string;
};

export function createDailyRevenuePlan(input?: Record<string, unknown>): RevenuePlan;
export function createQueueItem(input?: Record<string, unknown>): RevenueQueueItem;
export function buildUnifiedQueues(input?: Record<string, unknown>): UnifiedRevenueQueues;
export function recordEvidence(item: RevenueQueueItem, evidence?: Record<string, unknown>): RevenueQueueItem;
export function canMarkComplete(item?: Record<string, unknown>): boolean;
export function classifyFailure(failure?: Record<string, unknown>): Record<string, string>;
export function createRepairPacket(failure?: Record<string, unknown>): Record<string, unknown>;
export function routeFailure(failure?: Record<string, unknown>): Record<string, unknown>;
export function getDashboardState(input?: Record<string, unknown>): RevenueDashboardState;
export function getHealthStatus(input?: Record<string, unknown>): Record<string, unknown>;
export function getContentIntelligence(input?: Record<string, unknown>): Record<string, unknown>;
export function getSeoGeoAieoOpportunities(input?: Record<string, unknown>): Array<Record<string, unknown>>;
export function createDailyLoopRun(input?: Record<string, unknown>): Record<string, unknown>;
