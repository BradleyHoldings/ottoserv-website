import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — OttoServ Front Desk AI",
  description:
    "OttoServ pricing: 30-Day Pilot $299, Starter $249/mo, Core $499/mo, Growth $997/mo, and Custom Operations from $2,500/mo. Start with the pilot, prove the value, expand from there.",
  alternates: { canonical: "https://ottoserv.com/pricing" },
};

const tiers = [
  {
    name: "30-Day Pilot",
    price: "$299",
    sub: "one-time, first 30 days",
    badge: "Start Here",
    badgeColor: "text-orange-400",
    desc: "The fastest way to test OttoServ Front Desk AI. We set it up, you see the leads, you decide what's next.",
    includes: [
      "Setup and configuration in your voice",
      "100 AI call minutes",
      "Missed-call and after-hours answering",
      "Lead capture (name, phone, service need, urgency, notes)",
      "Basic qualification flow built for your service",
      "Call summaries sent to your team",
      "Basic weekly performance summary",
    ],
    cta: "Start the 30-Day Pilot",
    href: "/contact?plan=pilot",
    highlighted: true,
  },
  {
    name: "Starter",
    price: "$249",
    sub: "per month",
    badge: "",
    badgeColor: "",
    desc: "Entry monthly plan for businesses with modest call volume. Pilot graduates often start here.",
    includes: [
      "100 AI minutes included each month",
      "Missed-call and after-hours answering",
      "Lead capture and basic qualification",
      "Call summaries to your team",
      "Overage: $0.25 / minute",
    ],
    cta: "Choose Starter",
    href: "/contact?plan=starter",
    highlighted: false,
  },
  {
    name: "Core",
    price: "$499",
    sub: "per month",
    badge: "Most Popular",
    badgeColor: "text-blue-300",
    desc: "For businesses taking real call volume and wanting follow-up that doesn't drop the ball.",
    includes: [
      "300 AI minutes included each month",
      "Everything in Starter",
      "Qualification flow customized to your service",
      "SMS / email follow-up sequences",
      "Overage: $0.25 / minute",
    ],
    cta: "Choose Core",
    href: "/contact?plan=core",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$997",
    sub: "per month",
    badge: "",
    badgeColor: "",
    desc: "For higher call volume and businesses that want reporting, CRM updates, and workflow support layered in.",
    includes: [
      "750 AI minutes included each month",
      "Advanced follow-up sequences",
      "Reporting and CRM updates",
      "Workflow support",
      "Overage: $0.25 – $0.35 / minute depending on complexity",
    ],
    cta: "Choose Growth",
    href: "/contact?plan=growth",
    highlighted: false,
  },
];

const expanded = {
  name: "Expanded OttoServ Operations Package",
  price: "From $2,500 – $3,500+",
  sub: "per month, scoped to your operation",
  desc: "Broader process automation beyond Front Desk AI. The next step once your lead-handling is solid and you want to fix operations more deeply.",
  includes: [
    "Broader process automation",
    "SOPs and standard work",
    "Operations dashboards",
    "Customer communication workflows",
    "CRM cleanup",
    "Reporting and operational optimization",
  ],
};

const faqs = [
  {
    q: "Why a paid pilot instead of a free trial?",
    a: "Paid pilots set the bar correctly. We do real setup, real configuration, real lead capture. You see real leads in 30 days — not a sales demo. Free trials get half-built, half-tested, and produce thin results.",
  },
  {
    q: "What happens after the 30-day pilot?",
    a: "You move to Starter ($249), Core ($499), or Growth ($997) — whichever fits the call volume you actually take. There's no auto-conversion: we look at your pilot results together and pick.",
  },
  {
    q: "Are minutes hard-capped?",
    a: "No, you keep getting answered. Calls that go over your monthly allowance are billed at the overage rate listed on your plan. We send alerts as you approach your allowance.",
  },
  {
    q: "What's NOT included in the pilot?",
    a: "Complex integrations, custom dashboards, deep workflow automation, multi-location support, advanced CRM cleanup, and custom outbound campaigns. Those live in higher plans and the Expanded Operations Package.",
  },
  {
    q: "Can we skip the pilot and go straight to monthly?",
    a: "Yes. Some businesses already know they want Core or Growth from day one. The pilot is the lowest-friction entry point, but it's not required.",
  },
];

export default function PricingPage() {
  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }}>
      {/* Header */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            OttoServ Pricing
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Start with the pilot. Expand when it's working.
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            The $299 30-day pilot is the front door. Monthly plans take over once you can
            see the leads. The Expanded Operations Package is for clients ready to go
            deeper than front-desk.
          </p>
        </div>
      </section>

      {/* 4 tiers */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl p-6 flex flex-col ${
                  tier.highlighted
                    ? "bg-[#1e3a5f] border-2 border-blue-500"
                    : "bg-[#111827] border border-gray-800"
                }`}
              >
                {tier.badge && (
                  <span className={`text-xs font-semibold uppercase tracking-widest mb-3 ${tier.badgeColor}`}>
                    {tier.badge}
                  </span>
                )}
                <h3 className="text-white font-bold text-lg mb-1">{tier.name}</h3>
                <p className="text-blue-400 font-bold text-3xl">{tier.price}</p>
                <p className="text-gray-400 text-sm mb-4">{tier.sub}</p>
                <p className="text-gray-300 text-sm leading-relaxed mb-5">{tier.desc}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.includes.map((inc) => (
                    <li key={inc} className="flex items-start gap-2 text-xs text-gray-300">
                      <span className="text-blue-400 mt-0.5">&#10003;</span>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`block text-center font-medium px-4 py-2.5 rounded-md text-sm transition-colors ${
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
        </div>
      </section>

      {/* Expanded Operations */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 md:p-12">
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Deeper Operations Work
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{expanded.name}</h2>
            <p className="text-blue-400 font-bold text-2xl mb-1">{expanded.price}</p>
            <p className="text-gray-400 text-sm mb-6">{expanded.sub}</p>
            <p className="text-gray-300 leading-relaxed mb-6">{expanded.desc}</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
              {expanded.includes.map((inc) => (
                <li key={inc} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-blue-400 mt-0.5">&#10003;</span>
                  <span>{inc}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/process-audit"
              className="inline-block bg-[#1f2937] hover:bg-[#374151] text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors border border-gray-700"
            >
              Start with a Process Audit
            </Link>
            <p className="text-gray-500 text-xs mt-4">
              The Process Audit is the deeper consultative diagnostic for businesses ready
              to scope an Expanded Operations engagement.
            </p>
          </div>
        </div>
      </section>

      {/* Hierarchy reminder */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
            How the offers fit together
          </h2>
          <ol className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3 bg-[#111827] border border-gray-800 rounded-lg p-4">
              <span className="text-blue-400 font-bold">1.</span>
              <span><span className="text-white font-semibold">$299 Front Desk AI Pilot</span> — the main paid entry point.</span>
            </li>
            <li className="flex items-start gap-3 bg-[#111827] border border-gray-800 rounded-lg p-4">
              <span className="text-blue-400 font-bold">2.</span>
              <span><span className="text-white font-semibold">Free Front Office Leak Check</span> — lead-magnet diagnostic for prospects who aren't ready yet.</span>
            </li>
            <li className="flex items-start gap-3 bg-[#111827] border border-gray-800 rounded-lg p-4">
              <span className="text-blue-400 font-bold">3.</span>
              <span><span className="text-white font-semibold">Personalized Demo</span> — conversion tool for prospects who want to hear the AI in their business's voice.</span>
            </li>
            <li className="flex items-start gap-3 bg-[#111827] border border-gray-800 rounded-lg p-4">
              <span className="text-blue-400 font-bold">4.</span>
              <span><span className="text-white font-semibold">Process Audit</span> — deeper consultative offer for larger or more complex operations.</span>
            </li>
            <li className="flex items-start gap-3 bg-[#111827] border border-gray-800 rounded-lg p-4">
              <span className="text-blue-400 font-bold">5.</span>
              <span><span className="text-white font-semibold">Full OttoServ Operations System</span> — expansion offer for clients who've outgrown front-desk only.</span>
            </li>
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
            Pricing questions
          </h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <details key={f.q} className="bg-[#111827] border border-gray-800 rounded-xl p-5 group">
                <summary className="text-white font-semibold cursor-pointer list-none flex justify-between items-center">
                  <span>{f.q}</span>
                  <span className="text-blue-400 text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-gray-400 text-sm leading-relaxed mt-4">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to start?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            $299 for 30 days. Setup, 100 AI minutes, and a clean view of what your team's
            been missing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact?plan=pilot"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Start the 30-Day Pilot — $299
            </Link>
            <Link
              href="/front-office-leak-check"
              className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Get a Free Leak Check
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
