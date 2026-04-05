import type { CareerProfile, ChatMessage } from '../schemas/career.js';

/**
 * Deterministic fallback intake engine.
 *
 * Walks the user through each profile dimension in order. When the Python
 * agent service is unavailable, this guarantees the intake conversation
 * still works and produces a structured profile.
 *
 * Each step maps to a profile field and provides:
 *  - a question to ask
 *  - an extract() that pulls structured data from the raw user answer
 */

interface IntakeStep {
  field: keyof CareerProfile;
  question: string;
  extract: (answer: string) => Partial<CareerProfile>;
}

const STEPS: IntakeStep[] = [
  {
    field: 'interests',
    question:
      "Welcome! Let's build your career profile. To start — what subjects, industries, or activities genuinely interest you? List as many as you like.",
    extract: (a) => ({ interests: splitList(a) }),
  },
  {
    field: 'values',
    question:
      'What do you value most in a workplace? (e.g. autonomy, collaboration, stability, innovation, social impact)',
    extract: (a) => ({ values: splitList(a) }),
  },
  {
    field: 'workingStyle',
    question:
      'How would you describe your preferred working style? (e.g. independent deep-focus, collaborative team-based, structured routine, flexible/varied)',
    extract: (a) => ({ workingStyle: a.trim() }),
  },
  {
    field: 'hardSkills',
    question:
      'What technical or hard skills do you have? (e.g. programming, data analysis, writing, design, accounting)',
    extract: (a) => ({ hardSkills: splitList(a) }),
  },
  {
    field: 'softSkills',
    question:
      'What soft skills are you strongest in? (e.g. communication, leadership, problem-solving, empathy)',
    extract: (a) => ({ softSkills: splitList(a) }),
  },
  {
    field: 'riskTolerance',
    question:
      'How would you rate your career risk tolerance? (low — prefer stability, medium — open to moderate risk, high — comfortable with uncertainty)',
    extract: (a) => ({
      riskTolerance: matchEnum(a, ['low', 'medium', 'high'] as const) ?? undefined,
    }),
  },
  {
    field: 'financialNeeds',
    question:
      'Tell me about your financial situation. What is your minimum acceptable salary? Target salary? Do you have significant debt? (Feel free to answer conversationally.)',
    extract: (a) => ({
      financialNeeds: {
        minimumSalary: extractNumber(a, /min(?:imum)?\s*(?:salary)?[:\s]*\$?([\d,]+)/i),
        targetSalary: extractNumber(a, /target\s*(?:salary)?[:\s]*\$?([\d,]+)/i) ??
                       extractNumber(a, /\$?([\d,]+)\s*(?:k|K)?\s*(?:target|ideal|goal)/i),
        hasDebt: /\b(?:no debt|debt[- ]?free|no loans?)\b/i.test(a) ? false :
                 /\b(?:yes|debt|loans?|student loan|owe)\b/i.test(a) ? true : undefined,
      },
    }),
  },
  {
    field: 'geographicFlexibility',
    question:
      'What is your geographic flexibility? (local — stay where you are, remote — work from anywhere, relocate — willing to move, flexible — open to all)',
    extract: (a) => ({
      geographicFlexibility:
        matchEnum(a, ['local', 'remote', 'relocate', 'flexible'] as const) ?? undefined,
    }),
  },
  {
    field: 'educationLevel',
    question:
      "What is your highest level of education? (e.g. high school, associate's, bachelor's, master's, PhD, self-taught)",
    extract: (a) => ({ educationLevel: a.trim() }),
  },
  {
    field: 'timelineUrgency',
    question:
      'How urgently are you looking to make a career change? (immediate — ASAP, short — within 6 months, long — 1+ year horizon)',
    extract: (a) => ({
      timelineUrgency: matchEnum(a, ['immediate', 'short', 'long'] as const) ?? undefined,
    }),
  },
  {
    field: 'purposePriorities',
    question:
      'What gives your work a sense of purpose or meaning? (e.g. helping people, creative expression, building things, financial freedom, advancing knowledge)',
    extract: (a) => ({ purposePriorities: splitList(a) }),
  },
  {
    field: 'burnoutConcerns',
    question:
      "Last question — are there any work patterns or environments you've found draining or want to avoid?",
    extract: (a) => ({ burnoutConcerns: splitList(a) }),
  },
];

// ─── Public API ────────────────────────────────────────────────────

/** Number of intake questions (not counting the greeting). */
export const INTAKE_STEPS_COUNT = STEPS.length;

export interface IntakeResult {
  assistantContent: string;
  profileUpdate: Partial<CareerProfile>;
  intakeComplete: boolean;
}

/**
 * Given the full message history and current profile, determine what
 * the assistant should say next and extract any profile data from the
 * latest user message.
 */
export function processIntakeMessage(
  messages: ChatMessage[],
  currentProfile: CareerProfile,
  userContent: string,
): IntakeResult {
  // Count assistant messages to figure out which step we're on.
  // Step 0 = the greeting (first assistant message). Step N = the Nth question.
  const assistantCount = messages.filter((m) => m.role === 'assistant').length;

  // The user's answer corresponds to the question asked in the *previous*
  // assistant message. assistantCount-1 is the step index the user just answered.
  const answeredStepIndex = assistantCount - 1;

  let profileUpdate: Partial<CareerProfile> = {};

  // Extract profile data from the user's answer (if we're past the greeting)
  if (answeredStepIndex >= 0 && answeredStepIndex < STEPS.length) {
    profileUpdate = STEPS[answeredStepIndex].extract(userContent);
  }

  // Next question to ask
  const nextStepIndex = assistantCount; // 0-indexed into STEPS

  if (nextStepIndex >= STEPS.length) {
    // All questions answered — intake complete
    const filledFields = countFilledFields({ ...currentProfile, ...profileUpdate });
    return {
      assistantContent:
        `Thank you for completing your career profile! I captured details across ${filledFields} dimensions. ` +
        "Your profile is ready for analysis — when you're ready, hit 'Analyze' to get personalized career recommendations.",
      profileUpdate,
      intakeComplete: true,
    };
  }

  return {
    assistantContent: STEPS[nextStepIndex].question,
    profileUpdate,
    intakeComplete: false,
  };
}

/**
 * Generate the very first assistant message for a new session.
 * This is step 0 — the first question.
 */
export function getGreeting(): string {
  return STEPS[0].question;
}

// ─── Helpers ───────────────────────────────────────────────────────

function splitList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function matchEnum<T extends string>(
  raw: string,
  options: readonly T[],
): T | null {
  const lower = raw.toLowerCase();
  for (const opt of options) {
    if (lower.includes(opt)) return opt;
  }
  return null;
}

function extractNumber(raw: string, pattern: RegExp): number | undefined {
  const match = raw.match(pattern);
  if (!match?.[1]) return undefined;
  const n = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function countFilledFields(profile: CareerProfile): number {
  return Object.values(profile).filter((v) => v !== undefined && v !== null).length;
}
