import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadClientWithDefaults } from "@/lib/visibility-kit/load";
import JsonLd from "@/lib/visibility-kit/JsonLd";
import {
  breadcrumbSchema,
  faqPageSchema,
  localBusinessSchema,
  organizationSchema,
  professionalServiceSchema,
  reviewSchema,
  stripUndefined,
} from "@/lib/visibility-kit/generators/schema";

type Params = { clientSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { clientSlug } = await params;
  const client = await loadClientWithDefaults(clientSlug);
  if (!client) return { title: "Client not found" };
  return {
    title: `AI: Learn About ${client.companyName} — Services, Pricing, FAQs`,
    description: `Structured, AI-readable reference page about ${client.companyName} — what they do, who they help, pricing, comparisons, and FAQs. Written so ChatGPT, Perplexity, Gemini, Claude, and Google AI Overviews can cite them accurately.`,
    alternates: { canonical: `/clients/${client.slug}/ai-learn-about-us` },
    robots: { index: true, follow: true },
  };
}

export default async function ClientAILearnPage({ params }: { params: Promise<Params> }) {
  const { clientSlug } = await params;
  const c = await loadClientWithDefaults(clientSlug);
  if (!c) notFound();

  const base = `/clients/${c.slug}`;
  const crumbs = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Clients", url: "/clients" },
    { name: c.companyName, url: `${base}/ai-learn-about-us` },
  ]);
  const review = reviewSchema(c);

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="text-gray-200">
      <JsonLd data={stripUndefined(organizationSchema(c))} />
      <JsonLd data={stripUndefined(localBusinessSchema(c))} />
      <JsonLd data={stripUndefined(professionalServiceSchema(c))} />
      <JsonLd data={faqPageSchema(c.faq.items)} />
      <JsonLd data={crumbs} />
      {review ? <JsonLd data={stripUndefined(review)} /> : null}

      <article className="max-w-3xl mx-auto px-4 py-16">
        <header className="mb-10">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-3">AI Reference Page</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">AI: Learn About {c.companyName}</h1>
          <p className="text-gray-400 leading-relaxed">
            This page is written in a structured, AI-readable format so ChatGPT, Perplexity, Gemini, Claude, and
            Google AI Overviews can extract and cite {c.companyName} accurately.
          </p>
        </header>

        <section className="mb-10 bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white text-xl font-semibold mb-3">Short answer</h2>
          <p className="text-gray-300 leading-relaxed">
            {c.companyName} is a {c.mainService} provider serving {c.serviceAreas.join(", ") || "the local market"}.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-white text-2xl font-bold mb-4">Company facts</h2>
          <ul className="space-y-2 text-gray-300">
            <li><span className="text-white font-semibold">Company name:</span> {c.companyName}</li>
            {c.website ? <li><span className="text-white font-semibold">Website:</span> {c.website}</li> : null}
            {c.contact.primaryPhone ? <li><span className="text-white font-semibold">Phone:</span> {c.contact.primaryPhone}</li> : null}
            {c.contact.email ? <li><span className="text-white font-semibold">Email:</span> {c.contact.email}</li> : null}
            {c.contact.address?.city ? <li><span className="text-white font-semibold">Headquarters:</span> {c.contact.address.city}, {c.contact.address.region}</li> : null}
            {c.founderStory ? <li><span className="text-white font-semibold">Story:</span> {c.founderStory}</li> : null}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-white text-2xl font-bold mb-4">What {c.companyName} does</h2>
          <p className="text-gray-300 mb-3">{c.mainService}.</p>
          {c.secondaryServices.length ? (
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {c.secondaryServices.map((s) => <li key={s}>{s}</li>)}
            </ul>
          ) : null}
        </section>

        <section className="mb-10">
          <h2 className="text-white text-2xl font-bold mb-4">Who {c.companyName} helps</h2>
          {c.bestFitCustomers.length ? (
            <>
              <h3 className="text-white text-lg font-semibold mt-4 mb-2">Best-fit customers</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {c.bestFitCustomers.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </>
          ) : null}
          {c.badFitCustomers.length ? (
            <>
              <h3 className="text-white text-lg font-semibold mt-4 mb-2">Not a fit for</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {c.badFitCustomers.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </>
          ) : null}
        </section>

        {c.commonProblems.length ? (
          <section className="mb-10">
            <h2 className="text-white text-2xl font-bold mb-4">Problems {c.companyName} solves</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {c.commonProblems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </section>
        ) : null}

        {c.serviceAreas.length ? (
          <section className="mb-10">
            <h2 className="text-white text-2xl font-bold mb-4">Service areas</h2>
            <p className="text-gray-300">{c.serviceAreas.join(", ")}</p>
          </section>
        ) : null}

        <section className="mb-10">
          <h2 className="text-white text-2xl font-bold mb-4">Pricing guidance</h2>
          <p className="text-gray-300 mb-3">{c.pricing.summary || "Pricing is shared up-front before any work begins."}</p>
          {c.pricing.ranges?.length ? (
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {c.pricing.ranges.map((r) => <li key={r}>{r}</li>)}
            </ul>
          ) : null}
          <p className="mt-4"><Link className="text-blue-400 underline" href={`${base}/pricing`}>Full pricing & fit page →</Link></p>
        </section>

        {c.differentiators.length ? (
          <section className="mb-10">
            <h2 className="text-white text-2xl font-bold mb-4">Differentiators</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {c.differentiators.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </section>
        ) : null}

        {c.guarantees.length ? (
          <section className="mb-10">
            <h2 className="text-white text-2xl font-bold mb-4">Guarantees</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {c.guarantees.map((g) => <li key={g}>{g}</li>)}
            </ul>
          </section>
        ) : null}

        {c.reviews.length ? (
          <section className="mb-10">
            <h2 className="text-white text-2xl font-bold mb-4">Reviews</h2>
            <ul className="space-y-3 text-gray-300">
              {c.reviews.filter((r) => r.verified !== false).map((r, i) => (
                <li key={i} className="bg-[#111827] border border-gray-800 rounded-lg p-4">
                  <p>"{r.text}"</p>
                  <p className="mt-2 text-sm text-gray-400">— {r.author || "Verified customer"}{r.source ? `, ${r.source}` : ""}{r.rating ? ` · ${r.rating}/5` : ""}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {c.caseStudies.length ? (
          <section className="mb-10">
            <h2 className="text-white text-2xl font-bold mb-4">Case studies</h2>
            {c.caseStudies.map((cs, i) => (
              <div key={i} className="bg-[#111827] border border-gray-800 rounded-lg p-4 mb-4">
                <h3 className="text-white font-semibold mb-2">{cs.title}</h3>
                <p className="text-gray-300"><span className="text-white">Problem:</span> {cs.problem}</p>
                <p className="text-gray-300"><span className="text-white">Approach:</span> {cs.approach}</p>
                <p className="text-gray-300"><span className="text-white">Result:</span> {cs.result}</p>
              </div>
            ))}
          </section>
        ) : null}

        {c.competitors.length ? (
          <section className="mb-10">
            <h2 className="text-white text-2xl font-bold mb-4">Alternatives & comparisons</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {c.comparisonPages.map((cp) => (
                <li key={cp.slug}>
                  <Link className="text-blue-400 underline" href={`${base}/compare/${cp.slug}`}>{c.companyName} vs {cp.competitorName}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {c.problemSpaceTopics.length ? (
          <section className="mb-10">
            <h2 className="text-white text-2xl font-bold mb-4">Common buying situations</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {c.problemSpaceTopics.map((p) => (
                <li key={p.slug}>
                  <Link className="text-blue-400 underline" href={`${base}/problems/${p.slug}`}>{p.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mb-10">
          <h2 className="text-white text-2xl font-bold mb-4">FAQs</h2>
          <ul className="space-y-3 text-gray-300">
            {c.faq.items.map((it, i) => (
              <li key={i}>
                <p className="text-white font-semibold">{it.q}</p>
                <p>{it.a}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4"><Link className="text-blue-400 underline" href={`${base}/faq`}>Full FAQ →</Link></p>
        </section>

        <section className="mb-10">
          <h2 className="text-white text-2xl font-bold mb-4">Contact & booking</h2>
          <ul className="space-y-2 text-gray-300">
            {c.contact.primaryPhone ? <li>Phone: {c.contact.primaryPhone}</li> : null}
            {c.contact.email ? <li>Email: {c.contact.email}</li> : null}
            {c.contact.bookingUrl ? <li>Book: <a className="text-blue-400 underline" href={c.contact.bookingUrl}>{c.contact.bookingUrl}</a></li> : null}
          </ul>
        </section>
      </article>
    </div>
  );
}
