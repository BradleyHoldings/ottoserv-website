"use client";

import { useState } from "react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("https://n8n.ottoserv.com/webhook/contact-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
    } catch (err) {
      console.log("Webhook error (non-blocking):", err);
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Get in Touch</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-6">
            Book a free discovery call or send us a message. We will get back to you within one
            business day.
          </p>
          {/* Prominent phone CTA */}
          <div className="inline-flex items-center gap-3 bg-[#111827] border border-blue-600 rounded-xl px-6 py-4">
            <span className="text-gray-400 text-sm">Call us now:</span>
            <a
              href="tel:+14077988172"
              className="text-blue-400 hover:text-blue-300 font-bold text-xl transition-colors"
            >
              (407) 798-8172
            </a>
            <span className="text-gray-500 text-sm">— Morgan, our AI assistant, will answer immediately.</span>
          </div>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8">
            {submitted ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-white font-bold text-2xl mb-3">Message Sent!</h2>
                <p className="text-gray-400">
                  Thanks for reaching out. We will get back to you within one business day.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-white font-bold text-xl mb-6">Send a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Name <span className="text-blue-400">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Email <span className="text-blue-400">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Phone
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Business Name
                    </label>
                    <input
                      id="businessName"
                      name="businessName"
                      type="text"
                      value={formData.businessName}
                      onChange={handleChange}
                      className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      placeholder="Your business name"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Message <span className="text-blue-400">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                      placeholder="Tell us about your business and what you are trying to solve..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold px-6 py-3 rounded-md transition-colors"
                  >
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex flex-col gap-8">
            {/* Phone */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-8">
              <h2 className="text-white font-bold text-xl mb-4">Call or Text Us</h2>
              <a
                href="tel:+14077988172"
                className="text-blue-400 hover:text-blue-300 transition-colors text-2xl font-bold block mb-3"
              >
                (407) 798-8172
              </a>
              <p className="text-gray-400 text-sm leading-relaxed">
                Morgan, our AI assistant, answers immediately — 24 hours a day, 7 days a week. She
                will qualify your inquiry and get you to the right person or book a discovery call
                directly.
              </p>
            </div>

            {/* Email */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-8">
              <h2 className="text-white font-bold text-xl mb-4">Email Us Directly</h2>
              <a
                href="mailto:jonathan@ottoservco.com"
                className="text-blue-400 hover:text-blue-300 transition-colors text-lg"
              >
                jonathan@ottoservco.com
              </a>
              <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                Prefer email? Reach out directly and we will set up a time to talk.
              </p>
            </div>

            {/* Calendly */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-8">
              <h2 className="text-white font-bold text-xl mb-4">Book a Discovery Call</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                A discovery call is free, takes about 15 minutes, and gives us a chance to learn
                about your business and where we can help. No sales pressure — just an honest
                conversation.
              </p>
              <div className="space-y-3 text-sm text-gray-300 mb-6">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">&#10003;</span>
                  Free, no-obligation call
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">&#10003;</span>
                  15 minutes via Zoom or phone
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">&#10003;</span>
                  We will tell you honestly if we can help
                </div>
              </div>
              <a
                href="https://calendly.com/team-ottoserv/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                Schedule Your Free Call →
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
