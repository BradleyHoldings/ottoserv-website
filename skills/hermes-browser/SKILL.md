# Hermes Browser Research and DM Skill

## Purpose

Use an authenticated browser provider to research public business information and execute policy-compliant social DMs for OttoServ leads.

## Capabilities

- Read public websites and social profiles.
- Verify official company websites, public contact details, and decision-maker profiles.
- Produce structured enrichment output with source URLs.
- Queue and send social DMs only through the Hermes DM execution rail.
- Return real execution evidence: platform, profile/thread URL, timestamp, message id when available, screenshot/confirmation, outcome, and next action.

## Safety Rules

- Never invent email addresses, phone numbers, names, profiles, or intent evidence.
- Reject numbers embedded in URLs, profile IDs, job IDs, and unrelated text.
- Never contact a lead without a verified public contact path or verified social profile.
- Respect DNC, blacklist, negative-response, cooldown, max-attempt, daily-cap, business-hours, and one-channel-at-a-time rules.
- Routine standing-policy outreach does not need per-item Jonathan approval.
- Gate upset/high-emotion, legal/compliance, custom pricing/guarantees, payment links, new campaigns/segments, and policy exceptions.
- Never claim a DM was sent without real provider evidence.
- Never store browser cookies, passwords, MFA secrets, or session tokens in the repository.

## Runtime Contract

The OttoServ repo talks to the browser runtime through these endpoints:

- `GET /v1/capabilities`
- `POST /v1/research/lead`
- `POST /v1/dm/send`
- `POST /v1/dm/replies`

The bridge is configured with:

- `HERMES_BROWSER_BRIDGE_URL`
- `HERMES_BROWSER_BRIDGE_TOKEN`
- `HERMES_BROWSER_ADAPTER_MODULE` on the bridge host

## Operating Sequence

1. Run `npm run hermes:browser-status`.
2. Research seed leads with `npm run hermes:browser-research`.
3. Run `npm run lead:intake`.
4. Queue a verified DM using `npm run hermes:queue-dm`.
5. Review no-send output with `npm run hermes:send-dm`.
6. Enable `HERMES_DM_MODE=live` only after the authenticated session and evidence capture are proven.
7. Monitor replies and update lead stages through the existing outcome-routing and evidence systems.

## Failure States

Treat these as temporary/deferred rather than actor failure unless repeated after intervention:

- `login_expired`
- `mfa_required`
- `captcha_required`
- `account_challenge`
- `rate_limited`
- `session_unavailable`
- `platform_ui_changed`

Stop immediately on DNC/blacklist conflicts or profile-identity mismatch.
