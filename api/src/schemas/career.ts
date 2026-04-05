import { z } from 'zod';

// ─── Domain schemas ────────────────────────────────────────────────

export const CareerProfileSchema = z.object({
  interests: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
  workingStyle: z.string().optional(),
  hardSkills: z.array(z.string()).optional(),
  softSkills: z.array(z.string()).optional(),
  riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
  financialNeeds: z
    .object({
      minimumSalary: z.number().optional(),
      targetSalary: z.number().optional(),
      hasDebt: z.boolean().optional(),
    })
    .optional(),
  geographicFlexibility: z
    .enum(['local', 'remote', 'relocate', 'flexible'])
    .optional(),
  educationLevel: z.string().optional(),
  timelineUrgency: z.enum(['immediate', 'short', 'long']).optional(),
  purposePriorities: z.array(z.string()).optional(),
  burnoutConcerns: z.array(z.string()).optional(),
});

export type CareerProfile = z.infer<typeof CareerProfileSchema>;

export const SessionStatus = z.enum(['intake', 'analyzing', 'complete', 'error']);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
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
      currency: z.literal('USD'),
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
  /** Tags surfaced on recommendation cards to show track relevance */
  tags: z.array(z.string()).default([]),
});

export type SponsorTrack = z.infer<typeof SponsorTrackSchema>;

export const TrackRegistryResponseSchema = z.object({
  tracks: z.array(SponsorTrackSchema),
});

export type TrackRegistryResponse = z.infer<typeof TrackRegistryResponseSchema>;

// ─── API request / response contracts ──────────────────────────────

export const CreateSessionRequestSchema = z.object({
  trackId: z.string().optional(),
});

export const SessionResponseSchema = z.object({
  id: z.string(),
  status: SessionStatus,
  trackId: z.string().nullable(),
  profile: CareerProfileSchema,
  messages: z.array(ChatMessageSchema),
  recommendations: z.array(CareerRecommendationSchema).optional(),
  /** Deterministic: true when all intake steps have been answered. Never phrase-matched. */
  intakeComplete: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const SendMessageRequestSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const SendMessageResponseSchema = z.object({
  message: ChatMessageSchema,
  profileUpdate: CareerProfileSchema.partial(),
  /** True when this was the final intake answer — drives chip tray hide without phrase-matching. */
  intakeComplete: z.boolean(),
});

export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;

export const AnalyzeResponseSchema = z.object({
  ok: z.literal(true),
});

export const StreamEventSchema = z.object({
  type: z.enum(['status', 'progress', 'complete', 'error']),
  payload: z.record(z.unknown()),
});

export type StreamEvent = z.infer<typeof StreamEventSchema>;

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['ok', 'error']),
  agentService: z.enum(['ok', 'unreachable']).optional(),
  uptime: z.number(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ─── State-machine transitions ─────────────────────────────────────

const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  intake: ['analyzing', 'error'],
  analyzing: ['complete', 'error'],
  complete: [],         // terminal
  error: ['intake'],    // allow retry from error → intake
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
