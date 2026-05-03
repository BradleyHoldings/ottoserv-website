import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Set authentication cookies for Jonathan's super admin access
    const cookieStore = await cookies();
    
    // Set user session
    const userData = JSON.stringify({
      id: 'jonathan-bradley',
      name: 'Jonathan Bradley',
      email: 'jonathan@ottoservco.com',
      role: 'super_admin',
      isOttoServEmployee: true,
      clientAccess: ['all'],
      permissions: ['view_all_clients', 'manage_client_services', 'view_aggregate_analytics', 'system_admin', 'billing_admin']
    });
    
    cookieStore.set('ottoserv_current_user', userData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    cookieStore.set('ottoserv_token', 'super_admin_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    // Redirect to admin dashboard
    return NextResponse.redirect(new URL('/dashboard/admin', process.env.NEXT_PUBLIC_BASE_URL || 'https://ottoserv.com'));
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

export async function GET() {
  return POST(); // Allow GET requests too for easier URL access
}