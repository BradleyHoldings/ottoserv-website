export async function GET() {
  const robots = `# OttoServ robots.txt - see /llms.txt and /ai-learn-about-ottoserv for
# AI-readable maps of OttoServ services, industries, comparisons, and resources.

User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /login/
Disallow: /admin/
Disallow: /admin-access/
Disallow: /api/private/

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Googlebot
Allow: /

User-agent: GoogleOther
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Applebot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: Bytespider
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: YouBot
Allow: /

User-agent: Diffbot
Allow: /

Sitemap: https://ottoserv.com/sitemap.xml
LLMs: https://ottoserv.com/llms.txt
`;

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
