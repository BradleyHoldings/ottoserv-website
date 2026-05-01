import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OttoServ — AI-Powered Operating System for Service Businesses",
  description:
    "OttoServ is an AI-powered operating system that helps service businesses capture every lead, automate operations, and grow without adding headcount.",
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

const steps = [
  {
    num: "01",
    title: "Book a Discovery Call",
    desc: "15 minutes, free, no pitch. We learn about your business and what's slowing you down.",
  },
  {
    num: "02",
    title: "We Audit Your Operations",
    desc: "We map how your business runs today — where time leaks, where leads are lost, where the gaps are.",
  },
  {
    num: "03",
    title: "We Build Your System",
    desc: "Custom automations, AI agents, and your OttoServ dashboard — built for how your business actually works.",
  },
  {
    num: "04",
    title: "Your Business Runs Smarter",
    desc: "Ongoing optimization, weekly reports, and AI agents working in the background — so you can focus on growth.",
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
    <div className="bg-[#0a0a0a]">
      {/* Hero */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            AI-Powered Operating System for Service Businesses
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Your Business,<br className="hidden md:block" /> Running Smarter.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-4">
            OttoServ is an AI-powered operating system that helps service businesses capture every
            lead, automate operations, and grow without adding headcount.
          </p>
          <p className="text-gray-500 mb-10">
            Built for contractors, property managers, HVAC, plumbing, roofing, and service companies.
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
              className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Call Us: (407) 798-8172
            </a>
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

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            From discovery call to a fully running system — most clients are live within 30 days.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div
                key={step.num}
                className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center"
              >
                <span className="inline-block text-blue-400 font-bold text-3xl mb-4">
                  {step.num}
                </span>
                <h3 className="text-white font-semibold text-lg mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
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
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            Every engagement starts with a free discovery call. No surprises, no hourly billing creep.
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
            Every plan starts with a free discovery call. Call us at{" "}
            <a href="tel:+14077988172" className="text-blue-400 hover:text-blue-300 transition-colors">
              (407) 798-8172
            </a>{" "}
            or{" "}
            <Link href="/contact" className="text-blue-400 hover:text-blue-300 transition-colors">
              book online
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Stop Losing Leads and Start Scaling?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Book a free 15-minute discovery call. We will audit your operations, find where you are
            losing time and money, and show you exactly how OttoServ fixes it.
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
              (407) 798-8172
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
