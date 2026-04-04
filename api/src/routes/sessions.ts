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
import {
  startAnalysis,
  getStatus,
  isAgentReachable,
  listAgents,
  getResearchData,
  getProfileAnalysis,
  getRecommendations,
  getVerificationResults,
  getCareerReport,
  getDetailedResults,
} from '../services/agent.js';
import { processIntakeMessage, getGreeting } from '../services/intake.js';
import { getRecommendationsForTrack } from '../services/demo.js';
import { generatePersonalizedFallback } from '../services/personalizedFallback.js';
import { getAdapter } from '../services/adapters.js';
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

      // ── Map agent names to human-readable stages ──
      const agentStages: Record<string, string> = {
        'research': 'Researching job market trends',
        'profile_analysis': 'Analyzing your profile',
        'recommendations': 'Generating recommendations',
        'verification': 'Verifying results',
        'report_generation': 'Finalizing your career report',
      };

      // ── Demo mode: deterministic SSE sequence ──
      if (env.DEMO_MODE) {
        const trackId = row.trackId ?? null;

        // Track-specific stage labels give each track a distinct feel
        const stageLabels: [number, string][] = trackId === 'tech-career'
          ? [
            [20, agentStages['research'] || 'Scanning tech job market signals'],
            [40, agentStages['profile_analysis'] || 'Scoring engineering career fits'],
            [60, agentStages['recommendations'] || 'Mapping salary bands and growth paths'],
            [80, agentStages['verification'] || 'Validating recommendations'],
            [100, agentStages['report_generation'] || 'Finalizing your Tech Career report'],
          ]
          : trackId === 'healthcare-pivot'
          ? [
            [20, 'Researching healthcare sector opportunities'],
            [40, 'Analyzing your healthcare fit'],
            [60, 'Identifying clinical and health-tech roles'],
            [80, 'Verifying licensure requirements'],
            [100, agentStages['report_generation'] || 'Finalizing your Healthcare Career report'],
          ]
          : trackId === 'creative-industry'
          ? [
            [20, 'Analysing creative industry landscape'],
            [40, 'Scoring portfolio and skills alignment'],
            [60, agentStages['recommendations'] || 'Identifying studio and freelance opportunities'],
            [80, agentStages['verification'] || 'Validating creative opportunities'],
            [100, agentStages['report_generation'] || 'Finalizing your Creative Industry report'],
          ]
          : [
            [20, agentStages['research'] || 'Evaluating career fit'],
            [40, agentStages['profile_analysis'] || 'Analyzing your profile'],
            [60, agentStages['recommendations'] || 'Generating recommendations'],
            [80, agentStages['verification'] || 'Verifying results'],
            [100, agentStages['report_generation'] || 'Finalizing results'],
          ];

        const delays = [500, 800, 600, 700, 400];
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

      // ── Live mode: poll agent service with 20s hard timeout + personalized fallback ──
      const ANALYSIS_TIMEOUT_MS = 20_000;
      const POLL_INTERVAL_MS = 2_000;
      const MAX_POLL_FAILURES = 3;

      const profile = parseJson<CareerProfile>(row.profile, {});
      const trackId = row.trackId ?? null;

      let pollFailures = 0;
      let terminated = false;

      /** Invoke personalized fallback: generate profile-derived recs, persist, close stream. */
      const invokeFallback = async (reason: string) => {
        if (terminated) return;
        terminated = true;
        clearInterval(poll);
        clearTimeout(timeoutHandle);

        app.log.warn({ sessionId: req.params.id, reason }, 'Analysis fallback triggered');

        send({
          type: 'progress',
          payload: { status: 'analyzing', progress: 85, stage: 'Switching to personalised recommendations…', isFallback: true },
        });

        try {
          // Generate profile-derived recs, then apply track enrichment adapter
          const rawRecs = generatePersonalizedFallback(profile, trackId);
          const adapter = getAdapter(trackId ?? 'general');
          const recs = await adapter.enrich(profile, rawRecs);

          await db
            .update(sessions)
            .set({ status: 'complete', recommendations: JSON.stringify(recs), updatedAt: now() })
            .where(eq(sessions.id, req.params.id));

          send({ type: 'complete', payload: { status: 'complete', progress: 100, isFallback: true } });
        } catch (err) {
          app.log.error(err, 'Fallback recommendation generation failed');
          send({ type: 'error', payload: { message: 'Analysis could not be completed. Please try again.' } });
        } finally {
          reply.raw.end();
        }
      };

      // Hard 20-second wall-clock deadline — guaranteed terminal transition
      const timeoutHandle = setTimeout(() => {
        invokeFallback('20s analysis timeout exceeded');
      }, ANALYSIS_TIMEOUT_MS);

      const poll = setInterval(async () => {
        if (terminated) return;

        try {
          const agentStatus = await getStatus(req.params.id);
          pollFailures = 0;

          const statusData = agentStatus as typeof agentStatus & {
            current_agent?: string;
            currentAgent?: string;
            results?: Record<string, unknown>;
            recommendations?: CareerRecommendation[];
            error?: string;
          };

          // Map agent name to human-readable stage
          const currentAgent = statusData.current_agent ?? statusData.currentAgent ?? 'analysis';
          const stageName = agentStages[currentAgent] || `Running ${currentAgent}`;

          send({ type: 'progress', payload: {
            status: agentStatus.status,
            progress: agentStatus.progress,
            stage: stageName,
            current_agent: currentAgent
          } });

          if (agentStatus.status === 'completed') {
            // Extract recommendations from report generation agent
            const reportData = statusData.results?.report_generation as Record<string, unknown> | undefined;
            let recs: CareerRecommendation[] = [];

            // Try to extract recommendations from agent report
            if (reportData?.recommendations) {
              recs = reportData.recommendations as CareerRecommendation[];
            } else {
              // Fallback to track-based recommendations
              recs = getRecommendationsForTrack(row.trackId ?? null);
            }

            // Update session with results
            await db
              .update(sessions)
              .set({
                status: 'complete',
                recommendations: JSON.stringify(recs),
                updatedAt: now(),
              })
              .where(eq(sessions.id, req.params.id));

            send({ type: 'complete', payload: { status: 'complete', progress: 100 } });
            clearInterval(poll);
            reply.raw.end();
          } else if (agentStatus.status === 'error') {
            send({ type: 'error', payload: statusData as unknown as Record<string, unknown>});
            clearInterval(poll);
            clearTimeout(timeoutHandle);

            let recs: CareerRecommendation[];

            if (statusData.recommendations?.length) {
              // Apply track enrichment to live agent recs
              const adapter = getAdapter(trackId ?? 'general');
              recs = await adapter.enrich(profile, statusData.recommendations);
            } else {
              // Agent completed but returned no recs — use personalized fallback
              const rawRecs = generatePersonalizedFallback(profile, trackId);
              const adapter = getAdapter(trackId ?? 'general');
              recs = await adapter.enrich(profile, rawRecs);
            }

            await db
              .update(sessions)
              .set({ status: 'complete', recommendations: JSON.stringify(recs), updatedAt: now() })
              .where(eq(sessions.id, req.params.id));

            send({ type: 'complete', payload: { status: 'complete', progress: 100 } });
            reply.raw.end();
          } else if (agentStatus.status === 'error') {
            await invokeFallback(`agent reported error: ${statusData.error ?? 'unknown'}`);
          }
        } catch {
          pollFailures++;
          if (pollFailures >= MAX_POLL_FAILURES) {
            await invokeFallback('agent service unreachable after 3 consecutive poll failures');
          }
        }
      }, POLL_INTERVAL_MS);

      req.raw.on('close', () => {
        terminated = true;
        clearInterval(poll);
        clearTimeout(timeoutHandle);
      });
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
      // Always transition to 'analyzing' — if the agent is unreachable the
      // SSE stream's 20s timeout will invoke personalized fallback automatically.
      await db
        .update(sessions)
        .set({ status: 'analyzing', updatedAt: ts })
        .where(eq(sessions.id, req.params.id));

      startAnalysis(req.params.id, profile, row.trackId ?? undefined).catch(async (err) => {
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

  // ── GET /sessions/:id/results/agents ────────────────────────────
  // List all available agents and their status
  app.get<{ Params: { id: string } }>(
    '/sessions/:id/results/agents',
    async (_req, reply) => {
      try {
        const agents = await listAgents();
        return reply.send(agents);
      } catch (err) {
        return reply.serviceUnavailable(
          'Agent service is not reachable. Please try again later.',
        );
      }
    },
  );

  // ── GET /sessions/:id/results/research ──────────────────────────
  // Get research data from Research Agent
  app.get<{ Params: { id: string } }>(
    '/sessions/:id/results/research',
    async (req, reply) => {
      try {
        const data = await getResearchData(req.params.id);
        return reply.send({
          agent: 'research',
          data,
        });
      } catch (err) {
        return reply
          .status(404)
          .send({ error: 'Research data not available', message: (err as Error).message });
      }
    },
  );

  // ── GET /sessions/:id/results/profile ───────────────────────────
  // Get profile analysis from Profile Analysis Agent
  app.get<{ Params: { id: string } }>(
    '/sessions/:id/results/profile',
    async (req, reply) => {
      try {
        const data = await getProfileAnalysis(req.params.id);
        return reply.send({
          agent: 'profile_analysis',
          data,
        });
      } catch (err) {
        return reply
          .status(404)
          .send({ error: 'Profile analysis not available', message: (err as Error).message });
      }
    },
  );

  // ── GET /sessions/:id/results/recommendations ────────────────────
  // Get recommendations from Recommendations Agent
  app.get<{ Params: { id: string } }>(
    '/sessions/:id/results/recommendations',
    async (req, reply) => {
      try {
        const data = await getRecommendations(req.params.id);
        return reply.send({
          agent: 'recommendations',
          data,
        });
      } catch (err) {
        return reply
          .status(404)
          .send({ error: 'Recommendations not available', message: (err as Error).message });
      }
    },
  );

  // ── GET /sessions/:id/results/verification ──────────────────────
  // Get verification results from Verification Agent
  app.get<{ Params: { id: string } }>(
    '/sessions/:id/results/verification',
    async (req, reply) => {
      try {
        const data = await getVerificationResults(req.params.id);
        return reply.send({
          agent: 'verification',
          data,
        });
      } catch (err) {
        return reply
          .status(404)
          .send({ error: 'Verification results not available', message: (err as Error).message });
      }
    },
  );

  // ── GET /sessions/:id/results/report ────────────────────────────
  // Get generated report from Report Generation Agent
  app.get<{ Params: { id: string } }>(
    '/sessions/:id/results/report',
    async (req, reply) => {
      try {
        const data = await getCareerReport(req.params.id);
        return reply.send({
          agent: 'report_generation',
          data,
        });
      } catch (err) {
        return reply
          .status(404)
          .send({ error: 'Report not available', message: (err as Error).message });
      }
    },
  );

  // ── GET /sessions/:id/results/all ───────────────────────────────
  // Get all results from all 5 agents
  app.get<{ Params: { id: string } }>(
    '/sessions/:id/results/all',
    async (req, reply) => {
      try {
        const results = await getDetailedResults(req.params.id);
        return reply.send({
          sessionId: req.params.id,
          agents: {
            research: results.research,
            profile_analysis: results.profile_analysis,
            recommendations: results.recommendations,
            verification: results.verification,
            report_generation: results.report,
          },
        });
      } catch (err) {
        return reply
          .status(404)
          .send({ error: 'Results not available', message: (err as Error).message });
      }
    },
  );
}
