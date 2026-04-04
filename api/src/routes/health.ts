import type { FastifyInstance } from 'fastify';
import { dbHealthCheck } from '../db/client.js';
import { isAgentReachable } from '../services/agent.js';

const startedAt = Date.now();

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_req, reply) => {
    const dbOk = dbHealthCheck();
    const agentOk = await isAgentReachable();

    const status = dbOk ? 'ok' : 'degraded';
    const code = dbOk ? 200 : 503;

    return reply.status(code).send({
      status,
      db: dbOk ? 'ok' : 'error',
      agentService: agentOk ? 'ok' : 'unreachable',
      uptime: Math.floor((Date.now() - startedAt) / 1000),
    });
  });
}
