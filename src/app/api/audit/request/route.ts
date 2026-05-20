import { NextRequest, NextResponse } from 'next/server';
import { importLeadRows, type NormalizedLead } from '@/lib/outreach/leadImport';
import type { CallOutcome } from '@/lib/outreach/callOutcomes';
import {
  CALL_OUTCOMES_PATH,
  DAILY_METRICS_PATH,
  FORM_SUBMISSIONS_PATH,
  JARVIS_CALL_PACKETS_PATH,
  LEADS_PATH,
  OUTREACH_QUEUE_PATH,
  buildDailyMetrics,
  buildJarvisCallPackets,
  buildOutreachQueue,
  readJsonFile,
  writeJsonFile,
} from '@/lib/outreach/leadStore';

// Intake payload — sectioned audit answers from /process-audit.
// Storage: JSON-stringified into the `notes` column on audit_requests until
// dedicated audit_answers / automation_opportunities / implementation_roadmaps
// tables exist on the enterprise-platform side (per bridge architecture).
interface IntakePayload {
  schema_version: number;
  submitted_at?: string;
  sections: {
    company_profile?: Record<string, unknown>;
    lead_intake?: Record<string, unknown>;
    follow_up?: Record<string, unknown>;
    scheduling?: Record<string, unknown>;
    admin_workload?: Record<string, unknown>;
    bottlenecks_handoffs?: Record<string, unknown>;
    tools_systems?: Record<string, unknown>;
    hiring_urgency_priority?: Record<string, unknown>;
  };
}

interface AuditRequestBody {
  name?: string;
  email?: string;
  company_name?: string;
  company?: string;
  website?: string;
  phone?: string;
  business_type?: string;
  biggest_operational_bottleneck?: string;
  current_tools_or_crm?: string;
  consent_to_contact?: boolean;
  pain_points?: string[];
  source?: string;
  utm_source?: string;
  type?: string;
  intake?: IntakePayload;
  intake_summary?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function calculatePriority(source: string, utmSource: string, businessType: string, painTags: string[]): 'low' | 'medium' | 'high' {
  let score = 0;
  if (source === 'newsletter_page' || source === 'newsletter_audit_cta' || utmSource === 'newsletter') score += 2;
  if (source === 'referral') score += 3;
  if (source === 'linkedin') score += 2;
  if (source === 'google') score += 1;
  if (source === 'process_audit_page') score += 2;

  const b = (businessType || '').toLowerCase();
  if (b.includes('property management') || b.includes('property manager')) score += 3;
  if (b.includes('contractor') || b.includes('construction')) score += 2;
  if (b.includes('hvac') || b.includes('plumbing') || b.includes('electrical')) score += 2;

  if (painTags.includes('urgent')) score += 3;
  if (painTags.includes('missed_calls')) score += 1;
  if (painTags.includes('slow_followup')) score += 1;
  if (painTags.includes('hiring_to_patch')) score += 2;

  if (score >= 5) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function calculateEstimatedValue(businessType: string, source: string, painTags: string[]): number {
  let base = 2000;
  const b = (businessType || '').toLowerCase();
  if (b.includes('property management')) base = 5000;
  if (b.includes('contractor') && (b.includes('general') || b.includes('gc'))) base = 4000;
  if (b.includes('hvac') || b.includes('plumbing') || b.includes('electrical')) base = 3000;
  if (source === 'referral') base *= 1.5;
  if (source === 'newsletter_page' || source === 'newsletter_audit_cta') base *= 1.2;
  if (source === 'process_audit_page') base *= 1.3;
  if (painTags.includes('urgent')) base *= 1.4;
  if (painTags.includes('hiring_to_patch')) base *= 1.3;
  return Math.round(base);
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

async function storeAudit(row: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { ok: false as const, error: 'supabase_not_configured', data: null };

  const res = await fetch(`${url}/rest/v1/audit_requests?select=id`, {
    method: 'POST',
    headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) return { ok: false as const, error: await res.text(), data: null };
  const data = (await res.json()) as Array<{ id: number }>;
  return { ok: true as const, error: null, data: data[0] ?? null };
}

async function notifyAuditWebhook(payload: unknown) {
  const url = process.env.N8N_AUDIT_WEBHOOK_URL
    || (process.env.N8N_WEBHOOK_URL ? `${process.env.N8N_WEBHOOK_URL}/audit-request` : null);
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Audit webhook notification failed:', err);
  }
}

async function storeAuditInLocalOpsQueue(args: {
  name: string;
  email: string;
  company_name: string;
  website: string;
  phone: string;
  business_type: string;
  source: string;
  pain_points: string[];
  intake_summary: string;
  biggest_operational_bottleneck: string;
}) {
  const existingLeads = await readJsonFile<NormalizedLead[]>(LEADS_PATH, []);
  const outcomes = await readJsonFile<CallOutcome[]>(CALL_OUTCOMES_PATH, []);
  const submissions = await readJsonFile<Record<string, unknown>[]>(FORM_SUBMISSIONS_PATH, []);
  const result = importLeadRows([
    {
      company: args.company_name,
      contact_name: args.name,
      phone: args.phone,
      email: args.email,
      website: args.website,
      industry: args.business_type,
      source_url: args.source,
      notes: args.intake_summary,
      buying_signal: 'process audit request',
      pain_signal: [args.biggest_operational_bottleneck, ...args.pain_points].filter(Boolean).join('; '),
    },
  ], existingLeads, false);
  const nextLeads = [...existingLeads, ...result.imported];
  const metrics = buildDailyMetrics(nextLeads, result, outcomes);

  await writeJsonFile(FORM_SUBMISSIONS_PATH, [
    ...submissions,
    {
      submission_id: `audit_${Date.now()}`,
      submitted_at: new Date().toISOString(),
      intent: 'process_audit',
      source_page: args.source,
      name: args.name,
      company: args.company_name,
      email: args.email,
      phone: args.phone,
      website: args.website,
      industry: args.business_type,
      message: args.intake_summary || args.biggest_operational_bottleneck,
      consent_to_contact: true,
    },
  ]);
  await writeJsonFile(LEADS_PATH, nextLeads);
  await writeJsonFile(OUTREACH_QUEUE_PATH, buildOutreachQueue(nextLeads));
  await writeJsonFile(JARVIS_CALL_PACKETS_PATH, buildJarvisCallPackets(nextLeads, outcomes));
  await writeJsonFile(DAILY_METRICS_PATH, metrics);

  return result;
}

// Fire-and-forget bridge to the enterprise-platform onboarding pipeline.
// The platform creates an onboarding_session, ingests fires + recommendations,
// finalizes, and fires its own n8n notification. We don't block the user-facing
// response on this — if the platform is down, the audit_requests row is still
// the source of truth and the bridge can be replayed later.
async function notifyPlatformBridge(body: {
  sections: IntakePayload['sections'] | null;
  pain_tags: string[];
  lead: Record<string, unknown>;
  audit_request_id: number | null;
}) {
  const url = process.env.AUDIT_BRIDGE_URL;
  const key = process.env.AUDIT_BRIDGE_KEY;
  if (!url || !key) return;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-audit-key': key,
      },
      body: JSON.stringify({ schema_version: 1, ...body }),
    });
    if (!res.ok) {
      console.error('Audit bridge non-2xx:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Audit bridge call failed:', err);
  }
}

// Customer acknowledgment email — fired immediately after the audit_requests
// row is stored so the lead knows their submission landed and what to expect.
// Non-blocking: the user-facing POST response doesn't wait on Resend, and an
// email failure is logged but never surfaced to the customer.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendAuditAckEmail(args: {
  to: string;
  name: string;
  company_name: string;
  priority: 'low' | 'medium' | 'high';
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'jonathan@ottoservco.com';
  if (!key || !args.to) return;

  const greeting = args.name ? `Hi ${escapeHtml(args.name.split(' ')[0])},` : 'Hi,';
  const companyClause = args.company_name
    ? ` for ${escapeHtml(args.company_name)}`
    : '';
  const responseWindow = args.priority === 'high'
    ? 'within the next 2 hours'
    : 'within 1 business day';

  const subject = "We got your OttoServ Process Audit — here's what's next";
  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <p>${greeting}</p>
  <p>Thanks for sending in your Process Audit${companyClause}. We got it.</p>
  <p>Here's what happens next:</p>
  <ul style="padding-left:20px;margin:12px 0;">
    <li>Jonathan reviews your audit personally — usually <strong>${responseWindow}</strong>.</li>
    <li>If anything is unclear or we need more detail, he'll reach out directly.</li>
    <li>You'll get back a short write-up of the biggest operational wins we see, plus a few specific recommendations.</li>
  </ul>
  <p>If anything's urgent in the meantime, just reply to this email — it goes straight to Jonathan.</p>
  <p style="margin-top:24px;">— The OttoServ Team</p>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">
  <p style="font-size:12px;color:#666;">You're getting this because you submitted a Process Audit at ottoserv.com. We don't add audit submissions to any marketing list.</p>
</body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `OttoServ <${from}>`,
        to: [args.to],
        reply_to: from,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error('Audit ack email non-2xx:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Audit ack email failed:', err);
  }
}

export async function POST(request: NextRequest) {
  let body: AuditRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const company_name = (body.company_name || body.company || '').trim();
  const website = (body.website || '').trim();
  const phone = (body.phone || '').trim();
  const business_type = (body.business_type || '').trim();
  const biggest_operational_bottleneck = (body.biggest_operational_bottleneck || '').trim();
  const current_tools_or_crm = (body.current_tools_or_crm || '').trim();
  const consent_to_contact = Boolean(body.consent_to_contact);
  const source = (body.source || 'newsletter_audit_cta').trim();
  const utm_source = (body.utm_source || '').trim();
  const pain_points = Array.isArray(body.pain_points) ? body.pain_points : [];
  const intake = body.intake || null;
  const intake_summary = (body.intake_summary || '').trim();

  const priority = calculatePriority(source, utm_source, business_type, pain_points);
  const estimated_value = calculateEstimatedValue(business_type, source, pain_points);
  const now = new Date().toISOString();

  // notes column holds the full structured intake (transitional storage).
  // Schema-versioned envelope so future migration to dedicated tables is straightforward.
  const notesPayload = {
    schema_version: 1,
    source,
    intake_summary,
    submitted_at: intake?.submitted_at || now,
    sections: intake?.sections || null,
    pain_tags: pain_points,
  };

  const row = {
    email,
    type: 'operational_waste_audit',
    source,
    utm_source,
    name: name || null,
    company_name: company_name || null,
    website: website || null,
    phone: phone || null,
    business_type: business_type || null,
    biggest_operational_bottleneck: biggest_operational_bottleneck || null,
    current_tools_or_crm: current_tools_or_crm || null,
    consent_to_contact,
    pain_points,
    request_date: now,
    status: 'pending',
    priority,
    estimated_value,
    notes: JSON.stringify(notesPayload),
  };

  const stored = await storeAudit(row);
  const localOps = await storeAuditInLocalOpsQueue({
    name,
    email,
    company_name,
    website,
    phone,
    business_type,
    source,
    pain_points,
    intake_summary,
    biggest_operational_bottleneck,
  });

  if (!stored.ok && stored.error !== 'supabase_not_configured') {
    console.error('Audit request store failed:', stored.error);
    return NextResponse.json(
      { error: 'We could not save your request. Please try again.' },
      { status: 500 },
    );
  }

  void notifyAuditWebhook({
    event: 'audit_request',
    audit_id: stored.data?.id ?? null,
    email,
    name,
    company_name,
    website,
    phone,
    business_type,
    biggest_operational_bottleneck,
    current_tools_or_crm,
    consent_to_contact,
    source,
    utm_source,
    priority,
    estimated_value,
    request_date: now,
    pain_tags: pain_points,
    intake_summary,
    intake,
  });

  if (intake?.sections) {
    void notifyPlatformBridge({
      sections: intake.sections,
      pain_tags: pain_points,
      lead: {
        name,
        email,
        company_name,
        phone,
        website,
        business_type,
      },
      audit_request_id: stored.data?.id ?? null,
    });
  }

  void sendAuditAckEmail({ to: email, name, company_name, priority });

  return NextResponse.json({
    message: "We received your request. Jonathan will review it and reach out within 1 business day.",
    estimated_response_time: priority === 'high' ? '2 hours' : '24 hours',
    audit_id: stored.data?.id ?? null,
    local_ops_status: localOps.imported.length ? 'queued' : 'captured_needs_cleanup',
  });
}
