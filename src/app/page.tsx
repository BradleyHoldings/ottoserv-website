import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OttoServ — Stop Losing Leads, Time, and Revenue to Broken Operations",
  description:
    "OttoServ helps service businesses uncover operational waste, automate manual follow-up, qualify leads, book appointments, and give leadership visibility into what is falling through the cracks. Start with the Process Audit.",
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
    title: "Operations on Spreadsheets and Memory",
    desc: "Job tracking, scheduling, and billing spread across apps, notebooks, and tribal knowledge. Nothing connects, nothing scales.",
  },
  {
    title: "No Visibility Into What's Happening",
    desc: "You find out something went wrong when a client calls angry. You need a real-time picture of your business — not a gut feeling.",
  },
];

const platform = [
  {
    title: "AI Lead Response",
    desc: "Morgan, our AI assistant, answers calls 24/7, qualifies leads, and books appointments — even when your team is on a job.",
  },
  {
    title: "Operations Dashboard",
    desc: "See your entire business in one place: jobs, team, revenue, leads, and pipeline — updated in real time.",
  },
  {
    title: "Job & Project Tracking",
    desc: "Budgets, timelines, costs, and billing tracked from estimate to closeout. Always know where every job stands.",
  },
  {
    title: "Automated Follow-Ups",
    desc: "No lead goes cold. Automated sequences follow up on estimates, check in after jobs, and request reviews.",
  },
  {
    title: "Smart Scheduling",
    desc: "Dispatch and scheduling synced to your team's calendar. No double-bookings, no missed appointments.",
  },
  {
    title: "Weekly AI Reports",
    desc: "A weekly intelligence brief tells you what needs attention, what's trending, and where to focus — without you having to dig.",
  },
  {
    title: "Client Portal",
    desc: "Your clients see project status, invoices, photos, and updates — without calling you to ask.",
  },
];

const industries = [
  { name: "Contractors & Remodelers", href: "/industries/contractors", icon: "🏗️" },
  { name: "Property Managers", href: "/industries/property-management", icon: "🏢" },
  { name: "HVAC / Plumbing / Electrical", href: "/industries/trades", icon: "⚡" },
  { name: "Roofing", href: "/industries/contractors", icon: "🏠" },
  { name: "Smart Home & AV", href: "/industries/smart-home", icon: "📡" },
  { name: "IT / MSP Support", href: "/industries/it-msp", icon: "💻" },
];

const leakReviewSteps = [
  {
    num: "01",
    title: "Discover the leaks",
    desc: "Take the Process Audit to identify where leads, follow-up, admin tasks, and internal handoffs are breaking down.",
  },
  {
    num: "02",
    title: "See the system that fixes them",
    desc: "Use the Guided Demo to see how OttoServ turns those broken workflows into an automated operating system.",
  },
  {
    num: "03",
    title: "Book the implementation call",
    desc: "After you understand the opportunity, schedule a call so we can map the first workflows OttoServ should automate for your business.",
  },
];

const results = [
  {
    stat: "12 hrs/week recovered",
    title: "Scheduling & Dispatch Automation",
    desc: "A service business was manually coordinating every appointment. We automated scheduling, reminders, and confirmations — saving 12+ hours per week.",
  },
  {
    stat: "Response time: hours → seconds",
    title: "AI Lead Response",
    desc: "Morgan answers every inbound call and web lead instantly — qualifying, booking, and notifying the team before a competitor can pick up.",
  },
  {
    stat: "Zero missed after-hours leads",
    title: "24/7 Lead Coverage",
    desc: "After deploying Morgan, after-hours leads get immediate responses and booking confirmations — every time, without any staff involvement.",
  },
];

const pricing = [
  {
    name: "Founding Partner",
    price: "$500 setup",
    monthly: "+ $300/mo",
    badge: "Limited Spots",
    desc: "For early adopters who want in early and are willing to give us feedback. You get the full platform at a founder rate.",
    includes: [
      "Operations audit",
      "First automation build",
      "OttoServ OS access",
      "AI lead response (Morgan)",
      "In exchange for feedback + case study",
    ],
    highlighted: false,
    cta: "Apply for Founding Partner",
  },
  {
    name: "Growth",
    price: "$1,500 setup",
    monthly: "+ $800–1,500/mo",
    badge: "Most Popular",
    desc: "Full operations buildout for businesses ready to scale without adding headcount.",
    includes: [
      "Full operations buildout",
      "Custom automations",
      "AI agents & dashboard",
      "Ongoing optimization",
      "Weekly AI reports",
    ],
    highlighted: true,
    cta: "Book a Discovery Call",
  },
  {
    name: "Enterprise",
    price: "Custom",
    monthly: "",
    badge: "",
    desc: "For companies with 50+ employees. Multi-department systems, RBAC, custom integrations, and a dedicated success manager.",
    includes: [
      "Multi-department deployment",
      "Role-based access control",
      "Custom integrations",
      "Dedicated success manager",
      "SLA-backed support",
    ],
    highlighted: false,
    cta: "Contact Us",
  },
];

export default function Home() {
  return (
    <div style={{backgroundColor: 'var(--otto-gray-900)'}}>
      {/* Hero */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            AI Operations for Service Businesses
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Stop Losing Leads, Time, and Revenue
            <br className="hidden md:block" /> to Broken Operations.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            OttoServ helps service businesses uncover operational waste, automate manual
            follow-up, qualify leads, book appointments, and give leadership visibility
            into what is falling through the cracks.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/process-audit"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Find Your Operations Leaks
            </Link>
            <Link
              href="/demo"
              className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Watch the Guided Demo
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-6">
            Start with the Process Audit — most owners find 3+ leaks in under 2 minutes.
          </p>
        </div>
      </section>

      {/* Process Audit + Guided Demo — two-card journey */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            The fastest way to see where your business is leaking money.
          </h2>
          <p className="text-gray-400 text-center max-w-3xl mx-auto mb-12">
            Most companies do not need more software first. They need to understand
            where leads, follow-up, scheduling, task handoffs, and manual admin work are
            breaking down. OttoServ starts by helping you find the leaks, then shows you
            how an AI operations system can fix them.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#111827] border border-blue-700/40 rounded-xl p-8 flex flex-col">
              <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
                Step 1 · Primary
              </span>
              <h3 className="text-white font-semibold text-xl mb-3">
                Take the Process Audit
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-1">
                Answer a few questions about your current lead handling, follow-up,
                scheduling, admin workload, and operational bottlenecks. OttoServ will
                help reveal where your team is losing time, leads, and revenue.
              </p>
              <Link
                href="/process-audit"
                className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors"
              >
                Start the Process Audit
              </Link>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 flex flex-col">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
                Step 2 · See it in action
              </span>
              <h3 className="text-white font-semibold text-xl mb-3">
                Watch the Guided Demo
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-1">
                See how OttoServ captures leads, qualifies opportunities, books
                appointments, tracks operations, and gives leadership visibility into
                the work that normally falls through the cracks.
              </p>
              <Link
                href="/demo"
                className="block text-center bg-[#1f2937] hover:bg-[#374151] text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors border border-gray-700"
              >
                Launch the Guided Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-16 px-4">
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

      {/* Operations Leak Review */}
      <section className="py-20 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
              One Clear Buyer Journey
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              The OttoServ Operations Leak Review
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              The Operations Leak Review is designed to help business owners and
              operators understand where their company is wasting time, missing
              opportunities, and relying too heavily on manual work.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {leakReviewSteps.map((step) => (
              <div
                key={step.num}
                className="bg-[#111827] border border-gray-800 rounded-xl p-8"
              >
                <span className="inline-block text-blue-400 font-bold text-3xl mb-4">
                  {step.num}
                </span>
                <h3 className="text-white font-semibold text-lg mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/process-audit"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Start with the Process Audit
            </Link>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            What You Get
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            One platform. Seven AI-powered tools working together to run your service business.
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
            Industries We Serve
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            Built specifically for service businesses — not generic software adapted to fit.
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

      {/* Results */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            Results We&apos;ve Delivered
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {results.map((item) => (
              <div
                key={item.title}
                className="bg-[#1f2937] border border-gray-700 rounded-xl p-8"
              >
                <p className="text-blue-400 font-bold text-xl mb-2">{item.stat}</p>
                <h3 className="text-white font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            Every engagement starts with the Process Audit. No surprises, no hourly billing creep.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                  <span
                    className={`text-xs font-semibold uppercase tracking-widest mb-4 ${
                      tier.highlighted ? "text-blue-300" : "text-orange-400"
                    }`}
                  >
                    {tier.badge}
                  </span>
                )}
                <h3 className="text-white font-bold text-xl mb-1">{tier.name}</h3>
                <p className="text-blue-400 font-bold text-2xl">{tier.price}</p>
                {tier.monthly && (
                  <p className="text-gray-400 text-sm mb-4">{tier.monthly}</p>
                )}
                <p className="text-gray-400 text-sm leading-relaxed mb-6 mt-2">{tier.desc}</p>
                <ul className="space-y-2 mb-8 flex-1">
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
          <p className="text-center text-gray-500 text-sm mt-8">
            Not sure where to start? Take the{" "}
            <Link href="/process-audit" className="text-blue-400 hover:text-blue-300 transition-colors">
              Process Audit
            </Link>{" "}
            first, or call us at{" "}
            <a href="tel:+14077988172" className="text-blue-400 hover:text-blue-300 transition-colors">
              (407) 798-8172
            </a>
            .
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to find out where your business is leaking revenue?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Start with the Process Audit. Then watch the Guided Demo to see how OttoServ
            can help eliminate operational waste before you add more payroll, software,
            or manual processes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/process-audit"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Find Your Operations Leaks
            </Link>
            <Link
              href="/demo"
              className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Watch the Guided Demo
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-6">
            Prefer to talk?{" "}
            <a href="tel:+14077988172" className="text-blue-400 hover:text-blue-300 transition-colors">
              (407) 798-8172
            </a>{" "}
            or{" "}
            <Link href="/contact" className="text-blue-400 hover:text-blue-300 transition-colors">
              book a call
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
