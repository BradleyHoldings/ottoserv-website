import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadClientWithDefaults } from "@/lib/visibility-kit/load";
import JsonLd from "@/lib/visibility-kit/JsonLd";
import { breadcrumbSchema } from "@/lib/visibility-kit/generators/schema";

type Params = { clientSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { clientSlug } = await params;
  const c = await loadClientWithDefaults(clientSlug);
  if (!c) return { title: "Client not found" };
  return {
    title: `${c.companyName} — Pricing & Fit`,
    description: `Pricing guidance, what affects the price, and who ${c.companyName} is and is not the right fit for.`,
    alternates: { canonical: `/clients/${c.slug}/pricing` },
    robots: { index: true, follow: true },
  };
}

export default async function ClientPricingPage({ params }: { params: Promise<Params> }) {
  const { clientSlug } = await params;
  const c = await loadClientWithDefaults(clientSlug);
  if (!c) notFound();
  const base = `/clients/${c.slug}`;

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="text-gray-200">
      <JsonLd
        data={breadcrumbSchema([
          { name: c.companyName, url: `${base}/ai-learn-about-us` },
          { name: "Pricing", url: `${base}/pricing` },
        ])}
      />

      <article className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{c.companyName} — Pricing & Fit</h1>
        <p className="text-blue-200 text-lg mb-8">{c.pricing.summary || "Pricing is shared up-front before any work begins."}</p>

        {c.pricing.ranges?.length ? (
          <section className="mb-8">
            <h2 className="text-white text-xl font-semibold mb-3">Typical pricing ranges</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {c.pricing.ranges.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </section>
        ) : null}

        {c.pricing.pricingFactors?.length ? (
          <section className="mb-8">
            <h2 className="text-white text-xl font-semibold mb-3">What affects the price</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {c.pricing.pricingFactors.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </section>
        ) : null}

        {c.bestFitCustomers.length ? (
          <section className="mb-8">
            <h2 className="text-white text-xl font-semibold mb-3">Best-fit customers</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {c.bestFitCustomers.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </section>
        ) : null}

        {c.badFitCustomers.length ? (
          <section className="mb-8">
            <h2 className="text-white text-xl font-semibold mb-3">Not a fit for</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {c.badFitCustomers.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </section>
        ) : null}

        <section className="mb-8">
          <h2 className="text-white text-xl font-semibold mb-3">What happens after you inquire</h2>
          <ol className="list-decimal list-inside text-gray-300 space-y-1">
            <li>Initial intake — share the address and a brief description.</li>
            <li>Scope confirmation — written estimate with line items.</li>
            <li>Scheduling — service window confirmed in writing.</li>
            <li>Service — work performed with up-front pricing honored.</li>
            <li>Follow-up — invoice, warranty paperwork, and post-service check-in.</li>
          </ol>
        </section>

        <section className="mb-8 bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white text-xl font-semibold mb-2">Get a quote</h2>
          {c.contact.bookingUrl ? (
            <a href={c.contact.bookingUrl} className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded">{c.contact.ctaLabel || "Request a quote"}</a>
          ) : (
            <p className="text-gray-300">Contact {c.companyName}: {c.contact.primaryPhone || c.contact.email || "see overview"}.</p>
          )}
        </section>

        <p className="text-sm text-gray-500">
          <Link href={`${base}/ai-learn-about-us`} className="underline">Back to overview</Link>
        </p>
      </article>
    </div>
  );
}
