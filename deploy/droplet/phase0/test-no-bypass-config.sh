#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PATCHER="$ROOT/deploy/droplet/phase0/apply-no-bypass-config.py"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
CONFIG="$TMP_DIR/config.yaml"

cat >"$CONFIG" <<'YAML'
system_prompt: |
    - /ops_revenue_now: run the approved real Revenue Operator cycle and return the evidence file.

    If Jonathan asks to start outbound, client acquisition, revenue growth, email/call/social execution, or the Revenue Operator today, use /ops_revenue_now or the approved revenue execution hook. Never say "I will initiate" unless a real evidence_file or repair task path was created.

quick_commands:
  ops_revenue_now:
    type: exec
    command: cd /home/hermes-agent/workspace/hermes_daily_operating_loop && bash -lc 'set -a; source /home/hermes-agent/.config/hermes-live-rails.env 2>/dev/null || true; set +a; ./telegram_operations_entrypoint.py revenue-now'
YAML

python3 "$PATCHER" --config "$CONFIG"
python3 "$PATCHER" --config "$CONFIG" --check-only

grep -q 'request a controlled Revenue Operator run' "$CONFIG"
grep -q 'durable pending operation and explicit confirmation are required' "$CONFIG"
grep -q 'Controlled execution requires the approved two-step Telegram flow' "$CONFIG"
! grep -q 'telegram_operations_entrypoint.py revenue-now' "$CONFIG"

python3 - "$CONFIG" <<'PY'
from pathlib import Path
import sys
import yaml

yaml.safe_load(Path(sys.argv[1]).read_text(encoding="utf-8"))
print("TEST_PASS: no-bypass config patcher")
PY
