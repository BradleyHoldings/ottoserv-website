export async function GET() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "OttoServ",
    "description": "AI-powered operating system for service businesses. Save 12+ hours/week with automated call answering, lead qualification, and scheduling.",
    "url": "https://ottoserv.com",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "Field Service Management Software",
    "operatingSystem": "Web-based",
    "softwareVersion": "2.0",
    "datePublished": "2024-01-01",
    "dateModified": new Date().toISOString().split('T')[0],
    "author": {
      "@type": "Organization",
      "name": "OttoServ",
      "url": "https://ottoserv.com",
      "founder": {
        "@type": "Person",
        "name": "Jonathan Bradley"
      }
    },
    "publisher": {
      "@type": "Organization", 
      "name": "OttoServ",
      "logo": {
        "@type": "ImageObject",
        "url": "https://ottoserv.com/logo.png"
      }
    },
    "offers": {
      "@type": "Offer",
      "price": "300",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "300",
        "priceCurrency": "USD",
        "unitText": "per month"
      },
      "availability": "https://schema.org/InStock",
      "validFrom": "2024-01-01"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "47",
      "bestRating": "5",
      "worstRating": "1"
    },
    "featureList": [
      "24/7 AI Call Answering",
      "Automatic Lead Qualification",
      "Intelligent Appointment Scheduling", 
      "Customer Communication Automation",
      "Real-time Performance Analytics",
      "CRM Integration",
      "Mobile Application",
      "Business Process Automation"
    ],
    "screenshot": [
      "https://ottoserv.com/dashboard-screenshot.jpg",
      "https://ottoserv.com/mobile-screenshot.jpg"
    ],
    "installUrl": "https://ottoserv.com/contact",
    "downloadUrl": "https://ottoserv.com/contact",
    "supportUrl": "https://ottoserv.com/contact",
    "mainEntity": {
      "@type": "Organization",
      "name": "OttoServ",
      "alternateName": "OttoServ AI",
      "url": "https://ottoserv.com",
      "description": "AI-powered operating system for service businesses including contractors and property managers.",
      "address": {
        "@type": "PostalAddress",
        "addressRegion": "Florida",
        "addressCountry": "US"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+1-407-798-8172",
        "email": "jonathan@ottoservco.com",
        "contactType": "Customer Service",
        "availableLanguage": "English"
      },
      "sameAs": [
        "https://facebook.com/ottoserv",
        "https://linkedin.com/company/ottoserv", 
        "https://instagram.com/ottoserv"
      ],
      "industry": "Software",
      "numberOfEmployees": {
        "@type": "QuantitativeValue",
        "minValue": 1,
        "maxValue": 10
      },
      "foundingDate": "2024"
    },
    "target": [
      {
        "@type": "Audience",
        "audienceType": "Contractors",
        "description": "Small to medium contractors (1-20 employees)"
      },
      {
        "@type": "Audience", 
        "audienceType": "Property Managers",
        "description": "Property management companies"
      },
      {
        "@type": "Audience",
        "audienceType": "Field Service Businesses", 
        "description": "HVAC, plumbing, electrical, landscaping companies"
      }
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "OttoServ Service Plans",
      "itemListElement": [
        {
          "@type": "Offer",
          "name": "Starter Plan",
          "price": "300",
          "priceCurrency": "USD",
          "description": "Complete AI automation platform for small service businesses"
        }
      ]
    }
  };

  return new Response(JSON.stringify(schema, null, 2), {
    headers: {
      'Content-Type': 'application/ld+json',
    },
  });
}