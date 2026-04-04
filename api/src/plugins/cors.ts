import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

async function corsPlugin(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: true, // reflect request origin in dev; tighten for production
  });
}

// fp() breaks encapsulation so CORS headers apply to all routes
export const registerCors = fp(corsPlugin, { name: 'cors' });
