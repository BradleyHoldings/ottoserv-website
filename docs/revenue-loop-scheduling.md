# Revenue Loop Scheduling

How to keep the autonomous revenue loop's source-of-truth files fresh without
running anything by hand.

## What the loop produces

`npm run revenue:daily-loop` runs the loop and refreshes three read-only files in
`data/revenue-engine/` (all gitignored):

- `latest.json` — most recent loop run (status, health, queues, repair packets, revenue risks)
- `<run-id>.json` — the dated run snapshot
- `implementation-work-orders.json` — durable, approval-gated implementation work orders

The OS Dashboard (`/os/hermes/revenue`, `/os/hermes/service-delivery`) reads these
files. Refreshing them on a schedule is what makes the loop "autonomous."

## Manual command

```bash
npm run revenue:daily-loop
# equivalent: node scripts/revenue-daily-loop.mjs
```

The cycle (morning/afternoon) is inferred from the local hour (< 12:00 = morning).
Override via env if needed: `REVENUE_LOOP_CYCLE`, `REVENUE_LOOP_NOW`,
`REVENUE_LOOP_OUTPUT_DIR`, `REVENUE_LOOP_MAX_VOLUME`.

## Scheduling choice: host cron / Task Scheduler (NOT Vercel cron)

The loop's source of truth is **local JSON files on a persistent filesystem**. It
must run where those files persist and where the dashboard reads them — i.e. the
host that serves `/os/hermes` from disk (the droplet) or Jonathan's machine.

**Vercel cron is intentionally not used.** Vercel runs under a read-only,
ephemeral `/var/task`; file writes go to a per-invocation tmp dir that does not
persist and is not shared with the request that renders the dashboard. A Vercel
cron would produce throwaway output and the dashboard could never read a stable
file. So scheduling lives on the persistent host.

### Linux (droplet) — cron

Run morning (09:00) and afternoon (14:00), Monday–Saturday. Edit with `crontab -e`:

```cron
# OttoServ revenue loop — refresh read-only state twice a day, Mon–Sat
0 9  * * 1-6  cd /home/clawuser/ottoserv-website && /usr/bin/node scripts/revenue-daily-loop.mjs >> data/revenue-engine/loop.log 2>&1
0 14 * * 1-6  cd /home/clawuser/ottoserv-website && /usr/bin/node scripts/revenue-daily-loop.mjs >> data/revenue-engine/loop.log 2>&1
```

Adjust the repo path and `node` path (`which node`) for your host. `loop.log` is
gitignored.

### Windows — Task Scheduler

Two daily tasks (run from the repo root). In PowerShell or cmd:

```bat
schtasks /Create /TN "OttoServ Revenue Loop AM" /SC DAILY /D MON,TUE,WED,THU,FRI,SAT /ST 09:00 ^
  /TR "cmd /c cd /d C:\OttoServ\ottoserv-website && node scripts\revenue-daily-loop.mjs >> data\revenue-engine\loop.log 2>&1"

schtasks /Create /TN "OttoServ Revenue Loop PM" /SC DAILY /D MON,TUE,WED,THU,FRI,SAT /ST 14:00 ^
  /TR "cmd /c cd /d C:\OttoServ\ottoserv-website && node scripts\revenue-daily-loop.mjs >> data\revenue-engine\loop.log 2>&1"
```

Adjust the repo path. Verify with `schtasks /Query /TN "OttoServ Revenue Loop AM"`;
run on demand with `schtasks /Run /TN "OttoServ Revenue Loop AM"`.

## Freshness / monitoring

Each run prints a JSON summary including `last_run_at`. The dashboard surfaces the
file's last-modified time. If `latest.json` is older than expected, the scheduled
job did not run — check `data/revenue-engine/loop.log`.

## Safety

The runner only **reads** local ledgers and **writes** the read-only state files
above. It loads no credentials and imports no platform/email/Stripe/Retell/n8n
client, so a scheduled run cannot send a message, charge a card, activate a
workflow, deploy, or produce a client-facing deliverable. Empty/missing source
files degrade to a safe `repair_first` status instead of failing. High-risk
actions stay approval-gated end to end.
