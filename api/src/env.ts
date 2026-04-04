import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1).default('./dev.db'),

  // Python agent service (Fetch.ai Agentverse agent or local stub)
  AGENT_SERVICE_URL: z.string().url().default('http://localhost:8000'),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DEMO_MODE: z
    .enum(['true', 'false', '1', '0', ''])
    .default('')
    .transform((v) => v === 'true' || v === '1'),

  // ── Fetch.ai / Agentverse ──────────────────────────────────────
  // Set these once you have Agentverse credentials.
  // FETCHAI_API_KEY: Agentverse API key (create at agentverse.ai)
  // FETCHAI_AGENT_ADDRESS: The bech32 address of your hosted agent (agent1q...)
  FETCHAI_API_KEY: z.string().optional(),
  FETCHAI_AGENT_ADDRESS: z.string().optional(),

  // ── Browser Use (LLM-driven browser automation) ───────────────
  // Browser Use runs inside the Python agent and needs an LLM key.
  // ANTHROPIC_API_KEY is preferred (Claude drives the browser).
  // OPENAI_API_KEY is accepted as an alternative.
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let _env: Env | null = null;

export function loadEnv(): Env {
  if (_env) return _env;
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }
  _env = result.data;
  return _env;
}
