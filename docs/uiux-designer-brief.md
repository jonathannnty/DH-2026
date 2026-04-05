# PathFinder AI UI/UX Designer Brief

## Purpose

PathFinder AI is a judge-facing career advising product built for DiamondHacks 2026. The experience should feel like a serious, transparent career advisor rather than a generic AI chatbot. The design must communicate that the product understands the user across multiple dimensions, supports different career paths through sponsor tracks, and produces recommendations that are actionable, honest, and tailored.

This brief is intended for an experienced industry UI/UX designer. It should provide enough context to propose a strong visual and interaction system without needing to inspect the full codebase.

Primary visual source of truth: `docs/branding-spec.md`.

## Product Goal

The app’s core promise is simple:

1. Interview the user across 12 structured dimensions.
2. Build a visible career profile from their answers.
3. Analyze that profile through a track-aware recommendation flow.
4. Present scored career matches with reasons, concerns, salary range, and next steps.

The product is not trying to be a vague personality quiz. It is trying to feel like a rigorous, explainable, career decision tool.

## What We Are Trying To Win On

For judging, the product should emphasize five things:

1. **Transparency** - The system should visibly explain what it is doing and why it recommends a role.
2. **Actionability** - Recommendations should always lead to concrete next steps, not just role names.
3. **Honesty** - Every role should include concerns or tradeoffs, not only positives.
4. **Real-time progress** - The analysis should feel alive, not like a dead loading screen.
5. **Track differentiation** - The experience should look and feel meaningfully different depending on the selected track.

## Track Strategy

The project supports four tracks. The design should treat them as distinct lanes under one coherent brand system.

### 1. General Career Advising

- **Role in the product**: Baseline/default experience.
- **Purpose**: Show the core value of the platform without sponsor-specific framing.
- **Design tone**: Neutral, trustworthy, broad, and flexible.
- **Use case**: Best for users who want a general exploration path.

### 2. Tech Career Accelerator

- **Role in the product**: Primary showcase track.
- **Purpose**: This is the strongest judge-facing track and should feel like the most polished, ambitious, and high-confidence lane.
- **Design tone**: Crisp, modern, data-forward, and high-momentum.
- **What it should signal**: Software engineering, data science, AI, technical leadership, and market-aware career planning.
- **Priority**: This should get the strongest visual treatment, the clearest CTA hierarchy, and the most memorable recommendation presentation.

### 3. Healthcare Career Pivot

- **Role in the product**: Credibility track for non-tech pivots.
- **Purpose**: Show that the system can support a serious, practical transition path where stability, licensing, and role fit matter.
- **Design tone**: Calm, dependable, reassuring, and professional.
- **What it should signal**: Healthcare, health-tech, clinical-adjacent paths, and transition planning.

### 4. Creative Industry Paths

- **Role in the product**: Breadth track.
- **Purpose**: Prove that the platform can support portfolio-oriented, less linear career journeys.
- **Design tone**: Expressive, distinctive, and slightly more editorial or art-directed.
- **What it should signal**: Design, media, content, arts-adjacent work, and portfolio growth.

## Project Positioning For The Designer

The app should feel like a product that has one strong system and four meaningful variations, not four separate products.

Recommended framing:

- **One brand shell** across the app.
- **Track-specific accent systems** for visual identity.
- **Track-specific copy tone** for the onboarding and results experience.
- **Track-specific recommendation emphasis** for what matters most in each lane.

The design should make the user feel that the track choice actually changes the advice, not just the color palette.

## Core User Journey

### 1. Home / Track Selection

This is the first major conversion point. The user should immediately understand:

- what the product is,
- why the track matters,
- and which path best matches their goals.

Design should make the primary track obvious while still making the other tracks feel intentional and viable.

### 2. Onboarding Chat

The onboarding flow is a structured, 12-question interview.

The experience should feel conversational, but not loose. It should communicate progress and momentum while the system is building the profile in real time.

The designer should pay special attention to:

- chat rhythm,
- profile progress visibility,
- input affordance clarity,
- and completion state.

### 3. Analysis / Starting Screen

After onboarding, the user clicks Analyze.

This is a high-risk state because it can feel like the product has stalled if the analysis takes too long. The screen should make the wait feel purposeful and understandable.

### 4. Results

This is the payoff state. It should feel like a composed, confident career advisory report rather than a generic AI output dump.

The page should emphasize:

- ranking,
- fit score,
- reasoning,
- concerns,
- salary range,
- and next steps.

### 5. Dashboard / Session History

The dashboard should support review, recovery, and comparison.

It is not just an admin page. It is the place where the product shows that multiple assessments can coexist and be revisited.

## Visual Language Direction

### Brand Feel

The overall product should feel:

- credible,
- thoughtful,
- slightly premium,
- and a bit more intentional than a standard SaaS dashboard.

### Visual Hierarchy

The visual system should prioritize:

1. Track identity.
2. Fit score / recommendation confidence.
3. Reasoning and tradeoffs.
4. Salary and next steps.
5. Session and status state.

### Suggested Design Pattern

A strong direction would be a single consistent structural system with track-specific skins:

- General: neutral, clean, and calm.
- Tech: sharp, luminous, and energetic.
- Healthcare: stable, human, and reassuring.
- Creative: expressive, editorial, and slightly more artistic.

This will help the app feel cohesive while still making each track memorable.

## Interaction Principles

### 1. Make State Changes Obvious

Users should always know whether they are:

- answering questions,
- waiting for analysis,
- reading results,
- or revisiting a session.

### 2. Keep Progress Visible

Progress should be visible in multiple forms:

- profile completion in onboarding,
- live analysis status in results,
- and session state in the dashboard.

### 3. Make Analysis Feel Trustworthy

The analysis state should not feel broken or frozen. Even if the backend is working through fallback behavior, the UI should communicate active processing.

### 4. Reduce User Uncertainty

Whenever the system is waiting, recovering, or falling back, the UI should explain what is happening in plain language.

### 5. Preserve User Agency

The user should always have a clear next action:

- continue answering,
- analyze,
- retry,
- go to results,
- or open another session.

## What The Designer Should Optimize For

The best design direction will balance four things:

1. **Judging impact** - The experience must feel polished and demo-ready.
2. **Clarity** - The product should explain itself quickly.
3. **Differentiation** - The track system should feel meaningful.
4. **Recovery** - Error or fallback states should still feel intentional.

## Constraints The Design Must Respect

1. The intake flow is fixed and deterministic, so the experience should not depend on branching question logic.
2. Sessions follow a strict lifecycle: intake → analyzing → complete, with error states possible.
3. Analysis may stream progress updates, so the results screen needs to support live state changes.
4. The product is single-user and session-based, so the interaction model should avoid collaboration metaphors.
5. The app must work well on desktop and still collapse gracefully on smaller screens.
6. Accessibility matters: buttons, headings, focus states, readable contrast, and clear status text should all be considered.

## Track-Specific Design Opportunities

### General

- Use as the cleanest, most universal presentation.
- Keep the layout calm and trustworthy.
- Treat it as the baseline product architecture.

### Tech

- Make this the showcase track.
- Use the strongest motion, contrast, and data-driven visual treatment here.
- Present the recommendation cards like a technical decision dashboard.

### Healthcare

- Signal stability and transition safety.
- Make role explanations feel pragmatic and grounded.
- Consider calmer pacing and more reassuring visual cues.

### Creative

- Allow more expressive art direction.
- Use a slightly richer editorial layout or more distinctive composition.
- Make it feel less corporate without losing structure.

## UX Opportunities Worth Exploring

1. A stronger profile summary or “career snapshot” after onboarding.
2. More expressive track selection cards that make the differences obvious immediately.
3. A results layout that makes the top recommendation feel like a featured card.
4. Better “why it fits” and “watch out for” treatment, possibly with tag chips or grouped sections.
5. A clearer fallback state that still feels personalized rather than generic.
6. A comparison or revisit pattern on the dashboard for completed sessions.

## What Not To Over-Design

1. Do not make the onboarding feel like a form wizard; it should stay conversational.
2. Do not make the results page feel like a wall of text; it needs structure and hierarchy.
3. Do not use generic AI visual tropes unless they support clarity.
4. Do not split the experience into unrelated visual themes per screen; the system should feel unified.

## Designer Deliverables To Ask For

The designer should ideally produce:

1. A core visual system for the app shell.
2. Track-specific styling concepts for the four lanes.
3. A home page concept with strong track selection hierarchy.
4. An onboarding chat concept with visible progress and completion state.
5. A results page concept that makes the recommendation cards feel valuable and scannable.
6. A loading / analysis state concept that avoids the appearance of a stalled app.
7. A dashboard concept for session history and review.

## Open Questions For Design Review

1. Should each track feel like a different theme, or should they all remain under one mostly neutral system?
2. How visually assertive should the Tech track be compared with the others?
3. Should fallback analysis states be visibly labeled as fallback, or should they be presented more subtly as part of the product experience?
4. Should the results page read more like a structured report, a dashboard, or a guided recommendation story?

## Summary

The design goal is not just to make PathFinder AI look polished. It is to make it feel credible, differentiated, and judge-worthy. The strongest design work here will make the track system meaningful, the onboarding feel human, the analysis feel alive, and the results feel specific enough that the user believes the system actually understood them.
