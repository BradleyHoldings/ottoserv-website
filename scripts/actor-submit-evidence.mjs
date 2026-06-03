// Actor-side evidence intake CLI. An actor (Cowork, Codex, Hermes, Morgan/Retell,
// email/n8n/CRM rail) calls this to submit evidence for an approved/delegated task
// and (optionally) request a lifecycle/work-order status move. It records evidence
// and status only — it NEVER executes the task, sends, calls, charges, or deploys.
//
// Input: a JSON submission, either inline via EVIDENCE_SUBMISSION_JSON or piped on
// stdin. Shape (see src/lib/actorEvidenceIntake.mjs submitActorEvidence):
//   {
//     "task_id": "apx-...",            // or "approval_item_id"
//     "actor": "Cowork",
//     "evidence_text": "Sent the approved follow-up; reply tracked.",
//     "evidence_type": "email_sent",
//     "evidence_reference": "message-id-abc123",
//     "advance_to": "completed",       // optional lifecycle status
//     "target": { "kind": "work_order", "id": "impl-...", "status": "delivered" }
//   }
//
// Env: REVENUE_LOOP_OUTPUT_DIR (state dir, default data/revenue-engine),
//      EVIDENCE_SUBMISSION_JSON (inline submission), EVIDENCE_NOW (ISO override),
//      EVIDENCE_PERSIST_SUPABASE=false to force-skip durable upsert.

import { submitActorEvidence } from "../src/lib/actorEvidenceIntake.mjs";

async function readStdin() {
  if (process.stdin.isTTY) return "";
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

const inline = process.env.EVIDENCE_SUBMISSION_JSON;
const raw = inline || (await readStdin());
if (!raw) {
  console.error("No submission provided. Set EVIDENCE_SUBMISSION_JSON or pipe JSON on stdin.");
  process.exit(2);
}

let submission;
try {
  submission = JSON.parse(raw);
} catch (err) {
  console.error(`Submission is not valid JSON: ${err.message}`);
  process.exit(2);
}

const result = await submitActorEvidence(submission, {
  now: process.env.EVIDENCE_NOW,
  dataDir: process.env.REVENUE_LOOP_OUTPUT_DIR,
  persistSupabase: process.env.EVIDENCE_PERSIST_SUPABASE === "false" ? false : undefined,
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
