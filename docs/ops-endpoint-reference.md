# Ops Endpoint Reference

**Status:** Restricted to `DEMO_MODE=true` only

## Overview

All operator control routes are scoped under `/ops` prefix and are **only accessible when `DEMO_MODE=true`**.

Non-demo deployments will receive `HTTP 403 Forbidden` for any `/ops/*` request.

## Authentication & Authorization

- **DEMO_MODE Guard:** All `/ops` routes check `DEMO_MODE` environment variable at request time
- **Blocked Outside Demo:** Returns `403 Forbidden` with message: "Ops routes are only available in DEMO_MODE."
- **Audit Logging:** All ops access is logged with method, URL, and timestamp

## Endpoint Catalog

### Session Management

#### `GET /ops/status` — Operator Dashboard Snapshot

Returns summary of all active sessions and system state.

**Response:**

```json
{
  "mode": "demo|live",
  "demoMode": true,
  "sessionCount": 5,
  "byStatus": {
    "intake": 2,
    "analyzing": 1,
    "complete": 2,
    "error": 0
  },
  "analyzing": [{ "id": "session-123", "elapsedSec": 15 }],
  "longestAnalyzingSec": 15,
  "dbPath": ":memory:|/path/to/db",
  "auditedAt": "2026-04-05T10:30:00Z"
}
```

#### `GET /ops/sessions` — List All Sessions

Returns summary of all sessions (ID, status, message count).

**Response:**

```json
{
  "sessions": [
    {
      "id": "uuid",
      "status": "complete",
      "trackId": null,
      "createdAt": "2026-04-05T10:00:00Z",
      "updatedAt": "2026-04-05T10:15:00Z",
      "messageCount": 12
    }
  ]
}
```

#### `GET /ops/sessions/:id/full` — Full Session Dump

Returns complete session data including profile, messages, and recommendations. Useful for debugging.

#### `DELETE /ops/sessions/:id` — Delete Single Session

Permanently removes a session from the database.

**Request (optional):**

```json
{
  "action": "delete-session"
}
```

**Response:**

```json
{
  "deleted": "session-id",
  "action": "delete-session",
  "auditedAt": "2026-04-05T10:30:00Z"
}
```

#### `POST /ops/sessions/:id/force-status` — Force Status Transition (Escape Hatch)

**Use with caution:** Forcibly changes a session's status.

Valid statuses: `intake`, `analyzing`, `complete`, `error`

**Request:**

```json
{
  "status": "complete",
  "action": "force-status"
}
```

**Response:**

```json
{
  "id": "session-id",
  "from": "analyzing",
  "to": "complete",
  "action": "force-status",
  "auditedAt": "2026-04-05T10:30:00Z"
}
```

### Database Control

#### `POST /ops/reset` — Wipe All Sessions

**Destructive:** Deletes all sessions from the database. Used to reset the demo for a new run.

**Request (optional):**

```json
{
  "action": "reset-all"
}
```

**Response:**

```json
{
  "wiped": 42,
  "message": "All sessions deleted. Database is clean for next demo run.",
  "action": "reset-all",
  "auditedAt": "2026-04-05T10:30:00Z"
}
```

#### `POST /ops/db/snapshot` — Export Session Snapshot

Exports all current sessions as a JSON payload for backup/debugging.

**Response:**

```json
{
  "snapshotAt": "2026-04-05T10:30:00Z",
  "sessionCount": 3,
  "sessions": [
    {
      "id": "uuid",
      "status": "complete",
      "profile": { "interests": [...] },
      "messages": [...],
      "recommendations": [...],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

#### `POST /ops/db/restore` — Restore Sessions from Snapshot

Wipes current database and restores sessions from a snapshot payload.

**Request:**

```json
{
  "sessions": [
    {
      "id": "uuid",
      "status": "complete",
      "profile": { ... },
      "messages": [...],
      "recommendations": [...],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

#### `GET /ops/db/stats` — Database Metrics

Returns summary statistics on sessions.

**Response:**

```json
{
  "totalSessions": 42,
  "byStatus": {
    "intake": 5,
    "analyzing": 2,
    "complete": 35,
    "error": 0
  },
  "oldestSession": "2026-04-05T08:00:00Z",
  "newestSession": "2026-04-05T11:45:00Z"
}
```

### Scenario Management

#### `GET /ops/scenarios` — List Available Scenarios

Shows all pre-configured demo scenarios available for testing.

**Response:**

```json
{
  "scenarios": [
    {
      "id": "scenario-tech-career",
      "name": "Tech Career Changer",
      "description": "User transitioning from finance to software engineering"
    }
  ]
}
```

#### `POST /ops/scenarios/:scenarioId/run` — Run Single Scenario

Creates a session, walks through intake, triggers analysis, and returns ready-to-view session.

**Response:**

```json
{
  "sessionId": "uuid",
  "scenario": "scenario-id",
  "name": "Scenario Name",
  "status": "complete",
  "messageCount": 12,
  "recommendationCount": 3,
  "viewUrl": "/results/uuid",
  "auditedAt": "2026-04-05T10:30:00Z"
}
```

#### `POST /ops/scenarios/run-all` — Run All Scenarios

Runs every scenario sequentially, returns all resulting session IDs.

**Response:**

```json
{
  "ran": 4,
  "sessions": [
    { "sessionId": "...", "scenario": "...", ... },
    ...
  ]
}
```

## Usage in Demo Workflow

### Pre-Demo Verification

```bash
# Reset database
curl -X POST http://localhost:3000/ops/reset

# Run all scenarios to warm cache and verify golden path
curl -X POST http://localhost:3000/ops/scenarios/run-all

# Check database stats
curl http://localhost:3000/ops/db/stats
```

### During Live Demo

```bash
# Monitor active sessions
curl http://localhost:3000/ops/status

# If a session gets stuck, force-complete it
curl -X POST http://localhost:3000/ops/sessions/{id}/force-status \
  -H "Content-Type: application/json" \
  -d '{"status": "complete"}'
```

### Post-Demo Backup

```bash
# Export session data
curl http://localhost:3000/ops/db/snapshot > backup.json

# Later, restore if needed
curl -X POST http://localhost:3000/ops/db/restore \
  -H "Content-Type: application/json" \
  -d @backup.json
```

## Security Notes

1. **DEMO_MODE Guard:** All `/ops` routes are unreachable unless `DEMO_MODE=true`
2. **Audit Trail:** Every ops access is logged for accountability
3. **No Authentication:** Ops routes assume the operator is trusted (e.g., on a closed demo network)
4. **Database Mutation:** Some routes are destructive (`/reset`, `/restore`, `/delete`); use carefully
5. **Escape Hatches:** Routes like `/force-status` are for emergency recovery; prefer natural state transitions

## Common Scenarios

### Scenario: Session Stuck in "analyzing"

1. Check `/ops/status` to see elapsed time
2. If > 5 minutes, consider forced completion:
   ```bash
   curl -X POST http://localhost:3000/ops/sessions/{id}/force-status \
     -d '{"status": "complete"}'
   ```
3. Or delete and restart:
   ```bash
   curl -X DELETE http://localhost:3000/ops/sessions/{id}
   ```

### Scenario: Need Fresh Start Before Next Demo

```bash
# Wipe and verify
curl -X POST http://localhost:3000/ops/reset
curl http://localhost:3000/ops/db/stats
```

### Scenario: Backup Results Before Shutdown

```bash
curl http://localhost:3000/ops/db/snapshot > demo-results-$(date +%s).json
```
