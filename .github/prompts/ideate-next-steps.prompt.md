---
description: "Ideate practical next steps for this codebase without making code changes."
name: "Ideate Next Steps"
argument-hint: "Goals, constraints, and planning horizon (e.g., 1 week, 1 sprint)"
agent: "agent"
---

Analyze the current workspace state and propose high-leverage next steps.

## Goal

Generate actionable ideas only. Do not modify files, generate patches, or run destructive commands.

## Inputs

Use the user input to capture:

- Product goals and event/deadline context
- Team constraints (time, contributors, skill mix)
- Preferred horizon (today, this week, this sprint)

If any of these are missing, make a best-effort assumption and state it clearly.

## What to produce

1. A prioritized list of 8-12 next-step ideas spanning:
   - Technical decisions to make now
   - Focus pivots (what to deprioritize, what to accelerate)
   - Concrete functions/features to implement next in `frontend/` and/or `api/`
2. For each idea, include:
   - Why it matters now (1 sentence)
   - Score for each objective (1-5): Hackathon judging impact, Technical risk reduction, Implementation speed
   - Composite priority score (equal weighting across all three objectives)
   - Estimated effort: S, M, or L
   - Dependencies or blockers
   - Confidence: High, Medium, or Low
3. Include a "Top 3 This Week" section with a recommended execution order.
4. Include a "Risks If Deferred" section for the most important postponed items.
5. Include one sentence explaining any tradeoffs where an idea is strong in one objective but weak in another.

## Constraints

- Do not edit code.
- Keep recommendations aligned with the documented monorepo architecture and conventions.
- Prefer ideas that reduce uncertainty early (integration, schema alignment, API contracts, onboarding flow quality, observability).
- Prioritization must optimize all three objectives together, not one at the expense of the others by default.
- If scores tie, break ties in this order: higher judging impact, then higher risk reduction, then faster implementation.

## Output format

- `Assumptions`
- `Priority Ideas`
- `Top 3 This Week`
- `Risks If Deferred`
- `Decision Questions for the Team`
