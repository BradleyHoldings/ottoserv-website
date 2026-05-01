import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
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
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#0a0a0a] text-gray-100 antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <script src="/widget/ottoserv-chat.js" data-client-id="ottoserv" defer></script>
      </body>
    </html>
  );
}
