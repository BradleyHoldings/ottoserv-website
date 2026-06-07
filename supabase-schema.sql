-- The Operational Waste Report Newsletter System Database Schema
-- Execute this in Supabase SQL Editor

-- Table 1: Newsletter Subscribers
CREATE TABLE newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    source VARCHAR(100) DEFAULT 'direct',
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_term VARCHAR(100),
    utm_content VARCHAR(100),
    referrer TEXT,
    user_agent TEXT,
    signup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    beehiiv_subscriber_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'unsubscribed')),
    lead_quality_score INTEGER DEFAULT 50 CHECK (lead_quality_score >= 0 AND lead_quality_score <= 100),
    engagement_level VARCHAR(10) DEFAULT 'cold' CHECK (engagement_level IN ('cold', 'warm', 'hot')),
    last_email_opened TIMESTAMP WITH TIME ZONE,
    total_emails_opened INTEGER DEFAULT 0,
    last_link_clicked TIMESTAMP WITH TIME ZONE,
    total_links_clicked INTEGER DEFAULT 0,
    unsubscribed_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: Audit Requests
CREATE TABLE audit_requests (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'operational_waste_audit',
    source VARCHAR(100) NOT NULL,
    utm_source VARCHAR(100),
    company_name VARCHAR(255),
    phone VARCHAR(50),
    business_type VARCHAR(100),
    pain_points TEXT[], -- Array of pain points mentioned
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    estimated_value INTEGER DEFAULT 2000,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    audit_findings TEXT,
    recommendations TEXT,
    follow_up_notes TEXT,
    sales_opportunity_created BOOLEAN DEFAULT FALSE,
    converted_to_customer BOOLEAN DEFAULT FALSE,
    actual_deal_value INTEGER,
    notes TEXT,
    assigned_to VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: Platform Improvement Signals
CREATE TABLE platform_improvement_signals (
    id SERIAL PRIMARY KEY,
    signal_description TEXT NOT NULL,
    source VARCHAR(100) NOT NULL, -- 'newsletter_reply', 'audit_call', 'contact_form', 'survey'
    email VARCHAR(255),
    company_name VARCHAR(255),
    business_type VARCHAR(100),
    urgency VARCHAR(10) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
    revenue_impact_potential INTEGER DEFAULT 0, -- Estimated monthly revenue impact
    pain_point_category VARCHAR(100), -- 'lead_capture', 'follow_up', 'communication', 'admin', 'reporting', etc.
    specific_tools_mentioned TEXT[],
    current_workarounds TEXT,
    ideal_solution_described TEXT,
    willingness_to_pay VARCHAR(50), -- 'high', 'medium', 'low', 'unknown'
    implementation_status VARCHAR(50) DEFAULT 'identified' CHECK (implementation_status IN ('identified', 'evaluating', 'planned', 'in_development', 'completed')),
    decision_notes TEXT,
    implementation_timeline VARCHAR(50),
    responsible_team_member VARCHAR(100),
    signal_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: Newsletter Performance Metrics
CREATE TABLE newsletter_performance (
    id SERIAL PRIMARY KEY,
    issue_number INTEGER NOT NULL,
    issue_title VARCHAR(255),
    publish_date TIMESTAMP WITH TIME ZONE NOT NULL,
    beehiiv_issue_id VARCHAR(100),
    total_subscribers INTEGER NOT NULL,
    emails_sent INTEGER NOT NULL,
    emails_delivered INTEGER,
    emails_opened INTEGER DEFAULT 0,
    unique_opens INTEGER DEFAULT 0,
    links_clicked INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    unsubscribes INTEGER DEFAULT 0,
    spam_reports INTEGER DEFAULT 0,
    open_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN emails_delivered > 0 
        THEN (unique_opens::DECIMAL / emails_delivered::DECIMAL) * 100 
        ELSE 0 END
    ) STORED,
    click_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN emails_delivered > 0 
        THEN (unique_clicks::DECIMAL / emails_delivered::DECIMAL) * 100 
        ELSE 0 END
    ) STORED,
    audit_requests_generated INTEGER DEFAULT 0,
    sales_conversations_initiated INTEGER DEFAULT 0,
    revenue_attributed INTEGER DEFAULT 0,
    top_performing_content TEXT,
    improvement_signals_captured INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 5: Weekly Reporting Data
CREATE TABLE weekly_reports (
    id SERIAL PRIMARY KEY,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_subscribers_start INTEGER NOT NULL,
    total_subscribers_end INTEGER NOT NULL,
    new_subscribers INTEGER DEFAULT 0,
    unsubscribes INTEGER DEFAULT 0,
    net_growth INTEGER GENERATED ALWAYS AS (new_subscribers - unsubscribes) STORED,
    growth_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_subscribers_start > 0 
        THEN (net_growth::DECIMAL / total_subscribers_start::DECIMAL) * 100 
        ELSE 0 END
    ) STORED,
    top_subscriber_sources TEXT[],
    total_audit_requests INTEGER DEFAULT 0,
    high_priority_audit_requests INTEGER DEFAULT 0,
    sales_conversations_initiated INTEGER DEFAULT 0,
    pipeline_value_created INTEGER DEFAULT 0,
    revenue_closed INTEGER DEFAULT 0,
    improvement_signals_identified INTEGER DEFAULT 0,
    newsletter_issues_published INTEGER DEFAULT 0,
    avg_open_rate DECIMAL(5,2) DEFAULT 0,
    avg_click_rate DECIMAL(5,2) DEFAULT 0,
    best_performing_content TEXT,
    worst_performing_content TEXT,
    key_insights TEXT,
    next_week_strategy TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_source ON newsletter_subscribers(source);
CREATE INDEX idx_newsletter_subscribers_signup_date ON newsletter_subscribers(signup_date);
CREATE INDEX idx_newsletter_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX idx_newsletter_subscribers_engagement ON newsletter_subscribers(engagement_level);

CREATE INDEX idx_audit_requests_email ON audit_requests(email);
CREATE INDEX idx_audit_requests_status ON audit_requests(status);
CREATE INDEX idx_audit_requests_priority ON audit_requests(priority);
CREATE INDEX idx_audit_requests_request_date ON audit_requests(request_date);
CREATE INDEX idx_audit_requests_source ON audit_requests(source);

CREATE INDEX idx_platform_signals_source ON platform_improvement_signals(source);
CREATE INDEX idx_platform_signals_urgency ON platform_improvement_signals(urgency);
CREATE INDEX idx_platform_signals_status ON platform_improvement_signals(implementation_status);
CREATE INDEX idx_platform_signals_date ON platform_improvement_signals(signal_date);

CREATE INDEX idx_newsletter_performance_publish_date ON newsletter_performance(publish_date);
CREATE INDEX idx_newsletter_performance_issue_number ON newsletter_performance(issue_number);

CREATE INDEX idx_weekly_reports_week_start ON weekly_reports(week_start_date);

-- Functions for automated data updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at timestamps
CREATE TRIGGER update_newsletter_subscribers_updated_at 
    BEFORE UPDATE ON newsletter_subscribers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_requests_updated_at 
    BEFORE UPDATE ON audit_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_improvement_signals_updated_at 
    BEFORE UPDATE ON platform_improvement_signals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_performance_updated_at 
    BEFORE UPDATE ON newsletter_performance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_reports_updated_at 
    BEFORE UPDATE ON weekly_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_improvement_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- Policy for service role (backend API access)
CREATE POLICY "Service role can manage all data" ON newsletter_subscribers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all data" ON audit_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all data" ON platform_improvement_signals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all data" ON newsletter_performance FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all data" ON weekly_reports FOR ALL USING (auth.role() = 'service_role');

-- Views for common queries
CREATE VIEW subscriber_growth_summary AS
SELECT 
    DATE_TRUNC('week', signup_date) as week,
    COUNT(*) as new_subscribers,
    COUNT(*) FILTER (WHERE source = 'linkedin') as from_linkedin,
    COUNT(*) FILTER (WHERE source = 'referral') as from_referrals,
    COUNT(*) FILTER (WHERE source = 'google') as from_google,
    COUNT(*) FILTER (WHERE engagement_level = 'hot') as hot_leads,
    AVG(lead_quality_score) as avg_lead_score
FROM newsletter_subscribers 
WHERE status = 'active'
GROUP BY DATE_TRUNC('week', signup_date)
ORDER BY week DESC;

CREATE VIEW audit_pipeline_summary AS
SELECT 
    DATE_TRUNC('week', request_date) as week,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE sales_opportunity_created = true) as sales_opps_created,
    COUNT(*) FILTER (WHERE converted_to_customer = true) as conversions,
    SUM(estimated_value) as total_estimated_value,
    SUM(actual_deal_value) FILTER (WHERE actual_deal_value IS NOT NULL) as total_actual_value
FROM audit_requests 
GROUP BY DATE_TRUNC('week', request_date)
ORDER BY week DESC;

CREATE VIEW platform_signal_priorities AS
SELECT 
    pain_point_category,
    COUNT(*) as signal_count,
    SUM(revenue_impact_potential) as total_revenue_potential,
    COUNT(*) FILTER (WHERE urgency = 'high') as high_urgency_signals,
    COUNT(*) FILTER (WHERE implementation_status = 'planned') as planned_implementations
FROM platform_improvement_signals 
WHERE implementation_status != 'completed'
GROUP BY pain_point_category
ORDER BY total_revenue_potential DESC, signal_count DESC;

-- Sample data for testing (remove in production)
INSERT INTO newsletter_subscribers (email, source, utm_source, lead_quality_score, engagement_level) VALUES
('test1@example.com', 'linkedin', 'linkedin_post', 75, 'hot'),
('test2@example.com', 'referral', 'partner_referral', 85, 'hot'),
('test3@example.com', 'google', 'organic_search', 60, 'warm');

INSERT INTO audit_requests (email, company_name, business_type, source, priority, estimated_value) VALUES
('test1@example.com', 'Test Property Management', 'property management', 'newsletter_page', 'high', 5000),
('test2@example.com', 'Test HVAC Co', 'hvac contractor', 'linkedin', 'medium', 3000);

-- Grant permissions for authenticated users to read their own data
CREATE POLICY "Users can view their own data" ON newsletter_subscribers FOR SELECT USING (auth.email() = email);
CREATE POLICY "Users can view their own data" ON audit_requests FOR SELECT USING (auth.email() = email);

-- ============================================================================
-- Migration 2026-05-14: Newsletter system hardening
-- Safe to re-run; uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ============================================================================

-- newsletter_subscribers: per-subscriber Beehiiv sync status + lightweight CRM
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role VARCHAR(120),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS beehiiv_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS beehiiv_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS beehiiv_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Widen status to allow the new beehiiv_sync_failed bucket.
-- (Drop the old CHECK and recreate; Postgres does not let us add an option in place.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'newsletter_subscribers'
      AND constraint_name = 'newsletter_subscribers_status_check'
  ) THEN
    ALTER TABLE newsletter_subscribers DROP CONSTRAINT newsletter_subscribers_status_check;
  END IF;
END$$;
ALTER TABLE newsletter_subscribers
  ADD CONSTRAINT newsletter_subscribers_status_check
  CHECK (status IN ('active', 'pending', 'unsubscribed', 'bounced', 'beehiiv_sync_failed'));

-- audit_requests: capture the richer intake form
ALTER TABLE audit_requests
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS website VARCHAR(255),
  ADD COLUMN IF NOT EXISTS biggest_operational_bottleneck TEXT,
  ADD COLUMN IF NOT EXISTS current_tools_or_crm TEXT,
  ADD COLUMN IF NOT EXISTS consent_to_contact BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_beehiiv_status
  ON newsletter_subscribers(beehiiv_status);

-- ============================================================================
-- Migration 2026-05-26: Free Front Office Leak Check / Process Scan Engine
-- Safe to re-run. Creates the dedicated process_scans table used by
-- /front-office-leak-check and /dashboard/process-scans.
-- ============================================================================

CREATE TABLE IF NOT EXISTS process_scans (
    id TEXT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(255),
    industry VARCHAR(120),
    business_type VARCHAR(120),
    main_leak VARCHAR(120) NOT NULL,
    process_name VARCHAR(255) NOT NULL,
    process_type VARCHAR(120),
    software_used TEXT,
    current_process_description TEXT NOT NULL,
    failure_impact TEXT,
    monthly_lead_volume VARCHAR(120),
    best_time_to_contact VARCHAR(255),
    recording_url TEXT,
    recording_status VARCHAR(60) DEFAULT 'not_provided',
    audio_status VARCHAR(60) DEFAULT 'unknown',
    audio_included BOOLEAN DEFAULT false,
    gap_tags_json JSONB DEFAULT '[]'::jsonb,
    other_gap_text TEXT,
    clarification_answers_json JSONB DEFAULT '{}'::jsonb,
    report_confidence VARCHAR(20) DEFAULT 'Low',
    report_confidence_reason TEXT,
    observed_from_recording_json JSONB DEFAULT '[]'::jsonb,
    reported_by_user_json JSONB DEFAULT '[]'::jsonb,
    could_not_confirm_json JSONB DEFAULT '[]'::jsonb,
    top_workflow_leaks_json JSONB DEFAULT '[]'::jsonb,
    information_gaps_json JSONB DEFAULT '[]'::jsonb,
    current_state_workflow_map_json JSONB DEFAULT '{}'::jsonb,
    future_state_workflow_map_json JSONB DEFAULT '{}'::jsonb,
    ai_recommendation_json JSONB DEFAULT '{}'::jsonb,
    revenue_risks_json JSONB DEFAULT '[]'::jsonb,
    priority_ranking_json JSONB DEFAULT '[]'::jsonb,
    practical_next_actions_json JSONB DEFAULT '[]'::jsonb,
    analysis_status VARCHAR(60) DEFAULT 'pending',
    transcript TEXT,
    process_summary TEXT,
    sop_markdown TEXT,
    flowchart_json JSONB,
    bottlenecks_json JSONB,
    automation_opportunities_json JSONB,
    ai_employee_recommendation TEXT,
    recommended_next_step TEXT,
    source_page VARCHAR(120) DEFAULT 'front_office_leak_check',
    public_report_slug TEXT UNIQUE NOT NULL,
    public_report_url TEXT,
    report_status VARCHAR(60) DEFAULT 'draft',
    report_ready_at TIMESTAMP WITH TIME ZONE,
    executive_summary TEXT,
    current_state_flowchart_json JSONB,
    current_state_flowchart_mermaid TEXT,
    future_state_flowchart_json JSONB,
    future_state_flowchart_mermaid TEXT,
    leaks_detected_json JSONB,
    current_sop_markdown TEXT,
    recommended_sop_markdown TEXT,
    estimated_value_summary TEXT,
    pilot_recommendation TEXT,
    email_subject TEXT,
    email_preview_text TEXT,
    email_body_markdown TEXT,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(60) DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE process_scans
  ADD COLUMN IF NOT EXISTS revenue_risks_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS priority_ranking_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS practical_next_actions_json JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_process_scans_created_at ON process_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_process_scans_email ON process_scans(email);
CREATE INDEX IF NOT EXISTS idx_process_scans_status ON process_scans(status);
CREATE INDEX IF NOT EXISTS idx_process_scans_report_status ON process_scans(report_status);
CREATE INDEX IF NOT EXISTS idx_process_scans_public_report_slug ON process_scans(public_report_slug);

ALTER TABLE process_scans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'process_scans'
      AND policyname = 'Service role can manage process scans'
  ) THEN
    CREATE POLICY "Service role can manage process scans"
      ON process_scans FOR ALL USING (auth.role() = 'service_role');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS process_scan_conversion_events (
    id TEXT PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    scan_id TEXT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    phone VARCHAR(60),
    workflow TEXT NOT NULL,
    preferred_start_date VARCHAR(60),
    notes TEXT,
    consent_to_contact BOOLEAN DEFAULT false,
    source_page VARCHAR(120) DEFAULT 'front_office_leak_check_start_pilot',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_process_scan_conversion_events_created_at ON process_scan_conversion_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_process_scan_conversion_events_scan_id ON process_scan_conversion_events(scan_id);
CREATE INDEX IF NOT EXISTS idx_process_scan_conversion_events_email ON process_scan_conversion_events(email);

ALTER TABLE process_scan_conversion_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'process_scan_conversion_events'
      AND policyname = 'Service role can manage process scan conversion events'
  ) THEN
    CREATE POLICY "Service role can manage process scan conversion events"
      ON process_scan_conversion_events FOR ALL USING (auth.role() = 'service_role');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_process_scans_updated_at'
  ) THEN
    CREATE TRIGGER update_process_scans_updated_at
      BEFORE UPDATE ON process_scans
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;
