import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — OttoServ",
  description: "OttoServ pricing: Operations Audit, System Build, and Ongoing Operations Partner. Every engagement starts with a free discovery call.",
};

const tiers = [
  {
    name: "Operations Audit",
    price: "$500 – $1,500",
    description: "The right starting point for most engagements. We map your operations, find the bottlenecks, and give you a prioritized plan.",
    includes: [
      "Workflow mapping and documentation",
      "Gap and bottleneck analysis",
      "Prioritized recommendations",
      "Documented process map",
    ],
    cta: "Start with a Discovery Call",
    highlighted: false,
  },
  {
    name: "System Build",
    price: "$1,500 – $5,000",
    description: "We build the actual systems — automations, integrations, and process infrastructure — that fix the problems we identified.",
    includes: [
      "Custom automations and integrations",
      "Process implementation",
      "Testing and quality assurance",
      "Team training and handoff",
    ],
    cta: "Start with a Discovery Call",
    highlighted: true,
  },
  {
    name: "Ongoing Operations Partner",
    price: "$500 – $2,000/mo",
    description: "For businesses that want continuous improvement. We stay engaged, optimize over time, and handle operational issues as they arise.",
    includes: [
      "Continuous optimization",
      "System monitoring and maintenance",
      "Monthly reviews and reporting",
      "Priority support",
    ],
    cta: "Start with a Discovery Call",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Pricing</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Every engagement starts with a free discovery call so we can scope the work accurately before committing to anything.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl p-8 flex flex-col ${
                tier.highlighted
                  ? "bg-[#1e3a5f] border-2 border-blue-500"
                  : "bg-[#111827] border border-gray-800"
              }`}
            >
              {tier.highlighted && (
                <span className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-4">
                  Most Popular
                </span>
              )}
              <h2 className="text-white font-bold text-xl mb-2">{tier.name}</h2>
              <p className="text-blue-400 font-bold text-2xl mb-4">{tier.price}</p>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">{tier.description}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {tier.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-blue-400 mt-0.5">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className={`block text-center font-medium px-5 py-3 rounded-md text-sm transition-colors ${
                  tier.highlighted
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-[#1f2937] hover:bg-[#374151] text-white border border-gray-700"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-12">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center">
            <h3 className="text-white font-semibold text-lg mb-3">A Note on Pricing</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              These ranges reflect typical engagements, but every business is different. Scope, complexity, and the number of systems involved all affect the final cost. We will give you a clear, fixed quote after the discovery call — no surprises, no hourly billing creep.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Book a Free Discovery Call</h2>
          <p className="text-gray-400 mb-8">
            No commitment required. We will scope the work together and give you a clear proposal.
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
