import type { Metadata } from "next";
import JsonLd from "@/components/content/JsonLd";
import { getSeoPage, metadataForPage, schemaForPage } from "@/lib/seoContent";

const page = getSeoPage("/process-audit");

export const metadata: Metadata = metadataForPage(page!);

export default function ProcessAuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={schemaForPage(page!)} />
      {children}
    </>
  );
}
