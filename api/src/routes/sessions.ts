import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sessions } from '../db/schema.js';
import {
  type CareerProfile,
  type ChatMessage,
  type SessionStatus,
  type CareerRecommendation,
  SendMessageRequestSchema,
  CreateSessionRequestSchema,
  canTransition,
} from '../schemas/career.js';
import { startAnalysis, getStatus, isAgentReachable } from '../services/agent.js';
import { processIntakeMessage, getGreeting } from '../services/intake.js';
import { getRecommendationsForTrack } from '../services/demo.js';
import { isValidTrack } from '../services/tracks.js';
import { loadEnv } from '../env.js';

function now(): string {
  return new Date().toISOString();
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  const env = loadEnv();

  // ── POST /sessions ───────────────────────────────────────────────
  app.post<{ Body: unknown }>('/sessions', async (req, reply) => {
    const parsed = CreateSessionRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.badRequest(parsed.error.issues[0].message);
    }

    const trackId = parsed.data.trackId ?? null;
    if (trackId && !isValidTrack(trackId)) {
      return reply.badRequest(`Unknown track '${trackId}'.`);
    }

    const id = randomUUID();
    const ts = now();

    const greeting: ChatMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: getGreeting(),
      timestamp: ts,
    };

    await db.insert(sessions).values({
      id,
      status: 'intake',
      trackId,
      profile: '{}',
      messages: JSON.stringify([greeting]),
      createdAt: ts,
      updatedAt: ts,
    });

    return reply.status(201).send({
      id,
      status: 'intake' as const,
      trackId,
      profile: {},
      messages: [greeting],
      createdAt: ts,
      updatedAt: ts,
    });
  });

  // ── GET /sessions/:id ───────────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    '/sessions/:id',
    async (req, reply) => {
      const row = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, req.params.id))
        .get();

      if (!row) return reply.notFound('Session not found');

      return {
        id: row.id,
        status: row.status,
        trackId: row.trackId ?? null,
        profile: parseJson<CareerProfile>(row.profile, {}),
        messages: parseJson<ChatMessage[]>(row.messages, []),
        recommendations: row.recommendations
          ? parseJson<CareerRecommendation[]>(row.recommendations, [])
          : undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    },
  );

  // ── POST /sessions/:id/messages ─────────────────────────────────
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/sessions/:id/messages',
    async (req, reply) => {
      const parsed = SendMessageRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.badRequest(parsed.error.issues[0].message);
      }

      const row = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, req.params.id))
        .get();

      if (!row) return reply.notFound('Session not found');

      if (row.status !== 'intake') {
        return reply.badRequest(
          `Cannot send messages in '${row.status}' status. Session must be in 'intake'.`,
        );
      }

      const existingMessages = parseJson<ChatMessage[]>(row.messages, []);
      const currentProfile = parseJson<CareerProfile>(row.profile, {});

      const userMessage: ChatMessage = {
        id: randomUUID(),
        role: 'user',
        content: parsed.data.content,
        timestamp: now(),
      };

      const result = processIntakeMessage(
        [...existingMessages, userMessage],
        currentProfile,
        parsed.data.content,
      );

      const assistantMessage: ChatMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: result.assistantContent,
        timestamp: now(),
      };

      const updatedMessages = [...existingMessages, userMessage, assistantMessage];
      const mergedProfile: CareerProfile = { ...currentProfile, ...result.profileUpdate };
      const ts = now();

      await db
        .update(sessions)
        .set({
          messages: JSON.stringify(updatedMessages),
          profile: JSON.stringify(mergedProfile),
          updatedAt: ts,
        })
        .where(eq(sessions.id, req.params.id));

      return reply.send({
        message: assistantMessage,
        profileUpdate: result.profileUpdate,
      });
    },
  );

  // ── GET /sessions/:id/stream ────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    '/sessions/:id/stream',
    async (req, reply) => {
      const row = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, req.params.id))
        .get();

      if (!row) return reply.notFound('Session not found');

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const send = (event: { type: string; payload: Record<string, unknown> }) => {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      send({ type: 'status', payload: { status: row.status } });

      if (row.status !== 'analyzing') {
        reply.raw.end();
        return;
      }

      // ── Demo mode: deterministic SSE sequence ──
      if (env.DEMO_MODE) {
        const trackId = row.trackId ?? null;

        // Track-specific stage labels give each track a distinct feel
        const stageLabels: [number, string][] = trackId === 'tech-career'
          ? [
            [25, 'Scanning tech job market signals'],
            [50, 'Scoring engineering career fits'],
            [75, 'Mapping salary bands and growth paths'],
            [100, 'Finalizing your Tech Career report'],
          ]
          : trackId === 'healthcare-pivot'
          ? [
            [25, 'Evaluating healthcare sector fit'],
            [50, 'Matching clinical and health-tech roles'],
            [75, 'Modeling licensure and transition paths'],
            [100, 'Finalizing your Healthcare Career report'],
          ]
          : trackId === 'creative-industry'
          ? [
            [25, 'Analysing creative industry landscape'],
            [50, 'Scoring portfolio and skills alignment'],
            [75, 'Identifying studio and freelance opportunities'],
            [100, 'Finalizing your Creative Industry report'],
          ]
          : [
            [25, 'Evaluating career fit'],
            [50, 'Scoring recommendations'],
            [75, 'Generating action plans'],
            [100, 'Finalizing results'],
          ];

        const delays = [500, 800, 600, 400];
        const steps = [
          ...stageLabels.map(([progress, stage], i) => ({
            delay: delays[i],
            event: { type: 'progress', payload: { status: 'analyzing', progress, stage } },
          })),
          { delay: 300, event: { type: 'complete', payload: { status: 'complete', progress: 100 } } },
        ];

        let cancelled = false;
        req.raw.on('close', () => { cancelled = true; });

        for (const step of steps) {
          if (cancelled) break;
          await new Promise((r) => setTimeout(r, step.delay));
          if (cancelled) break;
          send(step.event);
        }

        if (!cancelled) {
          const recs = getRecommendationsForTrack(trackId);
          await db
            .update(sessions)
            .set({
              status: 'complete',
              recommendations: JSON.stringify(recs),
              updatedAt: now(),
            })
            .where(eq(sessions.id, req.params.id));
        }

        reply.raw.end();
        return;
      }

      // ── Live mode: poll agent service with graceful fallback ──
      let retries = 0;
      const MAX_RETRIES = 3;

      const fallbackToDemo = async () => {
        app.log.warn({ sessionId: req.params.id }, 'Agent service unreachable — using demo fallback');
        const trackId = row.trackId ?? null;
        const recs = getRecommendationsForTrack(trackId);
        await db
          .update(sessions)
          .set({ status: 'complete', recommendations: JSON.stringify(recs), updatedAt: now() })
          .where(eq(sessions.id, req.params.id));
        send({ type: 'progress', payload: { status: 'analyzing', progress: 100, stage: 'Finalizing results' } });
        send({ type: 'complete', payload: { status: 'complete', progress: 100 } });
        reply.raw.end();
      };

      const poll = setInterval(async () => {
        try {
          const agentStatus = await getStatus(req.params.id);
          retries = 0;
          send({ type: 'progress', payload: agentStatus });

          if (agentStatus.status === 'complete' || agentStatus.status === 'error') {
            send({ type: agentStatus.status, payload: agentStatus });
            clearInterval(poll);
            reply.raw.end();
          }
        } catch {
          retries++;
          if (retries >= MAX_RETRIES) {
            clearInterval(poll);
            // Degrade gracefully: complete the session with track-appropriate demo results
            await fallbackToDemo().catch(() => {
              send({ type: 'error', payload: { message: 'Lost connection to agent service' } });
              reply.raw.end();
            });
          }
        }
      }, 2000);

      req.raw.on('close', () => clearInterval(poll));
    },
  );

  // ── POST /sessions/:id/analyze ──────────────────────────────────
  app.post<{ Params: { id: string } }>(
    '/sessions/:id/analyze',
    async (req, reply) => {
      const row = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, req.params.id))
        .get();

      if (!row) return reply.notFound('Session not found');

      const from = row.status as SessionStatus;
      const to: SessionStatus = 'analyzing';

      if (!canTransition(from, to)) {
        return reply.badRequest(
          `Cannot transition from '${from}' to '${to}'. ` +
          `Allowed transitions from '${from}': ${from === 'complete' ? 'none (terminal)' : "'analyzing', 'error'"}.`,
        );
      }

      const profile = parseJson<CareerProfile>(row.profile, {});
      const ts = now();

      // ── Demo mode: skip agent reachability check ──
      if (env.DEMO_MODE) {
        await db
          .update(sessions)
          .set({ status: 'analyzing', updatedAt: ts })
          .where(eq(sessions.id, req.params.id));

        return reply.send({ ok: true as const });
      }

      // ── Live mode ──
      const agentUp = await isAgentReachable();
      if (!agentUp) {
        return reply.serviceUnavailable(
          'Agent service is not reachable. Please try again later.',
        );
      }

      await db
        .update(sessions)
        .set({ status: 'analyzing', updatedAt: ts })
        .where(eq(sessions.id, req.params.id));

      startAnalysis(req.params.id, profile).catch(async (err) => {
        app.log.error(err, 'Analysis failed, transitioning to error');
        await db
          .update(sessions)
          .set({ status: 'error', updatedAt: now() })
          .where(eq(sessions.id, req.params.id));
      });

      return reply.send({ ok: true as const });
    },
  );

  // ── GET /sessions/:id/recommendations ───────────────────────────
  app.get<{ Params: { id: string } }>(
    '/sessions/:id/recommendations',
    async (req, reply) => {
      const row = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, req.params.id))
        .get();

      if (!row) return reply.notFound('Session not found');

      if (row.status !== 'complete') {
        return reply.badRequest(
          `Recommendations not ready. Current status: '${row.status}'. Must be 'complete'.`,
        );
      }

      return parseJson<CareerRecommendation[]>(row.recommendations ?? '[]', []);
    },
  );
}
