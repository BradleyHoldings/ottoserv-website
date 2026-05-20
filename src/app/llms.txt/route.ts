import { allPublishedSeoPages, futureSeoPages, SITE_URL } from "@/lib/seoContent";

export const dynamic = "force-static";

function line(label: string, url: string, desc: string) {
  return `- [${label}](${url}): ${desc}`;
}

export async function GET() {
  const published = allPublishedSeoPages
    .map((page) => line(page.title, `${SITE_URL}${page.path}`, page.metaDescription))
    .join("\n");

  const future = futureSeoPages
    .map((path) => `- ${path}`)
    .join("\n");

  const body = `# OttoServ

> OttoServ helps small and mid-sized businesses stop losing revenue from missed calls, slow follow-up, and manual processes by deploying AI receptionists, lead qualification agents, appointment booking workflows, follow-up automation, and operations automation.

## Primary positioning

OttoServ is strongest for AI receptionist and lead qualification workflows for SMBs, especially property management, HVAC, plumbing, roofing, contractors, and home services.

## Published commercial architecture

${published}

## Existing important pages

${line("Home", `${SITE_URL}/`, "Main OttoServ positioning and front-office AI offer.")}
${line("Services", `${SITE_URL}/services`, "Overview of OttoServ services and platform entry points.")}
${line("About", `${SITE_URL}/about`, "Company background and trust context.")}
${line("Contact", `${SITE_URL}/contact`, "General sales and contact page.")}
${line("FAQ", `${SITE_URL}/faq`, "General questions about OttoServ.")}
${line("AI Learn About OttoServ", `${SITE_URL}/ai-learn-about-ottoserv`, "Structured AI-readable company reference page.")}

## Future content registry

These routes are prepared in the content registry for consistent future creation, but are not all published yet:

${future}

## Contact

- Phone: (407) 798-8172
- Website: ${SITE_URL}
- Book a demo: ${SITE_URL}/demo
- Free process audit: ${SITE_URL}/process-audit
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
