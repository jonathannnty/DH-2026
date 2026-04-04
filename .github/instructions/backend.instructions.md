---
description: "Use when implementing backend code in api, including Fastify routes, validation, domain logic, persistence adapters, and operational logging."
name: "Backend Conventions"
applyTo: "api/**"
---

# Backend Conventions

## Scope

- Applies to all files under `api/`.
- Keep runtime assumptions explicit (environment variables, ports, external services).

## API Design

- Keep route/controller layers thin and delegate business logic to domain services.
- Validate request inputs at boundaries before domain logic executes.
- Return stable, predictable response shapes and error objects.

## Domain and Data

- Keep domain logic pure where possible and isolate side effects in adapters.
- Avoid leaking persistence-specific details into route handlers.
- Document backward-incompatible API changes in `docs/ARCHITECTURE.md`.

## Logging and Errors

- Log meaningful context for failures without exposing secrets.
- Use structured error handling and map internal exceptions to safe client responses.

## Testing

- Add tests for core business rules, API contracts, and edge cases.
- Include negative-path tests for validation and authorization rules.

## Integration

- Backend must not depend on frontend artifacts.
- Cross-surface contract changes should be coordinated with frontend updates in the same PR.
