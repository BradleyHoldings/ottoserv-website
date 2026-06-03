"use client";

import { useActionState } from "react";
import { submitApprovalDecision } from "./actions";
import type { HermesApprovalDecisionRecord, HermesApprovalDecisionValue } from "@/lib/hermesApprovalOutbox";

const initialState = {
  status: "idle",
  message: "",
};

interface ApprovalDecisionFormProps {
  approvalItemId: string;
  decision: HermesApprovalDecisionValue;
  label: string;
  tone: "approve" | "reject" | "revision";
  existingDecision: HermesApprovalDecisionRecord | null;
}

export default function ApprovalDecisionForm({
  approvalItemId,
  decision,
  label,
  tone,
  existingDecision,
}: ApprovalDecisionFormProps) {
  const [state, formAction, pending] = useActionState(submitApprovalDecision, initialState);
  const buttonClass =
    tone === "approve"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : tone === "reject"
        ? "border-red-400/30 bg-red-500/10 text-red-100"
        : "border-white/10 bg-white/[0.04] text-gray-200";

  return (
    <form action={formAction} className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <input type="hidden" name="approval_item_id" value={approvalItemId} />
      <input type="hidden" name="decision" value={decision} />
      {existingDecision ? <input type="hidden" name="supersede_decision_id" value={existingDecision.decision_id} /> : null}

      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
        {decision === "revision_requested" ? "Requested revision" : "Reason or note"}
      </label>
      <textarea
        name={decision === "revision_requested" ? "requested_revision" : "reason_or_note"}
        required={decision === "revision_requested"}
        rows={2}
        maxLength={1200}
        placeholder={decision === "revision_requested" ? "Plain-text revision request for Hermes..." : "Optional plain-text note..."}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-gray-600"
      />
      {decision === "revision_requested" ? (
        <input type="hidden" name="reason_or_note" value="Revision requested from OttoServ OS dashboard." />
      ) : null}

      {existingDecision ? (
        <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-amber-100">
          <input className="mt-1" type="checkbox" name="supersede_prior" value="yes" />
          Explicitly supersede prior decision {existingDecision.decision_id}
        </label>
      ) : null}

      <button disabled={pending} className={`mt-3 rounded-xl border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`} type="submit">
        {pending ? "Writing..." : label}
      </button>

      {state.message ? (
        <p className={`mt-3 text-xs font-semibold ${state.status === "decision_written" ? "text-emerald-200" : "text-red-200"}`}>
          {state.status === "decision_written" ? "Decision written: " : "Write failed: "}
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
