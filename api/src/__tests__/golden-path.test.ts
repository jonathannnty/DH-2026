import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';
import { DEMO_INPUTS, DEMO_EXPECTED_PROFILE, DEMO_RECOMMENDATIONS } from '../services/demo.js';
import { generatePersonalizedFallback } from '../services/personalizedFallback.js';
import { TechCareerAdapter, HealthcarePivotAdapter, CreativeIndustryAdapter } from '../services/adapters.js';
import type { CareerProfile } from '../schemas/career.js';

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

    // Should have: status + 5 progress + 1 complete = 7 events
    expect(lines.length).toBe(7);
    expect(lines[0].type).toBe('status');
    expect(lines[1].type).toBe('progress');
    expect(lines[1].payload.progress).toBe(20);
    expect(lines[5].type).toBe('progress');
    expect(lines[5].payload.progress).toBe(100);
    expect(lines[6].type).toBe('complete');
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

// ─────────────────────────────────────────────────────────────────────────────
// Personalized fallback engine tests
// ─────────────────────────────────────────────────────────────────────────────

describe('generatePersonalizedFallback — output is profile-derived and non-generic', () => {
  const mlProfile: CareerProfile = {
    interests: ['machine learning', 'education'],
    values: ['autonomy', 'impact'],
    hardSkills: ['Python', 'PyTorch', 'Kubernetes'],
    softSkills: ['mentorship', 'communication'],
    riskTolerance: 'medium',
    geographicFlexibility: 'remote',
    financialNeeds: { minimumSalary: 90_000, targetSalary: 150_000 },
    timelineUrgency: 'short',
    purposePriorities: ['helping people learn'],
    burnoutConcerns: ['constant meetings'],
  };

  const creativeProfile: CareerProfile = {
    interests: ['film', 'generative art'],
    values: ['creative expression', 'autonomy'],
    hardSkills: ['TypeScript', 'Three.js'],
    softSkills: ['creativity', 'communication'],
    riskTolerance: 'high',
    geographicFlexibility: 'remote',
    financialNeeds: { targetSalary: 110_000 },
  };

  it('returns exactly 3 recommendations', () => {
    const recs = generatePersonalizedFallback(mlProfile, 'tech-career');
    expect(recs).toHaveLength(3);
  });

  it('all recs have required fields with valid values', () => {
    const recs = generatePersonalizedFallback(mlProfile, 'tech-career');
    for (const rec of recs) {
      expect(rec.title.length).toBeGreaterThan(0);
      expect(rec.summary.length).toBeGreaterThan(10);
      expect(rec.fitScore).toBeGreaterThanOrEqual(0);
      expect(rec.fitScore).toBeLessThanOrEqual(100);
      expect(rec.reasons.length).toBeGreaterThanOrEqual(2);
      expect(rec.nextSteps.length).toBeGreaterThanOrEqual(2);
      expect(rec.concerns.length).toBeGreaterThanOrEqual(1);
      expect(rec.salaryRange).toBeDefined();
    }
  });

  it('summary contains a signal-match rationale referencing actual profile skills', () => {
    const recs = generatePersonalizedFallback(mlProfile, 'tech-career');
    // At least one rec's summary should reference actual skills from the profile
    const refsSkills = recs.some(
      (r) => r.summary.includes('Python') || r.summary.includes('PyTorch') || r.summary.includes('Kubernetes'),
    );
    expect(refsSkills).toBe(true);
  });

  it('recommendations differ meaningfully between two distinct profiles', () => {
    const techRecs = generatePersonalizedFallback(mlProfile, 'tech-career');
    const creativeRecs = generatePersonalizedFallback(creativeProfile, 'creative-industry');

    // Titles must differ
    const techTitles = techRecs.map((r) => r.title);
    const creativeTitles = creativeRecs.map((r) => r.title);
    const overlap = techTitles.filter((t) => creativeTitles.includes(t));
    expect(overlap).toHaveLength(0);

    // Summaries must differ
    expect(techRecs[0].summary).not.toBe(creativeRecs[0].summary);
  });

  it('same profile always produces the same output (deterministic)', () => {
    const a = generatePersonalizedFallback(mlProfile, 'tech-career');
    const b = generatePersonalizedFallback(mlProfile, 'tech-career');
    expect(a.map((r) => r.title)).toEqual(b.map((r) => r.title));
    expect(a.map((r) => r.fitScore)).toEqual(b.map((r) => r.fitScore));
  });

  it('fitScores are sorted descending (highest fit first)', () => {
    const recs = generatePersonalizedFallback(mlProfile, 'tech-career');
    for (let i = 0; i < recs.length - 1; i++) {
      expect(recs[i].fitScore).toBeGreaterThanOrEqual(recs[i + 1].fitScore);
    }
  });

  it('salary range is adjusted upward when profile has a high targetSalary', () => {
    const highSalaryProfile: CareerProfile = {
      ...mlProfile,
      financialNeeds: { targetSalary: 300_000 },
    };
    const recs = generatePersonalizedFallback(highSalaryProfile, 'tech-career');
    // Salary low should be at least 85% of 300k = 255k
    expect(recs[0].salaryRange!.low).toBeGreaterThanOrEqual(255_000);
  });

  it('burnout concerns from profile surface in recommendation concerns', () => {
    const profile: CareerProfile = {
      ...mlProfile,
      burnoutConcerns: ['constant meetings'],
    };
    const recs = generatePersonalizedFallback(profile, 'tech-career');
    const allConcerns = recs.flatMap((r) => r.concerns).join(' ');
    expect(allConcerns.toLowerCase()).toContain('meeting');
  });

  it('works safely with a completely sparse profile (no fields set)', () => {
    const sparse: CareerProfile = {};
    const recs = generatePersonalizedFallback(sparse, 'general');
    expect(recs).toHaveLength(3);
    for (const rec of recs) {
      expect(rec.title.length).toBeGreaterThan(0);
      expect(rec.reasons.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('all 4 tracks produce distinct top recommendation titles', () => {
    const tracks = ['tech-career', 'healthcare-pivot', 'creative-industry', 'general'];
    const topTitles = tracks.map((t) => generatePersonalizedFallback(mlProfile, t)[0].title);
    const unique = new Set(topTitles);
    expect(unique.size).toBe(tracks.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Track enrichment adapter tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Track enrichment adapters — output is track-specific and non-generic', () => {
  const baseProfile: CareerProfile = {
    hardSkills: ['Python', 'machine learning'],
    values: ['autonomy'],
    geographicFlexibility: 'remote',
  };

  const baseRecs = () => generatePersonalizedFallback(baseProfile, 'tech-career');

  it('TechCareerAdapter adds a certification step to the top recommendation', async () => {
    const adapter = new TechCareerAdapter();
    const recs = await adapter.enrich(baseProfile, baseRecs());
    const topSteps = recs[0].nextSteps.join(' ');
    expect(topSteps).toMatch(/TechCorp Track/i);
    expect(topSteps).toMatch(/cert/i);
  });

  it('TechCareerAdapter adds a company list to the top recommendation', async () => {
    const adapter = new TechCareerAdapter();
    const recs = await adapter.enrich(baseProfile, baseRecs());
    const topSteps = recs[0].nextSteps.join(' ');
    expect(topSteps).toMatch(/Anthropic|Stripe|Databricks/);
  });

  it('TechCareerAdapter enforces minimum salary floor on all recs', async () => {
    const adapter = new TechCareerAdapter();
    // Use a profile with no targetSalary so base salary is not inflated
    const recs = await adapter.enrich({}, baseRecs());
    for (const rec of recs) {
      if (rec.salaryRange) {
        expect(rec.salaryRange.low).toBeGreaterThanOrEqual(160_000);
      }
    }
  });

  it('HealthcarePivotAdapter adds a healthcare certification step', async () => {
    const adapter = new HealthcarePivotAdapter();
    const healthRecs = generatePersonalizedFallback(baseProfile, 'healthcare-pivot');
    const enriched = await adapter.enrich(baseProfile, healthRecs);
    const topSteps = enriched[0].nextSteps.join(' ');
    expect(topSteps).toMatch(/HealthBridge Track/i);
    expect(topSteps).toMatch(/CHDA|CPHIMS/);
  });

  it('HealthcarePivotAdapter adds health-tech company targets', async () => {
    const adapter = new HealthcarePivotAdapter();
    const healthRecs = generatePersonalizedFallback(baseProfile, 'healthcare-pivot');
    const enriched = await adapter.enrich(baseProfile, healthRecs);
    const topSteps = enriched[0].nextSteps.join(' ');
    expect(topSteps).toMatch(/Epic|Cerner|Viz\.ai|Tempus/);
  });

  it('CreativeIndustryAdapter adds a portfolio building step', async () => {
    const adapter = new CreativeIndustryAdapter();
    const creativeRecs = generatePersonalizedFallback(baseProfile, 'creative-industry');
    const enriched = await adapter.enrich(baseProfile, creativeRecs);
    const topSteps = enriched[0].nextSteps.join(' ');
    expect(topSteps).toMatch(/CreativeForge Track/i);
  });

  it('CreativeIndustryAdapter adds creative company targets', async () => {
    const adapter = new CreativeIndustryAdapter();
    const creativeRecs = generatePersonalizedFallback(baseProfile, 'creative-industry');
    const enriched = await adapter.enrich(baseProfile, creativeRecs);
    const topSteps = enriched[0].nextSteps.join(' ');
    expect(topSteps).toMatch(/Adobe|Figma|Spotify|ILM|Epic Games|Canva/);
  });

  it('enriched recs for different tracks have different company targets', async () => {
    const techAdapter = new TechCareerAdapter();
    const healthAdapter = new HealthcarePivotAdapter();

    const techEnriched = await techAdapter.enrich(baseProfile, generatePersonalizedFallback(baseProfile, 'tech-career'));
    const healthEnriched = await healthAdapter.enrich(baseProfile, generatePersonalizedFallback(baseProfile, 'healthcare-pivot'));

    const techCompanyStep = techEnriched[0].nextSteps.find((s) => s.includes('companies'));
    const healthCompanyStep = healthEnriched[0].nextSteps.find((s) => s.includes('companies'));

    expect(techCompanyStep).toBeDefined();
    expect(healthCompanyStep).toBeDefined();
    expect(techCompanyStep).not.toBe(healthCompanyStep);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ops routes — available without DEMO_MODE
// ─────────────────────────────────────────────────────────────────────────────

describe('Ops routes — accessible without DEMO_MODE, include audit metadata', () => {
  let opsApp: FastifyInstance;

  beforeAll(async () => {
    process.env.DEMO_MODE = 'false';
    process.env.DATABASE_URL = ':memory:';
    opsApp = buildApp();
    await opsApp.ready();
  });

  afterAll(async () => {
    await opsApp.close();
    process.env.DEMO_MODE = 'true'; // restore for other tests
  });

  it('GET /ops/status — returns 200 (not 403) when DEMO_MODE=false', async () => {
    const res = await opsApp.inject({ method: 'GET', url: '/ops/status' });
    expect(res.statusCode).toBe(200);
  });

  it('GET /ops/status — response includes auditedAt timestamp', async () => {
    const res = await opsApp.inject({ method: 'GET', url: '/ops/status' });
    const body = res.json();
    expect(body.auditedAt).toBeDefined();
    expect(() => new Date(body.auditedAt)).not.toThrow();
  });

  it('POST /ops/reset — returns auditedAt and action label', async () => {
    const res = await opsApp.inject({
      method: 'POST',
      url: '/ops/reset',
      payload: { action: 'pre-demo-reset' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.auditedAt).toBeDefined();
    expect(body.action).toBe('pre-demo-reset');
  });

  it('POST /ops/sessions/:id/force-status — returns audit fields', async () => {
    // Create a session first
    const create = await opsApp.inject({ method: 'POST', url: '/sessions' });
    const id = create.json().id;

    const res = await opsApp.inject({
      method: 'POST',
      url: `/ops/sessions/${id}/force-status`,
      payload: { status: 'error', action: 'manual-error-recovery' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.from).toBe('intake');
    expect(body.to).toBe('error');
    expect(body.action).toBe('manual-error-recovery');
    expect(body.auditedAt).toBeDefined();
  });
});
