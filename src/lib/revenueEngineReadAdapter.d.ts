export type RevenueReadOptions = {
  dataDir?: string;
  cwd?: string;
  redactContacts?: boolean;
};

export type RevenueRepairPacket = {
  id: string;
  owner: string;
  category: string;
  what_failed: string;
  expected_behavior: string;
  actual_behavior: string;
  verification_steps: string[];
  status: string;
};

export type AutonomousRevenueState = {
  available: boolean;
  source: { file: string; lastModified: string | null };
  generatedAt?: string;
  planDate?: string;
  schedule?: string;
  status: string;
  volumePolicy?: string;
  health: {
    status: string;
    repair_count: number;
    evidence_gap_count: number;
    queue_counts: Record<string, number>;
    errors: string[];
  } | null;
  nextAction: string;
  brokenRails: { id: string; category: string; owner: string; status: string }[];
  repairPackets: RevenueRepairPacket[];
  revenueRisks: string[];
  queueCounts: Record<string, number>;
  leadSupplyDailyLoop?: unknown;
  publicLeadDiscovery?: unknown;
  durableRevenueExecutionQueue?: unknown;
  controlledEmailExecution?: unknown;
  multiAgentCommandState?: unknown;
  taskOwnershipLedger?: unknown;
  resourceAvailabilityState?: unknown;
  schedulingWindowState?: unknown;
  dispatchControlState?: unknown;
  dailyAutonomousOperatingCycle?: unknown;
  autonomyGraduationState?: unknown;
  autonomyGraduationReviewState?: unknown;
};

export type ImplementationWorkOrderView = {
  id: string;
  title: string;
  client: string;
  status: string;
  priority: string;
  engagement_type: string;
  implementation_stage: string;
  recommended_actor: string;
  risk_level: string;
  next_action: string;
  main_leak: string;
  report_url: string;
  approvalRequired: boolean;
  approvalStatus: string;
  automation_opportunities: string[];
  success_criteria: string[];
  required_evidence: string[];
  gated_actions: { action: string; approval_required: boolean; reason: string }[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
};

export type ImplementationWorkOrdersState = {
  available: boolean;
  contactRedacted: boolean;
  source: { file: string; lastModified: string | null };
  summary: {
    total: number;
    needs_approval: number;
    by_stage: Record<string, number>;
    by_status: Record<string, number>;
  };
  workOrders: ImplementationWorkOrderView[];
};

export function resolveRevenueEngineDir(options?: RevenueReadOptions): string;
export function readAutonomousRevenueState(options?: RevenueReadOptions): Promise<AutonomousRevenueState>;
export function redactWorkOrder(workOrder?: Record<string, unknown>): ImplementationWorkOrderView;
export function readImplementationWorkOrders(options?: RevenueReadOptions): Promise<ImplementationWorkOrdersState>;
export function readRevenueDashboardReadModel(options?: RevenueReadOptions): Promise<{
  revenue: AutonomousRevenueState;
  implementation: ImplementationWorkOrdersState;
  approvalExecution: unknown;
  serviceDeliveryExecution: unknown;
  readOnly: true;
}>;
