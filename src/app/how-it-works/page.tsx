import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How It Works — OttoServ",
  description: "Learn how OttoServ's three-step process maps your operations, identifies gaps, and builds the systems that fix real problems.",
};

export default function HowItWorksPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">How It Works</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            We follow a proven three-step process to understand your business, diagnose what is broken, and build systems that actually solve the problem.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {[
            {
              number: "1",
              title: "Map Your Operations",
              subtitle: "Understand how your business actually works",
              body: "We start by documenting every process, workflow, and tool in your business. This means talking to the people doing the work, not just the people managing it. We map every handoff, every tool, every manual step — and build a complete picture of your current state. Most businesses are surprised by what they find at this stage. The goal is clarity: you can not fix what you can not see.",
              items: [
                "Stakeholder interviews across all relevant team members",
                "Process documentation for every key workflow",
                "Tool and system audit",
                "Data flow mapping",
              ],
            },
            {
              number: "2",
              title: "Identify the Gaps",
              subtitle: "Find what is actually causing the pain",
              body: "Once we have a clear picture of your operations, we analyze it systematically. We look for bottlenecks — places where work slows down or stops. We look for error-prone manual steps that should be automated. We look for broken handoffs where things fall through the cracks. Then we prioritize: not everything needs to be fixed at once, and the right order of operations matters. You will get a prioritized roadmap that tells you exactly what to tackle first and why.",
              items: [
                "Bottleneck and constraint analysis",
                "Manual step identification",
                "Error and rework source mapping",
                "Prioritized improvement roadmap",
              ],
            },
            {
              number: "3",
              title: "Build & Implement",
              subtitle: "Build the systems that fix the real problems",
              body: "We build the automations, integrations, and processes that address the specific problems we identified — not generic solutions, but systems designed for how your business actually works. We handle implementation, testing, and training. We do not hand you documentation and disappear; we make sure the systems are working, your team knows how to use them, and you have what you need to maintain them going forward.",
              items: [
                "Custom automation and integration builds",
                "Testing and quality assurance",
                "Team training and handoff",
                "Documentation and maintenance guidance",
              ],
            },
          ].map((step) => (
            <div
              key={step.number}
              className="bg-[#111827] border border-gray-800 rounded-xl p-8 md:p-10"
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-bold text-2xl mb-1">{step.title}</h2>
                  <p className="text-blue-400 text-sm font-medium mb-4">{step.subtitle}</p>
                  <p className="text-gray-400 leading-relaxed mb-6">{step.body}</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {step.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-blue-400 mt-0.5">&#10003;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Start With a Free Discovery Call</h2>
          <p className="text-gray-400 mb-8">
            The first step is a free conversation about your business. We will learn what is going on and tell you honestly whether we can help.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
          >
            Book a Free Discovery Call
          </Link>
        </div>
      </section>
    </div>
  );
}
