import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OttoServ for Property Managers",
  description:
    "AI-powered operations for property management companies. After-hours AI coverage, work order automation, owner reporting, and tenant communication.",
};

const painPoints = [
  {
    title: "After-Hours Inquiries",
    desc: "Prospective tenants call at 9pm. Maintenance emergencies come in on weekends. You cannot be on-call 24/7 — but tenants expect an answer.",
  },
  {
    title: "Tenant Communication",
    desc: "Chasing tenants for rent, maintenance updates, and lease renewals through a mix of texts, emails, and phone calls is exhausting and inconsistent.",
  },
  {
    title: "Maintenance Tracking",
    desc: "Work orders fall through the cracks. You find out a unit's HVAC has been broken for two weeks when the tenant threatens to withhold rent.",
  },
  {
    title: "Owner Reporting",
    desc: "Putting together monthly owner reports takes hours of manual data pulling. Owners want more visibility; you do not have time to give it to them.",
  },
  {
    title: "Vacancy Management",
    desc: "Coordinating showings, applications, lease signing, and move-in checklists manually is a full-time job on top of your full-time job.",
  },
  {
    title: "Review Management",
    desc: "Happy tenants rarely leave reviews. Frustrated ones always do. You have no systematic way to collect feedback and protect your reputation.",
  },
];

const solutions = [
  {
    title: "AI After-Hours Coverage (Morgan)",
    desc: "Morgan answers every call and inquiry 24/7 — handling maintenance requests, leasing questions, and after-hours emergencies with immediate, intelligent responses.",
  },
  {
    title: "Work Order Automation",
    desc: "Maintenance requests automatically create work orders, assign vendors, track status, and notify tenants at each stage — with no manual coordination.",
  },
  {
    title: "Owner Reports",
    desc: "Automated monthly owner reports pull occupancy, maintenance spend, rent collection, and income data — formatted and sent without you touching a spreadsheet.",
  },
  {
    title: "Tenant Communication",
    desc: "Automated rent reminders, lease renewal campaigns, maintenance updates, and move-in checklists — consistent and professional, every time.",
  },
  {
    title: "Lease Tracking",
    desc: "Track every lease expiration, renewal status, and upcoming vacancy in one dashboard. Set automated outreach to renew before units go vacant.",
  },
  {
    title: "Review Management",
    desc: "Automatically request reviews from tenants after maintenance is completed and at lease milestones. Build your reputation systematically.",
  },
];

export default function PropertyManagementPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            Built for Property Managers
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 max-w-3xl">
            OttoServ for Property Managers
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mb-8">
            Property management runs on communication, follow-up, and maintenance coordination —
            all of which can be systematized and automated. OttoServ gives property managers AI
            agents that handle after-hours inquiries, automate work orders, and generate owner
            reports — so you can manage more doors without more headcount.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/contact"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Book a Free Discovery Call
            </Link>
            <a
              href="tel:+14077988172"
              className="inline-flex items-center gap-2 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Call (407) 798-8172
            </a>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            The Real Cost of Manual Property Management
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            Every missed call, delayed work order, and manual report is time you cannot get back —
            and a tenant or owner relationship at risk.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {painPoints.map((item) => (
              <div key={item.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            How OttoServ Helps
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            Automated systems that handle tenant communication, maintenance tracking, and owner
            reporting — without adding to your workload.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {solutions.map((item) => (
              <div key={item.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <h3 className="text-blue-400 font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: "24/7 coverage", desc: "Morgan handles after-hours calls, maintenance requests, and leasing inquiries around the clock." },
              { stat: "Automated owner reports", desc: "Monthly reports go out automatically — no spreadsheet assembly, no manual data pulling." },
              { stat: "Fewer maintenance surprises", desc: "Automated work order tracking means nothing falls through the cracks between tenant and vendor." },
            ].map((item) => (
              <div key={item.stat} className="bg-[#1f2937] border border-gray-700 rounded-xl p-8 text-center">
                <p className="text-blue-400 font-bold text-xl mb-3">{item.stat}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Manage More. Work Less.
          </h2>
          <p className="text-gray-400 mb-8">
            Book a free discovery call and we will show you exactly what OttoServ looks like for
            your portfolio size and property type.
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
