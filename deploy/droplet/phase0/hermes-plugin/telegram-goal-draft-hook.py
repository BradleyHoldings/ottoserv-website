
"""Narrow Telegram goal-draft hook for OttoServ Hermes advisory mode.

This plugin only handles explicit goal/work-order draft intents from the
allowed Telegram user. It does not grant general tool access, shell access,
Codex handoff, production access, or external action authority.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

HANDLER = Path("/home/hermes-agent/workspace/goal_work_orders/telegram_goal_draft_handler.py")
GOAL_DIR = Path("/home/hermes-agent/workspace/goal_work_orders")
LOG_PATH = GOAL_DIR / "telegram_goal_draft_hook_calls.jsonl"
ERROR_DIR = GOAL_DIR / "goal_reviews" / "telegram_live_hook_errors"
REVENUE_ROOT = Path("/home/hermes-agent/workspace/hermes_daily_operating_loop")
REVENUE_RUNNER = REVENUE_ROOT / "run_real_revenue_operator_cycle.py"
REVENUE_REPAIR_QUEUE = REVENUE_ROOT / "repair_queue_for_codex.md"

PHASE0_REPO = Path("/home/clawuser/ottoserv-website")
PHASE0_BRIDGE_CLI = (
    PHASE0_REPO / "deploy/droplet/phase0/telegram-bridge-cli.mjs"
)
PHASE0_ENV_FILE = Path("/etc/hermes/phase0.env")

REVENUE_EXECUTION_PATTERNS = [
    r"^/ops_revenue_now(?:@\w+)?\s*$",
    r"\bstart\b.{0,80}\b(outbound|client acquisition|revenue growth|revenue operator)\b",
    r"\b(run|trigger|initiate|execute)\b.{0,80}\b(revenue operator|outbound|client acquisition)\b",
    r"\bclient acquisition\b.{0,80}\b(today|now|start|run|execute)\b",
]

REVENUE_CONFIRMATION_PATTERNS = [
    r"^\s*yes\s*$",
    r"^\s*yes[,.]?\s+(please\s+)?(start|confirm|proceed|run)\s*$",
    r"^\s*(confirm|confirmed|approve|approved|proceed)\s*$",
    r"^\s*yes[,.]?\s+please\s+start\s*$",
    r"^\s*i\s+approve\b.+\b(dm|post|comment|reply|reddit|linkedin|instagram|facebook|x|twitter)\b",
    r"^\s*approve\b.+\b(dm|post|comment|reply|reddit|linkedin|instagram|facebook|x|twitter)\b",
]

EXPLICIT_GOAL_PATTERNS = [
    r"^\s*draft\s+a\s+goal\b",
    r"^\s*create\s+a\s+goal\b",
    r"^\s*turn\s+this\s+into\s+a\s+goal\b",
    r"^\s*create\s+a\s+work\s+order\s+for\b",
    r"^\s*plan\s+this\s+goal\b",
]

SOCIAL_DRAFT_PLAN_PATTERNS = [
    r"\bprepare\b.{0,80}\b(7[- ]day|seven[- ]day)\b.{0,80}\b(content|revenue|engagement)\b.{0,80}\bplan\b",
    r"\b(7[- ]day|seven[- ]day)\b.{0,80}\b(content|revenue|engagement)\b.{0,80}\bplan\b",
    r"\bdraft\b.{0,80}\bcowork\b.{0,40}\bhandoff\b",
    r"\bgenerate\b.{0,40}\bcontent\s+calendar\b",
    r"\bcreate\b.{0,40}\bengagement\s+plan\b",
    r"\bprepare\b.{0,40}\bplatform\s+versions\b",
    r"\bprepare\b.{0,80}\b(draft|content|social|revenue)\b.{0,80}\bplan\b",
]

DRAFT_ONLY_GUARDRAIL_PATTERNS = [
    r"\bdo\s+not\s+post\s+live\b",
    r"\bdo\s+not\s+dm\b",
    r"\bdo\s+not\s+send\b.{0,40}\bexternally\b",
    r"\bonly\s+prepare\b.{0,20}\bdraft\b",
    r"\bdraft\s+only\b",
]

EXECUTION_BLOCK_PATTERNS = [
    r"\bsend\s+(the\s+)?emails?\b",
    r"\bsend\s+this\s+to\s+codex\b.*\bstart\b",
    r"\bstart\s+implementation\b",
    r"\btrigger\b.{0,40}\bworkflow\b",
    r"\bconnect\s+n8n\b",
    r"\bdeploy\s+it\b",
    r"\bdeploy\s+now\b",
    r"\bpost\s+this\b",
    r"\bpost\s+publicly\b",
    r"\bcall\s+(the\s+)?prospect\b",
    r"\bmodify\s+production\b",
]

SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_\-]{12,}"),
    re.compile(r"\b\d{8,10}:[A-Za-z0-9_\-]{20,}\b"),
    re.compile(r"(?i)(api[_-]?key|token|password|secret)\s*[:=]\s*\S+"),
]


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _platform_value(platform: Any) -> str:
    return str(getattr(platform, "value", platform)).lower()


def _allowed_user(user_id: Optional[str]) -> bool:
    if not user_id:
        return False
    raw = os.getenv("TELEGRAM_ALLOWED_USERS", "")
    allowed = {part.strip() for part in re.split(r"[,\s]+", raw) if part.strip()}
    return str(user_id) in allowed


def _classify_intent(text: str) -> Optional[str]:
    lowered = text.strip().lower()
    if any(re.search(pattern, lowered) for pattern in REVENUE_EXECUTION_PATTERNS):
        return "approved_revenue_execution_request"
    if any(re.search(pattern, lowered) for pattern in SOCIAL_DRAFT_PLAN_PATTERNS):
        return "draft_social_revenue_plan"
    if (
        any(re.search(pattern, lowered) for pattern in DRAFT_ONLY_GUARDRAIL_PATTERNS)
        and re.search(r"\b(content|calendar|engagement|platform|cowork|handoff|dm angle|social|revenue)\b", lowered)
    ):
        return "draft_social_revenue_plan"
    if any(re.search(pattern, lowered) for pattern in EXECUTION_BLOCK_PATTERNS):
        return "blocked_execution_request"
    if any(re.search(pattern, lowered) for pattern in EXPLICIT_GOAL_PATTERNS):
        return "goal_draft_request"
    return None


def _social_revenue_plan_reply() -> str:
    return """7-Day OttoServ Revenue Content And Engagement Plan

Draft-only guardrail: No live posts, comments, replies, DMs, calls, Stripe actions, n8n actions, or client-facing actions are authorized. This is an internal planning handoff only.

7-Day Plan
Day 1: Problem framing. Show how missed follow-up leaks revenue. CTA: request the front-office leak check.
Day 2: Proof thread. Summarize one safe internal evidence point or demo result. CTA: ask for a workflow audit.
Day 3: Founder/operator post. Explain the cost of manual lead handling and slow response. CTA: book a diagnostic.
Day 4: Objection handling. Address "we already have a CRM" with OttoServ as the operating layer. CTA: compare current response path.
Day 5: Mini case/story. Draft an anonymized before/after workflow story. CTA: ask for one bottleneck to map.
Day 6: Engagement day. Comment/reply on relevant threads with useful diagnostic questions only. CTA: invite public conversation.
Day 7: Recap and offer. Package the week into a concise revenue-ops checklist. CTA: request the 15-minute leak review.

Platform Variants
LinkedIn: Operator-focused posts with concrete workflow language, proof, and a clear diagnostic CTA.
Reddit: Helpful, non-promotional replies first; posts must read as operational advice, not sales copy.
X/Twitter: Short threads with one sharp claim, one example, and one CTA.
Facebook/Groups: Practical field-service examples and questions, no spammy pitch language.

Draft DM Angles
Angle 1: "Saw your post about missed calls/follow-up. I drafted a quick leak-check idea; want me to share it here first?"
Angle 2: "Your current bottleneck sounds like response-time drift. Draft-only note: OttoServ could map that into a fix list."
Angle 3: "If useful, I can prepare a no-send workflow audit outline based on the public thread."
All DM angles remain drafts only until Jonathan explicitly approves a specific recipient, platform, and message.

Cowork Comment/Reply Targets
Target posts where operators mention missed leads, slow estimates, CRM cleanup, inbound overload, no-show follow-up, or service dispatch gaps.
Prioritize public comments/replies that ask useful diagnostic questions and do not claim results without evidence.
Skip targets involving active disputes, sensitive personal data, pricing promises, medical/legal/financial advice, or private community rules against promotion.

CTA
"Reply with the part of your front office that leaks the most: missed calls, slow follow-up, stale CRM, or no-show recovery. I will map the first fix."

Evidence Requirements
Source URL or screenshot reference for every target.
Platform, author handle, timestamp, and why the thread is relevant.
Draft copy before any approval request.
Policy/community-rule check for each platform.
Post-action evidence only after separately approved live execution.

Blockers
No target list with URLs yet.
No approved recipients or live message copy.
No platform-specific community-rule review yet.
No evidence packet proving claims for case-study language.

Approval Checklist
Jonathan approves exact platform.
Jonathan approves exact copy.
Jonathan approves exact recipient/thread/post target.
Jonathan confirms send/post/comment/reply timing.
Hermes records evidence path and rollback/fallback owner.
Until all are checked for a specific action, execution remains blocked.

File-Based Cowork Handoff Structure
cowork_social_revenue_plan.md: 7-day calendar, daily objective, CTA, and draft copy.
cowork_platform_variants.md: LinkedIn, Reddit, X/Twitter, Facebook/group variants.
cowork_social_targets.json: target URL, platform, handle, relevance reason, risk notes, proposed draft action.
cowork_dm_angles.md: draft-only DM angles with no recipient execution authority.
evidence_requirements.json: required proof fields, screenshots/URLs, policy checks, approval evidence.
blockers.md: missing inputs, unsafe claims, policy gaps, and unavailable targets.
approval_checklist.md: exact approval fields required before any live action.
handoff_manifest.json: file list, owner, created_at, draft_only=true, external_actions_taken=false.

Suggested Hermes message after this fix: "Hermes, prepare a draft-only 7-day OttoServ revenue content and engagement plan with platform variants, draft DM angles, Cowork comment/reply targets, CTA, evidence requirements, blockers, approval checklist, and file-based Cowork handoff structure. Do not post live, do not DM anyone, do not comment/reply, do not call, do not trigger n8n or Stripe, and do not send anything externally."
"""


def _redact(text: str) -> str:
    redacted = text
    for pattern in SECRET_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted[:160]


def _log(record: Dict[str, Any]) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    safe = dict(record)
    if "message_preview" in safe:
        safe["message_preview"] = _redact(str(safe["message_preview"]))
    with LOG_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(safe, sort_keys=True) + "\n")


def _write_error_report(record: Dict[str, Any]) -> Path:
    ERROR_DIR.mkdir(parents=True, exist_ok=True)
    path = ERROR_DIR / f"telegram_goal_hook_error_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    path.write_text(json.dumps(record, indent=2, sort_keys=True), encoding="utf-8")
    return path


def _run_handler(text: str) -> Dict[str, Any]:
    completed = subprocess.run(
        [str(HANDLER), "--json", text],
        cwd=str(GOAL_DIR),
        text=True,
        capture_output=True,
        timeout=180,
        check=False,
    )
    stdout = completed.stdout.strip()
    if completed.returncode != 0:
        return {
            "status": "handler_error",
            "result": "handler_error",
            "blocked_reason": "Goal draft handler exited unsuccessfully.",
            "stderr_tail": completed.stderr[-1000:],
            "reply": "I could not safely create that draft work order. No execution occurred. Please review the handler error report before retrying.",
        }
    try:
        data = json.loads(stdout)
    except json.JSONDecodeError:
        return {
            "status": "handler_error",
            "result": "handler_error",
            "blocked_reason": "Goal draft handler returned non-JSON output.",
            "stdout_sha256": hashlib.sha256(stdout.encode("utf-8")).hexdigest(),
            "reply": "I could not safely parse the draft handler result. No execution occurred. Please review the handler error report before retrying.",
        }
    return data


def _run_revenue_operator() -> Dict[str, Any]:
    if not REVENUE_RUNNER.exists():
        REVENUE_REPAIR_QUEUE.parent.mkdir(parents=True, exist_ok=True)
        REVENUE_REPAIR_QUEUE.open("a", encoding="utf-8").write(
            f"\n- {_now()} Telegram revenue execution requested, but runner missing at {REVENUE_RUNNER}.\n"
        )
        return {
            "status": "blocked_runner_missing",
            "reply": f"I cannot trigger execution from this channel; repair task created at {REVENUE_REPAIR_QUEUE}.",
        }
    completed = subprocess.run(
        [str(REVENUE_RUNNER)],
        cwd=str(REVENUE_ROOT),
        text=True,
        capture_output=True,
        timeout=300,
        check=False,
    )
    try:
        data = json.loads(completed.stdout or "{}")
    except json.JSONDecodeError:
        data = {}
    if completed.returncode == 0 and data.get("evidence_file"):
        return {
            "status": "execution_created",
            "evidence_file": data.get("evidence_file"),
            "emails_sent": data.get("emails_sent", 0),
            "calls_queued": data.get("calls_queued", 0),
            "calls_placed": data.get("calls_placed", 0),
            "reply": (
                "Revenue Operator execution run created.\n"
                f"- evidence_file: {data.get('evidence_file')}\n"
                f"- emails_sent: {data.get('emails_sent', 0)}\n"
                f"- calls_queued: {data.get('calls_queued', 0)}\n"
                f"- calls_placed: {data.get('calls_placed', 0)}"
            ),
        }
    REVENUE_REPAIR_QUEUE.open("a", encoding="utf-8").write(
        f"\n- {_now()} Telegram revenue execution failed to create evidence. returncode={completed.returncode}; stderr_tail={(completed.stderr or '')[-300:]}\n"
    )
    return {
        "status": "execution_failed",
        "returncode": completed.returncode,
        "reply": f"I cannot trigger execution from this channel; repair task created at {REVENUE_REPAIR_QUEUE}.",
    }



def _phase0_environment() -> Dict[str, str]:
    """Use the environment injected into the gateway by systemd."""
    env = dict(os.environ)

    required = (
        "HERMES_STATE_ROOT",
        "HERMES_TASKS_DIR",
        "HERMES_APPROVALS_DIR",
        "HERMES_PENDING_DIR",
        "HERMES_NOTIFY_STATE_DIR",
        "HERMES_ALLOWED_TELEGRAM_USER_IDS",
        "HERMES_ALLOWED_CHAT_IDS",
    )
    missing = [name for name in required if not env.get(name, "").strip()]
    if missing:
        raise RuntimeError(
            "Phase-0 environment is incomplete: " + ", ".join(missing)
        )

    if env.get("MODE", "dry") != "dry":
        raise RuntimeError("Phase-0 bridge refuses non-dry mode.")

    return env


def _run_phase0_bridge(action: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if not PHASE0_BRIDGE_CLI.exists():
        raise RuntimeError(f"Phase-0 bridge CLI missing: {PHASE0_BRIDGE_CLI}")

    completed = subprocess.run(
        ["/usr/bin/node", str(PHASE0_BRIDGE_CLI), action],
        cwd=str(PHASE0_REPO),
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        timeout=300,
        check=False,
        env=_phase0_environment(),
    )

    stdout = completed.stdout.strip()
    try:
        data = json.loads(stdout or "{}")
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Phase-0 bridge returned non-JSON output."
        ) from exc

    if completed.returncode != 0 or data.get("ok") is False:
        reason = data.get("reason") or "phase0_bridge_failed"
        return {
            **data,
            "ok": False,
            "status": reason,
            "reply": (
                f"I could not safely process that operation ({reason}). "
                "Nothing started."
            ),
        }

    return data


def _pending_directory() -> Path:
    env = _phase0_environment()
    raw = env.get("HERMES_PENDING_DIR", "").strip()
    if not raw:
        raise RuntimeError("HERMES_PENDING_DIR is not configured.")
    return Path(raw)


def _latest_pending_for(user_id: str, chat_id: str) -> Optional[Dict[str, Any]]:
    directory = _pending_directory()
    if not directory.exists():
        return None

    candidates = []
    now = datetime.now(timezone.utc)

    for candidate in directory.glob("*.json"):
        try:
            record = json.loads(candidate.read_text(encoding="utf-8"))
        except Exception:
            continue

        if str(record.get("requested_by_user_id", "")) != str(user_id):
            continue
        if str(record.get("requested_in_chat_id", "")) != str(chat_id):
            continue
        if record.get("operation_type") != "ops_revenue_now":
            continue
        if record.get("status") not in {"pending", "confirmed", "consumed"}:
            continue

        expires_at = str(record.get("expires_at") or "")
        try:
            expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        except ValueError:
            continue
        if expiry <= now:
            continue

        candidates.append(record)

    if not candidates:
        return None

    candidates.sort(
        key=lambda record: str(record.get("created_at") or ""),
        reverse=True,
    )
    return candidates[0]


def _is_revenue_confirmation(text: str) -> bool:
    lowered = text.strip().lower()
    return any(
        re.search(pattern, lowered)
        for pattern in REVENUE_CONFIRMATION_PATTERNS
    )


def _telegram_actor(source: Any) -> Dict[str, Any]:
    return {
        "telegramUserId": str(getattr(source, "user_id", "") or ""),
        "chatId": str(getattr(source, "chat_id", "") or ""),
        "verified": True,
        "displayName": "Jonathan",
    }


def _source_message_id(event: Any) -> str:
    source = getattr(event, "source", None)
    return str(
        getattr(source, "message_id", None)
        or getattr(event, "message_id", None)
        or ""
    )


def _summary_from_handler(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "result": data.get("result") or data.get("status"),
        "draft_goal_id": data.get("draft_goal_id") or data.get("goal_id"),
        "work_order_id": data.get("work_order_id"),
        "action_packet_count": data.get("action_packet_count", 0),
        "files_created": bool(data.get("files_created")) or bool(data.get("draft_goal_id") or data.get("work_order_id")),
        "blocked_reason": data.get("blocked_reason") or data.get("reason"),
    }


def _reply_text(data: Dict[str, Any]) -> str:
    reply = data.get("reply")
    if isinstance(reply, str) and reply.strip():
        return reply.strip()
    summary = _summary_from_handler(data)
    if str(summary.get("result", "")).startswith("blocked") or summary.get("blocked_reason"):
        return (
            "Blocked safely: "
            f"{summary.get('blocked_reason') or 'request is outside advisory draft mode.'}\n\n"
            "No execution occurred. Approve a revised draft-only goal when ready."
        )
    return (
        "Draft goal/work order handled.\n"
        f"Draft goal ID: {summary.get('draft_goal_id') or 'not created'}\n"
        f"Validation result: {data.get('validation_result') or data.get('goal_validation_result') or summary.get('result') or 'unknown'}\n"
        f"Work order ID: {summary.get('work_order_id') or 'not created'}\n"
        f"Action packet count: {summary.get('action_packet_count') or 0}\n\n"
        "No execution occurred. Approve Codex handoff separately when ready."
    )


def _schedule_send(gateway: Any, event: Any, content: str) -> bool:
    source = getattr(event, "source", None)
    if source is None:
        return False
    adapter = getattr(gateway, "adapters", {}).get(source.platform)
    if adapter is None:
        return False
    reply_to = getattr(source, "message_id", None) or getattr(event, "message_id", None)
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(adapter.send(source.chat_id, content, reply_to=reply_to))
        return True
    except RuntimeError:
        # Defensive fallback for synthetic tests outside an async gateway loop.
        asyncio.run(adapter.send(source.chat_id, content, reply_to=reply_to))
        return True


def pre_gateway_dispatch(event: Any = None, gateway: Any = None, session_store: Any = None, **kwargs: Any) -> Optional[Dict[str, str]]:
    if event is None or gateway is None or getattr(event, "source", None) is None:
        return None
    source = event.source
    if _platform_value(source.platform) != "telegram":
        return None
    if not _allowed_user(getattr(source, "user_id", None)):
        return None

    text = (getattr(event, "text", "") or "").strip()

    pending = _latest_pending_for(
        str(getattr(source, "user_id", "") or ""),
        str(getattr(source, "chat_id", "") or ""),
    )

    if pending is not None and _is_revenue_confirmation(text):
        intent = "approved_revenue_confirmation"
    else:
        intent = _classify_intent(text)

    if intent is None:
        return None

    base_record: Dict[str, Any] = {
        "timestamp": _now(),
        "intent": intent,
        "message_preview": text,
        "message_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "telegram_user_authorized": True,
        "external_actions_taken": False,
        "production_systems_touched": False,
    }

    try:
        if intent == "approved_revenue_execution_request":
            message_id = _source_message_id(event)
            data = _run_phase0_bridge(
                "request",
                {
                    "actor": _telegram_actor(source),
                    "operationType": "ops_revenue_now",
                    "approvalScope": "ops_revenue_now",
                    "originalRequestMessageId": message_id,
                    "requestText": text,
                },
            )
            record = {
                **base_record,
                **{k: v for k, v in data.items() if k != "reply"},
                "external_actions_taken": False,
                "production_systems_touched": False,
                "phase0_mode": "dry",
            }
            sent = _schedule_send(
                gateway,
                event,
                str(data.get("reply", "Nothing has started.")),
            )
            record["telegram_reply_scheduled"] = sent
            _log(record)
            return {
                "action": "skip",
                "reason": "telegram_revenue_request_recorded",
            }

        if intent == "approved_revenue_confirmation":
            if pending is None:
                data = {
                    "ok": False,
                    "reason": "pending_operation_not_found",
                    "reply": (
                        "There is no active revenue operation awaiting "
                        "confirmation. Nothing started."
                    ),
                }
            else:
                data = _run_phase0_bridge(
                    "confirm",
                    {
                        "actor": _telegram_actor(source),
                        "operationType": "ops_revenue_now",
                        "approvalScope": "ops_revenue_now",
                        "originalRequestMessageId": str(
                            pending.get("original_request_message_id") or ""
                        ),
                        "confirmationMessageId": _source_message_id(event),
                        "sourceText": text,
                        "attachmentId": str(
                            pending.get("attachment_id") or ""
                        ),
                    },
                )

            record = {
                **base_record,
                **{k: v for k, v in data.items() if k != "reply"},
                "external_actions_taken": False,
                "production_systems_touched": False,
                "phase0_mode": "dry",
            }
            sent = _schedule_send(
                gateway,
                event,
                str(data.get("reply", "Nothing started.")),
            )
            record["telegram_reply_scheduled"] = sent
            _log(record)
            return {
                "action": "skip",
                "reason": "telegram_revenue_confirmation_handled",
            }
        if intent == "draft_social_revenue_plan":
            reply = _social_revenue_plan_reply()
            record = {
                **base_record,
                "handler_status": "draft_social_revenue_plan_created",
                "files_created": False,
                "external_actions_taken": False,
                "production_systems_touched": False,
                "draft_only": True,
            }
            sent = _schedule_send(gateway, event, reply)
            record["telegram_reply_scheduled"] = sent
            _log(record)
            return {
                "action": "skip",
                "reason": "telegram_social_revenue_plan_drafted",
            }
        data = _run_handler(text)
        summary = _summary_from_handler(data)
        record = {**base_record, **summary}
        record["handler_status"] = data.get("status") or data.get("result")
        sent = _schedule_send(gateway, event, _reply_text(data))
        record["telegram_reply_scheduled"] = sent
        _log(record)
        return {"action": "skip", "reason": "telegram_goal_draft_hook_handled"}
    except Exception as exc:  # keep Telegram safe on unexpected handler/plugin failure
        error_record = {
            **base_record,
            "handler_status": "plugin_error",
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "files_created": False,
        }
        report_path = _write_error_report(error_record)
        error_record["error_report_path"] = str(report_path)
        _log(error_record)
        _schedule_send(
            gateway,
            event,
            "I could not safely create that draft work order. No execution occurred. Please review the hook error report before retrying.",
        )
        return {"action": "skip", "reason": "telegram_goal_draft_hook_error"}


def register(ctx: Any) -> None:
    ctx.register_hook("pre_gateway_dispatch", pre_gateway_dispatch)
