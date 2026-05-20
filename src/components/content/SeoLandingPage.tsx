import Link from "next/link";
import type { SeoPage } from "@/lib/seoContent";
import { schemaForPage } from "@/lib/seoContent";
import JsonLd from "./JsonLd";

function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="max-w-3xl mb-10">
      {eyebrow && (
        <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{title}</h2>
      {text && <p className="text-gray-400 leading-relaxed">{text}</p>}
    </div>
  );
}

function CardGrid({
  items,
  columns = "lg:grid-cols-3",
}: {
  items: { title: string; text: string }[];
  columns?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${columns} gap-5`}>
      {items.map((item) => (
        <article key={item.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h3 className="text-white font-semibold text-lg mb-3">{item.title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{item.text}</p>
        </article>
      ))}
    </div>
  );
}

function CtaBlock({ page }: { page: SeoPage }) {
  return (
    <section className="py-18 px-4 bg-[#0d0d0d]">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-3">
          Ready when you are
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-5">
          See what OttoServ would answer, qualify, and route for your business.
        </h2>
        <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
          Start with the front-office workflow that is leaking revenue today. The demo maps your real calls, lead sources, and follow-up rules.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/demo"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
          >
            {page.primaryCta || "Book a Demo"}
          </Link>
          <Link
            href="/process-audit"
            className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
          >
            {page.secondaryCta || "Request a Free Process Audit"}
          </Link>
        </div>
      </div>
    </section>
  );
}

function PricingBlock({ page }: { page: SeoPage }) {
  if (!page.pricing?.length) return null;

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Offer"
          title="Simple starting point"
          text="Start with the smallest useful workflow, then expand once call volume, booking rules, and follow-up needs are clear."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {page.pricing.map((offer) => (
            <article key={offer.name} className="bg-[#111827] border border-blue-900/60 rounded-xl p-7">
              <h3 className="text-white font-bold text-xl mb-2">{offer.name}</h3>
              <p className="text-blue-400 font-bold text-4xl mb-1">{offer.price}</p>
              <p className="text-gray-500 text-sm mb-4">{offer.unit}</p>
              <p className="text-gray-300 leading-relaxed mb-6">{offer.description}</p>
              <ul className="space-y-2 mb-6">
                {offer.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-blue-400">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={offer.href}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-md text-sm transition-colors"
              >
                {offer.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CallTypesBlock({ page }: { page: SeoPage }) {
  if (!page.callTypes?.length) return null;

  return (
    <section className="py-16 px-4 bg-[#0d0d0d]">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Call triage"
          title="The call types need different handling"
          text="A useful AI receptionist does more than take messages. It classifies the request, asks the right follow-up questions, and routes the call according to approved rules."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {page.callTypes.map((callType) => (
            <article key={callType.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
                {callType.urgency}
              </p>
              <h3 className="text-white font-semibold text-lg mb-3">{callType.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{callType.action}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowBlock({ page }: { page: SeoPage }) {
  if (!page.workflows?.length) return null;

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Workflows"
          title="Deployable workflows, not a generic phone bot"
          text="Each workflow is built around the information your team needs before a human spends time on the next step."
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {page.workflows.map((workflow) => (
            <article key={workflow.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold text-lg mb-5">{workflow.title}</h3>
              <ol className="space-y-4">
                {workflow.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600/20 text-blue-300 font-semibold">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSignalsBlock({ page }: { page: SeoPage }) {
  if (!page.trustSignals?.length) return null;

  return (
    <section className="py-16 px-4 bg-[#0d0d0d]">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Trust"
          title="Guardrails buyers can evaluate"
          text="OttoServ should fit the way the operation actually works, including escalation, sensitive topics, and approved scripts."
        />
        <CardGrid items={page.trustSignals} />
      </div>
    </section>
  );
}

function ObjectionsBlock({ page }: { page: SeoPage }) {
  if (!page.objections?.length) return null;

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Buyer concerns"
          title="Common objections we design around"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {page.objections.map((objection) => (
            <article key={objection.concern} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold text-lg mb-3">{objection.concern}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{objection.response}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function IntegrationsBlock({ page }: { page: SeoPage }) {
  if (!page.integrations?.length) return null;

  return (
    <section className="py-16 px-4 bg-[#0d0d0d]">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Integrations"
          title="Fits into the tools your team already uses"
          text="OttoServ can start with simple routing and add deeper integrations as the workflow matures."
        />
        <div className="flex flex-wrap gap-3">
          {page.integrations.map((name) => (
            <span key={name} className="bg-[#111827] border border-gray-800 text-gray-300 rounded-md px-4 py-2 text-sm">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonBlock({ page }: { page: SeoPage }) {
  if (!page.comparison?.length) return null;

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader eyebrow="Comparison" title="Where each option fits" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {page.comparison.map((row) => (
            <article key={row.option} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold text-lg mb-3">{row.option}</h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                <span className="text-blue-400 font-semibold">Best for: </span>
                {row.bestFor}
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                <span className="text-gray-200 font-semibold">Limits: </span>
                {row.limits}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection({ page }: { page: SeoPage }) {
  return (
    <section className="py-16 px-4 bg-[#0d0d0d]">
      <div className="max-w-4xl mx-auto">
        <SectionHeader eyebrow="FAQ" title="Questions buyers usually ask" />
        <div className="space-y-4">
          {page.faq.map((faq) => (
            <details key={faq.question} className="bg-[#111827] border border-gray-800 rounded-xl p-5 group">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                <h3 className="text-white font-semibold">{faq.question}</h3>
                <span className="text-blue-400 text-xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-gray-400 text-sm leading-relaxed mt-4">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function InternalLinks({ page }: { page: SeoPage }) {
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader eyebrow="Keep researching" title="Helpful next pages" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {page.internalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-[#111827] border border-gray-800 hover:border-blue-700 rounded-xl p-6 transition-colors"
            >
              <h3 className="text-white font-semibold text-lg mb-3">{link.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function SeoLandingPage({ page }: { page: SeoPage }) {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <JsonLd data={schemaForPage(page)} />

      <section className="py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div>
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
              {page.eyebrow}
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {page.h1}
            </h1>
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-8">
              {page.intro}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/demo"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-4 rounded-md text-base transition-colors text-center"
              >
                {page.primaryCta}
              </Link>
              <Link
                href="/process-audit"
                className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-7 py-4 rounded-md text-base transition-colors text-center"
              >
                {page.secondaryCta}
              </Link>
            </div>
          </div>
          <aside className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold text-xl mb-5">What this covers</h2>
            <ul className="space-y-3">
              {page.heroBullets.map((item) => (
                <li key={item} className="flex gap-3 text-gray-300 text-sm leading-relaxed">
                  <span className="text-blue-400 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Buyer pain"
            title="The operational leak this page is built around"
            text="OttoServ pages are written around real workflows: calls, qualification, booking, routing, and follow-up."
          />
          <CardGrid items={page.problems} />
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Outcomes"
            title="What changes when the workflow is handled"
          />
          <CardGrid items={page.outcomes} />
        </div>
      </section>

      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="How it works"
            title="A practical implementation path"
            text="The first workflow should be narrow enough to launch quickly and specific enough to produce useful summaries."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {page.howItWorks.map((step, index) => (
              <article key={step.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <p className="text-blue-400 font-bold text-3xl mb-4">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="text-white font-semibold text-lg mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeader eyebrow="Use cases" title="Where this shows up in the business" />
          <CardGrid items={page.useCases} />
        </div>
      </section>

      <CallTypesBlock page={page} />
      <WorkflowBlock page={page} />
      <TrustSignalsBlock page={page} />
      <ObjectionsBlock page={page} />
      <PricingBlock page={page} />
      <IntegrationsBlock page={page} />
      <ComparisonBlock page={page} />
      <FaqSection page={page} />
      <InternalLinks page={page} />
      <CtaBlock page={page} />
    </div>
  );
}
