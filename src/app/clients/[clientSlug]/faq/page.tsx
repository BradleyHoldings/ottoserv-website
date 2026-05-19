import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadClientWithDefaults } from "@/lib/visibility-kit/load";
import JsonLd from "@/lib/visibility-kit/JsonLd";
import { breadcrumbSchema, faqPageSchema } from "@/lib/visibility-kit/generators/schema";

type Params = { clientSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { clientSlug } = await params;
  const c = await loadClientWithDefaults(clientSlug);
  if (!c) return { title: "Client not found" };
  return {
    title: `${c.companyName} — FAQ`,
    description: `Frequently asked questions about ${c.companyName}: services, pricing, areas, response time, and fit.`,
    alternates: { canonical: `/clients/${c.slug}/faq` },
    robots: { index: true, follow: true },
  };
}

export default async function ClientFAQPage({ params }: { params: Promise<Params> }) {
  const { clientSlug } = await params;
  const c = await loadClientWithDefaults(clientSlug);
  if (!c) notFound();
  const base = `/clients/${c.slug}`;

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="text-gray-200">
      <JsonLd data={faqPageSchema(c.faq.items)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: c.companyName, url: `${base}/ai-learn-about-us` },
          { name: "FAQ", url: `${base}/faq` },
        ])}
      />

      <article className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">{c.companyName} — FAQ</h1>
        <ul className="space-y-6 text-gray-300">
          {c.faq.items.map((it, i) => (
            <li key={i}>
              <h2 className="text-white text-lg font-semibold mb-1">{it.q}</h2>
              <p>{it.a}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-gray-500">
          <Link href={`${base}/ai-learn-about-us`} className="underline">Back to overview</Link>
        </p>
      </article>
    </div>
  );
}
