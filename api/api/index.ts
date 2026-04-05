import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../src/app.js";

const app = buildApp();
let readyPromise: Promise<void> | null = null;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!readyPromise) {
    readyPromise = app.ready();
  }

  await readyPromise;
  app.server.emit("request", req, res);
}
