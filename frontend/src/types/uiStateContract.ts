import type { SessionStatus, SponsorTrack } from "@/schemas/career";

export type TrackId =
  | "general"
  | "tech-career"
  | "healthcare-pivot"
  | "creative-industry"
  | (string & {});

export type HomeViewStatus = "idle" | "starting" | "error";
export type LoadState = "loading" | "ready" | "error";
export type SendState = "idle" | "sending" | "error";
export type AnalyzeState =
  | "hidden"
  | "disabled"
  | "enabled"
  | "running"
  | "error";
export type ResultsViewState =
  | "no-session"
  | "loading-session"
  | "analyzing"
  | "complete"
  | "empty"
  | "error";

export interface TrackThemeTokens {
  trackId: TrackId;
  accent: string;
  accentHover: string;
  surfaceSoft: string;
  borderTint: string;
  onAccent: string;
  heroGradient: string;
}

export interface HomeStateContract {
  status: HomeViewStatus;
  selectedTrackId: TrackId;
  tracks: SponsorTrack[];
  errorMessage?: string;
  canStartAssessment: boolean;
}

export interface OnboardingStateContract {
  hasSessionParam: boolean;
  loadState: LoadState;
  sendState: SendState;
  analyzeState: AnalyzeState;
  sessionStatus: SessionStatus | null;
  intakeComplete: boolean;
  profileFieldCount: number;
  messageCount: number;
  sendError?: string;
  analyzeError?: string;
}

export interface ResultsStateContract {
  hasSessionParam: boolean;
  viewState: ResultsViewState;
  sessionStatus: SessionStatus | null;
  isFallback: boolean;
  progressPct: number;
  stageLabel: string;
  recommendationCount: number;
  fetchError?: string;
}

export interface DashboardSessionRowContract {
  id: string;
  status: SessionStatus;
  trackId: TrackId | null;
  messageCount: number;
  updatedAtIso: string;
}

export interface DashboardStateContract {
  loadState: LoadState;
  sessions: DashboardSessionRowContract[];
  creatingNew: boolean;
}

export interface SessionStatusDisplayContract {
  label: string;
  color: string;
  actionLabel: string;
}

export type OnboardingPromptKey =
  | "interests"
  | "values"
  | "workingStyle"
  | "hardSkills"
  | "softSkills"
  | "riskTolerance"
  | "financialNeeds"
  | "geographicFlexibility"
  | "educationLevel"
  | "timelineUrgency"
  | "purposePriorities"
  | "burnoutConcerns";

export interface OnboardingQuickChoiceOption {
  id: string;
  label: string;
  value: string;
  followUps?: OnboardingQuickChoiceOption[];
}

export interface OnboardingQuickChoiceState {
  visible: boolean;
  promptKey: OnboardingPromptKey;
  promptLabel: string;
  helperText: string;
  draftValue: string;
  selectedValues: string[];
  maxSelections: number;
  options: Array<
    OnboardingQuickChoiceOption & {
      selected: boolean;
      disabled: boolean;
      group: "base" | "followup";
    }
  >;
}

export interface DeriveHomeStateInput {
  loading: boolean;
  errorMessage: string | null;
  selectedTrackId: TrackId;
  tracks: SponsorTrack[];
}

export interface DeriveOnboardingStateInput {
  hasSessionParam: boolean;
  loadState: LoadState;
  sending: boolean;
  sendError: string | null;
  analyzing: boolean;
  analyzeError: string | null;
  sessionStatus: SessionStatus | null;
  intakeComplete: boolean;
  profileFieldCount: number;
  messageCount: number;
}

export interface DeriveResultsStateInput {
  hasSessionParam: boolean;
  hasSession: boolean;
  sessionStatus: SessionStatus | null;
  hasRecommendations: boolean;
  recommendationCount: number;
  fetchError: string | null;
  isFallback: boolean;
  progressPct: number;
  stageLabel: string;
}

export interface DeriveDashboardStateInput {
  loading: boolean;
  sessions: DashboardSessionRowContract[];
  creatingNew: boolean;
}

export interface DeriveOnboardingQuickChoiceStateInput {
  assistantMessageCount: number;
  sessionStatus: SessionStatus | null;
  intakeComplete: boolean;
  draftValue: string;
  trackId: TrackId | null;
}

type QuickChoiceTrackVariant =
  | "general"
  | "tech-career"
  | "healthcare-pivot"
  | "creative-industry";

export type UiAction =
  | "select-track"
  | "start-assessment"
  | "send-message"
  | "trigger-analysis"
  | "retry-analysis"
  | "open-session"
  | "create-new-session";

export interface OnboardingQuickChoiceTemplate {
  promptLabel: string;
  helperText: string;
  options: OnboardingQuickChoiceOption[];
}

export const TRACK_THEME_TOKENS: Record<TrackId, TrackThemeTokens> = {
  general: {
    trackId: "general",
    accent: "#64748B",
    accentHover: "#475569",
    surfaceSoft: "rgba(100, 116, 139, 0.12)",
    borderTint: "rgba(100, 116, 139, 0.22)",
    onAccent: "#FFFFFF",
    heroGradient: "linear-gradient(135deg, #475569 0%, #64748B 100%)",
  },
  "tech-career": {
    trackId: "tech-career",
    accent: "#06B6D4",
    accentHover: "#0891B2",
    surfaceSoft: "rgba(6, 182, 212, 0.12)",
    borderTint: "rgba(6, 182, 212, 0.22)",
    onAccent: "#FFFFFF",
    heroGradient: "linear-gradient(135deg, #0F766E 0%, #06B6D4 100%)",
  },
  "healthcare-pivot": {
    trackId: "healthcare-pivot",
    accent: "#10B981",
    accentHover: "#059669",
    surfaceSoft: "rgba(16, 185, 129, 0.12)",
    borderTint: "rgba(16, 185, 129, 0.22)",
    onAccent: "#FFFFFF",
    heroGradient: "linear-gradient(135deg, #065F46 0%, #10B981 100%)",
  },
  "creative-industry": {
    trackId: "creative-industry",
    accent: "#F59E0B",
    accentHover: "#D97706",
    surfaceSoft: "rgba(245, 158, 11, 0.12)",
    borderTint: "rgba(245, 158, 11, 0.22)",
    onAccent: "#111827",
    heroGradient: "linear-gradient(135deg, #B45309 0%, #F59E0B 100%)",
  },
};

export const SESSION_STATUS_DISPLAY: Record<
  SessionStatus,
  SessionStatusDisplayContract
> = {
  intake: {
    label: "Intake",
    color: "#64748B",
    actionLabel: "Continue intake",
  },
  analyzing: {
    label: "Analyzing",
    color: "#06B6D4",
    actionLabel: "View analysis",
  },
  complete: {
    label: "Complete",
    color: "#10B981",
    actionLabel: "View results",
  },
  error: {
    label: "Error",
    color: "#EF4444",
    actionLabel: "Review session",
  },
};

export const ONBOARDING_PROMPT_ORDER: OnboardingPromptKey[] = [
  "interests",
  "values",
  "workingStyle",
  "hardSkills",
  "softSkills",
  "riskTolerance",
  "financialNeeds",
  "geographicFlexibility",
  "educationLevel",
  "timelineUrgency",
  "purposePriorities",
  "burnoutConcerns",
];

export const ONBOARDING_QUICK_CHOICE_TEMPLATES: Record<
  OnboardingPromptKey,
  OnboardingQuickChoiceTemplate
> = {
  interests: {
    promptLabel: "Interests",
    helperText: "Pick a few areas that sound energizing right now.",
    options: [
      {
        id: "interests-software-development",
        label: "Software development",
        value: "software development",
        followUps: [
          {
            id: "interests-frontend",
            label: "Frontend engineering",
            value: "frontend engineering",
            followUps: [
              {
                id: "interests-design-systems",
                label: "Design systems",
                value: "design systems",
              },
              {
                id: "interests-accessibility",
                label: "Accessibility",
                value: "accessibility",
              },
            ],
          },
          {
            id: "interests-backend",
            label: "Backend systems",
            value: "backend systems",
            followUps: [
              {
                id: "interests-apis",
                label: "APIs",
                value: "apis",
              },
              {
                id: "interests-databases",
                label: "Databases",
                value: "databases",
              },
            ],
          },
        ],
      },
      {
        id: "interests-visual-design",
        label: "Visual design",
        value: "visual design",
        followUps: [
          {
            id: "interests-layout",
            label: "Layout systems",
            value: "layout systems",
            followUps: [
              {
                id: "interests-information-architecture",
                label: "Information architecture",
                value: "information architecture",
              },
              {
                id: "interests-typography-systems",
                label: "Typography systems",
                value: "typography systems",
              },
            ],
          },
          {
            id: "interests-illustration",
            label: "Illustration",
            value: "illustration",
            followUps: [
              {
                id: "interests-motion-graphics",
                label: "Motion graphics",
                value: "motion graphics",
              },
              {
                id: "interests-art-direction",
                label: "Art direction",
                value: "art direction",
              },
            ],
          },
        ],
      },
      {
        id: "interests-healthcare",
        label: "Healthcare",
        value: "healthcare",
        followUps: [
          {
            id: "interests-patient-care",
            label: "Patient care",
            value: "patient care",
            followUps: [
              {
                id: "interests-care-coordination",
                label: "Care coordination",
                value: "care coordination",
              },
              {
                id: "interests-clinical-ops",
                label: "Clinical operations",
                value: "clinical operations",
              },
            ],
          },
          {
            id: "interests-public-health",
            label: "Public health",
            value: "public health",
            followUps: [
              {
                id: "interests-program-planning",
                label: "Program planning",
                value: "program planning",
              },
              {
                id: "interests-health-policy",
                label: "Health policy",
                value: "health policy",
              },
            ],
          },
        ],
      },
      {
        id: "interests-writing",
        label: "Writing",
        value: "writing",
        followUps: [
          {
            id: "interests-technical-writing",
            label: "Technical writing",
            value: "technical writing",
            followUps: [
              {
                id: "interests-api-docs",
                label: "API docs",
                value: "api docs",
              },
              {
                id: "interests-tutorials",
                label: "Tutorials",
                value: "tutorials",
              },
            ],
          },
          {
            id: "interests-editing",
            label: "Editing",
            value: "editing",
            followUps: [
              {
                id: "interests-content-strategy",
                label: "Content strategy",
                value: "content strategy",
              },
              {
                id: "interests-publishing",
                label: "Publishing",
                value: "publishing",
              },
            ],
          },
        ],
      },
      {
        id: "interests-data-analytics",
        label: "Data and analytics",
        value: "data and analytics",
        followUps: [
          {
            id: "interests-dashboards",
            label: "Dashboards",
            value: "dashboards",
          },
          { id: "interests-modeling", label: "Modeling", value: "modeling" },
        ],
      },
      {
        id: "interests-design",
        label: "Design",
        value: "design",
        followUps: [
          { id: "interests-ui", label: "UI systems", value: "ui systems" },
          {
            id: "interests-brand",
            label: "Brand storytelling",
            value: "brand storytelling",
          },
        ],
      },
      {
        id: "interests-product",
        label: "Product thinking",
        value: "product thinking",
        followUps: [
          { id: "interests-research", label: "Research", value: "research" },
          { id: "interests-strategy", label: "Strategy", value: "strategy" },
        ],
      },
    ],
  },
  values: {
    promptLabel: "Values",
    helperText: "Select the motivations you want a role to support.",
    options: [
      {
        id: "values-autonomy",
        label: "Autonomy",
        value: "autonomy",
        followUps: [
          {
            id: "values-independent",
            label: "Independent work",
            value: "independent work",
          },
          {
            id: "values-flexible-hours",
            label: "Flexible hours",
            value: "flexible hours",
          },
        ],
      },
      {
        id: "values-collaboration",
        label: "Collaboration",
        value: "collaboration",
        followUps: [
          {
            id: "values-team-based",
            label: "Team-based work",
            value: "team-based work",
          },
          {
            id: "values-cross-functional",
            label: "Cross-functional teams",
            value: "cross-functional teams",
          },
        ],
      },
      {
        id: "values-stability",
        label: "Stability",
        value: "stability",
        followUps: [
          {
            id: "values-predictable",
            label: "Predictable hours",
            value: "predictable hours",
          },
          {
            id: "values-established",
            label: "Established organizations",
            value: "established organizations",
          },
        ],
      },
      {
        id: "values-innovation",
        label: "Innovation",
        value: "innovation",
        followUps: [
          {
            id: "values-experimentation",
            label: "Experimentation",
            value: "experimentation",
          },
          {
            id: "values-new-products",
            label: "New products",
            value: "new products",
          },
        ],
      },
      {
        id: "values-impact",
        label: "Impact",
        value: "impact",
        followUps: [
          {
            id: "values-helping-people",
            label: "Helping people",
            value: "helping people",
          },
          {
            id: "values-mission-driven",
            label: "Mission-driven work",
            value: "mission-driven work",
          },
        ],
      },
      {
        id: "values-flexibility",
        label: "Flexibility",
        value: "flexibility",
        followUps: [
          { id: "values-remote", label: "Remote work", value: "remote work" },
          { id: "values-varied", label: "Varied days", value: "varied days" },
        ],
      },
    ],
  },
  workingStyle: {
    promptLabel: "Working style",
    helperText: "Mix and match the rhythms that fit you best.",
    options: [
      { id: "style-deep-focus", label: "Deep focus", value: "deep focus" },
      {
        id: "style-collaborative",
        label: "Collaborative",
        value: "collaborative",
      },
      { id: "style-structured", label: "Structured", value: "structured" },
      { id: "style-flexible", label: "Flexible", value: "flexible" },
      { id: "style-fast-paced", label: "Fast-paced", value: "fast-paced" },
      { id: "style-analytical", label: "Analytical", value: "analytical" },
    ],
  },
  hardSkills: {
    promptLabel: "Hard skills",
    helperText: "Pick the strongest skills you want the model to factor in.",
    options: [
      {
        id: "skills-coding",
        label: "Coding",
        value: "coding",
        followUps: [
          { id: "skills-frontend", label: "Frontend", value: "frontend" },
          { id: "skills-backend", label: "Backend", value: "backend" },
          { id: "skills-scripting", label: "Scripting", value: "scripting" },
        ],
      },
      {
        id: "skills-data",
        label: "Data analysis",
        value: "data analysis",
        followUps: [
          { id: "skills-dashboards", label: "Dashboards", value: "dashboards" },
          { id: "skills-statistics", label: "Statistics", value: "statistics" },
        ],
      },
      {
        id: "skills-writing",
        label: "Writing",
        value: "writing",
        followUps: [
          { id: "skills-docs", label: "Documentation", value: "documentation" },
          { id: "skills-proposals", label: "Proposals", value: "proposals" },
        ],
      },
      {
        id: "skills-design",
        label: "Design",
        value: "design",
        followUps: [
          { id: "skills-wireframes", label: "Wireframes", value: "wireframes" },
          { id: "skills-branding", label: "Branding", value: "branding" },
        ],
      },
      {
        id: "skills-communication",
        label: "Communication",
        value: "communication",
        followUps: [
          {
            id: "skills-presentations",
            label: "Presentations",
            value: "presentations",
          },
          {
            id: "skills-client-facing",
            label: "Client-facing work",
            value: "client-facing work",
          },
        ],
      },
      {
        id: "skills-operations",
        label: "Operations",
        value: "operations",
        followUps: [
          {
            id: "skills-process",
            label: "Process improvement",
            value: "process improvement",
          },
          {
            id: "skills-coordination",
            label: "Coordination",
            value: "coordination",
          },
        ],
      },
    ],
  },
  softSkills: {
    promptLabel: "Soft skills",
    helperText: "Select the interpersonal strengths that show up in your work.",
    options: [
      {
        id: "soft-communication",
        label: "Communication",
        value: "communication",
      },
      {
        id: "soft-leadership",
        label: "Leadership",
        value: "leadership",
        followUps: [
          { id: "soft-coaching", label: "Coaching", value: "coaching" },
          { id: "soft-delegation", label: "Delegation", value: "delegation" },
        ],
      },
      { id: "soft-empathy", label: "Empathy", value: "empathy" },
      {
        id: "soft-problem-solving",
        label: "Problem solving",
        value: "problem solving",
      },
      { id: "soft-organization", label: "Organization", value: "organization" },
      { id: "soft-creativity", label: "Creativity", value: "creativity" },
    ],
  },
  riskTolerance: {
    promptLabel: "Risk tolerance",
    helperText: "Choose the comfort level that best matches your next move.",
    options: [
      {
        id: "risk-low",
        label: "Low risk",
        value: "low risk",
        followUps: [
          {
            id: "risk-stable",
            label: "Stable industries",
            value: "stable industries",
          },
          {
            id: "risk-benefits",
            label: "Strong benefits",
            value: "strong benefits",
          },
        ],
      },
      {
        id: "risk-medium",
        label: "Medium risk",
        value: "medium risk",
        followUps: [
          {
            id: "risk-balanced",
            label: "Balanced growth",
            value: "balanced growth",
          },
          { id: "risk-hybrid", label: "Hybrid roles", value: "hybrid roles" },
        ],
      },
      {
        id: "risk-high",
        label: "High risk",
        value: "high risk",
        followUps: [
          { id: "risk-startups", label: "Startups", value: "startups" },
          {
            id: "risk-ambiguity",
            label: "Ambiguous problems",
            value: "ambiguous problems",
          },
        ],
      },
    ],
  },
  financialNeeds: {
    promptLabel: "Financial needs",
    helperText:
      "Quick tags are enough here; you can always add detail in plain text.",
    options: [
      {
        id: "finance-salary-floor",
        label: "Need salary floor",
        value: "need salary floor",
      },
      {
        id: "finance-growth",
        label: "Want strong growth",
        value: "want strong growth",
      },
      {
        id: "finance-benefits",
        label: "Benefits matter",
        value: "benefits matter",
      },
      {
        id: "finance-debt",
        label: "Student debt pressure",
        value: "student debt pressure",
      },
      {
        id: "finance-stability",
        label: "Prefer steady pay",
        value: "prefer steady pay",
      },
      {
        id: "finance-bonus",
        label: "Bonus/commission",
        value: "bonus commission",
      },
    ],
  },
  geographicFlexibility: {
    promptLabel: "Location flexibility",
    helperText: "Pick the locations you are open to and any constraints.",
    options: [
      {
        id: "geo-local",
        label: "Local only",
        value: "local only",
        followUps: [
          {
            id: "geo-commute",
            label: "Commute friendly",
            value: "commute friendly",
          },
        ],
      },
      {
        id: "geo-remote",
        label: "Remote",
        value: "remote",
        followUps: [
          {
            id: "geo-fully-remote",
            label: "Fully remote",
            value: "fully remote",
          },
          { id: "geo-hybrid", label: "Hybrid", value: "hybrid" },
        ],
      },
      {
        id: "geo-relocate",
        label: "Willing to relocate",
        value: "willing to relocate",
        followUps: [
          { id: "geo-new-city", label: "New city", value: "new city" },
          {
            id: "geo-regional",
            label: "Regional move",
            value: "regional move",
          },
        ],
      },
      {
        id: "geo-flexible",
        label: "Flexible",
        value: "flexible",
        followUps: [
          {
            id: "geo-either",
            label: "Either remote or onsite",
            value: "either remote or onsite",
          },
        ],
      },
    ],
  },
  educationLevel: {
    promptLabel: "Education",
    helperText: "Use the closest match or your highest completed level.",
    options: [
      { id: "edu-high-school", label: "High school", value: "high school" },
      { id: "edu-associate", label: "Associate", value: "associate degree" },
      { id: "edu-bachelors", label: "Bachelor's", value: "bachelor degree" },
      { id: "edu-masters", label: "Master's", value: "master degree" },
      { id: "edu-self-taught", label: "Self-taught", value: "self taught" },
      {
        id: "edu-certification",
        label: "Certification",
        value: "certification",
      },
    ],
  },
  timelineUrgency: {
    promptLabel: "Timeline urgency",
    helperText: "Select the cadence that best matches your career move.",
    options: [
      {
        id: "time-immediate",
        label: "Immediate",
        value: "immediate",
        followUps: [{ id: "time-now", label: "Start now", value: "start now" }],
      },
      {
        id: "time-short",
        label: "Short-term",
        value: "short term",
        followUps: [
          {
            id: "time-six-months",
            label: "Within 6 months",
            value: "within 6 months",
          },
        ],
      },
      {
        id: "time-long",
        label: "Long-term",
        value: "long term",
        followUps: [
          { id: "time-exploring", label: "Exploring", value: "exploring" },
        ],
      },
    ],
  },
  purposePriorities: {
    promptLabel: "Purpose priorities",
    helperText: "Choose the kinds of impact or meaning you care about most.",
    options: [
      {
        id: "purpose-helping",
        label: "Helping people",
        value: "helping people",
      },
      {
        id: "purpose-creative",
        label: "Creative expression",
        value: "creative expression",
      },
      {
        id: "purpose-building",
        label: "Building things",
        value: "building things",
      },
      {
        id: "purpose-financial",
        label: "Financial freedom",
        value: "financial freedom",
      },
      {
        id: "purpose-knowledge",
        label: "Advancing knowledge",
        value: "advancing knowledge",
      },
      { id: "purpose-leadership", label: "Leadership", value: "leadership" },
    ],
  },
  burnoutConcerns: {
    promptLabel: "Burnout concerns",
    helperText: "Pick the environments or patterns you want to avoid.",
    options: [
      { id: "burnout-hours", label: "Long hours", value: "long hours" },
      {
        id: "burnout-conflict",
        label: "High conflict",
        value: "high conflict",
      },
      {
        id: "burnout-travel",
        label: "Constant travel",
        value: "constant travel",
      },
      {
        id: "burnout-switching",
        label: "Context switching",
        value: "context switching",
      },
      {
        id: "burnout-oncall",
        label: "On-call nights",
        value: "on-call nights",
      },
      {
        id: "burnout-public-speaking",
        label: "Public speaking overload",
        value: "public speaking overload",
      },
    ],
  },
};

const ONBOARDING_INTEREST_TEMPLATES_BY_TRACK: Record<
  QuickChoiceTrackVariant,
  OnboardingQuickChoiceTemplate
> = {
  general: ONBOARDING_QUICK_CHOICE_TEMPLATES.interests,
  "tech-career": {
    promptLabel: "Interests",
    helperText:
      "Select the technical lanes you want recommendations to prioritize.",
    options: [
      {
        id: "tech-interests-software-development",
        label: "Software development",
        value: "software development",
        followUps: [
          {
            id: "tech-interests-frontend-engineering",
            label: "Frontend engineering",
            value: "frontend engineering",
            followUps: [
              {
                id: "tech-interests-design-systems",
                label: "Design systems",
                value: "design systems",
              },
              {
                id: "tech-interests-web-performance",
                label: "Web performance",
                value: "web performance",
              },
            ],
          },
          {
            id: "tech-interests-backend-systems",
            label: "Backend systems",
            value: "backend systems",
            followUps: [
              {
                id: "tech-interests-api-design",
                label: "API design",
                value: "api design",
              },
              {
                id: "tech-interests-distributed-systems",
                label: "Distributed systems",
                value: "distributed systems",
              },
            ],
          },
        ],
      },
      {
        id: "tech-interests-data-science",
        label: "Data science",
        value: "data science",
        followUps: [
          {
            id: "tech-interests-machine-learning",
            label: "Machine learning",
            value: "machine learning",
          },
          {
            id: "tech-interests-analytics-engineering",
            label: "Analytics engineering",
            value: "analytics engineering",
          },
        ],
      },
      {
        id: "tech-interests-cloud-infrastructure",
        label: "Cloud infrastructure",
        value: "cloud infrastructure",
        followUps: [
          {
            id: "tech-interests-platform-engineering",
            label: "Platform engineering",
            value: "platform engineering",
          },
          {
            id: "tech-interests-devops",
            label: "DevOps automation",
            value: "devops automation",
          },
        ],
      },
      {
        id: "tech-interests-cybersecurity",
        label: "Cybersecurity",
        value: "cybersecurity",
        followUps: [
          {
            id: "tech-interests-security-operations",
            label: "Security operations",
            value: "security operations",
          },
          {
            id: "tech-interests-application-security",
            label: "Application security",
            value: "application security",
          },
        ],
      },
      {
        id: "tech-interests-product-engineering",
        label: "Product engineering",
        value: "product engineering",
      },
      {
        id: "tech-interests-ai-product",
        label: "AI product roles",
        value: "ai product roles",
      },
    ],
  },
  "healthcare-pivot": {
    promptLabel: "Interests",
    helperText:
      "Choose healthcare directions you are most motivated to explore.",
    options: [
      {
        id: "health-interests-patient-care",
        label: "Patient care",
        value: "patient care",
        followUps: [
          {
            id: "health-interests-nursing",
            label: "Nursing pathway",
            value: "nursing pathway",
          },
          {
            id: "health-interests-care-coordination",
            label: "Care coordination",
            value: "care coordination",
          },
        ],
      },
      {
        id: "health-interests-public-health",
        label: "Public health",
        value: "public health",
        followUps: [
          {
            id: "health-interests-community-programs",
            label: "Community programs",
            value: "community programs",
          },
          {
            id: "health-interests-health-education",
            label: "Health education",
            value: "health education",
          },
        ],
      },
      {
        id: "health-interests-health-informatics",
        label: "Health informatics",
        value: "health informatics",
      },
      {
        id: "health-interests-clinical-operations",
        label: "Clinical operations",
        value: "clinical operations",
      },
      {
        id: "health-interests-rehab-therapy",
        label: "Rehab and therapy",
        value: "rehab and therapy",
      },
      {
        id: "health-interests-healthcare-admin",
        label: "Healthcare administration",
        value: "healthcare administration",
      },
    ],
  },
  "creative-industry": {
    promptLabel: "Interests",
    helperText:
      "Pick the creative directions you want your recommendations built around.",
    options: [
      {
        id: "creative-interests-brand-design",
        label: "Brand design",
        value: "brand design",
        followUps: [
          {
            id: "creative-interests-identity-systems",
            label: "Identity systems",
            value: "identity systems",
          },
          {
            id: "creative-interests-campaign-creative",
            label: "Campaign creative",
            value: "campaign creative",
          },
        ],
      },
      {
        id: "creative-interests-ui-ux",
        label: "UI/UX",
        value: "ui ux",
        followUps: [
          {
            id: "creative-interests-interaction-design",
            label: "Interaction design",
            value: "interaction design",
          },
          {
            id: "creative-interests-ux-research",
            label: "UX research",
            value: "ux research",
          },
        ],
      },
      {
        id: "creative-interests-content-creation",
        label: "Content creation",
        value: "content creation",
      },
      {
        id: "creative-interests-video-production",
        label: "Video production",
        value: "video production",
      },
      {
        id: "creative-interests-illustration",
        label: "Illustration",
        value: "illustration",
      },
      {
        id: "creative-interests-creative-strategy",
        label: "Creative strategy",
        value: "creative strategy",
      },
    ],
  },
};

const MAX_QUICK_CHOICE_SELECTIONS = 6;
const MAX_VISIBLE_QUICK_CHOICES = 15;

function normalizeQuickChoiceValue(value: string): string {
  return value.trim().toLowerCase();
}

function resolveQuickChoiceTrackVariant(
  trackId: TrackId | null,
): QuickChoiceTrackVariant {
  if (trackId === "tech-career") return "tech-career";
  if (trackId === "healthcare-pivot") return "healthcare-pivot";
  if (trackId === "creative-industry") return "creative-industry";
  return "general";
}

export function splitDraftChoiceValues(draftValue: string): string[] {
  return draftValue
    .split(/[,;\n]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function toggleDraftChoiceValue(
  draftValue: string,
  choiceValue: string,
): string {
  const normalizedChoice = normalizeQuickChoiceValue(choiceValue);
  const values = splitDraftChoiceValues(draftValue);
  const existingIndex = values.findIndex(
    (value) => normalizeQuickChoiceValue(value) === normalizedChoice,
  );

  if (existingIndex >= 0) {
    values.splice(existingIndex, 1);
  } else {
    values.push(choiceValue);
  }

  return values.join(", ");
}

export function deriveOnboardingQuickChoiceState(
  input: DeriveOnboardingQuickChoiceStateInput,
): OnboardingQuickChoiceState {
  const promptIndex = Math.max(0, input.assistantMessageCount - 1);
  const promptKey = ONBOARDING_PROMPT_ORDER[promptIndex] ?? "burnoutConcerns";
  const template =
    promptKey === "interests"
      ? ONBOARDING_INTEREST_TEMPLATES_BY_TRACK[
          resolveQuickChoiceTrackVariant(input.trackId)
        ]
      : ONBOARDING_QUICK_CHOICE_TEMPLATES[promptKey];
  const knownValues = new Set<string>();

  function collectKnownValues(options: OnboardingQuickChoiceOption[]): void {
    for (const option of options) {
      knownValues.add(normalizeQuickChoiceValue(option.value));
      if (option.followUps && option.followUps.length > 0) {
        collectKnownValues(option.followUps);
      }
    }
  }

  collectKnownValues(template.options);

  const selectedValues = splitDraftChoiceValues(input.draftValue)
    .map(normalizeQuickChoiceValue)
    .filter((value) => knownValues.has(value));

  const options: Array<
    OnboardingQuickChoiceOption & {
      selected: boolean;
      disabled: boolean;
      group: "base" | "followup";
    }
  > = [];

  const addOption = (
    option: OnboardingQuickChoiceOption,
    group: "base" | "followup",
  ) => {
    const normalizedValue = normalizeQuickChoiceValue(option.value);
    if (
      options.some(
        (entry) => normalizeQuickChoiceValue(entry.value) === normalizedValue,
      )
    ) {
      return;
    }

    const selected = selectedValues.includes(normalizedValue);
    options.push({
      ...option,
      group,
      selected,
      disabled:
        !selected && selectedValues.length >= MAX_QUICK_CHOICE_SELECTIONS,
    });
  };

  const addFollowUpOptions = (option: OnboardingQuickChoiceOption) => {
    for (const followUp of option.followUps ?? []) {
      if (options.length >= MAX_VISIBLE_QUICK_CHOICES) return;
      addOption(followUp, "followup");
      if (selectedValues.includes(normalizeQuickChoiceValue(followUp.value))) {
        addFollowUpOptions(followUp);
      }
      if (options.length >= MAX_VISIBLE_QUICK_CHOICES) return;
    }
  };

  for (const option of template.options) {
    addOption(option, "base");
  }

  if (selectedValues.length < MAX_QUICK_CHOICE_SELECTIONS) {
    for (const option of template.options) {
      if (!selectedValues.includes(normalizeQuickChoiceValue(option.value)))
        continue;
      addFollowUpOptions(option);
      if (options.length >= MAX_VISIBLE_QUICK_CHOICES) break;
    }
  }

  return {
    visible: input.sessionStatus === "intake" && !input.intakeComplete,
    promptKey,
    promptLabel: template.promptLabel,
    helperText: template.helperText,
    draftValue: input.draftValue,
    selectedValues,
    maxSelections: MAX_QUICK_CHOICE_SELECTIONS,
    options,
  };
}

export const ACTION_RULES: Record<
  UiAction,
  (state: {
    home?: HomeStateContract;
    onboarding?: OnboardingStateContract;
    results?: ResultsStateContract;
    dashboard?: DashboardStateContract;
  }) => boolean
> = {
  "select-track": (state) => (state.home?.status ?? "idle") !== "starting",
  "start-assessment": (state) =>
    Boolean(state.home?.canStartAssessment) &&
    state.home?.status !== "starting",
  "send-message": (state) => {
    const s = state.onboarding;
    if (!s) return false;
    return (
      s.loadState === "ready" &&
      s.sendState !== "sending" &&
      s.analyzeState !== "running"
    );
  },
  "trigger-analysis": (state) => {
    const s = state.onboarding;
    if (!s) return false;
    return (
      s.loadState === "ready" &&
      s.analyzeState === "enabled" &&
      s.sessionStatus === "intake"
    );
  },
  "retry-analysis": (state) => {
    const s = state.results;
    if (!s) return false;
    return s.viewState === "error" || s.viewState === "analyzing";
  },
  "open-session": (state) =>
    state.dashboard?.loadState === "ready" &&
    (state.dashboard.sessions.length ?? 0) > 0,
  "create-new-session": (state) => state.dashboard?.creatingNew === false,
};

export function canPerformUiAction(
  action: UiAction,
  state: {
    home?: HomeStateContract;
    onboarding?: OnboardingStateContract;
    results?: ResultsStateContract;
    dashboard?: DashboardStateContract;
  },
): boolean {
  return ACTION_RULES[action](state);
}

export function getTrackThemeTokens(
  trackId: TrackId | null | undefined,
): TrackThemeTokens {
  if (!trackId) return TRACK_THEME_TOKENS.general;
  return TRACK_THEME_TOKENS[trackId] ?? TRACK_THEME_TOKENS.general;
}

export function deriveHomeStateContract(
  input: DeriveHomeStateInput,
): HomeStateContract {
  const status: HomeViewStatus = input.loading
    ? "starting"
    : input.errorMessage
      ? "error"
      : "idle";

  return {
    status,
    selectedTrackId: input.selectedTrackId,
    tracks: input.tracks,
    errorMessage: input.errorMessage ?? undefined,
    canStartAssessment: Boolean(input.selectedTrackId),
  };
}

export function deriveOnboardingStateContract(
  input: DeriveOnboardingStateInput,
): OnboardingStateContract {
  const sendState: SendState = input.sending
    ? "sending"
    : input.sendError
      ? "error"
      : "idle";

  let analyzeState: AnalyzeState = "hidden";
  if (input.analyzing) {
    analyzeState = "running";
  } else if (input.sessionStatus === "error") {
    analyzeState = "error";
  } else if (input.intakeComplete && input.sessionStatus === "intake") {
    analyzeState = "enabled";
  } else if (input.intakeComplete) {
    analyzeState = "disabled";
  }

  return {
    hasSessionParam: input.hasSessionParam,
    loadState: input.loadState,
    sendState,
    analyzeState,
    sessionStatus: input.sessionStatus,
    intakeComplete: input.intakeComplete,
    profileFieldCount: input.profileFieldCount,
    messageCount: input.messageCount,
    sendError: input.sendError ?? undefined,
    analyzeError: input.analyzeError ?? undefined,
  };
}

export function deriveResultsStateContract(
  input: DeriveResultsStateInput,
): ResultsStateContract {
  let viewState: ResultsViewState;
  if (!input.hasSessionParam) {
    viewState = "no-session";
  } else if (input.fetchError) {
    viewState = "error";
  } else if (!input.hasSession) {
    viewState = "loading-session";
  } else if (!input.hasRecommendations || input.sessionStatus === "analyzing") {
    viewState = "analyzing";
  } else if (input.recommendationCount === 0) {
    viewState = "empty";
  } else {
    viewState = "complete";
  }

  return {
    hasSessionParam: input.hasSessionParam,
    viewState,
    sessionStatus: input.sessionStatus,
    isFallback: input.isFallback,
    progressPct: input.progressPct,
    stageLabel: input.stageLabel,
    recommendationCount: input.recommendationCount,
    fetchError: input.fetchError ?? undefined,
  };
}

export function deriveDashboardStateContract(
  input: DeriveDashboardStateInput,
): DashboardStateContract {
  const loadState: LoadState = input.loading ? "loading" : "ready";

  return {
    loadState,
    sessions: input.sessions,
    creatingNew: input.creatingNew,
  };
}

export function getSessionStatusDisplay(
  status: SessionStatus,
): SessionStatusDisplayContract {
  return SESSION_STATUS_DISPLAY[status];
}

export function getSessionDestination(
  sessionId: string,
  status: SessionStatus,
): string {
  if (status === "complete" || status === "analyzing") {
    return `/results/${sessionId}`;
  }
  return `/onboarding?session=${sessionId}`;
}

export const UI_TEST_SCENARIOS = {
  home: [
    {
      id: "home-start-enabled",
      state: {
        status: "idle",
        selectedTrackId: "tech-career",
        tracks: [],
        canStartAssessment: true,
      } satisfies HomeStateContract,
      expected: { startAssessment: true, selectTrack: true },
    },
    {
      id: "home-start-loading",
      state: {
        status: "starting",
        selectedTrackId: "tech-career",
        tracks: [],
        canStartAssessment: true,
      } satisfies HomeStateContract,
      expected: { startAssessment: false, selectTrack: false },
    },
  ],
  onboarding: [
    {
      id: "onboarding-send-enabled",
      state: {
        hasSessionParam: true,
        loadState: "ready",
        sendState: "idle",
        analyzeState: "disabled",
        sessionStatus: "intake",
        intakeComplete: false,
        profileFieldCount: 6,
        messageCount: 7,
      } satisfies OnboardingStateContract,
      expected: { sendMessage: true, triggerAnalysis: false },
    },
    {
      id: "onboarding-analysis-enabled",
      state: {
        hasSessionParam: true,
        loadState: "ready",
        sendState: "idle",
        analyzeState: "enabled",
        sessionStatus: "intake",
        intakeComplete: true,
        profileFieldCount: 12,
        messageCount: 14,
      } satisfies OnboardingStateContract,
      expected: { sendMessage: true, triggerAnalysis: true },
    },
  ],
  results: [
    {
      id: "results-analyzing",
      state: {
        hasSessionParam: true,
        viewState: "analyzing",
        sessionStatus: "analyzing",
        isFallback: false,
        progressPct: 45,
        stageLabel: "Matching profile",
        recommendationCount: 0,
      } satisfies ResultsStateContract,
      expected: { retryAnalysis: true },
    },
    {
      id: "results-complete",
      state: {
        hasSessionParam: true,
        viewState: "complete",
        sessionStatus: "complete",
        isFallback: false,
        progressPct: 100,
        stageLabel: "Complete",
        recommendationCount: 2,
      } satisfies ResultsStateContract,
      expected: { retryAnalysis: false },
    },
  ],
  dashboard: [
    {
      id: "dashboard-ready-with-sessions",
      state: {
        loadState: "ready",
        sessions: [
          {
            id: "abc12345",
            status: "intake",
            trackId: "tech-career",
            messageCount: 5,
            updatedAtIso: "2026-04-04T00:00:00.000Z",
          },
        ],
        creatingNew: false,
      } satisfies DashboardStateContract,
      expected: { openSession: true, createNewSession: true },
    },
  ],
} as const;
