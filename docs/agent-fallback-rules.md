# OttoServ Agent Fallback Rules

Jarvis remains the default operational authority unless Jonathan explicitly overrides.

## If Cowork Is Unavailable

Codex should continue with:

- data cleanup
- import prep
- lead queue formatting
- dashboards/status outputs
- docs and task packets
- code and automation blockers

Do not wait for Cowork if the task is infrastructure, schema, import, test, or dashboard work.

## If Gemini Is Unavailable

Queue deep research for the next availability window and continue with current ICP rules:

- property management first
- home services/trades next
- AI receptionist, missed-call recovery, lead qualification, and lead handling as the wedge

Do not spend expensive credits on low-value pages or generic research.

## If Jarvis Credits Are Low

Jarvis only calls A-tier leads that have:

- valid phone
- safe local-business-hours slot
- clear ICP fit
- source/evidence context when available
- no do-not-call or negative-response flag

B-tier is email-first. C-tier goes to enrichment. Reject leads are not contacted.

## If Local Hermes Lacks Context

Local Hermes must reload:

- `AGENTS.md`
- `docs/local-hermes-audit.md`
- `/home/clawuser/agent_context/ottoserv_master_context.md` when reachable
- `/home/clawuser/agent_ledgers/tasks.json` when reachable
- `/home/clawuser/agent_ledgers/outreach_queue.json` when reachable
- `data/call-imports/daily_metrics.json` when present

If it cannot load current context and ledgers, it must stay out of the operational loop and produce only a limitation note.

## Droplet Hermes

Do not disrupt droplet Hermes unless there is a clear integration improvement, a failing check, or Jonathan asks for it. The current concern is local Hermes bloat/confusion.
