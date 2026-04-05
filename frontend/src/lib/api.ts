import {
  SessionResponseSchema,
  SendMessageResponseSchema,
  CareerRecommendationSchema,
  TrackRegistryResponseSchema,
  type SessionResponse,
  type SendMessageResponse,
  type CareerRecommendation,
  type SponsorTrack,
} from "@/schemas/career";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

// Unique correlation ID per session (generated once at app startup or on new session)
let currentCorrelationId = crypto.randomUUID();

export function setCorrelationId(id: string): void {
  currentCorrelationId = id;
}

export function getCorrelationId(): string {
  return currentCorrelationId;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request(path: string, options?: RequestInit): Promise<unknown> {
  const headers = new Headers(options?.headers);
  if (options?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Propagate correlation ID to backend
  headers.set("X-Correlation-Id", currentCorrelationId);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Extract and update correlation ID from response
  const responseCorrelationId = res.headers.get("X-Correlation-Id");
  if (responseCorrelationId) {
    currentCorrelationId = responseCorrelationId;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }
  return res.json();
}

export async function getTracks(): Promise<SponsorTrack[]> {
  const data = await request("/tracks");
  const parsed = TrackRegistryResponseSchema.parse(data);
  return parsed.tracks;
}

export async function createSession(
  trackId?: string,
): Promise<SessionResponse> {
  const data = await request("/sessions", {
    method: "POST",
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
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return SendMessageResponseSchema.parse(data);
}

export async function triggerAnalysis(
  sessionId: string,
): Promise<{ ok: true }> {
  const data = await request(`/sessions/${sessionId}/analyze`, {
    method: "POST",
  });
  return data as { ok: true };
}

export async function prefetchResearch(
  trackId?: string,
): Promise<Record<string, unknown>> {
  // Call agent service directly to start background web research
  const agentUrl = import.meta.env.VITE_AGENT_URL ?? "http://localhost:8000";
  const res = await fetch(`${agentUrl}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId: trackId ?? null }),
  });
  if (!res.ok) {
    console.warn("Research prefetch failed:", res.status);
    return {};
  }
  return res.json();
}

export async function getRecommendations(
  sessionId: string,
): Promise<CareerRecommendation[]> {
  const data = await request(`/sessions/${sessionId}/recommendations`);
  return CareerRecommendationSchema.array().parse(data);
}

type RecommendationsFetchResult =
  | { state: "ready"; recommendations: CareerRecommendation[] }
  | { state: "pending"; retryAfterMs: number };

export interface RecommendationRetryEvent {
  attempt: number;
  state: "pending" | "ready" | "exhausted";
  retryAfterMs?: number;
}

export async function getRecommendationsWithStatus(
  sessionId: string,
): Promise<RecommendationsFetchResult> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/recommendations`);

  if (res.status === 202) {
    const pending = (await res.json().catch(() => ({}))) as {
      retryAfterMs?: unknown;
    };
    const retryAfterMs =
      typeof pending.retryAfterMs === "number" && pending.retryAfterMs > 0
        ? pending.retryAfterMs
        : 1000;
    return { state: "pending", retryAfterMs };
  }

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }

  const data = await res.json();
  return {
    state: "ready",
    recommendations: CareerRecommendationSchema.array().parse(data),
  };
}

export async function getRecommendationsWithRetry(
  sessionId: string,
  options?: {
    maxAttempts?: number;
    maxWaitMs?: number;
    onAttempt?: (event: RecommendationRetryEvent) => void;
  },
): Promise<CareerRecommendation[] | null> {
  const maxAttempts = options?.maxAttempts ?? 5;
  const maxWaitMs = options?.maxWaitMs ?? 8000;
  const onAttempt = options?.onAttempt;
  const startedAt = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await getRecommendationsWithStatus(sessionId);
    if (result.state === "ready") {
      onAttempt?.({ attempt, state: "ready" });
      return result.recommendations;
    }

    onAttempt?.({
      attempt,
      state: "pending",
      retryAfterMs: result.retryAfterMs,
    });

    const elapsed = Date.now() - startedAt;
    if (attempt === maxAttempts || elapsed >= maxWaitMs) {
      onAttempt?.({ attempt, state: "exhausted" });
      return null;
    }

    const remaining = maxWaitMs - elapsed;
    const waitMs = Math.min(result.retryAfterMs, remaining);
    await new Promise((resolve) => window.setTimeout(resolve, waitMs));
  }

  return null;
}

export async function downloadSessionReport(
  sessionId: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/report`);
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/i);

  return {
    blob,
    filename: match?.[1] ?? `career-report-${sessionId}.pdf`,
  };
}

export function sessionStreamUrl(sessionId: string): string {
  return `${BASE_URL}/sessions/${sessionId}/stream`;
}

export { ApiError };
