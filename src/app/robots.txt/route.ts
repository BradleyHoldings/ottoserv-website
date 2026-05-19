export async function GET() {
  const robots = `# OttoServ robots.txt — see /ai-learn-about-ottoserv for a structured
# AI-readable company reference page.

User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /login/
Disallow: /admin/
Disallow: /admin-access/
Disallow: /api/private/

# Explicit allowlist for AI search engine and LLM training/indexing crawlers.
# These bots respect robots.txt; listing them explicitly so future blanket-
# disallow rules do not accidentally hide OttoServ from AI search results.

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
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}