import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — OttoServ",
  description: "Insights on business operations, process improvement, and automation from the OttoServ team.",
};

const posts = [
  {
    slug: "5-signs-your-business-has-outgrown-its-systems",
    title: "5 Signs Your Business Has Outgrown Its Systems",
    date: "January 15, 2026",
    excerpt:
      "If your team is constantly working around your tools instead of with them, it's a sign your systems haven't kept up with your growth.",
    tags: ["operations", "process"],
  },
  {
    slug: "why-most-small-business-automation-fails",
    title: "Why Most Small Business Automation Fails (And How to Avoid It)",
    date: "February 3, 2026",
    excerpt:
      "Most automation projects fail not because of bad technology, but because they automate broken processes instead of fixing them first.",
    tags: ["automation", "strategy"],
  },
  {
    slug: "the-hidden-cost-of-manual-processes",
    title: "The Hidden Cost of Manual Processes",
    date: "March 10, 2026",
    excerpt:
      "Manual processes feel free because you're not paying for software — but the real cost in time, errors, and opportunity is much higher than most business owners realize.",
    tags: ["efficiency", "ROI"],
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--otto-gray-900)'}}>
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Blog</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Practical insights on operations, automation, and building systems that actually work for small businesses.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="rounded-xl p-8 flex flex-col border"
              style={{backgroundColor: 'var(--otto-gray-800)', borderColor: 'var(--otto-gray-700)'}}
            >
              <div className="flex gap-2 mb-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{backgroundColor: 'var(--otto-gray-700)', color: 'var(--otto-gray-400)'}}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-white font-bold text-xl mb-3 leading-snug">{post.title}</h2>
              <p className="text-gray-500 text-xs mb-3">{post.date}</p>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">{post.excerpt}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-6 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                Read More →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
