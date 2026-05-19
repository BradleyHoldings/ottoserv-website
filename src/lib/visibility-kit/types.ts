// AI Search / Answer Engine Optimization — reusable client kit types.
// Source of truth for intake, generated pages, tracker, and authority checklist.

export type ReviewStatus =
  | "draft"
  | "in_review"
  | "needs_revision"
  | "approved"
  | "published";

export type ReviewGate = {
  clientApprovalRequired: boolean;
  legalConcernsCleared: boolean;
  pricingVerified: boolean;
  testimonialsVerified: boolean;
  claimsVerified: boolean;
  schemaValidated: boolean;
};

export type Contact = {
  primaryPhone?: string;
  email?: string;
  bookingUrl?: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  hours?: string;
  ctaLabel?: string;
};

export type Review = {
  author?: string;
  source?: string;
  rating?: number; // 1-5
  text: string;
  verified?: boolean;
};

export type CaseStudy = {
  title: string;
  customer?: string;
  problem: string;
  approach: string;
  result: string;
};

export type Competitor = {
  name: string;
  positioning?: string;
  whenTheyWin?: string;
  whenClientWins?: string;
};

export type ProblemSpaceTopic = {
  slug: string;
  title: string;             // human title, becomes H1
  oneLineAnswer: string;     // direct answer for AI extraction
  whoItsFor: string;
  problemSolved: string;
  howCompanyHelps: string[];
  whyChooseThisCompany: string[];
  comparisonTable?: {
    column: string;
    client: string;
    alternative: string;
  }[];
  faqs?: { q: string; a: string }[];
  cta?: string;
  status: ReviewStatus;
  gates: ReviewGate;
};

export type FAQItem = { q: string; a: string };

export type ComparisonPage = {
  slug: string;
  competitorName: string;     // e.g. "DIY", "In-House Receptionist", "Acme HVAC"
  oneLineAnswer: string;
  factualNotes: string;       // honest, non-misleading framing
  whenClientIsBetter: string[];
  whenAlternativeIsBetter: string[];
  table: { column: string; client: string; alternative: string }[];
  faqs?: FAQItem[];
  status: ReviewStatus;
  gates: ReviewGate;
};

export type ClientIntake = {
  slug: string;                  // url-safe id used everywhere
  companyName: string;
  website?: string;
  mainService: string;
  secondaryServices: string[];
  industriesServed: string[];
  serviceAreas: string[];        // cities / regions
  bestFitCustomers: string[];
  badFitCustomers: string[];
  commonProblems: string[];
  urgentSituations: string[];
  commonSalesQuestions: string[];
  pricing: {
    summary: string;             // one-sentence pricing answer
    ranges?: string[];           // bullet list
    pricingFactors?: string[];
  };
  differentiators: string[];
  guarantees: string[];
  reviews: Review[];
  caseStudies: CaseStudy[];
  competitors: Competitor[];
  contact: Contact;
  founderStory?: string;
  tools?: string[];

  // generated content
  problemSpaceTopics: ProblemSpaceTopic[];
  faq: { items: FAQItem[]; status: ReviewStatus; gates: ReviewGate };
  comparisonPages: ComparisonPage[];

  // operations
  aiLearnPageStatus: ReviewStatus;
  aiLearnPageGates: ReviewGate;
  pricingPageStatus: ReviewStatus;
  pricingPageGates: ReviewGate;

  promptTracker: PromptTrackerRow[];
  authorityChecklist: AuthorityChecklistItem[];

  createdAt: string;
  updatedAt: string;
};

export type AISystem = "chatgpt" | "perplexity" | "gemini" | "claude" | "google_ai_overviews";

export type PromptTrackerRow = {
  id: string;
  promptText: string;
  category: string;             // e.g. "best in city", "vs competitor", "urgent"
  desiredAnswer: string;
  results: Partial<Record<AISystem, string>>;
  clientMentioned: boolean;
  competitorsMentioned: string[];
  sourcesCited: string[];
  missingSourceOpportunities: string[];
  recommendedFix: string;
  status: "open" | "in_progress" | "fixed" | "wontfix";
  nextAction: string;
  lastCheckedAt?: string;
};

export type AuthorityChannel =
  | "google_business_profile"
  | "bing_places"
  | "apple_business_connect"
  | "yelp"
  | "facebook_page"
  | "linkedin_company"
  | "industry_directory"
  | "local_directory"
  | "chamber_of_commerce"
  | "bbb"
  | "review_platform"
  | "forum"
  | "reddit_quora"
  | "podcast_interview"
  | "local_press"
  | "case_study";

export type AuthorityChecklistItem = {
  channel: AuthorityChannel;
  label: string;
  applicable: boolean;
  status: "not_started" | "in_progress" | "claimed" | "verified" | "skipped";
  url?: string;
  notes?: string;
};

export const DEFAULT_GATES: ReviewGate = {
  clientApprovalRequired: true,
  legalConcernsCleared: false,
  pricingVerified: false,
  testimonialsVerified: false,
  claimsVerified: false,
  schemaValidated: false,
};
