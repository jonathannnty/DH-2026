---
name: project-bootstrap
description: "Scaffold a React + Node monorepo baseline with folders, package scripts, README, architecture notes, and agent customizations. Use for new or reset repositories."
argument-hint: "Workspace path and preferred stack defaults"
---

# Project Bootstrap

## When To Use

- Initializing a new repository with no baseline structure
- Re-establishing a clean monorepo baseline
- Standardizing setup commands for agent automation

## Procedure

1. Confirm baseline folders exist:
   - `.github/`
   - `frontend/`
   - `api/`
   - `docs/`
2. Ensure root scripts exist in `package.json`:
   - `build`
   - `test`
   - `lint`
3. Ensure workspace docs exist and are updated:
   - `README.md`
   - `docs/ARCHITECTURE.md`
4. Ensure workspace instruction baseline exists:
   - `.github/copilot-instructions.md`
5. Add or refresh optional customizations:
   - `.github/instructions/frontend.instructions.md`
   - `.github/instructions/backend.instructions.md`
   - `.github/prompts/scaffold-feature.prompt.md`
   - `.github/agents/implement-and-verify.agent.md`
6. Run validation commands from repo root:
   - `npm run build`
   - `npm run test`
   - `npm run lint`

## Completion Checklist

- Baseline directories and docs are present
- Root command entry points work
- Architecture boundaries are documented
- Agent customization files are discoverable

## References

- [README template](./assets/README.template.md)
- [Architecture template](./assets/ARCHITECTURE.template.md)
