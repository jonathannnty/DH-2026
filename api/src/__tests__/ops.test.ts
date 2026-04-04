import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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

// Reset DB between groups
beforeEach(async () => {
  await app.inject({ method: 'POST', url: '/ops/reset' });
});

// ─── Helper: fast-forward a session through full intake ──────────
async function createCompletedSession(): Promise<string> {
  const create = await app.inject({ method: 'POST', url: '/sessions' });
  const id: string = create.json().id;
  for (const input of DEMO_INPUTS) {
    await app.inject({
      method: 'POST',
      url: `/sessions/${id}/messages`,
      payload: { content: input },
    });
  }
  return id;
}

describe('Ops: control panel', () => {
  it('GET /ops/status — returns dashboard snapshot', async () => {
    // Create two sessions
    await app.inject({ method: 'POST', url: '/sessions' });
    await app.inject({ method: 'POST', url: '/sessions' });

    const res = await app.inject({ method: 'GET', url: '/ops/status' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.demoMode).toBe(true);
    expect(body.sessionCount).toBe(2);
    expect(body.byStatus.intake).toBe(2);
  });

  it('GET /ops/sessions — lists sessions with message counts', async () => {
    const create = await app.inject({ method: 'POST', url: '/sessions' });
    const id: string = create.json().id;

    // Send one message (creates 2 msgs: user + assistant, plus 1 greeting = 3)
    await app.inject({
      method: 'POST',
      url: `/sessions/${id}/messages`,
      payload: { content: 'hello' },
    });

    const res = await app.inject({ method: 'GET', url: '/ops/sessions' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].id).toBe(id);
    expect(body.sessions[0].messageCount).toBe(3); // greeting + user + assistant
  });

  it('GET /ops/sessions/:id/full — returns full session dump', async () => {
    const create = await app.inject({ method: 'POST', url: '/sessions' });
    const id: string = create.json().id;

    const res = await app.inject({ method: 'GET', url: `/ops/sessions/${id}/full` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(id);
    expect(body.messages).toHaveLength(1);
    expect(body.profile).toEqual({});
  });

  it('DELETE /ops/sessions/:id — deletes a session', async () => {
    const create = await app.inject({ method: 'POST', url: '/sessions' });
    const id: string = create.json().id;

    const del = await app.inject({ method: 'DELETE', url: `/ops/sessions/${id}` });
    expect(del.statusCode).toBe(200);
    expect(del.json().deleted).toBe(id);

    // Verify it's gone
    const get = await app.inject({ method: 'GET', url: `/sessions/${id}` });
    expect(get.statusCode).toBe(404);
  });

  it('POST /ops/reset — wipes all sessions', async () => {
    await app.inject({ method: 'POST', url: '/sessions' });
    await app.inject({ method: 'POST', url: '/sessions' });
    await app.inject({ method: 'POST', url: '/sessions' });

    const res = await app.inject({ method: 'POST', url: '/ops/reset' });
    expect(res.statusCode).toBe(200);
    expect(res.json().wiped).toBe(3);

    const status = await app.inject({ method: 'GET', url: '/ops/status' });
    expect(status.json().sessionCount).toBe(0);
  });

  it('POST /ops/sessions/:id/force-status — overrides status', async () => {
    const create = await app.inject({ method: 'POST', url: '/sessions' });
    const id: string = create.json().id;

    const force = await app.inject({
      method: 'POST',
      url: `/ops/sessions/${id}/force-status`,
      payload: { status: 'complete' },
    });
    expect(force.statusCode).toBe(200);
    expect(force.json()).toEqual({ id, from: 'intake', to: 'complete' });

    // Verify
    const get = await app.inject({ method: 'GET', url: `/sessions/${id}` });
    expect(get.json().status).toBe('complete');
  });

  it('POST /ops/sessions/:id/force-status — rejects invalid status', async () => {
    const create = await app.inject({ method: 'POST', url: '/sessions' });
    const id: string = create.json().id;

    const res = await app.inject({
      method: 'POST',
      url: `/ops/sessions/${id}/force-status`,
      payload: { status: 'bogus' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Ops: DB admin — snapshot/restore', () => {
  it('POST /ops/db/snapshot + restore round-trip', async () => {
    // Create a session with some data
    const id = await createCompletedSession();

    // Snapshot
    const snapRes = await app.inject({ method: 'POST', url: '/ops/db/snapshot' });
    expect(snapRes.statusCode).toBe(200);
    const snapshot = snapRes.json();
    expect(snapshot.sessionCount).toBe(1);
    expect(snapshot.sessions[0].id).toBe(id);

    // Wipe
    await app.inject({ method: 'POST', url: '/ops/reset' });
    const afterWipe = await app.inject({ method: 'GET', url: '/ops/status' });
    expect(afterWipe.json().sessionCount).toBe(0);

    // Restore
    const restoreRes = await app.inject({
      method: 'POST',
      url: '/ops/db/restore',
      payload: { sessions: snapshot.sessions },
    });
    expect(restoreRes.statusCode).toBe(200);
    expect(restoreRes.json().restored).toBe(1);

    // Verify session is back
    const get = await app.inject({ method: 'GET', url: `/sessions/${id}` });
    expect(get.statusCode).toBe(200);
    expect(get.json().id).toBe(id);
  });

  it('POST /ops/db/restore — rejects missing sessions array', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ops/db/restore',
      payload: { notSessions: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /ops/db/stats — returns database metrics', async () => {
    await app.inject({ method: 'POST', url: '/sessions' });
    await app.inject({ method: 'POST', url: '/sessions' });

    const res = await app.inject({ method: 'GET', url: '/ops/db/stats' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalSessions).toBe(2);
    expect(body.byStatus.intake).toBe(2);
    expect(body.oldestSession).toBeTruthy();
    expect(body.newestSession).toBeTruthy();
  });
});

describe('Ready: pre-demo self-test', () => {
  it('GET /ready — runs golden-path dry run and returns checklist', async () => {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.ready).toBe(true);
    expect(body.totalMs).toBeGreaterThan(0);

    // Verify all checks passed
    for (const check of body.checks) {
      expect(check.pass).toBe(true);
      expect(check.name).toBeTruthy();
      expect(typeof check.ms).toBe('number');
    }

    // Should have at least: db, demo_mode, golden_path, profile, recommendations
    const checkNames = body.checks.map((c: { name: string }) => c.name);
    expect(checkNames).toContain('db_connection');
    expect(checkNames).toContain('demo_mode');
    expect(checkNames).toContain('golden_path_dry_run');
    expect(checkNames).toContain('profile_extraction');
    expect(checkNames).toContain('recommendations_shape');
  });

  it('GET /ready — dry run cleans up after itself', async () => {
    // Run ready check
    await app.inject({ method: 'GET', url: '/ready' });

    // Should have 0 sessions (dry run deletes its session)
    const status = await app.inject({ method: 'GET', url: '/ops/status' });
    expect(status.json().sessionCount).toBe(0);
  });
});
