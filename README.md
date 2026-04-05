# DH-2026

DiamondHacks 2026 career guidance platform with a React frontend, Fastify API, and a Python multi-agent service.

## Stack

- Frontend: React + TypeScript + Vite workspace at `frontend`
- Backend: Fastify + TypeScript workspace at `api`
- Agent service: Python FastAPI service at repository root (`agent_service.py`)
- Package manager: npm workspaces

## Repository Layout

- `frontend/` frontend package
- `api/` backend package
- `docs/ARCHITECTURE.md` system boundaries and ownership
- `.github/copilot-instructions.md` workspace-wide AI coding instructions
- `.github/instructions/` file-scoped instructions
- `.github/prompts/` reusable prompts
- `.github/agents/` custom agents
- `.github/skills/` reusable multi-step skills

## Setup

```bash
npm install
```

Python agent service setup:

```bash
pip install -r requirements.txt
```

## Commands

Run from repository root.

```bash
npm run dev
npm run build
npm run test
npm run lint
```

## Demo Quick Start

👉 **[Start here: QUICKSTART.md](QUICKSTART.md)** — 5-minute setup for any platform.

For emergency recovery and advanced operator workflows, see `docs/operator-playbook.md`.

## Testing

```bash
# Frontend tests
npm run test --workspace frontend

# API tests
npm run test --workspace api
```

Optional test suites (off by default):

```bash
# Level 1 direct agent-service tests
RUN_LEVEL1_AGENT_TESTS=true npm run test --workspace api -- agent-service-level-1.test.ts

# Level 3 exploratory frontend E2E tests
RUN_LEVEL3_E2E_TESTS=true npm run test --workspace frontend -- multi-agent-e2e.test.tsx
```

## Notes

- Root scripts delegate to workspace scripts so tooling can evolve without changing the agent entry points.
- API default port is `3001`; Python agent service default is `8000`.
- Update this README whenever build, test, or demo workflows change.
- Backend lint currently runs TypeScript checks (`tsc --noEmit`).

## Additional Documentation

- Demo operations: `docs/operator-playbook.md`
- Demo contingencies: `docs/demo-contingency-plan.md`
- Quick testing guide: `TESTING_QUICK_START.md`
- Detailed testing guide: `docs/TESTING.md`
