import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { eq, sql, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sessions } from '../db/schema.js';
import { loadEnv } from '../env.js';
import type { CareerProfile, ChatMessage, CareerRecommendation } from '../schemas/career.js';
import { SCENARIOS } from '../services/scenarios.js';
import { processIntakeMessage, getGreeting } from '../services/intake.js';

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Operator control panel routes — all under /ops prefix.
 * Designed for demo operators to inspect, reset, and manage state safely.
 */
export async function opsRoutes(app: FastifyInstance): Promise<void> {
  const env = loadEnv();

  // ── Audit hook: log every ops access; warn when outside demo mode ──
  app.addHook('onRequest', async (req) => {
    if (!env.DEMO_MODE) {
      req.log.warn(
        { method: req.method, url: req.url },
        'Ops route accessed outside DEMO_MODE — ensure this is intentional',
      );
    }
  });

  // ── GET /ops/status — operator dashboard snapshot ───────────────
  app.get('/status', async () => {
    const allSessions = await db.select().from(sessions).all();
    const byStatus: Record<string, number> = { intake: 0, analyzing: 0, complete: 0, error: 0 };
    for (const s of allSessions) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    }

    // For sessions stuck in 'analyzing', compute elapsed seconds since last update
    const nowMs = Date.now();
    const analyzingSessions = allSessions.filter((s) => s.status === 'analyzing');
    const elapsedSecBySession = analyzingSessions.map((s) => {
      const updatedMs = new Date(s.updatedAt).getTime();
      return { id: s.id, elapsedSec: Math.round((nowMs - updatedMs) / 1000) };
    });
    const longestAnalyzingSec = elapsedSecBySession.length
      ? Math.max(...elapsedSecBySession.map((e) => e.elapsedSec))
      : null;

    return {
      mode: env.DEMO_MODE ? 'demo' : 'live',
      demoMode: env.DEMO_MODE,
      sessionCount: allSessions.length,
      byStatus,
      analyzing: elapsedSecBySession,
      longestAnalyzingSec,
      dbPath: env.DATABASE_URL,
      auditedAt: new Date().toISOString(),
    };
  });

  // ── GET /ops/sessions — list all sessions (summary view) ────────
  app.get('/sessions', async () => {
    const rows = await db
      .select({
        id: sessions.id,
        status: sessions.status,
        trackId: sessions.trackId,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        messageCount: sql<number>`json_array_length(${sessions.messages})`,
      })
      .from(sessions)
      .orderBy(desc(sessions.updatedAt))
      .all();

    return { sessions: rows };
  });

  // ── GET /ops/sessions/:id/full — full session dump for debugging ──
  app.get<{ Params: { id: string } }>(
    '/sessions/:id/full',
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
          : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    },
  );

  // ── DELETE /ops/sessions/:id — delete a single session ──────────
  app.delete<{ Params: { id: string }; Body: { action?: string } }>(
    '/sessions/:id',
    async (req, reply) => {
      const existing = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(eq(sessions.id, req.params.id))
        .get();

      if (!existing) return reply.notFound('Session not found');

      await db.delete(sessions).where(eq(sessions.id, req.params.id));

      const action = (req.body as { action?: string })?.action ?? 'delete-session';
      req.log.warn({ sessionId: req.params.id, action }, 'Ops: session deleted');

      return { deleted: req.params.id, action, auditedAt: new Date().toISOString() };
    },
  );

  // ── POST /ops/reset — wipe ALL sessions (demo reset button) ────
  app.post<{ Body: { action?: string } }>('/reset', async (req) => {
    const before = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .get();

    await db.delete(sessions);

    const action = (req.body as { action?: string })?.action ?? 'reset-all';
    req.log.warn({ wiped: before?.count ?? 0, action }, 'Ops: full reset executed');

    return {
      wiped: before?.count ?? 0,
      message: 'All sessions deleted. Database is clean for next demo run.',
      action,
      auditedAt: new Date().toISOString(),
    };
  });

  // ── POST /ops/sessions/:id/force-status — force a status (escape hatch) ──
  app.post<{ Params: { id: string }; Body: { status: string; action?: string } }>(
    '/sessions/:id/force-status',
    async (req, reply) => {
      const validStatuses = ['intake', 'analyzing', 'complete', 'error'];
      const body = req.body as { status?: string; action?: string };

      if (!body.status || !validStatuses.includes(body.status)) {
        return reply.badRequest(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        );
      }

      const existing = await db
        .select({ id: sessions.id, status: sessions.status })
        .from(sessions)
        .where(eq(sessions.id, req.params.id))
        .get();

      if (!existing) return reply.notFound('Session not found');

      const from = existing.status;
      await db
        .update(sessions)
        .set({ status: body.status, updatedAt: new Date().toISOString() })
        .where(eq(sessions.id, req.params.id));

      const action = body.action ?? 'force-status';
      req.log.warn(
        { sessionId: req.params.id, from, to: body.status, action },
        'Ops: forced status transition',
      );

      return { id: req.params.id, from, to: body.status, action, auditedAt: new Date().toISOString() };
    },
  );

  // ── GET /ops/scenarios — list available backup demo scenarios ────
  app.get('/scenarios', async () => {
    return {
      scenarios: SCENARIOS.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
      })),
    };
  });

  // ── POST /ops/scenarios/:scenarioId/run — run a scenario end-to-end ──
  // Creates a session, walks through all intake messages, triggers
  // analysis, and completes it — returns a ready-to-view session.
  app.post<{ Params: { scenarioId: string } }>(
    '/scenarios/:scenarioId/run',
    async (req, reply) => {
      const scenario = SCENARIOS.find((s) => s.id === req.params.scenarioId);
      if (!scenario) {
        return reply.notFound(
          `Unknown scenario '${req.params.scenarioId}'. ` +
          `Available: ${SCENARIOS.map((s) => s.id).join(', ')}`,
        );
      }

      const sessionId = randomUUID();
      const ts = () => new Date().toISOString();
      const now = ts();

      // Seed greeting
      const greeting: ChatMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: getGreeting(),
        timestamp: now,
      };

      let allMessages: ChatMessage[] = [greeting];
      let profile: CareerProfile = {};

      // Walk through all intake inputs
      for (const input of scenario.inputs) {
        const userMsg: ChatMessage = {
          id: randomUUID(),
          role: 'user',
          content: input,
          timestamp: ts(),
        };
        allMessages.push(userMsg);

        const result = processIntakeMessage(allMessages, profile, input);
        profile = { ...profile, ...result.profileUpdate };

        const assistantMsg: ChatMessage = {
          id: randomUUID(),
          role: 'assistant',
          content: result.assistantContent,
          timestamp: ts(),
        };
        allMessages.push(assistantMsg);
      }

      // Insert completed session directly
      await db.insert(sessions).values({
        id: sessionId,
        status: 'complete',
        profile: JSON.stringify(profile),
        messages: JSON.stringify(allMessages),
        recommendations: JSON.stringify(scenario.recommendations),
        createdAt: now,
        updatedAt: ts(),
      });

      req.log.info({ sessionId, scenario: scenario.id }, 'Ops: scenario run completed');

      return reply.status(201).send({
        sessionId,
        scenario: scenario.id,
        name: scenario.name,
        status: 'complete',
        messageCount: allMessages.length,
        recommendationCount: scenario.recommendations.length,
        viewUrl: `/results/${sessionId}`,
        auditedAt: new Date().toISOString(),
      });
    },
  );

  // ── POST /ops/scenarios/run-all — run every scenario, return all session IDs ──
  app.post('/scenarios/run-all', async () => {
    const results = [];
    for (const scenario of SCENARIOS) {
      const res = await app.inject({
        method: 'POST',
        url: `/ops/scenarios/${scenario.id}/run`,
      });
      results.push(res.json());
    }
    return { ran: results.length, sessions: results };
  });
}
