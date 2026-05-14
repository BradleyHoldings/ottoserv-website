import { NextRequest, NextResponse } from 'next/server';

interface SubscribeRequest {
  email?: string;
  first_name?: string;
  company_name?: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  user_agent?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function calculateLeadScore(source: string, utmSource: string, referrer: string): number {
  let score = 50;
  const sourceValue = source || utmSource;
  if (sourceValue === 'linkedin') score += 25;
  else if (sourceValue === 'referral') score += 30;
  else if (sourceValue === 'google') score += 15;
  else if (sourceValue === 'facebook') score += 10;
  else if (sourceValue === 'email') score += 20;

  if (referrer.includes('linkedin.com')) score += 20;
  if (referrer.includes('google.com')) score += 10;
  if (referrer.includes('facebook.com')) score += 5;

  return Math.min(score, 100);
}

function calculateEngagementLevel(score: number): 'cold' | 'warm' | 'hot' {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  return 'cold';
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

async function upsertSubscriber(row: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return { ok: false as const, status: 0, error: 'supabase_not_configured', data: null };
  }

  // on_conflict=email + merge-duplicates = idempotent for same email
  const res = await fetch(
    `${url}/rest/v1/newsletter_subscribers?on_conflict=email&select=id,email,status`,
    {
      method: 'POST',
      headers: {
        ...supabaseHeaders(),
        Prefer: 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    },
  );

  if (!res.ok) {
    const error = await res.text();
    return { ok: false as const, status: res.status, error, data: null };
  }
  const data = (await res.json()) as Array<{ id: number; email: string; status: string }>;
  return { ok: true as const, status: res.status, error: null, data: data[0] ?? null };
}

async function patchSubscriber(id: number, patch: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;

  await fetch(`${url}/rest/v1/newsletter_subscribers?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  }).catch(() => undefined);
}

async function syncToBeehiiv(payload: {
  email: string;
  first_name: string;
  company_name: string;
  source: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  referrer: string;
}) {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey || !pubId) {
    return { ok: false as const, id: null, status: 'not_configured', error: 'BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID missing' };
  }

  const body = {
    email: payload.email,
    reactivate_existing: true,
    send_welcome_email: true,
    utm_source: payload.utm_source || payload.source,
    utm_medium: payload.utm_medium,
    utm_campaign: payload.utm_campaign,
    referring_site: payload.referrer,
    custom_fields: [
      ...(payload.first_name ? [{ name: 'First Name', value: payload.first_name }] : []),
      ...(payload.company_name ? [{ name: 'Company', value: payload.company_name }] : []),
      ...(payload.source ? [{ name: 'Source', value: payload.source }] : []),
      ...(payload.utm_term ? [{ name: 'UTM Term', value: payload.utm_term }] : []),
      ...(payload.utm_content ? [{ name: 'UTM Content', value: payload.utm_content }] : []),
    ],
  };

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false as const, id: null, status: `http_${res.status}`, error: text.slice(0, 500) };
    }
    const json = (await res.json()) as { data?: { id?: string; status?: string } };
    return {
      ok: true as const,
      id: json.data?.id ?? null,
      status: json.data?.status ?? 'active',
      error: null as string | null,
    };
  } catch (err) {
    return {
      ok: false as const,
      id: null,
      status: 'exception',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function notifyWebhook(payload: unknown) {
  const url = process.env.N8N_NEWSLETTER_WEBHOOK_URL
    || (process.env.N8N_WEBHOOK_URL ? `${process.env.N8N_WEBHOOK_URL}/newsletter-signup` : null);
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Newsletter webhook notification failed:', err);
  }
}

export async function POST(request: NextRequest) {
  let body: SubscribeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const first_name = (body.first_name || '').trim();
  const company_name = (body.company_name || '').trim();
  const source = (body.source || body.utm_source || 'direct').trim();
  const utm_source = (body.utm_source || '').trim();
  const utm_medium = (body.utm_medium || '').trim();
  const utm_campaign = (body.utm_campaign || '').trim();
  const utm_term = (body.utm_term || '').trim();
  const utm_content = (body.utm_content || '').trim();
  const referrer = (body.referrer || '').trim();
  const user_agent = (body.user_agent || '').trim();

  const leadScore = calculateLeadScore(source, utm_source, referrer);
  const engagementLevel = calculateEngagementLevel(leadScore);
  const now = new Date().toISOString();

  // Step 1: persist the subscriber to Supabase FIRST.
  // If Beehiiv later fails, we still have the lead.
  const localRow = {
    email,
    first_name: first_name || null,
    company_name: company_name || null,
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    referrer,
    user_agent,
    signup_date: now,
    status: 'pending', // upgrade to 'active' after Beehiiv success
    lead_quality_score: leadScore,
    engagement_level: engagementLevel,
  };

  const localResult = await upsertSubscriber(localRow);

  if (!localResult.ok && localResult.error !== 'supabase_not_configured') {
    console.error('Supabase upsert failed:', localResult.status, localResult.error);
    return NextResponse.json(
      { error: 'We could not save your subscription. Please try again in a moment.' },
      { status: 500 },
    );
  }

  // Step 2: sync to Beehiiv.
  const beehiiv = await syncToBeehiiv({
    email, first_name, company_name, source,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer,
  });

  // Step 3: persist sync result back to the local row (best-effort).
  if (localResult.ok && localResult.data) {
    await patchSubscriber(localResult.data.id, {
      status: beehiiv.ok ? 'active' : 'beehiiv_sync_failed',
      beehiiv_subscriber_id: beehiiv.id,
      beehiiv_status: beehiiv.status,
      beehiiv_synced_at: now,
      beehiiv_sync_error: beehiiv.error,
    });
  }

  // Step 4: fire-and-forget webhook for Jarvis/n8n.
  void notifyWebhook({
    event: 'newsletter_subscribe',
    email,
    first_name,
    company_name,
    source,
    utm: { utm_source, utm_medium, utm_campaign, utm_term, utm_content },
    referrer,
    lead_quality_score: leadScore,
    engagement_level: engagementLevel,
    beehiiv_sync_ok: beehiiv.ok,
    beehiiv_sync_error: beehiiv.error,
    signup_date: now,
  });

  // Friendly response. We always claim success to the user if the local
  // record was saved — Beehiiv sync failures are recoverable internally.
  return NextResponse.json({
    message: "You're on the list. Watch your inbox for The Operational Waste Report.",
    beehiiv_synced: beehiiv.ok,
  });
}
