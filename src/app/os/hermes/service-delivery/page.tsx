import { hermesServiceDeliveryItems } from "@/lib/hermesCommandCenter";
import { readImplementationWorkOrders } from "@/lib/revenueEngineReadAdapter.mjs";
import type { ImplementationWorkOrdersState } from "@/lib/revenueEngineReadAdapter";

export const dynamic = "force-dynamic";

export default async function HermesServiceDeliveryPage() {
  const implementation = (await readImplementationWorkOrders()) as ImplementationWorkOrdersState;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Service Delivery Spine</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">From audit signal to implementation packet</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          This shell tracks Leak Check results, audit findings, revenue leaks, workflow matches, missing workflows, Codex packets, deliverables, and next actions.
        </p>
      </div>

      <ImplementationWorkOrders state={implementation} />
      {hermesServiceDeliveryItems.map((item) => (
        <article key={item.prospect} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-2xl font-black text-white">{item.prospect}</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Info label="Front Office Leak Check result" value={item.leakCheckResult} />
            <Info label="Process Audit result" value={item.processAuditResult} />
            <Info label="Existing n8n workflow match" value={item.workflowMatch} />
            <Info label="Next recommended action" value={item.nextAction} />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <List label="Detected revenue leaks" items={item.revenueLeaks} />
            <List label="Operational gaps" items={item.operationalGaps} />
            <List label="Automation opportunities" items={item.automationOpportunities} />
            <List label="Recommended workflows" items={item.recommendedWorkflows} />
            <List label="Missing workflow requests" items={item.missingWorkflowRequests} />
            <List label="Codex implementation packets" items={item.implementationPackets} />
            <List label="Client deliverables" items={item.deliverables} />
          </div>
        </article>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-gray-100">{value}</p>
    </div>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-gray-200">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ImplementationWorkOrders({ state }: { state: ImplementationWorkOrdersState }) {
  return (
    <section className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.06] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-200">Implementation work orders (live)</p>
          <p className="mt-1 text-xs text-gray-500">
            Read-only from data/revenue-engine/implementation-work-orders.json · contact info redacted · high-risk steps approval-gated
          </p>
        </div>
        {state.available ? (
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-emerald-100">
            {state.summary.total} order{state.summary.total === 1 ? "" : "s"} · {state.summary.needs_approval} need approval
          </span>
        ) : (
          <span className="rounded-full bg-gray-500/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-gray-300">
            none yet
          </span>
        )}
      </div>

      {!state.available || state.workOrders.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-gray-400">
          No implementation work orders yet. They are created automatically when a Front Office Leak Check / ProcessScan
          report is ready and the daily revenue loop runs.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {state.workOrders.map((wo) => (
            <article key={wo.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-black text-white">{wo.title}</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-gray-200">
                    {wo.id}
                  </span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-100">
                    {wo.status}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-gray-200">
                    risk: {wo.risk_level}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <Info label="Client" value={wo.client} />
                <Info label="Stage" value={wo.implementation_stage} />
                <Info label="Recommended actor" value={wo.recommended_actor} />
                <Info label="Next action" value={wo.next_action} />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <List label="Automation opportunities" items={wo.automation_opportunities} />
                <List label="Success criteria" items={wo.success_criteria} />
                <List label="Required evidence" items={wo.required_evidence} />
                <List
                  label="Approval-gated actions"
                  items={wo.gated_actions.map((gate) => gate.action)}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
