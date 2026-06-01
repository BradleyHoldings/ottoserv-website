import { hermesServiceDeliveryItems } from "@/lib/hermesCommandCenter";

export default function HermesServiceDeliveryPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Service Delivery Spine</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">From audit signal to implementation packet</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          This shell tracks Leak Check results, audit findings, revenue leaks, workflow matches, missing workflows, Codex packets, deliverables, and next actions.
        </p>
      </div>
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
