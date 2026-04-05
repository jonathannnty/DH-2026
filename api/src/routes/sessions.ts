import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { eq } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
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
import { startAnalysis, getStatus, isAgentversePipelineReady } from '../services/agent.js';
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

function formatList(items: string[]): string {
  if (!items.length) return 'None provided';
  return items.map((item) => `- ${item}`).join('\n');
}

function formatSalaryRange(range?: CareerRecommendation['salaryRange']): string {
  if (!range) return 'Not provided';
  return `$${range.low.toLocaleString()} - $${range.high.toLocaleString()} ${range.currency}`;
}

function buildReportMarkdown(session: {
  id: string;
  trackId: string | null;
  profile: CareerProfile;
  recommendations: CareerRecommendation[];
  createdAt: string;
  updatedAt: string;
}): string {
  const topRecommendations = session.recommendations.slice(0, 3);
  const interests = session.profile.interests ?? [];
  const values = session.profile.values ?? [];
  const hardSkills = session.profile.hardSkills ?? [];
  const softSkills = session.profile.softSkills ?? [];
  const actionSteps = topRecommendations.flatMap((recommendation) => recommendation.nextSteps).slice(0, 6);

  const recommendationSections = topRecommendations.length
    ? topRecommendations.map((recommendation, index) => {
      const reasons = formatList(recommendation.reasons);
      const concerns = formatList(recommendation.concerns);
      const steps = formatList(recommendation.nextSteps);

      return [
        `## ${index + 1}. ${recommendation.title}`,
        `Fit score: ${recommendation.fitScore}%`,
        `Summary: ${recommendation.summary}`,
        `Salary range: ${formatSalaryRange(recommendation.salaryRange)}`,
        '',
        'Why it fits:',
        reasons,
        '',
        'Watch-outs:',
        concerns,
        '',
        'Next steps:',
        steps,
      ].join('\n');
    }).join('\n\n')
    : 'No recommendations were generated for this session.';

  return [
    '# Career Guidance Report',
    '',
    `Session ID: ${session.id}`,
    `Track: ${session.trackId ?? 'general'}`,
    `Created: ${session.createdAt}`,
    `Updated: ${session.updatedAt}`,
    '',
    '## Profile Snapshot',
    '',
    'Interests:',
    formatList(interests),
    '',
    'Values:',
    formatList(values),
    '',
    'Hard skills:',
    formatList(hardSkills),
    '',
    'Soft skills:',
    formatList(softSkills),
    '',
    '## Top Career Matches',
    '',
    recommendationSections,
    '',
    '## Action Plan',
    '',
    actionSteps.length ? formatList(actionSteps) : 'No next steps were generated.',
    '',
    '## Notes',
    '',
    'This report was generated from the completed assessment and is suitable for download, sharing, or printing to PDF.',
  ].join('\n');
}

function markdownLineToText(line: string): { text: string; bold: boolean; size: number; indent: number } {
  if (line.startsWith('# ')) {
    return { text: line.slice(2), bold: true, size: 20, indent: 0 };
  }

  if (line.startsWith('## ')) {
    return { text: line.slice(3), bold: true, size: 13, indent: 0 };
  }

  if (line.startsWith('- ')) {
    return { text: `• ${line.slice(2)}`, bold: false, size: 10, indent: 10 };
  }

  return { text: line, bold: false, size: 10, indent: 0 };
}

function createPdfBufferFromMarkdown(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, autoFirstPage: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', reject);

    doc.info.Title = 'Career Guidance Report';
    doc.info.Author = 'PathFinder AI';
    doc.info.Subject = 'Career recommendations and action plan';

    const lines = markdown.split('\n');
    for (const line of lines) {
      if (line.trim() === '') {
        doc.moveDown(0.45);
        continue;
      }

      const style = markdownLineToText(line);
      doc
        .font(style.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(style.size)
        .text(style.text, { indent: style.indent, lineGap: 2 });

      if (style.size >= 13) {
        doc.moveDown(0.2);
      }
    }

    doc.end();
  });
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

  // ── GET /sessions/:id/report ───────────────────────────────────
  app.get<{ Params: { id: string } }>(
    '/sessions/:id/report',
    async (req, reply) => {
      const row = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, req.params.id))
        .get();

      if (!row) return reply.notFound('Session not found');

      if (row.status !== 'complete') {
        return reply.badRequest(
          `Report not ready. Current status: '${row.status}'. Must be 'complete'.`,
        );
      }

      const markdown = buildReportMarkdown({
        id: row.id,
        trackId: row.trackId,
        profile: parseJson<CareerProfile>(row.profile, {}),
        recommendations: row.recommendations
          ? parseJson<CareerRecommendation[]>(row.recommendations, [])
          : [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });

      const pdfBuffer = await createPdfBufferFromMarkdown(markdown);
      const filename = `career-report-${row.id.slice(0, 8)}.pdf`;

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.header('Cache-Control', 'no-store');
      reply.header('Content-Length', String(pdfBuffer.byteLength));

      return reply.send(pdfBuffer);
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
        // Note: 'complete' event is NOT in this array — it is emitted only after
        // the DB write succeeds, preventing the race where the browser calls
        // getRecommendations() before the row is persisted.
        const progressSteps = stageLabels.map(([progress, stage], i) => ({
          delay: delays[i],
          progress,
          stage: stage as string,
        }));

        let cancelled = false;
        req.raw.on('close', () => { cancelled = true; });

        for (const step of progressSteps) {
          if (cancelled) break;
          await new Promise((r) => setTimeout(r, step.delay));
          if (cancelled) break;
          send({ type: 'progress', payload: { status: 'analyzing', progress: step.progress, stage: step.stage } });
        }

        if (!cancelled) {
          // 1. Persist recommendations FIRST
          const recs = getRecommendationsForTrack(trackId);
          await db
            .update(sessions)
            .set({
              status: 'complete',
              recommendations: JSON.stringify(recs),
              updatedAt: now(),
            })
            .where(eq(sessions.id, req.params.id));

          // 2. Only then signal the browser — DB is guaranteed ready
          await new Promise((r) => setTimeout(r, 300));
          if (!cancelled) {
            send({ type: 'complete', payload: { status: 'complete', progress: 100 } });
          }
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

          send({
            type: 'progress',
            payload: { status: agentStatus.status, progress: agentStatus.progress, stage: agentStatus.stage },
          });

          if (agentStatus.status === 'complete') {
            if (terminated) return;
            terminated = true;
            clearInterval(poll);
            clearTimeout(timeoutHandle);

            let recs: CareerRecommendation[];
            let usedFallback = false;

            const agentRecs = agentStatus.recommendations ?? [];
            const passesContract = meetsPersonalizationContract(agentRecs, profile, trackId);

            if (agentRecs.length && passesContract) {
              // Live recs pass personalization contract — apply track enrichment
              const adapter = getAdapter(trackId ?? 'general');
              recs = await adapter.enrich(profile, agentRecs);
            } else {
              // Agent returned no recs, or recs failed personalization contract — use fallback
              if (agentRecs.length && !passesContract) {
                app.log.warn(
                  { sessionId: req.params.id, recCount: agentRecs.length },
                  'Live recs failed personalization contract — substituting personalized fallback',
                );
              }
              const rawRecs = generatePersonalizedFallback(profile, trackId);
              const adapter = getAdapter(trackId ?? 'general');
              recs = await adapter.enrich(profile, rawRecs);
              usedFallback = true;
            }

            await db
              .update(sessions)
              .set({ status: 'complete', recommendations: JSON.stringify(recs), updatedAt: now() })
              .where(eq(sessions.id, req.params.id));

            send({ type: 'complete', payload: { status: 'complete', progress: 100, isFallback: usedFallback } });
            reply.raw.end();
          } else if (agentStatus.status === 'error') {
            await invokeFallback(`agent reported error: ${agentStatus.error ?? 'unknown'}`);
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

      const agentReady = await isAgentversePipelineReady();
      if (agentReady) {
        startAnalysis(req.params.id, profile, row.trackId).catch((err) => {
          app.log.warn(err, 'startAnalysis call failed — SSE timeout will trigger fallback');
        });
      } else {
        app.log.warn({ sessionId: req.params.id }, 'Agentverse-backed 4-agent pipeline is not ready');
        return reply.status(503).send({
          ok: false as const,
          message: 'Agentverse-backed analysis is not ready. Start the Python agent service with ENABLE_AGENTVERSE_LINK=true so the four-agent pipeline can generate the top 3 job matches.',
        });
      }

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
