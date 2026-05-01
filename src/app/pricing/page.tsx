import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — OttoServ",
  description:
    "OttoServ pricing: Founding Partner ($500 setup + $300/mo), Growth ($1,500 setup + $800–1,500/mo), Enterprise (custom). Every plan starts with a free discovery call.",
};

const tiers = [
  {
    name: "Founding Partner",
    price: "$500",
    priceLabel: "setup",
    monthly: "+ $300/mo",
    badge: "Limited Spots",
    badgeColor: "text-orange-400",
    description:
      "For early adopters willing to give feedback and participate in a case study. You get full platform access at a founder rate — in exchange for your honest input.",
    includes: [
      "Operations audit",
      "First automation build",
      "OttoServ OS access",
      "AI lead response (Morgan)",
      "Feedback sessions + case study",
    ],
    cta: "Apply for Founding Partner",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$1,500",
    priceLabel: "setup",
    monthly: "+ $800–1,500/mo",
    badge: "Most Popular",
    badgeColor: "text-blue-300",
    description:
      "Full operations buildout for businesses ready to grow without adding headcount. Includes custom automations, AI agents, dashboard, and ongoing optimization.",
    includes: [
      "Full operations buildout",
      "Custom automations",
      "AI agents (Morgan + more)",
      "OttoServ OS dashboard",
      "Ongoing optimization",
      "Weekly AI intelligence reports",
    ],
    cta: "Book a Discovery Call",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceLabel: "",
    monthly: "",
    badge: "",
    badgeColor: "",
    description:
      "For companies with 50+ employees. Multi-department systems, role-based access control, custom integrations, and a dedicated success manager.",
    includes: [
      "Multi-department deployment",
      "Role-based access control (RBAC)",
      "Custom integrations",
      "Dedicated success manager",
      "SLA-backed support",
      "Quarterly business reviews",
    ],
    cta: "Contact Us",
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
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-4">
            Every engagement starts with a free discovery call so we can scope the work accurately
            before committing to anything.
          </p>
          <p className="text-gray-500 text-sm">
            Questions? Call us at{" "}
            <a href="tel:+14077988172" className="text-blue-400 hover:text-blue-300 transition-colors">
              (407) 798-8172
            </a>
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
              {tier.badge && (
                <span className={`text-xs font-semibold uppercase tracking-widest mb-4 ${tier.badgeColor}`}>
                  {tier.badge}
                </span>
              )}
              <h2 className="text-white font-bold text-xl mb-1">{tier.name}</h2>
              <div className="mb-4">
                <span className="text-blue-400 font-bold text-3xl">{tier.price}</span>
                {tier.priceLabel && (
                  <span className="text-gray-400 text-sm ml-1">{tier.priceLabel}</span>
                )}
                {tier.monthly && (
                  <p className="text-gray-400 text-sm mt-1">{tier.monthly}</p>
                )}
              </div>
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

        {/* Note */}
        <div className="max-w-3xl mx-auto mt-12">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center">
            <h3 className="text-white font-semibold text-lg mb-3">A Note on Pricing</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              These ranges reflect typical engagements — scope, complexity, and number of systems
              involved all affect the final cost. We give you a clear, fixed quote after the
              discovery call. No surprises, no hourly billing creep.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Every Plan Starts with a Free Discovery Call
          </h2>
          <p className="text-gray-400 mb-8">
            No commitment required. We scope the work together and give you a clear proposal before
            anything is signed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Book a Free Discovery Call
            </Link>
            <a
              href="tel:+14077988172"
              className="text-blue-400 hover:text-blue-300 font-semibold text-lg transition-colors"
            >
              Call (407) 798-8172
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
