# Phase 0 — Droplet deployment runbook

This is a dry-only deployment. It does not enable email, calls, Stripe, n8n, or client communications.

## 0. Inspect the live runtime

```bash
systemctl list-units --type=service | grep -iE 'hermes|telegram|bot'
systemctl status <telegram-unit> --no-pager
systemctl cat <telegram-unit>
journalctl -u <telegram-unit> -n 200 --no-pager
```

Record the unit name, runtime user, working directory, environment file, bot entrypoint, request handler, confirmation handler, outbound reply function, and current repository commit. Do not expose secret values.

## 1. Update the website checkout

```bash
cd <ottoserv-website-checkout>
git fetch origin
git checkout main
git pull --ff-only origin main
git merge-base --is-ancestor 74dbc30fd1e97eabc72d870c9d9f84f46b4f5c66 HEAD
```

## 2. Install the watchdog package

```bash
sudo REPO_DIR="$(pwd)" SERVICE_USER=<runtime-user> bash deploy/droplet/phase0/install-phase0.sh
```

The first run writes `/etc/hermes/phase0.env` and stops. Edit it, set the numeric Telegram allowlist IDs, keep `MODE=dry`, then rerun the installer.

## 3. Wire the existing bot

The bot must call `handleOperationRequest()` for the original request and `handleRevenueConfirmation()` for the confirmation, passing verified Telegram user/chat metadata and the original request message id. Do not auto-create a missing pending request during confirmation.

Apply `safeReply()` only to operational status claims. Normal conversation does not need a task object.

## 4. Wire watchdog notification

Preferred: the existing bot drains JSON alerts from `$HERMES_NOTIFY_QUEUE_DIR` and archives each item only after successful delivery. Fallback: configure the direct Telegram API variables.

## 5. Run the live acceptance tests

Follow `PHASE0_LIVE_ACCEPTANCE_TESTS.md` and capture every required artifact.

## Rollback

```bash
sudo systemctl disable --now hermes-watchdog.timer
sudo rm -f /etc/systemd/system/hermes-watchdog.service
sudo rm -f /etc/systemd/system/hermes-watchdog.timer
sudo systemctl daemon-reload
```

Revert the Telegram handler change. Leave durable state intact for investigation.
