import { describe, expect, it } from "vitest";
import {
  SESSION_STATUS_DISPLAY,
  UI_TEST_SCENARIOS,
  canPerformUiAction,
  deriveDashboardStateContract,
  deriveHomeStateContract,
  deriveOnboardingStateContract,
  deriveOnboardingQuickChoiceState,
  deriveResultsStateContract,
  getSessionDestination,
  getSessionStatusDisplay,
  getTrackThemeTokens,
  toggleDraftChoiceValue,
} from "@/types/uiStateContract";

describe("uiStateContract", () => {
  it("resolves known track themes and falls back to general", () => {
    const tech = getTrackThemeTokens("tech-career");
    expect(tech.trackId).toBe("tech-career");
    expect(tech.accent).toBe("#06B6D4");

    const unknown = getTrackThemeTokens("unknown-track-id");
    expect(unknown.trackId).toBe("general");
    expect(unknown.accent).toBe("#64748B");
  });

  it("evaluates Home action rules", () => {
    for (const scenario of UI_TEST_SCENARIOS.home) {
      const startAssessment = canPerformUiAction("start-assessment", {
        home: scenario.state,
      });
      const selectTrack = canPerformUiAction("select-track", {
        home: scenario.state,
      });

      expect(startAssessment, `${scenario.id} start`).toBe(
        scenario.expected.startAssessment,
      );
      expect(selectTrack, `${scenario.id} select`).toBe(
        scenario.expected.selectTrack,
      );
    }
  });

  it("evaluates Onboarding action rules", () => {
    for (const scenario of UI_TEST_SCENARIOS.onboarding) {
      const sendMessage = canPerformUiAction("send-message", {
        onboarding: scenario.state,
      });
      const triggerAnalysis = canPerformUiAction("trigger-analysis", {
        onboarding: scenario.state,
      });

      expect(sendMessage, `${scenario.id} send`).toBe(
        scenario.expected.sendMessage,
      );
      expect(triggerAnalysis, `${scenario.id} analyze`).toBe(
        scenario.expected.triggerAnalysis,
      );
    }
  });

  it("evaluates Results action rules", () => {
    for (const scenario of UI_TEST_SCENARIOS.results) {
      const retryAnalysis = canPerformUiAction("retry-analysis", {
        results: scenario.state,
      });

      expect(retryAnalysis, `${scenario.id} retry`).toBe(
        scenario.expected.retryAnalysis,
      );
    }
  });

  it("evaluates Dashboard action rules", () => {
    for (const scenario of UI_TEST_SCENARIOS.dashboard) {
      const openSession = canPerformUiAction("open-session", {
        dashboard: scenario.state,
      });
      const createNewSession = canPerformUiAction("create-new-session", {
        dashboard: scenario.state,
      });

      expect(openSession, `${scenario.id} open`).toBe(
        scenario.expected.openSession,
      );
      expect(createNewSession, `${scenario.id} create`).toBe(
        scenario.expected.createNewSession,
      );
    }
  });

  it("derives Home state status from loading and error", () => {
    const loading = deriveHomeStateContract({
      loading: true,
      errorMessage: null,
      selectedTrackId: "tech-career",
      tracks: [],
    });
    const errored = deriveHomeStateContract({
      loading: false,
      errorMessage: "boom",
      selectedTrackId: "tech-career",
      tracks: [],
    });

    expect(loading.status).toBe("starting");
    expect(errored.status).toBe("error");
  });

  it("derives Onboarding analyze/send states consistently", () => {
    const sending = deriveOnboardingStateContract({
      hasSessionParam: true,
      loadState: "ready",
      sending: true,
      sendError: null,
      analyzing: false,
      analyzeError: null,
      sessionStatus: "intake",
      intakeComplete: false,
      profileFieldCount: 4,
      messageCount: 5,
    });
    const readyToAnalyze = deriveOnboardingStateContract({
      hasSessionParam: true,
      loadState: "ready",
      sending: false,
      sendError: null,
      analyzing: false,
      analyzeError: null,
      sessionStatus: "intake",
      intakeComplete: true,
      profileFieldCount: 12,
      messageCount: 12,
    });

    expect(sending.sendState).toBe("sending");
    expect(readyToAnalyze.analyzeState).toBe("enabled");
  });

  it("derives Results view states from data availability", () => {
    const noSession = deriveResultsStateContract({
      hasSessionParam: false,
      hasSession: false,
      sessionStatus: null,
      hasRecommendations: false,
      recommendationCount: 0,
      fetchError: null,
      isFallback: false,
      progressPct: 0,
      stageLabel: "",
    });
    const complete = deriveResultsStateContract({
      hasSessionParam: true,
      hasSession: true,
      sessionStatus: "complete",
      hasRecommendations: true,
      recommendationCount: 2,
      fetchError: null,
      isFallback: false,
      progressPct: 100,
      stageLabel: "Complete",
    });

    expect(noSession.viewState).toBe("no-session");
    expect(complete.viewState).toBe("complete");
  });

  it("derives Dashboard load state from loading flag", () => {
    const loading = deriveDashboardStateContract({
      loading: true,
      sessions: [],
      creatingNew: false,
    });
    const ready = deriveDashboardStateContract({
      loading: false,
      sessions: [],
      creatingNew: false,
    });

    expect(loading.loadState).toBe("loading");
    expect(ready.loadState).toBe("ready");
  });

  it("provides centralized display mappings for all session statuses", () => {
    expect(getSessionStatusDisplay("intake")).toEqual(
      SESSION_STATUS_DISPLAY.intake,
    );
    expect(getSessionStatusDisplay("analyzing")).toEqual(
      SESSION_STATUS_DISPLAY.analyzing,
    );
    expect(getSessionStatusDisplay("complete")).toEqual(
      SESSION_STATUS_DISPLAY.complete,
    );
    expect(getSessionStatusDisplay("error")).toEqual(
      SESSION_STATUS_DISPLAY.error,
    );
  });

  it("provides centralized destination mapping per session status", () => {
    expect(getSessionDestination("abc123", "complete")).toBe("/results/abc123");
    expect(getSessionDestination("abc123", "analyzing")).toBe(
      "/results/abc123",
    );
    expect(getSessionDestination("abc123", "intake")).toBe(
      "/onboarding?session=abc123",
    );
    expect(getSessionDestination("abc123", "error")).toBe(
      "/onboarding?session=abc123",
    );
  });

  it("derives onboarding quick choices and follow-up chips", () => {
    const initial = deriveOnboardingQuickChoiceState({
      assistantMessageCount: 1,
      sessionStatus: "intake",
      intakeComplete: false,
      draftValue: "",
      trackId: "tech-career",
    });

    expect(initial.visible).toBe(true);
    expect(initial.promptLabel).toBe("Interests");
    expect(
      initial.options.some((option) => option.label === "Software development"),
    ).toBe(true);
    expect(initial.maxSelections).toBe(6);

    const withSelection = deriveOnboardingQuickChoiceState({
      assistantMessageCount: 1,
      sessionStatus: "intake",
      intakeComplete: false,
      draftValue: "software development",
      trackId: "tech-career",
    });

    expect(
      withSelection.options.some(
        (option) => option.label === "Frontend engineering",
      ),
    ).toBe(true);
    expect(
      withSelection.options.some(
        (option) => option.label === "Backend systems",
      ),
    ).toBe(true);
    expect(withSelection.draftValue).toBe("software development");
  });

  it("uses track-specific interests chips for the same prompt", () => {
    const tech = deriveOnboardingQuickChoiceState({
      assistantMessageCount: 1,
      sessionStatus: "intake",
      intakeComplete: false,
      draftValue: "",
      trackId: "tech-career",
    });

    const healthcare = deriveOnboardingQuickChoiceState({
      assistantMessageCount: 1,
      sessionStatus: "intake",
      intakeComplete: false,
      draftValue: "",
      trackId: "healthcare-pivot",
    });

    const creative = deriveOnboardingQuickChoiceState({
      assistantMessageCount: 1,
      sessionStatus: "intake",
      intakeComplete: false,
      draftValue: "",
      trackId: "creative-industry",
    });

    expect(
      tech.options.some((option) => option.label === "Cybersecurity"),
    ).toBe(true);
    expect(
      healthcare.options.some((option) => option.label === "Cybersecurity"),
    ).toBe(false);

    expect(
      healthcare.options.some((option) => option.label === "Patient care"),
    ).toBe(true);
    expect(
      creative.options.some((option) => option.label === "Patient care"),
    ).toBe(false);

    expect(
      creative.options.some((option) => option.label === "Brand design"),
    ).toBe(true);
    expect(tech.options.some((option) => option.label === "Brand design")).toBe(
      false,
    );
  });

  it("toggles quick choice values inside the draft text", () => {
    expect(toggleDraftChoiceValue("", "software development")).toBe(
      "software development",
    );
    expect(
      toggleDraftChoiceValue("software development", "software development"),
    ).toBe("");
    expect(
      toggleDraftChoiceValue(
        "software development, data and analytics",
        "data and analytics",
      ),
    ).toBe("software development");
  });
});
