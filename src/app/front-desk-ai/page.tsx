import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OttoServ Front Desk AI — 30-Day Pilot for $299",
  description:
    "OttoServ Front Desk AI answers missed and after-hours calls, captures lead details, qualifies prospects, and sends your team a clean summary. Start with a 30-day pilot for $299. Built for property managers, contractors, HVAC, plumbing, roofing, and home services.",
  alternates: { canonical: "https://ottoserv.com/front-desk-ai" },
};

const problems = [
  {
    title: "Missed calls = lost jobs",
    desc: "Every unanswered call is a job your competitor wins. Busy seasons, evenings, and weekends are when most leads slip away.",
  },
  {
    title: "After-hours leads disappear",
    desc: "Prospects search for help at 8 PM. By the morning, they've already booked someone else.",
  },
  {
    title: "Forms sit unanswered for hours",
    desc: "Speed-to-lead drops dramatically after 5 minutes. A clean follow-up beats a polished pitch sent two days late.",
  },
  {
    title: "No record of what's been missed",
    desc: "You can't fix a leak you can't measure. Most owners have no idea how many leads they're losing each week.",
  },
];

const howItWorks = [
  {
    n: "01",
    title: "Call comes in",
    desc: "Missed call, after-hours call, or new prospect. The AI front desk picks up in your business's voice.",
  },
  {
    n: "02",
    title: "AI answers and qualifies",
    desc: "Asks the right questions for your service: name, phone, service need, urgency, location, basic notes.",
  },
  {
    n: "03",
    title: "Lead is captured and summarized",
    desc: "Clean summary sent to your team via email or SMS. Ready to follow up — or get an appointment request booked.",
  },
  {
    n: "04",
    title: "You see the leaks weekly",
    desc: "A simple performance summary every week: calls answered, leads captured, average response speed, opportunities surfaced.",
  },
];

const whoItsFor = [
  "Property management companies (residential and commercial)",
  "Contractors and remodelers",
  "HVAC, plumbing, electrical, and roofing companies",
  "Home services (cleaning, landscaping, pest control, pool service)",
  "Any local service business losing revenue to missed and after-hours calls",
];

const pilotIncludes = [
  "Setup and configuration in your business's voice",
  "100 AI call minutes",
  "Missed-call and after-hours answering",
  "Lead capture (name, phone, service need, urgency, notes)",
  "Basic qualification flow built for your service",
  "Call summaries sent to your team",
  "Basic weekly performance summary",
];

const pricing = [
  {
    name: "30-Day Pilot",
    price: "$299",
    sub: "one-time, first 30 days",
    badge: "Start Here",
    badgeColor: "text-orange-400",
    includes: pilotIncludes,
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
    includes: [
      "100 AI minutes/month included",
      "Missed-call and after-hours answering",
      "Lead capture and qualification",
      "Call summaries to your team",
      "Overage: $0.25/min",
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
    includes: [
      "300 AI minutes/month included",
      "Everything in Starter",
      "Customized qualification flow",
      "SMS/email follow-up sequences",
      "Overage: $0.25/min",
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
    includes: [
      "750 AI minutes/month included",
      "Advanced follow-up sequences",
      "Reporting and CRM updates",
      "Workflow support",
      "Overage: $0.25–$0.35/min depending on complexity",
    ],
    cta: "Choose Growth",
    href: "/contact?plan=growth",
    highlighted: false,
  },
];

const faqs = [
  {
    q: "What does the $299 pilot include?",
    a: "Setup, 100 AI call minutes, missed-call and after-hours answering, lead capture, basic qualification, call summaries to your team, and a basic weekly performance summary. It runs for 30 days so you can see how many leads we actually catch.",
  },
  {
    q: "What happens after the 30-day pilot?",
    a: "You can continue on Starter ($249/mo with 100 minutes), Core ($499/mo with 300 minutes), or Growth ($997/mo with 750 minutes and advanced follow-up). If you want broader operational support, the Expanded OttoServ Operations Package starts at $2,500/month.",
  },
  {
    q: "Is this a chatbot or a real AI receptionist?",
    a: "It's a real AI voice agent that answers calls in your business's voice, qualifies callers with the questions you'd ask, and routes a clean summary to your team. It's not a generic chatbot or a basic answering service.",
  },
  {
    q: "What if the AI can't answer a caller's question?",
    a: "The AI captures the inquiry, sends your team a clean summary, and on higher plans can transfer to a human or schedule a callback. It's designed to capture the lead and get them to the right person — not to fake expertise.",
  },
  {
    q: "How long does setup take?",
    a: "Most pilots are live within 2–5 business days. Setup includes configuring the qualification flow, connecting to your phone or web forms, and recording the agent in your business's voice.",
  },
  {
    q: "Does this work for property management?",
    a: "Yes. Property managers are a primary use case: tenant calls, owner inquiries, applicant questions, vendor coordination, and maintenance request capture. The qualification flow is tuned for your portfolio type.",
  },
  {
    q: "Does this replace a human receptionist?",
    a: "It replaces the missed calls a human receptionist can't catch — after-hours, lunch breaks, busy seasons, and the moments your team is on a job. Many clients keep their receptionist and use Front Desk AI as a safety net.",
  },
];

export default function FrontDeskAIPage() {
  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }}>
      {/* Hero */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            OttoServ Front Desk AI · 30-Day Pilot
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Stop losing leads when your team is busy.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            OttoServ Front Desk AI answers missed and after-hours calls, captures lead
            details, qualifies prospects, and sends your team a clean summary — starting
            with a 30-day pilot for $299.
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
              Get a Free Front Office Leak Check
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-6">
            Pilot includes setup, 100 AI call minutes, and a basic weekly performance summary.
          </p>
        </div>
      </section>

      {/* Positioning paragraph */}
      <section className="py-12 px-4 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-300 text-lg leading-relaxed">
            Most service businesses do not have a marketing problem first. They have a{" "}
            <span className="text-white font-semibold">lead-handling problem</span>. Calls
            get missed, forms sit unanswered, prospects call after hours, and good
            opportunities disappear before anyone follows up. OttoServ Front Desk AI helps
            fix that by answering, qualifying, and summarizing leads automatically so your
            team can respond faster and book more work.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            Where revenue is leaking right now
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {problems.map((p) => (
              <div key={p.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-3">{p.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            How it works
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
            A simple, controlled pilot. You see exactly how many calls are answered, leads
            captured, and opportunities your team would have missed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step) => (
              <div key={step.n} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <span className="text-blue-400 font-bold text-2xl mb-3 inline-block">{step.n}</span>
                <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
            Who Front Desk AI is for
          </h2>
          <ul className="space-y-3 max-w-2xl mx-auto">
            {whoItsFor.map((item) => (
              <li key={item} className="flex items-start gap-3 text-gray-300">
                <span className="text-blue-400 mt-1">&#10003;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            Start with the pilot. Convert when you see the leads.
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
            $299 for the first 30 days. After that, pick the monthly plan that fits how many
            calls you actually take.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricing.map((tier) => (
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
                <p className="text-gray-400 text-sm mb-5">{tier.sub}</p>
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
          <p className="text-gray-500 text-sm text-center mt-8">
            Need broader process automation, SOPs, dashboards, CRM cleanup, or reporting?{" "}
            <Link href="/pricing" className="text-blue-400 hover:text-blue-300">
              See the Expanded Operations Package
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
            Common questions
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

      {/* Bottom CTA */}
      <section className="py-20 px-4 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to stop losing leads?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Start the 30-day pilot for $299. If you'd rather see what you're losing first,
            request a free Front Office Leak Check and we'll show you the gaps.
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
          <p className="text-gray-500 text-sm mt-6">
            Prefer to hear it first?{" "}
            <Link href="/demo" className="text-blue-400 hover:text-blue-300">
              Hear a personalized demo
            </Link>{" "}
            in your business's voice.
          </p>
        </div>
      </section>
    </div>
  );
}
