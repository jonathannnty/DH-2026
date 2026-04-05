/**
 * Contract tests — enforce invariants on session/SSE state transitions.
 *
 * Idea 1: intakeComplete is a deterministic field, not phrase-matched.
 * Idea 4: /analyze is idempotent (double-trigger returns ok, no duplicate run).
 * Idea 6: SSE event ordering — DB must be written before 'complete' fires.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';
import { DEMO_INPUTS } from '../services/demo.js';

process.env.DEMO_MODE = 'true';
process.env.DATABASE_URL = ':memory:';

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createSession(): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/sessions' });
  return res.json<{ id: string }>().id;
}

async function walkAllIntakeInputs(sessionId: string): Promise<void> {
  for (const input of DEMO_INPUTS) {
    await app.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/messages`,
      payload: { content: input },
    });
  }
}

// ── intakeComplete contract ────────────────────────────────────────────────────

describe('intakeComplete is deterministic (Idea 1 & 3)', () => {
  it('is false for a brand-new session', async () => {
    const id = await createSession();
    const res = await app.inject({ method: 'GET', url: `/sessions/${id}` });
    expect(res.json().intakeComplete).toBe(false);
  });

  it('is false after partial answers', async () => {
    const id = await createSession();
    // Answer only 3 questions
    for (const input of DEMO_INPUTS.slice(0, 3)) {
      await app.inject({
        method: 'POST',
        url: `/sessions/${id}/messages`,
        payload: { content: input },
      });
    }
    const res = await app.inject({ method: 'GET', url: `/sessions/${id}` });
    expect(res.json().intakeComplete).toBe(false);
  });

  it('is true after all questions are answered', async () => {
    const id = await createSession();
    await walkAllIntakeInputs(id);
    const res = await app.inject({ method: 'GET', url: `/sessions/${id}` });
    expect(res.json().intakeComplete).toBe(true);
  });

  it('send-message response carries intakeComplete on the final answer', async () => {
    const id = await createSession();
    // Walk all but the last
    for (const input of DEMO_INPUTS.slice(0, -1)) {
      await app.inject({
        method: 'POST',
        url: `/sessions/${id}/messages`,
        payload: { content: input },
      });
    }
    // Final answer
    const res = await app.inject({
      method: 'POST',
      url: `/sessions/${id}/messages`,
      payload: { content: DEMO_INPUTS[DEMO_INPUTS.length - 1] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().intakeComplete).toBe(true);
  });

  it('send-message response carries intakeComplete=false for non-final answers', async () => {
    const id = await createSession();
    const res = await app.inject({
      method: 'POST',
      url: `/sessions/${id}/messages`,
      payload: { content: DEMO_INPUTS[0] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().intakeComplete).toBe(false);
  });
});

// ── Idempotent /analyze (Idea 4) ─────────────────────────────────────────────

describe('/analyze is idempotent (Idea 4)', () => {
  it('returns ok on first trigger', async () => {
    const id = await createSession();
    await walkAllIntakeInputs(id);
    const res = await app.inject({ method: 'POST', url: `/sessions/${id}/analyze` });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('returns ok on second trigger without error (idempotent)', async () => {
    const id = await createSession();
    await walkAllIntakeInputs(id);
    await app.inject({ method: 'POST', url: `/sessions/${id}/analyze` });
    // Double-trigger — must not 400 or 500
    const res = await app.inject({ method: 'POST', url: `/sessions/${id}/analyze` });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(res.json().alreadyAnalyzing).toBe(true);
  });

  it('rejects trigger from complete status', async () => {
    const id = await createSession();
    await walkAllIntakeInputs(id);
    await app.inject({ method: 'POST', url: `/sessions/${id}/analyze` });
    // Run the SSE stream to complete the session
    await app.inject({ method: 'GET', url: `/sessions/${id}/stream` });
    // Now session is complete — triggering again must be rejected
    const res = await app.inject({ method: 'POST', url: `/sessions/${id}/analyze` });
    expect(res.statusCode).toBe(400);
  });
});

// ── SSE ordering contract (Idea 6) ───────────────────────────────────────────

describe('SSE stream: DB written before complete event fires', () => {
  it('session status is complete by the time complete event is emitted', async () => {
    const id = await createSession();
    await walkAllIntakeInputs(id);
    await app.inject({ method: 'POST', url: `/sessions/${id}/analyze` });

    // Consume the full SSE response synchronously
    const streamRes = await app.inject({ method: 'GET', url: `/sessions/${id}/stream` });

    const events = streamRes.body
      .split('\n')
      .filter((l: string) => l.startsWith('data: '))
      .map((l: string) => JSON.parse(l.slice(6)));

    const completeEvent = events.find((e: { type: string }) => e.type === 'complete');
    expect(completeEvent).toBeDefined();

    // After the SSE body is fully consumed, the DB must already be updated
    const sessionRes = await app.inject({ method: 'GET', url: `/sessions/${id}` });
    expect(sessionRes.json().status).toBe('complete');
  });

  it('recommendations are available immediately after complete event', async () => {
    const id = await createSession();
    await walkAllIntakeInputs(id);
    await app.inject({ method: 'POST', url: `/sessions/${id}/analyze` });
    await app.inject({ method: 'GET', url: `/sessions/${id}/stream` });

    const recsRes = await app.inject({
      method: 'GET',
      url: `/sessions/${id}/recommendations`,
    });
    expect(recsRes.statusCode).toBe(200);
    expect(recsRes.json()).toBeInstanceOf(Array);
    expect(recsRes.json().length).toBeGreaterThan(0);
  });

  it('complete event is the last SSE event', async () => {
    const id = await createSession();
    await walkAllIntakeInputs(id);
    await app.inject({ method: 'POST', url: `/sessions/${id}/analyze` });
    const streamRes = await app.inject({ method: 'GET', url: `/sessions/${id}/stream` });

    const events = streamRes.body
      .split('\n')
      .filter((l: string) => l.startsWith('data: '))
      .map((l: string) => JSON.parse(l.slice(6)));

    expect(events[events.length - 1].type).toBe('complete');
  });
});
