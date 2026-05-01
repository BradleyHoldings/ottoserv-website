import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OttoServ for Contractors & Remodelers",
  description:
    "AI-powered operations for contractors and remodelers. Job costing, AI lead response, scheduling, progress billing, and full project visibility.",
};

const painPoints = [
  {
    title: "Missed Estimate Calls",
    desc: "A potential client calls while you are on a job site. They leave a voicemail. You forget to call back. They hired someone else.",
  },
  {
    title: "Job Costing on Spreadsheets",
    desc: "You have a rough idea of where each job stands — but no real-time picture of labor, materials, and margin until the job is done.",
  },
  {
    title: "No Project Visibility",
    desc: "You are the glue holding everything together. If you are not on-site, no one knows what is supposed to happen next.",
  },
  {
    title: "Chasing Invoices",
    desc: "Billing gets done when you have time — which means late invoices, forgotten draw requests, and cash flow gaps.",
  },
  {
    title: "Forgotten Follow-Ups",
    desc: "Estimates go out and then go cold. You mean to follow up but it falls through the cracks during a busy stretch.",
  },
  {
    title: "Subcontractor Chaos",
    desc: "Coordinating subs across jobs means endless texts and calls. Scheduling conflicts and no-shows cost you days.",
  },
];

const solutions = [
  {
    title: "AI Lead Response (Morgan)",
    desc: "Morgan answers every call and web inquiry 24/7. She qualifies the lead, asks the right questions, and books the estimate — before your competitor picks up.",
  },
  {
    title: "Contractor OS Dashboard",
    desc: "One view of every active job: budget vs. actual, schedule, milestones, open tasks, and billing status. Updated in real time.",
  },
  {
    title: "Job Costing",
    desc: "Track labor hours, material costs, and subcontractor charges against your estimate — in real time, on every job.",
  },
  {
    title: "Progress Billing",
    desc: "Automated draw schedules and invoice generation tied to job milestones. Get paid faster without chasing.",
  },
  {
    title: "Scheduling & Dispatch",
    desc: "Job scheduling synced to your team's calendar. Technician assignments, daily schedules, and site access info — all in one place.",
  },
  {
    title: "Automated Follow-Ups",
    desc: "Estimates automatically follow up after 48 hours. Completed jobs trigger review requests. No manual effort required.",
  },
];

export default function ContractorsPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            Built for Contractors
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 max-w-3xl">
            OttoServ for Contractors & Remodelers
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mb-8">
            Stop losing leads on job sites. Stop guessing job margins. Stop being the only one who
            knows what is supposed to happen next. OttoServ gives contractors an AI-powered
            operating system that captures leads, tracks jobs, and runs follow-ups — without you
            having to babysit it.
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
            Problems Contractors Tell Us About Every Day
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            These are not edge cases. They are the normal operating conditions for most contractors —
            and they do not have to be.
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

      {/* How OttoServ Helps */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            How OttoServ Helps
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            A complete operating system for your contracting business — built around how the work
            actually happens.
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
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            What Contractors Get
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: "Zero missed leads", desc: "Morgan answers every call, 24/7 — qualifying, booking, and notifying your team instantly." },
              { stat: "Real-time job costing", desc: "See budget vs. actual on every job, updated in real time. Know your margins before the job closes." },
              { stat: "Faster billing cycles", desc: "Automated draw schedules and milestone invoicing mean you get paid faster without chasing." },
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
            Ready to Run a Tighter Operation?
          </h2>
          <p className="text-gray-400 mb-8">
            Book a free 15-minute discovery call. We will show you exactly how OttoServ works for
            your contracting business — no generic demos, no pressure.
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
