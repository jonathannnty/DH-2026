# Multi-Agent System - Testing Guide

Complete guide for testing the 3-level agent interaction system in the DH-2026 career guidance platform.

## Overview

The system consists of **5 specialized agents** that coordinate to analyze career profiles and generate recommendations:

1. **Research Agent** - Market research, trends, salary data
2. **Profile Analysis Agent** - User profile analysis, strengths/gaps
3. **Recommendation Agent** - Career path recommendations
4. **Verification Agent** - Data validation and consistency checks
5. **Report Generation Agent** - Final synthesized report

Testing verifies that all agents coordinate correctly and data flows properly through each stage.

---

## Prerequisites

### System Requirements

```bash
# Python 3.10+
python --version

# Node.js 18+
node --version
npm --version
```

### Install Dependencies

```bash
# Install Python dependencies (for agent service)
pip install -r requirements.txt

# Install Node dependencies
npm install

# Backend
cd api && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

---

## Quick Start: Test All 3 Levels

### Terminal 1: Start Agent Service

```bash
python agent_service.py
```

Output should show:
```
INFO:     Application startup complete
INFO:uvicorn     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2: Start Backend API

```bash
cd api
npm run dev
```

Should show Fastify listening on port 3000.

### Terminal 3: Start Frontend (Optional)

```bash
cd frontend
npm run dev
```

Frontend runs on http://localhost:5173

### Terminal 4: Run All Tests

```bash
# Run all 3 levels
python scripts/test-agents.py --level all

# Or run individual levels
python scripts/test-agents.py --level 1
python scripts/test-agents.py --level 2
python scripts/test-agents.py --level 3

# Verbose output
python scripts/test-agents.py --level all --verbose
```

---

## Level 1: Agent Service Direct Testing

**Purpose**: Verify the agent service works in isolation with all agents coordinating correctly.

### What Gets Tested

- ✓ Agent service health check
- ✓ All 5 agents are registered
- ✓ Agents execute in the correct order
- ✓ Progress updates from 0% → 100%
- ✓ Each agent produces proper output
- ✓ Report generation receives data from prior agents

### Run Level 1

```bash
# Start agent service
python agent_service.py

# In another terminal
python scripts/test-agents.py --level 1
```

### Expected Output

```
[STEP 1] Health check - verify all agents registered
✓ Agent service is healthy
ℹ Registered agents: research, profile_analysis, recommendations, verification, report_generation
✓ All 5 agents registered

[STEP 2] List agents - get detailed agent information
✓ Agent list retrieved
  - research: Researches job market trends and career opportunities
  - profile_analysis: Analyzes user profile to identify strengths and patterns
  ...

[STEP 3] Trigger analysis pipeline
✓ Analysis triggered (Session: level1-test-1712282400)

[STEP 4] Monitor agent execution
  → research (20%)
  → profile_analysis (40%)
  → recommendations (60%)
  → verification (80%)
  → report_generation (100%)
✓ Analysis completed!
```

### Manual Testing (curl)

```bash
# Health check
curl http://localhost:8000/health | jq

# List agents
curl http://localhost:8000/agents | jq

# Trigger analysis
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "manual-test-001",
    "profile": {
      "interests": ["AI", "Cloud"],
      "values": ["growth"],
      "technical_skills": ["Python"],
      "soft_skills": ["communication"],
      "experience_level": "mid_level"
    }
  }' | jq

# Check progress (run multiple times to watch progression)
curl http://localhost:8000/status/manual-test-001 | jq '.progress, .current_agent, .status'
```

### Test File

Location: `api/src/__tests__/agent-service-level-1.test.ts`

Run with:
```bash
cd api
npm run test -- agent-service-level-1.test.ts
```

---

## Level 2: Backend-to-Agent Service Integration

**Purpose**: Verify the backend properly orchestrates with the agent service through the complete user journey.

### What Gets Tested

- ✓ Session creation
- ✓ Intake message processing
- ✓ Profile accumulation from multiple messages
- ✓ Analysis trigger via backend
- ✓ Agent service invocation from backend
- ✓ Status state transitions
- ✓ Results retrieval
- ✓ Error handling

### Run Level 2

```bash
# Start all services
python agent_service.py &
cd api && npm run dev &

# In another terminal
python scripts/test-agents.py --level 2
```

### Expected Output

```
[STEP 1] Create session via backend
✓ Session created: 550e8400-e29b-41d4-a716-446655440000
ℹ Initial status: intake

[STEP 2] Send intake messages to gather profile
  Message 1: sent
  Message 2: sent
  Message 3: sent
  Message 4: sent
✓ Sent 4 intake messages

[STEP 3] Verify profile accumulated from messages
✓ Profile data accumulated
ℹ Profile keys: interests, values, skills, experience_level

[STEP 4] Trigger analysis via backend
✓ Analysis triggered

[STEP 5] Monitor session state progression
  → State: intake
  → State: analysis
  → State: results
✓ Analysis completed!
```

### Manual Testing (curl)

```bash
# Create session
SESSION_ID=$(curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{"trackId":null}' | jq -r '.id')

echo "Session: $SESSION_ID"

# Send intake messages
for msg in "I love AI and cloud" "I value innovation" "I know Python"; do
  curl -X POST http://localhost:3000/sessions/$SESSION_ID/messages \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"$msg\"}" | jq
  sleep 0.5
done

# Get session
curl http://localhost:3000/sessions/$SESSION_ID | jq

# Trigger analysis
curl -X POST http://localhost:3000/sessions/$SESSION_ID/analyze | jq

# Check status (poll multiple times)
curl http://localhost:3000/sessions/$SESSION_ID | jq '.status, .profile'
```

### Test File

Location: `api/src/__tests__/agent-service-level-2.test.ts`

Run with:
```bash
cd api
npm run test -- agent-service-level-2.test.ts
```

---

## Level 3: End-to-End Frontend Testing

**Purpose**: Verify the complete user experience from onboarding through results display.

### What Gets Tested

- ✓ Home page displays correctly
- ✓ Navigation to onboarding
- ✓ Onboarding questions render
- ✓ Profile data collection through multiple questions
- ✓ Analysis can be triggered
- ✓ Progress indicator shows during analysis
- ✓ Results page displays career recommendations
- ✓ All 5 agent outputs visible in results
- ✓ Data persists across page transitions

### Run Level 3: Manual Browser Testing

```bash
# Start all services
python agent_service.py &
cd api && npm run dev &
cd frontend && npm run dev &

# Open browser
open http://localhost:5173
# or manually visit: http://localhost:5173
```

### Manual Test Checklist

- [ ] Home page loads with "Get Started" button
- [ ] Click "Get Started" → navigate to onboarding
- [ ] See first onboarding question (e.g., "What are your interests?")
- [ ] Answer questions by selecting/typing responses
- [ ] Progress indicator shows number of completed questions
- [ ] After all questions → see "Analyze" button
- [ ] Click "Analyze" → Dashboard shows
- [ ] Dashboard shows loading/progress indicator
- [ ] Progress bar shows agents executing: research → profile → recommendations → verification → report
- [ ] After 10-30 seconds → Results page loads
- [ ] Results display:
  - [ ] Career recommendations (top 3 paths)
  - [ ] Salary ranges
  - [ ] Next steps/action items
  - [ ] Learning resources
  - [ ] Timeline
- [ ] Can export/download results
- [ ] Browser console has no errors (F12 → Console)

### Run Level 3: Automated Testing

```bash
cd frontend
npm run test -- multi-agent-e2e.test.tsx

# or
npm run test -- --run
```

### Test File

Location: `frontend/src/__tests__/multi-agent-e2e.test.tsx`

---

## Quick Reference: API Endpoints

### Agent Service (Port 8000)

```bash
# Health check
GET /health
→ { "status": "healthy", "agents": [...] }

# List agents
GET /agents
→ { "total_agents": 5, "agents": [...] }

# Start analysis
POST /analyze
Body: { "sessionId": "...", "profile": {...}, "trackId": "..." }
→ { "success": true, "sessionId": "...", "status": "Analysis started" }

# Get status
GET /status/{sessionId}
→ { "status": "...", "progress": 0-100, "current_agent": "...", "results": {...} }
```

### Backend API (Port 3000)

```bash
# Create session
POST /sessions
Body: { "trackId": null }
→ { "id": "uuid", "status": "intake", "messages": [...], "profile": {} }

# Get session
GET /sessions/{sessionId}
→ { "id": "...", "status": "...", "messages": [...], "profile": {...} }

# Send message
POST /sessions/{sessionId}/messages
Body: { "content": "..." }
→ { "id": "...", "messages": [...] }

# Trigger analysis
POST /sessions/{sessionId}/analyze
→ { "status": "...", "message": "..." }

# Get results
GET /sessions/{sessionId}/results
→ { "recommendations": [...], "profile": {...}, ... }
```

---

## Troubleshooting

### Agent Service Won't Start

```bash
# Check if dependencies are installed
pip install -r requirements.txt

# Check if port 8000 is available
lsof -i :8000

# Check Python version
python --version  # Should be 3.10+
```

### Backend Won't Connect to Agent Service

```bash
# Verify agent service is running
curl http://localhost:8000/health

# Check backend logs for agent service errors
# The backend should show "Agent service connected" or error details

# If agent service URL is wrong, check api/src/services/agent.ts
```

### Tests Timing Out

- Increase timeout in test files (currently 30s)
- Agent service may be slow on first run
- Try running tests one level at a time

### Frontend Not Loading

```bash
# Check if backend is responding
curl http://localhost:3000

# Check if frontend can reach backend (browser console, Network tab)
# May need to set VITE_API_URL environment variable
```

---

## Debugging & Monitoring

### View Agent Service Logs

```bash
# Run with debug output
LOG_LEVEL=DEBUG python agent_service.py
```

### View Backend Logs

```bash
cd api
npm run dev  # Shows all requests
```

### Monitor Progress in Real-time

```bash
# Terminal 1: Start services
python agent_service.py

# Terminal 2: Monitor agent status
watch -n 0.5 'curl -s http://localhost:8000/status/test-session | jq .progress, .current_agent'

# Terminal 3: Trigger analysis
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "profile": {"interests": ["AI"]}
  }'
```

### Browser DevTools (Frontend)

```
F12 → Network Tab
- Watch /analyze POST request
- Check response time and data
- Verify status polling requests

F12 → Console Tab
- Look for API errors
- Check agent service connectivity
```

---

## Expected Performance

| Operation | Expected Time |
|-----------|---------------|
| Agent health check | < 100ms |
| List agents | < 100ms |
| Full analysis (all 5 agents) | 3-15 seconds |
| Backend session create | < 50ms |
| Send intake message | < 100ms |
| Trigger analysis | < 500ms |
| Results retrieval | < 200ms |

---

## CI/CD Integration

### Run All Tests (npm)

```bash
npm run test
```

This runs:
- `api/src/__tests__/agent-service-level-1.test.ts`
- `api/src/__tests__/agent-service-level-2.test.ts`
- `frontend/src/__tests__/multi-agent-e2e.test.tsx`

### Run in CI Pipeline

```yaml
# .github/workflows/test.yml
- name: Run Agent Service Tests
  run: python scripts/test-agents.py --level all

- name: Run API Tests
  run: cd api && npm run test

- name: Run Frontend Tests
  run: cd frontend && npm run test
```

---

## Common Issues & Solutions

### Q: How do I verify agents are running in the right order?

**A:** Check the order output from the test:
```
→ research (20%)
→ profile_analysis (40%)
→ recommendations (60%)
→ verification (80%)
→ report_generation (100%)
```

If any agent is missing or out of order, there's a coordination issue.

### Q: How do I test a specific agent's output?

**A:** In Level 1, after analysis completes:
```bash
curl http://localhost:8000/status/your-session-id | jq '.results.research'
```

This shows just the research agent's output.

### Q: Can I test with the frontend running?

**A:** Yes! Level 3 specifically tests the frontend. Just run all three services and open the browser.

### Q: How do I reset the system for a clean test?

```bash
# Stop all services
pkill -f "python agent_service.py"
pkill -f "npm run dev"

# Clear any temp data
rm -rf api/dist
rm -rf frontend/dist

# Restart services
python agent_service.py &
cd api && npm run dev &
```

---

## Success Criteria

✅ **All tests pass** when:
- Level 1: All 5 agents execute sequentially with 0% → 100% progress
- Level 2: Backend properly creates sessions and triggers agent service
- Level 3: Frontend shows complete onboarding → analysis → results flow
- Results display data from all 5 agents
- No errors in logs or browser console

🎯 **System is production-ready** when all 3 levels consistently pass.
