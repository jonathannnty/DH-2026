import type { FastifyInstance } from 'fastify';
import { dbHealthCheck } from '../db/client.js';
import { getAgentServiceMode, isAgentReachable, isAgentversePipelineReady } from '../services/agent.js';

const startedAt = Date.now();

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_req, reply) => {
    const dbOk = dbHealthCheck();
    const agentReachable = await isAgentReachable();
    const agentOk = await isAgentversePipelineReady();
    const agentMode = await getAgentServiceMode();

    const status = dbOk && agentOk ? 'ok' : 'degraded';
    const code = dbOk && agentOk ? 200 : 503;

    return reply.status(code).send({
      status,
      db: dbOk ? 'ok' : 'error',
      agentService: agentOk ? 'ok' : (agentReachable ? 'agentverse-disabled' : 'unreachable'),
      agentServiceMode: agentMode,
      uptime: Math.floor((Date.now() - startedAt) / 1000),
    });
  });
}
