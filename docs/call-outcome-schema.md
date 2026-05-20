# Call Outcome Schema

Jarvis should log every outbound call attempt with `POST /calls/outcomes`.

Allowed statuses:

- `called_no_answer`
- `voicemail_left`
- `connected_not_interested`
- `connected_interested`
- `booked_meeting`
- `call_back_requested`
- `bad_number`
- `wrong_business`
- `do_not_contact`
- `needs_follow_up`
- `needs_human_review`

Required fields:

```json
{
  "lead_id": "lead_example",
  "phone": "4072220199",
  "status": "connected_interested",
  "summary": "Short factual call summary.",
  "next_action": "Book demo / send follow-up / do not contact / enrich.",
  "follow_up_due": "2026-05-21",
  "objection": "",
  "booking_link": "",
  "recording_link": "",
  "transcript_link": "",
  "agent": "jarvis",
  "source": "jarvis-call"
}
```

Outcomes are summarized by `/calls/status`, `npm run ops:morning`, and `npm run ops:evening`.
