#!/usr/bin/env python3
"""Safely remove the legacy /ops_revenue_now direct-execution bypass.

This script edits the live Hermes config in place, creates a timestamped backup,
validates the resulting YAML, and fails closed if the expected legacy blocks are
not present. It does not read or write credential values.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

LEGACY_DESCRIPTION = (
    "    - /ops_revenue_now: run the approved real Revenue Operator cycle and "
    "return the evidence file.\n"
)
SAFE_DESCRIPTION = (
    "    - /ops_revenue_now: request a controlled Revenue Operator run. "
    "Explicit confirmation is required before any dry execution begins.\n"
)

LEGACY_INSTRUCTION = (
    "    If Jonathan asks to start outbound, client acquisition, revenue growth, "
    "email/call/social execution, or the Revenue Operator today, use "
    "/ops_revenue_now or the approved revenue execution hook. Never say \"I will "
    "initiate\" unless a real evidence_file or repair task path was created.\n"
)
SAFE_INSTRUCTION = (
    "    If Jonathan asks to start outbound, client acquisition, revenue growth, "
    "email/call/social execution, or the Revenue Operator today, route the message "
    "through the approved revenue execution hook. A durable pending operation and "
    "explicit confirmation are required. Never claim execution based only on "
    "intent or conversation.\n"
)

LEGACY_COMMAND = """  ops_revenue_now:
    type: exec
    command: cd /home/hermes-agent/workspace/hermes_daily_operating_loop && bash -lc 'set -a; source /home/hermes-agent/.config/hermes-live-rails.env 2>/dev/null || true; set +a; ./telegram_operations_entrypoint.py revenue-now'
"""

SAFE_COMMAND = """  ops_revenue_now:
    type: exec
    command: >-
      printf '%s\\n' 'Controlled execution requires the approved two-step Telegram flow.
      Send Start the revenue operator now.
      Hermes will create a durable pending operation and request explicit confirmation.
      Nothing has started.'
"""


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"Expected exactly one {label} block, found {count}; no file was changed."
        )
    return text.replace(old, new, 1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config",
        default="/home/hermes-agent/.hermes/config.yaml",
        help="Path to Hermes config.yaml",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Validate that the bypass is absent without changing the file",
    )
    args = parser.parse_args()

    path = Path(args.config)
    if not path.is_file():
        raise RuntimeError(f"Config not found: {path}")

    original = path.read_text(encoding="utf-8")

    if args.check_only:
        yaml.safe_load(original)
        if "telegram_operations_entrypoint.py revenue-now" in original:
            raise RuntimeError("Legacy /ops_revenue_now bypass is still present.")
        print("YAML_VALID=yes")
        print("LEGACY_TELEGRAM_BYPASS_REMOVED=yes")
        return 0

    updated = replace_once(
        original, LEGACY_DESCRIPTION, SAFE_DESCRIPTION, "legacy description"
    )
    updated = replace_once(
        updated, LEGACY_INSTRUCTION, SAFE_INSTRUCTION, "legacy instruction"
    )
    updated = replace_once(updated, LEGACY_COMMAND, SAFE_COMMAND, "legacy command")

    # Parse before writing so malformed YAML never replaces the live config.
    yaml.safe_load(updated)

    if "telegram_operations_entrypoint.py revenue-now" in updated:
        raise RuntimeError("Legacy bypass remained after replacement; aborting.")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = path.with_name(f"{path.name}.backup_no_bypass_{stamp}")
    shutil.copy2(path, backup)

    temp = path.with_name(f".{path.name}.tmp-{stamp}")
    temp.write_text(updated, encoding="utf-8")
    temp.replace(path)

    print(f"Updated: {path}")
    print(f"Backup: {backup}")
    print("YAML_VALID=yes")
    print("LEGACY_TELEGRAM_BYPASS_REMOVED=yes")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
