import { NextRequest, NextResponse } from 'next/server';

interface DashboardData {
  totalSubscribers: number;
  newSubscribersThisWeek: number;
  growthRate: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalAuditRequests: number;
  recentIssues: Array<{
    id: string;
    title: string;
    publishDate: string;
    stats: {
      sent: number;
      opened: number;
      clicked: number;
      openRate: number;
      clickRate: number;
      auditRequests: number;
    };
  }>;
  topSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  recentSubscribers: Array<{
    email: string;
    source: string;
    signupDate: string;
    engagementLevel: 'cold' | 'warm' | 'hot';
  }>;
  pendingAuditRequests: Array<{
    id: string;
    email: string;
    companyName: string;
    businessType: string;
    priority: 'low' | 'medium' | 'high';
    requestDate: string;
    estimatedValue: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // This would typically involve multiple database queries
    // For now, we'll return mock data that represents the structure

    const dashboardData: DashboardData = {
      totalSubscribers: 1247,
      newSubscribersThisWeek: 73,
      growthRate: 12.3,
      avgOpenRate: 34.7,
      avgClickRate: 6.2,
      totalAuditRequests: 28,
      recentIssues: [
        {
          id: '1',
          title: 'The $5,000/Month Missed Call Problem',
          publishDate: '2026-05-07',
          stats: {
            sent: 1247,
            opened: 432,
            clicked: 89,
            openRate: 34.7,
            clickRate: 7.1,
            auditRequests: 12
          }
        },
        {
          id: '2',
          title: 'Why Your CRM Isn\'t Fixing Follow-Up Problems',
          publishDate: '2026-04-30',
          stats: {
            sent: 1174,
            opened: 398,
            clicked: 67,
            openRate: 33.9,
            clickRate: 5.7,
            auditRequests: 8
          }
        },
        {
          id: '3',
          title: 'How Many Opportunities Die Before You See Them?',
          publishDate: '2026-04-23',
          stats: {
            sent: 1089,
            opened: 392,
            clicked: 61,
            openRate: 36.0,
            clickRate: 5.6,
            auditRequests: 5
          }
        }
      ],
      topSources: [
        { source: 'linkedin', count: 423, percentage: 33.9 },
        { source: 'referral', count: 287, percentage: 23.0 },
        { source: 'google', count: 198, percentage: 15.9 },
        { source: 'newsletter_page', count: 165, percentage: 13.2 },
        { source: 'facebook', count: 98, percentage: 7.9 },
        { source: 'email', count: 76, percentage: 6.1 }
      ],
      recentSubscribers: [
        {
          email: 'sarah.manager@propertyco.com',
          source: 'linkedin',
          signupDate: '2026-05-13',
          engagementLevel: 'hot'
        },
        {
          email: 'mike.contractor@hvacpro.com',
          source: 'referral',
          signupDate: '2026-05-13',
          engagementLevel: 'hot'
        },
        {
          email: 'jennifer@coastalproperties.com',
          source: 'google',
          signupDate: '2026-05-12',
          engagementLevel: 'warm'
        },
        {
          email: 'david.ops@buildingservices.net',
          source: 'newsletter_page',
          signupDate: '2026-05-12',
          engagementLevel: 'warm'
        },
        {
          email: 'info@cityplumbing.com',
          source: 'facebook',
          signupDate: '2026-05-11',
          engagementLevel: 'cold'
        }
      ],
      pendingAuditRequests: [
        {
          id: 'audit_1',
          email: 'sarah.manager@propertyco.com',
          companyName: 'Coastal Property Management',
          businessType: 'property management',
          priority: 'high',
          requestDate: '2026-05-13',
          estimatedValue: 5000
        },
        {
          id: 'audit_2',
          email: 'mike.contractor@hvacpro.com',
          companyName: 'HVAC Pro Solutions',
          businessType: 'hvac contractor',
          priority: 'medium',
          requestDate: '2026-05-12',
          estimatedValue: 3000
        },
        {
          id: 'audit_3',
          email: 'operations@facilitycare.net',
          companyName: 'Facility Care Services',
          businessType: 'facilities management',
          priority: 'medium',
          requestDate: '2026-05-11',
          estimatedValue: 4000
        },
        {
          id: 'audit_4',
          email: 'owner@quickfix.com',
          companyName: 'Quick Fix Home Services',
          businessType: 'home services',
          priority: 'low',
          requestDate: '2026-05-10',
          estimatedValue: 2500
        }
      ]
    };

    // In production, replace this with actual database queries:
    /*
    // Get total subscribers
    const subscribersResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/newsletter_subscribers?select=count&status=eq.active`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    // Get weekly growth
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyGrowthResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/newsletter_subscribers?select=count&status=eq.active&signup_date=gte.${oneWeekAgo.toISOString()}`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    // Get audit requests
    const auditRequestsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/audit_requests?select=*&status=eq.pending&order=request_date.desc`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    // Get newsletter performance
    const performanceResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/newsletter_performance?select=*&order=publish_date.desc&limit=5`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    // Get subscriber sources
    const sourcesResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_subscriber_sources`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    // Get recent subscribers
    const recentSubscribersResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/newsletter_subscribers?select=email,source,signup_date,engagement_level&status=eq.active&order=signup_date.desc&limit=10`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    */

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}

// Additional database query functions that would be used in production:

/*
async function getSubscriberCount(): Promise<number> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/newsletter_subscribers?select=count&status=eq.active`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) throw new Error('Failed to fetch subscriber count');
  
  const data = await response.json();
  return data[0]?.count || 0;
}

async function getWeeklyGrowth(): Promise<{ newSubscribers: number; growthRate: number }> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Get subscribers from this week
  const thisWeekResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/newsletter_subscribers?select=count&status=eq.active&signup_date=gte.${oneWeekAgo.toISOString()}`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  // Get subscribers from last week for comparison
  const lastWeekResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/newsletter_subscribers?select=count&status=eq.active&signup_date=gte.${twoWeeksAgo.toISOString()}&signup_date=lt.${oneWeekAgo.toISOString()}`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  const thisWeekCount = (await thisWeekResponse.json())[0]?.count || 0;
  const lastWeekCount = (await lastWeekResponse.json())[0]?.count || 0;

  const growthRate = lastWeekCount > 0 ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100 : 0;

  return {
    newSubscribers: thisWeekCount,
    growthRate: parseFloat(growthRate.toFixed(1))
  };
}

async function getNewsletterPerformance(): Promise<any[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/newsletter_performance?select=*&order=publish_date.desc&limit=5`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (!response.ok) throw new Error('Failed to fetch newsletter performance');
  
  return response.json();
}

async function getSubscriberSources(): Promise<Array<{ source: string; count: number; percentage: number }>> {
  // This would use a Supabase RPC function for efficient aggregation
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_subscriber_sources`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) throw new Error('Failed to fetch subscriber sources');
  
  return response.json();
}

async function getPendingAuditRequests(): Promise<any[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/audit_requests?select=*&status=eq.pending&order=request_date.desc`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (!response.ok) throw new Error('Failed to fetch audit requests');
  
  return response.json();
}
*/