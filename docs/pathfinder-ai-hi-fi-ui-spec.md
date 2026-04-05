# PathFinder AI High-Fidelity UI Specification

This specification defines exact visual tokens and usage rules for production UI implementation.

Companion documents:

- docs/pathfinder-ai-ux-package.md
- docs/pathfinder-ai-prototype-map.md

## 1. Token Architecture

Use token namespaces so UI code can stay semantic and track-aware.

- foundation: raw scales (spacing, typography, radii, shadows, motion)
- semantic: role-based tokens (surface, text, border, status)
- track: per-track accent and contextual palettes

## 2. Foundation Tokens

### 2.1 Spacing Scale

Base unit: 4 px

| Token    | Value |
| -------- | ----- |
| space-0  | 0 px  |
| space-1  | 4 px  |
| space-2  | 8 px  |
| space-3  | 12 px |
| space-4  | 16 px |
| space-5  | 20 px |
| space-6  | 24 px |
| space-8  | 32 px |
| space-10 | 40 px |
| space-12 | 48 px |
| space-16 | 64 px |
| space-20 | 80 px |

### 2.2 Layout Widths

| Token               | Value  |
| ------------------- | ------ |
| content-max-default | 960 px |
| content-max-chat    | 720 px |
| content-max-results | 860 px |
| nav-height          | 60 px  |

### 2.3 Radius Tokens

| Token       | Value  |
| ----------- | ------ |
| radius-0    | 0 px   |
| radius-xs   | 6 px   |
| radius-sm   | 8 px   |
| radius-md   | 12 px  |
| radius-lg   | 16 px  |
| radius-xl   | 24 px  |
| radius-pill | 999 px |

### 2.4 Border Tokens

| Token           | Value |
| --------------- | ----- |
| border-thin     | 1 px  |
| border-strong   | 2 px  |
| border-featured | 3 px  |

### 2.5 Elevation Tokens

| Token      | Value                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------- |
| shadow-0   | none                                                                                      |
| shadow-1   | 0 1px 2px rgba(10, 14, 24, 0.14)                                                          |
| shadow-2   | 0 4px 10px rgba(10, 14, 24, 0.18)                                                         |
| shadow-3   | 0 10px 24px rgba(10, 14, 24, 0.22)                                                        |
| glow-track | 0 0 0 1px currentColor inset, 0 0 0 4px color-mix(in srgb, currentColor 16%, transparent) |

### 2.6 Motion Tokens

| Token           | Duration | Easing                         |
| --------------- | -------- | ------------------------------ |
| motion-fast     | 120 ms   | cubic-bezier(0.2, 0.0, 0.2, 1) |
| motion-base     | 180 ms   | cubic-bezier(0.2, 0.0, 0.2, 1) |
| motion-slow     | 320 ms   | cubic-bezier(0.2, 0.0, 0.0, 1) |
| motion-progress | 360 ms   | cubic-bezier(0.2, 0.9, 0.2, 1) |

## 3. Typography System

### 3.1 Font Families

- brand-display: Sora, Manrope, Segoe UI, sans-serif
- body-ui: Plus Jakarta Sans, Inter, Segoe UI, sans-serif
- mono-data: IBM Plex Mono, Consolas, monospace

### 3.2 Type Scale

| Token           | Size  | Line Height | Weight | Use             |
| --------------- | ----- | ----------- | ------ | --------------- |
| type-display-xl | 52 px | 1.08        | 700    | Hero title      |
| type-display-lg | 44 px | 1.1         | 700    | Screen headline |
| type-h1         | 32 px | 1.2         | 700    | Page title      |
| type-h2         | 24 px | 1.25        | 700    | Section title   |
| type-h3         | 20 px | 1.3         | 650    | Card heading    |
| type-body-lg    | 18 px | 1.6         | 400    | Lead paragraph  |
| type-body-md    | 16 px | 1.6         | 400    | Default body    |
| type-body-sm    | 14 px | 1.5         | 500    | Helper copy     |
| type-label      | 12 px | 1.4         | 600    | Labels, pills   |
| type-mono-sm    | 12 px | 1.4         | 500    | Session ids     |

### 3.3 Tracking

| Token          | Letter Spacing |
| -------------- | -------------- |
| tracking-tight | -0.02 em       |
| tracking-base  | 0              |
| tracking-wide  | 0.04 em        |
| tracking-xwide | 0.08 em        |

## 4. Semantic Color Tokens

### 4.1 Global Semantic Roles

| Token                | Value   | Use                          |
| -------------------- | ------- | ---------------------------- |
| color-bg-canvas      | #0D1119 | App background               |
| color-bg-surface     | #151B27 | Cards and nav                |
| color-bg-input       | #1E2533 | Inputs and pills             |
| color-border-default | #2A3245 | Dividers and default borders |
| color-border-strong  | #3A4764 | Focused containers           |
| color-text-primary   | #EAF0FF | Main text                    |
| color-text-secondary | #A8B4D3 | Secondary text               |
| color-text-disabled  | #6E7893 | Disabled text                |
| color-status-success | #22C55E | Success states               |
| color-status-warning | #F59E0B | Warning states               |
| color-status-danger  | #EF4444 | Error states                 |
| color-status-info    | #38BDF8 | Informational states         |

### 4.2 Track Tokens

Each track defines accent, subtle surface, border tint, and on-accent text.

| Track             | Accent  | Accent Hover | Surface Soft | Border Tint | On Accent |
| ----------------- | ------- | ------------ | ------------ | ----------- | --------- |
| general           | #64748B | #7B8798      | #1B2332      | #3A4A63     | #F8FAFC   |
| tech-career       | #06B6D4 | #22D3EE      | #132734      | #1C6170     | #ECFEFF   |
| healthcare-pivot  | #0EA5A4 | #14B8A6      | #122A2A      | #1F6660     | #F0FDFA   |
| creative-industry | #F97316 | #FB923C      | #2C1D1A      | #7A4A2E     | #FFF7ED   |

### 4.3 Gradient Tokens by Track

| Track             | Hero Gradient                                                  |
| ----------------- | -------------------------------------------------------------- |
| general           | linear-gradient(135deg, #64748B 0%, #94A3B8 48%, #64748B 100%) |
| tech-career       | linear-gradient(135deg, #06B6D4 0%, #22D3EE 48%, #0EA5E9 100%) |
| healthcare-pivot  | linear-gradient(135deg, #0EA5A4 0%, #2DD4BF 48%, #14B8A6 100%) |
| creative-industry | linear-gradient(135deg, #F97316 0%, #FB923C 48%, #EA580C 100%) |

## 5. Screen-Level High-Fidelity Specs

## 5.1 Home

Container and spacing:

- top offset from nav: 48 px
- horizontal page padding: 24 px desktop, 20 px tablet, 16 px mobile
- hero to track grid gap: 32 px
- track grid to CTA gap: 24 px
- CTA to feature strip gap: 48 px

Track card spec:

- min width: 220 px
- padding: 16 px
- border: 2 px when selected, 1 px otherwise
- title: type-body-sm 700
- description: type-label 500
- sponsor meta: type-label 500 at 75% opacity
- selected style: border uses track accent, optional glow-track

CTA spec:

- height: 48 px
- horizontal padding: 32 px
- typography: type-body-sm 600
- radius: radius-md
- default color: track accent

## 5.2 Onboarding

Container and spacing:

- max width: 720 px
- chat top padding: 24 px
- message gap: 16 px
- input dock top border: border-thin color-border-default
- input dock vertical padding: 16 px

Message bubble spec:

- max width: 85% desktop, 88% tablet, 92% mobile
- padding: 12 px 16 px
- radius: radius-md
- assistant bubble: color-bg-surface, color-text-primary
- user bubble: track accent at 16% overlay on color-bg-surface

Input spec:

- height: 46 px
- input padding: 12 px 16 px
- send button height: 46 px
- send button width: min 96 px

Analyze button states:

- hidden while intake incomplete and CTA not yet unlocked
- disabled when session is not intake
- enabled only when intake complete and session status intake

## 5.3 Results

Container and spacing:

- max width: 860 px
- page top padding: 32 px
- header to first card gap: 24 px
- card stack gap: 20 px

Recommendation card spec:

- padding: 28 px 24 px desktop, 22 px 18 px mobile
- radius: radius-md
- border: border-thin default
- featured card left border: border-featured track accent

Fit score badge:

- min width: 84 px
- height: 32 px
- radius: radius-pill
- font: type-label 600

Section styles inside card:

- section title: type-label 700 tracking-wide
- chips: height 28 px, horizontal padding 12 px
- salary and next steps in two columns on desktop, stacked on mobile

## 5.4 Dashboard

Container and spacing:

- max width: 860 px
- top padding: 32 px
- row gap: 10 px
- session row padding: 16 px 20 px

Session row spec:

- border radius: radius-md
- status pill height: 22 px
- status pill horizontal padding: 8 px
- session id font: type-mono-sm
- action label font: type-body-sm 600

Empty state spec:

- vertical padding: 60 px
- border style: 1 px dashed color-border-default
- CTA min width: 220 px

## 6. Responsive Breakpoint Rules

### Mobile: 320 to 767 px

- home track cards in single column
- dashboard rows stack metadata above action
- results badge drops below title if width constrained
- onboarding input remains sticky with 16 px safe padding

### Tablet: 768 to 1023 px

- home cards use two-column grid
- results details can switch to two-column layout when card width allows
- dashboard header can wrap CTA under title when needed

### Desktop: 1024 px and above

- all main surfaces use centered max-width containers
- top-level navigation remains single-row
- results cards use full two-column interior layout for details

## 7. CSS Variable Contract Template

Use this naming pattern in implementation:

- --pf-space-\*
- --pf-radius-\*
- --pf-font-\*
- --pf-color-\*
- --pf-track-\*

Minimum required variables:

- --pf-color-bg-canvas
- --pf-color-bg-surface
- --pf-color-bg-input
- --pf-color-border-default
- --pf-color-text-primary
- --pf-color-text-secondary
- --pf-track-accent
- --pf-track-accent-hover
- --pf-track-surface-soft
- --pf-track-border-tint

## 8. QA Checklist for Visual Fidelity

- all spacing values map to defined spacing tokens
- heading/body typography uses defined type tokens
- selected track style updates both color and emphasis
- results top match is visually distinct from other cards
- mobile layouts preserve readability and tap targets
- focus states visible on all interactive controls

## 9. Implementation Sequence

1. move global CSS to tokenized variables
2. apply typography classes or inline token mapping
3. add track token resolver and bind to selected track
4. update Home, Onboarding, Results, Dashboard spacing and type
5. validate responsive behavior by breakpoint and record screenshots
