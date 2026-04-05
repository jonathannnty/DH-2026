import { http, HttpResponse } from 'msw';
import {
  TRACK_GENERAL,
  TRACK_TECH,
  SESSION_INTAKE,
  SESSION_COMPLETE,
  RECOMMENDATIONS,
} from './fixtures';

const BASE = 'http://localhost:3001';

export const defaultHandlers = [
  // Tracks
  http.get(`${BASE}/tracks`, () =>
    HttpResponse.json({ tracks: [TRACK_GENERAL, TRACK_TECH] }),
  ),

  http.get(`${BASE}/tracks/:trackId`, ({ params }) => {
    const track = [TRACK_GENERAL, TRACK_TECH].find((t) => t.id === params.trackId);
    if (!track) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(track);
  }),

  // Sessions
  http.post(`${BASE}/sessions`, () =>
    HttpResponse.json(SESSION_INTAKE, { status: 201 }),
  ),

  http.get(`${BASE}/sessions/:id`, ({ params }) => {
    if (params.id === SESSION_COMPLETE.id)
      return HttpResponse.json(SESSION_COMPLETE);
    if (params.id === SESSION_INTAKE.id)
      return HttpResponse.json(SESSION_INTAKE);
    return new HttpResponse(null, { status: 404 });
  }),

  // Messages
  http.post(`${BASE}/sessions/:id/messages`, () =>
    HttpResponse.json({
      message: {
        id: 'msg-reply',
        role: 'assistant',
        content: "Thanks! What are your core values?",
        timestamp: new Date().toISOString(),
      },
      profileUpdate: { interests: ['technology'] },
      intakeComplete: false,
    }),
  ),

  // Analyze
  http.post(`${BASE}/sessions/:id/analyze`, () =>
    HttpResponse.json({ ok: true }),
  ),

  // Recommendations
  http.get(`${BASE}/sessions/:id/recommendations`, () =>
    HttpResponse.json(RECOMMENDATIONS),
  ),
];
