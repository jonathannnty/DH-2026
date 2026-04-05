# Multi-Agent System - Testing Guide

Current testing guide for the DH-2026 career guidance platform.

## Overview

The production flow coordinates **4 agents**:

1. Research
2. Profile Analysis
3. Recommendations
4. Report Generation

This guide focuses on commands and checks that match the current repository scripts and ports.

## Prerequisites

```bash
# Node
node --version
npm --version

# Python
python --version
```

Install dependencies from repository root:

```bash
npm install
pip install -r requirements.txt
```

## Services and Ports

- API: `http://localhost:3001`
- Agent service: `http://localhost:8000`
- Frontend (dev): `http://localhost:5173`

## Core Validation Workflow

### 1) Start services

```bash
# Terminal 1
python agent_service.py

# Terminal 2
npm run dev --workspace api
```

Optional UI terminal:

```bash
npm run dev --workspace frontend
```

### 2) Run workspace tests

```bash
npm run test --workspace frontend
npm run test --workspace api
```

### 3) Run quality gates

```bash
npm run build
npm run lint
```

## Level-Based Testing

## Level 1: Direct agent service checks (optional)

Test file:

- `api/src/__tests__/agent-service-level-1.test.ts`

This suite is intentionally gated and skipped by default.

```bash
RUN_LEVEL1_AGENT_TESTS=true npm run test --workspace api -- agent-service-level-1.test.ts
```

Validates:

- Agent service health
- 4-agent registration
- Sequencing and progress
- Structured output payloads

## Level 2: API integration checks

Primary files:

- `api/src/__tests__/agent-service-level-2.test.ts`
- `api/src/__tests__/golden-path.test.ts`
- `api/src/__tests__/contracts.test.ts`
- `api/src/__tests__/demo-golden-path.test.ts`

Run:

```bash
npm run test --workspace api
```

Validates:

- Session lifecycle
- Intake updates
- Analyze transition
- SSE behavior
- Recommendations and report readiness

## Level 3: Frontend exploratory E2E checks (optional)

Test file:

- `frontend/src/__tests__/multi-agent-e2e.test.tsx`

This suite is gated and skipped by default.

```bash
RUN_LEVEL3_E2E_TESTS=true npm run test --workspace frontend -- multi-agent-e2e.test.tsx
```

Use this when doing deeper exploratory validation, not as a default CI gate.

## Manual Smoke Checks

API health:

```bash
curl http://localhost:3001/health
```

Agent health:

```bash
curl http://localhost:8000/health
```

Session happy path smoke:

```bash
# create
curl -X POST http://localhost:3001/sessions

# follow with intake, analyze, and stream checks as needed
```

## Troubleshooting

Agent service not reachable:

```bash
curl http://localhost:8000/health
```

API not reachable:

```bash
curl http://localhost:3001/health
```

Missing dependencies:

```bash
npm install
pip install -r requirements.txt
```

## Related Docs

- `TESTING_QUICK_START.md`
- `docs/operator-playbook.md`
- `docs/demo-contingency-plan.md`
