import { NextRequest, NextResponse } from 'next/server';

function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token') || '';
  const expected = process.env.ADMIN_API_TOKEN || '';
  if (!expected) {
    // In environments where ADMIN_API_TOKEN isn't set, fail closed.
    // Set ADMIN_API_TOKEN in Vercel env vars to enable the admin audit pages.
    return false;
  }
  return token.length > 0 && token === expected;
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const params = new URL(request.url).searchParams;
  const limit = Math.min(Number(params.get('limit') || '100'), 500);
  const status = params.get('status');

  const query = new URLSearchParams({
    select:
      'id,email,name,company_name,phone,business_type,source,utm_source,priority,status,estimated_value,pain_points,notes,request_date,created_at,biggest_operational_bottleneck,current_tools_or_crm',
    order: 'request_date.desc',
    limit: String(limit),
  });
  if (status) query.set('status', `eq.${status}`);

  const res = await fetch(`${url}/rest/v1/audit_requests?${query.toString()}`, {
    headers: supabaseHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `Supabase error: ${errText}` }, { status: 502 });
  }

  const rows = await res.json();
  return NextResponse.json({ rows });
}
