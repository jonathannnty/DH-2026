import Fastify from "fastify";
import sensible from "@fastify/sensible";
import { loadEnv } from "./env.js";
import { registerCors } from "./plugins/cors.js";
import { registerObservability } from "./plugins/observability.js";
import { healthRoutes } from "./routes/health.js";
import { readyRoutes } from "./routes/ready.js";
import { sessionRoutes } from "./routes/sessions.js";
import { trackRoutes } from "./routes/tracks.js";
import { opsRoutes } from "./routes/ops.js";
import { dbAdminRoutes } from "./routes/db-admin.js";

export function buildApp() {
  const env = loadEnv();

  const app = Fastify({
    logger: {
      transport:
        env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
    },
  });

  app.register(registerObservability);
  app.register(sensible);
  app.register(registerCors);

  // Core routes
  app.register(healthRoutes);
  app.register(readyRoutes);
  app.register(trackRoutes);
  app.register(sessionRoutes);

  // Operator routes (self-guard: reject if !DEMO_MODE)
  app.register(opsRoutes, { prefix: "/ops" });
  app.register(dbAdminRoutes, { prefix: "/ops/db" });

  return app;
}
