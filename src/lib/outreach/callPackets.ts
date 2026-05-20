import type { NormalizedLead } from "./leadImport";
import type { CallOutcome } from "./callOutcomes";

export type JarvisCallPacket = {
  lead_id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  website: string;
  industry: string;
  city_state: string;
  reason_this_is_a_tier: string[];
  pain_signal: string;
  personalization_angle: string;
  offer_angle: string;
  first_call_objective: string;
  suggested_opener: string;
  do_not_say_notes: string[];
  last_contact_history: CallOutcome[];
  source_evidence: string[];
  required_logging_fields_after_call: string[];
};

export function buildJarvisCallPacket(lead: NormalizedLead, outcomes: CallOutcome[] = []): JarvisCallPacket {
  const contact = lead.contact_name || "the person who handles inbound calls";
  const company = lead.company || "the company";
  const industry = lead.industry || "service business";
  const cityState = [lead.city, lead.state].filter(Boolean).join(", ");
  const pain = lead.pain_signal || lead.buying_signal || lead.notes || "missed-call, slow-response, or lead-handling risk";

  return {
    lead_id: lead.lead_id,
    company_name: company,
    contact_name: lead.contact_name,
    phone: lead.normalized_phone || lead.phone,
    website: lead.website_url,
    industry,
    city_state: cityState,
    reason_this_is_a_tier: lead.score_reasons,
    pain_signal: pain,
    personalization_angle: lead.source_url
      ? `Reference the public source/evidence already captured: ${lead.source_url}.`
      : `Reference ${company}'s apparent ${industry} workflow and ask how missed calls or slow follow-up are handled today.`,
    offer_angle: "AI Lead Handler for property managers and home service companies: answer calls, qualify intent, recover missed calls, and route clean notes.",
    first_call_objective: "Confirm fit, learn how inbound leads are handled today, and book a short demo if there is active missed-call or follow-up pain.",
    suggested_opener: `Hi ${contact}, this is Jonathan with OttoServ. We help ${industry} teams stop losing opportunities from missed calls and slow follow-up. Quick question: when ${company} misses a call or gets an after-hours inquiry, what happens right now?`,
    do_not_say_notes: [
      "Do not claim guaranteed revenue lift or unsupported cost savings.",
      "Do not imply OttoServ has reviewed private call logs.",
      "Do not over-promise dispatch, CRM, or integration behavior before confirming their workflow.",
    ],
    last_contact_history: outcomes.filter((outcome) => outcome.lead_id === lead.lead_id),
    source_evidence: [lead.source_url, lead.website_url, lead.notes, lead.pain_signal].filter(Boolean),
    required_logging_fields_after_call: [
      "timestamp",
      "lead_id",
      "phone",
      "status",
      "summary",
      "next_action",
      "follow_up_due",
      "objection",
      "booking_link/event if booked",
      "recording/transcript link if available",
      "agent/source",
    ],
  };
}
