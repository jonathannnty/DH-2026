/**
 * Canonical copy matrix for PathFinder AI.
 *
 * Single source of truth for all user-visible strings related to analysis
 * mode, status labels, errors, and empty states. Every screen that surfaces
 * these messages must import from here — no inline literal strings.
 *
 * Edit this file to change copy across all screens simultaneously.
 */

export const UI_COPY = {
  /** Labels shown during analysis loading spinner */
  analyzing: {
    stageDefault: "Analyzing your career profile…",
    stageFallback: "Switching to personalised recommendations…",
    subheadDefault: "Analyzing your career profile across multiple dimensions",
    subheadTrack: (trackName: string) =>
      `Finding your best matches in the ${trackName} track`,
  },

  /** Fallback / personalized-mode banner copy */
  fallback: {
    modeBadge: "Personalised Fallback Mode",
    modeDescription:
      "Live analysis timed out. These recommendations are derived from your profile using our offline engine.",
  },

  /** SSE stream connection copy */
  stream: {
    reconnecting: "Lost connection — reconnecting…",
    reconnectFailed:
      "Lost connection to analysis stream. Please reload the page.",
  },

  /** Error state copy */
  error: {
    sessionNotFound: "Session not found or unavailable.",
    analysisError:
      "Analysis encountered an error. You can retry from the dashboard.",
    sessionError:
      "This session encountered an error during analysis. You can start a new assessment or return to the dashboard.",
    compareLoad:
      "Could not load one or both sessions for comparison. Please try again.",
  },

  /** Empty recommendations copy */
  empty: {
    noRecommendations: "No recommendations yet",
    noRecommendationsDetail:
      "The analysis completed but didn't produce recommendations. This can happen when the profile is very sparse — try starting a new session with more detailed answers.",
  },

  /** Dashboard copy */
  dashboard: {
    compareModeHint: "Now select a second session to compare",
    compareCancel: "Cancel comparison",
    compareButton: "Compare",
    compareWith: "Compare with this",
    needsTwo: "Select two completed sessions to compare",
  },

  /** Comparison view copy */
  compare: {
    heading: "Session Comparison",
    subhead:
      "Side-by-side view of two career assessments. Use this to evaluate how different tracks or profiles affect your top matches.",
    sessionLabel: (short: string) => `Session ${short}`,
    noRecs: "No recommendations available for this session.",
    topMatchLabel: "Best match",
    fitScoreLabel: (score: number) => `${score}% fit`,
    reasonsHeading: "Why it fits",
    concernsHeading: "Watch out for",
    nextStepsHeading: "Next steps",
    salaryLabel: "Salary",
    backToDashboard: "← Back to sessions",
  },
} as const;

/** Home route copy */
export const HOME_COPY = {
  hero: {
    kicker: "Career Intelligence Studio",
    heading: "Find Your Career Path",
    subhead:
      "A guided assessment that transforms your profile into ranked career recommendations with clear reasoning and immediate next steps.",
    rotatorPrefix: "Built for",
    rotatorWords: ["Builders", "Analysts", "Creators", "Career Switchers"],
  },

  heroSignals: [
    {
      label: "12-dimension profile",
      detail:
        "We map your motivations, strengths, constraints, and work style into a complete decision profile.",
    },
    {
      label: "AI-ranked outcomes",
      detail:
        "Recommendations are scored across multiple dimensions, then explained with transparent reasoning and confidence.",
    },
    {
      label: "Track-aware guidance",
      detail:
        "Each path includes concrete actions, skill gaps to close, and realistic routes into the field.",
    },
  ],

  track: {
    chooserHeading: "Choose a track",
    previewHeading: "Track preview",
    previewTitleSuffix: "Preview",
    previewStatePreviewing: "Previewing",
    previewStateSelected: "Selected",
    byId: {
      general: {
        cardDescription:
          "A broad, flexible path if you are still exploring and want high-signal direction before committing to a specific lane.",
        previewDescription:
          "Great when you want to compare options side by side, clarify priorities, and identify the strongest near-term opportunities.",
      },
      "tech-career": {
        cardDescription:
          "Built for software, data, product, and AI-adjacent roles, with an emphasis on practical entry paths and growth potential.",
        previewDescription:
          "You will see role matches tied to required skills, market demand, and step-by-step actions to become interview ready.",
      },
      "healthcare-pivot": {
        cardDescription:
          "For people transitioning into healthcare or health operations, balancing patient impact, credentials, and long-term stability.",
        previewDescription:
          "Expect role guidance around licensure pathways, transferability of current experience, and time-to-entry tradeoffs.",
      },
      "creative-industry": {
        cardDescription:
          "For design, media, content, and brand-focused careers where portfolio quality and specialization drive opportunities.",
        previewDescription:
          "You will get recommendations that connect creative strengths to marketable roles, plus portfolio and positioning next steps.",
      },
    },
  },

  features: {
    cards: {
      dimensionProfile: {
        title: "12-Dimension Profile",
        summary:
          "Our intake combines preferences, capabilities, constraints, and goals into one structured profile so your recommendations reflect how you actually make decisions.",
        explanation:
          "The homepage introduces the assessment as a 12-dimension profile because the app does not rely on a single quiz score. It gathers signals about interests, values, hard and soft skills, risk tolerance, financial needs, location, education, timeline, purpose, burnout risk, and work style. Those inputs are normalized into a shared state contract that the backend can score consistently, which is why the profile can power both the animated overview and the final recommendation engine.",
        motifLabel: "Signal map",
      },
      aiScoredMatches: {
        title: "AI-Scored Matches",
        summary:
          "We score matches across dimensions, then explain why each role fits, where the risks are, expected compensation bands, and the fastest path to momentum.",
        explanation:
          "Each recommendation card is built from multiple scoring layers: profile fit, market demand, track enrichment, and practical next steps. The app aggregates those signals into a ranked list, then adds the reasoning behind the score so the result feels auditable instead of opaque. That is also why the UI can surface fit percentages, salary ranges, and concerns together: the backend computes them as one bundle instead of as disconnected fragments.",
        motifLabel: "Ranked fit",
      },
      trackInsights: {
        title: "Track-Aware Guidance",
        summary:
          "Track context sharpens your results with domain-specific skill signals, practical role pathways, and concrete actions tailored to that career lane.",
        explanation:
          "The app keeps track selection in view from onboarding through results, then applies track-specific adapters before recommendations are shown. That lets the system adjust wording, highlight relevant roles, and attach guidance that matches the realities of a specific lane such as tech, healthcare, or creative work. In practice, the homepage card is a preview of that same logic: the selected track changes the preview motif, the guidance emphasis, and the steps the user sees next.",
        motifLabel: "Route guide",
      },
    },
  },
} as const;

export type UiCopy = typeof UI_COPY;
