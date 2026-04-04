# PathFinder AI — Judge Narrative

## One-Liner
An AI career advisor that interviews you across 12 dimensions and delivers scored, actionable career recommendations in real time.

---

## The Problem
Career decisions are among the highest-stakes choices people make, yet most people navigate them with Google searches, generic quizzes, or expensive career coaches. Existing tools either reduce you to a personality type or overwhelm you with unfiltered job listings. Nobody connects *who you are* to *what you should do* in a structured, evidence-based way.

---

## What We Built

**PathFinder AI** is a full-stack career advising application with three stages:

### 1. Conversational Intake (12 dimensions)
A chat-based interview that progressively builds a structured career profile across:
- Interests, values, and working style
- Hard and soft skills
- Risk tolerance and financial constraints
- Geographic flexibility and education
- Timeline urgency
- Purpose/meaning priorities and burnout concerns

Each answer is parsed in real time into structured data — the profile builds visibly as you talk.

### 2. Multi-Agent Analysis
The completed profile is sent to a multi-agent backend (Fetch.ai uAgents) where specialized agents evaluate career fit across different angles: skill matching, values alignment, market demand, salary viability, and burnout risk. Progress streams back via SSE.

### 3. Scored Recommendations
Results are presented as career cards with:
- **Fit score** (0–100%) showing how well the role matches
- **Why it fits** — specific reasons tied to your profile
- **Watch out for** — honest concerns
- **Next steps** — concrete actions: certifications, companies to target, portfolio projects
- **Salary range** — market-based compensation data

---

## Architecture

```
React SPA  ←→  Fastify API Gateway  ←→  Python Agent Service
   (Vite)        (TypeScript)           (Fetch.ai uAgents)
                     ↕
                SQLite (Drizzle ORM)
```

- **Frontend**: React 19 + TypeScript + TanStack Query + React Router + Zod validation
- **API**: Fastify 5 + TypeScript + Drizzle ORM + SQLite + SSE streaming
- **Agent service**: Python + Fetch.ai uAgents framework (multi-agent orchestration)
- **Contract**: Zod schemas shared between frontend and API — every request and response is validated at both ends

---

## Technical Highlights

- **Deterministic fallback engine**: The intake works without any LLM — a scripted question sequence with regex-based extraction ensures the demo always works, even if the agent service is down
- **State machine with guards**: Sessions follow strict transitions (intake → analyzing → complete) with validation at every step. Invalid transitions return clear errors.
- **Self-test endpoint** (`/ready`): Runs a full end-to-end golden path internally and reports a structured checklist — hit it once before a demo to guarantee everything works
- **29 integration tests** covering the complete happy path and all error paths
- **Observability**: Every response carries `X-Request-Id` and `X-Response-Time` headers; errors include request IDs for tracing
- **Demo mode**: `DEMO_MODE=true` enables operator tools, backup scenarios, and deterministic SSE timing without needing the Python agent service

---

## What Makes This Different

1. **Structured, not vibes**: 12 explicit dimensions, not a vague "what's your personality type"
2. **Multi-agent, not single-prompt**: Different agents specialize in different aspects of career fit
3. **Actionable output**: Not just "you'd be good at X" — specific companies, certifications, portfolio projects, and salary ranges
4. **Honest concerns**: Every recommendation includes what might go wrong, not just why it's great
5. **Real-time streaming**: Watch the analysis happen live, not a loading screen then a dump

---

## Demo Flow (2 minutes)

1. **[15s]** Home page — explain the problem and the 12-dimension approach
2. **[60s]** Onboarding — answer 3-4 questions live, show profile progress bar filling
3. **[10s]** Click "Analyze" — show the streaming progress spinner
4. **[35s]** Results page — walk through the top recommendation: fit score, reasons, salary, next steps
5. **[10s]** Dashboard — show multiple sessions, link to the backup scenario for a different persona

---

## Team

DiamondHacks 2026 — Built in 24 hours.
