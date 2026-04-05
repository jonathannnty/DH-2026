# Testing Notes and Fix History

This document captures testing-related corrections and the current expected workflow.

## Current Baseline

- Agent pipeline uses 4 role agents: research, profile analysis, recommendations, report generation.
- Default local ports:
  - API: `3001`
  - Agent service: `8000`
  - Frontend: `5173`
- Canonical workspace commands:
  - `npm run test`
  - `npm run build`
  - `npm run lint`

## Known Historical Drift (Now Corrected)

1. Older docs referenced API port `3000`; current default is `3001`.
2. Older docs referenced retired scripts (`test:agents`, `test:agents:level1`, `test:agents:level2`).
3. Older descriptions referenced a 5-agent pipeline; this project now documents 4 core role agents.

## Practical Validation Flow

1. Start agent service:

```bash
python agent_service.py
```

2. Start API:

```bash
cd api
npm run dev
```

3. Run workspace checks from repo root:

```bash
npm run test
npm run build
npm run lint
```

4. If needed, run frontend dev server and manually verify key user journey:

```bash
cd frontend
npm run dev
```

## Optional Exploratory Suites

Some deeper tests are intentionally gated behind environment flags so routine CI/local runs stay fast and deterministic. See `docs/TESTING.md` for exact commands and flags.

## When Failures Occur

1. Verify service health:

```bash
curl http://localhost:3001/health
curl http://localhost:8000/health
```

2. Confirm API can reach the agent service via `AGENT_SERVICE_URL`.
3. Re-run with clean terminals and fresh processes.
4. Use `docs/TROUBLESHOOTING_LEVEL2.md` for manual session/analyze endpoint checks.
