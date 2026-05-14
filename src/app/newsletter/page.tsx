'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, CheckIcon, ChartBarIcon, ClockIcon, CogIcon } from '@heroicons/react/24/outline';

type UtmCtx = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  referrer: string;
};

function readUtm(): UtmCtx {
  if (typeof window === 'undefined') {
    return { utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '', referrer: '' };
  }
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source') || '',
    utm_medium: p.get('utm_medium') || '',
    utm_campaign: p.get('utm_campaign') || '',
    utm_term: p.get('utm_term') || '',
    utm_content: p.get('utm_content') || '',
    referrer: document.referrer || '',
  };
}

function trackEvent(name: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  // Plausible / Fathom / GA-compatible hook. No-op when no analytics installed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (typeof w.plausible === 'function') w.plausible(name, { props });
  if (typeof w.gtag === 'function') w.gtag('event', name, props || {});
}

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [source, setSource] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    trackEvent('newsletter_page_view');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    trackEvent('newsletter_subscribe_submit', { source });

    try {
      const utm = readUtm();
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName,
          source: source || utm.utm_source,
          ...utm,
          user_agent: navigator.userAgent,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        trackEvent('newsletter_subscribe_error', { status: response.status });
        throw new Error(result?.error || 'Failed to subscribe');
      }

      trackEvent('newsletter_subscribe_success', { beehiiv_synced: !!result.beehiiv_synced });
      setIsSubscribed(true);
      setEmail('');
      setSource('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
      console.error('Newsletter subscription error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-12">
            <div className="text-green-400 text-6xl mb-6">✓</div>
            <h1 className="text-4xl font-bold text-white mb-4">
              You&rsquo;re subscribed to The Operational Waste Report
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Your first weekly report will arrive next Tuesday. Watch your inbox for a confirmation from Beehiiv.
            </p>
            <div className="space-y-4">
              <Link
                href="/process-audit?utm_source=newsletter&utm_content=success_state"
                onClick={() => trackEvent('audit_cta_click', { from: 'success_state' })}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors mr-4"
              >
                Take the Process Audit
              </Link>
              <button
                onClick={() => (window.location.href = '/')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Back to OttoServ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Stop Losing Revenue in the Gaps
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            A weekly 5-minute report for property managers and service businesses showing where leads, time, and payroll get wasted &mdash; and how better systems, automation, and AI agents fix it.
          </p>

          <div className="bg-[#111111] border border-[#222222] rounded-lg p-8 max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <input
                type="text"
                placeholder="First name (optional)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">How did you find us? (optional)</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
                <option value="google">Google Search</option>
                <option value="referral">Referral</option>
                <option value="email">Email</option>
                <option value="other">Other</option>
              </select>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Subscribing&hellip;' : 'Get the Weekly Waste Report'}
                {!isSubmitting && <ArrowRightIcon className="h-5 w-5" />}
              </button>
            </form>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <p className="text-sm text-gray-400 mt-4">Free &middot; No spam &middot; Unsubscribe anytime</p>
          </div>

          <div className="mt-8">
            <Link
              href="/process-audit?utm_source=newsletter&utm_content=hero"
              onClick={() => trackEvent('audit_cta_click', { from: 'hero' })}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Or take the free Process Audit &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Pain Points */}
      <div className="py-16 bg-[#111111]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Is your business leaking money through operational gaps?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {[
              'Find hidden lead leaks before they cost you deals',
              'See where manual admin work is draining capacity',
              'Learn how faster follow-up increases conversion',
              'Understand which workflows should be automated first',
              'Get practical operator-level fixes, not generic AI hype',
              'Spot the $10,000/month problem hiding in your inbox',
            ].map((pain, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckIcon className="h-6 w-6 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300">{pain}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What you get */}
      <div className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Every Tuesday, get a 5-minute report showing:
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <ChartBarIcon className="h-8 w-8" />, title: 'The Waste', description: 'What operational gaps are costing businesses like yours' },
              { icon: <CogIcon className="h-8 w-8" />, title: 'The Fix', description: 'Practical systems and automation solutions' },
              { icon: <ArrowRightIcon className="h-8 w-8" />, title: 'The ROI', description: 'Real cost of operational waste vs. solution cost' },
              { icon: <ClockIcon className="h-8 w-8" />, title: 'The Implementation', description: 'How to build better operational systems' },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-blue-400 mb-4 flex justify-center">{item.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sample topics */}
      <div className="py-16 bg-[#111111]">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Recent topics</h2>
          <ul className="space-y-4">
            {[
              'The hidden cost of missed calls in property management',
              'Why most CRMs do not fix follow-up problems',
              'The admin work your best employee should not be doing',
              'Why hiring another coordinator may not fix the bottleneck',
              'The $10,000/month problem hiding in your inbox',
            ].map((topic, index) => (
              <li key={index} className="flex items-start gap-3 text-gray-300">
                <span className="text-blue-400">&rarr;</span>
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Social proof */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <blockquote className="text-xl text-gray-300 italic mb-4">
            &ldquo;I found 3 revenue leaks in the first issue that I didn&rsquo;t even know existed.&rdquo;
          </blockquote>
          <cite className="text-gray-400">&mdash; Property Manager, Tampa</cite>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-16 bg-[#111111]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Ready to stop losing revenue in the gaps?
          </h2>
          <div className="bg-[#0a0a0a] border border-[#222222] rounded-lg p-8 max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Subscribing&hellip;' : 'Get the Weekly Waste Report'}
                {!isSubmitting && <ArrowRightIcon className="h-5 w-5" />}
              </button>
            </form>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
          <p className="text-gray-400 mt-6">
            Want it personalised?{' '}
            <Link
              href="/process-audit?utm_source=newsletter&utm_content=final"
              onClick={() => trackEvent('audit_cta_click', { from: 'final' })}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Take the Process Audit
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

