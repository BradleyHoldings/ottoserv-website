export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  service_needed: string;
  budget: string;
  status: string;
  lead_score: number;
  assigned_to: string;
  created_at: string;
}

export interface Project {
  id: string;
  client_name: string;
  project_name: string;
  project_type: string;
  status: string;
  phase: string;
  start_date: string;
  target_completion: string;
  estimated_revenue: number;
  estimated_cost: number;
  actual_cost: number;
  gross_margin: number;
  percent_complete: number;
  risk_level: string;
  address: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  status: string;
  priority: string;
  assigned_to: string;
  due_date: string;
  lead_id?: string;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  status: string;
  last_run: string;
  next_run: string | null;
  success_count: number;
  failure_count: number;
  connected_systems: string[];
}

export interface Alert {
  type: string;
  title: string;
  description: string;
  severity: string;
}

export interface SOP {
  id: string;
  title: string;
  category: string;
  description: string;
  steps: string[];
  last_updated: string;
  version: string;
  status: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  type: string;
  last_generated: string | null;
  period: string;
  status: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: string;
  category: string;
  connected_at?: string;
}

export interface MarketingPost {
  id: string;
  title: string;
  content: string;
  platform: string;
  status: string;
  scheduled_for?: string;
  published_at?: string;
  likes: number;
  comments: number;
}

export interface Invoice {
  id: string;
  client_name: string;
  project_id: string;
  amount: number;
  status: string;
  issued_date: string;
  due_date: string;
  paid_date?: string;
}

export interface Expense {
  id: string;
  project_id: string | null;
  vendor: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  receipt_status: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  supplier: string;
  project_id?: string;
  status: string;
}

export interface Message {
  id: string;
  from: string;
  from_email: string;
  subject: string;
  preview: string;
  body: string;
  status: string;
  received_at: string;
  category: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  client_name?: string;
  type: string;
  start: string;
  end: string;
  location?: string;
  status: string;
  notes?: string;
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

export const mockKpis = {
  activeJobs: 7,
  todayAppointments: 3,
  overdueTasks: 4,
  newLeads: 5,
  revenueThisMonth: 47500,
  billingDue: 12800,
  openEstimates: 3,
  atRiskProjects: 1,
};

// ── Business Brief ─────────────────────────────────────────────────────────────

export const mockBrief =
  "Project Johnson Kitchen is trending 6 days behind schedule and material costs are 18% over budget. Three new leads require follow-up. Two invoices are overdue totaling $8,400. Recommended: review project schedule and send client update.";

// ── Alerts ────────────────────────────────────────────────────────────────────

export const mockAlerts: Alert[] = [
  { type: "overdue_invoice", title: "Invoice #1042 overdue", description: "Johnson Kitchen — $4,200 — 15 days overdue", severity: "high" },
  { type: "unanswered_lead", title: "New lead needs follow-up", description: "Sarah Mitchell — Kitchen remodel — 2 days no response", severity: "medium" },
  { type: "project_behind", title: "Project behind schedule", description: "Johnson Kitchen — 6 days behind target completion", severity: "high" },
  { type: "missed_appointment", title: "Appointment not confirmed", description: "Derek Walsh walkthrough — Tomorrow 2pm", severity: "medium" },
];

// ── Leads ─────────────────────────────────────────────────────────────────────

export const mockLeads: Lead[] = [
  { id: "LEAD-001", name: "Sarah Mitchell", phone: "813-555-0199", email: "sarah@home.com", source: "referral", service_needed: "Kitchen remodel", budget: "$35-45k", status: "new", lead_score: 85, assigned_to: "Owner", created_at: "2026-04-26" },
  { id: "LEAD-002", name: "Derek Walsh", phone: "555-887-2201", email: "derek@gmail.com", source: "google", service_needed: "Deck replacement", budget: "$15-20k", status: "estimate_scheduled", lead_score: 72, assigned_to: "Owner", created_at: "2026-04-24" },
  { id: "LEAD-003", name: "Maria Gonzalez", phone: "555-201-3344", email: "maria@email.com", source: "referral", service_needed: "Bathroom renovation", budget: "$25-30k", status: "qualified", lead_score: 90, assigned_to: "Owner", created_at: "2026-04-22" },
  { id: "LEAD-004", name: "Tom Rivera", phone: "555-443-8812", email: "tom.r@company.com", source: "website", service_needed: "Basement finishing", budget: "$40-60k", status: "estimate_sent", lead_score: 78, assigned_to: "Owner", created_at: "2026-04-20" },
  { id: "LEAD-005", name: "Jennifer Park", phone: "555-667-9901", email: "jpark@outlook.com", source: "facebook", service_needed: "Master bath remodel", budget: "$20-28k", status: "follow_up", lead_score: 65, assigned_to: "Owner", created_at: "2026-04-18" },
  { id: "LEAD-006", name: "Robert Chen", phone: "555-112-3345", email: "rchen@gmail.com", source: "referral", service_needed: "Whole home renovation", budget: "$80-120k", status: "contacted", lead_score: 95, assigned_to: "Owner", created_at: "2026-04-15" },
  { id: "LEAD-007", name: "Lisa Thompson", phone: "555-778-4456", email: "lisa.t@email.com", source: "google", service_needed: "Garage conversion", budget: "$30-40k", status: "won", lead_score: 88, assigned_to: "Owner", created_at: "2026-04-10" },
  { id: "LEAD-008", name: "Mike Johnson", phone: "555-223-6678", email: "mjohnson@email.com", source: "yelp", service_needed: "Kitchen update", budget: "$15-20k", status: "lost", lead_score: 45, assigned_to: "Owner", created_at: "2026-04-08" },
];

// ── Projects ──────────────────────────────────────────────────────────────────

export const mockProjects: Project[] = [
  { id: "PRJ-001", client_name: "Sandra Okafor", project_name: "Master Bathroom Renovation", project_type: "bathroom", status: "in_progress", phase: "Install", start_date: "2026-04-21", target_completion: "2026-05-21", estimated_revenue: 18500, estimated_cost: 14000, actual_cost: 3640, gross_margin: 24, percent_complete: 60, risk_level: "low", address: "2201 River Rd" },
  { id: "PRJ-002", client_name: "Mike Johnson", project_name: "Johnson Kitchen Remodel", project_type: "kitchen", status: "in_progress", phase: "Rough-In", start_date: "2026-04-15", target_completion: "2026-05-30", estimated_revenue: 42000, estimated_cost: 31500, actual_cost: 18200, gross_margin: 25, percent_complete: 35, risk_level: "high", address: "445 Oak Lane" },
  { id: "PRJ-003", client_name: "Lisa Thompson", project_name: "Garage Conversion ADU", project_type: "addition", status: "planning", phase: "Permits", start_date: "2026-05-05", target_completion: "2026-07-15", estimated_revenue: 38000, estimated_cost: 28500, actual_cost: 0, gross_margin: 25, percent_complete: 5, risk_level: "medium", address: "89 Pine St" },
  { id: "PRJ-004", client_name: "Tom Carter", project_name: "Hall Bathroom Update", project_type: "bathroom", status: "complete", phase: "Closed", start_date: "2026-03-01", target_completion: "2026-04-01", estimated_revenue: 9800, estimated_cost: 7200, actual_cost: 7450, gross_margin: 24, percent_complete: 100, risk_level: "low", address: "712 Elm Ave" },
];

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const mockTasks: Task[] = [
  { id: "TASK-001", project_id: "PRJ-001", title: "Order remaining tile from Lowe's", status: "open", priority: "urgent", assigned_to: "Owner", due_date: "2026-04-30" },
  { id: "TASK-002", project_id: "PRJ-001", title: "Schedule plumbing inspection", status: "open", priority: "high", assigned_to: "Owner", due_date: "2026-05-01" },
  { id: "TASK-003", project_id: "PRJ-002", title: "Review cabinet measurements", status: "in_progress", priority: "high", assigned_to: "Jake", due_date: "2026-04-30" },
  { id: "TASK-004", project_id: "PRJ-002", title: "Order countertop material", status: "waiting", priority: "medium", assigned_to: "Owner", due_date: "2026-05-02" },
  { id: "TASK-005", project_id: "PRJ-001", title: "Install shower pan liner", status: "overdue", priority: "high", assigned_to: "Jake", due_date: "2026-04-25" },
  { id: "TASK-006", project_id: "PRJ-003", title: "Submit permit application", status: "open", priority: "high", assigned_to: "Owner", due_date: "2026-05-01" },
  { id: "TASK-007", project_id: "PRJ-002", title: "Client progress update call", status: "needs_approval", priority: "medium", assigned_to: "Owner", due_date: "2026-04-30" },
  { id: "TASK-008", project_id: null, title: "Follow up with Sarah Mitchell", status: "open", priority: "high", assigned_to: "Owner", due_date: "2026-04-30", lead_id: "LEAD-001" },
  { id: "TASK-009", project_id: "PRJ-004", title: "Send final invoice to Tom Carter", status: "overdue", priority: "high", assigned_to: "Owner", due_date: "2026-04-25" },
  { id: "TASK-010", project_id: null, title: "Weekly team meeting", status: "open", priority: "low", assigned_to: "Owner", due_date: "2026-05-02" },
];

// ── Automations ───────────────────────────────────────────────────────────────

export const mockAutomations: Automation[] = [
  { id: "AUTO-001", name: "Lead Follow-Up", description: "Auto-send follow-up email 24hrs after new lead", status: "active", last_run: "2026-04-29T14:00:00Z", next_run: "2026-04-30T14:00:00Z", success_count: 23, failure_count: 1, connected_systems: ["Gmail", "CRM"] },
  { id: "AUTO-002", name: "Appointment Reminders", description: "Send SMS/email reminder 24hrs before appointments", status: "active", last_run: "2026-04-29T08:00:00Z", next_run: "2026-04-30T08:00:00Z", success_count: 45, failure_count: 0, connected_systems: ["Calendar", "SMS"] },
  { id: "AUTO-003", name: "Invoice Reminders", description: "Remind clients of overdue invoices weekly", status: "active", last_run: "2026-04-28T09:00:00Z", next_run: "2026-05-05T09:00:00Z", success_count: 12, failure_count: 2, connected_systems: ["QuickBooks", "Gmail"] },
  { id: "AUTO-004", name: "Weekly Business Report", description: "Generate and send weekly performance summary", status: "active", last_run: "2026-04-27T06:00:00Z", next_run: "2026-05-04T06:00:00Z", success_count: 8, failure_count: 0, connected_systems: ["Analytics", "Gmail"] },
  { id: "AUTO-005", name: "Social Media Posting", description: "Auto-post approved content to social platforms", status: "paused", last_run: "2026-04-20T12:00:00Z", next_run: null, success_count: 15, failure_count: 3, connected_systems: ["Facebook", "Instagram"] },
  { id: "AUTO-006", name: "Receipt Categorization", description: "Auto-categorize uploaded receipts by vendor and type", status: "active", last_run: "2026-04-29T16:30:00Z", next_run: "2026-04-30T16:30:00Z", success_count: 67, failure_count: 4, connected_systems: ["Email", "QuickBooks"] },
  { id: "AUTO-007", name: "Review Requests", description: "Send review request 3 days after project completion", status: "active", last_run: "2026-04-25T10:00:00Z", next_run: "2026-05-01T10:00:00Z", success_count: 5, failure_count: 0, connected_systems: ["Google", "Yelp"] },
  { id: "AUTO-008", name: "Project Risk Alerts", description: "Alert when projects exceed budget or timeline thresholds", status: "needs_attention", last_run: "2026-04-29T07:00:00Z", next_run: "2026-04-30T07:00:00Z", success_count: 10, failure_count: 1, connected_systems: ["Project Tracker"] },
];

// ── SOPs ──────────────────────────────────────────────────────────────────────

export const mockSOPs: SOP[] = [
  {
    id: "SOP-001", title: "New Lead Intake Process", category: "Sales", status: "active", version: "2.1", last_updated: "2026-03-15",
    description: "Standard procedure for qualifying and onboarding new leads",
    steps: ["Record lead source and contact info in CRM", "Send automated welcome email within 2 hrs", "Schedule discovery call within 24 hrs", "Complete lead qualification form", "Assign lead score and next steps"],
  },
  {
    id: "SOP-002", title: "Project Kickoff Checklist", category: "Operations", status: "active", version: "1.3", last_updated: "2026-04-01",
    description: "Checklist for launching a new project after signed contract",
    steps: ["Verify contract signed and deposit received", "Create project in system with all details", "Order materials and schedule deliveries", "Schedule crew and confirm start date", "Send client kickoff email with schedule"],
  },
  {
    id: "SOP-003", title: "Daily Job Site Walkthrough", category: "Quality", status: "active", version: "1.0", last_updated: "2026-02-20",
    description: "End-of-day inspection process for active job sites",
    steps: ["Check progress against daily goals", "Document completed work with photos", "Note any issues or blockers", "Update project completion percentage", "Send client update if milestone reached"],
  },
  {
    id: "SOP-004", title: "Invoice & Payment Collection", category: "Finance", status: "active", version: "1.5", last_updated: "2026-04-10",
    description: "Process for issuing invoices and following up on payments",
    steps: ["Issue invoice within 24 hrs of milestone completion", "Send via email with payment portal link", "Follow up at 7 days if unpaid", "Send final notice at 15 days", "Escalate to collections at 30 days"],
  },
  {
    id: "SOP-005", title: "Employee Time Approval", category: "HR", status: "active", version: "1.2", last_updated: "2026-01-15",
    description: "Weekly time card review and approval process",
    steps: ["Review submitted time cards every Monday", "Verify hours match scheduled work", "Approve or flag for discussion", "Process payroll by Wednesday", "Archive approved records"],
  },
  {
    id: "SOP-006", title: "Client Complaint Resolution", category: "Customer Service", status: "active", version: "1.1", last_updated: "2026-03-01",
    description: "Steps to address and resolve client complaints",
    steps: ["Acknowledge complaint within 4 hrs", "Schedule site visit within 24 hrs if needed", "Document root cause analysis", "Present resolution options to client", "Follow up to confirm satisfaction"],
  },
  {
    id: "SOP-007", title: "Material Ordering Process", category: "Procurement", status: "draft", version: "2.0", last_updated: "2026-04-15",
    description: "Standard process for ordering project materials",
    steps: ["Review material list from project plan", "Get quotes from 2–3 suppliers", "Submit PO for approval if over $500", "Confirm delivery schedule", "Inspect delivery and update inventory"],
  },
];

// ── Reports ───────────────────────────────────────────────────────────────────

export const mockReports: Report[] = [
  { id: "RPT-001", title: "Weekly Business Summary", description: "Overview of all operations, revenue, and tasks for the week", type: "summary", last_generated: "2026-04-27", period: "weekly", status: "ready" },
  { id: "RPT-002", title: "Monthly Revenue Report", description: "Detailed breakdown of revenue, costs, and margins by project", type: "financial", last_generated: "2026-04-01", period: "monthly", status: "ready" },
  { id: "RPT-003", title: "Lead Pipeline Report", description: "Status of all leads and conversion metrics", type: "sales", last_generated: "2026-04-25", period: "weekly", status: "ready" },
  { id: "RPT-004", title: "Project Health Report", description: "Timeline adherence, budget performance, and risk assessment", type: "operations", last_generated: "2026-04-28", period: "weekly", status: "ready" },
  { id: "RPT-005", title: "Labor & Time Report", description: "Hours worked by crew member, billable vs non-billable", type: "hr", last_generated: "2026-04-20", period: "monthly", status: "ready" },
  { id: "RPT-006", title: "Client Satisfaction Report", description: "Review scores, ratings, and client feedback summary", type: "quality", last_generated: "2026-03-31", period: "monthly", status: "ready" },
  { id: "RPT-007", title: "Material Cost Analysis", description: "Planned vs actual material costs by project and category", type: "financial", last_generated: null, period: "monthly", status: "generating" },
  { id: "RPT-008", title: "Q1 Business Performance", description: "Comprehensive Q1 2026 performance review", type: "summary", last_generated: "2026-04-05", period: "quarterly", status: "ready" },
];

// ── Integrations ──────────────────────────────────────────────────────────────

export const mockIntegrations: Integration[] = [
  { id: "INT-001", name: "QuickBooks", description: "Sync invoices, expenses, and financial data", status: "connected", category: "Finance", connected_at: "2026-01-15" },
  { id: "INT-002", name: "Google Calendar", description: "Sync appointments and project milestones", status: "connected", category: "Productivity", connected_at: "2026-01-15" },
  { id: "INT-003", name: "Gmail", description: "Send automated emails and notifications", status: "connected", category: "Communication", connected_at: "2026-01-15" },
  { id: "INT-004", name: "Twilio SMS", description: "Send text message reminders and notifications", status: "connected", category: "Communication", connected_at: "2026-02-10" },
  { id: "INT-005", name: "Google Business Profile", description: "Manage reviews and business listing", status: "connected", category: "Marketing", connected_at: "2026-02-20" },
  { id: "INT-006", name: "Facebook / Instagram", description: "Post content and manage social presence", status: "error", category: "Marketing", connected_at: "2026-03-01" },
  { id: "INT-007", name: "Stripe", description: "Process client payments online", status: "connected", category: "Finance", connected_at: "2026-03-15" },
  { id: "INT-008", name: "DocuSign", description: "Send and collect e-signatures on contracts", status: "not_connected", category: "Operations" },
  { id: "INT-009", name: "Dropbox", description: "Store and share project documents and photos", status: "not_connected", category: "Productivity" },
  { id: "INT-010", name: "Yelp for Business", description: "Respond to reviews and manage Yelp listing", status: "connected", category: "Marketing", connected_at: "2026-03-10" },
];

// ── Marketing Posts ───────────────────────────────────────────────────────────

export const mockMarketingPosts: MarketingPost[] = [
  { id: "MKT-001", title: "Before & After: Johnson Kitchen", content: "Incredible transformation! Our team just wrapped up a complete kitchen renovation for the Johnson family. New cabinets, quartz countertops, and custom tile work. #KitchenRemodel #HomeRenovation", platform: "Facebook", status: "published", published_at: "2026-04-28T12:00:00Z", likes: 47, comments: 12 },
  { id: "MKT-002", title: "Bathroom Reno Progress", content: "Week 2 update on the Okafor master bath. Tile work is looking amazing! DM us for a free estimate on your project.", platform: "Instagram", status: "published", published_at: "2026-04-25T15:00:00Z", likes: 63, comments: 8 },
  { id: "MKT-003", title: "Spring Remodeling Special", content: "Book your spring project before May 15th and save 5% on all kitchen and bathroom renovations. Limited slots available!", platform: "Facebook", status: "scheduled", scheduled_for: "2026-05-01T09:00:00Z", likes: 0, comments: 0 },
  { id: "MKT-004", title: "5-Star Review from Tom C.", content: '"Excellent work, on time and on budget. The team was professional and the quality exceeded our expectations." — Tom C.', platform: "Instagram", status: "scheduled", scheduled_for: "2026-05-03T11:00:00Z", likes: 0, comments: 0 },
  { id: "MKT-005", title: "Tips: Planning Your Kitchen Remodel", content: "5 things to consider before starting your kitchen renovation: 1. Set a realistic budget with 15% contingency 2. Plan your layout before picking finishes 3. Allow 6–8 weeks for full remodels.", platform: "Facebook", status: "draft", likes: 0, comments: 0 },
  { id: "MKT-006", title: "Team Spotlight: Jake", content: "Meet Jake, our lead tile installer with 8 years of experience. Every project he touches looks incredible!", platform: "Instagram", status: "draft", likes: 0, comments: 0 },
];

// ── Invoices ──────────────────────────────────────────────────────────────────

export const mockInvoices: Invoice[] = [
  { id: "INV-1042", client_name: "Mike Johnson", project_id: "PRJ-002", amount: 4200, status: "overdue", issued_date: "2026-04-01", due_date: "2026-04-15" },
  { id: "INV-1043", client_name: "Sandra Okafor", project_id: "PRJ-001", amount: 5500, status: "sent", issued_date: "2026-04-20", due_date: "2026-05-05" },
  { id: "INV-1041", client_name: "Tom Carter", project_id: "PRJ-004", amount: 4200, status: "overdue", issued_date: "2026-03-28", due_date: "2026-04-10" },
  { id: "INV-1040", client_name: "Tom Carter", project_id: "PRJ-004", amount: 5600, status: "paid", issued_date: "2026-03-15", due_date: "2026-03-30", paid_date: "2026-03-28" },
  { id: "INV-1039", client_name: "Lisa Thompson", project_id: "PRJ-003", amount: 7600, status: "paid", issued_date: "2026-03-01", due_date: "2026-03-15", paid_date: "2026-03-14" },
  { id: "INV-1044", client_name: "Sandra Okafor", project_id: "PRJ-001", amount: 9250, status: "draft", issued_date: "2026-04-25", due_date: "2026-05-10" },
];

// ── Expenses ──────────────────────────────────────────────────────────────────

export const mockExpenses: Expense[] = [
  { id: "EXP-001", project_id: "PRJ-002", vendor: "Home Depot", description: "Kitchen cabinets — upper units", amount: 2850, category: "Materials", date: "2026-04-16", receipt_status: "matched" },
  { id: "EXP-002", project_id: "PRJ-002", vendor: "Marble & Stone Co.", description: "Quartz countertop — 42 sq ft", amount: 3600, category: "Materials", date: "2026-04-18", receipt_status: "matched" },
  { id: "EXP-003", project_id: "PRJ-001", vendor: "Tile Warehouse", description: "Shower tile — 80 sq ft", amount: 640, category: "Materials", date: "2026-04-22", receipt_status: "matched" },
  { id: "EXP-004", project_id: "PRJ-002", vendor: "Lowe's", description: "Misc hardware and supplies", amount: 340, category: "Supplies", date: "2026-04-20", receipt_status: "unmatched" },
  { id: "EXP-005", project_id: "PRJ-001", vendor: "Ferguson HVAC", description: "Shower valve and trim", amount: 890, category: "Materials", date: "2026-04-23", receipt_status: "matched" },
  { id: "EXP-006", project_id: null, vendor: "Shell Gas", description: "Fuel — week of 4/21", amount: 185, category: "Vehicle", date: "2026-04-25", receipt_status: "unmatched" },
];

// ── Materials ─────────────────────────────────────────────────────────────────

export const mockMaterials: Material[] = [
  { id: "MAT-001", name: "Ceramic Floor Tile 12x12", category: "Tile", quantity: 48, unit: "boxes", unit_cost: 24.99, supplier: "Tile Warehouse", project_id: "PRJ-001", status: "on_site" },
  { id: "MAT-002", name: "Quartz Countertop Slab", category: "Stone", quantity: 1, unit: "slab", unit_cost: 3600, supplier: "Marble & Stone Co.", project_id: "PRJ-002", status: "ordered" },
  { id: "MAT-003", name: "Upper Kitchen Cabinets", category: "Cabinetry", quantity: 8, unit: "units", unit_cost: 356.25, supplier: "Home Depot", project_id: "PRJ-002", status: "on_site" },
  { id: "MAT-004", name: "Shower Valve Trim Kit", category: "Plumbing", quantity: 1, unit: "kit", unit_cost: 890, supplier: "Ferguson HVAC", project_id: "PRJ-001", status: "on_site" },
  { id: "MAT-005", name: "Subway Tile 3x6 White", category: "Tile", quantity: 20, unit: "boxes", unit_cost: 45.99, supplier: "Tile Warehouse", project_id: "PRJ-002", status: "pending" },
  { id: "MAT-006", name: "Cement Board 3x5", category: "Substrate", quantity: 24, unit: "sheets", unit_cost: 18.50, supplier: "Home Depot", project_id: "PRJ-001", status: "on_site" },
  { id: "MAT-007", name: "Grout — Bright White 10lb", category: "Finishing", quantity: 6, unit: "bags", unit_cost: 22.99, supplier: "Lowe's", project_id: "PRJ-001", status: "pending" },
  { id: "MAT-008", name: "Lumber 2x4x8", category: "Framing", quantity: 40, unit: "pieces", unit_cost: 8.75, supplier: "Lowe's", project_id: "PRJ-003", status: "pending" },
];

// ── Messages / Inbox ──────────────────────────────────────────────────────────

export const mockMessages: Message[] = [
  { id: "MSG-001", from: "Sandra Okafor", from_email: "sandra@email.com", subject: "Tile color question", preview: "Hi, I was thinking about switching the accent tile to the charcoal option...", body: "Hi, I was thinking about switching the accent tile to the charcoal option we saw last week. Would that affect the timeline or cost? Let me know what you think before you order.", status: "unread", received_at: "2026-04-30T09:15:00Z", category: "client" },
  { id: "MSG-002", from: "Mike Johnson", from_email: "mjohnson@email.com", subject: "When can I see progress?", preview: "It's been two weeks since work started. Can we schedule a walkthrough?", body: "It's been two weeks since work started. Can we schedule a walkthrough this week? I'd like to see where things stand. I'm free Thursday afternoon or Friday morning.", status: "unread", received_at: "2026-04-29T16:45:00Z", category: "client" },
  { id: "MSG-003", from: "Derek Walsh", from_email: "derek@gmail.com", subject: "Re: Estimate for Deck Replacement", preview: "Thanks for sending that over. The numbers look good. Can we discuss...", body: "Thanks for sending that over. The numbers look good. Can we discuss the timeline? We'd like to have it done before Memorial Day if possible. Also, can you include removal of the old deck in the estimate?", status: "read", received_at: "2026-04-29T11:00:00Z", category: "lead" },
  { id: "MSG-004", from: "QuickBooks", from_email: "noreply@quickbooks.com", subject: "Invoice #1041 is now 20 days overdue", preview: "Reminder: Invoice INV-1041 for $4,200 from Tom Carter is now 20 days past due.", body: "Reminder: Invoice INV-1041 for $4,200 from Tom Carter is now 20 days past due. Consider sending a payment reminder or adjusting payment terms.", status: "read", received_at: "2026-04-29T08:00:00Z", category: "system" },
  { id: "MSG-005", from: "Sarah Mitchell", from_email: "sarah@home.com", subject: "Kitchen remodel inquiry", preview: "Hello, I found your company through a referral from my neighbor...", body: "Hello, I found your company through a referral from my neighbor Amy Chang. We're looking to do a full kitchen remodel and would love to get an estimate. Our budget is around $40k. Please reach out when you can!", status: "unread", received_at: "2026-04-28T14:30:00Z", category: "lead" },
  { id: "MSG-006", from: "Lisa Thompson", from_email: "lisa.t@email.com", subject: "Permit update", preview: "The county told me the permit application needs one more document...", body: "The county told me the permit application needs one more document — a site plan with dimensions. Do you need me to provide anything or can your team handle this?", status: "read", received_at: "2026-04-28T10:00:00Z", category: "client" },
];

// ── Calendar Events ───────────────────────────────────────────────────────────

export const mockCalendarEvents: CalendarEvent[] = [
  { id: "EVT-001", title: "Sandra Okafor — Site Check", client_name: "Sandra Okafor", type: "site_visit", start: "2026-04-30T09:00:00Z", end: "2026-04-30T10:00:00Z", location: "2201 River Rd", status: "confirmed", notes: "Check tile installation progress" },
  { id: "EVT-002", title: "Mike Johnson — Progress Walkthrough", client_name: "Mike Johnson", type: "client_meeting", start: "2026-04-30T14:00:00Z", end: "2026-04-30T15:00:00Z", location: "445 Oak Lane", status: "pending" },
  { id: "EVT-003", title: "Derek Walsh — Estimate Walkthrough", client_name: "Derek Walsh", type: "estimate", start: "2026-05-01T14:00:00Z", end: "2026-05-01T15:30:00Z", location: "TBD", status: "scheduled" },
  { id: "EVT-004", title: "Team Weekly Standup", type: "internal", start: "2026-05-02T08:00:00Z", end: "2026-05-02T08:30:00Z", location: "Office", status: "confirmed" },
  { id: "EVT-005", title: "Maria Gonzalez — Design Consultation", client_name: "Maria Gonzalez", type: "consultation", start: "2026-05-02T11:00:00Z", end: "2026-05-02T12:30:00Z", location: "Phone", status: "confirmed" },
  { id: "EVT-006", title: "Plumbing Inspection — PRJ-001", client_name: "Sandra Okafor", type: "inspection", start: "2026-05-03T10:00:00Z", end: "2026-05-03T11:00:00Z", location: "2201 River Rd", status: "scheduled" },
  { id: "EVT-007", title: "Robert Chen — Discovery Call", client_name: "Robert Chen", type: "discovery_call", start: "2026-05-05T15:00:00Z", end: "2026-05-05T16:00:00Z", location: "Phone", status: "scheduled" },
  { id: "EVT-008", title: "Material Delivery — Countertop", type: "delivery", start: "2026-05-06T08:00:00Z", end: "2026-05-06T10:00:00Z", location: "445 Oak Lane", status: "confirmed" },
];

// ── Financial Summary ─────────────────────────────────────────────────────────

export const mockFinancialSummary = {
  revenue_this_month: 47500,
  revenue_last_month: 38200,
  expenses_this_month: 29400,
  expenses_last_month: 22800,
  gross_profit_this_month: 18100,
  gross_profit_last_month: 15400,
  outstanding_receivables: 12800,
  overdue_amount: 8400,
  ytd_revenue: 142800,
  ytd_expenses: 87600,
  ytd_gross_profit: 55200,
};

// ── Work Orders ───────────────────────────────────────────────────────────────

export interface WorkOrder {
  id: string;
  client: string;
  property: string;
  description: string;
  status: "new" | "scheduled" | "in_progress" | "waiting_on_parts" | "completed" | "invoiced";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_tech: string;
  scheduled_date: string;
  project_id?: string;
}

export const mockWorkOrders: WorkOrder[] = [
  { id: "WO-001", client: "Sandra Okafor", property: "2201 River Rd", description: "Install shower pan liner and waterproofing membrane", status: "in_progress", priority: "high", assigned_tech: "Jake Martinez", scheduled_date: "2026-04-30", project_id: "PRJ-001" },
  { id: "WO-002", client: "Mike Johnson", property: "445 Oak Lane", description: "Set kitchen cabinet upper units, verify plumb and level", status: "scheduled", priority: "high", assigned_tech: "Jake Martinez", scheduled_date: "2026-05-01", project_id: "PRJ-002" },
  { id: "WO-003", client: "Derek Walsh", property: "TBD", description: "On-site estimate for deck replacement — full teardown and rebuild", status: "new", priority: "medium", assigned_tech: "Owner", scheduled_date: "2026-05-01" },
  { id: "WO-004", client: "Maria Gonzalez", property: "89 Cedar Ct", description: "Waiting on backordered tile before demo can begin", status: "waiting_on_parts", priority: "medium", assigned_tech: "Chris Lee", scheduled_date: "2026-05-07" },
  { id: "WO-005", client: "Tom Carter", property: "712 Elm Ave", description: "Final punch list walk and touch-up paint on hall bath", status: "completed", priority: "low", assigned_tech: "Jake Martinez", scheduled_date: "2026-04-22", project_id: "PRJ-004" },
  { id: "WO-006", client: "Robert Chen", property: "55 Maple Dr", description: "Invoice issued for discovery and design phase deposit", status: "invoiced", priority: "low", assigned_tech: "Owner", scheduled_date: "2026-04-28" },
];

// ── Vendors & Subs ────────────────────────────────────────────────────────────

export interface Vendor {
  id: string;
  name: string;
  trade: string;
  contact_name: string;
  phone: string;
  email: string;
  rating: number;
  active_jobs: number;
  total_spent: number;
  status: "active" | "inactive" | "pending";
  insurance_verified: boolean;
  license_number?: string;
}

export const mockVendors: Vendor[] = [
  { id: "VEN-001", name: "ProPlumb Solutions", trade: "Plumbing", contact_name: "Ray Torres", phone: "555-301-8820", email: "ray@proplumb.com", rating: 5, active_jobs: 2, total_spent: 18400, status: "active", insurance_verified: true, license_number: "PLB-44821" },
  { id: "VEN-002", name: "Spark Electric LLC", trade: "Electrical", contact_name: "Dana Klein", phone: "555-774-2200", email: "dana@sparkelectric.com", rating: 4, active_jobs: 1, total_spent: 9600, status: "active", insurance_verified: true, license_number: "ELC-30019" },
  { id: "VEN-003", name: "Ace Drywall & Paint", trade: "Drywall / Paint", contact_name: "Marco Villa", phone: "555-882-4411", email: "marco@acedrywall.com", rating: 4, active_jobs: 0, total_spent: 7200, status: "active", insurance_verified: true },
  { id: "VEN-004", name: "Sunrise HVAC", trade: "HVAC", contact_name: "Beth Nguyen", phone: "555-556-0033", email: "beth@sunrisehvac.com", rating: 3, active_jobs: 0, total_spent: 4100, status: "inactive", insurance_verified: false },
  { id: "VEN-005", name: "Summit Concrete Co.", trade: "Concrete / Foundations", contact_name: "Greg Hall", phone: "555-119-7744", email: "greg@summitconcrete.com", rating: 5, active_jobs: 0, total_spent: 0, status: "pending", insurance_verified: false },
];

// ── Team Members ──────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  type: "employee" | "contractor";
  hours_this_week: number;
  jobs_assigned: number;
  hourly_rate: number;
  phone: string;
  status: "active" | "on_leave" | "inactive";
}

export const mockTeamMembers: TeamMember[] = [
  { id: "EMP-001", name: "Owner / PM", role: "Owner / Project Manager", type: "employee", hours_this_week: 44, jobs_assigned: 4, hourly_rate: 0, phone: "555-000-0001", status: "active" },
  { id: "EMP-002", name: "Jake Martinez", role: "Lead Carpenter / Tile", type: "employee", hours_this_week: 40, jobs_assigned: 3, hourly_rate: 32, phone: "555-412-9900", status: "active" },
  { id: "EMP-003", name: "Chris Lee", role: "General Laborer", type: "employee", hours_this_week: 38, jobs_assigned: 2, hourly_rate: 22, phone: "555-301-5512", status: "active" },
  { id: "EMP-004", name: "Tony Reyes", role: "Plumbing Helper", type: "contractor", hours_this_week: 16, jobs_assigned: 1, hourly_rate: 45, phone: "555-887-3344", status: "active" },
];

// ── Documents ─────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  name: string;
  type: "contract" | "permit" | "receipt" | "photo" | "coi" | "invoice" | "sop" | "estimate";
  project: string;
  uploaded_by: string;
  date: string;
  size: string;
}

export const mockDocuments: Document[] = [
  { id: "DOC-001", name: "Okafor Master Bath — Signed Contract.pdf", type: "contract", project: "PRJ-001", uploaded_by: "Owner", date: "2026-04-20", size: "312 KB" },
  { id: "DOC-002", name: "Johnson Kitchen — Signed Contract.pdf", type: "contract", project: "PRJ-002", uploaded_by: "Owner", date: "2026-04-14", size: "298 KB" },
  { id: "DOC-003", name: "Thompson ADU — Permit Application.pdf", type: "permit", project: "PRJ-003", uploaded_by: "Owner", date: "2026-04-28", size: "1.1 MB" },
  { id: "DOC-004", name: "ProPlumb Solutions — COI 2026.pdf", type: "coi", project: "General", uploaded_by: "Ray Torres", date: "2026-01-10", size: "204 KB" },
  { id: "DOC-005", name: "Okafor Bath — Progress Photos Apr 25.zip", type: "photo", project: "PRJ-001", uploaded_by: "Jake Martinez", date: "2026-04-25", size: "18.4 MB" },
  { id: "DOC-006", name: "Home Depot Receipt — Cabinets.pdf", type: "receipt", project: "PRJ-002", uploaded_by: "Owner", date: "2026-04-16", size: "88 KB" },
  { id: "DOC-007", name: "Johnson Kitchen — Final Estimate v2.pdf", type: "estimate", project: "PRJ-002", uploaded_by: "Owner", date: "2026-04-12", size: "156 KB" },
  { id: "DOC-008", name: "New Lead Intake SOP v2.1.pdf", type: "sop", project: "General", uploaded_by: "Owner", date: "2026-03-15", size: "72 KB" },
];

// ── AI Agent Activity ─────────────────────────────────────────────────────────

export interface AgentAction {
  id: string;
  agent_name: string;
  task: string;
  status: "idle" | "running" | "waiting_approval" | "completed" | "failed";
  project?: string;
  requires_approval: boolean;
  timestamp: string;
  result?: string;
}

export const mockAgentActivity: AgentAction[] = [
  { id: "AGT-001", agent_name: "Growth Agent", task: "Draft Instagram post for Johnson Kitchen before/after", status: "waiting_approval", project: "PRJ-002", requires_approval: true, timestamp: "2026-04-30T08:30:00Z", result: "Post drafted with before/after description and 3 hashtag variants ready for review." },
  { id: "AGT-002", agent_name: "Operations Agent", task: "Flag PRJ-002 budget overrun risk and generate alert", status: "completed", project: "PRJ-002", requires_approval: false, timestamp: "2026-04-30T07:15:00Z", result: "Alert sent. Johnson Kitchen is tracking 12% over material budget." },
  { id: "AGT-003", agent_name: "Customer Service Agent", task: "Draft reply to Mike Johnson walkthrough request", status: "waiting_approval", project: "PRJ-002", requires_approval: true, timestamp: "2026-04-29T17:00:00Z", result: "Reply drafted: 'Hi Mike, let's schedule Thursday at 2pm for a full walkthrough. I'll send a calendar invite.'" },
  { id: "AGT-004", agent_name: "Finance Agent", task: "Send overdue invoice reminder to Tom Carter", status: "completed", project: "PRJ-004", requires_approval: false, timestamp: "2026-04-29T09:00:00Z", result: "Reminder email sent via QuickBooks for INV-1041 ($4,200)." },
  { id: "AGT-005", agent_name: "Reporting Agent", task: "Generate Weekly Business Summary report", status: "completed", project: undefined, requires_approval: false, timestamp: "2026-04-27T06:05:00Z", result: "Report generated and emailed to owner." },
  { id: "AGT-006", agent_name: "Data Prep Agent", task: "Categorize 6 new receipts uploaded this week", status: "failed", project: undefined, requires_approval: false, timestamp: "2026-04-26T14:00:00Z", result: "Failed: 2 receipts could not be matched to a vendor — manual review needed." },
];

// ── CRM: Contacts ─────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  company_id: string | null;
  company_name: string | null;
  contact_type: "lead" | "customer" | "vendor" | "subcontractor" | "other";
  status: "new" | "active" | "inactive";
  source: string;
  preferred_contact_method: "email" | "phone" | "text";
  address: string;
  city: string;
  state: string;
  zip: string;
  tags: string[];
  notes_summary: string;
  assigned_to: string;
  assigned_agent: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

export const mockContacts: Contact[] = [
  { id: "CON-001", first_name: "Sarah", last_name: "Mitchell", full_name: "Sarah Mitchell", email: "sarah@home.com", phone: "813-555-0199", company_id: null, company_name: null, contact_type: "lead", status: "new", source: "referral", preferred_contact_method: "email", address: "142 Birch Ln", city: "Tampa", state: "FL", zip: "33601", tags: ["kitchen", "high-value"], notes_summary: "Referred by Amy Chang. Looking for full kitchen remodel, budget $40k. No contact yet.", assigned_to: "Owner", assigned_agent: "Growth Agent", last_contacted_at: null, created_at: "2026-04-26" },
  { id: "CON-002", first_name: "Derek", last_name: "Walsh", full_name: "Derek Walsh", email: "derek@gmail.com", phone: "555-887-2201", company_id: null, company_name: null, contact_type: "lead", status: "active", source: "google", preferred_contact_method: "phone", address: "88 Maple Ave", city: "St. Petersburg", state: "FL", zip: "33701", tags: ["deck", "outdoor"], notes_summary: "Wants deck replacement before Memorial Day. Needs removal of old deck included in estimate.", assigned_to: "Owner", assigned_agent: null, last_contacted_at: "2026-04-29", created_at: "2026-04-24" },
  { id: "CON-003", first_name: "Maria", last_name: "Gonzalez", full_name: "Maria Gonzalez", email: "maria@email.com", phone: "555-201-3344", company_id: null, company_name: null, contact_type: "lead", status: "active", source: "referral", preferred_contact_method: "phone", address: "310 Cedar Ct", city: "Tampa", state: "FL", zip: "33602", tags: ["bathroom", "qualified"], notes_summary: "Highly qualified. Score 90. Bathroom reno budget $25-30k. Ready to move forward quickly.", assigned_to: "Owner", assigned_agent: "Growth Agent", last_contacted_at: "2026-04-28", created_at: "2026-04-22" },
  { id: "CON-004", first_name: "Tom", last_name: "Rivera", full_name: "Tom Rivera", email: "tom.r@company.com", phone: "555-443-8812", company_id: "COMP-001", company_name: "Rivera Holding Group", contact_type: "customer", status: "active", source: "website", preferred_contact_method: "email", address: "55 Oak Blvd", city: "Clearwater", state: "FL", zip: "33755", tags: ["basement", "commercial"], notes_summary: "Signed for basement finishing project. Budget $50k. Contract executed. Start date May 5.", assigned_to: "Owner", assigned_agent: null, last_contacted_at: "2026-04-27", created_at: "2026-04-20" },
  { id: "CON-005", first_name: "Sandra", last_name: "Okafor", full_name: "Sandra Okafor", email: "sandra@email.com", phone: "555-911-0022", company_id: null, company_name: null, contact_type: "customer", status: "active", source: "referral", preferred_contact_method: "email", address: "2201 River Rd", city: "Tampa", state: "FL", zip: "33603", tags: ["bathroom", "active-project"], notes_summary: "Active bathroom renovation PRJ-001. Great client, very communicative. Considering accent tile change.", assigned_to: "Owner", assigned_agent: null, last_contacted_at: "2026-04-30", created_at: "2026-01-15" },
  { id: "CON-006", first_name: "Mike", last_name: "Johnson", full_name: "Mike Johnson", email: "mjohnson@email.com", phone: "555-223-6678", company_id: null, company_name: null, contact_type: "customer", status: "active", source: "website", preferred_contact_method: "phone", address: "445 Oak Lane", city: "Tampa", state: "FL", zip: "33604", tags: ["kitchen", "active-project", "at-risk"], notes_summary: "Kitchen remodel PRJ-002 in progress. Project 6 days behind schedule. Wants walkthrough this week.", assigned_to: "Owner", assigned_agent: "Operations Agent", last_contacted_at: "2026-04-29", created_at: "2026-03-10" },
  { id: "CON-007", first_name: "Jennifer", last_name: "Park", full_name: "Jennifer Park", email: "jpark@outlook.com", phone: "555-667-9901", company_id: null, company_name: null, contact_type: "lead", status: "new", source: "facebook", preferred_contact_method: "text", address: "77 Sunset Dr", city: "St. Petersburg", state: "FL", zip: "33702", tags: ["bathroom", "facebook-ad"], notes_summary: "Came via Facebook ad. Master bath remodel, budget $20-28k. Score 65. No response to follow-up.", assigned_to: "Owner", assigned_agent: null, last_contacted_at: null, created_at: "2026-04-18" },
  { id: "CON-008", first_name: "Robert", last_name: "Chen", full_name: "Robert Chen", email: "rchen@gmail.com", phone: "555-112-3345", company_id: "COMP-002", company_name: "Chen Investments Group", contact_type: "lead", status: "active", source: "referral", preferred_contact_method: "phone", address: "55 Maple Dr", city: "Clearwater", state: "FL", zip: "33756", tags: ["whole-home", "high-value", "vip"], notes_summary: "VIP prospect. Score 95. Whole home renovation $80-120k. In final contract negotiation.", assigned_to: "Owner", assigned_agent: "Growth Agent", last_contacted_at: "2026-04-28", created_at: "2026-04-15" },
  { id: "CON-009", first_name: "Lisa", last_name: "Thompson", full_name: "Lisa Thompson", email: "lisa.t@email.com", phone: "555-778-4456", company_id: null, company_name: null, contact_type: "customer", status: "active", source: "google", preferred_contact_method: "email", address: "89 Pine St", city: "Tampa", state: "FL", zip: "33605", tags: ["adu", "permit-stage"], notes_summary: "Garage conversion ADU project PRJ-003. Currently in permit stage. Good communicator.", assigned_to: "Owner", assigned_agent: null, last_contacted_at: "2026-04-28", created_at: "2026-03-20" },
  { id: "CON-010", first_name: "Ray", last_name: "Torres", full_name: "Ray Torres", email: "ray@proplumb.com", phone: "555-301-8820", company_id: "COMP-003", company_name: "ProPlumb Solutions", contact_type: "vendor", status: "active", source: "referral", preferred_contact_method: "phone", address: "1010 Industrial Blvd", city: "Tampa", state: "FL", zip: "33610", tags: ["plumbing", "preferred-vendor"], notes_summary: "Lead plumber at ProPlumb. Reliable, 5-star rating. Insurance verified. License PLB-44821.", assigned_to: "Owner", assigned_agent: null, last_contacted_at: "2026-04-25", created_at: "2025-06-01" },
  { id: "CON-011", first_name: "Jake", last_name: "Martinez", full_name: "Jake Martinez", email: "jake@team.com", phone: "555-412-9900", company_id: null, company_name: null, contact_type: "subcontractor", status: "active", source: "referral", preferred_contact_method: "phone", address: "320 Worker Blvd", city: "Tampa", state: "FL", zip: "33611", tags: ["tile", "carpenter", "lead-tech"], notes_summary: "Lead carpenter/tile installer. 8 years experience. On payroll. 3 active jobs currently assigned.", assigned_to: "Owner", assigned_agent: null, last_contacted_at: "2026-04-30", created_at: "2025-01-10" },
  { id: "CON-012", first_name: "Dana", last_name: "Klein", full_name: "Dana Klein", email: "dana@sparkelectric.com", phone: "555-774-2200", company_id: "COMP-004", company_name: "Spark Electric LLC", contact_type: "vendor", status: "inactive", source: "referral", preferred_contact_method: "email", address: "88 Electric Ave", city: "Clearwater", state: "FL", zip: "33757", tags: ["electrical", "licensed"], notes_summary: "Electrician at Spark Electric. 4-star rating. Not on active jobs. Insurance renewal needed.", assigned_to: "Owner", assigned_agent: null, last_contacted_at: "2026-03-15", created_at: "2025-08-01" },
];

// ── CRM: Companies ────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  industry: string;
  website: string | null;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  contact_count: number;
  deal_count: number;
  total_revenue: number;
  status: "active" | "prospect" | "inactive";
  tags: string[];
  notes: string;
  created_at: string;
}

export const mockCompanies: Company[] = [
  { id: "COMP-001", name: "Rivera Holding Group", industry: "Real Estate", website: null, phone: "555-443-8800", address: "55 Oak Blvd", city: "Clearwater", state: "FL", contact_count: 1, deal_count: 1, total_revenue: 50000, status: "active", tags: ["commercial", "multi-unit"], notes: "Owns several rental properties. Interested in ongoing remodel work. Deal won — project starting.", created_at: "2026-04-20" },
  { id: "COMP-002", name: "Chen Investments Group", industry: "Real Estate Investment", website: "chenig.com", phone: "555-112-3300", address: "55 Maple Dr", city: "Clearwater", state: "FL", contact_count: 1, deal_count: 1, total_revenue: 0, status: "prospect", tags: ["high-value", "vip", "whole-home"], notes: "High-value prospect. Whole home reno $80-120k. In final contract negotiation. Priority account.", created_at: "2026-04-15" },
  { id: "COMP-003", name: "ProPlumb Solutions", industry: "Plumbing Contractor", website: "proplumb.com", phone: "555-301-8820", address: "1010 Industrial Blvd", city: "Tampa", state: "FL", contact_count: 1, deal_count: 0, total_revenue: 18400, status: "active", tags: ["vendor", "plumbing", "preferred"], notes: "Preferred plumbing sub. Insurance verified, license PLB-44821. 5-star rating across 2 active jobs.", created_at: "2025-06-01" },
  { id: "COMP-004", name: "Spark Electric LLC", industry: "Electrical Contractor", website: null, phone: "555-774-2200", address: "88 Electric Ave", city: "Clearwater", state: "FL", contact_count: 1, deal_count: 0, total_revenue: 9600, status: "inactive", tags: ["vendor", "electrical"], notes: "No active jobs. Insurance renewal needed before next engagement. 4-star rating.", created_at: "2025-08-01" },
  { id: "COMP-005", name: "Marble & Stone Co.", industry: "Material Supplier", website: "marblestone.com", phone: "555-400-7722", address: "2200 Commerce Park", city: "Tampa", state: "FL", contact_count: 0, deal_count: 0, total_revenue: 7200, status: "active", tags: ["supplier", "stone", "countertops"], notes: "Primary stone and countertop supplier. Quick lead times. Good pricing on slab orders.", created_at: "2025-03-15" },
  { id: "COMP-006", name: "Tile Warehouse Inc.", industry: "Material Supplier", website: "tilewarehouse.com", phone: "555-555-9900", address: "800 Distribution Way", city: "Tampa", state: "FL", contact_count: 0, deal_count: 0, total_revenue: 4800, status: "active", tags: ["supplier", "tile"], notes: "Primary tile supplier for floor and wall tile. Good bulk pricing. Reliable delivery.", created_at: "2025-04-20" },
];

// ── CRM: Deals ────────────────────────────────────────────────────────────────

export interface Deal {
  id: string;
  name: string;
  company_id: string | null;
  company_name: string | null;
  contact_id: string;
  contact_name: string;
  value: number;
  stage: "discovery" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  probability: number;
  expected_close_date: string;
  assigned_to: string;
  assigned_agent: string | null;
  source: string;
  tags: string[];
  notes: string;
  days_in_stage: number;
  created_at: string;
}

export const mockDeals: Deal[] = [
  { id: "DEAL-001", name: "Sarah Mitchell — Kitchen Remodel", company_id: null, company_name: null, contact_id: "CON-001", contact_name: "Sarah Mitchell", value: 40000, stage: "discovery", probability: 30, expected_close_date: "2026-06-01", assigned_to: "Owner", assigned_agent: "Growth Agent", source: "referral", tags: ["kitchen", "high-value"], notes: "First call not yet scheduled. Budget confirmed $40k. Referred by Amy Chang. High potential.", days_in_stage: 4, created_at: "2026-04-26" },
  { id: "DEAL-002", name: "Derek Walsh — Deck Replacement", company_id: null, company_name: null, contact_id: "CON-002", contact_name: "Derek Walsh", value: 17500, stage: "qualified", probability: 55, expected_close_date: "2026-05-15", assigned_to: "Owner", assigned_agent: null, source: "google", tags: ["deck", "outdoor"], notes: "Estimate walkthrough scheduled May 1. Wants Memorial Day completion. Deck removal included.", days_in_stage: 6, created_at: "2026-04-24" },
  { id: "DEAL-003", name: "Maria Gonzalez — Bathroom Renovation", company_id: null, company_name: null, contact_id: "CON-003", contact_name: "Maria Gonzalez", value: 27500, stage: "proposal", probability: 70, expected_close_date: "2026-05-10", assigned_to: "Owner", assigned_agent: "Growth Agent", source: "referral", tags: ["bathroom", "qualified"], notes: "Proposal sent Apr 28. Waiting on client review. Strong buying signals. Lead score 90.", days_in_stage: 2, created_at: "2026-04-22" },
  { id: "DEAL-004", name: "Robert Chen — Whole Home Renovation", company_id: "COMP-002", company_name: "Chen Investments Group", contact_id: "CON-008", contact_name: "Robert Chen", value: 100000, stage: "negotiation", probability: 80, expected_close_date: "2026-05-20", assigned_to: "Owner", assigned_agent: "Growth Agent", source: "referral", tags: ["whole-home", "high-value", "vip"], notes: "In final contract review. Client wants 5% materials discount. Countered with free design consultation.", days_in_stage: 5, created_at: "2026-04-15" },
  { id: "DEAL-005", name: "Jennifer Park — Master Bath Remodel", company_id: null, company_name: null, contact_id: "CON-007", contact_name: "Jennifer Park", value: 24000, stage: "discovery", probability: 20, expected_close_date: "2026-06-15", assigned_to: "Owner", assigned_agent: null, source: "facebook", tags: ["bathroom", "facebook-ad"], notes: "Initial inquiry via Facebook ad. No response to follow-up text. Needs outreach.", days_in_stage: 12, created_at: "2026-04-18" },
  { id: "DEAL-006", name: "Tom Rivera — Basement Finishing", company_id: "COMP-001", company_name: "Rivera Holding Group", contact_id: "CON-004", contact_name: "Tom Rivera", value: 50000, stage: "won", probability: 100, expected_close_date: "2026-04-20", assigned_to: "Owner", assigned_agent: null, source: "website", tags: ["basement", "commercial"], notes: "Contract signed. Deposit received. Project starts May 5. Great client.", days_in_stage: 0, created_at: "2026-04-10" },
  { id: "DEAL-007", name: "Lisa Thompson — ADU Conversion", company_id: null, company_name: null, contact_id: "CON-009", contact_name: "Lisa Thompson", value: 38000, stage: "won", probability: 100, expected_close_date: "2026-04-05", assigned_to: "Owner", assigned_agent: null, source: "google", tags: ["adu"], notes: "Won. Currently in permit stage. Project planning underway.", days_in_stage: 0, created_at: "2026-03-20" },
  { id: "DEAL-008", name: "Mike Johnson — Kitchen Update (Initial)", company_id: null, company_name: null, contact_id: "CON-006", contact_name: "Mike Johnson", value: 15000, stage: "lost", probability: 0, expected_close_date: "2026-03-01", assigned_to: "Owner", assigned_agent: null, source: "website", tags: ["kitchen", "upsold"], notes: "Initial small-scope request closed as lost — client upgraded to full kitchen remodel. Not a true loss.", days_in_stage: 0, created_at: "2026-03-01" },
];

// ── CRM: Activities ───────────────────────────────────────────────────────────

export interface CRMActivity {
  id: string;
  type: "call" | "email" | "meeting" | "note" | "task_completed" | "deal_stage_change" | "lead_created" | "ai_action";
  description: string;
  contact_name: string | null;
  company_name: string | null;
  deal_name: string | null;
  user_or_agent: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export const mockCRMActivities: CRMActivity[] = [
  { id: "ACT-001", type: "ai_action", description: "Growth Agent drafted Instagram post for Johnson Kitchen before/after — awaiting approval", contact_name: "Mike Johnson", company_name: null, deal_name: null, user_or_agent: "Growth Agent", timestamp: "2026-04-30T08:30:00Z", metadata: { status: "waiting_approval" } },
  { id: "ACT-002", type: "ai_action", description: "Operations Agent flagged PRJ-002 budget overrun risk — alert generated for owner review", contact_name: "Mike Johnson", company_name: null, deal_name: null, user_or_agent: "Operations Agent", timestamp: "2026-04-30T07:15:00Z", metadata: { alert_type: "budget_overrun", threshold: "12%" } },
  { id: "ACT-003", type: "email", description: "Proposal email sent to Maria Gonzalez with bathroom renovation quote ($27,500)", contact_name: "Maria Gonzalez", company_name: null, deal_name: "Maria Gonzalez — Bathroom Renovation", user_or_agent: "Owner", timestamp: "2026-04-29T16:00:00Z", metadata: { deal_id: "DEAL-003" } },
  { id: "ACT-004", type: "call", description: "Discovery call with Robert Chen — discussed scope and timeline for whole home renovation", contact_name: "Robert Chen", company_name: "Chen Investments Group", deal_name: "Robert Chen — Whole Home Renovation", user_or_agent: "Owner", timestamp: "2026-04-29T14:00:00Z", metadata: { duration_minutes: 45 } },
  { id: "ACT-005", type: "note", description: "Derek Walsh confirmed estimate walkthrough for May 1st at site — 2pm meeting set", contact_name: "Derek Walsh", company_name: null, deal_name: "Derek Walsh — Deck Replacement", user_or_agent: "Owner", timestamp: "2026-04-29T11:30:00Z", metadata: {} },
  { id: "ACT-006", type: "task_completed", description: "Overdue invoice reminder sent to Tom Carter for INV-1041 ($4,200) via QuickBooks", contact_name: null, company_name: null, deal_name: null, user_or_agent: "Finance Agent", timestamp: "2026-04-29T09:00:00Z", metadata: { task_id: "TASK-009", invoice_id: "INV-1041" } },
  { id: "ACT-007", type: "deal_stage_change", description: "Deal advanced: Maria Gonzalez Bathroom Renovation moved from Qualified → Proposal", contact_name: "Maria Gonzalez", company_name: null, deal_name: "Maria Gonzalez — Bathroom Renovation", user_or_agent: "Owner", timestamp: "2026-04-28T15:00:00Z", metadata: { from_stage: "qualified", to_stage: "proposal" } },
  { id: "ACT-008", type: "email", description: "Follow-up text sent to Jennifer Park — no response as of end of day", contact_name: "Jennifer Park", company_name: null, deal_name: "Jennifer Park — Master Bath Remodel", user_or_agent: "Owner", timestamp: "2026-04-28T10:00:00Z", metadata: { method: "text" } },
  { id: "ACT-009", type: "meeting", description: "Site walkthrough with Sandra Okafor — reviewed tile progress and discussed accent tile change", contact_name: "Sandra Okafor", company_name: null, deal_name: null, user_or_agent: "Owner", timestamp: "2026-04-28T09:00:00Z", metadata: { location: "2201 River Rd" } },
  { id: "ACT-010", type: "deal_stage_change", description: "Deal advanced: Robert Chen Whole Home Renovation moved from Proposal → Negotiation", contact_name: "Robert Chen", company_name: "Chen Investments Group", deal_name: "Robert Chen — Whole Home Renovation", user_or_agent: "Owner", timestamp: "2026-04-27T14:00:00Z", metadata: { from_stage: "proposal", to_stage: "negotiation" } },
  { id: "ACT-011", type: "call", description: "Follow-up call with Derek Walsh — discussed deck material options and Memorial Day timeline", contact_name: "Derek Walsh", company_name: null, deal_name: "Derek Walsh — Deck Replacement", user_or_agent: "Owner", timestamp: "2026-04-27T10:00:00Z", metadata: { duration_minutes: 20 } },
  { id: "ACT-012", type: "note", description: "Robert Chen countered with 5% materials discount request. Owner countered with free design consultation.", contact_name: "Robert Chen", company_name: "Chen Investments Group", deal_name: "Robert Chen — Whole Home Renovation", user_or_agent: "Owner", timestamp: "2026-04-26T15:00:00Z", metadata: {} },
  { id: "ACT-013", type: "lead_created", description: "New lead created: Sarah Mitchell — kitchen remodel referral via neighbor Amy Chang", contact_name: "Sarah Mitchell", company_name: null, deal_name: "Sarah Mitchell — Kitchen Remodel", user_or_agent: "Growth Agent", timestamp: "2026-04-26T10:00:00Z", metadata: { source: "referral", score: 85 } },
  { id: "ACT-014", type: "email", description: "Automated welcome email sent to Sarah Mitchell via Lead Follow-Up sequence", contact_name: "Sarah Mitchell", company_name: null, deal_name: null, user_or_agent: "Lead Follow-Up Automation", timestamp: "2026-04-26T12:00:00Z", metadata: { automation_id: "AUTO-001" } },
  { id: "ACT-015", type: "meeting", description: "Discovery call with Maria Gonzalez — qualified for bathroom renovation, budget and scope confirmed", contact_name: "Maria Gonzalez", company_name: null, deal_name: "Maria Gonzalez — Bathroom Renovation", user_or_agent: "Owner", timestamp: "2026-04-25T11:00:00Z", metadata: { duration_minutes: 30 } },
];

// ── Intelligence Center ───────────────────────────────────────────────────────

export interface MaterialTrend {
  category: string;
  index_value: number;
  change_30d: number;
  change_90d: number;
  change_12m: number;
  status: "green" | "yellow" | "red";
}

export const mockMaterialTrends: MaterialTrend[] = [
  { category: "Lumber", index_value: 118.4, change_30d: 4.2, change_90d: 9.1, change_12m: 12.3, status: "red" },
  { category: "Concrete", index_value: 104.7, change_30d: 1.1, change_90d: 2.8, change_12m: 5.4, status: "yellow" },
  { category: "Drywall", index_value: 96.2, change_30d: -1.8, change_90d: -3.2, change_12m: 0.5, status: "green" },
  { category: "Steel", index_value: 122.6, change_30d: 5.9, change_90d: 11.4, change_12m: 18.7, status: "red" },
  { category: "Copper", index_value: 131.0, change_30d: 6.8, change_90d: 14.2, change_12m: 22.1, status: "red" },
  { category: "Electrical", index_value: 109.3, change_30d: 2.4, change_90d: 5.6, change_12m: 8.9, status: "yellow" },
  { category: "Plumbing", index_value: 107.8, change_30d: 1.9, change_90d: 4.3, change_12m: 7.2, status: "yellow" },
  { category: "Roofing", index_value: 113.5, change_30d: 3.1, change_90d: 7.8, change_12m: 10.4, status: "red" },
  { category: "Flooring", index_value: 101.2, change_30d: -0.4, change_90d: 1.1, change_12m: 3.7, status: "green" },
  { category: "Paint", index_value: 98.7, change_30d: -1.2, change_90d: -2.0, change_12m: 1.1, status: "green" },
  { category: "Fuel", index_value: 115.9, change_30d: 4.7, change_90d: 8.3, change_12m: 14.6, status: "red" },
  { category: "General", index_value: 106.1, change_30d: 1.5, change_90d: 3.4, change_12m: 6.8, status: "yellow" },
];

export interface IntelRecommendation {
  id: string;
  type: "pricing" | "opportunity" | "risk" | "cost" | "timing";
  title: string;
  summary: string;
  confidence: number;
  priority: "high" | "medium" | "low";
  status: "new" | "accepted" | "dismissed" | "snoozed";
  source: string;
  next_action: string;
  reasoning: string;
}

export const mockIntelRecommendations: IntelRecommendation[] = [
  {
    id: "REC-001",
    type: "pricing",
    title: "[DEMO] Increase copper-heavy estimates by 6-8%",
    summary: "Copper prices are up 6.8% in 30 days. Estimates built 90+ days ago are now underpriced.",
    confidence: 88,
    priority: "high",
    status: "new",
    source: "Material Index + Estimate History",
    next_action: "Review open estimates with copper line items",
    reasoning: "Copper index hit 131.0 — a 22% annual increase. Any estimate using copper fixtures or wiring at old prices is at risk of margin compression.",
  },
  {
    id: "REC-002",
    type: "opportunity",
    title: "[DEMO] 3 new bathroom permits pulled in 33601 zip",
    summary: "Permit data shows 3 bathroom renovation permits filed near your existing project area this week.",
    confidence: 74,
    priority: "high",
    status: "new",
    source: "Permit Activity Feed",
    next_action: "Draft outreach to homeowners at permitted addresses",
    reasoning: "Homeowners who pull permits often hire contractors. Being first to reach out in your active service area increases close probability by ~40%.",
  },
  {
    id: "REC-003",
    type: "risk",
    title: "[DEMO] Johnson Kitchen estimate margin now below 20%",
    summary: "Material cost increases since estimate was written have eroded projected margin from 25% to an estimated 19%.",
    confidence: 82,
    priority: "high",
    status: "new",
    source: "Job Costing + Material Index",
    next_action: "Request change order or value-engineer material selections",
    reasoning: "Lumber +4.2% and steel +5.9% in 30 days. PRJ-002 has significant framing and rough-in scope. At current burn rate margin will fall below break-even threshold.",
  },
  {
    id: "REC-004",
    type: "timing",
    title: "[DEMO] Schedule deck jobs before June — lumber spike likely",
    summary: "Seasonal lumber demand models suggest 8-12% additional price increase by June. Lock in material orders now.",
    confidence: 67,
    priority: "medium",
    status: "new",
    source: "Seasonal Model + Lumber Index",
    next_action: "Pre-order lumber for Walsh deck job and lock pricing",
    reasoning: "Spring construction season historically drives Q2 lumber spikes. Current index at 118.4 with upward momentum. Locking pricing now could save $800-1,400 on a mid-size deck project.",
  },
  {
    id: "REC-005",
    type: "cost",
    title: "[DEMO] Update LVP install assumption — market rate increased",
    summary: "Your stored LVP install assumption of $1.45/sqft is below current market rate of $1.65-1.80/sqft.",
    confidence: 79,
    priority: "medium",
    status: "new",
    source: "Cost Assumption Database + Market Comparison",
    next_action: "Update LVP install cost assumption to $1.70/sqft",
    reasoning: "Flooring subcontractor rates have increased with labor market tightening. Using stale assumption creates 14-24% underestimate on flooring scope.",
  },
];

export interface CostAssumption {
  id: string;
  category: string;
  label: string;
  value: string;
  unit: string;
  age_days: number;
  confidence: "high" | "medium" | "low";
  last_updated: string;
}

export const mockCostAssumptions: CostAssumption[] = [
  { id: "ASM-001", category: "Flooring", label: "LVP Install", value: "1.45", unit: "$/sqft", age_days: 94, confidence: "low", last_updated: "2026-01-26" },
  { id: "ASM-002", category: "Bathroom", label: "Bathroom Baseline", value: "4500", unit: "$/room", age_days: 47, confidence: "medium", last_updated: "2026-03-14" },
  { id: "ASM-003", category: "Kitchen", label: "Kitchen Baseline", value: "8500", unit: "$/room", age_days: 47, confidence: "medium", last_updated: "2026-03-14" },
  { id: "ASM-004", category: "Margin", label: "Margin Target", value: "35", unit: "%", age_days: 12, confidence: "high", last_updated: "2026-04-18" },
  { id: "ASM-005", category: "Labor", label: "Hourly Labor Rate", value: "45", unit: "$/hr", age_days: 12, confidence: "high", last_updated: "2026-04-18" },
  { id: "ASM-006", category: "Tile", label: "Tile Install (Floor)", value: "6.50", unit: "$/sqft", age_days: 30, confidence: "high", last_updated: "2026-03-31" },
  { id: "ASM-007", category: "Drywall", label: "Drywall Hang & Finish", value: "2.20", unit: "$/sqft", age_days: 61, confidence: "medium", last_updated: "2026-02-28" },
  { id: "ASM-008", category: "Painting", label: "Interior Paint", value: "1.80", unit: "$/sqft", age_days: 30, confidence: "high", last_updated: "2026-03-31" },
];

export interface PermitActivity {
  id: string;
  zip: string;
  city: string;
  permit_type: string;
  count: number;
  recent_date: string;
  value_range: string;
}

export const mockPermitActivity: PermitActivity[] = [
  { id: "PMT-001", zip: "33601", city: "Tampa", permit_type: "Bathroom Renovation", count: 3, recent_date: "2026-04-29", value_range: "$15k–$45k" },
  { id: "PMT-002", zip: "33602", city: "Tampa", permit_type: "Kitchen Remodel", count: 2, recent_date: "2026-04-28", value_range: "$20k–$60k" },
  { id: "PMT-003", zip: "33604", city: "Tampa", permit_type: "Addition / ADU", count: 1, recent_date: "2026-04-27", value_range: "$30k–$80k" },
  { id: "PMT-004", zip: "33701", city: "St. Petersburg", permit_type: "Deck / Porch", count: 4, recent_date: "2026-04-30", value_range: "$10k–$25k" },
  { id: "PMT-005", zip: "33755", city: "Clearwater", permit_type: "Basement Finishing", count: 2, recent_date: "2026-04-26", value_range: "$25k–$55k" },
];

export interface RiskAlert {
  id: string;
  type: "weather" | "material_spike" | "fuel" | "expired_data";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  date: string;
  affected: string;
}

export const mockRiskAlerts: RiskAlert[] = [
  { id: "RISK-001", type: "weather", title: "Tropical Storm Watch — Tampa Bay", description: "NHC tracking system 60% likely to develop. Possible outdoor work stoppage May 3–5. Deck and ADU projects at risk.", severity: "high", date: "2026-04-30", affected: "PRJ-003, Walsh Deck Estimate" },
  { id: "RISK-002", type: "material_spike", title: "Copper Price Spike — 6.8% in 30 Days", description: "Copper index at 131.0. Open estimates with copper electrical or plumbing scope may be underpriced.", severity: "high", date: "2026-04-30", affected: "All open estimates" },
  { id: "RISK-003", type: "fuel", title: "Fuel Cost Increase — 4.7% This Month", description: "Fuel index rising. Field vehicle and delivery costs tracking above budget. Review job overhead allocations.", severity: "medium", date: "2026-04-29", affected: "General overhead" },
  { id: "RISK-004", type: "expired_data", title: "LVP Install Assumption Expired (94 Days)", description: "Your LVP install rate of $1.45/sqft is 94 days old and below current market. Update before next flooring estimate.", severity: "medium", date: "2026-04-30", affected: "ASM-001, Future estimates" },
];

// ── Job Costs ─────────────────────────────────────────────────────────────────

export interface JobCostCategory {
  category: string;
  estimated: number;
  actual: number;
}

export interface JobCost {
  project_id: string;
  project_name: string;
  client: string;
  estimated_revenue: number;
  estimated_cost: number;
  actual_cost: number;
  categories: JobCostCategory[];
}

export const mockJobCosts: JobCost[] = [
  {
    project_id: "PRJ-001",
    project_name: "Master Bathroom Renovation",
    client: "Sandra Okafor",
    estimated_revenue: 18500,
    estimated_cost: 14000,
    actual_cost: 9840,
    categories: [
      { category: "Labor", estimated: 5600, actual: 4800 },
      { category: "Materials", estimated: 4800, actual: 3200 },
      { category: "Subs", estimated: 2400, actual: 1640 },
      { category: "Equipment", estimated: 600, actual: 200 },
      { category: "Overhead", estimated: 600, actual: 0 },
    ],
  },
  {
    project_id: "PRJ-002",
    project_name: "Johnson Kitchen Remodel",
    client: "Mike Johnson",
    estimated_revenue: 42000,
    estimated_cost: 31500,
    actual_cost: 28800,
    categories: [
      { category: "Labor", estimated: 9600, actual: 9200 },
      { category: "Materials", estimated: 14200, actual: 15400 },
      { category: "Subs", estimated: 5400, actual: 3200 },
      { category: "Equipment", estimated: 1300, actual: 1000 },
      { category: "Overhead", estimated: 1000, actual: 0 },
    ],
  },
  {
    project_id: "PRJ-003",
    project_name: "Garage Conversion ADU",
    client: "Lisa Thompson",
    estimated_revenue: 38000,
    estimated_cost: 28500,
    actual_cost: 1200,
    categories: [
      { category: "Labor", estimated: 11000, actual: 800 },
      { category: "Materials", estimated: 9500, actual: 400 },
      { category: "Subs", estimated: 6000, actual: 0 },
      { category: "Equipment", estimated: 1000, actual: 0 },
      { category: "Overhead", estimated: 1000, actual: 0 },
    ],
  },
];

// ─── TechOps ────────────────────────────────────────────────────────────────

export interface TicketEvent {
  id: string;
  type: "created" | "ai_diagnosis" | "remote_attempt" | "escalated" | "dispatched" | "resolved" | "note";
  timestamp: string;
  actor: string;
  message: string;
}

export interface TechOpsTicket {
  id: string;
  client: string;
  site: string;
  contact: string;
  category: string;
  subcategory: string;
  device: string;
  status: "open" | "in_progress" | "resolved" | "escalated" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  risk: "low" | "medium" | "high";
  assigned: string;
  created_at: string;
  updated_at: string;
  description: string;
  error_message?: string;
  remote_access: boolean;
  business_critical: boolean;
  happened_before: boolean;
  urgency: "low" | "medium" | "high" | "emergency";
  preferred_window?: string;
  events: TicketEvent[];
  dispatch_packet_id?: string;
}

export interface TechOpsStats {
  open: number;
  resolved_ai: number;
  escalated: number;
  dispatch_needed: number;
  avg_response_minutes: number;
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface DispatchPacket {
  id: string;
  ticket_id: string;
  client: string;
  site: string;
  site_address: string;
  contact_name: string;
  contact_phone: string;
  job_scope: string;
  status: "draft" | "ready" | "dispatched" | "complete";
  tools_needed: string[];
  access_notes: string;
  system_info: string;
  troubleshooting_done: string[];
  checklist: ChecklistItem[];
  created_at: string;
}

export interface KBArticle {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  risk: "low" | "medium" | "high";
  summary: string;
  content: string;
  tags: string[];
  created_at: string;
  helpful_count: number;
}

export const TECHOPS_CATEGORIES: Record<string, string[]> = {
  "Network & Connectivity": ["Wi-Fi Not Working", "No Internet", "Slow Speeds", "VPN Issues", "Router Config", "Network Switch"],
  "Smart Home Devices": ["Lights Not Responding", "Thermostat Offline", "Lock Not Working", "Doorbell Camera", "Smart Plugs", "Hub Offline"],
  "Audio/Video Systems": ["No Sound", "Display Issues", "HDMI Problems", "Receiver Not On", "Streaming Issues", "Projector"],
  "Security Systems": ["Alarm Triggered", "Camera Offline", "Sensor Fault", "Access Control", "Motion Detector", "Panel Issues"],
  "IT / Workstations": ["PC Won't Boot", "Slow Computer", "Printer Issues", "Software Install", "Password Reset", "Blue Screen"],
  "Surveillance / CCTV": ["Camera Offline", "No Recording", "DVR/NVR Issues", "Motion Alerts", "Remote Viewing", "Storage Full"],
  "Access Control": ["Keypad Not Working", "Card Reader Fault", "Door Lock", "Intercom", "Credential Issue", "Controller Offline"],
  "Other / General": ["Device Setup", "Cable Management", "Power Issues", "Unknown Error", "Maintenance", "Consultation"],
};

export const mockTechOpsTickets: TechOpsTicket[] = [
  {
    id: "TKT-1001",
    client: "Summit Properties",
    site: "Unit 4B – 320 Oak Ave",
    contact: "Maria Gonzalez",
    category: "Network & Connectivity",
    subcategory: "Wi-Fi Not Working",
    device: "Ubiquiti AP AC Pro",
    status: "open",
    priority: "high",
    risk: "low",
    assigned: "AI Agent",
    created_at: "2026-04-30 08:14",
    updated_at: "2026-04-30 08:20",
    description: "Tenant reports no Wi-Fi since this morning. Router lights look normal but no devices can connect.",
    error_message: "DHCP timeout on all connected clients",
    remote_access: true,
    business_critical: false,
    happened_before: false,
    urgency: "high",
    preferred_window: "ASAP",
    events: [
      { id: "e1", type: "created", timestamp: "2026-04-30 08:14", actor: "System", message: "Ticket created via portal" },
      { id: "e2", type: "ai_diagnosis", timestamp: "2026-04-30 08:20", actor: "AI Agent", message: "Diagnosing: DHCP scope exhaustion suspected. Attempting remote reset." },
    ],
  },
  {
    id: "TKT-1002",
    client: "Horizon AV",
    site: "Conference Room A – 88 Main St",
    contact: "Derek Walsh",
    category: "Audio/Video Systems",
    subcategory: "No Sound",
    device: "Sonos Amp + Denon AVR",
    status: "in_progress",
    priority: "medium",
    risk: "low",
    assigned: "AI Agent",
    created_at: "2026-04-29 15:30",
    updated_at: "2026-04-30 09:00",
    description: "Conference room audio dropped during a meeting. Display works but no sound through ceiling speakers.",
    remote_access: true,
    business_critical: true,
    happened_before: true,
    urgency: "medium",
    preferred_window: "Business hours",
    events: [
      { id: "e1", type: "created", timestamp: "2026-04-29 15:30", actor: "System", message: "Ticket created via phone intake" },
      { id: "e2", type: "ai_diagnosis", timestamp: "2026-04-29 15:35", actor: "AI Agent", message: "Pulled device logs. Sonos zone muted at system level. Attempting remote unmute." },
      { id: "e3", type: "remote_attempt", timestamp: "2026-04-29 16:00", actor: "AI Agent", message: "Remote unmute successful. Monitoring for recurrence." },
    ],
  },
  {
    id: "TKT-1003",
    client: "Greenleaf HOA",
    site: "Gate Entry – 200 Park Dr",
    contact: "Facilities Manager",
    category: "Access Control",
    subcategory: "Keypad Not Working",
    device: "HID ProxPoint Reader",
    status: "escalated",
    priority: "critical",
    risk: "high",
    assigned: "Field Tech",
    created_at: "2026-04-29 07:45",
    updated_at: "2026-04-30 08:30",
    description: "Gate entry keypad completely unresponsive. Residents cannot access community. Backup key override in use.",
    remote_access: false,
    business_critical: true,
    happened_before: false,
    urgency: "emergency",
    events: [
      { id: "e1", type: "created", timestamp: "2026-04-29 07:45", actor: "System", message: "Emergency ticket submitted" },
      { id: "e2", type: "ai_diagnosis", timestamp: "2026-04-29 07:50", actor: "AI Agent", message: "No remote access available. Hardware failure suspected. Escalating to field dispatch." },
      { id: "e3", type: "escalated", timestamp: "2026-04-29 08:00", actor: "AI Agent", message: "Escalated: Physical hardware fault, no remote resolution path. Dispatch packet created." },
    ],
    dispatch_packet_id: "DSP-001",
  },
  {
    id: "TKT-1004",
    client: "TechBridge MSP",
    site: "Client Workstation – Remote",
    contact: "Paul Reeves",
    category: "IT / Workstations",
    subcategory: "Blue Screen",
    device: "Dell OptiPlex 7090",
    status: "resolved",
    priority: "high",
    risk: "medium",
    assigned: "AI Agent",
    created_at: "2026-04-28 11:20",
    updated_at: "2026-04-28 12:45",
    description: "BSOD loop preventing Windows boot. Stop code: CRITICAL_PROCESS_DIED.",
    error_message: "CRITICAL_PROCESS_DIED – ntoskrnl.exe",
    remote_access: true,
    business_critical: false,
    happened_before: false,
    urgency: "high",
    events: [
      { id: "e1", type: "created", timestamp: "2026-04-28 11:20", actor: "System", message: "Ticket created" },
      { id: "e2", type: "ai_diagnosis", timestamp: "2026-04-28 11:25", actor: "AI Agent", message: "Identified corrupt system file via WinRE diagnostics. Initiating SFC and DISM repair sequence." },
      { id: "e3", type: "remote_attempt", timestamp: "2026-04-28 11:40", actor: "AI Agent", message: "SFC scan completed. 3 corrupt files repaired." },
      { id: "e4", type: "resolved", timestamp: "2026-04-28 12:45", actor: "AI Agent", message: "System boots normally. Issue resolved remotely." },
    ],
  },
  {
    id: "TKT-1005",
    client: "Luminex Security",
    site: "Office Lobby – 500 Commerce Blvd",
    contact: "Jason Park",
    category: "Surveillance / CCTV",
    subcategory: "Camera Offline",
    device: "Hikvision DS-2CD2143G2",
    status: "open",
    priority: "medium",
    risk: "medium",
    assigned: "AI Agent",
    created_at: "2026-04-30 07:00",
    updated_at: "2026-04-30 07:05",
    description: "Lobby entrance camera showing offline in NVR. Was working yesterday. Other cameras on same switch fine.",
    remote_access: true,
    business_critical: false,
    happened_before: false,
    urgency: "medium",
    events: [
      { id: "e1", type: "created", timestamp: "2026-04-30 07:00", actor: "System", message: "Ticket created" },
      { id: "e2", type: "ai_diagnosis", timestamp: "2026-04-30 07:05", actor: "AI Agent", message: "Pinging camera IP – no response. PoE port check in progress." },
    ],
    dispatch_packet_id: "DSP-002",
  },
  {
    id: "TKT-1006",
    client: "Maple Ridge Apartments",
    site: "Unit 12 – 750 Maple St",
    contact: "Sandra Kim",
    category: "Smart Home Devices",
    subcategory: "Thermostat Offline",
    device: "Ecobee SmartThermostat Premium",
    status: "resolved",
    priority: "low",
    risk: "low",
    assigned: "AI Agent",
    created_at: "2026-04-27 14:10",
    updated_at: "2026-04-27 14:35",
    description: "Thermostat shows offline in app. Unit says 'No Power' on screen.",
    remote_access: false,
    business_critical: false,
    happened_before: true,
    urgency: "low",
    preferred_window: "Evenings preferred",
    events: [
      { id: "e1", type: "created", timestamp: "2026-04-27 14:10", actor: "System", message: "Ticket submitted via portal" },
      { id: "e2", type: "ai_diagnosis", timestamp: "2026-04-27 14:15", actor: "AI Agent", message: "Remote access unavailable. Guided tenant through power cycle via SMS instructions." },
      { id: "e3", type: "resolved", timestamp: "2026-04-27 14:35", actor: "AI Agent", message: "Tenant confirmed thermostat back online after breaker reset. Closed." },
    ],
  },
];

export const mockTechOpsStats: TechOpsStats = {
  open: 3,
  resolved_ai: 18,
  escalated: 1,
  dispatch_needed: 2,
  avg_response_minutes: 4,
};

export const mockDispatchPackets: DispatchPacket[] = [
  {
    id: "DSP-001",
    ticket_id: "TKT-1003",
    client: "Greenleaf HOA",
    site: "Gate Entry – 200 Park Dr",
    site_address: "200 Park Drive, Greenleaf Community, TX 78701",
    contact_name: "Facilities Manager",
    contact_phone: "(512) 555-0192",
    job_scope: "Replace or repair HID ProxPoint Reader at main gate entry. Keypad unresponsive. Backup key override currently in use by residents.",
    status: "ready",
    tools_needed: ["HID ProxPoint Reader (replacement)", "Wiegand cable tester", "Multimeter", "Conduit fish tape", "Laptop with ACT Pro software"],
    access_notes: "Gate code: 4421. Property manager will be on site 8am–12pm. Parking available inside gate via manual override.",
    system_info: "HID ProxPoint Reader, Model 6005B. Controller: ACT Pro 2000. Last firmware: 2023-08. Controller IP: 192.168.1.45.",
    troubleshooting_done: [
      "Remote reboot attempted – no response",
      "Controller online, reader offline",
      "Wiegand signal absent",
      "Reader power measured at 0V at panel",
    ],
    checklist: [
      { label: "Confirm site access with property manager", done: true },
      { label: "Test existing reader with multimeter", done: false },
      { label: "Replace reader if power confirmed dead", done: false },
      { label: "Re-enroll credentials in ACT Pro", done: false },
      { label: "Test gate operation with 3 credentials", done: false },
      { label: "Document and close ticket", done: false },
    ],
    created_at: "2026-04-29 08:00",
  },
  {
    id: "DSP-002",
    ticket_id: "TKT-1005",
    client: "Luminex Security",
    site: "Office Lobby – 500 Commerce Blvd",
    site_address: "500 Commerce Blvd, Suite 100, Austin, TX 78704",
    contact_name: "Jason Park",
    contact_phone: "(512) 555-0847",
    job_scope: "Diagnose and restore offline Hikvision lobby entrance camera. PoE power suspected. May require switch port swap or camera replacement.",
    status: "draft",
    tools_needed: ["PoE tester", "Cat6 cable tester", "Replacement Hikvision DS-2CD2143G2", "Laptop with IVMS-4200"],
    access_notes: "Building access requires badge. Contact Jason Park on arrival. Camera located above main entrance door, approx 10ft height – bring small ladder.",
    system_info: "Hikvision DS-2CD2143G2, IP: 192.168.10.55. NVR: DS-7616NXI-I2/16P. PoE switch: Netgear GS316P port 4.",
    troubleshooting_done: [
      "Camera IP unreachable",
      "PoE switch port 4 showing no draw",
      "Other cameras on same switch operational",
    ],
    checklist: [
      { label: "Test PoE port 4 with tester", done: false },
      { label: "Try alternate PoE port", done: false },
      { label: "Test camera on known-good port", done: false },
      { label: "Replace camera if hardware fault confirmed", done: false },
      { label: "Verify recording in NVR", done: false },
      { label: "Document and close ticket", done: false },
    ],
    created_at: "2026-04-30 07:30",
  },
];

export const mockKBArticles: KBArticle[] = [
  {
    id: "KB-001",
    title: "Resolving DHCP Scope Exhaustion on Ubiquiti Networks",
    category: "Network & Connectivity",
    subcategory: "Wi-Fi Not Working",
    risk: "low",
    summary: "Step-by-step guide to diagnose and fix DHCP scope exhaustion on Ubiquiti UniFi controllers.",
    content: "## Symptoms\n- Devices connect to Wi-Fi but get no IP address\n- DHCP logs show \"no available leases\"\n- Typically affects networks with 50+ devices\n\n## Diagnosis\n1. Log into UniFi Controller → Settings → Networks\n2. Check DHCP Range — if Used > 90%, you have exhaustion\n3. Review lease table for stale leases\n\n## Resolution\n1. Expand DHCP range (e.g., /24 to /23)\n2. Reduce lease duration from 24h to 4h for IoT networks\n3. Restart DHCP service via SSH: `sudo systemctl restart unifi`\n4. Force lease renewal on affected clients\n\n## Prevention\n- Segment IoT devices onto separate VLAN\n- Monitor DHCP utilization in UniFi dashboard",
    tags: ["ubiquiti", "unifi", "dhcp", "wifi", "network"],
    created_at: "2026-03-15",
    helpful_count: 47,
  },
  {
    id: "KB-002",
    title: "HID ProxPoint Reader – Power & Wiegand Troubleshooting",
    category: "Access Control",
    subcategory: "Card Reader Fault",
    risk: "high",
    summary: "Diagnosing unresponsive HID ProxPoint readers including power faults, Wiegand signal loss, and controller config issues.",
    content: "## Safety Note\nAccess control faults can create security risks. Confirm backup access is available before proceeding.\n\n## Symptoms\n- Reader LED off or stuck on single color\n- No beep on credential presentation\n- Controller shows reader offline\n\n## Diagnosis\n1. Measure voltage at reader terminals (should be 5–16V DC)\n2. Test Wiegand D0/D1 lines with oscilloscope or tester\n3. Check controller port assignment in ACT Pro / Lenel / Genetec\n\n## Resolution\n1. **No power**: Check panel fuse, wire continuity, PSU output\n2. **Wiegand fault**: Re-terminate connectors, test cable continuity\n3. **Controller config**: Verify reader address matches panel port\n4. **Hardware failure**: Replace reader (typical lifespan 7–10 years)\n\n## Parts\n- HID ProxPoint 6005B: ~$85\n- HID Multiclass SE RP40: ~$165 (upgrade option)",
    tags: ["hid", "access control", "wiegand", "reader", "hardware"],
    created_at: "2026-02-10",
    helpful_count: 23,
  },
  {
    id: "KB-003",
    title: "Windows BSOD CRITICAL_PROCESS_DIED – Remote Recovery",
    category: "IT / Workstations",
    subcategory: "Blue Screen",
    risk: "medium",
    summary: "Remote resolution procedure for CRITICAL_PROCESS_DIED stop errors on Windows 10/11.",
    content: "## Overview\nCRITICAL_PROCESS_DIED typically indicates corrupt system files, failed drivers, or disk errors. Most cases are resolvable remotely via WinRE.\n\n## Steps\n1. Boot into WinRE (hold Shift while clicking Restart, or use bootable media)\n2. Open Command Prompt from Advanced Options\n3. Run SFC: `sfc /scannow`\n4. Run DISM: `DISM /Online /Cleanup-Image /RestoreHealth`\n5. Check disk: `chkdsk C: /f /r`\n6. If driver-related: boot into Safe Mode, remove recent drivers\n\n## Remote Access Path\n- If machine is in BSOD loop, remote tools are unavailable\n- Use guided SMS/phone walkthrough to get client into WinRE\n- Consider TeamViewer Boot Media for fully remote repair\n\n## Escalate If\n- Disk has bad sectors (chkdsk shows errors)\n- Multiple SFC attempts fail\n- RAM test shows failures",
    tags: ["windows", "bsod", "blue screen", "sfc", "dism", "workstation"],
    created_at: "2026-01-20",
    helpful_count: 61,
  },
  {
    id: "KB-004",
    title: "Hikvision Camera Offline – PoE and IP Camera Recovery",
    category: "Surveillance / CCTV",
    subcategory: "Camera Offline",
    risk: "medium",
    summary: "Diagnosing offline Hikvision IP cameras including PoE faults, IP conflicts, and firmware issues.",
    content: "## Diagnosis Flow\n1. Ping camera IP — if no response, proceed to physical layer\n2. Check PoE switch port: LED lit? Power draw showing in switch UI?\n3. Swap camera to known-good PoE port\n4. If camera responds on new port, original port is faulty\n\n## PoE Troubleshooting\n- Verify switch supports correct PoE standard (802.3af vs 802.3at)\n- Check port power budget — cameras typically need 6–13W\n- Run PoE tester to confirm voltage at camera end\n\n## IP Conflict Resolution\n1. Access NVR → Device Management\n2. Manually assign static IP outside DHCP range\n3. Flush ARP cache: `arp -d *` on NVR (SSH)\n\n## Firmware Reset\n- Hold reset button 10s (power on)\n- Default IP: 192.168.1.64\n- Re-add to NVR after reset\n\n## Escalate If\n- Physical damage visible on camera body\n- Multiple cameras on same switch going offline",
    tags: ["hikvision", "camera", "poe", "cctv", "nvr", "ip camera"],
    created_at: "2026-03-01",
    helpful_count: 38,
  },
  {
    id: "KB-005",
    title: "Ecobee Thermostat Shows No Power – Diagnosis Guide",
    category: "Smart Home Devices",
    subcategory: "Thermostat Offline",
    risk: "low",
    summary: "Resolving Ecobee 'No Power' errors caused by C-wire issues, tripped breakers, or furnace faults.",
    content: "## Common Causes\n1. C-wire not connected or broken\n2. Tripped HVAC breaker or blown fuse\n3. Furnace lockout (safety shutoff)\n4. Transformer failure\n\n## Remote-Guided Steps for Tenant\n1. Locate HVAC breaker in panel — reset if tripped\n2. Check furnace power switch (looks like light switch near unit)\n3. Check for furnace error codes on display\n4. Look at thermostat wiring for C-wire (blue wire to C terminal)\n\n## Technician Steps\n1. Measure 24VAC on R and C terminals — should read ~24–28V\n2. If no voltage: check transformer on furnace (25VA min for Ecobee)\n3. Install Ecobee Power Extender Kit if no C-wire available\n4. For furnace lockout: resolve underlying fault, then reset\n\n## Power Extender Kit Install\n- Reroute G wire as C-wire substitute\n- Remap in Ecobee setup under Installation Settings\n\n## Notes\n- Ecobee internal battery maintains settings 30–60 min without power\n- App shows 'Offline' within 5 min of power loss",
    tags: ["ecobee", "thermostat", "smart home", "hvac", "c-wire", "no power"],
    created_at: "2026-02-28",
    helpful_count: 29,
  },
];

// ── OGIS: Growth Engine ───────────────────────────────────────────────────────

export interface NicheVoiceProfile {
  id: string;
  niche: string;
  display_name: string;
  version: string;
  confidence: number;
  last_refreshed: string;
  tone_rules: string[];
  banned_phrases: string[];
  vocabulary: { preferred: string[]; avoided: string[] };
  triggers: { emotional: string[]; logical: string[] };
  objections: string[];
  trust_signals: string[];
  archetypes: { name: string; description: string }[];
}

export const mockNVP: NicheVoiceProfile = {
  id: "NVP-001",
  niche: "property_management",
  display_name: "Property Management",
  version: "2.1",
  confidence: 84,
  last_refreshed: "2026-04-28",
  tone_rules: [
    "Lead with tenant outcomes, not service features",
    "Use calm, authoritative language — not salesy urgency",
    "Acknowledge pain before presenting solution",
    "Short sentences. One idea per line.",
    "Avoid corporate jargon — write like a trusted advisor",
  ],
  banned_phrases: [
    "game-changer",
    "revolutionary",
    "world-class",
    "seamless experience",
    "cutting-edge",
    "synergy",
    "best-in-class",
    "unlock your potential",
  ],
  vocabulary: {
    preferred: [
      "vacant unit",
      "turn time",
      "NOI",
      "maintenance backlog",
      "lease renewal",
      "delinquency rate",
      "cap rate",
      "portfolio",
      "tenant retention",
      "work order",
    ],
    avoided: [
      "client",
      "customer journey",
      "end user",
      "stakeholder",
      "deliverable",
      "platform",
    ],
  },
  triggers: {
    emotional: [
      "Fear of vacancy revenue loss",
      "Frustration with maintenance delays",
      "Anxiety over delinquency spikes",
      "Pride in a well-run portfolio",
      "Relief when a problem is solved fast",
    ],
    logical: [
      "Cost per turn",
      "Days to fill vacancy",
      "Maintenance cost per unit",
      "Lease renewal rate %",
      "NOI impact of 1% delinquency increase",
    ],
  },
  objections: [
    "We already have a system that works",
    "Our team handles everything in-house",
    "Too expensive to switch",
    "Our owners won't approve new vendors",
    "We tried software before and it didn't stick",
  ],
  trust_signals: [
    "Door-to-door track record with portfolio operators",
    "SOC 2 Type II certified",
    "Average 14-day implementation",
    "Dedicated property manager onboarding specialist",
    "Case study: 32% reduction in turn time at 400-unit portfolio",
  ],
  archetypes: [
    {
      name: "The Overwhelmed Operator",
      description:
        "Managing 50–200 units solo or with a small team. Drowning in maintenance calls, late rent, and owner requests. Needs relief, not more tools.",
    },
    {
      name: "The Portfolio Optimizer",
      description:
        "Runs 200–1,000+ units. Focused on NOI, KPIs, and efficiency gains. Responds to data, case studies, and ROI projections.",
    },
    {
      name: "The Reluctant Tech Adopter",
      description:
        "Has been burned by software before. Needs proof of ease-of-use, fast onboarding, and live support before committing.",
    },
  ],
};

export interface ContentPiece {
  id: string;
  niche: string;
  platform: "instagram" | "facebook" | "linkedin" | "google" | "email";
  hook: string;
  body: string;
  cta: string;
  emotional_trigger: string;
  hypothesis: string;
  critic_score: number | null;
  critic_status: "pass" | "fail" | "pending";
  critic_notes: string | null;
  distribution_status: "draft" | "scheduled" | "published";
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
}

export const mockContentLibrary: ContentPiece[] = [
  {
    id: "CNT-001",
    niche: "property_management",
    platform: "instagram",
    hook: "Your vacancy is costing you $2,400/month and you don't even know it.",
    body: "Most property managers track rent collected. The ones growing their portfolio track vacancy loss.\n\nEvery day a unit sits empty: that's $80 gone. 30 days: $2,400. 3 units at once: $7,200/month bleeding out.\n\nThe fix isn't magic. It's turn time — how fast you flip a vacant unit.\n\nThe best operators we work with average 12 days. Industry average: 28.",
    cta: "Drop your average turn time below. We'll tell you where the leak is.",
    emotional_trigger: "Fear of revenue loss",
    hypothesis: "Quantifying vacancy loss in dollar terms outperforms generic 'fill vacancies faster' messaging.",
    critic_score: 88,
    critic_status: "pass",
    critic_notes: "Strong hook with specific number. Body uses operator vocabulary well. CTA invites engagement without hard sell. Approved.",
    distribution_status: "scheduled",
    scheduled_for: "2026-05-02T10:00:00Z",
    published_at: null,
    created_at: "2026-04-29",
  },
  {
    id: "CNT-002",
    niche: "property_management",
    platform: "linkedin",
    hook: "The PM who calls a tenant back in under 2 hours retains them 40% longer.",
    body: "That stat came from our internal cohort data across 14 property management clients.\n\nTenants don't leave because of rent increases. They leave because they feel ignored.\n\nOne maintenance request left unacknowledged for 48 hours does more damage than a $50/month rent increase.\n\nResponse time is your retention strategy.",
    cta: "If your average first-response time is over 4 hours, let's talk about what's in the way.",
    emotional_trigger: "Pride in a well-run portfolio",
    hypothesis: "Data-backed retention framing resonates with LinkedIn PM audience more than feature-focused copy.",
    critic_score: 91,
    critic_status: "pass",
    critic_notes: "Excellent use of internal data as authority signal. Reframes retention as an ops problem, not a price problem. LinkedIn-appropriate length and tone. Approved.",
    distribution_status: "published",
    scheduled_for: null,
    published_at: "2026-04-28T14:00:00Z",
    created_at: "2026-04-27",
  },
  {
    id: "CNT-003",
    niche: "property_management",
    platform: "facebook",
    hook: "Are you tired of dealing with maintenance nightmares? Our revolutionary platform is the game-changer you've been waiting for!",
    body: "Managing properties has never been easier with our world-class, cutting-edge solution! Unlock your potential and experience a seamless, best-in-class property management experience that will transform your workflow synergy and deliver end-to-end stakeholder value.",
    cta: "Click here to learn more about our amazing platform today!",
    emotional_trigger: "Generic excitement",
    hypothesis: "High-energy promotional language will drive clicks.",
    critic_score: 22,
    critic_status: "fail",
    critic_notes: "Multiple banned phrases detected: 'game-changer', 'revolutionary', 'world-class', 'cutting-edge', 'seamless', 'best-in-class', 'synergy'. Hook has no specificity. Body makes no operator-specific claim. Rejected — rewrite required.",
    distribution_status: "draft",
    scheduled_for: null,
    published_at: null,
    created_at: "2026-04-29",
  },
  {
    id: "CNT-004",
    niche: "property_management",
    platform: "instagram",
    hook: "3 signs your delinquency rate is about to spike (and what to do in the next 7 days).",
    body: "Most delinquency problems show up on the 5th of the month. But the warning signs appear on the 25th.\n\n1. Tenant hasn't opened your renewal offer\n2. Maintenance requests spike right before rent is due\n3. Partial payments two months in a row\n\nEach one is a signal. Together they're a pattern.",
    cta: "What's your current delinquency rate? Reply and I'll walk you through how top operators address each signal.",
    emotional_trigger: "Anxiety over delinquency spikes",
    hypothesis: "Predictive warning signals framing creates urgency without being alarmist.",
    critic_score: null,
    critic_status: "pending",
    critic_notes: null,
    distribution_status: "draft",
    scheduled_for: null,
    published_at: null,
    created_at: "2026-04-30",
  },
  {
    id: "CNT-005",
    niche: "property_management",
    platform: "email",
    hook: "How this 80-unit operator cut turn time from 26 days to 11.",
    body: "Marcus runs 80 units in Phoenix. Eight months ago, his average turn time was 26 days.\n\nHis units were clean. His vendors were reliable. His team was responsive.\n\nThe problem wasn't quality — it was sequencing.\n\nHe was scheduling vendors reactively. Inspection → Wait → Cleaning → Wait → Repair → Wait → Listing.\n\nEight months later: 11 days average. Same team. Different sequence.\n\nHere's the playbook we built together.",
    cta: "Reply 'TURN' and I'll send you the full 6-step sequence Marcus uses.",
    emotional_trigger: "Relief when a problem is solved fast",
    hypothesis: "Operator case studies with named protagonist outperform anonymous testimonials by 2–3x in email.",
    critic_score: 85,
    critic_status: "pass",
    critic_notes: "Strong narrative arc. Named subject adds credibility. 'Same team. Different sequence.' is the insight hook. CTA is frictionless. Minor suggestion: add Marcus's NOI improvement if data available. Approved as-is.",
    distribution_status: "scheduled",
    scheduled_for: "2026-05-05T08:00:00Z",
    published_at: null,
    created_at: "2026-04-28",
  },
  {
    id: "CNT-006",
    niche: "property_management",
    platform: "linkedin",
    hook: "Your maintenance backlog is a retention risk, not just an ops problem.",
    body: "If you have more than 14 open work orders per 100 units, tenants are already forming an opinion about renewal.\n\nThey won't tell you. They'll just leave.\n\nThe operators with the highest renewal rates share one habit: they close out the backlog before it reaches 10 per 100.\n\nNot because tenants track the number. Because they feel the difference.",
    cta: "What does your current work order backlog look like? Drop the number below.",
    emotional_trigger: "Frustration with maintenance delays",
    hypothesis: "Maintenance backlog as a retention lever is an underexplored angle that will generate high engagement from PMs.",
    critic_score: 79,
    critic_status: "pass",
    critic_notes: "Good use of benchmark number (14 per 100). Emotional close lands well. Could strengthen by adding the cost per lost tenant renewal to make it more logical-trigger-heavy. Approved.",
    distribution_status: "published",
    scheduled_for: null,
    published_at: "2026-04-25T11:00:00Z",
    created_at: "2026-04-24",
  },
];

export interface WinningPattern {
  id: string;
  category: "hook_style" | "posting_time" | "content_type";
  label: string;
  description: string;
  avg_engagement_rate: number;
  sample_count: number;
  insight: string;
}

export const mockWinningPatterns: WinningPattern[] = [
  {
    id: "PAT-001",
    category: "hook_style",
    label: "Specific Dollar / Number Hook",
    description: "Hooks that open with a specific dollar amount, percentage, or day count tied to a cost or outcome.",
    avg_engagement_rate: 6.4,
    sample_count: 18,
    insight: "Specificity creates credibility. '$2,400/month' outperforms 'losing money on vacancies' by 3.1x in saves and shares.",
  },
  {
    id: "PAT-002",
    category: "posting_time",
    label: "Tuesday & Thursday, 9–11am",
    description: "Posts published Tuesday or Thursday between 9am and 11am local time consistently outperform other windows.",
    avg_engagement_rate: 5.9,
    sample_count: 24,
    insight: "Property managers are in office but pre-midday. Decision-making window before the day's fires take over. Avoid Monday mornings and Friday afternoons.",
  },
  {
    id: "PAT-003",
    category: "content_type",
    label: "Operator Case Study (Named)",
    description: "Short narrative posts featuring a named operator with a before/after measurable outcome.",
    avg_engagement_rate: 7.2,
    sample_count: 11,
    insight: "Named case studies generate 2.4x more DMs than anonymous examples. Readers project themselves onto the protagonist. Best format: 150–220 words with one specific metric as the headline.",
  },
];

export interface ContentPerformance {
  id: string;
  content_id: string;
  hook_preview: string;
  platform: string;
  published_at: string;
  impressions: number;
  engagements: number;
  engagement_rate: number;
  ctr: number;
  saves: number;
  shares: number;
  dms: number;
}

export const mockContentPerformance: ContentPerformance[] = [
  {
    id: "PERF-001",
    content_id: "CNT-002",
    hook_preview: "The PM who calls a tenant back in under 2 hours retains them 40% longer.",
    platform: "linkedin",
    published_at: "2026-04-28T14:00:00Z",
    impressions: 4820,
    engagements: 439,
    engagement_rate: 9.1,
    ctr: 3.4,
    saves: 112,
    shares: 67,
    dms: 14,
  },
  {
    id: "PERF-002",
    content_id: "CNT-006",
    hook_preview: "Your maintenance backlog is a retention risk, not just an ops problem.",
    platform: "linkedin",
    published_at: "2026-04-25T11:00:00Z",
    impressions: 3210,
    engagements: 254,
    engagement_rate: 7.9,
    ctr: 2.8,
    saves: 88,
    shares: 41,
    dms: 9,
  },
  {
    id: "PERF-003",
    content_id: "CNT-001",
    hook_preview: "Your vacancy is costing you $2,400/month and you don't even know it.",
    platform: "instagram",
    published_at: "2026-04-22T10:00:00Z",
    impressions: 2890,
    engagements: 185,
    engagement_rate: 6.4,
    ctr: 2.1,
    saves: 74,
    shares: 28,
    dms: 6,
  },
];

// ─── Social Integrations ────────────────────────────────────────────────────

export const SOCIAL_PLATFORMS = [
  { id: "facebook", name: "Facebook Pages", icon: "📘", color: "#1877F2" },
  { id: "instagram", name: "Instagram", icon: "📷", color: "#E4405F" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "#0A66C2" },
  { id: "google_business", name: "Google Business", icon: "🏢", color: "#4285F4" },
  { id: "youtube", name: "YouTube", icon: "▶️", color: "#FF0000" },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "#000000" },
  { id: "twitter", name: "X/Twitter", icon: "𝕏", color: "#1DA1F2" },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]["id"];

export interface SocialConnection {
  id: string;
  platform: SocialPlatformId;
  account_name: string;
  status: "connected" | "needs_reconnect" | "disconnected";
  last_sync: string | null;
  token_expires: string | null;
  permissions: {
    read: boolean;
    publish: boolean;
    analytics: boolean;
    manage_comments: boolean;
  };
}

export interface SocialPost {
  id: string;
  content: string;
  platform: SocialPlatformId;
  status: "draft" | "pending" | "approved" | "scheduled" | "published" | "rejected" | "failed";
  scheduled_at: string | null;
  published_at: string | null;
  created_by_agent: string | null;
  approval_status: "not_submitted" | "pending_review" | "approved" | "rejected";
  rejection_reason: string | null;
  media_urls: string[];
  emotional_trigger: string | null;
  cta: string | null;
  engagement: { likes: number; comments: number; shares: number; reach: number } | null;
}

export const mockSocialConnections: SocialConnection[] = [
  {
    id: "SC-001",
    platform: "facebook",
    account_name: "OttoServ Property Management",
    status: "connected",
    last_sync: "2026-04-30T08:15:00Z",
    token_expires: "2026-07-30T00:00:00Z",
    permissions: { read: true, publish: true, analytics: true, manage_comments: true },
  },
  {
    id: "SC-002",
    platform: "instagram",
    account_name: "@ottoserv_pm",
    status: "disconnected",
    last_sync: null,
    token_expires: null,
    permissions: { read: false, publish: false, analytics: false, manage_comments: false },
  },
  {
    id: "SC-003",
    platform: "linkedin",
    account_name: "OttoServ",
    status: "connected",
    last_sync: "2026-04-29T12:00:00Z",
    token_expires: "2026-08-01T00:00:00Z",
    permissions: { read: true, publish: true, analytics: true, manage_comments: false },
  },
  {
    id: "SC-004",
    platform: "google_business",
    account_name: "OttoServ – Main Office",
    status: "connected",
    last_sync: "2026-04-30T06:00:00Z",
    token_expires: "2026-08-15T00:00:00Z",
    permissions: { read: true, publish: true, analytics: true, manage_comments: true },
  },
  {
    id: "SC-005",
    platform: "tiktok",
    account_name: "@ottoserv",
    status: "disconnected",
    last_sync: null,
    token_expires: null,
    permissions: { read: false, publish: false, analytics: false, manage_comments: false },
  },
];

export const mockSocialPosts: SocialPost[] = [
  {
    id: "SP-001",
    content: "🏡 Spring maintenance season is here! Our team is fully booked through May — but we're accepting new property management clients starting June. DM us to get on the waitlist before spots fill up.",
    platform: "facebook",
    status: "published",
    scheduled_at: "2026-04-28T10:00:00Z",
    published_at: "2026-04-28T10:02:00Z",
    created_by_agent: "Growth Agent",
    approval_status: "approved",
    rejection_reason: null,
    media_urls: [],
    emotional_trigger: "urgency",
    cta: "DM us to get on the waitlist",
    engagement: { likes: 142, comments: 18, shares: 31, reach: 4200 },
  },
  {
    id: "SP-002",
    content: "Your vacancy is costing you $2,400/month and you don't even know it. Most landlords underestimate vacancy loss because they only count missed rent — not turnover costs, utilities, and market drift. Here's what the math actually looks like 👇",
    platform: "instagram",
    status: "published",
    scheduled_at: "2026-04-22T10:00:00Z",
    published_at: "2026-04-22T10:01:00Z",
    created_by_agent: "Growth Agent",
    approval_status: "approved",
    rejection_reason: null,
    media_urls: [],
    emotional_trigger: "pain_point",
    cta: "Link in bio to get our vacancy cost calculator",
    engagement: { likes: 88, comments: 12, shares: 19, reach: 2890 },
  },
  {
    id: "SP-003",
    content: "We just onboarded our 50th property this quarter. Here's the system that makes it possible without adding headcount: automated intake, AI-generated SOPs per property type, and a Jarvis agent that handles the first 72 hours of every new tenant relationship.",
    platform: "linkedin",
    status: "scheduled",
    scheduled_at: "2026-05-02T09:00:00Z",
    published_at: null,
    created_by_agent: "Growth Agent",
    approval_status: "approved",
    rejection_reason: null,
    media_urls: [],
    emotional_trigger: "social_proof",
    cta: "Comment 'SYSTEM' and I'll send you the full breakdown",
    engagement: null,
  },
  {
    id: "SP-004",
    content: "3 maintenance request red flags that signal a tenant is about to churn:\n\n1. Repeated small requests in a short window\n2. Requests submitted late at night\n3. Silence after a slow response\n\nWe built an alert system that catches all three. Want to see how it works?",
    platform: "facebook",
    status: "pending",
    scheduled_at: "2026-05-05T11:00:00Z",
    published_at: null,
    created_by_agent: "Growth Agent",
    approval_status: "pending_review",
    rejection_reason: null,
    media_urls: [],
    emotional_trigger: "curiosity",
    cta: "Comment YES for a demo",
    engagement: null,
  },
  {
    id: "SP-005",
    content: "Most property managers are reactive. We built OttoServ to be predictive. Our intelligence layer surfaces at-risk properties before tenants even know they're unhappy. Early access is open this month only.",
    platform: "instagram",
    status: "approved",
    scheduled_at: "2026-05-07T14:00:00Z",
    published_at: null,
    created_by_agent: "Growth Agent",
    approval_status: "approved",
    rejection_reason: null,
    media_urls: [],
    emotional_trigger: "fomo",
    cta: "Tap the link in bio",
    engagement: null,
  },
  {
    id: "SP-006",
    content: "Draft: Why we stopped using spreadsheets to manage vendor relationships — and what we use instead. [NEEDS STAT FROM FINANCE TEAM]",
    platform: "linkedin",
    status: "draft",
    scheduled_at: null,
    published_at: null,
    created_by_agent: null,
    approval_status: "not_submitted",
    rejection_reason: null,
    media_urls: [],
    emotional_trigger: null,
    cta: null,
    engagement: null,
  },
  {
    id: "SP-007",
    content: "This post had too much promotional language for our brand voice. Rewrite to be insight-led, not sales-led. Reference a real operational challenge first.",
    platform: "facebook",
    status: "rejected",
    scheduled_at: null,
    published_at: null,
    created_by_agent: "Growth Agent",
    approval_status: "rejected",
    rejection_reason: "Too promotional — doesn't match our insight-first brand voice. Lead with the problem, not the pitch.",
    media_urls: [],
    emotional_trigger: "urgency",
    cta: "Sign up now",
    engagement: null,
  },
  {
    id: "SP-008",
    content: "Google Business post: May service availability update — spring bookings open. Contact us to schedule a property walkthrough.",
    platform: "google_business",
    status: "failed",
    scheduled_at: "2026-04-29T09:00:00Z",
    published_at: null,
    created_by_agent: "Growth Agent",
    approval_status: "approved",
    rejection_reason: null,
    media_urls: [],
    emotional_trigger: null,
    cta: "Contact us",
    engagement: null,
  },
];

// ─── Social Intelligence Agent (SIA) ─────────────────────────────────────────

export type SIAPainType = "lead_volume" | "lead_quality" | "operations" | "unknown";
export type SIAPostStatus =
  | "detected"
  | "pending_approval"
  | "approved"
  | "commented"
  | "replied"
  | "dm_sent";

export interface SIAPost {
  id: string;
  platform: "reddit";
  subreddit: string;
  post_excerpt: string;
  intent_score: number; // 0–100
  pain_type: SIAPainType;
  generated_comment: string;
  status: SIAPostStatus;
  post_url: string;
  author: string;
  detected_at: string;
  reply_count: number;
  engagement_score: number | null;
  dm_triggered: boolean;
}

export interface SIATemplate {
  id: string;
  type: "comment" | "dm";
  target_pain: SIAPainType;
  name: string;
  content: string;
  times_used: number;
  reply_rate: string;
  conversions: number;
}

export interface SIAStats {
  posts_detected: number;
  pending_approval: number;
  comments_posted: number;
  reply_rate: string;
  dm_sent: number;
  conversions: number;
}

export const mockSIAPosts: SIAPost[] = [
  {
    id: "SIA-001",
    platform: "reddit",
    subreddit: "r/PropertyManagement",
    post_excerpt:
      "We manage 40 doors and can't seem to get consistent leads without burning money on ads. Anyone found a way to generate leads organically? Every channel we try dies after a few weeks.",
    intent_score: 91,
    pain_type: "lead_volume",
    generated_comment:
      "40 doors is exactly the inflection point where ad spend starts to hurt. What's worked for us is showing up in the communities where your ideal landlords already hang — local Facebook groups, neighborhood forums. We went from 0 to 12 inbound leads/month just from consistent comment presence before running a single ad. Happy to break down the exact process if useful.",
    status: "pending_approval",
    post_url: "https://reddit.com/r/PropertyManagement/comments/sia001",
    author: "landlord_struggles_real",
    detected_at: "2026-04-30T07:12:00Z",
    reply_count: 0,
    engagement_score: null,
    dm_triggered: false,
  },
  {
    id: "SIA-002",
    platform: "reddit",
    subreddit: "r/realestateinvesting",
    post_excerpt:
      "Getting leads isn't the problem. Getting QUALIFIED leads is. We waste so much time on tire-kickers who aren't ready to hand over their properties. How do you filter upfront?",
    intent_score: 78,
    pain_type: "lead_quality",
    generated_comment:
      "We had the same problem — high volume, low close rate. The fix was a 3-question pre-qualifier on every inbound channel: number of units, current management situation, and timeline. Cut our discovery calls in half and close rate went from 18% to 41% in one quarter. The key is setting expectations before the first call, not during it.",
    status: "pending_approval",
    post_url: "https://reddit.com/r/realestateinvesting/comments/sia002",
    author: "rei_grinder_pdx",
    detected_at: "2026-04-30T09:44:00Z",
    reply_count: 0,
    engagement_score: null,
    dm_triggered: false,
  },
  {
    id: "SIA-003",
    platform: "reddit",
    subreddit: "r/PropertyManagement",
    post_excerpt:
      "Our maintenance coordination is a mess. Vendors don't show, tenants are furious, and I'm spending 3 hours a day on the phone playing middleman. Is this just the job?",
    intent_score: 85,
    pain_type: "operations",
    generated_comment:
      "This was us 18 months ago. The phone tag is a symptom — the real issue is no single source of truth for vendor status. We built a dispatch system where tenants get automated updates and vendors confirm via a simple link (no app required). Dropped our 'where's my repair?' calls by 80%. Not the job — just the wrong workflow.",
    status: "detected",
    post_url: "https://reddit.com/r/PropertyManagement/comments/sia003",
    author: "pm_in_the_trenches",
    detected_at: "2026-04-30T11:20:00Z",
    reply_count: 0,
    engagement_score: null,
    dm_triggered: false,
  },
  {
    id: "SIA-004",
    platform: "reddit",
    subreddit: "r/PropertyManagement",
    post_excerpt:
      "We're at 22 properties and thinking about scaling to 50 but I'm scared of breaking the systems we have. Anyone scaled past this point? What breaks first?",
    intent_score: 88,
    pain_type: "lead_volume",
    generated_comment:
      "22→50 is the hardest jump in PM. What breaks first: communication volume (tenant/vendor messages become unmanageable), reporting (you can't manually compile data for that many doors), and onboarding (every new property takes too long without a template). We documented exactly how we did this — standardized SOPs per property type, automated intake, and a dispatch layer for vendors. Three months to double door count without adding headcount.",
    status: "commented",
    post_url: "https://reddit.com/r/PropertyManagement/comments/sia004",
    author: "scaling_slowly_22",
    detected_at: "2026-04-28T13:10:00Z",
    reply_count: 4,
    engagement_score: 82,
    dm_triggered: false,
  },
  {
    id: "SIA-005",
    platform: "reddit",
    subreddit: "r/realestateinvesting",
    post_excerpt:
      "Tried two property management companies and neither could keep up with reporting. I want weekly snapshots of my portfolio — is that too much to ask?",
    intent_score: 62,
    pain_type: "lead_quality",
    generated_comment:
      "Not too much to ask — that's a baseline expectation. A lot of PM companies run on spreadsheets and generate reports manually, which is why they push back on frequency. Modern PM platforms auto-generate portfolio snapshots on any cadence. If your current PM can't do weekly reporting, that's a systems problem, not a capacity problem.",
    status: "replied",
    post_url: "https://reddit.com/r/realestateinvesting/comments/sia005",
    author: "passive_income_pete",
    detected_at: "2026-04-27T15:30:00Z",
    reply_count: 7,
    engagement_score: 74,
    dm_triggered: false,
  },
  {
    id: "SIA-006",
    platform: "reddit",
    subreddit: "r/realestateinvesting",
    post_excerpt:
      "Lost another good tenant last month and I'm starting to think our PM company is the problem. They're reactive, slow, and I never know what's happening. Thinking about switching.",
    intent_score: 94,
    pain_type: "lead_volume",
    generated_comment:
      "That reactive/slow combo is a systems gap, not a people gap — and it's fixable. The 'I never know what's happening' part is especially telling; that's a reporting and transparency issue at the PM layer. If you haven't already, worth asking for a weekly portfolio snapshot before fully committing to switching — how they respond to that request tells you a lot.",
    status: "dm_sent",
    post_url: "https://reddit.com/r/realestateinvesting/comments/sia006",
    author: "frustrated_rei_ohio",
    detected_at: "2026-04-27T09:05:00Z",
    reply_count: 3,
    engagement_score: 95,
    dm_triggered: true,
  },
];

export const mockSIATemplates: SIATemplate[] = [
  {
    id: "TPL-001",
    type: "comment",
    target_pain: "lead_volume",
    name: "Organic Lead Engine (Reddit)",
    content:
      "{{door_count}} is exactly the inflection point where ad spend starts to hurt. What's worked for us is showing up in the communities where your ideal landlords already hang — local Facebook groups, neighborhood forums. We went from 0 to 12 inbound leads/month just from consistent comment presence before running a single ad. Happy to break down the exact process if useful.",
    times_used: 14,
    reply_rate: "43%",
    conversions: 2,
  },
  {
    id: "TPL-002",
    type: "comment",
    target_pain: "operations",
    name: "Maintenance Workflow Fix",
    content:
      "This was us 18 months ago. The phone tag is a symptom — the real issue is no single source of truth for vendor status. We built a dispatch system where tenants get automated updates and vendors confirm via a simple link (no app required). Dropped our 'where's my repair?' calls by 80%. Not the job — just the wrong workflow.",
    times_used: 9,
    reply_rate: "56%",
    conversions: 1,
  },
  {
    id: "TPL-003",
    type: "dm",
    target_pain: "lead_volume",
    name: "Scaling Pain DM Opener",
    content:
      "Hey {{username}} — saw your post in {{subreddit}} about {{pain_summary}}. We actually documented the exact system we used to go from {{current_state}} to {{goal_state}} without adding headcount. Would it be weird to send you the breakdown? No pitch, just the framework — figured it might be useful given where you're at.",
    times_used: 8,
    reply_rate: "38%",
    conversions: 1,
  },
];

export const mockSIAStats: SIAStats = {
  posts_detected: 47,
  pending_approval: 3,
  comments_posted: 28,
  reply_rate: "34%",
  dm_sent: 8,
  conversions: 3,
};

// ─── Video Generation ────────────────────────────────────────────────────────

export interface VideoRequest {
  id: string;
  agent: string;
  purpose: string;
  platform: string;
  aspect_ratio: string;
  script: string;
  hook: string;
  cta: string;
  status: "draft" | "generating" | "pending_approval" | "approved" | "published";
  template: string;
  qa_status: "pass" | "fail" | "pending";
}

export interface VideoTemplate {
  id: string;
  name: string;
  aspect_ratio: string;
  description: string;
  category: string;
}

export interface BrandProfile {
  name: string;
  primary: string;
  secondary: string;
  logo: string;
  font: string;
  tone: string;
}

export const mockVideoRequests: VideoRequest[] = [
  {
    id: "VID-001",
    agent: "Content Agent",
    purpose: "Showcase OttoServ's lead management automation",
    platform: "Instagram Reels",
    aspect_ratio: "9:16",
    script:
      "Tired of chasing leads manually? OttoServ automates the entire pipeline — from first contact to signed contract. See how 50+ service businesses cut their response time by 80%.",
    hook: "What if your leads followed up themselves?",
    cta: "Book a free demo today",
    status: "draft",
    template: "social_hook_9x16",
    qa_status: "pending",
  },
  {
    id: "VID-002",
    agent: "Sales Agent",
    purpose: "Explain job costing and profit margin tracking",
    platform: "YouTube",
    aspect_ratio: "16:9",
    script:
      "Every job has hidden costs. OttoServ's job costing module tracks materials, labor, and overhead in real time so you always know your margin before you send the invoice.",
    hook: "Are you actually making money on every job?",
    cta: "Start your free trial",
    status: "generating",
    template: "sales_explainer_16x9",
    qa_status: "pending",
  },
  {
    id: "VID-003",
    agent: "Marketing Agent",
    purpose: "Weekly operations update for team",
    platform: "Internal / Slack",
    aspect_ratio: "16:9",
    script:
      "This week: 12 new leads, 3 projects completed, $48K invoiced. Top performer: roofing division with 94% on-time delivery. Two work orders pending final inspection.",
    hook: "Your week in 60 seconds",
    cta: "View full dashboard",
    status: "pending_approval",
    template: "weekly_update_16x9",
    qa_status: "pass",
  },
  {
    id: "VID-004",
    agent: "Content Agent",
    purpose: "TikTok ad for property management leads",
    platform: "TikTok",
    aspect_ratio: "9:16",
    script:
      "Property managers: still texting tenants about maintenance requests? There's a better way. OttoServ gives tenants a portal, automates dispatch, and tracks every ticket to close.",
    hook: "Stop texting tenants at midnight",
    cta: "Try OttoServ free for 30 days",
    status: "approved",
    template: "social_hook_9x16",
    qa_status: "pass",
  },
  {
    id: "VID-005",
    agent: "Marketing Agent",
    purpose: "LinkedIn thought leadership: AI in field services",
    platform: "LinkedIn",
    aspect_ratio: "16:9",
    script:
      "AI isn't replacing field service teams — it's giving them superpowers. OttoServ uses AI to predict job duration, suggest optimal scheduling, and auto-draft follow-up proposals.",
    hook: "The field service companies winning in 2026 all have one thing in common",
    cta: "See the full breakdown",
    status: "published",
    template: "sales_explainer_16x9",
    qa_status: "pass",
  },
];

export const mockVideoTemplates: VideoTemplate[] = [
  {
    id: "social_hook_9x16",
    name: "Social Hook",
    aspect_ratio: "9:16",
    description:
      "High-impact vertical video for Instagram Reels and TikTok. Hook-driven opener, rapid b-roll, strong CTA at 15s.",
    category: "Social",
  },
  {
    id: "sales_explainer_16x9",
    name: "Sales Explainer",
    aspect_ratio: "16:9",
    description:
      "Professional landscape explainer for YouTube and LinkedIn. Problem/solution narrative with screen recordings and voiceover.",
    category: "Sales",
  },
  {
    id: "weekly_update_16x9",
    name: "Weekly Update",
    aspect_ratio: "16:9",
    description:
      "Automated weekly recap video with KPI overlays, team highlights, and upcoming priorities. Ideal for internal distribution.",
    category: "Internal",
  },
];

export const mockBrandProfile: BrandProfile = {
  name: "OttoServ",
  primary: "#3b82f6",
  secondary: "#1e40af",
  logo: "/logo.png",
  font: "Inter",
  tone: "Professional, direct, helpful",
};

// ─── Deployment Management ────────────────────────────────────────────────────

export interface Deployment {
  id: string;
  company: string;
  model: "ottoserv_managed" | "hybrid" | "client_owned";
  status: "intake" | "active" | "paused" | "offboarding";
  tools: number;
  agents: number;
  health: "healthy" | "degraded" | "critical";
}

export interface ToolInventoryItem {
  id: string;
  name: string;
  integration_method: string;
  status: "connected" | "error" | "pending";
  data_sensitivity: "low" | "medium" | "high";
}

export interface AgentRosterItem {
  id: string;
  name: string;
  department: string;
  status: "active" | "paused";
  allowed_actions: string[];
  requires_approval: string[];
}

export interface PermissionMatrixRow {
  agent: string;
  read: boolean;
  create: boolean;
  update: boolean;
  send: boolean;
  restricted: boolean;
}

export interface ChangeRequest {
  id: string;
  title: string;
  requested_by: string;
  date: string;
  status: "pending" | "completed" | "rejected";
  description: string;
}

export interface MaintenanceStatus {
  failed_tasks: number;
  pending_escalations: number;
  stale_integrations: number;
  next_report: string;
}

export const mockDeployment: Deployment = {
  id: "dep_001",
  company: "Brandon Croom Construction",
  model: "ottoserv_managed",
  status: "intake",
  tools: 5,
  agents: 3,
  health: "healthy",
};

export const mockToolInventory: ToolInventoryItem[] = [
  {
    id: "tool_qb",
    name: "QuickBooks",
    integration_method: "OAuth 2.0",
    status: "connected",
    data_sensitivity: "high",
  },
  {
    id: "tool_gmail",
    name: "Gmail",
    integration_method: "Google OAuth",
    status: "connected",
    data_sensitivity: "medium",
  },
  {
    id: "tool_gcal",
    name: "Google Calendar",
    integration_method: "Google OAuth",
    status: "connected",
    data_sensitivity: "low",
  },
  {
    id: "tool_sheets",
    name: "Spreadsheets",
    integration_method: "Google OAuth",
    status: "pending",
    data_sensitivity: "medium",
  },
  {
    id: "tool_phone",
    name: "Phone",
    integration_method: "Twilio API Key",
    status: "connected",
    data_sensitivity: "high",
  },
];

export const mockAgentRoster: AgentRosterItem[] = [
  {
    id: "agent_ops",
    name: "Operations Agent",
    department: "Operations",
    status: "active",
    allowed_actions: ["Read invoices", "Create work orders", "Update project status"],
    requires_approval: ["Send client emails", "Mark invoice paid"],
  },
  {
    id: "agent_lead",
    name: "Lead Response Agent",
    department: "Sales",
    status: "active",
    allowed_actions: ["Read leads", "Send intro SMS", "Create CRM contact"],
    requires_approval: ["Schedule estimate", "Assign to rep"],
  },
  {
    id: "agent_report",
    name: "Reporting Agent",
    department: "Finance",
    status: "active",
    allowed_actions: ["Read all data", "Generate reports", "Export spreadsheets"],
    requires_approval: ["Send weekly digest", "Share external link"],
  },
];

export const mockPermissionMatrix: PermissionMatrixRow[] = [
  { agent: "Operations Agent", read: true, create: true, update: true, send: false, restricted: false },
  { agent: "Lead Response Agent", read: true, create: true, update: false, send: true, restricted: false },
  { agent: "Reporting Agent", read: true, create: false, update: false, send: false, restricted: true },
];

export const mockChangeRequests: ChangeRequest[] = [
  {
    id: "cr_001",
    title: "Add Slack integration for team notifications",
    requested_by: "Brandon Croom",
    date: "2026-04-28",
    status: "pending",
    description: "Client requests Slack alerts when new leads come in and when invoices go overdue.",
  },
  {
    id: "cr_002",
    title: "Enable SMS lead follow-up automation",
    requested_by: "Brandon Croom",
    date: "2026-04-20",
    status: "completed",
    description: "Auto-SMS new leads within 5 minutes of form submission. Completed and live.",
  },
];

export const mockMaintenanceStatus: MaintenanceStatus = {
  failed_tasks: 0,
  pending_escalations: 1,
  stale_integrations: 0,
  next_report: "May 15",
};

// ─── Marketplace ──────────────────────────────────────────────────────────────

export interface MarketplaceResource {
  id: string;
  name: string;
  type: "tool" | "workflow" | "template" | "human";
  category: string;
  description: string;
  what_it_does: string;
  best_for: string[];
  not_for: string[];
  cost_model: "free" | "metered" | "flat";
  cost_amount: number | null; // null = metered per-use
  cost_unit: string | null;
  risk_level: "low" | "medium" | "high";
  status: "available" | "beta" | "restricted" | "deprecated";
  approved_agents: string[];
  setup_instructions: string;
  monthly_uses: number;
  avg_cost_per_run: number;
  success_rate: number;
  monetization_status: "unbillable" | "billable" | "packaged";
}

export const mockResources: MarketplaceResource[] = [
  {
    id: "res_001",
    name: "Lead Qualifier AI",
    type: "workflow",
    category: "Sales",
    description: "Scores and qualifies inbound leads using job type, budget, and timeline signals.",
    what_it_does: "Runs lead data through a scoring model, assigns a quality tier (A/B/C), and auto-routes to the right rep or automation.",
    best_for: ["High-volume inbound", "Multi-service contractors", "Lead nurture sequences"],
    not_for: ["Referral-only businesses", "Single-service shops with simple pipelines"],
    cost_model: "metered",
    cost_amount: 0.04,
    cost_unit: "per lead",
    risk_level: "low",
    status: "available",
    approved_agents: ["Lead Response Agent", "Operations Agent"],
    setup_instructions: "Connect your CRM lead source. Map budget and service fields. Set routing rules by tier.",
    monthly_uses: 312,
    avg_cost_per_run: 0.04,
    success_rate: 96,
    monetization_status: "billable",
  },
  {
    id: "res_002",
    name: "Invoice Follow-Up Bot",
    type: "workflow",
    category: "Finance",
    description: "Sends staged payment reminders via SMS and email for overdue invoices.",
    what_it_does: "Monitors invoice aging, triggers reminder sequences at 1, 7, and 14 days past due, and escalates to phone call at 21 days.",
    best_for: ["Service businesses with net-30 terms", "Clients with recurring billing"],
    not_for: ["COD businesses", "Projects with milestone-based payment gates"],
    cost_model: "metered",
    cost_amount: 0.12,
    cost_unit: "per invoice sequence",
    risk_level: "medium",
    status: "available",
    approved_agents: ["Operations Agent", "Reporting Agent"],
    setup_instructions: "Link QuickBooks. Configure reminder timing and message templates. Set escalation threshold.",
    monthly_uses: 88,
    avg_cost_per_run: 0.12,
    success_rate: 91,
    monetization_status: "packaged",
  },
  {
    id: "res_003",
    name: "Permit Puller",
    type: "tool",
    category: "Compliance",
    description: "Fetches active permit data from county databases for a given address.",
    what_it_does: "Scrapes or API-queries local permit portals, returns permit type, status, issue date, and expiration.",
    best_for: ["Pre-bid due diligence", "TechOps installs", "Property managers"],
    not_for: ["Jurisdictions without online permit portals"],
    cost_model: "metered",
    cost_amount: 0.08,
    cost_unit: "per lookup",
    risk_level: "low",
    status: "available",
    approved_agents: ["Operations Agent"],
    setup_instructions: "No setup required. Pass address as input. County coverage map in docs.",
    monthly_uses: 54,
    avg_cost_per_run: 0.08,
    success_rate: 88,
    monetization_status: "billable",
  },
  {
    id: "res_004",
    name: "Estimate Builder Template",
    type: "template",
    category: "Sales",
    description: "Pre-formatted estimate doc with line items, labor matrix, and markup calculator.",
    what_it_does: "Generates a client-ready PDF estimate from project scope inputs. Includes material, labor, overhead, and margin fields.",
    best_for: ["New estimators", "Standardizing bid formats", "Faster turnaround"],
    not_for: ["Complex lump-sum bids", "Government procurement formats"],
    cost_model: "free",
    cost_amount: 0,
    cost_unit: null,
    risk_level: "low",
    status: "available",
    approved_agents: ["Operations Agent", "Lead Response Agent"],
    setup_instructions: "Download template. Customize markup percentages and labor rates in settings tab.",
    monthly_uses: 203,
    avg_cost_per_run: 0,
    success_rate: 99,
    monetization_status: "unbillable",
  },
  {
    id: "res_005",
    name: "Review Request Sender",
    type: "workflow",
    category: "Marketing",
    description: "Triggers Google and Yelp review requests after job completion.",
    what_it_does: "Detects closed work orders, waits configurable days, then sends personalized SMS/email review request with direct link.",
    best_for: ["Residential service businesses", "Post-job follow-up", "Reputation building"],
    not_for: ["B2B-only businesses", "Anonymous or privacy-sensitive service types"],
    cost_model: "metered",
    cost_amount: 0.06,
    cost_unit: "per request sent",
    risk_level: "low",
    status: "available",
    approved_agents: ["Operations Agent"],
    setup_instructions: "Connect work order source. Set delay days. Add review platform links in settings.",
    monthly_uses: 147,
    avg_cost_per_run: 0.06,
    success_rate: 94,
    monetization_status: "billable",
  },
  {
    id: "res_006",
    name: "Human: Licensed Electrician (On-Call)",
    type: "human",
    category: "Trade Labor",
    description: "Verified licensed electrician available for overflow, specialized, or inspection-required work.",
    what_it_does: "Dispatched via work order. Handles panel upgrades, EV charger installs, code inspections, and commercial work your crew can't touch.",
    best_for: ["Licensed work overflow", "Permit-required jobs", "Specialty installs"],
    not_for: ["General handyman tasks", "States where you hold the license"],
    cost_model: "flat",
    cost_amount: 185,
    cost_unit: "per hour",
    risk_level: "high",
    status: "available",
    approved_agents: [],
    setup_instructions: "Submit work order with scope, address, and timeline. 24-hour lead time required.",
    monthly_uses: 12,
    avg_cost_per_run: 555,
    success_rate: 100,
    monetization_status: "billable",
  },
  {
    id: "res_007",
    name: "Material Price Monitor",
    type: "tool",
    category: "Procurement",
    description: "Tracks commodity prices (lumber, copper, steel, concrete) and alerts on significant changes.",
    what_it_does: "Polls supplier and commodity index feeds daily. Flags price changes above threshold. Feeds into estimate cost assumptions.",
    best_for: ["Active estimating", "Multi-project scheduling", "Locking in material costs"],
    not_for: ["Fixed-price contract businesses that can't pass costs through"],
    cost_model: "flat",
    cost_amount: 29,
    cost_unit: "per month",
    risk_level: "low",
    status: "available",
    approved_agents: ["Operations Agent", "Reporting Agent"],
    setup_instructions: "Select commodities to track. Set alert thresholds. Connect to estimate templates.",
    monthly_uses: 30,
    avg_cost_per_run: 0.97,
    success_rate: 99,
    monetization_status: "unbillable",
  },
  {
    id: "res_008",
    name: "Subcontractor Compliance Checker",
    type: "workflow",
    category: "Compliance",
    description: "Verifies sub license, insurance, and W-9 status before dispatching work.",
    what_it_does: "Cross-checks sub documents against state license board APIs, insurance expiry, and W-9 on file. Blocks dispatch if non-compliant.",
    best_for: ["GC workflows", "Risk management", "Audit readiness"],
    not_for: ["1099 gigs with known, trusted subs only"],
    cost_model: "metered",
    cost_amount: 0.15,
    cost_unit: "per verification",
    risk_level: "medium",
    status: "beta",
    approved_agents: ["Operations Agent"],
    setup_instructions: "Upload sub roster. Map license board by state. Set auto-block rules.",
    monthly_uses: 38,
    avg_cost_per_run: 0.15,
    success_rate: 85,
    monetization_status: "unbillable",
  },
  {
    id: "res_009",
    name: "Client Onboarding Flow",
    type: "template",
    category: "Operations",
    description: "Step-by-step onboarding sequence for new clients including welcome, intake, and kickoff.",
    what_it_does: "Sends welcome email, collects intake form data, schedules kickoff call, and creates initial project record.",
    best_for: ["Service retainers", "Managed service clients", "Recurring contracts"],
    not_for: ["One-off transactional jobs"],
    cost_model: "free",
    cost_amount: 0,
    cost_unit: null,
    risk_level: "low",
    status: "available",
    approved_agents: ["Lead Response Agent", "Operations Agent"],
    setup_instructions: "Clone template. Customize welcome message and intake questions. Connect calendar for kickoff scheduling.",
    monthly_uses: 7,
    avg_cost_per_run: 0,
    success_rate: 100,
    monetization_status: "unbillable",
  },
  {
    id: "res_010",
    name: "AI Content Writer",
    type: "tool",
    category: "Marketing",
    description: "Generates social posts, email campaigns, and ad copy in your brand voice.",
    what_it_does: "Takes a brief (service, audience, CTA) and produces platform-optimized content variants. Supports Instagram, Facebook, email, and Google Ads.",
    best_for: ["Consistent posting schedules", "Campaign launches", "A/B test copy"],
    not_for: ["Hyper-local community content requiring human voice"],
    cost_model: "metered",
    cost_amount: 0.02,
    cost_unit: "per 1k tokens",
    risk_level: "low",
    status: "available",
    approved_agents: ["Operations Agent"],
    setup_instructions: "Import your brand voice profile. Set tone guidelines. Connect to Social Media module.",
    monthly_uses: 890,
    avg_cost_per_run: 0.03,
    success_rate: 97,
    monetization_status: "billable",
  },
  {
    id: "res_011",
    name: "Human: Virtual Receptionist",
    type: "human",
    category: "Customer Service",
    description: "Live US-based receptionist handles inbound calls, qualifies callers, and books appointments.",
    what_it_does: "Answers calls in your business name, follows custom scripts, collects lead info, and syncs booked appointments to your calendar.",
    best_for: ["After-hours coverage", "High call volume periods", "Owner-operators who can't answer"],
    not_for: ["Businesses with complex technical intake requiring licensed staff"],
    cost_model: "flat",
    cost_amount: 299,
    cost_unit: "per month (up to 100 calls)",
    risk_level: "low",
    status: "available",
    approved_agents: [],
    setup_instructions: "Provide business name, services, and call script. Forward overflow calls to assigned number.",
    monthly_uses: 1,
    avg_cost_per_run: 299,
    success_rate: 98,
    monetization_status: "billable",
  },
  {
    id: "res_012",
    name: "Profit Margin Analyzer",
    type: "workflow",
    category: "Finance",
    description: "Compares estimated vs actual costs per job and flags margin compression.",
    what_it_does: "Pulls closed job data from QuickBooks and projects, calculates variance, and surfaces jobs where margin dropped more than threshold.",
    best_for: ["Post-job review", "Pricing strategy", "Identifying losing job types"],
    not_for: ["Businesses not tracking job costs in QuickBooks"],
    cost_model: "flat",
    cost_amount: 0,
    cost_unit: null,
    risk_level: "low",
    status: "available",
    approved_agents: ["Reporting Agent"],
    setup_instructions: "Connect QuickBooks. Set margin compression alert threshold (default 5%). Schedule weekly or on-demand.",
    monthly_uses: 22,
    avg_cost_per_run: 0,
    success_rate: 100,
    monetization_status: "billable",
  },
  {
    id: "res_013",
    name: "SOP Auto-Generator",
    type: "workflow",
    category: "Operations",
    description: "Watches how tasks are completed and drafts SOPs from observed patterns.",
    what_it_does: "Monitors task sequences over time, detects repeating patterns, and generates draft SOPs for human review and approval.",
    best_for: ["Scaling teams", "Knowledge capture", "Onboarding new staff"],
    not_for: ["Businesses with highly variable, non-repeating workflows"],
    cost_model: "metered",
    cost_amount: 0.25,
    cost_unit: "per SOP draft",
    risk_level: "low",
    status: "beta",
    approved_agents: ["Operations Agent"],
    setup_instructions: "Enable task observation mode. Set minimum pattern recurrence (default 3x). Review drafts in SOPs module.",
    monthly_uses: 8,
    avg_cost_per_run: 0.25,
    success_rate: 89,
    monetization_status: "unbillable",
  },
  {
    id: "res_014",
    name: "Human: Bookkeeper (Monthly Close)",
    type: "human",
    category: "Finance",
    description: "Certified bookkeeper performs monthly reconciliation, categorization, and close.",
    what_it_does: "Reconciles bank and credit card feeds, recategorizes miscoded transactions, and delivers a clean P&L within 5 business days of month end.",
    best_for: ["Businesses without internal bookkeeping", "Pre-CPA cleanup", "Tax-ready books"],
    not_for: ["Businesses with complex multi-entity structures requiring CPA"],
    cost_model: "flat",
    cost_amount: 450,
    cost_unit: "per month",
    risk_level: "medium",
    status: "available",
    approved_agents: [],
    setup_instructions: "Connect QuickBooks read access. Provide chart of accounts and any custom categorization rules.",
    monthly_uses: 1,
    avg_cost_per_run: 450,
    success_rate: 100,
    monetization_status: "billable",
  },
  {
    id: "res_015",
    name: "Smart Dispatch Router",
    type: "workflow",
    category: "Operations",
    description: "Assigns inbound work orders to the best available tech based on skill, location, and availability.",
    what_it_does: "Scores available techs against job requirements, factors in drive time and current load, and auto-assigns or presents ranked options.",
    best_for: ["Multi-tech field operations", "TechOps dispatch", "Minimizing response time"],
    not_for: ["Solo operators", "Businesses without tech skill profiles in the system"],
    cost_model: "metered",
    cost_amount: 0.05,
    cost_unit: "per dispatch",
    risk_level: "medium",
    status: "available",
    approved_agents: ["Operations Agent"],
    setup_instructions: "Build tech skill profiles. Set availability rules. Connect work order source.",
    monthly_uses: 67,
    avg_cost_per_run: 0.05,
    success_rate: 93,
    monetization_status: "billable",
  },
];

export interface MonetizationAlert {
  id: string;
  alert_type: "monetization_opportunity" | "margin_risk" | "package_candidate";
  resource_id: string;
  resource_name: string;
  reason: string;
  suggested_price: string | null;
  recommended_action: string;
  status: "new" | "reviewing" | "actioned";
  created_at: string;
}

export const mockMonetizationAlerts: MonetizationAlert[] = [
  {
    id: "ma_001",
    alert_type: "monetization_opportunity",
    resource_id: "res_005",
    resource_name: "Review Request Sender",
    reason: "This workflow ran 147 times this month at $0.06/run but is not included in any client package. Clients who use it see 34% more reviews on average.",
    suggested_price: "$49/mo add-on",
    recommended_action: "Bundle into a Reputation Booster add-on package. Estimated revenue uplift: $490/mo across 10 clients.",
    status: "new",
    created_at: "2026-04-28",
  },
  {
    id: "ma_002",
    alert_type: "margin_risk",
    resource_id: "res_006",
    resource_name: "Human: Licensed Electrician (On-Call)",
    reason: "Three dispatches this month were billed to clients at your standard labor rate, not at the $185/hr cost-plus markup. Net loss: $210.",
    suggested_price: null,
    recommended_action: "Update billing rules to auto-apply 15% markup on sub labor dispatched through Marketplace. Fix retroactively on open invoices.",
    status: "reviewing",
    created_at: "2026-04-25",
  },
  {
    id: "ma_003",
    alert_type: "package_candidate",
    resource_id: "res_001",
    resource_name: "Lead Qualifier AI",
    reason: "Lead Qualifier AI + Review Request Sender + Virtual Receptionist are all used by your top 5 clients. Packaging them together could reduce churn and increase MRR.",
    suggested_price: "$599/mo",
    recommended_action: "Create a Growth Starter Package with these 3 resources. Current a-la-carte value: $648/mo. Bundle saves client $49, nets you $149 more/mo vs unbundled avg.",
    status: "new",
    created_at: "2026-04-22",
  },
];

export interface ClientPackage {
  id: string;
  name: string;
  description: string;
  included_resources: string[];
  setup_fee: number;
  monthly_fee: number;
  times_sold: number;
  status: "active" | "draft" | "archived";
  created_at: string;
}

export const mockClientPackages: ClientPackage[] = [
  {
    id: "pkg_001",
    name: "AI Lead Response",
    description: "Captures, qualifies, and follows up with every inbound lead automatically — 24/7.",
    included_resources: ["Lead Qualifier AI", "Review Request Sender", "Human: Virtual Receptionist"],
    setup_fee: 299,
    monthly_fee: 549,
    times_sold: 8,
    status: "active",
    created_at: "2026-02-10",
  },
  {
    id: "pkg_002",
    name: "Operations Audit",
    description: "Monthly deep-dive into job costing, margin health, and operational efficiency.",
    included_resources: ["Profit Margin Analyzer", "Material Price Monitor", "Subcontractor Compliance Checker"],
    setup_fee: 0,
    monthly_fee: 349,
    times_sold: 4,
    status: "active",
    created_at: "2026-03-01",
  },
  {
    id: "pkg_003",
    name: "Contractor OS",
    description: "Full operations stack: dispatch, compliance, invoicing, and team SOPs in one managed package.",
    included_resources: ["Smart Dispatch Router", "Subcontractor Compliance Checker", "Invoice Follow-Up Bot", "SOP Auto-Generator", "Client Onboarding Flow"],
    setup_fee: 499,
    monthly_fee: 899,
    times_sold: 2,
    status: "draft",
    created_at: "2026-04-15",
  },
];

export interface ResourceRequest {
  id: string;
  resource_id: string;
  resource_name: string;
  requested_by: string;
  agent: string | null;
  reason: string;
  status: "auto_approved" | "pending" | "approved" | "denied";
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export const mockResourceRequests: ResourceRequest[] = [
  {
    id: "req_001",
    resource_id: "res_003",
    resource_name: "Permit Puller",
    requested_by: "Operations Agent",
    agent: "Operations Agent",
    reason: "Required for pre-bid due diligence on 14 Maple Street project.",
    status: "auto_approved",
    requested_at: "2026-04-29T09:12:00",
    resolved_at: "2026-04-29T09:12:01",
    resolved_by: "System (policy: low-risk tools auto-approved)",
  },
  {
    id: "req_002",
    resource_id: "res_006",
    resource_name: "Human: Licensed Electrician (On-Call)",
    requested_by: "Brandon Croom",
    agent: null,
    reason: "Panel upgrade needed at 202 Harbor View — outside crew license scope.",
    status: "pending",
    requested_at: "2026-04-30T07:45:00",
    resolved_at: null,
    resolved_by: null,
  },
  {
    id: "req_003",
    resource_id: "res_008",
    resource_name: "Subcontractor Compliance Checker",
    requested_by: "Operations Agent",
    agent: "Operations Agent",
    reason: "New subcontractor onboarding — verify license and insurance before dispatch.",
    status: "approved",
    requested_at: "2026-04-28T14:22:00",
    resolved_at: "2026-04-28T15:01:00",
    resolved_by: "Brandon Croom",
  },
  {
    id: "req_004",
    resource_id: "res_014",
    resource_name: "Human: Bookkeeper (Monthly Close)",
    requested_by: "Reporting Agent",
    agent: "Reporting Agent",
    reason: "Requesting ongoing monthly access for automated close handoff.",
    status: "denied",
    requested_at: "2026-04-20T10:00:00",
    resolved_at: "2026-04-20T11:30:00",
    resolved_by: "Brandon Croom",
  },
];

export interface UsageLogEntry {
  id: string;
  agent: string;
  resource_id: string;
  resource_name: string;
  task: string;
  cost: number;
  success: boolean;
  timestamp: string;
}

export const OPPORTUNITY_TYPES = [
  "remote_it",
  "computer_repair",
  "msp_overflow",
  "smart_home",
  "networking",
  "wifi_install",
  "printer",
  "cctv",
  "access_control",
  "av_conference",
  "low_voltage",
  "field_dispatch",
  "pm_tech",
  "vendor_program",
] as const;

export type OpportunityType = typeof OPPORTUNITY_TYPES[number];

export interface OpportunityScores {
  fit: number;
  margin: number;
  risk: number;
  urgency: number;
  overall: number;
}

export interface TechOpsOpportunity {
  id: string;
  source: string;
  company: string;
  type: OpportunityType;
  location: string;
  remote_possible: boolean;
  scope_summary: string;
  scores: OpportunityScores;
  recommended_action: "pursue" | "request_info" | "ignore" | "human_review";
  status: "new" | "reviewing" | "approved" | "response_drafted" | "won";
  drafted_response?: string;
  skills_required: string[];
  tools_required: string[];
  created_at: string;
}

export const mockTechOpsOpportunities: TechOpsOpportunity[] = [
  {
    id: "opp_001",
    source: "Thumbtack",
    company: "Meridian Financial Group",
    type: "networking",
    location: "Austin, TX",
    remote_possible: false,
    scope_summary:
      "Complete network infrastructure refresh for 3-floor office. Replace aging Cisco switches with managed PoE units, reconfigure VLANs for segmented guest/staff/server traffic, install new patch panels and cable runs across ~40 drops. Estimated 2-day project.",
    scores: { fit: 9, margin: 8, risk: 3, urgency: 8, overall: 9 },
    recommended_action: "pursue",
    status: "approved",
    skills_required: ["VLAN configuration", "structured cabling", "Cisco IOS", "PoE switching"],
    tools_required: ["cable tester", "punch down tool", "Cisco console cable", "label maker"],
    created_at: "2026-04-29T10:14:00",
  },
  {
    id: "opp_002",
    source: "Angi",
    company: "Sunset Pediatric Clinic",
    type: "cctv",
    location: "Round Rock, TX",
    remote_possible: false,
    scope_summary:
      "Install 8-camera IP CCTV system covering waiting room, hallways, parking lot, and staff-only areas. Client requests HIPAA-compliant storage (local NVR, no cloud). Needs to be completed outside patient hours (evenings or Saturday).",
    scores: { fit: 7, margin: 7, risk: 5, urgency: 6, overall: 7 },
    recommended_action: "pursue",
    status: "reviewing",
    skills_required: ["IP camera configuration", "NVR setup", "cable fishing", "HIPAA awareness"],
    tools_required: ["fish tape", "PoE injector", "drill/bits", "IP camera config software"],
    created_at: "2026-04-30T08:30:00",
  },
  {
    id: "opp_003",
    source: "Direct referral",
    company: "Apex MSP Partners",
    type: "msp_overflow",
    location: "Remote",
    remote_possible: true,
    scope_summary:
      "MSP needs overflow Tier-2 helpdesk support for 3 client accounts during a staffing gap (4–6 weeks). Tasks include RMM alert triage, remote desktop support, patch management oversight, and escalation routing. Est. 10–15 hrs/week.",
    scores: { fit: 6, margin: 5, risk: 4, urgency: 9, overall: 6 },
    recommended_action: "request_info",
    status: "new",
    skills_required: ["RMM tools", "remote desktop", "patch management", "ticketing systems"],
    tools_required: ["ConnectWise Automate", "TeamViewer", "Microsoft 365 Admin"],
    created_at: "2026-04-30T14:55:00",
  },
  {
    id: "opp_004",
    source: "Craigslist",
    company: "Blue Mesa Realty",
    type: "smart_home",
    location: "Cedar Park, TX",
    remote_possible: false,
    scope_summary:
      "Stage 4 model homes with smart home systems: smart locks, video doorbells, thermostats, and lighting scenes. Client wants everything on one app. Budget unclear, timeline vague. No site visit scheduled yet.",
    scores: { fit: 5, margin: 4, risk: 7, urgency: 3, overall: 4 },
    recommended_action: "ignore",
    status: "new",
    skills_required: ["smart home integration", "Z-Wave/Zigbee", "app configuration"],
    tools_required: ["hub device", "smartphone", "drill"],
    created_at: "2026-04-28T16:10:00",
  },
  {
    id: "opp_005",
    source: "Google Ads lead",
    company: "Lakefront Coworking",
    type: "wifi_install",
    location: "Lago Vista, TX",
    remote_possible: false,
    scope_summary:
      "Design and install enterprise Wi-Fi across 6,000 sq ft coworking space. Client needs seamless roaming, bandwidth management per member tier, and separate SSID for events. Requested Ubiquiti UniFi platform. Project signed, awaiting gear delivery.",
    scores: { fit: 9, margin: 9, risk: 2, urgency: 7, overall: 9 },
    recommended_action: "pursue",
    status: "response_drafted",
    drafted_response:
      "Hi Sarah,\n\nThank you for choosing OttoServ for your Lakefront Coworking Wi-Fi project — we're excited to get this done right.\n\nBased on our site assessment, here's our proposed approach:\n\n**Equipment (Ubiquiti UniFi)**\n- 1× UniFi Dream Machine Pro (controller + gateway)\n- 6× U6-Pro access points (ceiling mount, full coverage)\n- 1× 24-port PoE switch (closet)\n- 1× 8-port PoE flex switch (event room)\n\n**Network Configuration**\n- SSID 1: Members (VLAN 10, bandwidth-limited by tier via RADIUS)\n- SSID 2: Events (VLAN 20, captive portal, 50 Mbps cap)\n- SSID 3: Staff/POS (VLAN 30, isolated, unrestricted)\n- Seamless roaming enabled across all APs\n\n**Timeline**\n- Day 1: Cable runs, AP and switch mounting\n- Day 2: UniFi configuration, VLAN setup, bandwidth policy tuning, testing\n\n**Investment: $3,200** (labor + gear, all-in)\n\nWe can begin installation the week of May 6th once equipment arrives. I'll confirm delivery tracking and send a pre-install checklist.\n\nLet me know if you have any questions!\n\nBest,\nOttoServ TechOps",
    skills_required: ["UniFi controller", "VLAN design", "RADIUS/captive portal", "structured cabling", "site survey"],
    tools_required: ["UniFi controller app", "cable tester", "ladder", "PoE switch", "drill/bits"],
    created_at: "2026-04-27T09:00:00",
  },
];

export const mockUsageLog: UsageLogEntry[] = [
  {
    id: "ul_001",
    agent: "Lead Response Agent",
    resource_id: "res_001",
    resource_name: "Lead Qualifier AI",
    task: "Score inbound lead from website form — Marcus Webb, roofing estimate",
    cost: 0.04,
    success: true,
    timestamp: "2026-04-30T08:14:32",
  },
  {
    id: "ul_002",
    agent: "Operations Agent",
    resource_id: "res_003",
    resource_name: "Permit Puller",
    task: "Permit lookup: 14 Maple Street, permit type residential addition",
    cost: 0.08,
    success: true,
    timestamp: "2026-04-30T09:12:01",
  },
  {
    id: "ul_003",
    agent: "Operations Agent",
    resource_id: "res_005",
    resource_name: "Review Request Sender",
    task: "Send review request to Judith Mercer — job #WO-2241 closed",
    cost: 0.06,
    success: true,
    timestamp: "2026-04-29T17:03:55",
  },
  {
    id: "ul_004",
    agent: "Operations Agent",
    resource_id: "res_015",
    resource_name: "Smart Dispatch Router",
    task: "Route WO-2244 (EV charger install) — matched to Tech: Kyle Hendricks",
    cost: 0.05,
    success: true,
    timestamp: "2026-04-29T13:28:10",
  },
  {
    id: "ul_005",
    agent: "Reporting Agent",
    resource_id: "res_012",
    resource_name: "Profit Margin Analyzer",
    task: "Weekly margin report — 22 closed jobs analyzed, 3 flagged below threshold",
    cost: 0,
    success: true,
    timestamp: "2026-04-28T06:01:00",
  },
  {
    id: "ul_006",
    agent: "Operations Agent",
    resource_id: "res_008",
    resource_name: "Subcontractor Compliance Checker",
    task: "Verify compliance: Sunrise Electric LLC — license expired, dispatch blocked",
    cost: 0.15,
    success: false,
    timestamp: "2026-04-28T14:22:45",
  },
];

// ─── Process Intelligence ────────────────────────────────────────────────────

export const PROCESS_STATUSES = [
  "submitted",
  "needs_review",
  "sop_drafted",
  "automated",
] as const;

export type ProcessStatus = (typeof PROCESS_STATUSES)[number];

export interface Process {
  id: string;
  name: string;
  department: string;
  owner: string;
  frequency: string;
  health_score: number;
  automation_score: number;
  priority_score: number;
  status: ProcessStatus;
  submitted_at: string;
  trigger?: string;
  tools_used?: string[];
  desired_outcome?: string;
  current_steps?: string;
  client_facing: boolean;
  analyze_for_automation: boolean;
}

export interface ProcessSOP {
  id: string;
  process_id: string;
  process_name: string;
  version: string;
  status: "draft" | "approved";
  created_at: string;
  updated_at: string;
  author: string;
  content_summary: string;
}

export interface AutomationOpportunity {
  id: string;
  process_id: string;
  title: string;
  problem: string;
  solution: string;
  complexity: "low" | "medium" | "high";
  time_savings_hrs_month: number;
  status: "identified" | "in_progress" | "live";
}

export const mockProcesses: Process[] = [
  {
    id: "proc_001",
    name: "New Lead Intake",
    department: "Sales",
    owner: "Maria Chen",
    frequency: "Daily",
    health_score: 62,
    automation_score: 88,
    priority_score: 91,
    status: "automated",
    submitted_at: "2026-03-10T09:00:00",
    trigger: "Form submission or inbound call",
    tools_used: ["HubSpot", "Twilio", "Google Sheets"],
    desired_outcome: "Lead qualified and assigned within 15 minutes",
    current_steps:
      "1. Receive inquiry\n2. Log in spreadsheet\n3. Call lead within 1 hour\n4. Enter into CRM\n5. Assign to sales rep",
    client_facing: true,
    analyze_for_automation: true,
  },
  {
    id: "proc_002",
    name: "Invoice Follow-Up",
    department: "Finance",
    owner: "Derek Olson",
    frequency: "Weekly",
    health_score: 45,
    automation_score: 74,
    priority_score: 78,
    status: "needs_review",
    submitted_at: "2026-03-22T14:30:00",
    trigger: "Invoice 14+ days past due",
    tools_used: ["QuickBooks", "Gmail", "Twilio"],
    desired_outcome: "Payment collected or payment plan agreed within 7 days",
    current_steps:
      "1. Pull aging report\n2. Email overdue clients\n3. Call if no response after 3 days\n4. Escalate to manager",
    client_facing: true,
    analyze_for_automation: true,
  },
  {
    id: "proc_003",
    name: "Material Ordering",
    department: "Operations",
    owner: "Tom Reyes",
    frequency: "Per project",
    health_score: 78,
    automation_score: 55,
    priority_score: 65,
    status: "sop_drafted",
    submitted_at: "2026-04-01T11:00:00",
    trigger: "Project milestone reached or stock below threshold",
    tools_used: ["BuilderTrend", "Home Depot Pro", "Email"],
    desired_outcome: "Materials on-site 48 hours before install day",
    current_steps:
      "1. PM reviews job scope\n2. Create materials list\n3. Request quotes from 2+ vendors\n4. Approve PO\n5. Confirm delivery",
    client_facing: false,
    analyze_for_automation: false,
  },
  {
    id: "proc_004",
    name: "Client Onboarding",
    department: "Customer Success",
    owner: "Aisha Patel",
    frequency: "Per new client",
    health_score: 55,
    automation_score: 67,
    priority_score: 82,
    status: "submitted",
    submitted_at: "2026-04-18T10:15:00",
    trigger: "Contract signed",
    tools_used: ["DocuSign", "Notion", "Slack", "Calendly"],
    desired_outcome: "Client fully onboarded and first milestone kicked off within 5 business days",
    current_steps:
      "1. Send welcome email\n2. Schedule kickoff call\n3. Share onboarding doc\n4. Collect access credentials\n5. Set up project in PM tool\n6. Intro to team",
    client_facing: true,
    analyze_for_automation: true,
  },
];

export const mockProcessSOPs: ProcessSOP[] = [
  {
    id: "sop_pi_001",
    process_id: "proc_001",
    process_name: "New Lead Intake",
    version: "2.1",
    status: "approved",
    created_at: "2026-03-15T10:00:00",
    updated_at: "2026-04-02T08:30:00",
    author: "Maria Chen",
    content_summary:
      "Standardized intake process covering web form capture, CRM entry within 10 min, automated SMS acknowledgement, rep assignment by territory, and 1-hour call SLA.",
  },
  {
    id: "sop_pi_002",
    process_id: "proc_003",
    process_name: "Material Ordering",
    version: "1.0",
    status: "draft",
    created_at: "2026-04-10T14:00:00",
    updated_at: "2026-04-10T14:00:00",
    author: "Tom Reyes",
    content_summary:
      "Draft covering scope review checklist, vendor quote request template, PO approval thresholds ($500 self-approve, $500–$2k PM approval, $2k+ director sign-off), and delivery confirmation steps.",
  },
];

export const mockAutomationOpportunities: AutomationOpportunity[] = [
  {
    id: "ao_001",
    process_id: "proc_001",
    title: "Auto-qualify & route inbound leads",
    problem:
      "Reps manually read every lead form and decide who to call first, causing 40+ min average response time.",
    solution:
      "AI scores each lead on job type, zip code, and budget on submission, then routes to the right rep via SMS with a pre-drafted intro.",
    complexity: "low",
    time_savings_hrs_month: 18,
    status: "live",
  },
  {
    id: "ao_002",
    process_id: "proc_002",
    title: "Automated invoice nudge sequence",
    problem:
      "Finance manually tracks overdue invoices in a spreadsheet and sends one-off emails, often forgetting follow-ups.",
    solution:
      "Trigger a 3-touch email + SMS sequence (day 14, day 21, day 28) automatically from QuickBooks aging data. Escalate to call queue at day 28.",
    complexity: "medium",
    time_savings_hrs_month: 12,
    status: "in_progress",
  },
  {
    id: "ao_003",
    process_id: "proc_004",
    title: "Onboarding packet auto-generation",
    problem:
      "CS team spends 2 hours per client manually assembling welcome docs, logins, and project briefs.",
    solution:
      "On contract signature, generate a personalized onboarding PDF, create project in PM tool, and send Calendly link — all without manual steps.",
    complexity: "medium",
    time_savings_hrs_month: 24,
    status: "identified",
  },
];
