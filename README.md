# DH-2026

React + Node monorepo starter, pre-configured so coding agents can run standard checks through root scripts.

## Stack

- Frontend: React + TypeScript + Vite workspace at `frontend`
- Backend: Fastify + TypeScript workspace at `api`
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

## Commands

Run from repository root.

```bash
npm run build
npm run test
npm run lint
```

## Notes

- Root scripts delegate to workspace scripts so tooling can evolve without changing the agent entry points.
- Update this README whenever build or test workflows change.
- Backend lint currently runs TypeScript checks (`tsc --noEmit`).
