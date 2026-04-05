import fp from "fastify-plugin";
import type { FastifyInstance, FastifyError } from "fastify";
import { randomUUID } from "node:crypto";

const START_TIME = Symbol("startTime");
const CORRELATION_ID = Symbol("correlationId");

declare module "fastify" {
  interface FastifyRequest {
    [START_TIME]?: bigint;
    [CORRELATION_ID]: string;
  }
}

async function observability(app: FastifyInstance): Promise<void> {
  // ── Request correlation ID ──
  app.addHook("onRequest", async (req) => {
    // Propagate correlation ID from request headers, or generate new one
    const incomingId =
      req.headers["x-correlation-id"] ||
      req.headers["x-request-id"] ||
      randomUUID();

    req[CORRELATION_ID] = String(incomingId);
    req[START_TIME] = process.hrtime.bigint();

    // Add correlation context to logger
    req.log = req.log.child({ correlationId: req[CORRELATION_ID] });
  });

  app.addHook("onSend", async (req, reply) => {
    // Include request ID and correlation ID in response headers
    reply.header("X-Request-Id", req.id);
    reply.header("X-Correlation-Id", req[CORRELATION_ID]);

    const start = req[START_TIME];
    if (start) {
      const ns = process.hrtime.bigint() - start;
      const ms = Number(ns) / 1_000_000;
      reply.header("X-Response-Time", `${ms.toFixed(2)}ms`);
    }
  });

  // ── Structured error handler ──
  app.setErrorHandler(async (error: FastifyError, req, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      req.log.error(
        {
          err: error,
          requestId: req.id,
          correlationId: req[CORRELATION_ID],
          method: req.method,
          url: req.url,
        },
        "Server error",
      );
    } else {
      req.log.warn(
        {
          err: { message: error.message, code: error.code },
          requestId: req.id,
          correlationId: req[CORRELATION_ID],
          method: req.method,
          url: req.url,
        },
        "Client error",
      );
    }

    return reply.status(statusCode).send({
      statusCode,
      error: error.name || "Error",
      message: statusCode >= 500 ? "Internal Server Error" : error.message,
      requestId: req.id,
      correlationId: req[CORRELATION_ID],
    });
  });
}

// Export helper to get correlation ID from request
export function getCorrelationId(req: { [CORRELATION_ID]: string }): string {
  return req[CORRELATION_ID];
}

// fp() breaks encapsulation so hooks apply to all routes
export const registerObservability = fp(observability, {
  name: "observability",
});
