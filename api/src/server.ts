import { loadEnv } from './env.js';
import { buildApp } from './app.js';
import { closeDb } from './db/client.js';

// Validate env before anything else
const env = loadEnv();

const app = buildApp();

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});

// Graceful shutdown
async function shutdown(signal: string) {
  app.log.info(`Received ${signal}, shutting down…`);
  await app.close();
  closeDb();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
