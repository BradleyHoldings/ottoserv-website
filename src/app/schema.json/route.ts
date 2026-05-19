export async function GET() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://ottoserv.com/#organization",
        "name": "OttoServ",
        "url": "https://ottoserv.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://ottoserv.com/logo.png"
        },
        "description": "AI receptionist and lead-handling service for small and mid-sized service businesses — property managers, contractors, HVAC, plumbing, roofing, and home services. Flagship offer is OttoServ Front Desk AI with a 30-day pilot for $299.",
        "founder": {
          "@type": "Person",
          "name": "Jonathan Bradley"
        },
        "foundingDate": "2024",
        "address": {
          "@type": "PostalAddress",
          "addressRegion": "Florida",
          "addressCountry": "US"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+1-407-798-8172",
          "contactType": "sales",
          "areaServed": "US",
          "availableLanguage": "English"
        },
        "sameAs": [
          "https://linkedin.com/company/ottoserv"
        ],
        "knowsAbout": [
          "AI receptionist",
          "Missed call recovery",
          "Lead qualification",
          "Appointment booking",
          "Property management operations",
          "HVAC service automation",
          "Plumbing service automation",
          "Roofing lead handling",
          "Contractor lead qualification",
          "Business process automation"
        ]
      },
      {
        "@type": "ProfessionalService",
        "@id": "https://ottoserv.com/#service",
        "name": "OttoServ Front Desk AI",
        "url": "https://ottoserv.com/front-desk-ai",
        "description": "AI receptionist service that answers missed and after-hours calls, captures lead details, qualifies prospects, sends call summaries, and supports appointment capture for small and mid-sized service businesses.",
        "provider": { "@id": "https://ottoserv.com/#organization" },
        "areaServed": "US",
        "serviceType": [
          "AI receptionist",
          "Missed call answering",
          "After-hours call answering",
          "Lead qualification",
          "Appointment booking",
          "Lead capture",
          "Operations automation"
        ],
        "audience": {
          "@type": "BusinessAudience",
          "audienceType": "Small and mid-sized service businesses including property managers, contractors, HVAC, plumbing, roofing, and home services"
        }
      },
      {
        "@type": "Offer",
        "@id": "https://ottoserv.com/#offer-pilot",
        "name": "OttoServ Front Desk AI — 30-Day Pilot",
        "url": "https://ottoserv.com/front-desk-ai",
        "description": "30-day pilot of OttoServ Front Desk AI. Includes setup, 100 AI call minutes, missed-call and after-hours answering, lead capture, basic qualification, call summaries, and a basic weekly performance summary.",
        "price": "299",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "category": "AI receptionist pilot",
        "seller": { "@id": "https://ottoserv.com/#organization" },
        "itemOffered": { "@id": "https://ottoserv.com/#service" }
      },
      {
        "@type": "OfferCatalog",
        "name": "OttoServ Front Desk AI Plans",
        "itemListElement": [
          {
            "@type": "Offer",
            "name": "30-Day Pilot",
            "price": "299",
            "priceCurrency": "USD",
            "description": "One-time, 30 days. Setup + 100 AI call minutes."
          },
          {
            "@type": "Offer",
            "name": "Starter",
            "price": "249",
            "priceCurrency": "USD",
            "priceSpecification": {
              "@type": "UnitPriceSpecification",
              "price": "249",
              "priceCurrency": "USD",
              "unitText": "MONTH"
            },
            "description": "100 AI minutes/month included. Overage $0.25/minute."
          },
          {
            "@type": "Offer",
            "name": "Core",
            "price": "499",
            "priceCurrency": "USD",
            "priceSpecification": {
              "@type": "UnitPriceSpecification",
              "price": "499",
              "priceCurrency": "USD",
              "unitText": "MONTH"
            },
            "description": "300 AI minutes/month included. SMS/email follow-up. Overage $0.25/minute."
          },
          {
            "@type": "Offer",
            "name": "Growth",
            "price": "997",
            "priceCurrency": "USD",
            "priceSpecification": {
              "@type": "UnitPriceSpecification",
              "price": "997",
              "priceCurrency": "USD",
              "unitText": "MONTH"
            },
            "description": "750 AI minutes/month included. Advanced follow-up, reporting, CRM updates, workflow support. Overage $0.25–$0.35/minute."
          },
          {
            "@type": "Offer",
            "name": "Expanded OttoServ Operations Package",
            "priceSpecification": {
              "@type": "PriceSpecification",
              "minPrice": "2500",
              "maxPrice": "3500",
              "priceCurrency": "USD",
              "unitText": "MONTH"
            },
            "description": "Broader process automation, SOPs, dashboards, customer communication workflows, CRM cleanup, reporting, and operational optimization."
          }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": "https://ottoserv.com/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is OttoServ Front Desk AI?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "OttoServ Front Desk AI is an AI receptionist service that answers missed and after-hours calls, captures lead details, qualifies prospects, and sends a clean summary to your team. The starter engagement is a 30-day pilot for $299 that includes setup, 100 AI call minutes, and a basic weekly performance summary."
            }
          },
          {
            "@type": "Question",
            "name": "How much does OttoServ cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The 30-day pilot is $299. Monthly plans are Starter ($249/mo, 100 minutes), Core ($499/mo, 300 minutes), and Growth ($997/mo, 750 minutes). The Expanded OttoServ Operations Package starts at $2,500–$3,500/month for broader process automation."
            }
          },
          {
            "@type": "Question",
            "name": "Who is OttoServ best for?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Small and mid-sized service businesses: property management companies, contractors, HVAC, plumbing, electrical, roofing, and home services. Especially valuable for businesses losing revenue to missed calls and slow follow-up."
            }
          },
          {
            "@type": "Question",
            "name": "Does OttoServ replace a human receptionist?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "It replaces the calls a human can't catch — after-hours, lunch breaks, busy seasons, and when the team is on a job. Many clients keep their human receptionist and use Front Desk AI as a 24/7 safety net."
            }
          },
          {
            "@type": "Question",
            "name": "How quickly can OttoServ be implemented?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Most pilots are live within 2–5 business days. Setup includes configuring the qualification flow, connecting to your phone or web forms, and recording the agent in your business's voice."
            }
          },
          {
            "@type": "Question",
            "name": "Is OttoServ a software platform or a done-for-you service?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Done-for-you. OttoServ designs the qualification flow, configures the voice agent, connects it to phone and web inputs, and operates it ongoing. Software-only tools require the customer to build all of this themselves."
            }
          },
          {
            "@type": "Question",
            "name": "What makes OttoServ different from an answering service?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Traditional answering services take messages. OttoServ Front Desk AI runs structured qualification flows, captures specific lead data (service need, urgency, location, contact info), and delivers a clean summary your team can act on without a callback first. It's available 24/7 and never tied up on another call."
            }
          }
        ]
      }
    ]
  };

  return new Response(JSON.stringify(schema, null, 2), {
    headers: {
      'Content-Type': 'application/ld+json',
    },
  });
}
