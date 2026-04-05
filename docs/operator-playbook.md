# Operator Playbook — DiamondHacks 2026 Demo

## Quick Reference

| Action                | Command / URL                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| One-command startup   | `.\demo-startup.ps1 -Scenario swe`                                                                      |
| Start API (live mode) | `npm run dev --workspace api`                                                                           |
| Start agent service   | `python agent_service.py`                                                                               |
| Start frontend        | `npm run dev --workspace frontend`                                                                      |
| Start frontend + API  | `npm run dev`                                                                                           |
| Pre-flight self-test  | `curl http://localhost:3001/ready`                                                                      |
| Agent health check    | `curl http://localhost:8000/health`                                                                     |
| Reset database        | `curl -X POST http://localhost:3001/ops/reset`                                                          |
| Run backup scenario   | `curl -X POST http://localhost:3001/ops/scenarios/nurse-to-healthtech/run`                              |
| Run all scenarios     | `curl -X POST http://localhost:3001/ops/scenarios/run-all`                                              |
| Operator dashboard    | `curl http://localhost:3001/ops/status`                                                                 |
| Snapshot DB (backup)  | `curl -X POST http://localhost:3001/ops/db/snapshot > backup.json`                                      |
| Restore DB            | `curl -X POST -H 'Content-Type: application/json' -d @backup.json http://localhost:3001/ops/db/restore` |
| Health check          | `curl http://localhost:3001/health`                                                                     |

---

## T-30 Minutes: Pre-Demo Setup

Preferred path for booth demos:

```powershell
.\demo-startup.ps1 -Scenario swe
```

This starts services, seeds a fake profile session, and opens the browser at preloaded onboarding.

1. **Kill any stale processes**: `npx kill-port 3001 5173`
2. **Start services**:
   - Terminal 1: `python agent_service.py`
   - Terminal 2: `npm run dev`
3. **Run self-test**: `curl -s http://localhost:3001/ready | python -m json.tool`
   - All 5 checks must show `"pass": true`
   - If anything fails, check the `detail` field for diagnosis
4. **Verify agent service**: `curl -s http://localhost:8000/health | python -m json.tool`
   - Expect `"status": "ok"`
   - If unavailable, keep demo running: fallback recommendations will activate after timeout
5. **Reset DB to clean state**: `curl -X POST http://localhost:3001/ops/reset`
6. **Pre-stage a backup scenario** (optional — in case live demo fails):
   ```bash
   curl -s -X POST http://localhost:3001/ops/scenarios/nurse-to-healthtech/run | python -m json.tool
   ```
   Note the `sessionId` — you can navigate to `/results/<sessionId>` as a fallback.
7. **Open browser** to `http://localhost:5173`
8. **Test the flow manually**: click "Start Career Assessment", type one answer, verify chat works

---

## Friday Preflight (T-60 to T-10)

1. Run `.\demo-startup.ps1 -Scenario swe` and confirm browser opens to `/onboarding?session=...`.
2. Run one 3-minute dry run end-to-end:
   - 0:00 open onboarding
   - 0:45 click analyze
   - 1:30 results loaded
   - 2:15 export PDF
   - 2:45 copy summary
3. Confirm fallback behavior once (optional): stop agent service and run one session to verify fallback banner appears.
4. Re-enable agent service and verify `curl http://localhost:8000/health` returns healthy.
5. Keep one terminal visible with API logs and one with agent logs during judging.
6. Keep one backup session ID ready in clipboard from `POST /ops/scenarios/nurse-to-healthtech/run`.

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

### Plan F: Agent service unavailable on demo laptop

If `http://localhost:8000/health` fails:

1. Keep API + frontend running.
2. Continue live intake as usual.
3. During results, fallback recommendations will be generated automatically.
4. Explain to judges: "The system gracefully degrades to personalized local fallback when the remote agent is unavailable."

---

## Incident Response

| Symptom                      | Diagnosis                             | Fix                                          |
| ---------------------------- | ------------------------------------- | -------------------------------------------- |
| API won't start              | Port in use                           | `npx kill-port 3001` then restart            |
| `EADDRINUSE`                 | Stale process                         | Same as above                                |
| `/ready` shows DB fail       | SQLite locked or missing              | Delete `api/dev.db`, restart                 |
| Session stuck in `analyzing` | Demo mode SSE not triggered           | `force-status` to `complete`, or reset       |
| Frontend shows blank         | API not running                       | Check `http://localhost:3001/health`         |
| Unexpected warning on `/ops` | Ops used while not in demo mode       | Expected warning log only; routes still work |
| Recommendations empty        | Session wasn't streamed after analyze | Navigate to `/results/<id>` — it will stream |

---

## Available Demo Scenarios

| ID                       | Persona           | Description                                                         |
| ------------------------ | ----------------- | ------------------------------------------------------------------- |
| `nurse-to-healthtech`    | Career Changer    | Nurse pivoting to health-tech. Low risk, local, stability-focused.  |
| `recent-grad-generalist` | Recent Grad       | Liberal arts grad, high flexibility, broad interests, tight budget. |
| (default demo inputs)    | Tech Professional | AI/ML engineer, remote, education-passionate. Run via live intake.  |

---

## Communication Channels

- **Team Slack/Discord**: Post status updates before, during, and after demo
- **Pre-demo message**: "Starting demo setup. Self-test: [PASS/FAIL]. Backup scenarios staged."
- **During demo**: Operator monitors terminal logs. If error appears, Slack "Switching to Plan B."
- **Post-demo**: "Demo complete. [X] sessions created. No incidents." or "Incident: [description]. Recovery: [what we did]."
