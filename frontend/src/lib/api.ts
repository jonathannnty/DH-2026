import {
  SessionResponseSchema,
  SendMessageResponseSchema,
  CareerRecommendationSchema,
  TrackRegistryResponseSchema,
  type SessionResponse,
  type SendMessageResponse,
  type CareerRecommendation,
  type SponsorTrack,
} from '@/schemas/career';

const BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request(
  path: string,
  options?: RequestInit,
): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }
  return res.json();
}

export async function getTracks(): Promise<SponsorTrack[]> {
  const data = await request('/tracks');
  const parsed = TrackRegistryResponseSchema.parse(data);
  return parsed.tracks;
}

export async function createSession(trackId?: string): Promise<SessionResponse> {
  const data = await request('/sessions', {
    method: 'POST',
    body: JSON.stringify(trackId ? { trackId } : {}),
  });
  return SessionResponseSchema.parse(data);
}

export async function getSession(id: string): Promise<SessionResponse> {
  const data = await request(`/sessions/${id}`);
  return SessionResponseSchema.parse(data);
}

export async function sendMessage(
  sessionId: string,
  content: string,
): Promise<SendMessageResponse> {
  const data = await request(`/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return SendMessageResponseSchema.parse(data);
}

export async function triggerAnalysis(
  sessionId: string,
): Promise<{ ok: true }> {
  const data = await request(`/sessions/${sessionId}/analyze`, {
    method: 'POST',
  });
  return data as { ok: true };
}

export async function getRecommendations(
  sessionId: string,
): Promise<CareerRecommendation[]> {
  const data = await request(`/sessions/${sessionId}/recommendations`);
  return CareerRecommendationSchema.array().parse(data);
}

export function sessionStreamUrl(sessionId: string): string {
  return `${BASE_URL}/sessions/${sessionId}/stream`;
}

export { ApiError };
