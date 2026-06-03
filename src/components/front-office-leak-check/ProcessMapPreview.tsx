import type { ProcessMapStep } from "@/lib/frontOfficeLeakCheck/reportContract";

export function ProcessMapPreview({ steps, mermaid }: { steps: ProcessMapStep[]; mermaid: string }) {
  return (
    <section className="rounded-xl border border-gray-800 bg-[#0d0d0d] p-5">
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-blue-300">
            Process map preview
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            Dependency-free internal visualization. Mermaid source is shown for later review, not rendered or exported.
          </p>
        </div>
        <span className="text-xs uppercase tracking-widest text-gray-500">Read-only</span>
      </div>

      <div className="grid gap-3">
        {steps.map((step, index) => (
          <div key={`${step.label}-${index}`} className="grid gap-3 rounded-lg border border-gray-800 bg-[#111827] p-4 md:grid-cols-[160px_1fr_1fr]">
            <div>
              <div className="text-xs uppercase tracking-widest text-gray-500">Step {index + 1}</div>
              <div className="mt-1 text-sm font-semibold text-white">{step.label}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-gray-500">Current state</div>
              <p className="mt-1 text-sm text-gray-300">{step.currentState}</p>
              <p className="mt-2 text-xs text-yellow-300">Risk: {step.risk}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-gray-500">Premium state</div>
              <p className="mt-1 text-sm text-gray-200">{step.premiumState}</p>
            </div>
          </div>
        ))}
      </div>

      <details className="mt-4 rounded-lg border border-gray-800 bg-black/30 p-4">
        <summary className="cursor-pointer text-sm text-gray-400">Mermaid source prototype</summary>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-gray-300">{mermaid}</pre>
      </details>
    </section>
  );
}
