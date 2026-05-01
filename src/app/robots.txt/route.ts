export async function GET() {
  const robots = `User-agent: *
Allow: /

# Sitemaps
Sitemap: https://ottoserv.com/sitemap.xml

# Block admin and private areas
Disallow: /dashboard/
Disallow: /login/
Disallow: /admin/
Disallow: /api/private/

# Allow important pages
Allow: /
Allow: /about
Allow: /services
Allow: /industries
Allow: /pricing
Allow: /contact
Allow: /blog

# Crawl-delay
Crawl-delay: 1`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}