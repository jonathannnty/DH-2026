# PathFinder AI Branding Specification

Status: Approved source of truth for visual language, design tokens, and component variants.

Owners: UI/UX + Frontend.

Last updated: 2026-04-04.

## 1. Purpose

This document defines the canonical brand system for PathFinder AI. Design files, React UI code, and QA expectations must align with this spec.

If implementation and mockups diverge, this file is the tie-breaker.

## 2. Brand Principles

1. Credible and intentional over playful.
2. Explainable and transparent over decorative.
3. One shell, track-aware accents.
4. Strong state communication for loading, success, warning, and error.

## 3. Token Source of Truth

All tokens are implemented in `frontend/src/index.css` and must be consumed through CSS variables.

### 3.1 Foundation Tokens

| Token                      | Value                                  | Usage                             |
| -------------------------- | -------------------------------------- | --------------------------------- |
| `--pf-color-bg-canvas`     | `#0f1117`                              | App/page background               |
| `--pf-color-bg-surface`    | `#1a1d27`                              | Cards, nav, elevated panels       |
| `--pf-color-bg-subtle`     | `#252830`                              | Inputs, muted controls            |
| `--pf-color-border-subtle` | `#2e3140`                              | Default border                    |
| `--pf-color-border-strong` | `#3a3f52`                              | Emphasized border/focus ring base |
| `--pf-color-text-primary`  | `#e4e6eb`                              | Primary text                      |
| `--pf-color-text-muted`    | `#8b8fa3`                              | Secondary text                    |
| `--pf-color-text-inverse`  | `#ffffff`                              | Text on strong fills              |
| `--pf-color-brand-500`     | `#6366f1`                              | Brand/action base                 |
| `--pf-color-brand-400`     | `#818cf8`                              | Hover/focus accent                |
| `--pf-color-success-500`   | `#22c55e`                              | Success state                     |
| `--pf-color-warning-500`   | `#f59e0b`                              | Warning state                     |
| `--pf-color-danger-500`    | `#ef4444`                              | Error/destructive state           |
| `--pf-radius-sm`           | `8px`                                  | Small chips/badges                |
| `--pf-radius-md`           | `12px`                                 | Buttons/cards/inputs              |
| `--pf-radius-pill`         | `999px`                                | Pills and soft badges             |
| `--pf-font-family-display` | `"Sora", "Manrope", sans-serif`        | Headlines and high-emphasis text  |
| `--pf-font-family-base`    | `"Manrope", "Segoe UI", sans-serif`    | Primary UI font family            |
| `--pf-font-family-mono`    | `"IBM Plex Mono", Consolas, monospace` | Session ids and code/data text    |
| `--pf-shadow-soft`         | `0 6px 14px rgba(0,0,0,0.2)`           | Hover elevation                   |
| `--pf-shadow-pressed`      | `0 2px 6px rgba(0,0,0,0.25)`           | Active/pressed elevation          |
| `--pf-motion-fast`         | `120ms`                                | Fast interactive transitions      |
| `--pf-motion-base`         | `180ms`                                | Standard transitions              |

### 3.2 Semantic Tokens

| Token                      | Value                           |
| -------------------------- | ------------------------------- |
| `--pf-surface-card-bg`     | `var(--pf-color-bg-surface)`    |
| `--pf-surface-card-border` | `var(--pf-color-border-subtle)` |
| `--pf-focus-ring`          | `var(--pf-color-brand-400)`     |
| `--pf-progress-neutral`    | `var(--pf-color-brand-500)`     |
| `--pf-progress-complete`   | `var(--pf-color-success-500)`   |

### 3.3 Component Tokens

| Token                       | Value                           | Used by                |
| --------------------------- | ------------------------------- | ---------------------- |
| `--pf-btn-primary-bg`       | `var(--pf-color-brand-500)`     | Primary button         |
| `--pf-btn-primary-text`     | `var(--pf-color-text-inverse)`  | Primary button         |
| `--pf-btn-secondary-bg`     | `var(--pf-color-bg-surface)`    | Secondary button       |
| `--pf-btn-secondary-text`   | `var(--pf-color-text-primary)`  | Secondary button       |
| `--pf-btn-secondary-border` | `var(--pf-color-border-subtle)` | Secondary button       |
| `--pf-btn-success-bg`       | `var(--pf-color-success-500)`   | Analyze/confirm button |
| `--pf-chip-bg`              | `var(--pf-color-bg-subtle)`     | Base chip              |
| `--pf-chip-border`          | `var(--pf-color-border-subtle)` | Base chip              |
| `--pf-chip-text`            | `var(--pf-color-text-primary)`  | Base chip              |
| `--pf-chip-selected-bg`     | `rgba(99, 102, 241, 0.16)`      | Selected chip          |
| `--pf-chip-selected-border` | `var(--pf-color-brand-500)`     | Selected chip          |
| `--pf-chip-followup-bg`     | `rgba(255, 255, 255, 0.02)`     | Follow-up chip         |
| `--pf-chip-followup-border` | `var(--pf-color-border-subtle)` | Follow-up chip         |

## 4. Track Accent Rules

Track colors are applied as accents only, not full-theme overrides.

1. Keep global shell, typography, and base surfaces unchanged.
2. Apply track accents to badges, score highlights, and selected states.
3. Never reduce contrast below accessible levels for text and controls.

## 5. Component Variant Matrix

### 5.1 Buttons

| Component | Variant     | Background              | Border                      | Text                      | States                                          |
| --------- | ----------- | ----------------------- | --------------------------- | ------------------------- | ----------------------------------------------- |
| `Button`  | `primary`   | `--pf-btn-primary-bg`   | none                        | `--pf-btn-primary-text`   | hover: brighten, active: translate+press shadow |
| `Button`  | `secondary` | `--pf-btn-secondary-bg` | `--pf-btn-secondary-border` | `--pf-btn-secondary-text` | hover: subtle lift                              |
| `Button`  | `success`   | `--pf-btn-success-bg`   | none                        | `--pf-color-text-inverse` | used for analysis start                         |
| `Button`  | `disabled`  | muted surface           | subtle border               | muted text                | no pointer interaction                          |

### 5.2 Chips and Badges

| Component         | Variant                      | Background              | Border                             | Text             | States                    |
| ----------------- | ---------------------------- | ----------------------- | ---------------------------------- | ---------------- | ------------------------- |
| `QuickChoiceChip` | `base`                       | `--pf-chip-bg`          | `--pf-chip-border`                 | `--pf-chip-text` | hover/tap motion enabled  |
| `QuickChoiceChip` | `selected`                   | `--pf-chip-selected-bg` | `--pf-chip-selected-border`        | primary text     | selected weight = 700     |
| `QuickChoiceChip` | `followup`                   | `--pf-chip-followup-bg` | dashed `--pf-chip-followup-border` | primary text     | appears contextually      |
| `StatusBadge`     | `success/warning/error/info` | transparent             | state color                        | state color      | used in Results/Dashboard |

### 5.3 Surfaces

| Component | Variant    | Background              | Border                     | Radius           | Notes                            |
| --------- | ---------- | ----------------------- | -------------------------- | ---------------- | -------------------------------- |
| `Card`    | `default`  | `--pf-surface-card-bg`  | `--pf-surface-card-border` | `--pf-radius-md` | Home features, Results cards     |
| `Panel`   | `elevated` | `--pf-color-bg-surface` | `--pf-color-border-strong` | `--pf-radius-md` | banners and important containers |
| `Input`   | `default`  | `--pf-color-bg-subtle`  | `--pf-color-border-subtle` | `--pf-radius-md` | Onboarding input row             |

## 6. Motion and Accessibility

1. Respect `prefers-reduced-motion`; route and ambient animations must degrade cleanly.
2. Use focus-visible with `--pf-focus-ring` and clear outline offset.
3. Keep text contrast strong against surfaces and dynamic backgrounds.

## 6.1 Cursor-Reactive Ambient Layer

The shell may include a cursor-following spotlight effect to make the interface feel alive without becoming distracting.

Rules:

1. Keep the effect subtle and low-opacity.
2. Never use it as the only way to communicate state.
3. Disable it entirely for reduced motion users.
4. Render it as a background layer only, never above interactive controls.

## 7. Implementation Contract

1. New UI work must reference design tokens before introducing literal color values.
2. Component variants should map to this matrix, not ad hoc style permutations.
3. All implementation should use the `--pf-*` token namespace exclusively.

## 8. Governance

Any change to token names, values, or variant semantics requires:

1. Update this file.
2. Update `frontend/src/index.css`.
3. Update affected UI components/tests in the same pull request.

# PathFinder AI Branding Specification

Status: Approved source of truth for visual language, design tokens, and component variants.

Owners: UI/UX + Frontend.

Last updated: 2026-04-04.

## 1. Purpose

This document defines the canonical brand system for PathFinder AI. Design files, React UI code, and QA expectations must align with this spec.

If implementation and mockups diverge, this file is the tie-breaker.

## 2. Brand Principles

1. Credible and intentional over playful.
2. Explainable and transparent over decorative.
3. One shell, track-aware accents.
4. Strong state communication for loading, success, warning, and error.

## 3. Token Source of Truth

All tokens are implemented in `frontend/src/index.css` and must be consumed through CSS variables.

### 3.1 Foundation Tokens

| Token                      | Value                                  | Usage                             |
| -------------------------- | -------------------------------------- | --------------------------------- |
| `--pf-color-bg-canvas`     | `#0f1117`                              | App/page background               |
| `--pf-color-bg-surface`    | `#1a1d27`                              | Cards, nav, elevated panels       |
| `--pf-color-bg-subtle`     | `#252830`                              | Inputs, muted controls            |
| `--pf-color-border-subtle` | `#2e3140`                              | Default border                    |
| `--pf-color-border-strong` | `#3a3f52`                              | Emphasized border/focus ring base |
| `--pf-color-text-primary`  | `#e4e6eb`                              | Primary text                      |
| `--pf-color-text-muted`    | `#8b8fa3`                              | Secondary text                    |
| `--pf-color-text-inverse`  | `#ffffff`                              | Text on strong fills              |
| `--pf-color-brand-500`     | `#6366f1`                              | Brand/action base                 |
| `--pf-color-brand-400`     | `#818cf8`                              | Hover/focus accent                |
| `--pf-color-success-500`   | `#22c55e`                              | Success state                     |
| `--pf-color-warning-500`   | `#f59e0b`                              | Warning state                     |
| `--pf-color-danger-500`    | `#ef4444`                              | Error/destructive state           |
| `--pf-radius-sm`           | `8px`                                  | Small chips/badges                |
| `--pf-radius-md`           | `12px`                                 | Buttons/cards/inputs              |
| `--pf-radius-pill`         | `999px`                                | Pills and soft badges             |
| `--pf-font-family-display` | `"Sora", "Manrope", sans-serif`        | Headlines and high-emphasis text  |
| `--pf-font-family-base`    | `"Manrope", "Segoe UI", sans-serif`    | Primary UI font family            |
| `--pf-font-family-accent`  | `"Space Grotesk", "Sora", sans-serif`  | Hero emphasis and editorial beats |
| `--pf-font-family-mono`    | `"IBM Plex Mono", Consolas, monospace` | Session ids and code/data text    |
| `--pf-shadow-soft`         | `0 6px 14px rgba(0,0,0,0.2)`           | Hover elevation                   |
| `--pf-shadow-pressed`      | `0 2px 6px rgba(0,0,0,0.25)`           | Active/pressed elevation          |
| `--pf-motion-fast`         | `120ms`                                | Fast interactive transitions      |
| `--pf-motion-base`         | `180ms`                                | Standard transitions              |

### 3.2 Semantic Tokens

| Token                      | Value                           |
| -------------------------- | ------------------------------- |
| `--pf-surface-card-bg`     | `var(--pf-color-bg-surface)`    |
| `--pf-surface-card-border` | `var(--pf-color-border-subtle)` |
| `--pf-focus-ring`          | `var(--pf-color-brand-400)`     |
| `--pf-progress-neutral`    | `var(--pf-color-brand-500)`     |
| `--pf-progress-complete`   | `var(--pf-color-success-500)`   |

### 3.3 Component Tokens

| Token                       | Value                           | Used by                |
| --------------------------- | ------------------------------- | ---------------------- |
| `--pf-btn-primary-bg`       | `var(--pf-color-brand-500)`     | Primary button         |
| `--pf-btn-primary-text`     | `var(--pf-color-text-inverse)`  | Primary button         |
| `--pf-btn-secondary-bg`     | `var(--pf-color-bg-surface)`    | Secondary button       |
| `--pf-btn-secondary-text`   | `var(--pf-color-text-primary)`  | Secondary button       |
| `--pf-btn-secondary-border` | `var(--pf-color-border-subtle)` | Secondary button       |
| `--pf-btn-success-bg`       | `var(--pf-color-success-500)`   | Analyze/confirm button |
| `--pf-chip-bg`              | `var(--pf-color-bg-subtle)`     | Base chip              |
| `--pf-chip-border`          | `var(--pf-color-border-subtle)` | Base chip              |
| `--pf-chip-text`            | `var(--pf-color-text-primary)`  | Base chip              |
| `--pf-chip-selected-bg`     | `rgba(99, 102, 241, 0.16)`      | Selected chip          |
| `--pf-chip-selected-border` | `var(--pf-color-brand-500)`     | Selected chip          |
| `--pf-chip-followup-bg`     | `rgba(255, 255, 255, 0.02)`     | Follow-up chip         |
| `--pf-chip-followup-border` | `var(--pf-color-border-subtle)` | Follow-up chip         |

## 4. Track Accent Rules

Track colors are applied as accents only, not full-theme overrides.

1. Keep global shell, typography, and base surfaces unchanged.
2. Apply track accents to badges, score highlights, and selected states.
3. Never reduce contrast below accessible levels for text and controls.

## 5. Component Variant Matrix

### 5.1 Buttons

| Component | Variant     | Background              | Border                      | Text                      | States                                          |
| --------- | ----------- | ----------------------- | --------------------------- | ------------------------- | ----------------------------------------------- |
| `Button`  | `primary`   | `--pf-btn-primary-bg`   | none                        | `--pf-btn-primary-text`   | hover: brighten, active: translate+press shadow |
| `Button`  | `secondary` | `--pf-btn-secondary-bg` | `--pf-btn-secondary-border` | `--pf-btn-secondary-text` | hover: subtle lift                              |
| `Button`  | `success`   | `--pf-btn-success-bg`   | none                        | `--pf-color-text-inverse` | used for analysis start                         |
| `Button`  | `disabled`  | muted surface           | subtle border               | muted text                | no pointer interaction                          |

### 5.2 Chips and Badges

| Component         | Variant                      | Background              | Border                             | Text             | States                    |
| ----------------- | ---------------------------- | ----------------------- | ---------------------------------- | ---------------- | ------------------------- |
| `QuickChoiceChip` | `base`                       | `--pf-chip-bg`          | `--pf-chip-border`                 | `--pf-chip-text` | hover/tap motion enabled  |
| `QuickChoiceChip` | `selected`                   | `--pf-chip-selected-bg` | `--pf-chip-selected-border`        | primary text     | selected weight = 700     |
| `QuickChoiceChip` | `followup`                   | `--pf-chip-followup-bg` | dashed `--pf-chip-followup-border` | primary text     | appears contextually      |
| `StatusBadge`     | `success/warning/error/info` | transparent             | state color                        | state color      | used in Results/Dashboard |

### 5.3 Surfaces

| Component | Variant    | Background              | Border                     | Radius           | Notes                            |
| --------- | ---------- | ----------------------- | -------------------------- | ---------------- | -------------------------------- |
| `Card`    | `default`  | `--pf-surface-card-bg`  | `--pf-surface-card-border` | `--pf-radius-md` | Home features, Results cards     |
| `Panel`   | `elevated` | `--pf-color-bg-surface` | `--pf-color-border-strong` | `--pf-radius-md` | banners and important containers |
| `Input`   | `default`  | `--pf-color-bg-subtle`  | `--pf-color-border-subtle` | `--pf-radius-md` | Onboarding input row             |

### 5.4 Iconography

Use a single outlined icon family (`lucide-react`) to keep visual rhythm consistent.

All icon + label combinations should use the shared `IconLabel` helper (`frontend/src/components/ui/IconLabel.tsx`).

Variant scale:

| Variant   | Size | Stroke | Usage                            |
| --------- | ---- | ------ | -------------------------------- |
| `compact` | 13px | 1.9    | track rows, compact card labels  |
| `nav`     | 14px | 1.9    | top navigation and theme switch  |
| `action`  | 14px | 1.9    | Dashboard action labels          |
| `section` | 14px | 1.9    | Results section and meta headers |
| `cta`     | 16px | 2.0    | primary call-to-action buttons   |

Rules:

1. Use icons on primary navigation items and high-intent CTAs.
2. Pair icons with text labels for clarity; avoid icon-only controls unless universally recognized.
3. Use only the standardized IconLabel variants for icon size and stroke weight.
4. Use semantic token colors, not hard-coded fills/strokes.
5. For track cards, map one icon per track so users can identify lanes at a glance.

## 6. Motion and Accessibility

1. Respect `prefers-reduced-motion`; route and ambient animations must degrade cleanly.
2. Use focus-visible with `--pf-focus-ring` and clear outline offset.
3. Keep text contrast strong against surfaces and dynamic backgrounds.

## 6.1 Cursor-Reactive Ambient Layer

The shell may include a cursor-following spotlight effect to make the interface feel alive without becoming distracting.

Rules:

1. Keep the effect subtle and low-opacity.
2. Never use it as the only way to communicate state.
3. Disable it entirely for reduced motion users.
4. Render it as a background layer only, never above interactive controls.

## 6.2 Theme Modes

PathFinder AI supports both dark and light themes with the same layout, typography, and component structure.

Rules:

1. Dark mode remains the default brand presentation.
2. Light mode should reuse the same token names and only swap values.
3. The theme choice should persist per user and respect the system preference on first load.
4. Cursor-reactive and ambient layers should be softened in light mode, not removed.
5. Theme switching should use a short fluid transition (~320ms) for color, border, and icon stroke properties, and must be disabled for reduced motion users.

## 6.3 Home Hero Composition

The Home hero should feel editorial and dynamic while remaining readable and conversion-oriented.

Rules:

1. Use a layered hero panel with at least one low-opacity animated glow behind content.
2. Use `--pf-font-family-accent` only for emphasis phrases, not full paragraphs.
3. Keep motion subtle and continuous (slow drift), and disable non-essential loops for reduced motion users.
4. Present core value props as short signal cards above the primary CTA.
5. A single hero phrase may rotate words with a soft transition cadence; reduced motion must render a static phrase.
6. Track cards should drive a hover/focus preview carousel with directional slide animation.
7. Hero parallax should respond to cursor movement only on desktop breakpoints and reset on pointer leave.

## 6.4 Ambient Mood Profiles

The ambient background system should keep one visual language while tuning intensity per page context.

Rules:

1. Use route-based mood profiles instead of separate background implementations.
2. Home should feel most energetic (faster drift, stronger opacity).
3. Dashboard should feel calmer (slower drift, reduced opacity and cursor strength).
4. Other pages can use intermediate moods (guided/results) that sit between Home and Dashboard.
5. Reduced motion must disable all mood animation equally across profiles.

## 7. Implementation Contract

1. New UI work must reference design tokens before introducing literal color values.
2. Component variants should map to this matrix, not ad hoc style permutations.
3. All implementation should use the `--pf-*` token namespace exclusively.

## 8. Governance

Any change to token names, values, or variant semantics requires:

1. Update this file.
2. Update `frontend/src/index.css`.
3. Update affected UI components/tests in the same pull request.
