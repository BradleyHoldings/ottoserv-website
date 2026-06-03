export type LeakSeverity = "low" | "medium" | "high" | "critical";

export interface ParsedFrontOfficeNotes {
  schema_version?: number;
  source?: string;
  intake_summary?: string;
  submitted_at?: string;
  pain_tags?: string[];
  sections?: Record<string, Record<string, unknown> | undefined>;
}

export interface FrontOfficeAuditInput {
  id: number;
  email?: string | null;
  name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  website?: string | null;
  business_type?: string | null;
  source?: string | null;
  priority?: string | null;
  status?: string | null;
  estimated_value?: number | null;
  pain_points?: string[] | null;
  notes?: string | null;
  biggest_operational_bottleneck?: string | null;
  current_tools_or_crm?: string | null;
  audit_findings?: string | null;
  recommendations?: string | null;
  follow_up_notes?: string | null;
}

export interface LeakFinding {
  title: string;
  severity: LeakSeverity;
  observedEvidence: string;
  revenueImpact: string;
  customerExperienceImpact: string;
  recommendedFix: string;
  approvalRequirement: string;
}

export interface ProcessMapStep {
  label: string;
  currentState: string;
  premiumState: string;
  risk: string;
}

export interface RecommendedAutomation {
  title: string;
  purpose: string;
  blockedUntilApproval: boolean;
}

export interface FrontOfficePremiumReport {
  templateName: string;
  statusLabel: string;
  auditId: number;
  companyName: string;
  industry: string;
  executiveSummary: string;
  leakFindings: LeakFinding[];
  processMap: ProcessMapStep[];
  mermaidPreview: string;
  revenueRiskImpact: string[];
  recommendedAutomations: RecommendedAutomation[];
  followUpPlan: string[];
  missingInformation: string[];
  sourceEvidence: string[];
  approvalGates: string[];
}
