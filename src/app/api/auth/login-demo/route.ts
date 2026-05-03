import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Set authentication cookies for demo access
    const cookieStore = await cookies();
    
    // Set user session
    const userData = JSON.stringify({
      id: 'demo-user',
      name: 'Demo User',
      email: 'demo@ottoserv.com',
      role: 'demo',
      isOttoServEmployee: false,
      clientAccess: ['demo-clients'],
      permissions: ['view_demo_data']
    });
    
    cookieStore.set('ottoserv_current_user', userData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    cookieStore.set('ottoserv_token', 'demo_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    // Redirect to demo dashboard
    return NextResponse.redirect(new URL('/demo', process.env.NEXT_PUBLIC_BASE_URL || 'https://ottoserv.com'));
    
  } catch (error) {
    console.error('Demo login error:', error);
    return NextResponse.json({ error: 'Demo login failed' }, { status: 500 });
  }
}

export async function GET() {
  return POST(); // Allow GET requests too for easier URL access
}