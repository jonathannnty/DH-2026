import type { CareerProfile, CareerRecommendation } from '../schemas/career.js';

const AGENT_URL =
  process.env.AGENT_SERVICE_URL ?? 'http://localhost:8000';

// ==================== Types ====================

interface AgentInfo {
  name: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'error';
}

interface AnalysisResult {
  success: boolean;
  sessionId: string;
  status: string;
  message: string;
}

interface StatusResult {
  status: 'in_progress' | 'completed' | 'error' | 'not_found' | 'unknown';
  progress: number;
  current_agent: string;
  stage?: string;
  results?: Record<string, unknown>;
  error?: string;
}

interface AgentListResponse {
  total_agents: number;
  agents: AgentInfo[];
}

// ==================== Request Helper ====================

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

// ==================== Multi-Agent APIs ====================

/**
 * Start analysis using the multi-agent system.
 * Orchestrates: Research → Analysis → Recommendations → Verification → Report Generation
 */
export async function startAnalysis(
  sessionId: string,
  profile: CareerProfile,
  trackId?: string,
): Promise<AnalysisResult> {
  return request<AnalysisResult>('/analyze', {
    method: 'POST',
    body: JSON.stringify({ sessionId, profile, trackId }),
  });
}

/**
 * Get current analysis status for a session.
 * Returns progress and intermediate results from active agents.
 */
export async function getStatus(
  sessionId: string,
): Promise<StatusResult> {
  return request<StatusResult>(`/status/${sessionId}`);
}

/**
 * List all available agents and their current status.
 * Returns information about the 5 specialized agents.
 */
export async function listAgents(): Promise<AgentListResponse> {
  return request<AgentListResponse>('/agents');
}

/**
 * Get specific agent status and details.
 * @param agentName - The name of the agent (e.g., 'research', 'profile_analysis')
 */
export async function getAgentStatus(agentName: string): Promise<AgentInfo> {
  const agents = await listAgents();
  const agent = agents.agents.find((a) => a.name === agentName);
  if (!agent) {
    throw new Error(`Agent '${agentName}' not found`);
  }
  return agent;
}

/**
 * Get detailed analysis results for a completed session.
 * Includes research, profile analysis, recommendations, verification, and report.
 */
export async function getDetailedResults(
  sessionId: string,
): Promise<Record<string, unknown>> {
  const status = await getStatus(sessionId);
  if (status.status !== 'completed') {
    throw new Error(
      `Analysis not completed. Current status: ${status.status}`,
    );
  }
  return status.results || {};
}

/**
 * Get research data (from Research Agent).
 */
export async function getResearchData(sessionId: string): Promise<unknown> {
  const results = await getDetailedResults(sessionId);
  return results.research;
}

/**
 * Get profile analysis data (from Profile Analysis Agent).
 */
export async function getProfileAnalysis(sessionId: string): Promise<unknown> {
  const results = await getDetailedResults(sessionId);
  return results.profile_analysis;
}

/**
 * Get career recommendations (from Recommendations Agent).
 */
export async function getRecommendations(sessionId: string): Promise<unknown> {
  const results = await getDetailedResults(sessionId);
  return results.recommendations;
}

/**
 * Get verification results (from Verification Agent).
 */
export async function getVerificationResults(
  sessionId: string,
): Promise<unknown> {
  const results = await getDetailedResults(sessionId);
  return results.verification;
}

/**
 * Get generated career report (from Report Generation Agent).
 */
export async function getCareerReport(sessionId: string): Promise<unknown> {
  const results = await getDetailedResults(sessionId);
  return results.report;
}

// ==================== Health & Connectivity ====================

/**
 * Quick connectivity check — true if the agent service responds to /health.
 * Also returns list of available agents.
 */
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

/**
 * Get comprehensive health status including all agents.
 */
export async function getHealthStatus(): Promise<{
  status: string;
  agents: string[];
}> {
  return request('/health');
}
