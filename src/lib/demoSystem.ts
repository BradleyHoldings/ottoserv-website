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
    jarvis_message: "Welcome to OttoServ. I am Jarvis, your AI operations assistant. I will walk you through how OttoServ helps capture leads, qualify prospects, book appointments, track work, and keep your business operating with less manual follow-up.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "dashboard_overview",
        style: "spotlight",
        message: "This is your OttoServ command center",
        duration_ms: 8000
      }
    ],
    duration_ms: 12000,
    next_step_trigger: "manual"
  },
  {
    id: 2,
    title: "Jarvis Activity",
    jarvis_message: "This area shows what Jarvis and the OttoServ agent team are doing for the business. It gives visibility into tasks, follow-ups, automations, and completed work.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "jarvis_activity",
        style: "spotlight",
        message: "Live agent activity and automation status",
        duration_ms: 8000
      }
    ],
    duration_ms: 10000,
    next_step_trigger: "manual"
  },
  {
    id: 3,
    title: "Missed Call Recovery",
    jarvis_message: "This section shows missed calls and inbound opportunities that would normally fall through the cracks. OttoServ can respond quickly, qualify the lead, and move the opportunity forward.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "missed_calls",
        style: "spotlight",
        message: "Turn missed calls into qualified opportunities",
        duration_ms: 10000
      }
    ],
    duration_ms: 12000,
    next_step_trigger: "manual"
  },
  {
    id: 4,
    title: "Lead Pipeline",
    jarvis_message: "This is where leads move from new inquiry to qualified opportunity to booked appointment. The goal is to reduce slow follow-up and make sure every good lead gets handled.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "lead_pipeline",
        style: "spotlight",
        message: "Systematic lead progression and qualification",
        duration_ms: 10000
      }
    ],
    duration_ms: 12000,
    next_step_trigger: "manual"
  },
  {
    id: 5,
    title: "Qualified Leads",
    jarvis_message: "Here you can see which leads have been qualified based on fit, need, urgency, budget, and next step. This keeps the owner or team focused on real opportunities instead of chasing every inquiry manually.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "qualified_leads",
        style: "spotlight",
        message: "Focus on high-quality opportunities",
        duration_ms: 10000
      }
    ],
    duration_ms: 12000,
    next_step_trigger: "manual"
  },
  {
    id: 6,
    title: "Appointments",
    jarvis_message: "Once a lead is qualified, OttoServ can help book the appointment, confirm the meeting, and reduce no-shows through reminders and follow-up.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "appointments",
        style: "spotlight",
        message: "Automated scheduling and confirmation",
        duration_ms: 8000
      }
    ],
    duration_ms: 10000,
    next_step_trigger: "manual"
  },
  {
    id: 7,
    title: "Follow-Up Tasks",
    jarvis_message: "This is where follow-up work is tracked. OttoServ helps make sure leads, customers, and internal tasks do not get forgotten.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "follow_up_tasks",
        style: "spotlight",
        message: "Never miss a follow-up opportunity",
        duration_ms: 8000
      }
    ],
    duration_ms: 10000,
    next_step_trigger: "manual"
  },
  {
    id: 8,
    title: "Automation Activity",
    jarvis_message: "This shows the automated work happening behind the scenes, such as messages, status updates, task creation, reminders, and agent actions.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "automation_activity",
        style: "spotlight",
        message: "AI working 24/7 for your business",
        duration_ms: 10000
      }
    ],
    duration_ms: 12000,
    next_step_trigger: "manual"
  },
  {
    id: 9,
    title: "Reports",
    jarvis_message: "Reports help the business understand lead flow, response time, booked appointments, completed tasks, and where opportunities are being lost.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "reports",
        style: "spotlight",
        message: "Business intelligence and performance insights",
        duration_ms: 8000
      }
    ],
    duration_ms: 10000,
    next_step_trigger: "manual"
  },
  {
    id: 10,
    title: "Integrations",
    jarvis_message: "OttoServ can connect with the tools a business already uses, such as email, CRM, calendars, phone systems, forms, and messaging platforms.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "integrations",
        style: "spotlight",
        message: "Connect with your existing business tools",
        duration_ms: 8000
      }
    ],
    duration_ms: 10000,
    next_step_trigger: "manual"
  },
  {
    id: 11,
    title: "Demo Complete",
    jarvis_message: "That completes the guided overview. OttoServ is designed to help service businesses respond faster, follow up consistently, qualify leads, book appointments, and operate with more visibility.",
    commands: [
      {
        session_id: "",
        action: "clear_guidance",
        message: "Demo complete - ready for questions",
        duration_ms: 3000
      }
    ],
    duration_ms: 12000,
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