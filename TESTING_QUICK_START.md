# Testing Multi-Agent System - Quick Start

## 🎯 TL;DR: Test All 3 Levels in 5 Minutes

### Step 1: Start Services (4 terminals)

```bash
# Terminal 1: Agent Service
python agent_service.py

# Terminal 2: Backend
cd api && npm run dev

# Terminal 3: Frontend (optional)
cd frontend && npm run dev

# Terminal 4: Run Tests
npm run test:agents
```

## 📋 What Gets Tested

### Level 1 ✓ Agent Service
**Files**: `api/src/__tests__/agent-service-level-1.test.ts`

Tests the agent service in isolation:
- All 4 agents registered?
- Do they run in order: research → profile → recommendations (with validation) → report?
- Does progress go from 0% → 100%?
- Does each agent produce output?

```bash
npm run test:agents:level1
```

### Level 2 ✓ Backend Integration
**Files**: `api/src/__tests__/agent-service-level-2.test.ts`

Tests backend orchestration with agents:
- Backend creates sessions?
- Collects profile from intake messages?
- Triggers agent service correctly?
- Stores results?
- Handles state transitions?

```bash
npm run test:agents:level2
```

### Level 3 ✓ Frontend E2E
**Files**: `frontend/src/__tests__/multi-agent-e2e.test.tsx`

Tests complete user journey:
- Can user complete onboarding?
- Does analysis start?
- Do results display?
- Can user see recommendations?

```bash
# Automated
cd frontend && npm run test -- multi-agent-e2e.test.tsx

# Manual
open http://localhost:5173
# Follow onboarding → analysis → results
```

## 🚀 Run Everything

```bash
# All unit tests (api + frontend)
npm run test

# All agent coordination tests
npm run test:agents

# Everything
npm run test:all
```

## 🔍 Individual Tests

```bash
# Test just agent service directly
npm run test:agents:level1

# Test backend with agent service
npm run test:agents:level2

# Manual Level 3 test
# (Open browser, click through UI)
```

## ✅ Success Checklist

After running all tests, verify:

- [ ] Level 1: Agents execute in correct order (0% → 100%)
- [ ] Level 2: Backend creates session and triggers agents
- [ ] Level 3: Frontend shows onboarding → analysis → results
- [ ] All tests pass with no errors
- [ ] No console errors (F12 in browser)

## 🛠️ Troubleshooting

**Agent service won't start?**
```bash
pip install -r requirements.txt
python agent_service.py
```

**Tests won't run?**
```bash
npm install
cd api && npm install
cd frontend && npm install
```

**Agent service won't connect from backend?**
```bash
# Check agent service is running
curl http://localhost:8000/health

# Check port 8000 is available
lsof -i :8000
```

## 📊 Expected Results

| Level | Expected Time | What Passes? |
|-------|---------------|--------------|
| Level 1 | 5-15s | All 4 agents run sequentially |
| Level 2 | 10-20s | Backend properly orchestrates |
| Level 3 | 30-60s | Full UI flow works |

---

## 📚 Full Documentation

For detailed testing guide, see: [`docs/TESTING.md`](./docs/TESTING.md)
