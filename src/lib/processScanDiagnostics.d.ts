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
