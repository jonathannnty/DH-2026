# Architecture

## Overview

This repository is a two-surface monorepo:

- `frontend`: user-facing React application surface
- `api`: API and server-side domain logic surface

Shared contracts should be extracted intentionally once duplication appears (for example to a future `packages/shared` workspace), not preemptively.

## Component Boundaries

- Frontend owns UI composition, routing, client state, and HTTP client adapters.
- Backend owns API contracts, validation, business rules, persistence adapters, and observability hooks.
- Frontend must not import backend runtime code directly.
- Backend must not depend on frontend artifacts.

## Ownership Boundaries

- Frontend team/code owners:
  - Directory: `frontend/**`
  - Responsibilities: UX, accessibility, visual consistency, client-side tests
- Backend team/code owners:
  - Directory: `api/**`
  - Responsibilities: API behavior, auth, data integrity, logging/metrics, server-side tests
- Shared architecture stewardship:
  - Directory: `docs/**`, `.github/**`, root scripts
  - Responsibilities: command consistency, standards, and cross-cutting guidance

## Runtime and Integration

- Frontend communicates with backend through versioned HTTP APIs.
- API schema and error model should remain backward compatible within a release line.
- Cross-surface breaking changes require updates in both `frontend` and `api` within the same pull request.

## Quality Gates

The root commands are the default quality gates for humans and agents:

- `npm run build`
- `npm run test`
- `npm run lint`

## Evolution Rules

- Add new top-level modules only when they represent a clear bounded context.
- Document any new module purpose, owner, and dependencies in this file.
- Link to detailed design docs from `docs/` instead of duplicating long rationale in multiple places.
