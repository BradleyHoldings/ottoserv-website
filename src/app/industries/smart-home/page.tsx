import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OttoServ for Smart Home & AV Companies",
  description:
    "TechOps AI triage, dispatch coordination, and client portal for smart home installers and AV integration companies.",
};

const painPoints = [
  {
    title: "Tech Support Calls",
    desc: "Clients call with device issues — connectivity problems, app errors, system outages. Every call pulls a tech away from a paid install or project.",
  },
  {
    title: "Device Troubleshooting Overhead",
    desc: "Diagnosing smart home issues remotely is time-consuming. Without the right info upfront, a simple fix becomes a site visit.",
  },
  {
    title: "Dispatch Coordination",
    desc: "Scheduling technicians across multiple install projects, service calls, and follow-ups — while managing equipment lead times — creates constant coordination overhead.",
  },
  {
    title: "Client Communication Gaps",
    desc: "Clients do not know where their project stands. They call to check in. Every check-in call is time your team is not billing.",
  },
  {
    title: "Service Agreement Tracking",
    desc: "Monitoring and maintenance agreements are sold and then forgotten. Renewals lapse. Clients feel abandoned. Revenue walks out.",
  },
  {
    title: "Post-Install Support Load",
    desc: "The first 90 days after a smart home install generate most of your support calls. Without a system, those calls hit your best techs at the worst times.",
  },
];

const solutions = [
  {
    title: "TechOps AI Triage",
    desc: "When a client calls or texts with an issue, our AI triage agent collects device info, symptoms, and troubleshooting history — routing to the right tech or resolving remotely.",
    link: "/techops",
  },
  {
    title: "Dispatch Packets",
    desc: "Every field dispatch includes a full packet: client system specs, device list, known issues, site access info, and previous service notes — so your tech shows up prepared.",
    link: null,
  },
  {
    title: "Client Portal",
    desc: "Clients see their project status, device list, documents, and invoices in a branded portal — without calling your office to ask.",
    link: null,
  },
  {
    title: "AI After-Hours Coverage (Morgan)",
    desc: "Morgan handles after-hours client inquiries, new lead calls, and tech support triage — so your team is not on-call 24/7.",
    link: null,
  },
  {
    title: "Service Agreement Management",
    desc: "Track every monitoring and maintenance agreement, automate renewal outreach, and schedule check-ins automatically — keeping recurring revenue on the books.",
    link: null,
  },
  {
    title: "Project Tracking Dashboard",
    desc: "One view of every active install, open service ticket, equipment order, and scheduled visit — updated in real time for your whole team.",
    link: null,
  },
];

export default function SmartHomePage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            Built for Smart Home & AV
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 max-w-3xl">
            OttoServ for Smart Home & AV Companies
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mb-8">
            Smart home and AV integration is a high-touch business — clients expect fast responses
            and seamless support. OttoServ gives integration companies AI-powered triage, automated
            dispatch coordination, and a client portal that keeps clients informed — so your techs
            spend more time installing and less time on the phone.
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
            What Smart Home Companies Tell Us
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            High-touch clients, complex systems, and constant after-install support — without the
            right systems, it eats your team alive.
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
            AI-powered operations built around the install-and-support model of smart home and AV
            integration companies.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {solutions.map((item) => (
              <div key={item.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-blue-400 font-semibold text-lg">{item.title}</h3>
                  {item.link && (
                    <Link
                      href={item.link}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors shrink-0"
                    >
                      Learn more →
                    </Link>
                  )}
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TechOps highlight */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1e3a5f] border border-blue-800 rounded-xl p-8 text-center">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-3">
              Specialized Module
            </p>
            <h2 className="text-white font-bold text-2xl mb-4">TechOps</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              TechOps is OttoServ&apos;s specialized AI-powered technical operations module — built
              specifically for smart home, AV, and IT companies that run complex support operations.
              It includes AI triage, dispatch packets, knowledge base automation, and remote
              resolution workflows.
            </p>
            <Link
              href="/techops"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-md transition-colors"
            >
              Learn About TechOps →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Spend More Time Installing and Less Time on Support Calls?
          </h2>
          <p className="text-gray-400 mb-8">
            Book a free discovery call and we will show you how OttoServ works for your
            integration business.
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
