import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OttoServ for HVAC, Plumbing & Electrical",
  description:
    "AI-powered dispatch, job costing, scheduling, and automated follow-ups for HVAC, plumbing, and electrical service companies.",
};

const painPoints = [
  {
    title: "Dispatch Chaos",
    desc: "Coordinating which tech goes where — across service calls, installs, and maintenance agreements — is a full-time job that still results in gaps and double-bookings.",
  },
  {
    title: "Missed Service Calls",
    desc: "A customer calls about a broken AC at 11pm. No one answers. They find another company on Google. That is a $3,000 job you will never know you lost.",
  },
  {
    title: "No Job Costing Visibility",
    desc: "You know the big jobs were profitable. But smaller service calls? You are guessing — and sometimes the labor and parts cost more than the ticket price.",
  },
  {
    title: "Technician Scheduling",
    desc: "Managing availability, skills, and geography for a team of technicians manually creates constant scheduling conflicts and wasted drive time.",
  },
  {
    title: "Service Agreement Tracking",
    desc: "Maintenance agreements are sold and then forgotten. Renewals lapse, scheduled visits get missed, and the recurring revenue walks out the door.",
  },
  {
    title: "Slow Follow-Up on Estimates",
    desc: "A tech leaves a quote on-site. The customer means to call back. A week later, nothing — and you never followed up.",
  },
];

const solutions = [
  {
    title: "AI Dispatch & Lead Response (Morgan)",
    desc: "Morgan handles after-hours service calls, qualifies the issue, captures contact info, and either books the call or escalates emergencies — 24/7, automatically.",
  },
  {
    title: "Smart Scheduling",
    desc: "Dispatch scheduling that accounts for tech skills, location, availability, and existing service windows. Fewer drive conflicts, more jobs per day.",
  },
  {
    title: "Job Costing",
    desc: "Real-time labor, parts, and travel cost tracking against every job ticket. Know your margin on every call — not just at month-end.",
  },
  {
    title: "Service Agreement Management",
    desc: "Track every maintenance agreement, automate renewal outreach, and schedule preventive visits automatically — so recurring revenue stays on the books.",
  },
  {
    title: "Automated Follow-Ups",
    desc: "Estimates auto-follow-up after 48 hours. Completed service calls request reviews. Equipment replacement opportunities get flagged and followed up.",
  },
  {
    title: "OttoServ OS Dashboard",
    desc: "One live view of every open ticket, scheduled job, tech location, and revenue — updated in real time across your entire service area.",
  },
];

export default function TradesPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            Built for Trades Companies
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 max-w-3xl">
            OttoServ for HVAC, Plumbing & Electrical
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mb-8">
            Trades businesses run on fast response times, tight scheduling, and accurate job costing.
            OttoServ gives HVAC, plumbing, and electrical companies AI-powered dispatch, 24/7 lead
            coverage, and real-time job visibility — so you stop losing calls and start running
            tighter operations.
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
            What Trades Companies Deal With Every Day
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            These are not unusual problems. They are the everyday reality of running a service call
            business without the right systems in place.
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
            AI-powered operations built around the rhythm of a service call business.
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
              { stat: "Zero missed after-hours calls", desc: "Morgan captures every after-hours lead with immediate AI response — no voicemail, no lost jobs." },
              { stat: "More jobs per tech per day", desc: "Smart scheduling reduces drive time and eliminates gaps between jobs across your service area." },
              { stat: "Real margin visibility", desc: "Know your profit on every ticket — not just at month-end when it is too late to do anything about it." },
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
            Stop Losing Jobs to Slow Response Times
          </h2>
          <p className="text-gray-400 mb-8">
            Book a free discovery call and we will show you how OttoServ works for your trade,
            your market size, and your team.
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
