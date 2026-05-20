# Local Hermes Cleanup

Date: 2026-05-20

## What Was Found

- `C:\OttoServ\Hermes\data\tasks_ottoserv.csv` had one stale overdue test task: `TB96B14FB`, "Test Jarvis task", due 2026-05-10.
- `C:\OttoServ\Hermes\data\agent_bridge.csv` had eleven unread Hermes-to-Jarvis rows, mostly bridge tests and status-check messages tied to the stale test task.

## Cleanup Performed

- Backed up both original files under `C:\OttoServ\Hermes\archive\local-hermes-cleanup-*`.
- Archived the obsolete rows as `tasks_ottoserv.obsolete.csv` and `agent_bridge.obsolete.csv`.
- Reset active `data\tasks_ottoserv.csv` and `data\agent_bridge.csv` to headers only.
- Backed up `data\hermes.db`, exported the stale `TB96B14FB` SQLite rows, and removed that obsolete test task/dispatch from active SQLite tables.
- Added `C:\OttoServ\Hermes\LOCAL_HERMES_QA_README.md`.
- Updated local Hermes prompt so it is QA/context support only.

## Result

Local Hermes should no longer inject the stale "Test Jarvis task" or unread bridge status checks into Jarvis or the main operating queue. Fresh `doctor` and `watchdog-status` checks show zero active overdue tasks and zero open dispatches.
