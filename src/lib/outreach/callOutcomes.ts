export const CALL_OUTCOME_STATUSES = [
  "called_no_answer",
  "voicemail_left",
  "connected_not_interested",
  "connected_interested",
  "booked_meeting",
  "call_back_requested",
  "bad_number",
  "wrong_business",
  "do_not_contact",
  "needs_follow_up",
  "needs_human_review",
] as const;

export type CallOutcomeStatus = (typeof CALL_OUTCOME_STATUSES)[number];

export type CallOutcome = {
  outcome_id: string;
  timestamp: string;
  lead_id: string;
  phone: string;
  status: CallOutcomeStatus;
  summary: string;
  next_action: string;
  follow_up_due: string;
  objection: string;
  booking_link: string;
  recording_link: string;
  transcript_link: string;
  agent: string;
  source: string;
};

export function normalizeCallOutcome(input: Record<string, unknown>): { outcome?: CallOutcome; error?: string } {
  const status = stringField(input.status) as CallOutcomeStatus;
  if (!CALL_OUTCOME_STATUSES.includes(status)) {
    return { error: `status must be one of: ${CALL_OUTCOME_STATUSES.join(", ")}` };
  }

  const leadId = stringField(input.lead_id);
  const phone = stringField(input.phone);
  if (!leadId) return { error: "lead_id is required." };
  if (!phone) return { error: "phone is required." };

  const timestamp = stringField(input.timestamp) || new Date().toISOString();
  const outcomeId = stringField(input.outcome_id) || `outcome_${leadId}_${Date.parse(timestamp) || Date.now()}`;

  return {
    outcome: {
      outcome_id: outcomeId.toLowerCase().replace(/[^a-z0-9_:-]/g, "_"),
      timestamp,
      lead_id: leadId,
      phone,
      status,
      summary: stringField(input.summary),
      next_action: stringField(input.next_action),
      follow_up_due: stringField(input.follow_up_due),
      objection: stringField(input.objection),
      booking_link: stringField(input.booking_link || input.event_link),
      recording_link: stringField(input.recording_link),
      transcript_link: stringField(input.transcript_link),
      agent: stringField(input.agent) || "jarvis",
      source: stringField(input.source) || "calls/outcomes",
    },
  };
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
