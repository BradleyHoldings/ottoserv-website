# Jarvis Call Packet Template

Jarvis owns outbound call execution. Local Hermes may review packets for evidence quality only.

```json
{
  "lead_id": "",
  "company_name": "",
  "contact_name": "",
  "phone": "",
  "website": "",
  "industry": "",
  "city_state": "",
  "reason_this_is_a_tier": [],
  "pain_signal": "",
  "personalization_angle": "",
  "offer_angle": "AI Lead Handler for property managers and home service companies: answer calls, qualify intent, recover missed calls, and route clean notes.",
  "first_call_objective": "Confirm fit, learn how inbound leads are handled today, and book a short demo if there is active missed-call or follow-up pain.",
  "suggested_opener": "",
  "do_not_say_notes": [
    "Do not claim guaranteed revenue lift or unsupported cost savings.",
    "Do not imply OttoServ has reviewed private call logs.",
    "Do not over-promise dispatch, CRM, or integration behavior before confirming their workflow."
  ],
  "last_contact_history": [],
  "source_evidence": [],
  "required_logging_fields_after_call": [
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
    "agent/source"
  ]
}
```

Generated packets are available from `GET /calls/jarvis-packets` and written to `data/call-imports/jarvis_call_packets.json`.
