---
description: "Use when adding or modifying frontend UI code in frontend, including React components, styling, routing, and frontend tests."
name: "Frontend Conventions"
applyTo: "frontend/**"
---

# Frontend Conventions

## Scope

- Applies to all files under `frontend/`.
- Keep framework choices React-friendly and avoid introducing alternative UI frameworks without explicit project approval.

## Structure

- Organize by feature first, then by technical role inside each feature.
- Typical feature layout:
  - `features/<feature>/components/`
  - `features/<feature>/hooks/`
  - `features/<feature>/api/`
  - `features/<feature>/__tests__/`

## Components and State

- Prefer function components and composable hooks.
- Keep presentational concerns separated from API/side-effect concerns.
- Avoid global state unless multiple distant screens require the same state.

## Styling and UX

- Preserve accessible semantics (`button`, `label`, heading hierarchy).
- Keep styles colocated with feature code unless a shared design layer is introduced.
- Ensure responsive behavior for common mobile and desktop breakpoints.

## Testing

- Add or update tests for non-trivial UI logic and state transitions.
- Favor behavior-focused tests over implementation-detail assertions.

## Integration

- Frontend communicates with backend via API clients; do not import backend runtime code.
- Keep API error handling explicit and user-visible where relevant.
