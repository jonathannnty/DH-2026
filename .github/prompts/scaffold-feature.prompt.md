---
description: "Scaffold a new feature in frontend and/or api with starter files, tests, and docs updates in one pass."
name: "Scaffold Feature"
argument-hint: "Feature name, target surface (frontend|api|both), and brief requirements"
agent: "agent"
---

Create a new feature scaffold using the user's input.

## Input expected

- Feature name
- Target surface: `frontend`, `api`, or `both`
- Brief behavior requirements

## Requirements

1. Create a feature folder using folder-by-feature conventions.
2. Add starter implementation files with TODO placeholders where details are unknown.
3. Add at least one test file per targeted surface.
4. Update `docs/ARCHITECTURE.md` if boundaries/contracts change.
5. Update `README.md` only when setup or commands are affected.
6. Run root validation commands and report results:
   - `npm run build`
   - `npm run test`
   - `npm run lint`

## Output format

- Summary of created/updated files
- Any assumptions made
- Validation command results
- Follow-up tasks if placeholders remain
