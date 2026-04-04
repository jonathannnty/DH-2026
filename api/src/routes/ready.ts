import type { FastifyInstance } from 'fastify';
import { dbHealthCheck } from '../db/client.js';
import { loadEnv } from '../env.js';
import { DEMO_INPUTS, DEMO_EXPECTED_PROFILE } from '../services/demo.js';

interface CheckResult {
  name: string;
  pass: boolean;
  ms: number;
  detail?: string;
}

/**
 * GET /ready — pre-demo self-test.
 *
 * Runs a full golden-path dry run against itself using fastify.inject()
 * (no network, no ports). Returns a structured pass/fail checklist.
 *
 * Designed to be hit once before a live demo to confirm everything works.
 */
export async function readyRoutes(app: FastifyInstance): Promise<void> {
  app.get('/ready', async (_req, reply) => {
    const env = loadEnv();
    const checks: CheckResult[] = [];
    const t0 = Date.now();

    // ── 1. Database ──
    const dbStart = Date.now();
    const dbOk = dbHealthCheck();
    checks.push({
      name: 'db_connection',
      pass: dbOk,
      ms: Date.now() - dbStart,
      detail: dbOk ? 'SQLite responds to SELECT 1' : 'Database unreachable',
    });

    if (!dbOk) {
      return reply.status(503).send({ ready: false, checks, totalMs: Date.now() - t0 });
    }

    // ── 2. Demo mode active ──
    checks.push({
      name: 'demo_mode',
      pass: env.DEMO_MODE,
      ms: 0,
      detail: env.DEMO_MODE ? 'DEMO_MODE=true' : 'DEMO_MODE is off — demo features disabled',
    });

    // ── 3. Golden-path dry run (only in demo mode) ──
    if (env.DEMO_MODE) {
      const dryRunStart = Date.now();
      const dryResult = await runGoldenPathDryRun(app);
      checks.push({
        name: 'golden_path_dry_run',
        pass: dryResult.pass,
        ms: Date.now() - dryRunStart,
        detail: dryResult.pass
          ? `Full intake (${DEMO_INPUTS.length} steps) + analyze + stream + recommendations OK`
          : dryResult.error,
      });

      // ── 4. Profile extraction accuracy ──
      if (dryResult.profile) {
        const mismatches: string[] = [];
        for (const key of Object.keys(DEMO_EXPECTED_PROFILE) as (keyof typeof DEMO_EXPECTED_PROFILE)[]) {
          const expected = JSON.stringify(DEMO_EXPECTED_PROFILE[key]);
          const actual = JSON.stringify(dryResult.profile[key]);
          if (expected !== actual) {
            mismatches.push(`${key}: expected ${expected}, got ${actual}`);
          }
        }
        checks.push({
          name: 'profile_extraction',
          pass: mismatches.length === 0,
          ms: 0,
          detail: mismatches.length === 0
            ? `All ${Object.keys(DEMO_EXPECTED_PROFILE).length} fields match expected values`
            : `Mismatches: ${mismatches.join('; ')}`,
        });
      }

      // ── 5. Recommendations shape ──
      if (dryResult.recommendations) {
        const recsOk =
          dryResult.recommendations.length === 3 &&
          dryResult.recommendations.every(
            (r: Record<string, unknown>) =>
              typeof r.title === 'string' &&
              typeof r.fitScore === 'number' &&
              Array.isArray(r.reasons),
          );
        checks.push({
          name: 'recommendations_shape',
          pass: recsOk,
          ms: 0,
          detail: recsOk
            ? `3 recommendations, all with title/fitScore/reasons`
            : 'Unexpected recommendation shape',
        });
      }
    }

    // ── 6. Cleanup: delete the dry-run session ──
    // (already handled inside runGoldenPathDryRun)

    const allPass = checks.every((c) => c.pass);
    return reply.status(allPass ? 200 : 503).send({
      ready: allPass,
      checks,
      totalMs: Date.now() - t0,
    });
  });
}

// ─── Internal dry-run ──────────────────────────────────────────────

interface DryRunResult {
  pass: boolean;
  error?: string;
  sessionId?: string;
  profile?: Record<string, unknown>;
  recommendations?: Record<string, unknown>[];
}

async function runGoldenPathDryRun(app: FastifyInstance): Promise<DryRunResult> {
  try {
    // Create session
    const createRes = await app.inject({ method: 'POST', url: '/sessions' });
    if (createRes.statusCode !== 201) {
      return { pass: false, error: `POST /sessions returned ${createRes.statusCode}` };
    }
    const sessionId: string = createRes.json().id;

    // Walk all intake steps
    for (let i = 0; i < DEMO_INPUTS.length; i++) {
      const msgRes = await app.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/messages`,
        payload: { content: DEMO_INPUTS[i] },
      });
      if (msgRes.statusCode !== 200) {
        return { pass: false, error: `Message step ${i + 1} returned ${msgRes.statusCode}: ${msgRes.body}`, sessionId };
      }
    }

    // Get profile
    const sessionRes = await app.inject({ method: 'GET', url: `/sessions/${sessionId}` });
    const profile = sessionRes.json().profile as Record<string, unknown>;

    // Trigger analysis
    const analyzeRes = await app.inject({ method: 'POST', url: `/sessions/${sessionId}/analyze` });
    if (analyzeRes.statusCode !== 200) {
      return { pass: false, error: `POST /analyze returned ${analyzeRes.statusCode}`, sessionId, profile };
    }

    // Stream to completion
    const streamRes = await app.inject({ method: 'GET', url: `/sessions/${sessionId}/stream` });
    if (streamRes.statusCode !== 200) {
      return { pass: false, error: `GET /stream returned ${streamRes.statusCode}`, sessionId, profile };
    }

    // Fetch recommendations
    const recsRes = await app.inject({ method: 'GET', url: `/sessions/${sessionId}/recommendations` });
    if (recsRes.statusCode !== 200) {
      return { pass: false, error: `GET /recommendations returned ${recsRes.statusCode}`, sessionId, profile };
    }
    const recommendations = recsRes.json() as Record<string, unknown>[];

    // Cleanup: delete the dry-run session
    await app.inject({ method: 'DELETE', url: `/ops/sessions/${sessionId}` });

    return { pass: true, sessionId, profile, recommendations };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}
