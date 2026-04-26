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
    console.log("Contact form submitted:", formData);
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
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Book a free discovery call or send us a message. We will get back to you within one business day.
          </p>
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

            <div className="bg-[#111827] border border-gray-800 rounded-xl p-8">
              <h2 className="text-white font-bold text-xl mb-4">Book a Discovery Call</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                A discovery call is free, takes about 30 minutes, and gives us a chance to learn about your business and see if we are a good fit. No sales pressure, no pitch — just an honest conversation.
              </p>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">&#10003;</span>
                  Free, no-obligation call
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">&#10003;</span>
                  30 minutes via Zoom or phone
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">&#10003;</span>
                  We will tell you honestly if we can help
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
