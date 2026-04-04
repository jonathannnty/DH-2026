# Project Guidelines

## Current State

- This repository is pre-biased for a React + TypeScript frontend and a Fastify + TypeScript backend in a lightweight monorepo layout.
- Keep frontend work in `frontend/` and backend work in `api/`.

## Build and Test

- Use the root package scripts so agents can run checks consistently:
  - `npm install`
  - `npm run build`
  - `npm run test`
  - `npm run lint`
- If additional toolchains are added later, preserve these root script names as stable entry points.

## Architecture

- The baseline architecture and ownership boundaries are documented in `docs/ARCHITECTURE.md`.
- Update that file when adding new domains, shared libraries, or deployment surfaces.

## Conventions

- Keep changes small, focused, and consistent with existing code style in the touched files.
- Prefer folder-by-feature organization inside both `frontend/` and `api/`.
- Add tests for non-trivial logic when a test framework is available.

## Documentation

- Use `README.md` for onboarding, commands, and local development setup.
- Use `docs/` for detailed design and workflow notes.
- Link to docs instead of duplicating long guidance in instruction files.
