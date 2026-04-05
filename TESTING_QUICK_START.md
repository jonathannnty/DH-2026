# Testing Multi-Agent System - Quick Start

## TL;DR: Validate in 5 minutes

### 1) Start required services

```bash
# Terminal 1: Python agent service
python agent_service.py

# Terminal 2: Backend API (port 3001)
npm run dev --workspace api
```

Optional:

```bash
# Terminal 3: Frontend UI (port 5173)
npm run dev --workspace frontend
```

### 2) Run core test suites

```bash
# Frontend tests
npm run test --workspace frontend

# API tests
npm run test --workspace api
```

## Test Levels

### Level 1: Agent service direct tests (optional, gated)

File: `api/src/__tests__/agent-service-level-1.test.ts`

```bash
RUN_LEVEL1_AGENT_TESTS=true npm run test --workspace api -- agent-service-level-1.test.ts
```

Checks:

- Agent health and registration
- 4-agent execution sequence
- Progress and output shape

### Level 2: Backend integration tests

Files include:

- `api/src/__tests__/agent-service-level-2.test.ts`
- `api/src/__tests__/golden-path.test.ts`
- `api/src/__tests__/contracts.test.ts`
- `api/src/__tests__/demo-golden-path.test.ts`

```bash
npm run test --workspace api
```

Checks:

- Session and intake flow
- Analysis trigger and state transitions
- SSE and recommendations contract
- Report generation endpoint

### Level 3: Frontend exploratory E2E tests (optional, gated)

File: `frontend/src/__tests__/multi-agent-e2e.test.tsx`

```bash
RUN_LEVEL3_E2E_TESTS=true npm run test --workspace frontend -- multi-agent-e2e.test.tsx
```

Notes:

- Skipped by default for stability.
- Use when you want deeper exploratory end-to-end coverage.

## Sanity checklist

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test --workspace frontend` passes
- [ ] `npm run test --workspace api` passes

## Troubleshooting

Agent service unreachable:

```bash
curl http://localhost:8000/health
```

API not responding:

```bash
curl http://localhost:3001/health
```

If dependencies are missing:

```bash
npm install
pip install -r requirements.txt
```

---

For full details, see `docs/TESTING.md`.
