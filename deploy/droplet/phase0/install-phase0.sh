#!/usr/bin/env bash
set -euo pipefail

die() { echo "FAIL: $*" >&2; exit 1; }
ok()  { echo "OK: $*"; }

REPO_DIR="${REPO_DIR:-$(pwd)}"
SERVICE_USER="${SERVICE_USER:-hermes}"
ENV_FILE="${ENV_FILE:-/etc/hermes/phase0.env}"
MERGE_COMMIT="74dbc30fd1e97eabc72d870c9d9f84f46b4f5c66"
PKG="$REPO_DIR/deploy/droplet/phase0"

[ "$(id -u)" -eq 0 ] || die "run as root (sudo)"
[ -d "$REPO_DIR/.git" ] || die "REPO_DIR is not a git checkout"
git -C "$REPO_DIR" merge-base --is-ancestor "$MERGE_COMMIT" HEAD 2>/dev/null \
  || die "required execution-truth merge is not in HEAD"

REQUIRED_FILES=(
  "$PKG/telegram-execution-bridge.mjs"
  "$PKG/watchdog-notify.mjs"
  "$PKG/pendingOperationStore.mjs"
  "$PKG/authorization.mjs"
  "$PKG/notificationState.mjs"
  "$PKG/notifier.mjs"
  "$PKG/phase0.env.template"
  "$PKG/systemd/hermes-watchdog.service"
  "$PKG/systemd/hermes-watchdog.timer"
  "$REPO_DIR/scripts/ops-revenue-now.mjs"
  "$REPO_DIR/src/lib/execution/commandRail.mjs"
  "$REPO_DIR/src/lib/execution/watchdog.mjs"
)
for file in "${REQUIRED_FILES[@]}"; do
  [ -f "$file" ] || die "missing required file: $file"
done

id "$SERVICE_USER" >/dev/null 2>&1 \
  || die "service user '$SERVICE_USER' does not exist"

if [ -n "${NODE_BIN:-}" ]; then
  [ -x "$NODE_BIN" ] || die "NODE_BIN is not executable: $NODE_BIN"
  sudo -u "$SERVICE_USER" test -x "$NODE_BIN" \
    || die "$SERVICE_USER cannot execute NODE_BIN"
else
  NODE_BIN="$(sudo -u "$SERVICE_USER" sh -lc 'command -v node' 2>/dev/null || true)"
  [ -n "$NODE_BIN" ] \
    || die "node is unavailable to service user '$SERVICE_USER'; set NODE_BIN"
fi
ok "service-user node: $NODE_BIN"

sudo -u "$SERVICE_USER" test -r "$REPO_DIR/scripts/ops-revenue-now.mjs" \
  || die "$SERVICE_USER cannot read repository files"

mkdir -p /etc/hermes
if [ ! -f "$ENV_FILE" ]; then
  install -m 0600 "$PKG/phase0.env.template" "$ENV_FILE"
  die "configure $ENV_FILE, then re-run"
fi

set -a
. "$ENV_FILE"
set +a

for name in HERMES_STATE_ROOT HERMES_TASKS_DIR HERMES_APPROVALS_DIR \
            HERMES_PENDING_DIR HERMES_NOTIFY_STATE_DIR \
            HERMES_ALLOWED_TELEGRAM_USER_IDS HERMES_ALLOWED_CHAT_IDS; do
  [ -n "${!name:-}" ] || die "$name is required in $ENV_FILE"
done
[ "${MODE:-dry}" = "dry" ] || die "MODE must be dry"

case "$HERMES_STATE_ROOT" in
  /tmp|/tmp/*) die "HERMES_STATE_ROOT cannot be under /tmp";;
esac

for dir in "$HERMES_TASKS_DIR" "$HERMES_APPROVALS_DIR" \
           "$HERMES_PENDING_DIR" "$HERMES_NOTIFY_STATE_DIR"; do
  case "$dir" in
    "$HERMES_STATE_ROOT"|"$HERMES_STATE_ROOT"/*) ;;
    *) die "$dir must be inside HERMES_STATE_ROOT=$HERMES_STATE_ROOT";;
  esac
done
if [ -n "${HERMES_NOTIFY_QUEUE_DIR:-}" ]; then
  case "$HERMES_NOTIFY_QUEUE_DIR" in
    "$HERMES_STATE_ROOT"|"$HERMES_STATE_ROOT"/*) ;;
    *) die "HERMES_NOTIFY_QUEUE_DIR must be inside HERMES_STATE_ROOT";;
  esac
fi

mkdir -p "$HERMES_STATE_ROOT" "$HERMES_TASKS_DIR" "$HERMES_APPROVALS_DIR" \
  "$HERMES_PENDING_DIR" "$HERMES_NOTIFY_STATE_DIR"
if [ -n "${HERMES_NOTIFY_QUEUE_DIR:-}" ]; then
  mkdir -p "$HERMES_NOTIFY_QUEUE_DIR"
fi

chown -R "$SERVICE_USER":"$SERVICE_USER" "$HERMES_STATE_ROOT"
for dir in "$HERMES_TASKS_DIR" "$HERMES_APPROVALS_DIR" \
           "$HERMES_PENDING_DIR" "$HERMES_NOTIFY_STATE_DIR"; do
  sudo -u "$SERVICE_USER" test -w "$dir" \
    || die "$SERVICE_USER cannot write $dir"
done
if [ -n "${HERMES_NOTIFY_QUEUE_DIR:-}" ]; then
  sudo -u "$SERVICE_USER" test -w "$HERMES_NOTIFY_QUEUE_DIR" \
    || die "$SERVICE_USER cannot write notify queue"
fi

SMOKE_DIR="$(mktemp -d /var/tmp/phase0-smoke.XXXXXX)"
chown -R "$SERVICE_USER":"$SERVICE_USER" "$SMOKE_DIR"
cleanup() { rm -rf "$SMOKE_DIR"; }
trap cleanup EXIT

sudo -u "$SERVICE_USER" env \
  HERMES_TASKS_DIR="$SMOKE_DIR/tasks" \
  HERMES_APPROVALS_DIR="$SMOKE_DIR/approvals" \
  CORRELATION_ID="install-smoke" \
  SOURCE_TEXT="installer smoke" \
  MODE=dry \
  "$NODE_BIN" "$REPO_DIR/scripts/ops-revenue-now.mjs" >/dev/null \
  || die "service-user dry smoke test failed"

[ -d "$SMOKE_DIR/tasks" ] && [ -n "$(ls -A "$SMOKE_DIR/tasks" 2>/dev/null)" ] \
  || die "smoke test produced no durable task"
cleanup
trap - EXIT
ok "service-user smoke passed; isolated state removed"

sed \
  -e "s#__SERVICE_USER__#${SERVICE_USER}#g" \
  -e "s#__REPO_DIR__#${REPO_DIR}#g" \
  -e "s#__NODE_BIN__#${NODE_BIN}#g" \
  -e "s#__STATE_ROOT__#${HERMES_STATE_ROOT}#g" \
  "$PKG/systemd/hermes-watchdog.service" \
  > /etc/systemd/system/hermes-watchdog.service
install -m 0644 "$PKG/systemd/hermes-watchdog.timer" \
  /etc/systemd/system/hermes-watchdog.timer

systemctl daemon-reload
systemctl enable --now hermes-watchdog.timer
systemctl is-active --quiet hermes-watchdog.timer \
  || die "timer is not active"
systemctl start hermes-watchdog.service \
  || die "watchdog first run failed"

ok "watchdog installed. Wire the live bot, then run PHASE0_LIVE_ACCEPTANCE_TESTS.md"
