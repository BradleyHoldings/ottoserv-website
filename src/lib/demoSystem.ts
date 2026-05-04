// Jarvis-Led Demo Mode System
// Safe, controlled guided demo experience for OttoServ

export interface DemoSession {
  id: string;
  user_id: string;
  account_id: string;
  session_type: "jarvis_demo";
  status: "active" | "paused" | "completed" | "skipped" | "expired";
  current_step: number;
  started_at: Date;
  completed_at?: Date;
  expires_at: Date;
  voice_enabled: boolean;
  voice_settings?: {
    tts_enabled: boolean;
    stt_enabled: boolean;
    voice_model: "browser" | "elevenlabs";
    voice_id?: string;
  };
  metadata: {
    steps_completed: number[];
    user_interactions: any[];
    questions_asked: { question: string; answer: string; timestamp: Date; }[];
    last_activity: Date;
  };
}

export interface DemoCommand {
  session_id: string;
  action:
    | "start_demo"
    | "highlight_element"
    | "spotlight_element"
    | "pulse_element"
    | "scroll_to_element"
    | "show_tooltip"
    | "open_tab"
    | "open_modal"
    | "close_modal"
    | "clear_guidance"
    | "navigate_to"
    | "next_demo_step"
    | "previous_demo_step"
    | "pause_demo"
    | "resume_demo"
    | "restart_demo"
    | "end_demo";
  target?: string;
  style?: "highlight" | "spotlight" | "pulse";
  message?: string;
  duration_ms?: number;
  delay_ms?: number;
  position?: "top" | "bottom" | "left" | "right";
  metadata?: any;
}

export interface DemoStep {
  id: number;
  title: string;
  jarvis_message: string;
  commands: DemoCommand[];
  duration_ms: number;
  requires_user_action?: boolean;
  next_step_trigger?: "click" | "timer" | "manual";
}

// Refined Demo Script - Business-focused OttoServ tour
export const DEMO_SCRIPT: DemoStep[] = [
  {
    id: 1,
    title: "Welcome to OttoServ",
    jarvis_message: "Welcome to OttoServ. I'm Jarvis, your AI operations assistant. These are your live business KPIs — revenue, active jobs, new leads, and appointments. Everything updates in real time as activity happens across your business.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "kpi-section",
        message: "Live business KPIs",
        duration_ms: 12000
      }
    ],
    duration_ms: 14000,
    next_step_trigger: "manual"
  },
  {
    id: 2,
    title: "Operational Snapshot",
    jarvis_message: "This is your daily operational snapshot. It shows you what needs attention right now — leads that need follow-up, work orders, project status, and team tasks. I monitor all of this automatically so nothing falls through the cracks.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "operational-snapshot",
        message: "Daily operational snapshot",
        duration_ms: 12000
      }
    ],
    duration_ms: 14000,
    next_step_trigger: "manual"
  },
  {
    id: 3,
    title: "Alerts & Risks",
    jarvis_message: "These are the active alerts and risks I've identified for your business. Budget overruns, overdue invoices, stalled leads, and time-sensitive items are flagged here before they become problems.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "alerts-section",
        message: "Active alerts and risks",
        duration_ms: 12000
      }
    ],
    duration_ms: 14000,
    next_step_trigger: "manual"
  },
  {
    id: 4,
    title: "Active Projects",
    jarvis_message: "Here's a view of your active projects. I track progress, flag delays, and keep clients updated automatically. When a project falls behind schedule, I alert you and can draft the client communication.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "active-projects",
        message: "Active projects overview",
        duration_ms: 12000
      }
    ],
    duration_ms: 14000,
    next_step_trigger: "manual"
  },
  {
    id: 5,
    title: "Urgent & Overdue Tasks",
    jarvis_message: "These are your urgent and overdue tasks. I create and assign tasks automatically based on business activity — a new lead, a completed job, an unanswered email — and escalate anything overdue.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "tasks-section",
        message: "Urgent and overdue tasks",
        duration_ms: 12000
      }
    ],
    duration_ms: 14000,
    next_step_trigger: "manual"
  },
  {
    id: 6,
    title: "Leads",
    jarvis_message: "Let me show you the Leads pipeline. Every inquiry from every channel — calls, forms, web, social — lands here. I qualify leads automatically, score them by conversion likelihood, and move them through eight stages from first contact to won deal without manual follow-up.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-leads", message: "Opening Leads...", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/leads", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "leads-pipeline", message: "Full lead pipeline — 8 stages from inquiry to won", duration_ms: 12000, delay_ms: 3200 },
    ],
    duration_ms: 17000,
    next_step_trigger: "manual"
  },
  {
    id: 7,
    title: "Automations",
    jarvis_message: "Here are your Automations — the business logic running 24/7 in the background. Every card here is a live workflow: follow-up sequences, appointment reminders, invoice reminders, lead nurture. When a trigger fires, I act immediately without anyone having to remember.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-automations", message: "Opening Automations...", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/automations", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "automations-list", message: "Live automations running your business logic 24/7", duration_ms: 12000, delay_ms: 3200 },
    ],
    duration_ms: 17000,
    next_step_trigger: "manual"
  },
  {
    id: 8,
    title: "Social Media",
    jarvis_message: "This is your Social Media hub. I draft content, schedule posts across Facebook, Instagram, LinkedIn, and Reddit, and route everything for your approval before it publishes. Your brand stays active without you having to think about it.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-social", message: "Opening Social Media...", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/social", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "social-tabs", message: "Calendar, approval queue, published posts, and drafts", duration_ms: 12000, delay_ms: 3200 },
    ],
    duration_ms: 17000,
    next_step_trigger: "manual"
  },
  {
    id: 9,
    title: "Ask Jarvis",
    jarvis_message: "This is where you talk to me directly. Ask anything — what leads need follow-up, how revenue trended this month, what's overdue — and I'll pull the answer from live data. You can also download the Jarvis app to speak with me by voice. The audio version knows everything happening in your business in real time. Since voice conversations can't take direct actions yet, anything that needs doing — sending an email, creating a task, updating a record — can be handled right here in text chat, or via Telegram.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-jarvis", message: "Opening Ask Jarvis...", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/jarvis", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "jarvis-chat-area", message: "Ask me anything about your business — live data, any question", duration_ms: 12000, delay_ms: 3200 },
    ],
    duration_ms: 17000,
    next_step_trigger: "manual"
  },
  {
    id: 10,
    title: "TechOps",
    jarvis_message: "TechOps is built for businesses that manage technology for their clients. Tickets are triaged by AI the moment they come in — most are resolved without human intervention. High-urgency issues get escalated to you immediately with full context.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-techops", message: "Opening TechOps...", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/techops", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "techops-tickets", message: "AI-triaged tickets — most resolved without human intervention", duration_ms: 12000, delay_ms: 3200 },
    ],
    duration_ms: 17000,
    next_step_trigger: "manual"
  },
  {
    id: 11,
    title: "Reports",
    jarvis_message: "And finally, Reports. Four executive dashboards — Owner, Project, Operations, and Sales — all built from live data and updated automatically. I flag anything trending in the wrong direction so you see problems before they compound. That's the full platform. Any questions?",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-reports", message: "Opening Reports...", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/reports", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "reports-dashboards", message: "Owner, Project, Operations, and Sales dashboards — all live data", duration_ms: 12000, delay_ms: 3200 },
    ],
    duration_ms: 17000,
    next_step_trigger: "manual"
  }
];

// Demo Session Management
export class DemoSessionManager {
  private static sessions: Map<string, DemoSession> = new Map();

  static createSession(userId: string, accountId: string): DemoSession {
    const sessionId = `demo_${userId}_${Date.now()}`;
    const session: DemoSession = {
      id: sessionId,
      user_id: userId,
      account_id: accountId,
      session_type: "jarvis_demo",
      status: "active",
      current_step: 1,
      started_at: new Date(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      voice_enabled: false,
      metadata: {
        steps_completed: [],
        user_interactions: [],
        last_activity: new Date()
      }
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  static getSession(sessionId: string): DemoSession | null {
    return this.sessions.get(sessionId) || null;
  }

  static updateSession(sessionId: string, updates: Partial<DemoSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      session.metadata.last_activity = new Date();
    }
  }

  static completeStep(sessionId: string, stepNumber: number): void {
    const session = this.sessions.get(sessionId);
    if (session && !session.metadata.steps_completed.includes(stepNumber)) {
      session.metadata.steps_completed.push(stepNumber);
    }
  }

  static isDemo(user: any): boolean {
    return user?.role === "demo" || user?.email === "demo@ottoserv.com";
  }
}

export default {
  DEMO_SCRIPT,
  DemoSessionManager
};