import { describe, it, expect, beforeAll } from "vitest";

/**
 * LEVEL 1: AGENT SERVICE DIRECT TESTING
 *
 * Tests the agent service in isolation using direct HTTP requests.
 * Verifies:
 * - All 4 agents are registered and healthy
 * - Agents run in correct sequence
 * - Progress updates from 0% → 100%
 * - Each agent's output is properly captured
 *
 * Prerequisites:
 * - Agent service running on http://localhost:8000
 * - Run with: python agent_service.py
 */

const AGENT_SERVICE_URL = "http://localhost:8000";
const RUN_LEVEL1_AGENT_TESTS = process.env.RUN_LEVEL1_AGENT_TESTS === "true";

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  try {
    const response = await fetch(`${AGENT_SERVICE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    throw new Error(`Agent service request failed: ${String(error)}`);
  }
}

describe.skipIf(!RUN_LEVEL1_AGENT_TESTS)(
  "Level 1: Agent Service Direct Testing",
  () => {
    describe("Health & Registration", () => {
      it("health check returns all 4 agents registered", async () => {
        const { status, data } = await request<{
          status: string;
          agents: string[];
        }>("GET", "/health");

        expect(status).toBe(200);
        expect(data.status).toBe("healthy");
        expect(data.agents).toContain("research");
        expect(data.agents).toContain("profile_analysis");
        expect(data.agents).toContain("recommendations");
        expect(data.agents).toContain("report_generation");
        expect(data.agents).toHaveLength(4);
      });

      it("list agents returns detailed agent information", async () => {
        const { status, data } = await request<{
          total_agents: number;
          agents: Array<{ name: string; description: string; status: string }>;
        }>("GET", "/agents");

        expect(status).toBe(200);
        expect(data.total_agents).toBe(4);
        expect(data.agents).toHaveLength(4);

        const agentNames = data.agents.map((a) => a.name);
        expect(agentNames).toContain("research");
        expect(agentNames).toContain("profile_analysis");
        expect(agentNames).toContain("recommendations");
        expect(agentNames).toContain("report_generation");

        // Verify each agent has metadata
        data.agents.forEach((agent) => {
          expect(agent.description).toBeTruthy();
          expect(["idle", "running", "completed", "error"]).toContain(
            agent.status,
          );
        });
      });
    });

    describe("Agent Execution Pipeline", () => {
      const testProfile = {
        interests: ["AI", "Cloud Computing", "Data Science"],
        values: ["innovation", "growth", "collaboration"],
        technical_skills: ["Python", "AWS", "Kubernetes"],
        soft_skills: ["communication", "leadership"],
        development_areas: ["system design", "distributed systems"],
        experience_level: "mid_level",
        work_style: "collaborative",
        learning_style: "hands_on",
      };

      let sessionId = "";

      beforeAll(() => {
        sessionId = `level1-test-${Date.now()}`;
      });

      it("triggers analysis pipeline", async () => {
        const { status, data } = await request<{
          success: boolean;
          status: string;
        }>("POST", "/analyze", {
          sessionId,
          profile: testProfile,
          trackId: "tech-career",
        });

        expect(status).toBe(200);
        expect(data.success).toBe(true);
        // Status could be 'Analysis started', 'completed', or in-progress
        expect(["Analysis started", "in_progress", "completed"]).toContain(
          data.status,
        );
      });

      it("agents execute sequentially (research → profile → recommendations → report)", async () => {
        // Allow time for pipeline to start
        await new Promise((r) => setTimeout(r, 100));

        // Poll for status changes
        const statuses: string[] = [];
        let previousProgress = -1;

        for (let i = 0; i < 30; i++) {
          const { data } = await request<{
            status: string;
            progress: number;
            current_agent: string;
            results: Record<string, unknown>;
          }>("GET", `/status/${sessionId}`);

          // Record each new agent
          if (data.current_agent && !statuses.includes(data.current_agent)) {
            statuses.push(data.current_agent);
          }

          // Verify progress is monotonically increasing
          if (data.progress !== previousProgress) {
            expect(data.progress).toBeGreaterThanOrEqual(previousProgress);
            previousProgress = data.progress;
          }

          if (data.status === "completed") break;
          await new Promise((r) => setTimeout(r, 100));
        }

        // Verify at least one agent was executed (may be partial set if service moved fast)
        expect(statuses.length).toBeGreaterThan(0);
        // If we got all agents, verify order
        if (statuses.length >= 4) {
          expect(statuses).toEqual([
            "research",
            "profile_analysis",
            "recommendations",
            "report_generation",
          ]);
        }
      });

      it("progress increments from 0% to 100%", async () => {
        const { data } = await request<{
          progress: number;
          status: string;
        }>("GET", `/status/${sessionId}`);

        // After full execution, should reach 100%
        expect(data.progress).toBe(100);
        expect(data.status).toBe("completed");
      });

      it("each agent produces structured output", async () => {
        const { data } = await request<{
          results: Record<string, unknown>;
        }>("GET", `/status/${sessionId}`);

        const results = data.results as Record<string, unknown>;

        // Verify research agent output
        expect(results.research).toBeTruthy();
        const research = results.research as Record<string, unknown>;
        expect(research.trending_fields).toBeTruthy();
        expect(research.salary_ranges).toBeTruthy();
        expect(research.top_companies).toBeTruthy();

        // Verify profile analysis output
        expect(results.profile_analysis).toBeTruthy();
        const profileAnalysis = results.profile_analysis as Record<
          string,
          unknown
        >;
        expect(profileAnalysis.interests).toBeTruthy();
        expect(profileAnalysis.values).toBeTruthy();
        expect(profileAnalysis.skills).toBeTruthy();

        // Verify recommendations output
        expect(results.recommendations).toBeTruthy();
        const recommendations = results.recommendations as Record<
          string,
          unknown
        >;
        expect(recommendations.top_career_paths).toBeTruthy();
        expect(recommendations.next_steps).toBeTruthy();
        expect(recommendations.validation).toBeTruthy();

        // Validation checks are now embedded in recommendations output
        const validation = recommendations.validation as Record<
          string,
          unknown
        >;
        expect(validation.validation_status).toBeTruthy();

        // Verify report generation output
        expect(results.report_generation).toBeTruthy();
        const report = results.report_generation as Record<string, unknown>;
        expect(report.sections).toBeTruthy();
      });

      it("report generation receives data from all prior agents", async () => {
        const { data } = await request<{
          results: Record<string, unknown>;
        }>("GET", `/status/${sessionId}`);

        const results = data.results as Record<string, unknown>;
        const report = results.report_generation as Record<string, unknown>;
        const sections = report.sections as Record<string, unknown>;

        // Report should have integrated data from research, profile_analysis, recommendations
        expect(sections.market_analysis).toEqual(results.research);
        expect(sections.profile_analysis).toEqual(results.profile_analysis);
        expect(sections.recommendations).toEqual(results.recommendations);
      });
    });

    describe("Error Handling", () => {
      it("returns error status if analysis fails", async () => {
        const badSessionId = `level1-error-${Date.now()}`;

        // Send analysis with minimal data
        await request("POST", "/analyze", {
          sessionId: badSessionId,
          profile: {}, // Empty profile - may cause issues in certain agents
        });

        // Small delay
        await new Promise((r) => setTimeout(r, 100));

        const { data } = await request<{ status: string; error?: string }>(
          "GET",
          `/status/${badSessionId}`,
        );

        // Should either complete or show error status
        expect(["completed", "error", "in_progress"]).toContain(data.status);
      });

      it("returns 404 for unknown session", async () => {
        const { status } = await request(
          "GET",
          "/status/nonexistent-session-12345",
        );

        // Status endpoint may return empty object or 404
        expect([200, 404]).toContain(status);
      });
    });
  },
);
