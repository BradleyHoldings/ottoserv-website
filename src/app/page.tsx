import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OttoServ Front Desk AI — Stop Losing Leads · 30-Day Pilot for $299",
  description:
    "OttoServ Front Desk AI answers missed and after-hours calls, captures lead details, qualifies prospects, and sends your team a clean summary. Start with a 30-day pilot for $299. Built for property managers, contractors, HVAC, plumbing, roofing, and home services.",
};

const painPoints = [
  {
    title: "Missed Calls Costing You Jobs",
    desc: "Every unanswered call is a job that goes to your competitor. After-hours, weekends, busy seasons — leads don't wait.",
  },
  {
    title: "Leads Falling Through the Cracks",
    desc: "Potential clients fill out a form, send a text, or leave a voicemail — and never hear back. That's revenue left on the table.",
  },
  {
    title: "Slow Follow-Up Loses the Sale",
    desc: "Speed-to-lead drops sharply after 5 minutes. The fastest response wins; the polished pitch sent two days late doesn't.",
  },
  {
    title: "No Visibility Into What's Missed",
    desc: "You can't fix a leak you can't measure. Most owners have no idea how many leads they're losing each week.",
  },
];

const platform = [
  {
    title: "Missed & After-Hours Answering",
    desc: "Front Desk AI picks up calls your team can't — busy seasons, evenings, weekends — in your business's voice.",
  },
  {
    title: "Lead Capture & Qualification",
    desc: "Asks the right questions for your service: name, phone, service need, urgency, location, notes — then routes a clean summary.",
  },
  {
    title: "Appointment Capture",
    desc: "Books estimates, consultations, service visits, and discovery calls. Booking or handoff flow tuned to how you actually sell.",
  },
  {
    title: "Weekly Performance Summary",
    desc: "See calls answered, leads captured, response speed, and opportunities surfaced — without digging through call logs.",
  },
  {
    title: "Higher-Tier Follow-Up & CRM",
    desc: "Core and Growth plans add SMS/email follow-up sequences, CRM updates, and workflow support so leads don't go cold.",
  },
  {
    title: "Expanded Operations Package",
    desc: "Once Front Desk AI is producing leads, expand into SOPs, dashboards, customer comms, reporting, and CRM cleanup.",
  },
];

const industries = [
  { name: "Property Managers", href: "/industries/property-management", icon: "🏢" },
  { name: "Contractors & Remodelers", href: "/industries/contractors", icon: "🏗️" },
  { name: "HVAC / Plumbing / Electrical", href: "/industries/trades", icon: "⚡" },
  { name: "Roofing", href: "/industries/contractors", icon: "🏠" },
  { name: "Home Services", href: "/industries/trades", icon: "🛠️" },
  { name: "Smart Home & AV", href: "/industries/smart-home", icon: "📡" },
];

const pricing = [
  {
    name: "30-Day Pilot",
    price: "$299",
    sub: "one-time",
    badge: "Start Here",
    badgeColor: "text-orange-400",
    desc: "Setup, 100 AI minutes, missed-call & after-hours answering, lead capture, basic qualification, call summaries, weekly summary.",
    cta: "Start the 30-Day Pilot",
    href: "/contact?plan=pilot",
    highlighted: true,
  },
  {
    name: "Core",
    price: "$499",
    sub: "/ month",
    badge: "Most Popular",
    badgeColor: "text-blue-300",
    desc: "300 AI minutes/month, qualification flow customized to your service, SMS/email follow-up. Overage $0.25/min.",
    cta: "Choose Core",
    href: "/contact?plan=core",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$997",
    sub: "/ month",
    badge: "",
    badgeColor: "",
    desc: "750 AI minutes/month, advanced follow-up, reporting, CRM updates, workflow support. Overage $0.25–$0.35/min.",
    cta: "Choose Growth",
    href: "/contact?plan=growth",
    highlighted: false,
  },
];

export default function Home() {
  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }}>
      {/* Hero */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            OttoServ Front Desk AI · 30-Day Pilot
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Stop Losing Leads When Your Team Is Busy.
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
            Setup + 100 AI minutes included. Property managers, contractors, HVAC,
            plumbing, roofing, and home services.
          </p>
        </div>
      </section>

      {/* Positioning */}
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

      {/* Featured OS Playbook — two-column video preview */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div>
              <p className="text-orange-400 font-semibold text-sm uppercase tracking-widest mb-4">
                The OttoServ OS Playbook
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 leading-tight">
                See How OttoServ Becomes Your Business OS
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                We start with the biggest revenue leak first — missed calls and slow
                follow-up — then expand into lead capture, scheduling, reporting,
                workflows, and full operational automation.
              </p>
              <Link
                href="/playbook"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-md text-base transition-colors"
              >
                Watch the Playbook
              </Link>
            </div>

            {/* Right: video thumbnail card */}
            <Link href="/playbook" className="group block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-[#111827] aspect-video">
                {/* YouTube thumbnail */}
                <img
                  src="https://img.youtube.com/vi/GpsAqBugcRQ/maxresdefault.jpg"
                  alt="Watch the OttoServ OS Playbook video"
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity duration-300"
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-orange-500 group-hover:bg-orange-400 flex items-center justify-center shadow-xl transition-colors duration-300">
                    <svg
                      className="w-8 h-8 text-white ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {/* Bottom label */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white font-semibold text-sm">The OttoServ OS Playbook</p>
                  <p className="text-gray-300 text-xs mt-0.5">AI Receptionist → Full Business OS</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Two-card primary journey: Pilot + Leak Check */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            Two ways to get started.
          </h2>
          <p className="text-gray-400 text-center max-w-3xl mx-auto mb-12">
            If you already know you're losing leads, start the 30-day pilot. If you want a
            fast diagnostic first, take the free Front Office Leak Check.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1e3a5f] border-2 border-blue-500 rounded-xl p-8 flex flex-col">
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-3">
                Primary · Paid Pilot
              </span>
              <h3 className="text-white font-semibold text-xl mb-3">
                Start the 30-Day Pilot — $299
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-6 flex-1">
                Setup, 100 AI call minutes, missed-call and after-hours answering, lead
                capture, basic qualification, call summaries to your team, and a basic
                weekly performance summary. See exactly how many leads we catch before
                committing to a monthly plan.
              </p>
              <Link
                href="/front-desk-ai"
                className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors"
              >
                See the Pilot Offer
              </Link>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 flex flex-col">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
                Not Ready to Buy? · Free Diagnostic
              </span>
              <h3 className="text-white font-semibold text-xl mb-3">
                Free Front Office Leak Check
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">
                Answer a few questions about how leads come in, how fast they're answered,
                whether after-hours is covered, and how follow-up works. We'll show you
                where revenue is leaking — and recommend whether the $299 pilot is the right
                next step.
              </p>
              <Link
                href="/front-office-leak-check"
                className="block text-center bg-[#1f2937] hover:bg-[#374151] text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors border border-gray-700"
              >
                Request a Free Leak Check
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            Sound Familiar?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {painPoints.map((item) => (
              <div
                key={item.title}
                className="bg-[#111827] border border-gray-800 rounded-xl p-6"
              >
                <h3 className="text-white font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            What Front Desk AI does
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
            A real AI voice agent that answers, qualifies, and routes — not a generic
            chatbot, not a basic answering service.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {platform.map((item) => (
              <div
                key={item.title}
                className="bg-[#111827] border border-gray-800 rounded-xl p-6"
              >
                <h3 className="text-white font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            Built for service businesses
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            Not generic software adapted to fit — qualification flows tuned to how your
            industry actually sells.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="bg-[#111827] border border-gray-800 hover:border-blue-600 rounded-xl p-6 text-center transition-colors group"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <p className="text-gray-300 group-hover:text-white text-sm font-medium leading-tight transition-colors">
                  {item.name}
                </p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/industries"
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              View all industries →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            Simple pricing. Start with the pilot.
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
            $299 for 30 days. Convert to a monthly plan once you see the leads. Pick a
            plan that fits the call volume you actually take.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl p-8 flex flex-col ${
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
                <h3 className="text-white font-bold text-xl mb-1">{tier.name}</h3>
                <p className="text-blue-400 font-bold text-3xl">{tier.price}</p>
                <p className="text-gray-400 text-sm mb-5">{tier.sub}</p>
                <p className="text-gray-300 text-sm leading-relaxed mb-6 flex-1">{tier.desc}</p>
                <Link
                  href={tier.href}
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
          <p className="text-center text-gray-400 text-sm mt-8">
            Also available: <span className="text-white">Starter $249/mo</span> (100 minutes,
            entry-tier) and <span className="text-white">Custom Operations</span> from
            $2,500/mo (broader process automation, SOPs, dashboards, CRM cleanup,
            reporting).{" "}
            <Link href="/pricing" className="text-blue-400 hover:text-blue-300">
              See full pricing →
            </Link>
          </p>
        </div>
      </section>

      {/* Not sure where leads are leaking? */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Not sure where leads are leaking?
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-8">
            The Front Office Leak Check is a fast, free diagnostic. We'll look at how
            calls are handled, how fast forms are answered, whether after-hours is covered,
            and where revenue is most likely escaping.
          </p>
          <Link
            href="/front-office-leak-check"
            className="inline-block bg-[#1f2937] hover:bg-[#374151] text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors border border-gray-700"
          >
            Request a Free Front Office Leak Check
          </Link>
          <p className="text-gray-500 text-sm mt-6">
            For larger, more complex operations that need broader process work, our{" "}
            <Link href="/process-audit" className="text-blue-400 hover:text-blue-300">
              Process Audit
            </Link>{" "}
            goes deeper and feeds the Expanded OttoServ Operations System.
          </p>
        </div>
      </section>

      {/* Compact Playbook CTA */}
      <section className="py-10 px-4 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 border border-gray-800 rounded-xl px-8 py-6">
          <div>
            <p className="text-white font-semibold text-base mb-1">See the OttoServ OS Playbook</p>
            <p className="text-gray-400 text-sm">Watch how we grow from AI receptionist to full business OS.</p>
          </div>
          <Link
            href="/playbook"
            className="shrink-0 inline-block border border-orange-500 hover:bg-orange-500 text-orange-400 hover:text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors"
          >
            Watch the Playbook
          </Link>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to stop losing leads?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Start the 30-day pilot for $299. We'll set it up, include 100 AI minutes, and
            show you exactly how many calls and leads were captured.
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
            Prefer to talk?{" "}
            <a href="tel:+14077988172" className="text-blue-400 hover:text-blue-300 transition-colors">
              (407) 798-8172
            </a>{" "}
            ·{" "}
            <Link href="/demo" className="text-blue-400 hover:text-blue-300 transition-colors">
              Hear a personalized demo
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
