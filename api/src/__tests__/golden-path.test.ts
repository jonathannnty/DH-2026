import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';
import { DEMO_INPUTS, DEMO_EXPECTED_PROFILE, DEMO_RECOMMENDATIONS } from '../services/demo.js';

// Force demo mode + in-memory DB for tests
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

describe('Golden-path integration: full intake → analyze → recommendations', () => {
  let sessionId: string;

  it('POST /sessions — creates session with greeting', async () => {
    const res = await app.inject({ method: 'POST', url: '/sessions' });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe('intake');
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('assistant');
    expect(body.profile).toEqual({});

    sessionId = body.id;
    expect(sessionId).toBeTruthy();
  });

  it('GET /sessions/:id — returns the session', async () => {
    const res = await app.inject({ method: 'GET', url: `/sessions/${sessionId}` });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(sessionId);
    expect(body.status).toBe('intake');
  });

  it('walks through all 12 intake questions with demo inputs', async () => {
    for (let i = 0; i < DEMO_INPUTS.length; i++) {
      const res = await app.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/messages`,
        payload: { content: DEMO_INPUTS[i] },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.message.role).toBe('assistant');
      expect(body.message.content.length).toBeGreaterThan(0);
      expect(body.profileUpdate).toBeDefined();
    }
  });

  it('final profile matches DEMO_EXPECTED_PROFILE', async () => {
    const res = await app.inject({ method: 'GET', url: `/sessions/${sessionId}` });
    const body = res.json();

    // Check each field individually for clear failure messages
    expect(body.profile.interests).toEqual(DEMO_EXPECTED_PROFILE.interests);
    expect(body.profile.values).toEqual(DEMO_EXPECTED_PROFILE.values);
    expect(body.profile.workingStyle).toBe(DEMO_EXPECTED_PROFILE.workingStyle);
    expect(body.profile.hardSkills).toEqual(DEMO_EXPECTED_PROFILE.hardSkills);
    expect(body.profile.softSkills).toEqual(DEMO_EXPECTED_PROFILE.softSkills);
    expect(body.profile.riskTolerance).toBe(DEMO_EXPECTED_PROFILE.riskTolerance);
    expect(body.profile.financialNeeds).toEqual(DEMO_EXPECTED_PROFILE.financialNeeds);
    expect(body.profile.geographicFlexibility).toBe(DEMO_EXPECTED_PROFILE.geographicFlexibility);
    expect(body.profile.educationLevel).toBe(DEMO_EXPECTED_PROFILE.educationLevel);
    expect(body.profile.timelineUrgency).toBe(DEMO_EXPECTED_PROFILE.timelineUrgency);
    expect(body.profile.purposePriorities).toEqual(DEMO_EXPECTED_PROFILE.purposePriorities);
    expect(body.profile.burnoutConcerns).toEqual(DEMO_EXPECTED_PROFILE.burnoutConcerns);
  });

  it('last assistant message indicates intake is complete', async () => {
    const res = await app.inject({ method: 'GET', url: `/sessions/${sessionId}` });
    const body = res.json();
    const lastMsg = body.messages[body.messages.length - 1];

    expect(lastMsg.role).toBe('assistant');
    expect(lastMsg.content).toContain('profile is ready for analysis');
  });

  it('POST /sessions/:id/analyze — triggers analysis in demo mode', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/analyze`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('session status is now analyzing', async () => {
    const res = await app.inject({ method: 'GET', url: `/sessions/${sessionId}` });
    expect(res.json().status).toBe('analyzing');
  });

  it('GET /sessions/:id/stream — emits demo SSE sequence and completes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/sessions/${sessionId}/stream`,
    });

    // fastify.inject returns the full response body for SSE
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');

    const lines = res.body
      .split('\n')
      .filter((l: string) => l.startsWith('data: '))
      .map((l: string) => JSON.parse(l.slice(6)));

    // Should have: status + 4 progress + 1 complete = 6 events
    expect(lines.length).toBe(6);
    expect(lines[0].type).toBe('status');
    expect(lines[1].type).toBe('progress');
    expect(lines[1].payload.progress).toBe(25);
    expect(lines[4].type).toBe('progress');
    expect(lines[4].payload.progress).toBe(100);
    expect(lines[5].type).toBe('complete');
  });

  it('session status is now complete', async () => {
    const res = await app.inject({ method: 'GET', url: `/sessions/${sessionId}` });
    expect(res.json().status).toBe('complete');
  });

  it('GET /sessions/:id/recommendations — returns demo recommendations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/sessions/${sessionId}/recommendations`,
    });

    expect(res.statusCode).toBe(200);
    const recs = res.json();
    expect(recs).toHaveLength(DEMO_RECOMMENDATIONS.length);

    // Verify structure and key data points
    expect(recs[0].title).toBe('AI/ML Engineer — EdTech');
    expect(recs[0].fitScore).toBe(92);
    expect(recs[1].title).toBe('Creative Technologist — Audio/Music AI');
    expect(recs[2].title).toBe('Developer Advocate — AI Platform');

    // Each recommendation has required fields
    for (const rec of recs) {
      expect(rec.title).toBeTruthy();
      expect(rec.summary).toBeTruthy();
      expect(rec.fitScore).toBeGreaterThanOrEqual(0);
      expect(rec.fitScore).toBeLessThanOrEqual(100);
      expect(rec.reasons.length).toBeGreaterThan(0);
      expect(rec.nextSteps.length).toBeGreaterThan(0);
    }
  });
});

describe('Error-path guards', () => {
  it('GET /sessions/nonexistent — 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/sessions/nonexistent' });
    expect(res.statusCode).toBe(404);
  });

  it('POST /sessions/:id/messages with empty content — 400', async () => {
    const setup = await app.inject({ method: 'POST', url: '/sessions' });
    const id = setup.json().id;

    const res = await app.inject({
      method: 'POST',
      url: `/sessions/${id}/messages`,
      payload: { content: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /sessions/:id/messages with no body — 400', async () => {
    const setup = await app.inject({ method: 'POST', url: '/sessions' });
    const id = setup.json().id;

    const res = await app.inject({
      method: 'POST',
      url: `/sessions/${id}/messages`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /sessions/:id/analyze on complete session — 400 (invalid transition)', async () => {
    // Create + complete a session via demo mode
    const setup = await app.inject({ method: 'POST', url: '/sessions' });
    const id = setup.json().id;

    // Walk through intake
    for (const input of DEMO_INPUTS) {
      await app.inject({
        method: 'POST',
        url: `/sessions/${id}/messages`,
        payload: { content: input },
      });
    }

    // Analyze
    await app.inject({ method: 'POST', url: `/sessions/${id}/analyze` });

    // Stream to complete
    await app.inject({ method: 'GET', url: `/sessions/${id}/stream` });

    // Try analyze again — should fail
    const res = await app.inject({ method: 'POST', url: `/sessions/${id}/analyze` });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('Cannot transition');
  });

  it('GET /sessions/:id/recommendations on intake session — 400', async () => {
    const setup = await app.inject({ method: 'POST', url: '/sessions' });
    const id = setup.json().id;

    const res = await app.inject({ method: 'GET', url: `/sessions/${id}/recommendations` });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('intake');
  });

  it('POST /sessions/:id/messages on analyzing session — 400', async () => {
    const setup = await app.inject({ method: 'POST', url: '/sessions' });
    const id = setup.json().id;

    // Skip to analyzing
    for (const input of DEMO_INPUTS) {
      await app.inject({
        method: 'POST',
        url: `/sessions/${id}/messages`,
        payload: { content: input },
      });
    }
    await app.inject({ method: 'POST', url: `/sessions/${id}/analyze` });

    const res = await app.inject({
      method: 'POST',
      url: `/sessions/${id}/messages`,
      payload: { content: 'more info' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('analyzing');
  });

  it('GET /health — returns ok with db status', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    expect(typeof body.uptime).toBe('number');
  });
});
