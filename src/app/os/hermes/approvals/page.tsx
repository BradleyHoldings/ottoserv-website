import ApprovalDecisionForm from "./ApprovalDecisionForm";
import {
  decisionStatusLabel,
  decisionTimestampLabel,
  getApprovalItemsWithDecisions,
  HERMES_APPROVAL_AUDIT_LOG,
  HERMES_APPROVAL_OUTBOX_DIR,
  intakeStatusLabel,
  lifecycleStatusLabel,
  routingStatusLabel,
} from "@/lib/hermesApprovalOutbox";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  pending: "border-amber-400/40 bg-amber-400/10 text-amber-100",
  approved: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
  rejected: "border-red-400/40 bg-red-500/10 text-red-100",
  revision_requested: "border-blue-400/40 bg-blue-500/10 text-blue-100",
};

export default async function HermesApprovalsPage() {
  const approvals = await getApprovalItemsWithDecisions();

  return (
    <ShellPage
      eyebrow="Approval Center"
      title="Approval queue, not direct execution"
      description="Jonathan's decisions write structured JSON into a safe Hermes-readable outbox. The dashboard does not execute tools, workflows, calls, emails, payments, deploys, shell commands, or external writes."
    >
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <p className="text-sm font-bold text-white">Safe write-back paths</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Info label="Decision outbox" value={HERMES_APPROVAL_OUTBOX_DIR} />
          <Info label="Audit log" value={HERMES_APPROVAL_AUDIT_LOG} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {approvals.map(({ item, decision, intakeResult, executionLifecycle, routingRecord, status }) => (
          <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="font-mono text-xs text-gray-500">{item.id}</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase text-amber-100">
                  {item.riskLevel}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${statusStyles[status]}`}>
                  {decisionStatusLabel(status)}
                </span>
              </div>
            </div>

            <h2 className="mt-4 text-xl font-black text-white">{item.requestedAction}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">{item.reason}</p>

            <div className="mt-4 grid gap-3">
              <Info label="What approval unlocks" value={item.unlocks} />
              <Info label="Approval type" value={item.approvalType.replace(/_/g, " ")} />
              <Info label="Trace source" value={item.source.replace(/_/g, " ")} />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Decision state</p>
              <p className="mt-2 text-sm font-semibold text-white">{decision ? `Decision written: ${decision.decision.replace(/_/g, " ")}` : "Pending Jonathan decision"}</p>
              <p className="mt-1 text-xs text-gray-400">{decisionTimestampLabel(decision)}</p>
              {decision ? <p className="mt-2 break-all font-mono text-xs text-gray-500">{decision.decision_id}</p> : null}
            </div>

            <div className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Hermes intake</p>
              <p className="mt-2 text-sm font-semibold text-white">{intakeStatusLabel(intakeResult)}</p>
              {intakeResult ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-blue-50/80">{intakeResult.allowed_next_action}</p>
                  <p className="mt-2 break-all font-mono text-xs text-blue-100/70">{intakeResult.intake_id}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-blue-50/70">Hermes has not consumed this dashboard decision yet.</p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Execution and evidence lifecycle</p>
              <p className="mt-2 text-sm font-semibold text-white">{lifecycleStatusLabel(executionLifecycle)}</p>
              {executionLifecycle ? (
                <div className="mt-3 grid gap-3">
                  <Info label="Assigned rail / agent" value={`${executionLifecycle.execution_rail.replace(/_/g, " ")} / ${executionLifecycle.assigned_agent}`} />
                  <Info label="Assigned task ID" value={executionLifecycle.assigned_task_id} />
                  <Info label="Required evidence" value={executionLifecycle.required_evidence.length ? executionLifecycle.required_evidence.join("; ") : "No evidence required"} />
                  <Info
                    label="Submitted evidence"
                    value={
                      executionLifecycle.submitted_evidence.length
                        ? executionLifecycle.submitted_evidence.map((item) => `${item.evidence_id}: ${item.evidence_summary}`).join("; ")
                        : evidenceEmptyState(executionLifecycle.evidence_status)
                    }
                  />
                  <Info label="Hermes review result" value={executionLifecycle.hermes_review_result.replace(/_/g, " ")} />
                  {executionLifecycle.blocker_reason ? <Info label="Blocker" value={executionLifecycle.blocker_reason} /> : null}
                  <Info label="Next action" value={executionLifecycle.next_action || "No next action exported yet."} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-emerald-50/70">Hermes has not exported execution status for this item yet.</p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Controlled routing</p>
              <p className="mt-2 text-sm font-semibold text-white">{routingStatusLabel(routingRecord)}</p>
              {routingRecord ? (
                <div className="mt-3 grid gap-3">
                  <Info label="Routed task ID" value={routingRecord.task_id} />
                  <Info label="Assigned rail / agent" value={`${routingRecord.execution_rail.replace(/_/g, " ")} / ${routingRecord.assigned_agent}`} />
                  <Info label="Mission title" value={routingRecord.mission_title} />
                  <Info label="Allowed scope" value={routingRecord.allowed_scope} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-cyan-50/70">Hermes has not created a controlled handoff for this approval yet.</p>
              )}
            </div>

            <div className="mt-5 grid gap-3">
              <ApprovalDecisionForm approvalItemId={item.id} decision="approved" label="Approve" tone="approve" existingDecision={decision} />
              <ApprovalDecisionForm approvalItemId={item.id} decision="rejected" label="Reject" tone="reject" existingDecision={decision} />
              <ApprovalDecisionForm approvalItemId={item.id} decision="revision_requested" label="Request revision" tone="revision" existingDecision={decision} />
            </div>
          </article>
        ))}
      </div>
    </ShellPage>
  );
}

function evidenceEmptyState(status: string) {
  if (status === "not_required") return "No evidence required";
  if (status === "missing") return "Evidence required but missing";
  if (status === "submitted") return "Evidence submitted and awaiting Hermes review";
  if (status === "accepted") return "Evidence accepted";
  if (status === "rejected") return "Evidence rejected or needs revision";
  return "Evidence required";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-gray-100">{value}</p>
    </div>
  );
}

function ShellPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">{description}</p>
      </div>
      {children}
    </div>
  );
}
