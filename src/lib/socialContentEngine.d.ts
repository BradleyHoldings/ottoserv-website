export const CONTENT_PILLARS: string[];
export const CONTENT_ANGLE_RULES: string[];
export const CONTENT_MONITORING_TOPICS: {
  aiProductUpdates: string[];
  fieldServiceSoftware: string[];
  industryTrends: string[];
};
export const CONTENT_LIFECYCLE_STATUSES: string[];
export const DISTRIBUTION_STATUSES: string[];
export const PERFORMANCE_LABELS: string[];
export const requiredAirtableFields: string[];
export const COWORK_QUEUE_VIEW: {
  name: string;
  filters: Array<{ field: string; operator: string; value: string }>;
  fields: string[];
};

export type StructuredContentDraft = {
  topic: string;
  contentPillar: string;
  targetAudience: string;
  sourceLinks: string[];
  researchSummary: string;
  angle: string;
  hook: string;
  ottoServTieIn: string;
  cta: string;
  script: string;
  shortScript: string;
  linkedInPost: string;
  facebookPost: string;
  instagramCaption: string;
  twitterPost: string;
  shortCaption: string;
  assetType: string;
  imagePrompt: string;
  videoPrompt: string;
  status: string;
  approvalStatus: string;
  distributionStatus: string;
};

export type ContentOpportunity = {
  sourceLink: string;
  topic: string;
  trendType: string;
  factualSummary: string;
  whyThisMatters: string;
  operationalIssue: string;
  ottoServPointOfView: string;
  heyGenScript: string;
  shortVersion: string;
  linkedInPost: string;
  facebookPost: string;
  instagramCaption: string;
  twitterPost: string;
  carouselOutline: string[];
  frontOfficeLeakCheckCta: string;
  status: string;
  approvalStatus: string;
  distributionStatus: string;
};

export type CoworkQueueRow = {
  id: string;
  topic: string;
  platform: string;
  postText: string;
  caption: string;
  assetUrl: string;
  cta: string;
  scheduledDate: string | null;
  status: string;
  notes: string;
  assignedOperator: string;
  publishedUrl: string;
  postedDate: string | null;
  postingNotes: string;
  needsFixReason: string;
};

export type SocialWorkflowItem = {
  id: string;
  platform: string;
  content_type: string;
  post_text: string;
  asset_path: string;
  asset_url: string;
  status: string;
  content_category: string;
  core_insight_or_reframe: string;
  intended_audience: string;
  cta_status: string;
  billboard_risk_score: number;
  social_strategy_review: Record<string, unknown> | null;
  created_by: string;
  reviewed_by: string;
  approved_by: string;
  created_at: string;
  reviewed_at: string;
  approved_at: string;
  scheduled_for: string;
  handed_to_cowork_at: string;
  published_at: string;
  published_url: string;
  evidence_path: string;
  evidence_url: string;
  failure_reason: string;
  fallback_owner: string;
  next_action: string;
  learning_tags: string[];
  performance_notes: string;
  audit_log: Array<{ action: string; actor: string; detail: Record<string, unknown>; at: string }>;
  executor: string;
  executor_handoff: Record<string, unknown> | null;
};

export type SocialDashboardPost = {
  id: string;
  topic: string;
  content: string;
  caption: string;
  platform: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_by_agent: string;
  approval_status: string;
  distribution_status: string;
  rejection_reason: string | null;
  media_urls: string[];
  asset_url: string | null;
  emotional_trigger: string | null;
  cta: string;
  assigned_operator: string;
  published_url: string | null;
  posted_date: string | null;
  posting_notes: string | null;
  needs_fix_reason: string | null;
  notes: string;
  fallback_owner: string;
  next_action: string;
};

export type SocialDashboardState = {
  source: string;
  counts: Record<string, number>;
  posts: SocialDashboardPost[];
  approvalQueue: SocialDashboardPost[];
  coworkQueue: CoworkQueueRow[];
  failureQueue: SocialDashboardPost[];
  nextActions: Array<{ id: string; action: string; status: string; owner: string }>;
  auditSummary: Array<{ id: string; events: number; last_event: string }>;
};

export type SocialHealthStatus = {
  service: "SocialEngine";
  status: "healthy" | "degraded";
  storage: string;
  item_count: number;
  failed_count: number;
  fallback_count: number;
  errors: string[];
};

export type SocialEngine = {
  storage: string;
  createDraft(input?: Record<string, unknown>): Promise<SocialWorkflowItem>;
  listDrafts(filters?: Record<string, unknown>): Promise<SocialWorkflowItem[]>;
  submitForReview(id: string): Promise<SocialWorkflowItem>;
  reviewDraft(id: string, strategyReview?: Record<string, unknown>): Promise<SocialWorkflowItem>;
  approveDraft(id: string, approval?: Record<string, unknown>): Promise<SocialWorkflowItem>;
  rejectDraft(id: string, reason?: string | Record<string, unknown>): Promise<SocialWorkflowItem>;
  routeApprovedItem(id: string, executor: string): Promise<SocialWorkflowItem>;
  recordExecutorHandoff(id: string, handoff?: Record<string, unknown>): Promise<SocialWorkflowItem>;
  recordEvidence(id: string, evidence?: Record<string, unknown>): Promise<SocialWorkflowItem>;
  markFailed(id: string, failure?: Record<string, unknown>): Promise<SocialWorkflowItem>;
  assignFallback(id: string, fallbackOwner: string): Promise<SocialWorkflowItem>;
  getDashboardState(): Promise<SocialDashboardState>;
  getHealthStatus(): Promise<SocialHealthStatus>;
  getAuditTrail(id: string): Promise<SocialWorkflowItem["audit_log"]>;
};

export function buildStructuredContentDraft(input?: Record<string, unknown>): StructuredContentDraft;
export function buildContentOpportunity(input?: Record<string, unknown>): ContentOpportunity;
export function createMemorySocialWorkflowStore(initialItems?: Array<Record<string, unknown>>): Record<string, unknown>;
export function createSocialEngine(options?: Record<string, unknown>): SocialEngine;
export function normalizeSocialWorkflowItem(input?: Record<string, unknown>, options?: Record<string, unknown>): SocialWorkflowItem;
export function normalizePlatformSocialRecord(record?: Record<string, unknown>): SocialWorkflowItem;
export function buildAssetGenerationRequests(draft: StructuredContentDraft, options?: Record<string, unknown>): Array<{
  provider: string;
  kind: string;
  prompt: string;
  outputField: string;
}>;
export function filterCoworkPostingQueue(rows?: Array<Record<string, unknown>>, now?: Date): CoworkQueueRow[];
export function buildBlotatoDistributionPayload(record?: Record<string, unknown>): Record<string, unknown>;
export function classifyPerformance(metrics?: Record<string, unknown>): {
  label: string;
  engagementRate: number;
  repurposeOptions: string[];
};
