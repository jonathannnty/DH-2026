import type { CareerProfile, CareerRecommendation } from '../schemas/career.js';

const AGENT_URL =
  process.env.AGENT_SERVICE_URL ?? 'http://localhost:8000';

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${AGENT_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10_000),
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Agent service ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface AgentStatus {
  status: string;
  progress: number;
  stage?: string;
  /** Present when status === 'complete'. */
  recommendations?: CareerRecommendation[];
  error?: string;
}

export interface AgentServiceHealth {
  status?: string;
  agents?: string[];
  agentverse_enabled?: boolean;
  bridge_mode?: 'disabled' | 'independent' | 'bureau' | string;
}

interface FiveAgentPath {
  title?: string;
  alignment_score?: number;
  reasoning?: string;
  avg_salary?: string;
  growth_potential?: string;
}

interface AgentPipelineResults {
  research?: {
    top_companies?: string[];
    trending_fields?: string[];
  };
  recommendations?: {
    top_career_paths?: FiveAgentPath[];
    next_steps?: string[];
  };
}

interface FiveAgentStatusResponse {
  status?: string;
  progress?: number;
  current_agent?: string;
  stage?: string;
  error?: string;
  results?: AgentPipelineResults;
}

async function fetchAgentServiceHealth(): Promise<AgentServiceHealth> {
  return request<AgentServiceHealth>('/health');
}

function clampFitScore(score: number): number {
  if (!Number.isFinite(score)) return 75;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function parseSalaryRange(input?: string): { low: number; high: number; currency: 'USD' } | undefined {
  if (!input) return undefined;
  const matches = input.match(/\d+/g);
  if (!matches?.length) return undefined;

  const nums = matches.map((n) => Number(n) * 1000).filter((n) => Number.isFinite(n) && n > 0);
  if (!nums.length) return undefined;

  const low = nums.length >= 1 ? nums[0] : 90_000;
  const high = nums.length >= 2 ? nums[1] : Math.round(low * 1.3);
  return { low, high, currency: 'USD' };
}

function toCareerRecommendation(
  path: FiveAgentPath,
  nextSteps: string[],
  context?: {
    topCompanies?: string[];
    trendingFields?: string[];
  },
): CareerRecommendation {
  const fitScore = clampFitScore((path.alignment_score ?? 0.75) * 100);
  const summary = path.reasoning
    ? `Based on your profile and market signal analysis: ${path.reasoning}`
    : 'Recommended from the 4-agent pipeline based on profile fit and job market demand.';

  const reasons = [
    path.reasoning ?? 'High profile-fit score from the recommendation agent.',
    path.growth_potential
      ? `Growth potential: ${path.growth_potential}`
      : 'Strong near-term market demand for this role.',
  ];

  if (context?.trendingFields?.length) {
    reasons.push(`Aligned with current market trends: ${context.trendingFields.slice(0, 2).join(', ')}`);
  }

  const mergedSteps = nextSteps.length
    ? nextSteps.slice(0, 3)
    : [
      'Build one targeted project for this role and publish it in your portfolio.',
      'Apply to 10 roles and tailor your resume to role-specific keywords.',
    ];

  if (context?.topCompanies?.length) {
    mergedSteps.push(`Prioritize applications to: ${context.topCompanies.slice(0, 3).join(', ')}`);
  }

  return {
    title: path.title ?? 'Career Opportunity',
    summary,
    fitScore,
    reasons,
    concerns: ['Validate role fit with informational interviews and current job requirements.'],
    nextSteps: mergedSteps,
    salaryRange: parseSalaryRange(path.avg_salary),
  };
}

function normalizeStatus(rawStatus?: string): AgentStatus['status'] {
  switch ((rawStatus ?? '').toLowerCase()) {
    case 'completed':
    case 'complete':
      return 'complete';
    case 'in_progress':
    case 'analyzing':
    case 'running':
      return 'analyzing';
    case 'error':
    case 'failed':
      return 'error';
    default:
      return 'analyzing';
  }
}

function normalizeFiveAgentStatus(raw: FiveAgentStatusResponse): AgentStatus {
  const status = normalizeStatus(raw.status);
  const rankedPaths = [...(raw.results?.recommendations?.top_career_paths ?? [])]
    .sort((a, b) => (b.alignment_score ?? 0) - (a.alignment_score ?? 0))
    .slice(0, 3);

  const recommendations = rankedPaths.map((path) =>
    toCareerRecommendation(path, raw.results?.recommendations?.next_steps ?? [], {
      topCompanies: raw.results?.research?.top_companies,
      trendingFields: raw.results?.research?.trending_fields,
    }),
  );

  return {
    status,
    progress: Math.min(100, Math.max(0, raw.progress ?? 0)),
    stage: raw.stage ?? (raw.current_agent ? `Running ${raw.current_agent}` : undefined),
    recommendations: status === 'complete' ? recommendations : undefined,
    error: raw.error,
  };
}

export async function startAnalysis(
  sessionId: string,
  profile: CareerProfile,
  trackId?: string | null,
): Promise<void> {
  await request('/analyze', {
    method: 'POST',
    body: JSON.stringify({ sessionId, profile, trackId: trackId ?? null }),
  });
}

export async function getStatus(sessionId: string): Promise<AgentStatus> {
  const raw = await request<AgentStatus | FiveAgentStatusResponse>(`/status/${sessionId}`);

  // Native contract from agent/main.py path
  if ('recommendations' in raw && (raw.status === 'complete' || raw.status === 'analyzing' || raw.status === 'error')) {
    return raw as AgentStatus;
  }

  // 5-agent contract from root agent_service.py
  return normalizeFiveAgentStatus(raw as FiveAgentStatusResponse);
}

/** Quick connectivity check — true if the agent service responds to /health. */
export async function isAgentReachable(): Promise<boolean> {
  try {
    await fetch(`${AGENT_URL}/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    return true;
  } catch {
    return false;
  }
}

export async function isAgentversePipelineReady(): Promise<boolean> {
  try {
    const health = await fetchAgentServiceHealth();
    return Boolean(
      health.status === 'healthy' &&
      health.agentverse_enabled &&
      Array.isArray(health.agents) &&
      health.agents.length === 4,
    );
  } catch {
    return false;
  }
}

export async function getAgentServiceMode(): Promise<'disabled' | 'independent' | 'bureau' | 'unknown'> {
  try {
    const health = await fetchAgentServiceHealth();
    return health.bridge_mode === 'bureau' || health.bridge_mode === 'independent'
      ? health.bridge_mode
      : 'disabled';
  } catch {
    return 'unknown';
  }
}
