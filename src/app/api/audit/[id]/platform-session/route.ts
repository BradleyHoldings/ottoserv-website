import { NextRequest, NextResponse } from 'next/server';

// Marketing-admin proxy to enterprise-platform's by-audit-request lookup.
// The admin audit detail page calls this to find the auto-generated
// onboarding session spawned by the bridge for a given audit_requests.id.
//
// Auth model:
//   1. Admin authentication is enforced via x-admin-token (same scheme as
//      the existing /api/audit/[id] route).
//   2. Server-to-server call to enterprise-platform authenticates via the
//      shared bridge secret (x-audit-key, same key the bridge already uses).

function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token') || '';
  const expected = process.env.ADMIN_API_TOKEN || '';
  if (!expected) return false;
  return token.length > 0 && token === expected;
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

  const bridgeBase = process.env.AUDIT_BRIDGE_URL;
  const bridgeKey = process.env.AUDIT_BRIDGE_KEY;
  if (!bridgeBase || !bridgeKey) {
    // Same shape as a normal "no session" response so the UI can degrade
    // cleanly instead of showing an error card to admins.
    return NextResponse.json({ session: null, reason: 'bridge_not_configured' });
  }

  // AUDIT_BRIDGE_URL points at /onboarding/intake; swap to the lookup path.
  const lookupUrl = bridgeBase.replace(/\/intake\/?$/, `/sessions/by-audit-request/${id}`);

  try {
    const res = await fetch(lookupUrl, {
      headers: { 'x-audit-key': bridgeKey },
      cache: 'no-store',
    });
    if (res.status === 404) {
      return NextResponse.json({ session: null, reason: 'no_session_yet' });
    }
    if (!res.ok) {
      const detail = await res.text();
      console.error('Platform session lookup failed:', res.status, detail);
      return NextResponse.json(
        { session: null, reason: 'platform_error', status: res.status },
        { status: 502 },
      );
    }
    const session = (await res.json()) as Record<string, unknown>;
    return NextResponse.json({ session });
  } catch (err) {
    console.error('Platform session lookup threw:', err);
    return NextResponse.json(
      { session: null, reason: 'platform_unreachable' },
      { status: 502 },
    );
  }
}
