import type { FastifyInstance } from 'fastify';
import { TRACK_REGISTRY, getTrack } from '../services/tracks.js';

/**
 * Sponsor track routes — public, no auth required.
 * Lets the frontend discover available tracks and their metadata.
 */
export async function trackRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /tracks — list all sponsor tracks ──────────────────────
  app.get('/tracks', async () => {
    return { tracks: TRACK_REGISTRY };
  });

  // ── GET /tracks/:trackId — single track details ───────────────
  app.get<{ Params: { trackId: string } }>(
    '/tracks/:trackId',
    async (req, reply) => {
      const track = getTrack(req.params.trackId);
      if (!track) return reply.notFound(`Track '${req.params.trackId}' not found.`);
      return track;
    },
  );
}
