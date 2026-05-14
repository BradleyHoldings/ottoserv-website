import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Password authority: the OttoServ enterprise platform (FastAPI).
// Marketing site only keeps PER-EMAIL metadata locally (role / clientAccess /
// permissions / isOttoServEmployee) because the rest of the marketing app
// depends on those fields. Passwords live on the platform — that's the one
// place where the forgot-password / reset flow actually updates state.
const PLATFORM_BASE = process.env.OTTOSERV_PLATFORM_URL || "https://platform.ottoserv.com";

type LocalUser = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'demo' | 'client';
  isOttoServEmployee: boolean;
  clientAccess: string[];
  permissions: string[];
  company?: string;
};

const USER_METADATA: Record<string, LocalUser> = {
  "jonathan@ottoservco.com": {
    id: 'jonathan-bradley',
    name: 'Jonathan Bradley',
    email: 'jonathan@ottoservco.com',
    role: 'super_admin',
    isOttoServEmployee: true,
    clientAccess: ['all'],
    permissions: ['view_all_clients', 'manage_client_services', 'view_aggregate_analytics', 'system_admin', 'billing_admin'],
  },
  "demo@ottoserv.com": {
    id: 'demo-user',
    name: 'Demo User',
    email: 'demo@ottoserv.com',
    role: 'demo',
    isOttoServEmployee: false,
    clientAccess: ['demo-clients'],
    permissions: ['view_demo_data'],
  },
  "brandoncroom50@gmail.com": {
    id: 'brandon-croom',
    name: 'Brandon Croom',
    email: 'brandoncroom50@gmail.com',
    role: 'client',
    isOttoServEmployee: false,
    clientAccess: ['brandon-croom'],
    company: 'Croom Construction',
    permissions: ['view_own_data', 'manage_own_services'],
  },
};

// Legacy fallback: emails NOT yet provisioned on the platform (or whose
// platform password is unknown/divergent from the marketing-site convention).
// Once a user has a known platform password, remove their entry here so they
// can use the real forgot-password flow. New client accounts should go
// straight to the platform.
const LEGACY_PASSWORDS: Record<string, string> = {
  "brandoncroom50@gmail.com": process.env.BRANDON_PASSWORD || "temp-brandon-2026",
  // Demo intentionally stays here — the marketing /login page displays
  // `demo@ottoserv.com` / `demo` to anyone visiting, so we keep that pairing
  // even if the platform's demo user has a different password.
  "demo@ottoserv.com": "demo",
};

async function tryPlatformLogin(email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(`${PLATFORM_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      // Keep this snappy — Vercel API routes have a tight budget
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const lowered = String(email).toLowerCase().trim();
    const metadata = USER_METADATA[lowered];
    if (!metadata) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    // 1. Primary: platform owns the password.
    let authed = await tryPlatformLogin(lowered, password);

    // 2. Legacy fallback for users not yet on the platform.
    if (!authed) {
      const legacyPw = LEGACY_PASSWORDS[lowered];
      if (legacyPw && password === legacyPw) authed = true;
    }

    if (!authed) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    // Set cookies — same shape the rest of the app expects.
    const cookieStore = await cookies();
    cookieStore.set('ottoserv_current_user', JSON.stringify(metadata), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    const token = metadata.role === 'super_admin' ? 'super_admin_token' :
                  metadata.role === 'demo' ? 'demo_token' :
                  `client_${metadata.id}_token`;

    cookieStore.set('ottoserv_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      user: metadata,
      message: "Login successful",
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST method to login" }, { status: 405 });
}
