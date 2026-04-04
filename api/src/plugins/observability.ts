import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyError } from 'fastify';

const START_TIME = Symbol('startTime');

declare module 'fastify' {
  interface FastifyRequest {
    [START_TIME]?: bigint;
  }
}

async function observability(app: FastifyInstance): Promise<void> {
  // ── Request timing ──
  app.addHook('onRequest', async (req) => {
    req[START_TIME] = process.hrtime.bigint();
  });

  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Request-Id', req.id);

    const start = req[START_TIME];
    if (start) {
      const ns = process.hrtime.bigint() - start;
      const ms = Number(ns) / 1_000_000;
      reply.header('X-Response-Time', `${ms.toFixed(2)}ms`);
    }
  });

  // ── Structured error handler ──
  app.setErrorHandler(async (error: FastifyError, req, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      req.log.error({
        err: error,
        requestId: req.id,
        method: req.method,
        url: req.url,
      }, 'Server error');
    } else {
      req.log.warn({
        err: { message: error.message, code: error.code },
        requestId: req.id,
        method: req.method,
        url: req.url,
      }, 'Client error');
    }

    return reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Error',
      message: statusCode >= 500 ? 'Internal Server Error' : error.message,
      requestId: req.id,
    });
  });
}

// fp() breaks encapsulation so hooks apply to all routes
export const registerObservability = fp(observability, {
  name: 'observability',
});
