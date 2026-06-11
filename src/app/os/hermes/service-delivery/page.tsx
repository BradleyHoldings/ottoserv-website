import { hermesServiceDeliveryItems } from "@/lib/hermesCommandCenter";
import { readImplementationWorkOrders, readServiceDeliveryExecution } from "@/lib/revenueEngineReadAdapter.mjs";
import { getServiceCatalog } from "@/lib/serviceDeliverySpine.mjs";
import type { ImplementationWorkOrdersState } from "@/lib/revenueEngineReadAdapter";

export const dynamic = "force-dynamic";

export default async function HermesServiceDeliveryPage() {
  const [implementation, execution] = await Promise.all([
    readImplementationWorkOrders(),
    readServiceDeliveryExecution(),
  ]) as [ImplementationWorkOrdersState, ServiceDeliveryExecutionState];
  const serviceCatalog = getServiceCatalog();
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
      <PersistedExecution state={execution} />
      <ServiceCatalog services={serviceCatalog} />
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

type ServiceDeliveryExecutionState = {
  available: boolean;
  summary: {
    records_seen?: number;
    opportunities?: { total?: number; persisted?: number };
    work_orders?: { total?: number; persisted?: number };
    approvals?: { pending?: number };
    execution_packets?: { queue_ready?: number };
    delivery_packages?: { recoverable?: number };
  };
  approval_cards: Array<{ id: string; requestedAction: string; riskLevel: string; payload?: { client?: string; service?: string } }>;
  execution_packets: Array<{ task_id: string; assigned_agent: string; execution_rail: string; service_key: string; client: string }>;
  voice_service_status?: {
    summary?: { total?: number; approval_needed?: number; launch_ready?: number; active?: number };
    items?: Array<{ packet_id: string; client: string; service_key: string; voice_service_setup_status: string; launch_readiness: string }>;
    packets?: Array<{ packet_id: string; client: string; service_key: string; approval_needed: boolean }>;
  };
  first_client_voice_activation?: {
    summary?: { total?: number; production_launch_ready?: number; blocked?: number; needs_approval?: number };
    items?: Array<{
      client: string;
      selected_voice_service: string;
      current_readiness_status: string;
      test_call_status: string;
      rollback_readiness: string;
      monitoring_readiness: string;
      next_operator_action: string;
    }>;
  };
};

function PersistedExecution({ state }: { state: ServiceDeliveryExecutionState }) {
  const summary = state.summary || {};
  const voiceSummary = state.voice_service_status?.summary || {};
  const voiceItems = state.voice_service_status?.items || [];
  const activationSummary = state.first_client_voice_activation?.summary || {};
  const activationItems = state.first_client_voice_activation?.items || [];
  return (
    <section className="rounded-3xl border border-blue-400/20 bg-blue-500/[0.06] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-200">Persisted execution</p>
          <p className="mt-1 text-xs text-gray-500">
            Canonical-shaped Phase 6B records: opportunities, tickets, ticket events, approval cards, execution packets, and recoverable delivery packages.
          </p>
        </div>
        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-blue-100">
          {state.available ? "available" : "not generated"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Info label="Records" value={String(summary.records_seen || 0)} />
        <Info label="Opportunities" value={`${summary.opportunities?.persisted || 0}/${summary.opportunities?.total || 0}`} />
        <Info label="Work orders" value={`${summary.work_orders?.persisted || 0}/${summary.work_orders?.total || 0}`} />
        <Info label="Approvals" value={String(summary.approvals?.pending || 0)} />
        <Info label="Queue ready" value={String(summary.execution_packets?.queue_ready || 0)} />
        <Info label="Packages" value={String(summary.delivery_packages?.recoverable || 0)} />
        <Info label="Voice packets" value={`${voiceSummary.total || 0} / ${voiceSummary.approval_needed || 0} approval`} />
        <Info label="First activation" value={`${activationSummary.production_launch_ready || 0} ready / ${activationSummary.blocked || 0} blocked`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <List label="Approval-needed cards" items={state.approval_cards.slice(0, 6).map((card) => `${card.payload?.client || "Client"} / ${card.riskLevel}: ${card.requestedAction}`)} />
        <List label="Queue-ready packets" items={state.execution_packets.slice(0, 6).map((packet) => `${packet.assigned_agent} / ${packet.execution_rail}: ${packet.client} ${packet.service_key}`)} />
        <List label="Retell voice setup packets" items={voiceItems.slice(0, 6).map((item) => `${item.client || "Client"} / ${item.service_key}: ${item.voice_service_setup_status} / ${item.launch_readiness}`)} />
        <List label="First client voice activation" items={activationItems.slice(0, 6).map((item) => `${item.client || "Client"} / ${item.selected_voice_service}: ${item.current_readiness_status}; test ${item.test_call_status}; rollback ${item.rollback_readiness}; monitoring ${item.monitoring_readiness}; next ${item.next_operator_action}`)} />
      </div>
    </section>
  );
}

function ServiceCatalog({
  services,
}: {
  services: Array<{
    service_key: string;
    name: string;
    problem_solved: string;
    required_intake_fields: string[];
    automation_opportunity_types: string[];
    required_integrations: string[];
    monitoring_metrics: string[];
    upsell_paths: string[];
  }>;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200">Service catalog</p>
          <p className="mt-1 text-xs text-gray-500">
            Reusable Phase 6A schemas for intake, opportunities, work orders, routing, testing, launch, monitoring, and upsell paths.
          </p>
        </div>
        <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-cyan-100">
          {services.length} registered
        </span>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {services.map((service) => (
          <article key={service.service_key} className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black text-white">{service.name}</h2>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-gray-300">
                {service.service_key}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-300">{service.problem_solved}</p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <List label="Intake fields" items={service.required_intake_fields} />
              <List label="Opportunity types" items={service.automation_opportunity_types} />
              <List label="Integrations" items={service.required_integrations} />
              <List label="Metrics" items={service.monitoring_metrics} />
              <List label="Upsell paths" items={service.upsell_paths} />
            </div>
          </article>
        ))}
      </div>
    </section>
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
