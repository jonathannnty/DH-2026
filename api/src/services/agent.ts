import type { CareerProfile } from '../schemas/career.js';

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

export async function startAnalysis(
  sessionId: string,
  profile: CareerProfile,
): Promise<void> {
  await request('/analyze', {
    method: 'POST',
    body: JSON.stringify({ sessionId, profile }),
  });
}

export async function getStatus(
  sessionId: string,
): Promise<{ status: string; progress: number }> {
  return request(`/status/${sessionId}`);
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
