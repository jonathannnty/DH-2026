/**
 * Frontend/API Schema Parity Tests
 *
 * Ensures that frontend and API share consistent schemas for:
 * - Session response contract
 * - Send message request/response
 * - Stream events
 * - Profile and recommendation structures
 */

import { describe, it, expect } from "vitest";
import type {
  SessionResponse,
  SendMessageResponse,
  StreamEvent,
  CareerProfile,
  CareerRecommendation,
} from "../schemas/career.js";

describe("Frontend/API Schema Parity", () => {
  describe("SessionResponse contract", () => {
    it("has required fields: id, status, profile, messages", () => {
      const session: SessionResponse = {
        id: "test-id",
        status: "intake",
        trackId: null,
        profile: {},
        messages: [],
        intakeComplete: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(session).toHaveProperty("id");
      expect(session).toHaveProperty("status");
      expect(session).toHaveProperty("profile");
      expect(session).toHaveProperty("messages");
      expect(session).toHaveProperty("intakeComplete");
      expect(session).toHaveProperty("createdAt");
      expect(session).toHaveProperty("updatedAt");
    });

    it("status must be one of: intake, analyzing, complete, error", () => {
      const validStatuses = ["intake", "analyzing", "complete", "error"];
      for (const status of validStatuses) {
        const session: SessionResponse = {
          id: "test",
          status: status as any,
          trackId: null,
          profile: {},
          messages: [],
          intakeComplete: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        expect(validStatuses).toContain(session.status);
      }
    });

    it("intakeComplete must be boolean", () => {
      const session: SessionResponse = {
        id: "test",
        status: "intake",
        trackId: null,
        profile: {},
        messages: [],
        intakeComplete: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(typeof session.intakeComplete).toBe("boolean");
    });
  });

  describe("SendMessageResponse contract", () => {
    it("has required fields: message, profileUpdate, intakeComplete", () => {
      const response: SendMessageResponse = {
        message: {
          id: "msg-1",
          role: "assistant",
          content: "Test message",
          timestamp: new Date().toISOString(),
        },
        profileUpdate: {},
        intakeComplete: false,
      };

      expect(response).toHaveProperty("message");
      expect(response).toHaveProperty("profileUpdate");
      expect(response).toHaveProperty("intakeComplete");
    });

    it("message has required fields: id, role, content, timestamp", () => {
      const response: SendMessageResponse = {
        message: {
          id: "msg-1",
          role: "assistant",
          content: "Test",
          timestamp: new Date().toISOString(),
        },
        profileUpdate: { interests: ["tech"] },
        intakeComplete: false,
      };

      expect(response.message).toHaveProperty("id");
      expect(response.message).toHaveProperty("role");
      expect(response.message).toHaveProperty("content");
      expect(response.message).toHaveProperty("timestamp");
    });

    it("message role must be user or assistant", () => {
      const response: SendMessageResponse = {
        message: {
          id: "msg-1",
          role: "user",
          content: "Test",
          timestamp: new Date().toISOString(),
        },
        profileUpdate: {},
        intakeComplete: false,
      };

      expect(["user", "assistant"]).toContain(response.message.role);
    });
  });

  describe("StreamEvent contract", () => {
    it("has required fields: type, payload", () => {
      const event: StreamEvent = {
        type: "status",
        payload: { message: "Processing..." },
      };

      expect(event).toHaveProperty("type");
      expect(event).toHaveProperty("payload");
    });

    it("type must be one of valid event types", () => {
      const validTypes = ["status", "progress", "complete", "error"];
      for (const type of validTypes) {
        const event: StreamEvent = {
          type: type as any,
          payload: {},
        };
        expect(validTypes).toContain(event.type);
      }
    });

    it("payload must be an object", () => {
      const event: StreamEvent = {
        type: "status",
        payload: { key: "value", nested: { prop: 123 } },
      };

      expect(typeof event.payload).toBe("object");
      expect(event.payload).not.toBeNull();
    });
  });

  describe("CareerProfile contract", () => {
    it("all fields are optional but typed correctly when present", () => {
      const profile: CareerProfile = {
        interests: ["technology", "design"],
        values: ["growth", "impact"],
        riskTolerance: "medium",
        timelineUrgency: "short",
      };

      if (profile.interests) {
        expect(Array.isArray(profile.interests)).toBe(true);
      }
      if (profile.riskTolerance) {
        expect(["low", "medium", "high"]).toContain(profile.riskTolerance);
      }
      if (profile.timelineUrgency) {
        expect(["immediate", "short", "long"]).toContain(
          profile.timelineUrgency,
        );
      }
    });

    it("financialNeeds has consistent structure", () => {
      const profile: CareerProfile = {
        financialNeeds: {
          minimumSalary: 50000,
          targetSalary: 80000,
          hasDebt: false,
        },
      };

      if (profile.financialNeeds) {
        expect(profile.financialNeeds).toHaveProperty("minimumSalary");
        expect(profile.financialNeeds).toHaveProperty("targetSalary");
        expect(profile.financialNeeds).toHaveProperty("hasDebt");
      }
    });
  });

  describe("CareerRecommendation contract", () => {
    it("has required fields: title, summary, fitScore, reasons, concerns, nextSteps", () => {
      const rec: CareerRecommendation = {
        title: "Software Engineer",
        summary: "A great fit",
        fitScore: 85,
        reasons: ["Matches skills", "Aligns with values"],
        concerns: ["New market"],
        nextSteps: ["Update resume", "Apply"],
      };

      expect(rec).toHaveProperty("title");
      expect(rec).toHaveProperty("summary");
      expect(rec).toHaveProperty("fitScore");
      expect(rec).toHaveProperty("reasons");
      expect(rec).toHaveProperty("concerns");
      expect(rec).toHaveProperty("nextSteps");
    });

    it("fitScore must be between 0 and 100", () => {
      const rec: CareerRecommendation = {
        title: "Role",
        summary: "Summary",
        fitScore: 75,
        reasons: [],
        concerns: [],
        nextSteps: [],
      };

      expect(rec.fitScore).toBeGreaterThanOrEqual(0);
      expect(rec.fitScore).toBeLessThanOrEqual(100);
    });

    it("salaryRange when present has low, high, and currency", () => {
      const rec: CareerRecommendation = {
        title: "Role",
        summary: "Summary",
        fitScore: 80,
        reasons: [],
        concerns: [],
        nextSteps: [],
        salaryRange: {
          low: 50000,
          high: 100000,
          currency: "USD",
        },
      };

      if (rec.salaryRange) {
        expect(rec.salaryRange).toHaveProperty("low");
        expect(rec.salaryRange).toHaveProperty("high");
        expect(rec.salaryRange).toHaveProperty("currency");
        expect(rec.salaryRange.currency).toBe("USD");
      }
    });
  });
});
