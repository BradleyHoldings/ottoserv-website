"use client";

import Link from "next/link";

const WHAT_IT_DOES = [
  {
    icon: "📞",
    title: "Answers Calls & Chats",
    desc: "AI handles inbound tech support calls and chat requests 24/7, triaging before a human ever sees it.",
  },
  {
    icon: "🔍",
    title: "Diagnoses Issues",
    desc: "Structured intake captures device info, error messages, and symptoms to generate an instant diagnosis.",
  },
  {
    icon: "💻",
    title: "Resolves Remotely",
    desc: "For most issues, TechOps connects remotely and resolves without rolling a truck.",
  },
  {
    icon: "🎫",
    title: "Creates Tickets",
    desc: "Every request becomes a tracked ticket with full history, status, and AI-generated notes.",
  },
  {
    icon: "⚠️",
    title: "Escalates Risky Issues",
    desc: "High-risk or safety-critical issues are flagged immediately and escalated to a qualified human.",
  },
  {
    icon: "📦",
    title: "Prepares Dispatch Packets",
    desc: "When a truck roll is needed, TechOps builds a complete dispatch packet so techs show up ready.",
  },
];

const WHO_ITS_FOR = [
  { icon: "🖥️", label: "Managed Service Providers (MSPs)" },
  { icon: "🏠", label: "Smart Home Installers" },
  { icon: "🔊", label: "AV / Low-Voltage Contractors" },
  { icon: "🔒", label: "Security Integrators" },
  { icon: "🏢", label: "Property Managers" },
  { icon: "💼", label: "Small Business IT Support" },
];

const COMMON_ISSUES = [
  { icon: "📶", label: "Wi-Fi Down" },
  { icon: "🔒", label: "Access Control Faults" },
  { icon: "📷", label: "Camera Offline" },
  { icon: "🌡️", label: "Thermostat Offline" },
  { icon: "💻", label: "PC Won't Boot" },
  { icon: "🔊", label: "No Audio/Video" },
  { icon: "🚨", label: "Alarm Triggered" },
  { icon: "🖨️", label: "Printer Issues" },
  { icon: "🌐", label: "No Internet" },
  { icon: "📺", label: "Display / HDMI Issues" },
  { icon: "🔌", label: "Device Offline" },
  { icon: "🛡️", label: "VPN Problems" },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Request Submitted", desc: "Client calls, chats, or submits a ticket via the portal. AI captures all relevant details." },
  { step: "2", title: "AI Triage", desc: "TechOps classifies the issue, assesses risk level, and determines the resolution path." },
  { step: "3", title: "Remote Diagnosis", desc: "AI attempts remote access to inspect the device, run diagnostics, and identify root cause." },
  { step: "4", title: "Remote Resolution", desc: "Most issues are resolved in minutes without dispatching anyone. Ticket closed, client notified." },
  { step: "5", title: "Escalation if Needed", desc: "If remote resolution isn't possible, the issue is escalated with a full briefing and risk assessment." },
  { step: "6", title: "Dispatch Packet Ready", desc: "For truck rolls, TechOps prepares a complete packet: scope, tools, site access, and checklist." },
];

const PRICING = [
  {
    icon: "📅",
    title: "Monthly Plans",
    desc: "Flat monthly rate for a set number of sites or tickets. Best for MSPs and property managers with predictable volume.",
  },
  {
    icon: "📞",
    title: "Per-Contact",
    desc: "Pay per inbound call or chat handled by TechOps. Ideal for seasonal or variable-demand businesses.",
  },
  {
    icon: "✅",
    title: "Per-Resolved Ticket",
    desc: "Only pay when TechOps successfully resolves an issue remotely. Outcome-based pricing.",
  },
  {
    icon: "🚚",
    title: "Per-Dispatch",
    desc: "Pay per dispatch packet created. Perfect if you just want AI-assisted prep for your field team.",
  },
];

export default function TechOpsPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Hero */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/30 rounded-full px-4 py-1.5 mb-6">
            <span className="text-blue-400 text-sm font-medium">Now Available</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            AI-Powered Tech Support
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Built for IT providers, smart home installers, low-voltage contractors, and property managers who need fast, intelligent support without growing their headcount.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg"
            >
              Book a TechOps Demo
            </Link>
            <Link
              href="/dashboard/techops"
              className="inline-block bg-[#111827] hover:bg-[#1a2332] border border-gray-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg"
            >
              Submit a Tech Request
            </Link>
          </div>
        </div>
      </section>

      {/* What TechOps Does */}
      <section className="py-20 px-4 border-t border-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">What TechOps Does</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From the first call to a resolved ticket, TechOps handles the full support lifecycle.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHAT_IT_DOES.map((item) => (
              <div key={item.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 px-4 border-t border-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Who It's For</h2>
            <p className="text-gray-500">TechOps is purpose-built for technical service providers.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WHO_ITS_FOR.map((item) => (
              <div key={item.label} className="flex items-center gap-4 bg-[#111827] border border-gray-800 rounded-xl px-5 py-4">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-white font-medium text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Issues */}
      <section className="py-20 px-4 border-t border-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Common Issues We Handle</h2>
            <p className="text-gray-500">TechOps covers the full range of technical support requests across your client base.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {COMMON_ISSUES.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2 bg-[#111827] border border-gray-800 rounded-xl p-5 text-center">
                <span className="text-3xl">{item.icon}</span>
                <span className="text-gray-300 text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 border-t border-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
            <p className="text-gray-500">Six steps from first contact to closed ticket.</p>
          </div>
          <div className="space-y-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex gap-5 bg-[#111827] border border-gray-800 rounded-xl p-6">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-600/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 font-bold text-sm">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20 px-4 border-t border-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Flexible Pricing Models</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Choose the model that fits how you work. Mix and match for different client types.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PRICING.map((item) => (
              <div key={item.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6 flex flex-col gap-3">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="text-white font-semibold">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-600 text-sm mt-8">Custom pricing available for enterprise or high-volume use cases.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 border-t border-gray-900">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to See TechOps in Action?</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Book a 30-minute demo and we will show you exactly how TechOps handles your most common support scenarios — live.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-4 rounded-lg transition-colors text-lg"
          >
            Book a TechOps Demo
          </Link>
        </div>
      </section>
    </div>
  );
}
