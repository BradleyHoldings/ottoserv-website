import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Workflow Mapping — OttoServ",
  description: "We document and analyze your current processes to find what is slowing you down. Get a prioritized improvement roadmap.",
};

export default function WorkflowMappingPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/services" className="text-blue-400 hover:text-blue-300 text-sm mb-6 inline-block transition-colors">
            ← Back to Services
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Workflow Mapping</h1>
          <p className="text-gray-400 text-xl leading-relaxed">
            We document and analyze your current processes to find exactly what is slowing you down — and build you a clear roadmap to fix it.
          </p>
        </div>
      </section>

      {/* What It Is */}
      <section className="pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-4">What It Is</h2>
            <p className="text-gray-400 leading-relaxed text-lg">
              Workflow Mapping is a structured analysis of how your business actually operates — not how you think it does. We interview your team, document every process and handoff, map your tools and data flows, and identify the gaps, bottlenecks, and inefficiencies that are costing you time and money. The result is a clear, actionable picture of your operations and a prioritized plan for improvement.
            </p>
          </div>

          {/* What You Get */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-6">What You Get</h2>
            <ul className="space-y-4">
              {[
                {
                  title: "Process Documentation",
                  desc: "A complete map of your current workflows — every step, every tool, every handoff.",
                },
                {
                  title: "Bottleneck Analysis",
                  desc: "A clear breakdown of where things slow down, break down, or fall through the cracks.",
                },
                {
                  title: "Prioritized Improvement Roadmap",
                  desc: "A ranked list of improvements sorted by impact and effort — so you know exactly what to tackle first.",
                },
                {
                  title: "Stakeholder Interviews",
                  desc: "We talk to the people actually doing the work to understand real pain points, not just what shows up on paper.",
                },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="text-blue-400 text-lg mt-0.5">&#10003;</span>
                  <div>
                    <p className="text-white font-medium">{item.title}</p>
                    <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Good Fit */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-6">Is This a Good Fit For You?</h2>
            <p className="text-gray-400 mb-4">Workflow Mapping is a great starting point if:</p>
            <ul className="space-y-3">
              {[
                "Your team is growing and processes that used to work are starting to break down",
                "You are a founder still doing too much manually and need to delegate systematically",
                "You have scaled past your original systems but aren't sure where to start fixing things",
                "You want to automate but need to understand your current state first",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-gray-300 text-sm">
                  <span className="text-blue-400 mt-0.5">&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Start With a Free Discovery Call</h2>
          <p className="text-gray-400 mb-8">
            We will learn about your business and determine whether Workflow Mapping is the right first step.
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
