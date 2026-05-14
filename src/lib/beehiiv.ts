// Beehiiv API Integration for The Operational Waste Report

export interface BeehiivConfig {
  apiKey: string;
  publicationId: string;
  baseUrl?: string;
}

export interface BeehiivSubscriber {
  id?: string;
  email: string;
  status?: 'active' | 'inactive';
  created?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referring_site?: string;
  custom_fields?: {
    [key: string]: any;
  };
}

export interface BeehiivPublication {
  id: string;
  name: string;
  description?: string;
  website_url?: string;
  thumbnail_url?: string;
  subscriber_count?: number;
  created?: string;
}

export interface BeehiivPost {
  id?: string;
  status: 'draft' | 'scheduled' | 'published';
  title: string;
  subtitle?: string;
  content_html: string;
  content_text?: string;
  publish_date?: string;
  featured_image?: string;
  slug?: string;
  authors?: string[];
  tags?: string[];
  stats?: {
    opens?: number;
    clicks?: number;
    open_rate?: number;
    click_rate?: number;
  };
  custom_fields?: {
    [key: string]: any;
  };
}

export interface BeehiivStats {
  subscriber_count: number;
  total_posts: number;
  avg_open_rate: number;
  avg_click_rate: number;
  growth_rate: number;
  recent_posts: Array<{
    id: string;
    title: string;
    publish_date: string;
    stats: {
      opens: number;
      clicks: number;
      open_rate: number;
      click_rate: number;
    };
  }>;
}

export class BeehiivAPI {
  private apiKey: string;
  private publicationId: string;
  private baseUrl: string;

  constructor(config: BeehiivConfig) {
    this.apiKey = config.apiKey;
    this.publicationId = config.publicationId;
    this.baseUrl = config.baseUrl || 'https://api.beehiiv.com/v2';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Beehiiv API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  // Publication methods
  async getPublication(): Promise<BeehiivPublication> {
    return this.request<BeehiivPublication>(`/publications/${this.publicationId}`);
  }

  async getPublicationStats(): Promise<BeehiivStats> {
    const [publication, posts] = await Promise.all([
      this.getPublication(),
      this.getPosts({ limit: 10 })
    ]);

    // Calculate stats from recent posts
    const recentPosts = posts.slice(0, 5);
    const totalOpens = recentPosts.reduce((sum, post) => sum + (post.stats?.opens || 0), 0);
    const totalClicks = recentPosts.reduce((sum, post) => sum + (post.stats?.clicks || 0), 0);
    const totalSent = recentPosts.length * (publication.subscriber_count || 0);

    return {
      subscriber_count: publication.subscriber_count || 0,
      total_posts: posts.length,
      avg_open_rate: totalSent > 0 ? (totalOpens / totalSent) * 100 : 0,
      avg_click_rate: totalSent > 0 ? (totalClicks / totalSent) * 100 : 0,
      growth_rate: 0, // Would need historical data to calculate
      recent_posts: recentPosts.map(post => ({
        id: post.id!,
        title: post.title,
        publish_date: post.publish_date || '',
        stats: {
          opens: post.stats?.opens || 0,
          clicks: post.stats?.clicks || 0,
          open_rate: post.stats?.open_rate || 0,
          click_rate: post.stats?.click_rate || 0,
        }
      }))
    };
  }

  // Subscriber methods
  async addSubscriber(subscriber: BeehiivSubscriber): Promise<BeehiivSubscriber> {
    const result = await this.request<{ data: BeehiivSubscriber }>(
      `/publications/${this.publicationId}/subscriptions`,
      {
        method: 'POST',
        body: JSON.stringify(subscriber),
      }
    );
    return result.data;
  }

  async getSubscriber(email: string): Promise<BeehiivSubscriber | null> {
    try {
      const result = await this.request<{ data: BeehiivSubscriber[] }>(
        `/publications/${this.publicationId}/subscriptions?email=${encodeURIComponent(email)}`
      );
      return result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async updateSubscriber(subscriberId: string, updates: Partial<BeehiivSubscriber>): Promise<BeehiivSubscriber> {
    const result = await this.request<{ data: BeehiivSubscriber }>(
      `/publications/${this.publicationId}/subscriptions/${subscriberId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
    return result.data;
  }

  async unsubscribeSubscriber(subscriberId: string): Promise<void> {
    await this.request<void>(
      `/publications/${this.publicationId}/subscriptions/${subscriberId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async getSubscribers(options: {
    limit?: number;
    page?: number;
    status?: 'active' | 'inactive';
  } = {}): Promise<BeehiivSubscriber[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.page) params.set('page', options.page.toString());
    if (options.status) params.set('status', options.status);

    const result = await this.request<{ data: BeehiivSubscriber[] }>(
      `/publications/${this.publicationId}/subscriptions?${params.toString()}`
    );
    return result.data;
  }

  // Post/Newsletter methods
  async createPost(post: BeehiivPost): Promise<BeehiivPost> {
    const result = await this.request<{ data: BeehiivPost }>(
      `/publications/${this.publicationId}/posts`,
      {
        method: 'POST',
        body: JSON.stringify(post),
      }
    );
    return result.data;
  }

  async publishPost(postId: string, publishDate?: string): Promise<BeehiivPost> {
    const result = await this.request<{ data: BeehiivPost }>(
      `/publications/${this.publicationId}/posts/${postId}/publish`,
      {
        method: 'POST',
        body: JSON.stringify({
          publish_date: publishDate || new Date().toISOString(),
        }),
      }
    );
    return result.data;
  }

  async getPosts(options: {
    limit?: number;
    page?: number;
    status?: 'draft' | 'scheduled' | 'published';
  } = {}): Promise<BeehiivPost[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.page) params.set('page', options.page.toString());
    if (options.status) params.set('status', options.status);

    const result = await this.request<{ data: BeehiivPost[] }>(
      `/publications/${this.publicationId}/posts?${params.toString()}`
    );
    return result.data;
  }

  async getPost(postId: string): Promise<BeehiivPost> {
    const result = await this.request<{ data: BeehiivPost }>(
      `/publications/${this.publicationId}/posts/${postId}`
    );
    return result.data;
  }

  // Analytics methods
  async getPostAnalytics(postId: string): Promise<any> {
    return this.request<any>(
      `/publications/${this.publicationId}/posts/${postId}/stats`
    );
  }

  async getPublicationAnalytics(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);

    const queryString = params.toString();
    const endpoint = queryString 
      ? `/publications/${this.publicationId}/analytics?${queryString}`
      : `/publications/${this.publicationId}/analytics`;

    return this.request<any>(endpoint);
  }

  // Sync methods for integration with Supabase
  async syncSubscribersToSupabase(supabaseUrl: string, supabaseKey: string): Promise<{
    synced: number;
    errors: string[];
  }> {
    const subscribers = await this.getSubscribers({ limit: 1000 });
    const errors: string[] = [];
    let synced = 0;

    for (const subscriber of subscribers) {
      try {
        const supabasePayload = {
          email: subscriber.email,
          beehiiv_subscriber_id: subscriber.id,
          status: subscriber.status === 'active' ? 'active' : 'unsubscribed',
          utm_source: subscriber.utm_source || '',
          utm_medium: subscriber.utm_medium || '',
          utm_campaign: subscriber.utm_campaign || '',
          signup_date: subscriber.created || new Date().toISOString(),
          source: subscriber.utm_source || 'beehiiv_import',
        };

        const response = await fetch(`${supabaseUrl}/rest/v1/newsletter_subscribers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=ignore-duplicates',
          },
          body: JSON.stringify(supabasePayload),
        });

        if (response.ok) {
          synced++;
        } else {
          const error = await response.text();
          errors.push(`Failed to sync ${subscriber.email}: ${error}`);
        }
      } catch (error) {
        errors.push(`Error syncing ${subscriber.email}: ${error}`);
      }
    }

    return { synced, errors };
  }
}

// Factory function for creating BeehiivAPI instance
export function createBeehiivAPI(): BeehiivAPI {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    throw new Error('Missing required Beehiiv configuration. Please set BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID environment variables.');
  }

  return new BeehiivAPI({
    apiKey,
    publicationId,
  });
}

// Newsletter content templates
export const newsletterTemplates = {
  operationalWasteReport: {
    structure: `
<!-- The Operational Waste Report Issue Template -->
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
  
  <h1 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
    {{TITLE}}
  </h1>
  
  <p style="color: #666; font-style: italic;">
    {{OPENING}}
  </p>
  
  <h2 style="color: #0066cc;">🔍 The Waste</h2>
  <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #ff6b6b;">
    {{WASTE_SECTION}}
  </div>
  
  <h2 style="color: #0066cc;">⚡ The Fix</h2>
  <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #4ecdc4;">
    {{FIX_SECTION}}
  </div>
  
  <h2 style="color: #0066cc;">📊 The ROI</h2>
  <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #45b7d1;">
    {{ROI_SECTION}}
  </div>
  
  <h2 style="color: #0066cc;">🛠️ The Implementation</h2>
  <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #96ceb4;">
    {{IMPLEMENTATION_SECTION}}
  </div>
  
  <h2 style="color: #0066cc;">🎯 The Operator Question</h2>
  <div style="background: #fff3cd; padding: 15px; border: 1px solid #ffeaa7; border-radius: 5px;">
    <strong>{{OPERATOR_QUESTION}}</strong>
  </div>
  
  <div style="margin: 30px 0; padding: 20px; background: #e8f4f8; border-radius: 5px; text-align: center;">
    <p style="margin: 0 0 15px 0; font-weight: bold;">Want me to find operational waste in your business?</p>
    <a href="mailto:{{REPLY_EMAIL}}?subject=AUDIT - {{COMPANY_NAME}}" 
       style="display: inline-block; background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
      Reply 'AUDIT' for a Free Analysis
    </a>
  </div>
  
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
  
  <p style="color: #666; font-size: 12px; text-align: center;">
    The Operational Waste Report | OttoServ<br>
    <a href="{{UNSUBSCRIBE_LINK}}" style="color: #999;">Unsubscribe</a> | 
    <a href="mailto:jonathan@ottoservco.com" style="color: #999;">Contact</a>
  </p>
  
</div>
    `,
    
    sampleIssue: {
      title: "The $5,000/Month Missed Call Problem",
      opening: "Yesterday, a Tampa property manager told me: \"We missed 6 calls while showing an apartment. By the time we called back 2 hours later, 4 of them had already scheduled with someone else.\"",
      wasteSection: "Average missed call in property management = $1,200 potential lease value. Miss 4 calls/week = $5,000/month in lost opportunities. Most property managers miss 15-25% of inbound calls during peak leasing season.",
      fixSection: "1. **Immediate**: Set up call forwarding chain (primary → backup → answering service)\n2. **Better**: Dedicated intake person during peak hours\n3. **Best**: AI call handling that qualifies and books while you're busy",
      roiSection: "An AI operations assistant can answer calls 24/7, qualify prospects, check availability, book appointments, and send confirmations. Cost: $200/month. Value: Captures $5,000+ in monthly missed opportunities.",
      implementationSection: "Start with call forwarding this week. Test AI call handling with one property. Measure missed call reduction and lead capture improvement.",
      operatorQuestion: "How many calls did we miss last week, and what was each potential call worth?"
    }
  }
};