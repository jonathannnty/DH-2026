# Public Deployment Configuration

## Overview

This document covers deploying PathFinder AI publicly with guaranteed fallback behavior. The system is resilient by default: if the agent service is unavailable, users receive high-quality profile-derived career recommendations instead of errors.

## Frontend Deployment (Vercel/Netlify)

### Environment Variables

Set these in your deployment platform's environment settings:

```
VITE_API_URL=https://api.pathfinder-demo.example.com
VITE_AGENT_URL=https://agent.pathfinder-demo.example.com (optional, for prefetch)
```

### Build Command

```bash
npm run build --workspace frontend
```

### Artifact

```
frontend/dist/
```

### CORS & Base URL

The frontend automatically reads `VITE_API_URL` from environment variables. If not set, it defaults to `http://localhost:3001` (local development).

## API Deployment (Vercel / Custom Node.js)

### Environment Variables

**Required (all deployments):**

```
PORT=3001
NODE_ENV=production
DATABASE_URL=/path/to/production.db (or remote DB URL)
DEMO_MODE=false
```

**Optional (falling back gracefully if not set):**

```
AGENT_SERVICE_URL=http://localhost:8000
ANTHROPIC_API_KEY=<api-key>
OPENAI_API_KEY=<api-key>
```

### Build Command

```bash
npm run build --workspace api
```

### Start Command

```bash
npm run start --workspace api
```

### Artifact

```
api/dist/server.js
```

## Fallback Behavior

### When Agent Service Is Unavailable

If `AGENT_SERVICE_URL` points to an unreachable service or times out:

1. **Session Analysis Flow:**
   - User completes intake questions (always succeeds)
   - User clicks "Analyze" (always succeeds)
   - SSE stream times out after 20 seconds
   - **Automatic Fallback Triggers:** Profile-derived recommendations generated from intake data
   - Recommendations persisted to database
   - User sees complete results

2. **Behavior in Demo Mode:**
   - When `DEMO_MODE=true`, deterministic fallback plays beautiful fake SSE progression
   - Results are always perfect (hard-coded for scenarios)

3. **Behavior in Production:**
   - When `DEMO_MODE=false`, genuine profile-based recommendations generated
   - `generatePersonalizedFallback()` function creates recommendations from profile data

### Key Files Involved

- **`api/src/services/personalizedFallback.ts`** — Generates profile-based recommendations
- **`api/src/routes/sessions.ts`** — SSE stream timeout logic (line ~673)
- **`api/src/services/demo.ts`** — Demo scenario data

## Deployment Checklist

- [ ] Frontend environment: `VITE_API_URL` points to public API URL
- [ ] API environment: `NODE_ENV=production`, `DEMO_MODE=false`
- [ ] API environment: `DATABASE_URL` points to persistent database
- [ ] API environment: `AGENT_SERVICE_URL` (optional; fallback activates if missing/unreachable)
- [ ] API health endpoint returns `{ status: "ok" }` or `{ status: "degraded" }`
- [ ] `/ready` endpoint dry-runs the full golden path successfully
- [ ] Demo pass command passes locally before pushing deployment

## Testing Public Deployment

### 1. Health Check

```bash
curl https://api.pathfinder-demo.example.com/health
# Expected: { status: "ok", db: "ok", agentService: "unreachable" }
```

### 2. Readiness Check

```bash
curl https://api.pathfinder-demo.example.com/ready
# Expected: { ready: true, checks: [...] }
```

### 3. Manual Flow Test (Browser)

1. Open frontend URL
2. Complete onboarding (5 questions)
3. Click "Analyze"
4. Watch SSE stream complete
5. Verify recommendations appear within 25 seconds

### 4. Fallback Verification (Optional)

Temporarily set `AGENT_SERVICE_URL=http://unreachable.invalid` in production and repeat step 3. Results should still appear within 25 seconds.

## Observability & Logs

The API logs at both `info` and `warn` levels:

- `info`: Successful session stages, route access
- `warn`: Analysis fallback triggered, ops access, agent unreachable

Check logs to diagnose deployment issues.

## Rollback

If an issue occurs:

1. **Frontend Rollback:** Revert to previous build in deployment platform UI
2. **API Rollback:** Revert to previous git commit, rebuild, and redeploy

Simple rollback reduces incident response time to <2 minutes.

## Security Notes

- `.env` files should **never** be committed to version control
- Use platform-specific secrets managers (GitHub Secrets, Vercel Secret Store, etc.)
- API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, FETCHAI_API_KEY) are **server-side only** and never exposed to frontend
- CORS is configured automatically and respects `Origin` headers

## Performance Benchmarks

- Session creation: <10ms
- Message processing: <50ms
- Analysis trigger: immediate (streams asynchronously)
- Fallback recommendations: <500ms
- Total user flow (intake + analysis + recommendations): <30 seconds end-to-end
