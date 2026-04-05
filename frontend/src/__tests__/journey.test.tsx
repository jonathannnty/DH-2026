import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw-server";
import {
  SESSION_INTAKE,
  SESSION_INTAKE_COMPLETE,
  SESSION_COMPLETE,
  RECOMMENDATIONS,
} from "../test/fixtures";
import Home from "../routes/Home";
import Onboarding from "../routes/Onboarding";
import Results from "../routes/Results";

// ── Test helpers ────────────────────────────────────────────────────

/** Renders a component at a URL. Supports :sessionId params in /results/* and /onboarding. */
function renderAt(path: string, element: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {/* Named-param routes so useParams works correctly */}
        <Route path="/onboarding" element={element} />
        <Route path="/results/:sessionId" element={element} />
        <Route path="/results" element={element} />
        <Route path="*" element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Home ────────────────────────────────────────────────────────────

describe("Home", () => {
  it("renders heading and track selector after tracks load", async () => {
    renderAt("/", <Home />);

    expect(screen.getByText("Find Your Career Path")).toBeInTheDocument();

    // Tracks load async
    await waitFor(() => {
      expect(screen.getByText("Tech Career Accelerator")).toBeInTheDocument();
    });
    expect(screen.getByText("General Career Advising")).toBeInTheDocument();
  });

  it('shows "Creating session…" while waiting for API', async () => {
    const user = userEvent.setup();

    // Add a delay to the sessions endpoint so we can observe loading state
    server.use(
      http.post("http://localhost:3001/sessions", async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json(SESSION_INTAKE, { status: 201 });
      }),
    );

    renderAt("/", <Home />);

    const btn = screen.getByRole("button", { name: "Start Assessment" });
    await user.click(btn);

    expect(await screen.findByText("Creating session…")).toBeInTheDocument();
  });

  it("shows error message when session creation fails", async () => {
    server.use(
      http.post(
        "http://localhost:3001/sessions",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const user = userEvent.setup();
    renderAt("/", <Home />);

    const btn = screen.getByRole("button", { name: "Start Assessment" });
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Could not start a session/)).toBeInTheDocument();
    });
  });
});

// ── Onboarding ─────────────────────────────────────────────────────

describe("Onboarding", () => {
  it("renders no-session message when session param is absent", () => {
    renderAt("/onboarding", <Onboarding />);
    expect(screen.getByText(/No session found/)).toBeInTheDocument();
    expect(screen.getByText(/Start a new assessment/)).toBeInTheDocument();
  });

  it("loads session and shows greeting message", async () => {
    renderAt(`/onboarding?session=${SESSION_INTAKE.id}`, <Onboarding />);

    await waitFor(() => {
      expect(
        screen.getByText(/Let's discover your ideal career path/),
      ).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/Type your answer/)).toBeInTheDocument();
  });

  it("shows track badge when session has a trackId", async () => {
    renderAt(`/onboarding?session=${SESSION_INTAKE.id}`, <Onboarding />);

    await waitFor(() => {
      expect(screen.getByText("Tech Career Accelerator")).toBeInTheDocument();
    });
  });

  it("shows error state when session fetch fails", async () => {
    server.use(
      http.get(
        "http://localhost:3001/sessions/:id",
        () => new HttpResponse(null, { status: 404 }),
      ),
    );

    renderAt("/onboarding?session=does-not-exist", <Onboarding />);

    await waitFor(() => {
      expect(
        screen.getByText(/Session not found or unavailable/),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: /Start a new assessment/ }),
    ).toBeInTheDocument();
  });

  it("sends message and shows reply", async () => {
    const user = userEvent.setup();
    renderAt(`/onboarding?session=${SESSION_INTAKE.id}`, <Onboarding />);

    // Wait for session to load
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Type your answer/),
      ).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Type your answer/);
    await user.type(input, "I love building software");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText(/What are your core values/)).toBeInTheDocument();
    });
  });

  it("blocks very short answers and shows inline guidance", async () => {
    const user = userEvent.setup();
    renderAt(`/onboarding?session=${SESSION_INTAKE.id}`, <Onboarding />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Type your answer/),
      ).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Type your answer/);
    await user.type(input, "ok");

    expect(
      screen.getByText(/Please add a little more detail/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("adds quick-pick chips to the draft and reveals follow-up chips", async () => {
    const user = userEvent.setup();
    renderAt(`/onboarding?session=${SESSION_INTAKE.id}`, <Onboarding />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Type your answer/),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: "Software development" }),
    );

    const input = screen.getByPlaceholderText(
      /Type your answer/,
    ) as HTMLInputElement;
    expect(input.value).toContain("software development");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Frontend engineering" }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: "Frontend engineering" }),
    );
    expect(input.value).toContain("software development");
    expect(input.value).toContain("frontend engineering");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Design systems" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Data science" }));
    await user.click(
      screen.getByRole("button", { name: "Cloud infrastructure" }),
    );
    await user.click(screen.getByRole("button", { name: "Cybersecurity" }));
    await user.click(
      screen.getByRole("button", { name: "Product engineering" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Software development" }),
      ).not.toBeInTheDocument();
    });

    await user.type(input, " and product strategy");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Software development" }),
      ).toBeInTheDocument();
    });
  });

  it("shows send error and restores input when message send fails", async () => {
    server.use(
      http.post(
        "http://localhost:3001/sessions/:id/messages",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const user = userEvent.setup();
    renderAt(`/onboarding?session=${SESSION_INTAKE.id}`, <Onboarding />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Type your answer/),
      ).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Type your answer/);
    await user.type(input, "test answer");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText(/Failed to send/)).toBeInTheDocument();
    });

    // Input should be restored with the original text
    expect((input as HTMLInputElement).value).toBe("test answer");
  });

  it("shows an error state instead of Analyze when the session is errored", async () => {
    server.use(
      http.get("http://localhost:3001/sessions/:id", () =>
        HttpResponse.json(
          {
            ...SESSION_INTAKE,
            status: "error",
            messages: [
              ...SESSION_INTAKE.messages,
              {
                id: "msg-final",
                role: "assistant",
                content:
                  "Thank you for completing your career profile! Your profile is ready for analysis — when you're ready, hit 'Analyze' to get personalized career recommendations.",
                timestamp: "2026-04-04T00:00:05.000Z",
              },
            ],
          },
          { status: 200 },
        ),
      ),
    );

    renderAt(`/onboarding?session=${SESSION_INTAKE.id}`, <Onboarding />);

    await waitFor(() => {
      expect(screen.getByText(/cannot be analyzed/)).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /Analyze My Career Profile/ }),
    ).not.toBeInTheDocument();
  });
});

// ── Regression: chip tray hides when intakeComplete (Idea 3/7) ──────

describe("Regression: chip tray hides on intakeComplete", () => {
  it("hides QuickChoiceTray when session loads with intakeComplete=true", async () => {
    server.use(
      http.get("http://localhost:3001/sessions/:id", () =>
        HttpResponse.json(SESSION_INTAKE_COMPLETE),
      ),
    );

    renderAt(`/onboarding?session=${SESSION_INTAKE.id}`, <Onboarding />);

    await waitFor(() => {
      // The Analyze button should appear (intake is done)
      expect(
        screen.getByRole("button", { name: /Analyze My Career Profile/ }),
      ).toBeInTheDocument();
    });

    // No chip buttons should be visible — tray must be hidden
    expect(
      screen.queryByRole("button", { name: "Software development" }),
    ).not.toBeInTheDocument();
  });

  it("hides chip tray after server returns intakeComplete=true on final message", async () => {
    server.use(
      http.post("http://localhost:3001/sessions/:id/messages", () =>
        HttpResponse.json({
          message: {
            id: "msg-final",
            role: "assistant",
            content: "Your profile is complete — hit Analyze when ready.",
            timestamp: new Date().toISOString(),
          },
          profileUpdate: { burnoutConcerns: ["long hours"] },
          intakeComplete: true,
        }),
      ),
    );

    const user = userEvent.setup();
    renderAt(`/onboarding?session=${SESSION_INTAKE.id}`, <Onboarding />);

    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/Type your answer/),
      ).toBeInTheDocument(),
    );

    await user.type(
      screen.getByPlaceholderText(/Type your answer/),
      "Long hours",
    );
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Analyze My Career Profile/ }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: "Software development" }),
    ).not.toBeInTheDocument();
  });
});

// ── Regression: Results exits loading when session already complete (Idea 2/7) ─

describe("Regression: Results exits loading for already-complete session", () => {
  it("shows recommendations without waiting for SSE when session is complete on load", async () => {
    // Exact reproduction of the former infinite-loading bug:
    // session loads as 'complete', no SSE stream needed, recs must render.
    renderAt(`/results/${SESSION_COMPLETE.id}`, <Results />);

    await waitFor(
      () => {
        expect(screen.getByText("AI/ML Engineer — EdTech")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Must NOT be stuck on loading state
    expect(screen.queryByText(/Starting analysis/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Analyzing your career/)).not.toBeInTheDocument();
  });
});

// ── Results ─────────────────────────────────────────────────────────

describe("Results", () => {
  it('shows "No session specified" without a session param', () => {
    renderAt("/results", <Results />);
    expect(screen.getByText(/No session specified/)).toBeInTheDocument();
  });

  it("shows recommendations for a complete session", async () => {
    renderAt(`/results/${SESSION_COMPLETE.id}`, <Results />);

    await waitFor(
      () => {
        expect(screen.getByText("AI/ML Engineer — EdTech")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(screen.getByText("Developer Advocate")).toBeInTheDocument();
    expect(screen.getByText(/92% fit/)).toBeInTheDocument();
    expect(screen.getByText("Best match")).toBeInTheDocument();
  });

  it("shows track banner for a non-general track", async () => {
    renderAt(`/results/${SESSION_COMPLETE.id}`, <Results />);

    // Track banner appears once recs and track both resolve
    await waitFor(
      () => {
        expect(screen.getByText(/Tech Career Accelerator/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("shows rec count in the heading", async () => {
    renderAt(`/results/${SESSION_COMPLETE.id}`, <Results />);

    await waitFor(
      () => {
        expect(
          screen.getByText(/Your Top 2 Career Matches/),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("shows error state when session fetch fails", async () => {
    server.use(
      http.get(
        "http://localhost:3001/sessions/:id",
        () => new HttpResponse(null, { status: 404 }),
      ),
    );

    renderAt("/results/nonexistent", <Results />);

    await waitFor(
      () => {
        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(
      screen.getByRole("button", { name: /Try again/ }),
    ).toBeInTheDocument();
  });

  it("shows empty state when recommendations array is empty", async () => {
    server.use(
      http.get("http://localhost:3001/sessions/:id/recommendations", () =>
        HttpResponse.json([]),
      ),
    );

    renderAt(`/results/${SESSION_COMPLETE.id}`, <Results />);

    await waitFor(
      () => {
        expect(screen.getByText(/No recommendations yet/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("retries recommendations fetch when API returns 202 pending", async () => {
    let recommendationCalls = 0;
    server.use(
      http.get("http://localhost:3001/sessions/:id/recommendations", () => {
        recommendationCalls += 1;
        if (recommendationCalls === 1) {
          return HttpResponse.json(
            {
              status: "pending",
              retryAfterMs: 10,
              message: "Recommendations are still being generated.",
            },
            { status: 202 },
          );
        }
        return HttpResponse.json(RECOMMENDATIONS);
      }),
    );

    renderAt(`/results/${SESSION_COMPLETE.id}`, <Results />);

    await waitFor(() => {
      expect(screen.getByText("AI/ML Engineer — EdTech")).toBeInTheDocument();
    });

    expect(recommendationCalls).toBeGreaterThan(1);
  });

  it('shows "Start new assessment" and "View all sessions" CTAs after results load', async () => {
    renderAt(`/results/${SESSION_COMPLETE.id}`, <Results />);

    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: "Start new assessment" }),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(
      screen.getByRole("link", { name: "View all sessions" }),
    ).toBeInTheDocument();
  });

  it("copies recommendation summary to clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });

    renderAt(`/results/${SESSION_COMPLETE.id}`, <Results />);

    await waitFor(() => {
      expect(screen.getByText("AI/ML Engineer — EdTech")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Copy Summary" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalled();
      expect(screen.getByText(/Summary copied/i)).toBeInTheDocument();
    });
  });

  it("shows observability panel when ops=1 query param is present", async () => {
    renderAt(`/results/${SESSION_COMPLETE.id}?ops=1`, <Results />);

    await waitFor(() => {
      expect(screen.getByText("Demo observability")).toBeInTheDocument();
    });
  });
});
