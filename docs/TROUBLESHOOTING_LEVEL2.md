# Troubleshooting Level 2 Tests

If Level 2 tests fail, use the diagnostic tool to identify the issue.

## Quick Start

```bash
# Make sure all services are running
# Terminal 1
python agent_service.py

# Terminal 2
cd api && npm run dev

# Terminal 3
npm run test:agents:level2:debug
```

## What The Diagnostic Test Does

1. **Checks backend health** - Verifies backend is running on :3000
2. **Checks agent service** - Verifies agent service is running on :8000
3. **Creates a session** - Tests POST /sessions
4. **Sends messages** - Tests POST /sessions/{id}/messages
5. **Triggers analysis** - Tests POST /sessions/{id}/analyze
6. **Waits for completion** - Monitors analysis progress

## Common Issues & Solutions

### Issue: "Backend not reachable"
**Problem**: Backend isn't running or on wrong port

**Solution**:
```bash
cd api && npm run dev
# Should show: listening on 0.0.0.0:3000
```

### Issue: "Agent service health check returned 500"
**Problem**: Agent service running but broken

**Solution**:
```bash
# Restart agent service
python agent_service.py
# Should show: Application startup complete
```

### Issue: "Failed to trigger analysis (status 500)"
**Problem**: Backend can't reach agent service

**Solutions**:
1. Verify agent service is running on :8000
2. Check backend can reach http://localhost:8000
```bash
# From backend terminal, try:
curl http://localhost:8000/health
```

3. Check AGENT_SERVICE_URL environment variable
```bash
# In backend, should default to http://localhost:8000
echo $AGENT_SERVICE_URL
```

### Issue: "Analysis did not complete within 30 seconds"
**Problem**: Analysis is taking too long or stuck

**Solutions**:
1. Check backend logs for errors
2. Check agent service logs for errors
3. Try again - might be first run overhead
4. Monitor how long Level 1 takes:
```bash
npm run test:agents:level1
# Note the time
```

5. If Level 1 takes too long, Level 2 will also

## Manual Testing

If the diagnostic still fails, try manually:

```bash
# Create session
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{"trackId":null}'

# Save the session ID, then:
# Send message
curl -X POST http://localhost:3000/sessions/{SESSION_ID}/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"I like AI"}'

# Trigger analysis
curl -X POST http://localhost:3000/sessions/{SESSION_ID}/analyze

# Check status
curl http://localhost:3000/sessions/{SESSION_ID}
```

## Success Indicators

✅ **Level 2 Diagnostic Passes**
- Backend healthy
- Agent service healthy
- Session created
- Messages accepted
- Analysis triggered
- Analysis completes to status: 'results'

## Run Full Test Suite

Once diagnostic passes:

```bash
# Run all tests
npm run test:agents

# Expected output:
# Level 1: PASS (agent coordination)
# Level 2: PASS (backend integration)
# Level 3: MANUAL (frontend testing)
```

## Need More Help?

Check the full documentation: `docs/TESTING.md`

Or check the Python diagnostic script: `scripts/test-agents-level2-debug.py`
