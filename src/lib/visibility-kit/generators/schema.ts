// JSON-LD schema generation. Populated from ClientIntake.
// All schemas return plain objects safe to inline via <script type="application/ld+json">.

import type { ClientIntake, ComparisonPage, FAQItem, ProblemSpaceTopic } from "../types";

function clientBaseUrl(slug: string, hostBase = ""): string {
  const base = hostBase || (process.env.NEXT_PUBLIC_SITE_URL || "");
  return `${base}/clients/${slug}`;
}

export function organizationSchema(intake: ClientIntake, hostBase = "") {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: intake.companyName,
    url: intake.website || clientBaseUrl(intake.slug, hostBase),
    telephone: intake.contact.primaryPhone,
    email: intake.contact.email,
    address: intake.contact.address
      ? {
          "@type": "PostalAddress",
          streetAddress: intake.contact.address.street,
          addressLocality: intake.contact.address.city,
          addressRegion: intake.contact.address.region,
          postalCode: intake.contact.address.postalCode,
          addressCountry: intake.contact.address.country || "US",
        }
      : undefined,
    areaServed: intake.serviceAreas,
    founder: intake.founderStory ? { "@type": "Person", description: intake.founderStory } : undefined,
  };
}

export function localBusinessSchema(intake: ClientIntake, hostBase = "") {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: intake.companyName,
    url: intake.website || clientBaseUrl(intake.slug, hostBase),
    telephone: intake.contact.primaryPhone,
    email: intake.contact.email,
    image: undefined,
    priceRange: intake.pricing.ranges?.[0],
    address: intake.contact.address
      ? {
          "@type": "PostalAddress",
          streetAddress: intake.contact.address.street,
          addressLocality: intake.contact.address.city,
          addressRegion: intake.contact.address.region,
          postalCode: intake.contact.address.postalCode,
          addressCountry: intake.contact.address.country || "US",
        }
      : undefined,
    areaServed: intake.serviceAreas,
    openingHours: intake.contact.hours,
  };
}

export function professionalServiceSchema(intake: ClientIntake, hostBase = "") {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: intake.companyName,
    url: intake.website || clientBaseUrl(intake.slug, hostBase),
    serviceType: intake.mainService,
    areaServed: intake.serviceAreas,
    knowsAbout: [...intake.secondaryServices, ...intake.industriesServed],
  };
}

export function serviceSchema(intake: ClientIntake, topic: ProblemSpaceTopic, hostBase = "") {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: topic.title,
    description: topic.oneLineAnswer,
    provider: { "@type": "Organization", name: intake.companyName, url: intake.website },
    areaServed: intake.serviceAreas,
    serviceType: intake.mainService,
    url: `${clientBaseUrl(intake.slug, hostBase)}/problems/${topic.slug}`,
  };
}

export function faqPageSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export function breadcrumbSchema(crumbs: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function reviewSchema(intake: ClientIntake) {
  // Only emit if reviews exist; only include verified reviews to keep claims defensible.
  const verified = intake.reviews.filter((r) => r.verified !== false);
  if (verified.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: intake.companyName,
    review: verified.map((r) => ({
      "@type": "Review",
      author: r.author ? { "@type": "Person", name: r.author } : undefined,
      reviewBody: r.text,
      reviewRating: r.rating ? { "@type": "Rating", ratingValue: r.rating, bestRating: 5 } : undefined,
      publisher: r.source ? { "@type": "Organization", name: r.source } : undefined,
    })),
  };
}

export function articleSchema(intake: ClientIntake, page: ComparisonPage, hostBase = "") {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${intake.companyName} vs ${page.competitorName}`,
    description: page.oneLineAnswer,
    author: { "@type": "Organization", name: intake.companyName },
    publisher: { "@type": "Organization", name: intake.companyName },
    url: `${clientBaseUrl(intake.slug, hostBase)}/compare/${page.slug}`,
  };
}

export function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
