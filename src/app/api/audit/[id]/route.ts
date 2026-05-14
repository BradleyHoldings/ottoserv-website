import { NextRequest, NextResponse } from 'next/server';

function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token') || '';
  const expected = process.env.ADMIN_API_TOKEN || '';
  if (!expected) return false;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const res = await fetch(
    `${url}/rest/v1/audit_requests?id=eq.${id}&select=*`,
    { headers: supabaseHeaders(), cache: 'no-store' },
  );

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `Supabase error: ${errText}` }, { status: 502 });
  }

  const rows = (await res.json()) as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ row: rows[0] });
}
