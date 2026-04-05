# Demo Contingency Plan — DiamondHacks 2026

## Purpose

Fast response guide for demo-day issues during 3-minute judge walkthroughs.

## Priority Order

1. Keep demo moving in under 15 seconds.
2. Prefer graceful fallback over restart.
3. Use backup scenario only when live flow is blocked.

## Failure Modes and Actions

### 1) Agent Service Offline

Symptom:

- `curl http://localhost:8000/health` fails or times out.

Action:

1. Continue demo normally.
2. Trigger analysis.
3. Let fallback mode complete recommendations.
4. Say: "The system degrades gracefully and still produces personalized output."

Operator commands:

```bash
curl http://localhost:8000/health
```

### 2) API Not Responding

Symptom:

- Frontend shows network errors.
- `curl http://localhost:3001/health` fails.

Action:

1. Restart API service.
2. Keep frontend tab open.
3. Resume from preloaded session if available.

Operator commands:

```bash
npm run dev --workspace api
curl http://localhost:3001/health
```

### 3) PDF Export Fails

Symptom:

- Download report action errors.

Action:

1. Use Copy Summary immediately.
2. Continue narrative with recommendation cards on screen.
3. Mention downloadable export is available in standard flow.

Fallback message:

- "We can still instantly share the summary while preserving the same decision output."

### 4) Intake Flow Breaks Mid-Demo

Symptom:

- Message send fails repeatedly.
- UI cannot progress to analyze.

Action:

1. Switch to pre-staged session result.
2. Open backup session ID in results route.

Operator commands:

```bash
curl -X POST http://localhost:3001/ops/scenarios/nurse-to-healthtech/run
# then open /results/<sessionId>
```

### 5) Session Stuck in Analyzing

Symptom:

- Progress never completes.

Action:

1. Wait for fallback timeout path once.
2. If still stuck, force status complete as emergency.

Operator commands:

```bash
curl -X POST http://localhost:3001/ops/sessions/<id>/force-status \
  -H 'Content-Type: application/json' \
  -d '{"status":"complete"}'
```

## 30-Second Recovery Script

If anything fails in front of judges:

1. "Let me switch to our backup scenario while keeping the same recommendation engine."
2. Open pre-staged `/results/<sessionId>`.
3. Show top 3 recommendations, fit scores, and export actions.
4. Continue pitch on Idea, Experience, Implementation, Demo execution.

## Booth Setup Checklist

- Agent terminal open and visible.
- API terminal open and visible.
- Frontend browser pinned at local host.
- One backup session ID copied to clipboard.
- `demo-startup.ps1` ready for quick restart.

## Ownership

- Driver: Talks and controls browser.
- Operator: Watches terminal health and runs backup commands.
- Spotter: Tracks remaining time and keeps to 3-minute format.
