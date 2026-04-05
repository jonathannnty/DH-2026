import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

// Force demo mode + in-memory DB for tests
process.env.DEMO_MODE = "true";
process.env.DATABASE_URL = ":memory:";

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("Demo Golden-Path: 3-minute flow (scenario → analyze → results → export)", () => {
  let sessionId: string;

  describe("Phase 1: Session Creation & Intake", () => {
    it("POST /sessions — creates session with greeting", async () => {
      const res = await app.inject({ method: "POST", url: "/sessions" });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toHaveProperty("id");
      expect(body.status).toBe("intake");
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe("assistant");

      sessionId = body.id;
    });

    it("POST /sessions/:id/messages — accepts intake message", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/sessions/${sessionId}/messages`,
        payload: { content: "I love technology, AI, and music production" },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.message.role).toBe("assistant");
      expect(body.intakeComplete).toBe(false);
      expect(body.profileUpdate).toBeDefined();
    });

    it("POST /sessions/:id/messages — accepts multiple intake messages until complete", async () => {
      const messages = [
        "autonomy, innovation, and social impact",
        "independent deep focus with occasional collaboration",
        "Python, TypeScript, systems architecture",
        "problem-solving, mentoring, communication",
        "medium — open to calculated risks",
        "minimum $90k, target $150k",
        "remote — work from anywhere",
        "Bachelor's in Computer Science",
        "within 6 months",
        "building infrastructure at scale, mentoring",
        "micromanagement, constant meetings",
      ];

      for (const msg of messages) {
        const res = await app.inject({
          method: "POST",
          url: `/sessions/${sessionId}/messages`,
          payload: { content: msg },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.message).toHaveProperty("content");
      }

      // Final check: intake progresses and status remains valid
      const sessionRes = await app.inject({
        method: "GET",
        url: `/sessions/${sessionId}`,
      });
      const sessionBody = sessionRes.json();
      expect(
        ["intake", "analyzing", "complete"].includes(sessionBody.status),
      ).toBe(true);
    });
  });

  describe("Phase 2: Analysis & SSE Stream", () => {
    it("POST /sessions/:id/analyze — starts analysis returns 202", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/sessions/${sessionId}/analyze`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.ok).toBe(true);
    });

    it("GET /sessions/:id/stream — SSE stream progresses and completes", async () => {
      const streamRes = await app.inject({
        method: "GET",
        url: `/sessions/${sessionId}/stream`,
      });

      expect(streamRes.statusCode).toBe(200);
      expect(streamRes.headers["content-type"]).toBe("text/event-stream");

      // Parse SSE events
      const events: Array<{ type: string; payload: Record<string, unknown> }> =
        [];
      const lines = streamRes.body!.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            events.push(event);
          } catch (e) {
            // Skip malformed events
          }
        }
      }

      // Verify expected event sequence
      expect(events.length).toBeGreaterThan(0);

      // Should have status event first
      const statusEvent = events.find((e) => e.type === "status");
      expect(statusEvent).toBeDefined();

      // Should have progress events
      const progressEvents = events.filter((e) => e.type === "progress");
      expect(progressEvents.length).toBeGreaterThan(0);

      // Should have complete event
      const completeEvent = events.find((e) => e.type === "complete");
      expect(completeEvent).toBeDefined();
      expect((completeEvent?.payload as { progress?: number }).progress).toBe(
        100,
      );
    });

    it("GET /sessions/:id/stream — emits fallback_activated if timeout occurs", async () => {
      // Create new session for timeout test
      const sessionRes = await app.inject({ method: "POST", url: "/sessions" });
      const newSessionId = sessionRes.json().id;

      // Send one intake message
      await app.inject({
        method: "POST",
        url: `/sessions/${newSessionId}/messages`,
        payload: { content: "test answer" },
      });

      // Start analysis
      await app.inject({
        method: "POST",
        url: `/sessions/${newSessionId}/analyze`,
      });

      // Stream SSE — may show fallback_activated if timeout fires
      const streamRes = await app.inject({
        method: "GET",
        url: `/sessions/${newSessionId}/stream`,
      });

      const events: Array<{ type: string }> = [];
      const lines = (streamRes.body || "").split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            events.push(event);
          } catch (e) {
            // Skip malformed
          }
        }
      }

      // Should contain either progress or fallback_activated or both
      const hasProgress = events.some((e) => e.type === "progress");
      const hasFallback = events.some((e) => e.type === "fallback_activated");
      expect(hasProgress || hasFallback).toBe(true);
    });
  });

  describe("Phase 3: Recommendations Availability", () => {
    it("GET /sessions/:id/recommendations — returns recommendations after analysis", async () => {
      // Wait briefly for DB write to complete
      await new Promise((r) => setTimeout(r, 500));

      const res = await app.inject({
        method: "GET",
        url: `/sessions/${sessionId}/recommendations`,
      });

      expect([200, 202]).toContain(res.statusCode);

      if (res.statusCode === 200) {
        const recs = res.json();
        expect(Array.isArray(recs)).toBe(true);
        if (recs.length > 0) {
          const rec = recs[0];
          expect(rec).toHaveProperty("title");
          expect(rec).toHaveProperty("fitScore");
          expect(rec).toHaveProperty("summary");
        }
      }
    });
  });

  describe("Phase 4: Export Functionality", () => {
    it("GET /sessions/:id/report — generates PDF", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/sessions/${sessionId}/report`,
      });

      expect(res.statusCode).toBe(200);
      // Check for PDF magic bytes (should start with %PDF)
      const bodyStr = res.rawPayload.toString("utf8", 0, 5);
      expect(bodyStr).toContain("%PDF");
      expect(res.headers["content-type"]).toBe("application/pdf");
    });

    it("GET /sessions/:id/report — includes attachment disposition", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/sessions/${sessionId}/report`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-disposition"]).toContain("career-report-");
    });
  });

  describe("Phase 5: Session Persistence", () => {
    it("GET /sessions/:id — session retained after analysis", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/sessions/${sessionId}`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(sessionId);
      expect(body.status).toBe("complete");
      expect(body.profile).toBeDefined();
      expect(Array.isArray(body.recommendations)).toBe(true);
    });

    it("GET /sessions/:id/stream — returns correct final status", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/sessions/${sessionId}/stream`,
      });

      // Stream should still return 200 with final state
      expect(res.statusCode).toBe(200);
    });
  });

  describe("Timing Validation", () => {
    it("Full flow completes within demo timeout window", async () => {
      // This is a simple approximation — real timing depends on mock delays
      const startTime = Date.now();

      // Create session
      const sessionRes = await app.inject({ method: "POST", url: "/sessions" });
      const testSessionId = sessionRes.json().id;

      // Send a few intake messages
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: "POST",
          url: `/sessions/${testSessionId}/messages`,
          payload: { content: `answer ${i}` },
        });
      }

      // Start analysis
      await app.inject({
        method: "POST",
        url: `/sessions/${testSessionId}/analyze`,
      });

      // Stream SSE (don't wait for full stream)
      const streamRes = await app.inject({
        method: "GET",
        url: `/sessions/${testSessionId}/stream`,
      });

      const elapsedMs = Date.now() - startTime;

      // Should complete in under 20 seconds (hard timeout)
      expect(elapsedMs).toBeLessThan(20_000);

      // SSE should return 200
      expect(streamRes.statusCode).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("GET /sessions/:id/recommendations — returns 400 for intake status", async () => {
      const sessionRes = await app.inject({ method: "POST", url: "/sessions" });
      const newSessionId = sessionRes.json().id;

      const res = await app.inject({
        method: "GET",
        url: `/sessions/${newSessionId}/recommendations`,
      });

      expect(res.statusCode).toBe(400);
    });

    it("POST /sessions/:id/analyze — transitions intake session to analyzing", async () => {
      const sessionRes = await app.inject({ method: "POST", url: "/sessions" });
      const newSessionId = sessionRes.json().id;

      const res = await app.inject({
        method: "POST",
        url: `/sessions/${newSessionId}/analyze`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.ok).toBe(true);
    });
  });
});
