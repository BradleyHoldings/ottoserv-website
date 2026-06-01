import { readApprovalExecutionLifecycle } from "@/lib/hermesApprovalOutbox";

export const dynamic = "force-dynamic";

export default async function HermesEvidencePage() {
  const lifecycle = await readApprovalExecutionLifecycle();
  const evidenceItems = lifecycle.flatMap((item) => item.submitted_evidence.map((evidence) => ({ lifecycle: item, evidence })));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Evidence Review</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Completion requires proof</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          Shows safe approval-linked evidence summaries exported by Hermes. Raw transcripts, credentials, provider keys, prompts, and private tool output stay out of OttoServ OS.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Metric label="Lifecycle records" value={String(lifecycle.length)} />
        <Metric label="Evidence submitted" value={String(evidenceItems.length)} />
        <Metric label="Waiting or missing" value={String(lifecycle.filter((item) => item.evidence_status === "required" || item.evidence_status === "missing").length)} />
      </div>

      {lifecycle.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <p className="text-lg font-black text-white">No execution lifecycle export found</p>
          <div className="mt-3 space-y-2 text-sm leading-6 text-gray-400">
            <p>Hermes has not consumed any approval decisions yet, or the safe lifecycle export is not reachable from OttoServ OS.</p>
            <p>No evidence has been submitted yet.</p>
            <p>Once Hermes consumes an approval decision, this page will show whether execution was queued, blocked, completed, or waiting for evidence.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {lifecycle.map((item) => (
          <article key={item.intake_id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-xs text-gray-500">{item.approval_item_id}</p>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold uppercase text-gray-300">
                {item.evidence_status.replace(/_/g, " ")}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-black text-white">{item.execution_status.replace(/_/g, " ")}</h2>
            <p className="mt-2 text-sm text-blue-200">{item.execution_rail.replace(/_/g, " ")} / {item.assigned_agent}</p>
            <div className="mt-4 grid gap-3">
              <Info label="Intake ID" value={item.intake_id} />
              <Info label="Task ID" value={item.assigned_task_id} />
              <Info label="Required evidence" value={item.required_evidence.length ? item.required_evidence.join("; ") : "No evidence required"} />
              <Info label="Hermes review result" value={item.hermes_review_result.replace(/_/g, " ")} />
              {item.blocker_reason ? <Info label="Blocker" value={item.blocker_reason} /> : null}
            </div>
            {item.submitted_evidence.length ? (
              <div className="mt-4 space-y-3">
                {item.submitted_evidence.map((evidence) => (
                  <div key={evidence.evidence_id} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <p className="font-mono text-xs text-emerald-100/70">{evidence.evidence_id}</p>
                    <p className="mt-2 text-sm font-bold text-white">{evidence.evidence_type.replace(/_/g, " ")}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-300">{evidence.evidence_summary}</p>
                    <p className="mt-2 break-all font-mono text-xs text-gray-500">{evidence.evidence_reference}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-500">{evidence.review_status.replace(/_/g, " ")} / {evidence.redaction_status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-white/15 bg-black/25 p-4 text-sm text-gray-400">{emptyStateForEvidence(item.evidence_status)}</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-gray-100">{value}</p>
    </div>
  );
}

function emptyStateForEvidence(status: string) {
  if (status === "not_required") return "No evidence required for this approval lifecycle.";
  if (status === "missing") return "Evidence is required but has not been submitted yet.";
  if (status === "required") return "Evidence is required and awaiting agent submission.";
  if (status === "submitted") return "Evidence has been submitted and is awaiting Hermes review.";
  if (status === "accepted") return "Evidence was accepted, but no submitted evidence records were included in this export.";
  if (status === "rejected") return "Evidence was rejected or needs revision.";
  return "No safe evidence record has been exported for this lifecycle yet.";
}
