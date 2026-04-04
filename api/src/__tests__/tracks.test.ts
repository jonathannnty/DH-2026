import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';
import { TRACK_REGISTRY } from '../services/tracks.js';

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

describe('Track registry API', () => {
  it('GET /tracks — returns all tracks', async () => {
    const res = await app.inject({ method: 'GET', url: '/tracks' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tracks).toHaveLength(TRACK_REGISTRY.length);
    expect(body.tracks[0]).toHaveProperty('id');
    expect(body.tracks[0]).toHaveProperty('name');
    expect(body.tracks[0]).toHaveProperty('sponsor');
    expect(body.tracks[0]).toHaveProperty('description');
  });

  it('GET /tracks/:trackId — returns a single track', async () => {
    const res = await app.inject({ method: 'GET', url: '/tracks/general' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe('general');
    expect(body.name).toBe('General Career Advising');
  });

  it('GET /tracks/:trackId — 404 for unknown track', async () => {
    const res = await app.inject({ method: 'GET', url: '/tracks/nonexistent' });
    expect(res.statusCode).toBe(404);
  });
});

describe('Session creation with trackId', () => {
  it('POST /sessions with trackId — persists track on session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: { trackId: 'tech-career' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.trackId).toBe('tech-career');
  });

  it('POST /sessions without trackId — trackId is null', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: {},
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.trackId).toBeNull();
  });

  it('POST /sessions with invalid trackId — 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: { trackId: 'fake-track' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('Unknown track');
  });

  it('GET /sessions/:id — returns trackId', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: { trackId: 'healthcare-pivot' },
    });
    const id = create.json().id;

    const res = await app.inject({ method: 'GET', url: `/sessions/${id}` });

    expect(res.statusCode).toBe(200);
    expect(res.json().trackId).toBe('healthcare-pivot');
  });

  it('trackId persists through full intake → analyze → complete flow', async () => {
    const { DEMO_INPUTS } = await import('../services/demo.js');

    // Create with track
    const create = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: { trackId: 'creative-industry' },
    });
    const id = create.json().id;

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

    // Verify trackId is still there
    const final = await app.inject({ method: 'GET', url: `/sessions/${id}` });
    expect(final.json().trackId).toBe('creative-industry');
    expect(final.json().status).toBe('complete');
  });
});
