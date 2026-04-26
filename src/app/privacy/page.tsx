import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — OttoServ",
  description: "OttoServ Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-8 inline-block transition-colors">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mb-10">Last updated: April 2026</p>
          <div className="space-y-6 text-gray-400 leading-relaxed">
            <p>
              This Privacy Policy describes how OttoServ (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and handles your information when you use our website and services.
            </p>
            <h2 className="text-white font-semibold text-xl">Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you fill out a contact form, book a discovery call, or use our client portal. This may include your name, email address, phone number, and business name.
            </p>
            <h2 className="text-white font-semibold text-xl">How We Use Your Information</h2>
            <p>
              We use the information we collect to respond to your inquiries, provide our services, send you relevant communications, and improve our website and offerings.
            </p>
            <h2 className="text-white font-semibold text-xl">Contact</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:jonathan@ottoservco.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                jonathan@ottoservco.com
              </a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
