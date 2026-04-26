import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const posts: Record<
  string,
  {
    title: string;
    date: string;
    tags: string[];
    content: React.ReactNode;
  }
> = {
  "5-signs-your-business-has-outgrown-its-systems": {
    title: "5 Signs Your Business Has Outgrown Its Systems",
    date: "January 15, 2026",
    tags: ["operations", "process"],
    content: (
      <>
        <p>
          There is a moment in almost every growing business when things stop working as well as they used to. It does not happen all at once — it creeps up on you. A tool that used to be fast enough starts causing delays. A process that worked fine with a team of three falls apart with a team of ten. The signs are there if you know what to look for.
        </p>
        <p>
          <strong className="text-white">1. Your team constantly works around the tools instead of with them.</strong> When people start inventing workarounds for the systems you paid for, it means the systems are no longer fit for purpose. This is often the first and most telling sign. The workarounds feel like solutions, but they are actually symptoms.
        </p>
        <p>
          <strong className="text-white">2. Onboarding new team members takes weeks instead of days.</strong> If there is no documented process and new hires learn by watching someone else do it, your business is dependent on tribal knowledge. That is a fragile foundation that gets more fragile every time you grow.
        </p>
        <p>
          <strong className="text-white">3. You have no clear picture of what is in progress at any given time.</strong> If the answer to "what is the status of X?" is always "let me check with [person]," you do not have operational visibility. That is a problem that compounds as the business grows.
        </p>
        <p>
          <strong className="text-white">4. Errors and rework are increasing.</strong> When manual processes scale, so do the errors. If your error rate or rework volume is going up as the business grows, that is a sign your processes are not built to scale — they are just running on more human effort.
        </p>
        <p>
          <strong className="text-white">5. You feel like you are always putting out fires.</strong> If most of your energy goes into fixing problems that should not have happened rather than building toward your goals, your systems are not supporting your growth — they are creating drag. The good news is that all of these are fixable with the right approach.
        </p>
      </>
    ),
  },
  "why-most-small-business-automation-fails": {
    title: "Why Most Small Business Automation Fails (And How to Avoid It)",
    date: "February 3, 2026",
    tags: ["automation", "strategy"],
    content: (
      <>
        <p>
          Every week, a small business owner somewhere signs up for a new automation tool convinced that it will transform their operations. And every week, a large percentage of those projects quietly fail — not because the technology is bad, but because of a fundamental mistake that most businesses make before they write a single automation rule.
        </p>
        <p>
          The mistake is automating a broken process. It sounds obvious once you say it out loud, but it is incredibly common. A business has a chaotic lead follow-up process, so they automate it. Now they have a chaotic lead follow-up process that runs automatically. They have a disorganized invoicing workflow, so they automate it. Now disorganized invoices go out faster. The automation does not fix the underlying problem — it just runs the broken process more consistently and at scale.
        </p>
        <p>
          The businesses that get lasting value from automation are the ones that start by fixing the process first. That means documenting what actually happens, finding where it breaks down, designing a better version, and then — and only then — automating the better version. This approach takes longer up front, but the results stick.
        </p>
        <p>
          There is another common failure mode: over-engineering. Small businesses often try to build enterprise-level automation systems that require significant maintenance and technical expertise to keep running. When the person who built it leaves, the whole thing falls apart. Right-sized automation — systems built to match the actual complexity of the business — is more durable and more valuable. If you are considering automation, start by mapping what you actually do, fix the process on paper, and then find the simplest tool that automates the fixed version.
        </p>
      </>
    ),
  },
  "the-hidden-cost-of-manual-processes": {
    title: "The Hidden Cost of Manual Processes",
    date: "March 10, 2026",
    tags: ["efficiency", "ROI"],
    content: (
      <>
        <p>
          There is a pervasive myth in small business that manual processes are free. You are not paying for software. You are not paying for setup. You are not paying for maintenance. It just happens — someone does the task and it gets done. This feels true on the surface, but it fundamentally misunderstands where costs actually come from.
        </p>
        <p>
          The real cost of manual processes shows up in three places. First, time. Every hour a team member spends on manual data entry, scheduling coordination, or copying information between systems is an hour not spent on something more valuable. If someone making $25/hour spends 5 hours a week on tasks that could be automated, that is $6,500 per year in labor cost — just for one person, just for that one task.
        </p>
        <p>
          Second, errors. Manual processes have a meaningful error rate. Errors create rework, which multiplies the time cost. Errors that reach customers create relationship damage that is hard to quantify but very real. Data entry mistakes cascade through systems, creating downstream problems that take hours to trace and fix.
        </p>
        <p>
          Third — and hardest to measure — is opportunity cost. When your best people are spending significant portions of their time on low-value manual work, they are not doing the things that only they can do. Growth initiatives, client relationships, strategic work — these get crowded out by administrative overhead. The cost is not just what you paid for the manual process. It is also what you did not build because you were busy managing it.
        </p>
        <p>
          The path forward is not to automate everything immediately. It is to identify which manual processes are consuming the most time and causing the most errors, and address those first. A realistic ROI calculation almost always shows that smart automation pays for itself quickly — often within months. The question is not whether you can afford to automate. It is whether you can afford not to.
        </p>
      </>
    ),
  },
};

export async function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) return { title: "Post Not Found — OttoServ" };
  return {
    title: `${post.title} — OttoServ Blog`,
    description: `Read ${post.title} on the OttoServ blog.`,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) notFound();

  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="text-blue-400 hover:text-blue-300 text-sm mb-8 inline-block transition-colors">
            ← Back to Blog
          </Link>

          <div className="flex gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="bg-[#1f2937] text-gray-400 text-xs px-2.5 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
            {post.title}
          </h1>
          <p className="text-gray-500 text-sm mb-10">{post.date}</p>

          <div className="prose prose-invert max-w-none space-y-5 text-gray-400 leading-relaxed [&_strong]:text-white [&_p]:text-gray-400">
            {post.content}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Fix Your Operations?</h2>
          <p className="text-gray-400 mb-8">
            Book a free discovery call and let us take a look at what is going on in your business.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
          >
            Book a Free Discovery Call
          </Link>
        </div>
      </section>
    </div>
  );
}
