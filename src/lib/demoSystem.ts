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
    jarvis_message: "The Leads section manages your full pipeline. When someone calls, fills out a form, or reaches out on social media, I qualify them, score them, and move them through the pipeline — from new inquiry to booked appointment — without manual follow-up.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "sidebar-leads",
        message: "Lead pipeline management",
        duration_ms: 12000
      }
    ],
    duration_ms: 14000,
    next_step_trigger: "manual"
  },
  {
    id: 7,
    title: "Automations",
    jarvis_message: "The Automations section is where I run your business logic — follow-up sequences, lead nurture, appointment reminders, invoice reminders, and dozens of other workflows running 24/7 in the background.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "sidebar-automations",
        message: "Business automations",
        duration_ms: 12000
      }
    ],
    duration_ms: 14000,
    next_step_trigger: "manual"
  },
  {
    id: 8,
    title: "Social Media",
    jarvis_message: "Social Media is managed through this section. I draft posts, schedule them across Facebook, Instagram, LinkedIn, and Reddit, and route them for your approval before publishing. Your brand stays active without you having to think about it.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "sidebar-social",
        message: "Social media management",
        duration_ms: 12000
      }
    ],
    duration_ms: 14000,
    next_step_trigger: "manual"
  },
  {
    id: 9,
    title: "Ask Jarvis",
    jarvis_message: "You can chat with me directly through Ask Jarvis. Type any question about your business — 'What leads need follow-up?' or 'How did revenue trend this month?' — and I'll pull the answer from live data. For quick access anywhere, you can also download the Jarvis app to speak with me by voice. The audio version knows everything happening in your business in real time and can answer any question. Since voice conversations can't take direct actions yet, anything that needs doing — sending an email, creating a task, updating a record — can be handled through text chat right here or via Telegram.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "sidebar-jarvis",
        message: "Ask Jarvis — AI assistant",
        duration_ms: 12000
      }
    ],
    duration_ms: 14000,
    next_step_trigger: "manual"
  },
  {
    id: 10,
    title: "TechOps",
    jarvis_message: "TechOps is built for service businesses that manage technology for their clients. Submit tickets, track remote access jobs, and route high-urgency issues to me for immediate triage and response.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "sidebar-techops",
        message: "TechOps management",
        duration_ms: 12000
      }
    ],
    duration_ms: 14000,
    next_step_trigger: "manual"
  },
  {
    id: 11,
    title: "Reports",
    jarvis_message: "Reports gives you intelligence on lead conversion, revenue trends, job profitability, and team performance. I generate these automatically and flag anything that needs your attention. That covers the core of OttoServ. Any questions?",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "sidebar-reports",
        message: "Business intelligence reports",
        duration_ms: 12000
      }
    ],
    duration_ms: 14000,
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