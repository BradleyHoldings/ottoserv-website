import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadClientWithDefaults } from "@/lib/visibility-kit/load";
import JsonLd from "@/lib/visibility-kit/JsonLd";
import {
  breadcrumbSchema,
  faqPageSchema,
  serviceSchema,
  stripUndefined,
} from "@/lib/visibility-kit/generators/schema";

type Params = { clientSlug: string; problemSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { clientSlug, problemSlug } = await params;
  const c = await loadClientWithDefaults(clientSlug);
  const t = c?.problemSpaceTopics.find((p) => p.slug === problemSlug);
  if (!c || !t) return { title: "Page not found" };
  return {
    title: `${t.title} | ${c.companyName}`,
    description: t.oneLineAnswer,
    alternates: { canonical: `/clients/${c.slug}/problems/${t.slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function ProblemSpacePage({ params }: { params: Promise<Params> }) {
  const { clientSlug, problemSlug } = await params;
  const c = await loadClientWithDefaults(clientSlug);
  if (!c) notFound();
  const t = c.problemSpaceTopics.find((p) => p.slug === problemSlug);
  if (!t) notFound();

  const base = `/clients/${c.slug}`;
  const crumbs = breadcrumbSchema([
    { name: c.companyName, url: `${base}/ai-learn-about-us` },
    { name: "Problems", url: base },
    { name: t.title, url: `${base}/problems/${t.slug}` },
  ]);

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="text-gray-200">
      <JsonLd data={stripUndefined(serviceSchema(c, t))} />
      {t.faqs?.length ? <JsonLd data={faqPageSchema(t.faqs)} /> : null}
      <JsonLd data={crumbs} />

      <article className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.title}</h1>
        <p className="text-blue-200 text-lg mb-8">{t.oneLineAnswer}</p>

        <section className="mb-8">
          <h2 className="text-white text-xl font-semibold mb-2">Who this is for</h2>
          <p className="text-gray-300">{t.whoItsFor}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-white text-xl font-semibold mb-2">Problem solved</h2>
          <p className="text-gray-300">{t.problemSolved}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-white text-xl font-semibold mb-2">How {c.companyName} helps</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            {t.howCompanyHelps.map((h) => <li key={h}>{h}</li>)}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-white text-xl font-semibold mb-2">Why choose {c.companyName}</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            {t.whyChooseThisCompany.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>

        {t.comparisonTable?.length ? (
          <section className="mb-8">
            <h2 className="text-white text-xl font-semibold mb-3">Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-300 border border-gray-800">
                <thead className="bg-[#111827] text-white">
                  <tr>
                    <th className="p-3 border-b border-gray-800">Factor</th>
                    <th className="p-3 border-b border-gray-800">{c.companyName}</th>
                    <th className="p-3 border-b border-gray-800">Alternatives</th>
                  </tr>
                </thead>
                <tbody>
                  {t.comparisonTable.map((row) => (
                    <tr key={row.column} className="border-b border-gray-800">
                      <td className="p-3">{row.column}</td>
                      <td className="p-3">{row.client}</td>
                      <td className="p-3">{row.alternative}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {t.faqs?.length ? (
          <section className="mb-8">
            <h2 className="text-white text-xl font-semibold mb-3">FAQ</h2>
            <ul className="space-y-3 text-gray-300">
              {t.faqs.map((f, i) => (
                <li key={i}>
                  <p className="text-white font-semibold">{f.q}</p>
                  <p>{f.a}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mb-8 bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white text-xl font-semibold mb-2">Next step</h2>
          <p className="text-gray-300 mb-4">{t.cta || `Contact ${c.companyName} for a clear estimate.`}</p>
          {c.contact.bookingUrl ? <a href={c.contact.bookingUrl} className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded">{c.contact.ctaLabel || "Book now"}</a> : null}
        </section>

        <p className="text-sm text-gray-500"><Link href={`${base}/ai-learn-about-us`} className="underline">Back to {c.companyName} overview</Link></p>
      </article>
    </div>
  );
}
