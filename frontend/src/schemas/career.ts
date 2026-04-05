import { z } from "zod";

// ─── Domain schemas ────────────────────────────────────────────────

export const CareerProfileSchema = z.object({
  interests: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
  workingStyle: z.string().optional(),
  hardSkills: z.array(z.string()).optional(),
  softSkills: z.array(z.string()).optional(),
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
  financialNeeds: z
    .object({
      minimumSalary: z.number().optional(),
      targetSalary: z.number().optional(),
      hasDebt: z.boolean().optional(),
    })
    .optional(),
  geographicFlexibility: z
    .enum(["local", "remote", "relocate", "flexible"])
    .optional(),
  educationLevel: z.string().optional(),
  timelineUrgency: z.enum(["immediate", "short", "long"]).optional(),
  purposePriorities: z.array(z.string()).optional(),
  burnoutConcerns: z.array(z.string()).optional(),
});

export type CareerProfile = z.infer<typeof CareerProfileSchema>;

export const SessionStatus = z.enum([
  "intake",
  "analyzing",
  "complete",
  "error",
]);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string().datetime(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const CareerRecommendationSchema = z.object({
  title: z.string(),
  summary: z.string(),
  fitScore: z.number().min(0).max(100),
  reasons: z.array(z.string()),
  concerns: z.array(z.string()),
  nextSteps: z.array(z.string()),
  salaryRange: z
    .object({
      low: z.number(),
      high: z.number(),
      currency: z.literal("USD"),
    })
    .optional(),
});

export type CareerRecommendation = z.infer<typeof CareerRecommendationSchema>;

// ─── Sponsor track schemas ────────────────────────────────────────

export const SponsorTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  sponsor: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type SponsorTrack = z.infer<typeof SponsorTrackSchema>;

export const TrackRegistryResponseSchema = z.object({
  tracks: z.array(SponsorTrackSchema),
});

export type TrackRegistryResponse = z.infer<typeof TrackRegistryResponseSchema>;

// ─── API response contracts ────────────────────────────────────────

export const SessionResponseSchema = z.object({
  id: z.string(),
  status: SessionStatus,
  trackId: z.string().nullable(),
  profile: CareerProfileSchema,
  messages: z.array(ChatMessageSchema),
  recommendations: z.array(CareerRecommendationSchema).optional(),
  intakeComplete: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const SendMessageResponseSchema = z.object({
  message: ChatMessageSchema,
  profileUpdate: CareerProfileSchema.partial(),
  intakeComplete: z.boolean(),
});

export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;

export const StreamEventSchema = z.object({
  type: z.enum([
    "status",
    "progress",
    "complete",
    "error",
    "fallback_activated",
  ]),
  payload: z.record(z.unknown()),
});

export type StreamEvent = z.infer<typeof StreamEventSchema>;
