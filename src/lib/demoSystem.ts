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

// Value-led OttoServ demo. The story is about the business problems we solve —
// operational waste, missed opportunities, slow follow-up, unclear ownership,
// invisible bottlenecks — with dashboard sections as proof points, not the
// subject. Every step answers "Why does this matter to the business?"
export const DEMO_SCRIPT: DemoStep[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. OPENING / POSITIONING
  // No navigation — a framing moment before we touch any dashboard section.
  {
    id: 1,
    title: "Welcome — what OttoServ actually is",
    jarvis_message:
      "Welcome. I'm Jarvis. Before I show you anything on this screen, I want to be clear about what OttoServ is — because this isn't a software walkthrough. OttoServ is an AI operations layer that sits across your business and helps you find and eliminate operational waste. Most service businesses lose real money every week to the same things: missed calls, slow follow-up, repetitive admin work, unclear ownership of who does what, systems that don't talk to each other, no real visibility for the owner, and bottlenecks no one has the time to fix. We're going to walk through the dashboard together, but the point of every section is the same: where is your business leaking time, money, or opportunity — and how do we close that gap?",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "kpi-section",
        message: "OttoServ is an AI operations layer — built to find and eliminate operational waste",
        duration_ms: 22000,
      },
    ],
    duration_ms: 24000,
    next_step_trigger: "manual",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. COMMAND CENTER / BUSINESS OVERVIEW
  {
    id: 2,
    title: "Visibility — knowing what's actually happening",
    jarvis_message:
      "Most owners and managers run their business on lagging information — a phone call from an upset client, an end-of-month report, a number their bookkeeper mentioned. That's a problem. By the time you find out something's off, the cost is already locked in. This is your command center. Live revenue, active jobs, open leads, today's appointments — all in one view, updated as activity happens. It cuts the blind spots so you stop reacting and start seeing things while you can still do something about them.",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "operational-snapshot",
        message: "Live visibility into what needs attention right now",
        duration_ms: 18000,
      },
    ],
    duration_ms: 20000,
    next_step_trigger: "manual",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. LEAD CAPTURE AND QUALIFICATION
  {
    id: 3,
    title: "Revenue protection — every lead, no matter the channel",
    jarvis_message:
      "Here's a quiet truth about service businesses: the single biggest source of lost revenue isn't pricing or competition — it's leads that never get answered, qualified, or routed. A missed call after hours. A web form sitting in an inbox. A referral that fell off someone's desk. Every one of those is paid-for opportunity walking out the door. OttoServ captures inbound from every channel — calls, web forms, social, referrals — into a single pipeline, qualifies them automatically, and routes them to the right person or workflow. Think of this less as a 'CRM' and more as revenue protection.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-leads", message: "Lead capture & qualification", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/leads", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "leads-pipeline", message: "Every inquiry captured, qualified, and routed — so revenue stops leaking", duration_ms: 16000, delay_ms: 3200 },
    ],
    duration_ms: 21000,
    next_step_trigger: "manual",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. FOLLOW-UP AND APPOINTMENT BOOKING
  {
    id: 4,
    title: "Speed-to-lead — turning interest into booked work",
    jarvis_message:
      "Most deals aren't lost on price. They're lost between 'I'm interested' and 'I'm booked.' The industry data is unforgiving: response speed inside the first five minutes is one of the strongest predictors of whether a lead converts. But people are busy, follow-up gets inconsistent, and reminders fall through. OttoServ assists or automates the follow-up loop — calls when a lead goes cold, SMS and email sequences that adapt to behavior, appointment reminders, reschedules, and direct booking into the calendar you're looking at now. Your conversion rate goes up not because the leads got better, but because no one fell off the back of the truck.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-calendar", message: "Follow-up & appointment booking", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/calendar", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "calendar-grid", message: "Follow-up that doesn't drop, booking that doesn't require a human in the loop", duration_ms: 16000, delay_ms: 3200 },
    ],
    duration_ms: 21000,
    next_step_trigger: "manual",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. PROCESS MAPPING — major section
  {
    id: 5,
    title: "Process mapping — finding where the business actually leaks",
    jarvis_message:
      "This is the part of OttoServ that most software doesn't do. Before we automate anything, we map how your business actually runs — not the org chart, not the SOP no one follows, but the real path work takes from inquiry to invoice. Every handoff, every approval, every place a tool change happens, every step that depends on someone remembering to do it. That map is where bottlenecks become visible. Maybe it's three people deciding whether to send a quote. Maybe it's a manager who reviews every job before it dispatches. Maybe it's the same data being re-entered into four systems. Process mapping is the bridge between simple automation and actual operational improvement — because automating a broken process just lets you waste time faster. This is where OttoServ earns its keep: showing you exactly where your time and money are being spent on work that shouldn't have to happen.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-processes", message: "Process mapping — finding the bottlenecks", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/processes", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "processes-list", message: "Map the real flow of work — surface bottlenecks before automating them", duration_ms: 26000, delay_ms: 3200 },
    ],
    duration_ms: 31000,
    next_step_trigger: "manual",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. TASK OWNERSHIP AND ACCOUNTABILITY
  {
    id: 6,
    title: "Accountability — work that doesn't need chasing",
    jarvis_message:
      "Operational waste usually comes from one place: it isn't clear who owns what. The estimate didn't go out because Sales thought Office had it. The job didn't dispatch because the field manager assumed the office confirmed. The follow-up didn't happen because no one was specifically assigned. OttoServ assigns work the moment it's created — by role, by person, by escalation policy — and tracks it until it's done. If a task goes overdue, it escalates before the owner has to find out about it in a complaint. The whole point: the business runs itself enough that the owner isn't the bottleneck anymore.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-tasks", message: "Ownership and accountability", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/tasks", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "tasks-list", message: "Clear ownership, auto-escalation — so the owner stops being the bottleneck", duration_ms: 16000, delay_ms: 3200 },
    ],
    duration_ms: 21000,
    next_step_trigger: "manual",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. AUTOMATION CENTER / WORKFLOW AUTOMATION
  {
    id: 7,
    title: "Automation — getting time back",
    jarvis_message:
      "Once we understand the real process, we can take the repetitive, error-prone, low-judgment work off your team's plate. Intake forms that auto-populate the CRM. Reminders that send themselves. Status updates clients used to call to ask about. Routing rules that send the right job to the right tech. Reports that compile themselves. Data entry that just stops existing as a job. Every card here is a live workflow running 24/7 — and every hour of human time you reclaim is an hour your team can spend on work that actually requires a person.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-automations", message: "Automation that removes the busywork", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/automations", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "automations-list", message: "Repetitive work removed — your team spends time where it actually matters", duration_ms: 16000, delay_ms: 3200 },
    ],
    duration_ms: 21000,
    next_step_trigger: "manual",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. CLIENT / JOB / PROJECT VISIBILITY
  {
    id: 8,
    title: "Delivery — what happens after the lead converts",
    jarvis_message:
      "Closing the lead is only half the equation. The other half is delivering the work without anything slipping. Jobs that don't get scheduled. Properties whose service history lives in someone's head. Projects that drift past their budget before anyone notices. Clients who don't get updated. OttoServ holds the whole post-sale picture together — every active job, project, work order, or service request is visible, owned, on schedule, and on budget. When something's off-track, you find out from us, not from an angry client.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-projects", message: "Delivery visibility — every job, every client", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/projects", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "projects-list", message: "Active work tracked from sale to invoice — nothing slips quietly", duration_ms: 16000, delay_ms: 3200 },
    ],
    duration_ms: 21000,
    next_step_trigger: "manual",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. REPORTING AND OPERATIONAL IMPROVEMENT
  {
    id: 9,
    title: "Measurement — proving the operation is actually getting better",
    jarvis_message:
      "Software that just runs tasks isn't enough. OttoServ measures whether your operation is getting better. Response time to inbound leads. Percentage of follow-ups that actually got completed. Tasks closed on time versus overdue. Where time is being spent versus where it should be. How much human effort each automation has saved. Where bottlenecks are forming. The dashboards here are built for the questions an owner actually asks — am I making more money, am I wasting less time, is my team faster than it was last month — not just operational vanity metrics.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-reports", message: "Measuring real operational improvement", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/reports", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "reports-dashboards", message: "Track response time, missed opportunities, completion rates, time saved", duration_ms: 16000, delay_ms: 3200 },
    ],
    duration_ms: 21000,
    next_step_trigger: "manual",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. AI OPERATIONS LAYER / JARVIS
  {
    id: 10,
    title: "The AI layer — why this isn't just a dashboard",
    jarvis_message:
      "Here's the part that makes OttoServ different from the dashboards you've probably seen. Everything you've looked at is connected to me — to AI agents that don't just sit and wait for you to click. We monitor activity across the system, trigger workflows when conditions change, prepare your weekly and monthly reports for you, identify issues before they become problems, and take a real share of the work off your team. Ask me anything in plain language — what leads need follow-up, how this month's revenue is trending, what's overdue, where the bottlenecks are — and I'll pull the answer from live data. This isn't static software. It's an operations layer with intelligence in it.",
    commands: [
      { session_id: "", action: "spotlight_element", target: "sidebar-jarvis", message: "AI agents working across the operation", delay_ms: 0 },
      { session_id: "", action: "navigate_to", target: "/dashboard/jarvis", delay_ms: 1800 },
      { session_id: "", action: "spotlight_element", target: "jarvis-chat-area", message: "Not a dashboard — an operations system with AI working alongside your team", duration_ms: 18000, delay_ms: 3200 },
    ],
    duration_ms: 23000,
    next_step_trigger: "manual",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 11. STRONG CLOSING / NEXT STEP
  {
    id: 11,
    title: "Where to start",
    jarvis_message:
      "Now you've seen the whole picture. To recap quickly: OttoServ gives leadership real visibility, captures every lead, makes follow-up happen on time, maps how the business actually runs, assigns and tracks who owns what, automates the repetitive work, holds delivery together, and measures whether operations are getting better — all with AI agents working alongside your team. The next step is to identify where your company is currently losing the most time, money, or opportunity. OttoServ can map that process, recommend the first workflow improvement, and help implement the automation or accountability system that creates the fastest return. Would you like to start by looking at lead handling, missed follow-up, admin work, or internal process bottlenecks?",
    commands: [
      {
        session_id: "",
        action: "spotlight_element",
        target: "jarvis-chat-area",
        message: "Lead handling · Missed follow-up · Admin work · Internal bottlenecks — which one's costing you most?",
        duration_ms: 22000,
      },
    ],
    duration_ms: 24000,
    next_step_trigger: "manual",
  },
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
        questions_asked: [],
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