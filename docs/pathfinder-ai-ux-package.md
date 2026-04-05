# PathFinder AI UX Package

This document turns the UI/UX brief into concrete product artifacts: user flows, screen-level wireframes, prototype behavior, usability assessment, and a test plan. It is grounded in the current app routes: Home, Onboarding, Results, and Dashboard.

Visual prototype companion: docs/pathfinder-ai-prototype-map.md
High-fidelity UI spec: docs/pathfinder-ai-hi-fi-ui-spec.md
Engineering state contract: frontend/src/types/uiStateContract.ts
State contract tests: frontend/src/**tests**/ui-state-contract.test.ts

## Design Goals

- Make the product feel like a serious career advisor, not a generic chatbot.
- Make track choice visibly change the tone, emphasis, and recommendation treatment.
- Keep analysis states alive and understandable.
- Present results as a structured report with clear ranking, tradeoffs, and next steps.
- Preserve a single brand shell while allowing track-specific accents.

## Core Information Architecture

- Home: explain the product and select a track.
- Onboarding: complete the 12-question interview and build the profile.
- Analysis: show active processing with progress, stage text, and track context.
- Results: present ranked matches, fit score, reasons, concerns, salary range, and next steps.
- Dashboard: revisit sessions, recover unfinished work, and compare completed assessments.

## User Flows

### Flow 1: First-Time Assessment

1. User lands on Home.
2. User reads the track cards and selects the path that best matches their goal.
3. User starts the assessment and is routed to Onboarding with a session id.
4. User answers the structured questions in chat form.
5. The profile summary grows as answers are recorded.
6. When intake is complete, the Analyze action becomes available.
7. User triggers analysis and is routed to Results.
8. Results stream progress until recommendations are ready.
9. User reviews the ranked matches and chooses a next step.

Success criteria:

- User understands why the selected track matters.
- User can see progress during intake and analysis.
- User reaches a completed recommendation set without confusion.

### Flow 2: Returning User Continues a Session

1. User opens Dashboard.
2. User finds an intake session marked in progress.
3. User opens it and returns to Onboarding at the correct point.
4. User continues the chat, completes intake, and starts analysis.
5. User lands in Results with no duplicate setup steps.

Success criteria:

- The session state is obvious.
- The correct resume action is one click away.

### Flow 3: Analysis Recovery

1. User starts analysis.
2. The analysis stream slows, errors, or falls back.
3. The UI labels what is happening in plain language.
4. User can wait, retry, or go back to Dashboard.
5. If fallback recommendations are used, they are framed as personalized offline results rather than a broken state.

Success criteria:

- The user never sees a dead loading screen.
- Fallback behavior is understandable and trustworthy.

### Flow 4: Session Review and Comparison

1. User opens Dashboard.
2. User scans session statuses and track labels.
3. User opens a completed session to review results or an incomplete session to continue.
4. User starts a new assessment if needed.

Success criteria:

- Session list supports recovery and comparison.
- Action labels match the current state.

## Screen Concepts

### 1. Home and Track Selection

Primary purpose:

- Explain the product.
- Make the track system legible.
- Push one clear primary action.

Recommended structure:

- Hero with short, credibility-focused value statement.
- Four track cards arranged in a responsive grid.
- One highlighted default track, ideally Tech Career Accelerator.
- Short evidence strip or feature trio beneath the CTA.

Desktop wireframe:

```text
--------------------------------------------------------------
| PathFinder AI                                  Home Sessions |
--------------------------------------------------------------
|                                                              |
|  Find the career path that actually fits you                 |
|  Short paragraph explaining the 12-dimension assessment.     |
|                                                              |
|  [ Tech Career Accelerator   ] [ Healthcare Pivot         ]  |
|  [ General Advising          ] [ Creative Industry Paths  ]  |
|                                                              |
|  Choose a track to change the tone and recommendation focus. |
|                                                              |
|  [ Start Assessment ]                                         |
|                                                              |
|  12-Dimension Profile | AI-Scored Matches | Track Insights    |
--------------------------------------------------------------
```

Track-specific behavior:

- General: neutral, clean, broad framing.
- Tech: strongest contrast, crisp accent, data-forward language.
- Healthcare: calmer color system, reassuring copy.
- Creative: editorial spacing, slightly more expressive composition.

### 2. Onboarding Chat

Primary purpose:

- Keep the 12-question interview conversational while still feeling structured.
- Show profile growth and completion status.

Recommended structure:

- Fixed header with session state and track label.
- Main message column with alternating user and assistant bubbles.
- Visible profile progress summary near the input area.
- Sticky input bar with a clear send action and analyze state.

Desktop wireframe:

```text
--------------------------------------------------------------
| PathFinder AI | Session 1234 | Tech Track | Intake 7/12      |
--------------------------------------------------------------
| Profile snapshot: skills | values | pace | location | goals  |
|                                                              |
| Assistant: First question...                                 |
| User: My answer...                                            |
| Assistant: Follow-up question...                              |
| User: My answer...                                            |
|                                                              |
| [ chat scroll area with progress-conscious spacing ]         |
|                                                              |
| [ Type your answer...                      ] [ Send ]        |
| Profile complete: 9/12  | Analyze available when ready       |
--------------------------------------------------------------
```

Behavior rules:

- After each answer, the profile summary should visibly update.
- The Analyze action should remain disabled until intake completion.
- If the session is already beyond intake, the user should be redirected to Results.

### 3. Analysis State

Primary purpose:

- Prevent the perception that the app has stalled.
- Explain what the system is doing and where it is in the process.

Recommended structure:

- Large progress indicator.
- Stage label that changes as the analysis advances.
- Track banner with accent color and sponsor label.
- Short explanation beneath the progress bar.

Desktop wireframe:

```text
--------------------------------------------------------------
| PathFinder AI                                                |
--------------------------------------------------------------
|                     [ spinner / progress ]                   |
|                     Stage: Matching your profile            |
|                     Finding best-fit roles for Tech track   |
|                                                              |
|                     64%                                      |
|                     [===========-----]                       |
|                                                              |
|             This usually takes less than a minute.           |
--------------------------------------------------------------
```

Behavior rules:

- Progress updates should be frequent enough to feel live.
- If a fallback engine is used, label it gently and explicitly.
- If the stream drops, the screen should offer a clear retry path.

### 4. Results

Primary purpose:

- Present recommendations as a ranked advisory report.
- Make the top recommendation feel featured and credible.

Recommended structure:

- Summary header with track context and completion state.
- Featured top recommendation card with fit score, why it fits, and concerns.
- Secondary cards ordered by score.
- Salary and next steps grouped per role.
- Clear fallback banner when offline analysis was used.

Desktop wireframe:

```text
--------------------------------------------------------------
| Track banner | Fallback banner if needed                     |
| Your Top Career Matches                                      |
| Short explanation of score and ranking logic                |
|                                                              |
| [Best match card]                                            |
|  Role title     92% fit                                      |
|  Summary paragraph                                            |
|  Why it fits: 3-5 chips or grouped reasons                   |
|  Watch out for: 2-3 tradeoffs                                |
|  Salary range | Next steps | Track resources                |
|                                                              |
| [Secondary recommendation cards]                             |
| [Tertiary recommendation cards]                              |
--------------------------------------------------------------
```

Behavior rules:

- The first card should be visually stronger than the rest.
- Concerns must be visible, not buried.
- Next steps should feel actionable, not generic.

### 5. Dashboard

Primary purpose:

- Support session recovery and revisit behavior.
- Provide a quick read of lifecycle state.

Recommended structure:

- Session list with id, status, track, and updated time.
- Clear action label that changes with state.
- Empty state with strong first-run guidance.

Desktop wireframe:

```text
--------------------------------------------------------------
| Sessions                                         + New       |
| 4 sessions | 2 complete | 1 analyzing | 1 intake            |
|                                                              |
| [id] [status] [track]  14 messages  12m ago     Continue ->  |
| [id] [status] [track]   9 messages  48m ago       See ->     |
| [id] [status] [track]   0 messages   just now     Retry ->   |
--------------------------------------------------------------
```

Behavior rules:

- Completed sessions should open Results directly.
- Intake sessions should open Onboarding.
- Analyzing sessions should open Results with live progress.

## Prototype Plan

### Prototype Scope

Build a medium-fidelity clickable prototype with four main screens and one transient analysis state.

### Prototype Interactions

- Home track selection updates the visual accent and copy tone.
- Start Assessment creates a session and moves into Onboarding.
- Sending a chat message updates the profile summary and intake count.
- Analyze moves to the Results loading state.
- Results transitions from loading to live progress to final recommendation cards.
- Dashboard cards route to the correct state based on session status.

### Motion And Feedback

- Use short fades and subtle slides for message arrival.
- Use progress bar growth and stage text updates during analysis.
- Use color and border changes to reinforce selected track and active status.
- Avoid decorative motion that does not explain state.

## Usability Assessment

### Heuristic Review

1. Visibility of system status: strong if analysis and intake progress are always visible.
2. Match between system and real world: strong if track labels and recommendation language stay career-focused.
3. User control and freedom: medium; users need clear paths to continue, retry, or restart.
4. Consistency and standards: strong if track cards, status pills, and action labels share one grammar.
5. Error prevention: medium; the Analyze button should be disabled until ready.
6. Recognition rather than recall: strong if the profile snapshot summarizes what has been captured.
7. Flexibility and efficiency: strong if Dashboard supports resume and revisit.
8. Aesthetic and minimalist design: strong if the results page avoids walls of text.

### Primary Usability Risks

- Users may not understand why track choice matters if the differences are too subtle.
- Analysis may feel frozen if progress updates are too sparse.
- Results may feel generic if the top match is not clearly distinguished.
- Fallback analysis may feel like an error if it is not labeled carefully.
- Dashboard can feel administrative if it lacks recovery-first language.

### Recommended Fixes

- Make track selection cards visually and verbally distinct.
- Add stage-specific copy during analysis.
- Promote the top recommendation to a featured card.
- Show concerns and next steps alongside each role.
- Phrase session actions in plain language tied to current state.

## Test Design

### Research Questions

- Do users understand that the track changes the advice, not just the palette?
- Do users know where they are in the assessment at all times?
- Do users trust the analysis while it is in progress?
- Do users understand why the top recommendation is ranked first?
- Can users recover a partially completed session without help?

### Test Participants

- 5 to 7 participants is enough for a first usability pass.
- Include at least one participant interested in each major track type if possible: tech, healthcare, creative, and general exploration.

### Tasks

1. Choose the track that best matches your goal and start the assessment.
2. Answer several onboarding questions and identify what progress you have made.
3. Start analysis and explain what the screen is telling you.
4. Review the top recommendation and identify its strengths and concerns.
5. Find a completed session in Dashboard and open it.
6. Resume an incomplete session from Dashboard.

### Success Metrics

- Task completion rate.
- Time to select the right track.
- Time to understand the analysis state.
- Correct interpretation of the top recommendation.
- Number of participants who can resume a session without prompting.

### Moderated Test Script

1. Ask the participant what they think the product does.
2. Ask them to choose a track and explain their choice.
3. Observe whether they notice the progress and profile summary during onboarding.
4. Ask them what they think the analysis screen is doing.
5. Ask them to identify the best fit and explain why it is ranked first.
6. Ask them how they would return to a previous session.

### What To Record

- Misread labels.
- Hesitation before clicking the main CTA.
- Confusion about track differences.
- Misunderstanding of fallback mode.
- Friction in resuming sessions.

## Responsive Considerations

- Home track cards should collapse into a single-column stack on narrow screens.
- Onboarding should preserve comfortable chat width and keep the input bar easy to reach.
- Results cards should remain readable and avoid over-compressing the score badge.
- Dashboard rows should stack metadata cleanly rather than forcing horizontal overflow.

## Deliverable Summary

The design should read as one system with four meaningful variations:

- General: neutral and trustworthy.
- Tech: crisp and high-confidence.
- Healthcare: calm and dependable.
- Creative: expressive and editorial.

If the implementation follows the flows and wireframes above, the product should feel coherent, judge-ready, and materially more useful than a generic assessment chatbot.
