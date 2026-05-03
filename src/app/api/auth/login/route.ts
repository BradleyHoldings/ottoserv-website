import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// User credentials from environment variables (SECURE)
const getUsers = () => {
  return {
    "jonathan@ottoservco.com": {
      password: process.env.JONATHAN_PASSWORD || "ottoserv123",
      user: {
        id: 'jonathan-bradley',
        name: 'Jonathan Bradley',
        email: 'jonathan@ottoservco.com',
        role: 'super_admin',
        isOttoServEmployee: true,
        clientAccess: ['all'],
        permissions: ['view_all_clients', 'manage_client_services', 'view_aggregate_analytics', 'system_admin', 'billing_admin']
      }
    },
    "demo@ottoserv.com": {
      password: "demo",
      user: {
        id: 'demo-user',
        name: 'Demo User',
        email: 'demo@ottoserv.com',
        role: 'demo',
        isOttoServEmployee: false,
        clientAccess: ['demo-clients'],
        permissions: ['view_demo_data']
      }
    },
    // Future client accounts will be added here
    "brandoncroom50@gmail.com": {
      password: process.env.BRANDON_PASSWORD || "temp-brandon-2026",
      user: {
        id: 'brandon-croom',
        name: 'Brandon Croom',
        email: 'brandoncroom50@gmail.com',
        role: 'client',
        isOttoServEmployee: false,
        clientAccess: ['brandon-croom'],
        company: 'Croom Construction',
        permissions: ['view_own_data', 'manage_own_services']
      }
    }
  };
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Get users with environment-based credentials
    const USERS = getUsers();
    
    // Find user
    const userRecord = USERS[email.toLowerCase() as keyof typeof USERS];
    
    if (!userRecord || userRecord.password !== password) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Set authentication cookies
    const cookieStore = await cookies();
    const userData = JSON.stringify(userRecord.user);
    
    cookieStore.set('ottoserv_current_user', userData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    // Set role-specific token
    const token = userRecord.user.role === 'super_admin' ? 'super_admin_token' : 
                  userRecord.user.role === 'demo' ? 'demo_token' : 
                  `client_${userRecord.user.id}_token`;
    
    cookieStore.set('ottoserv_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return NextResponse.json({
      success: true,
      user: userRecord.user,
      message: "Login successful"
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Use POST method to login" },
    { status: 405 }
  );
}