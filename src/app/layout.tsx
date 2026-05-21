import type { Metadata } from "next";
import Script from "next/script";
import { Source_Sans_3 as SourceSansPro, Nunito_Sans, Geist } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import JsonLd from "@/components/content/JsonLd";
import { organizationSchema } from "@/lib/seoContent";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const sourceSansPro = SourceSansPro({
  subsets: ["latin"],
  variable: "--font-primary",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-secondary",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ottoserv.com"),
  title: "OttoServ - AI-Powered Operating System for Service Businesses",
  description: "Save 12+ hours/week with AI automation. 24/7 call answering, lead qualification, and scheduling for contractors and property managers. Starting at $300/month.",
  keywords: "contractor software, property management automation, AI call answering, service business software, field service management, ServiceTitan alternative, contractor AI, property management AI",
  authors: [{ name: "Jonathan Bradley", url: "https://ottoserv.com" }],
  creator: "OttoServ",
  publisher: "OttoServ",
  robots: "index, follow",
  openGraph: {
    title: "OttoServ - AI Operating System for Service Businesses",
    description: "Never miss a lead again. AI answers calls 24/7, qualifies prospects, books appointments automatically. 40% more revenue for contractors & property managers.",
    url: "https://ottoserv.com",
    siteName: "OttoServ",
    images: [
      {
        url: "https://ottoserv.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "OttoServ AI Platform Dashboard"
      }
    ],
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "OttoServ - AI Operating System for Service Businesses",
    description: "Save 12+ hours/week with AI automation for contractors & property managers. Never miss a lead again.",
    creator: "@ottoserv",
    images: ["https://ottoserv.com/twitter-card.jpg"]
  },
  verification: {
    google: "your-google-verification-code"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={cn(sourceSansPro.variable, nunitoSans.variable, "font-sans", geist.variable)}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0066cc" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OttoServ" />
        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.tagged-events.outbound-links.js"
            strategy="afterInteractive"
          />
        )}
        {plausibleDomain && (
          <Script id="plausible-init" strategy="afterInteractive">
            {`window.plausible = window.plausible || function(){ (window.plausible.q = window.plausible.q || []).push(arguments) };`}
          </Script>
        )}
        {gaMeasurementId && (
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
        )}
        {gaMeasurementId && (
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || []; function gtag(){ dataLayer.push(arguments); } window.gtag = gtag; gtag('js', new Date()); gtag('config', '${gaMeasurementId}');`}
          </Script>
        )}
      </head>
      <body className="min-h-screen flex flex-col" style={{backgroundColor: 'var(--otto-gray-900)', color: 'var(--otto-gray-50)'}}>
        <SiteChrome>{children}</SiteChrome>
        <JsonLd data={organizationSchema()} />
        <script src="/widget/ottoserv-chat.js" data-client-id="ottoserv" defer></script>
      </body>
    </html>
  );
}
