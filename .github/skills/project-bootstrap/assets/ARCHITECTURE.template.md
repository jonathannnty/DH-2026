# Architecture

## Surfaces

- Frontend: frontend
- Backend: api

## Boundaries

- Frontend consumes backend APIs only.
- Backend does not depend on frontend artifacts.

## Ownership

- Frontend owners: UI, accessibility, client tests.
- Backend owners: API contracts, data integrity, observability.

## Quality Gates

- npm run build
- npm run test
- npm run lint
