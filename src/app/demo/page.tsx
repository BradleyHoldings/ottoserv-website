"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

const walkthrough = [
  {
    num: "01",
    title: "A lead comes in — Morgan answers in seconds",
    desc: "Inbound calls, web forms, and texts route to Morgan, OttoServ's AI assistant. Morgan answers 24/7, qualifies the lead, and captures the information your team would have asked for.",
  },
  {
    num: "02",
    title: "The lead is qualified and an appointment is booked",
    desc: "Morgan checks your calendar, books the appointment, and confirms with the client — before a competitor can call them back.",
  },
  {
    num: "03",
    title: "Your operations dashboard updates in real time",
    desc: "Every job, lead, follow-up, and handoff is visible in one place. No more spreadsheets, sticky notes, or 'I think Mike has it.'",
  },
  {
    num: "04",
    title: "Automated follow-up keeps every lead warm",
    desc: "Estimates get followed up. Past clients get review requests. Cold leads get reactivated. Nothing falls through the cracks.",
  },
  {
    num: "05",
    title: "Leadership gets a weekly intelligence brief",
    desc: "A weekly AI report shows you what needs attention, what's trending, and where to focus — without you digging through dashboards.",
  },
];

const features = [
  {
    title: "Operations Dashboard",
    desc: "Jobs, team, revenue, leads, pipeline — all updated in real time.",
  },
  {
    title: "AI Lead Response (Morgan)",
    desc: "24/7 call answering, qualification, and booking.",
  },
  {
    title: "Automations & Workflows",
    desc: "Visual workflow builder. Templates for service businesses.",
  },
  {
    title: "Client Portal",
    desc: "Clients see project status, invoices, and updates without calling you.",
  },
  {
    title: "Job & Project Tracking",
    desc: "Budgets, timelines, costs, and billing — estimate to closeout.",
  },
  {
    title: "Weekly AI Reports",
    desc: "Intelligence brief on what needs attention this week.",
  },
];

export default function DemoPage() {
  const router = useRouter();

  const handleStartDemo = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "ottoserv_current_user",
        JSON.stringify({
          id: "demo-user",
          name: "Demo User",
          email: "demo@ottoserv.com",
          role: "demo",
          isOttoServEmployee: false,
          clientAccess: ["demo-clients"],
          permissions: ["view_demo_data"],
        }),
      );
      localStorage.setItem("ottoserv_token", "demo_token");
      localStorage.setItem(
        "ottoserv_client",
        JSON.stringify({
          name: "Demo User",
          business_name: "Demo Company",
        }),
      );
      router.push("/dashboard/command-center");
    }
  };

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }}>
      {/* Hero */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            OttoServ Guided Demo
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            See how OttoServ runs your service business —
            <br className="hidden md:block" /> end to end.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            Walk through how OttoServ captures leads, qualifies opportunities,
            books appointments, tracks operations, and gives leadership
            visibility into the work that normally falls through the cracks.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleStartDemo}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Launch the Interactive Demo
            </button>
            <Link
              href="/process-audit"
              className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Take the Process Audit
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-6">
            Interactive demo uses simulated data for ABC Contracting, Miami Property Mgmt, and Elite HVAC Services — no sign-up.
          </p>
        </div>
      </section>

      {/* Walkthrough */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              What the Guided Demo Shows You
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Follow a lead from first contact to closed job — and see every
              place OttoServ removes manual work along the way.
            </p>
          </div>
          <div className="space-y-4">
            {walkthrough.map((step) => (
              <div
                key={step.num}
                className="bg-[#111827] border border-gray-800 rounded-xl p-6 md:p-8 flex flex-col md:flex-row md:items-start gap-4 md:gap-8"
              >
                <span className="text-blue-400 font-bold text-3xl md:text-4xl md:w-16 flex-shrink-0">
                  {step.num}
                </span>
                <div>
                  <h3 className="text-white font-semibold text-lg md:text-xl mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to walk through it yourself?
          </h2>
          <p className="text-gray-400 mb-8">
            The interactive demo opens a sandboxed OttoServ dashboard with
            realistic data from three sample service businesses. Click around,
            try the workflows, and see what the system actually does.
          </p>
          <button
            onClick={handleStartDemo}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
          >
            Launch the Interactive Demo
          </button>
        </div>
      </section>

      {/* Features overview */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            What You&apos;ll See Inside
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Every module is wired with sample data so you can explore without
            booking a sales call first.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item) => (
              <div
                key={item.title}
                className="bg-[#111827] border border-gray-800 rounded-xl p-6"
              >
                <h3 className="text-white font-semibold text-lg mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voice demo */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Want to hear Morgan in action?
          </h2>
          <p className="text-gray-400 mb-8">
            Try a live voice conversation with Morgan — OttoServ&apos;s AI
            assistant who answers calls, qualifies leads, and books
            appointments 24/7.
          </p>
          <Link
            href="/jarvis-voice"
            className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
          >
            Try the Voice Demo
          </Link>
        </div>
      </section>

      {/* Bottom journey CTA */}
      <section className="py-20 px-4 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Seen enough? Find out where your business is leaking revenue.
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            The Guided Demo shows you what the system does. The Process Audit
            shows you where it would pay for itself first. Most owners take 2
            minutes and find 3 leaks.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/process-audit"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Find Your Operations Leaks
            </Link>
            <Link
              href="/contact"
              className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Book an Implementation Call
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
