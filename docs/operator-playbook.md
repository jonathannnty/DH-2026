# Operator Playbook — DiamondHacks 2026 Demo

## Quick Reference

| Action | Command / URL |
|--------|--------------|
| Start API (demo mode) | `DEMO_MODE=true npm run dev --workspace api` |
| Start frontend | `npm run dev --workspace frontend` |
| Start both | `DEMO_MODE=true npm run dev` |
| Pre-flight self-test | `curl http://localhost:3001/ready` |
| Reset database | `curl -X POST http://localhost:3001/ops/reset` |
| Run backup scenario | `curl -X POST http://localhost:3001/ops/scenarios/nurse-to-healthtech/run` |
| Run all scenarios | `curl -X POST http://localhost:3001/ops/scenarios/run-all` |
| Operator dashboard | `curl http://localhost:3001/ops/status` |
| Snapshot DB (backup) | `curl -X POST http://localhost:3001/ops/db/snapshot > backup.json` |
| Restore DB | `curl -X POST -H 'Content-Type: application/json' -d @backup.json http://localhost:3001/ops/db/restore` |
| Health check | `curl http://localhost:3001/health` |

---

## T-30 Minutes: Pre-Demo Setup

1. **Kill any stale processes**: `npx kill-port 3001 5173`
2. **Start services**: `DEMO_MODE=true npm run dev`
3. **Run self-test**: `curl -s http://localhost:3001/ready | python -m json.tool`
   - All 5 checks must show `"pass": true`
   - If anything fails, check the `detail` field for diagnosis
4. **Reset DB to clean state**: `curl -X POST http://localhost:3001/ops/reset`
5. **Pre-stage a backup scenario** (optional — in case live demo fails):
   ```bash
   curl -s -X POST http://localhost:3001/ops/scenarios/nurse-to-healthtech/run | python -m json.tool
   ```
   Note the `sessionId` — you can navigate to `/results/<sessionId>` as a fallback.
6. **Open browser** to `http://localhost:5173`
7. **Test the flow manually**: click "Start Career Assessment", type one answer, verify chat works

---

## During Demo: Live Flow

**Primary path** (live demo):
1. Click "Start Career Assessment" on the home page
2. Answer each of the 12 intake questions conversationally
3. When you see "profile is ready for analysis", click "Analyze My Career Profile"
4. Watch the progress spinner (takes ~2.6s in demo mode)
5. Review the 3 career recommendations with fit scores, salary ranges, and next steps

**If something goes wrong mid-intake:**
- Refresh the page — the session is preserved in the DB
- Navigate back to `/onboarding?session=<id>` to resume
- Or: reset and use a backup scenario (see below)

---

## Backup Plans

### Plan B: Pre-built Scenario
If the live intake breaks, show a pre-staged completed session:
```bash
# Already staged from pre-demo setup, or run now:
curl -s -X POST http://localhost:3001/ops/scenarios/nurse-to-healthtech/run
# → Returns sessionId, navigate to /results/<sessionId>
```

### Plan C: Run All Scenarios
Populate the dashboard with multiple completed sessions:
```bash
curl -s -X POST http://localhost:3001/ops/scenarios/run-all
```
Navigate to `/dashboard` — shows multiple sessions at different stages.

### Plan D: Force-Complete a Stuck Session
If a session gets stuck in `analyzing`:
```bash
curl -X POST http://localhost:3001/ops/sessions/<id>/force-status \
  -H 'Content-Type: application/json' \
  -d '{"status":"complete"}'
```

### Plan E: Full Reset
Nuclear option — wipe everything and start fresh:
```bash
curl -X POST http://localhost:3001/ops/reset
```

---

## Incident Response

| Symptom | Diagnosis | Fix |
|---------|-----------|-----|
| API won't start | Port in use | `npx kill-port 3001` then restart |
| `EADDRINUSE` | Stale process | Same as above |
| `/ready` shows DB fail | SQLite locked or missing | Delete `api/dev.db`, restart |
| Session stuck in `analyzing` | Demo mode SSE not triggered | `force-status` to `complete`, or reset |
| Frontend shows blank | API not running | Check `http://localhost:3001/health` |
| 403 on /ops/* routes | `DEMO_MODE` not set | Restart with `DEMO_MODE=true` |
| Recommendations empty | Session wasn't streamed after analyze | Navigate to `/results/<id>` — it will stream |

---

## Available Demo Scenarios

| ID | Persona | Description |
|----|---------|-------------|
| `nurse-to-healthtech` | Career Changer | Nurse pivoting to health-tech. Low risk, local, stability-focused. |
| `recent-grad-generalist` | Recent Grad | Liberal arts grad, high flexibility, broad interests, tight budget. |
| (default demo inputs) | Tech Professional | AI/ML engineer, remote, education-passionate. Run via live intake. |

---

## Communication Channels

- **Team Slack/Discord**: Post status updates before, during, and after demo
- **Pre-demo message**: "Starting demo setup. Self-test: [PASS/FAIL]. Backup scenarios staged."
- **During demo**: Operator monitors terminal logs. If error appears, Slack "Switching to Plan B."
- **Post-demo**: "Demo complete. [X] sessions created. No incidents." or "Incident: [description]. Recovery: [what we did]."
