export type ClarificationQuestion = {
  id: string;
  label: string;
  placeholder?: string;
};

export function getClarificationQuestions(input?: Record<string, unknown>): ClarificationQuestion[];
export function createWorkflowDiagnostics(input?: Record<string, unknown>): {
  reportConfidence: { level: "High" | "Medium" | "Low"; reason: string };
  observed: string[];
  reported: string[];
  couldNotConfirm: string[];
  currentStateMap: unknown;
  futureStateMap: unknown;
  topWorkflowLeaks: string[];
  revenueRisks: Array<{ title: string; impact: string; severity: "low" | "medium" | "high" }>;
  automationOpportunities: string[];
  priorityRanking: Array<{ priority: "P1" | "P2" | "P3"; title: string; action: string; severity: "low" | "medium" | "high" }>;
  nextActions: string[];
  informationGaps: string[];
  aiRecommendation: {
    name?: string;
    bestFirstJob?: string;
    whatItWouldDo?: string[];
    whatItWouldNotReplace?: string[];
    pilotMeasurements?: string[];
    basedOn?: string;
  };
};
