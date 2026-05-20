# Local Hermes Audit

Date: 2026-05-20

## Finding

Local Hermes should not be the OttoServ operations controller right now. Jarvis should remain the source of operational truth.

Recommended role: keep local Hermes only as QA, evidence, and context integrity support.

## What Was Inspected

- Local folder: `C:\OttoServ\Hermes`
- CLI entrypoint: `.\.venv\Scripts\python.exe scripts\hermes.py <command>`
- Telegram runner: `scripts\hermes_telegram.py`
- Startup/scheduler scripts:
  - `scripts\install-persistent-hermes.ps1`
  - `scripts\install-startup-hermes.ps1`
  - `scripts\install_windows_watchdog_task.ps1`
- Prompt: `prompts\hermes_system_prompt.md`
- Memory: `memory/*.md`, `data/hermes.db`, `logs/hermes_events.jsonl`, optional Mem0 under `data/mem0`
- Jarvis bridge:
  - local CSV bridge: `data/agent_bridge.csv`
  - SSH file bridge: `scripts\bridges\jarvis_file_bridge.py`
  - Telegram fallback: `scripts\hermes_telegram_send.py`
- Logs: `logs/hermes.log`
- Reports: `reports/*_morning_report.md`, `reports/*_evening_report.md`

## Evidence

- `scripts\hermes.py doctor` reported database and memory are present, but optional Jarvis transports are missing except local CSV bridge.
- `scripts\hermes.py watchdog-status` reported the last watchdog run was on 2026-05-18 with one open dispatch.
- `data/agent_bridge.csv` contains repeated Hermes-to-Jarvis messages still marked `new`, including stale test-task messages.
- `data/tasks_ottoserv.csv` contains one stale overdue Jarvis test task from 2026-05-10.
- `scripts\hermes.py morning` produced a report focused on the stale test task and did not include the newer remote agent ledgers created under `/home/clawuser`.
- `logs\hermes.log` shows repeated role-change instructions, repeated Telegram starts, DeepSeek connection failures, and bridge confusion.

## Why Local Hermes Is Not Useful Enough

- Its prompt and README still frame it as a local Chief of Staff / operations controller, which now conflicts with Jarvis as operations lead.
- It does not automatically load the droplet `/home/clawuser/agent_context` and `/home/clawuser/agent_ledgers` state that tomorrow's agents need.
- Its reports can be grounded in stale local CSV state instead of current Jarvis/Cowork/Codex/Gemini handoff files.
- The local CSV bridge can create messages, but the current evidence shows those messages may sit unread.
- The watchdog is not currently proving reliable active supervision.
- It can generate bloat by creating reports, dispatches, and plans without proving execution or evidence.

## Recommendation

Keep local Hermes, reduced to QA/Verifier and Context Summarizer.

Local Hermes should not:

- own operations
- assign Jarvis work unless Jonathan or Jarvis explicitly asks for an audit packet
- claim future follow-up without a real scheduler
- create duplicate task plans
- act as COO
- use stale local state as the source of truth

Local Hermes should:

- review Jarvis/Codex/Cowork/Gemini outputs
- check for missing evidence
- summarize ledgers and blockers
- produce concise pass/fail reports
- identify the correct owner for a task
- defer operational control to Jarvis

## Required Output Contract

1. Status
2. Evidence checked
3. Problem found
4. Recommended owner
5. Next action
6. Risk level

## Droplet Hermes

No disruption recommended. The evidence points to local Hermes as the problem. Droplet Hermes should be left alone unless a specific failing check or integration improvement is identified.

## Action Taken

- Rewrote local `C:\OttoServ\Hermes\prompts\hermes_system_prompt.md` so Hermes Local is QA/evidence/context support only.
- Synced droplet `/home/clawuser/agent_context/ottoserv_master_context.md` and `/home/clawuser/agent_context/hermes_role.md` with Jarvis as operations lead.
- Synced tomorrow work packets to `/home/clawuser/agent_ledgers/tasks.json` and copied them into the Jarvis, Cowork, Hermes, and Codex inboxes.
- Validated the droplet task ledger with `python3 -m json.tool`.
