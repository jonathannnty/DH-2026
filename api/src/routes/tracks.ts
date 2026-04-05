import type { FastifyInstance } from "fastify";
import { TRACK_REGISTRY, getTrack } from "../services/tracks.js";

const TRACKS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let tracksCache: {
  value: { tracks: typeof TRACK_REGISTRY };
  expiresAt: number;
} | null = null;

/**
 * Sponsor track routes — public, no auth required.
 * Lets the frontend discover available tracks and their metadata.
 * Cache: /tracks (5 min TTL) to reduce load during repeated demo runs.
 */
export async function trackRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /tracks — list all sponsor tracks (cached) ─────────────
  app.get("/tracks", async (_req, reply) => {
    if (tracksCache && Date.now() < tracksCache.expiresAt) {
      reply.header("X-Cache", "HIT");
      return tracksCache.value;
    }

    const response = { tracks: TRACK_REGISTRY };
    tracksCache = {
      value: response,
      expiresAt: Date.now() + TRACKS_CACHE_TTL,
    };

    reply.header("X-Cache", "MISS");
    return response;
  });

  // ── GET /tracks/:trackId — single track details (no caching) ───
  app.get<{ Params: { trackId: string } }>(
    "/tracks/:trackId",
    async (req, reply) => {
      const track = getTrack(req.params.trackId);
      if (!track)
        return reply.notFound(`Track '${req.params.trackId}' not found.`);
      return track;
    },
  );
}
