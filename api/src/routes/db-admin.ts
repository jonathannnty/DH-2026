import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sessions } from '../db/schema.js';
import { loadEnv } from '../env.js';
import type { CareerProfile, ChatMessage, CareerRecommendation } from '../schemas/career.js';

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Database admin routes under /ops/db.
 * Snapshot/restore for demo incident recovery.
 */
export async function dbAdminRoutes(app: FastifyInstance): Promise<void> {
  const env = loadEnv();

  // Guard: only in demo mode
  app.addHook('onRequest', async (_req, reply) => {
    if (!env.DEMO_MODE) {
      return reply.forbidden('DB admin routes are only available in DEMO_MODE.');
    }
  });

  // ── POST /ops/db/snapshot — export all sessions as JSON ─────────
  app.post('/snapshot', async () => {
    const rows = await db.select().from(sessions).all();

    const snapshot = rows.map((row) => ({
      id: row.id,
      status: row.status,
      profile: parseJson<CareerProfile>(row.profile, {}),
      messages: parseJson<ChatMessage[]>(row.messages, []),
      recommendations: row.recommendations
        ? parseJson<CareerRecommendation[]>(row.recommendations, [])
        : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return {
      snapshotAt: new Date().toISOString(),
      sessionCount: snapshot.length,
      sessions: snapshot,
    };
  });

  // ── POST /ops/db/restore — restore from a snapshot JSON body ────
  app.post<{ Body: unknown }>(
    '/restore',
    async (req, reply) => {
      const body = req.body as {
        sessions?: Array<{
          id: string;
          status: string;
          profile: unknown;
          messages: unknown;
          recommendations: unknown;
          createdAt: string;
          updatedAt: string;
        }>;
      };

      if (!body.sessions || !Array.isArray(body.sessions)) {
        return reply.badRequest('Body must contain a "sessions" array (from /ops/db/snapshot output).');
      }

      // Wipe existing data
      await db.delete(sessions);

      let restored = 0;
      for (const s of body.sessions) {
        if (!s.id || !s.status || !s.createdAt || !s.updatedAt) {
          app.log.warn({ sessionId: s.id }, 'Skipping malformed session in restore payload');
          continue;
        }
        await db.insert(sessions).values({
          id: s.id,
          status: s.status,
          profile: JSON.stringify(s.profile ?? {}),
          messages: JSON.stringify(s.messages ?? []),
          recommendations: s.recommendations ? JSON.stringify(s.recommendations) : null,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        });
        restored++;
      }

      return {
        restored,
        skipped: body.sessions.length - restored,
        message: `Restored ${restored} sessions. Previous data was wiped.`,
      };
    },
  );

  // ── GET /ops/db/stats — database metrics ────────────────────────
  app.get('/stats', async () => {
    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .get();

    const byStatus = await db
      .select({
        status: sessions.status,
        count: sql<number>`count(*)`,
      })
      .from(sessions)
      .groupBy(sessions.status)
      .all();

    const oldest = await db
      .select({ createdAt: sessions.createdAt })
      .from(sessions)
      .orderBy(sessions.createdAt)
      .limit(1)
      .get();

    const newest = await db
      .select({ createdAt: sessions.createdAt })
      .from(sessions)
      .orderBy(sql`${sessions.createdAt} DESC`)
      .limit(1)
      .get();

    return {
      totalSessions: total?.count ?? 0,
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
      oldestSession: oldest?.createdAt ?? null,
      newestSession: newest?.createdAt ?? null,
    };
  });
}
