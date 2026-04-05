# Troubleshooting Integration Tests

Use this guide when API integration tests fail or local end-to-end behavior looks inconsistent.

## Baseline Service Check

Start core services in separate terminals:

```bash
# Terminal 1 (agent service)
python agent_service.py

# Terminal 2 (API)
cd api
npm run dev
```

Expected defaults:

- API: `http://localhost:3001`
- Agent service: `http://localhost:8000`

## Common Failures

### API not reachable

Symptoms:

- `curl http://localhost:3001/health` fails
- API tests that need the running server fail

Fix:

```bash
cd api
npm run dev
```

### Agent service unavailable

Symptoms:

- Session analyze calls return 5xx
- API logs show upstream connectivity errors

Fix:

```bash
python agent_service.py
curl http://localhost:8000/health
```

### Analyze flow stalls

Symptoms:

- Session remains in `analyzing`
- SSE stream does not progress

Fix:

1. Confirm both services are healthy.
2. Check API logs for errors while calling `/sessions/{id}/analyze`.
3. Retry with a fresh session.
4. In demo mode, use `/ops/force-status` for recovery if needed.

## Manual API Verification

```bash
# Create session
curl -X POST http://localhost:3001/sessions \
  -H "Content-Type: application/json" \
  -d '{"trackId":null}'

# Send intake message
curl -X POST http://localhost:3001/sessions/{SESSION_ID}/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"I like AI and product design"}'

# Trigger analysis
curl -X POST http://localhost:3001/sessions/{SESSION_ID}/analyze

# Fetch current session state
curl http://localhost:3001/sessions/{SESSION_ID}
```

## Test Commands

Use the current workspace commands:

```bash
npm run test
npm run build
npm run lint
```

Optional exploratory suites remain gated behind environment flags (see `docs/TESTING.md`).

## Related Docs

- `docs/TESTING.md`
- `docs/operator-playbook.md`
