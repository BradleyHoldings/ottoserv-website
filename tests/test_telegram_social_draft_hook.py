import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace


HOOK_PATH = (
    Path(__file__).resolve().parents[1]
    / "deploy"
    / "droplet"
    / "phase0"
    / "hermes-plugin"
    / "telegram-goal-draft-hook.py"
)


def load_hook():
    spec = importlib.util.spec_from_file_location("telegram_goal_draft_hook", HOOK_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeAdapter:
    def __init__(self):
        self.sent = []

    async def send(self, chat_id, content, reply_to=None):
        self.sent.append({"chat_id": chat_id, "content": content, "reply_to": reply_to})


class TelegramSocialDraftHookTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        os.environ["TELEGRAM_ALLOWED_USERS"] = "111"
        os.environ["HERMES_STATE_ROOT"] = str(self.root)
        os.environ["HERMES_TASKS_DIR"] = str(self.root / "tasks")
        os.environ["HERMES_APPROVALS_DIR"] = str(self.root / "approvals")
        os.environ["HERMES_PENDING_DIR"] = str(self.root / "pending")
        os.environ["HERMES_NOTIFY_STATE_DIR"] = str(self.root / "notify")
        os.environ["HERMES_ALLOWED_TELEGRAM_USER_IDS"] = "111"
        os.environ["HERMES_ALLOWED_CHAT_IDS"] = "999"
        os.environ["MODE"] = "dry"
        (self.root / "pending").mkdir(parents=True, exist_ok=True)
        self.hook = load_hook()
        self.hook.LOG_PATH = self.root / "goal_work_orders" / "telegram_goal_draft_hook_calls.jsonl"
        self.hook.ERROR_DIR = self.root / "goal_work_orders" / "goal_reviews" / "telegram_live_hook_errors"
        self.adapter = FakeAdapter()
        self.gateway = SimpleNamespace(adapters={"telegram": self.adapter})

    def tearDown(self):
        self.temp.cleanup()

    def event(self, text):
        source = SimpleNamespace(
            platform="telegram",
            user_id="111",
            chat_id="999",
            message_id="msg-1",
        )
        return SimpleNamespace(source=source, text=text, message_id="msg-1")

    def sent_text(self):
        self.assertEqual(len(self.adapter.sent), 1)
        return self.adapter.sent[0]["content"]

    def test_planning_prompt_with_dm_angle_does_not_trigger_approval_help(self):
        text = (
            "Prepare a 7-day OttoServ revenue content plan with DM angles, "
            "platform versions, and a Cowork handoff. Do not post live, do not DM "
            "anyone, do not send externally. Only prepare the draft plan."
        )

        self.assertEqual(self.hook._classify_intent(text), "draft_social_revenue_plan")
        result = self.hook.pre_gateway_dispatch(event=self.event(text), gateway=self.gateway)

        reply = self.sent_text()
        self.assertEqual(result["reason"], "telegram_social_revenue_plan_drafted")
        self.assertIn("7-Day OttoServ Revenue Content And Engagement Plan", reply)
        self.assertIn("Draft DM Angles", reply)
        self.assertNotIn("I approve reddit dm", reply)
        self.assertNotIn("Social DM requires your approval", reply)

    def test_do_not_post_live_produces_draft_only_plan(self):
        result = self.hook.pre_gateway_dispatch(
            event=self.event(
                "Generate a content calendar and create engagement plan. "
                "Do not post live. Only prepare draft."
            ),
            gateway=self.gateway,
        )

        reply = self.sent_text()
        self.assertEqual(result["action"], "skip")
        self.assertIn("Draft-only guardrail", reply)
        self.assertIn("No live posts, comments, replies, DMs, calls, Stripe actions, n8n actions, or client-facing actions are authorized.", reply)
        self.assertIn("Platform Variants", reply)
        self.assertIn("Approval Checklist", reply)

    def test_explicit_approval_command_still_routes_to_approval_handler(self):
        pending = {
            "requested_by_user_id": "111",
            "requested_in_chat_id": "999",
            "operation_type": "ops_revenue_now",
            "status": "pending",
            "created_at": "2026-06-14T12:00:00Z",
            "expires_at": "2099-01-01T00:00:00Z",
            "original_request_message_id": "req-1",
            "attachment_id": "att-1",
        }
        (self.root / "pending" / "req-1.json").write_text(json.dumps(pending), encoding="utf-8")
        calls = []

        def fake_bridge(action, payload):
            calls.append((action, payload))
            return {"ok": True, "reply": "confirmed without live execution"}

        self.hook._run_phase0_bridge = fake_bridge
        result = self.hook.pre_gateway_dispatch(
            event=self.event("I approve reddit dm to username after review"),
            gateway=self.gateway,
        )

        self.assertEqual(result["reason"], "telegram_revenue_confirmation_handled")
        self.assertEqual(calls[0][0], "confirm")
        self.assertEqual(self.sent_text(), "confirmed without live execution")

    def test_generated_plan_includes_cowork_handoff_structure(self):
        self.hook.pre_gateway_dispatch(
            event=self.event(
                "Draft Cowork handoff, prepare platform versions, and create engagement plan. "
                "Do not send anything externally."
            ),
            gateway=self.gateway,
        )

        reply = self.sent_text()
        self.assertIn("File-Based Cowork Handoff Structure", reply)
        self.assertIn("cowork_social_revenue_plan.md", reply)
        self.assertIn("cowork_social_targets.json", reply)
        self.assertIn("evidence_requirements.json", reply)
        self.assertIn("approval_checklist.md", reply)


if __name__ == "__main__":
    unittest.main()
