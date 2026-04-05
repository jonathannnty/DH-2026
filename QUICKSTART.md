# Quick Start Guide — Run PathFinder AI Anywhere

A complete, zero-friction setup guide for judges, contributors, and operators. All commands have been verified to work with the repository structure as-is.

## 5-Minute Setup

### Prerequisites

- **Node.js** 18+ (download from nodejs.org)
- **npm** 8+ (comes with Node.js)
- **Git** (for cloning the repo)

### Clone & Install

```bash
# 1. Clone repository
git clone https://github.com/jonathannnty/DH-2026.git
cd DH-2026

# 2. Install dependencies
npm install

# 3. Setup environment (copy from template)
cp api/.env.example api/.env
```

### Run Demo

```bash
# Terminal 1: Start frontend + API
npm run dev

# Launches:
# - Frontend on http://localhost:5173
# - API on http://localhost:3001

# Then open http://localhost:5173 in your browser
```

**That's it!** The demo uses deterministic fallback, so you don't need the Python agent service running.

---

## Verify Readiness

Before a live demo, run the smoke test to confirm everything works:

```bash
# In repository root
npm run smoke
```

**Output:**

```
✅ Judge Smoke: PASS (2847ms, <60s)
```

If it fails, see **Troubleshooting** below.

---

## Environment Configuration

### Local Development (Default)

The `.env` file is already configured for local dev with fallback enabled:

```bash
PORT=3001
NODE_ENV=development
DATABASE_URL=./dev.db
DEMO_MODE=true
AGENT_SERVICE_URL=http://localhost:8000
```

**No changes needed.** The setup already works with deterministic fallback.

### Production Deployment

To deploy publicly, see `docs/DEPLOYMENT.md` for platform-specific instructions (Vercel, custom Node.js, etc.).

---

## Running Tests

### Quick Test (Frontend + API Contracts)

```bash
npm run test
```

### API Tests Only

```bash
npm run test --workspace api
```

### Frontend Tests Only

```bash
npm run test --workspace frontend
```

### Advanced: Full Agent Service Tests (Optional)

Requires running Python agent service locally:

```bash
# Terminal 1: Start Python agent
python agent_service.py  # (from repository root)

# Terminal 2: Run level 1 agent tests
RUN_LEVEL1_AGENT_TESTS=true npm run test --workspace api
```

---

## Pre-Demo Checklist

Use this checklist every time before a live demo:

```bash
# 1. Kill any stale processes
pkill -f "node" || true
pkill -f "python" || true

# 2. Reset database (optional, for fresh start)
rm api/dev.db

# 3. Verify setup
npm run smoke       # Must show ✅ PASS

# 4. Start services
npm run dev &
sleep 3

# 5. Open browser
open http://localhost:5173    # macOS
xdg-open http://localhost:5173  # Linux
start http://localhost:5173    # Windows PowerShell
```

---

## Troubleshooting

### ❌ `npm run dev` fails immediately

**Symptom:** "Cannot find module" or port already in use

**Fix:**

```bash
# 1. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Free up ports
lsof -i :3001  # Find process on port 3001
kill -9 <PID>  # Kill it
```

### ❌ `npm run smoke` fails — "API unreachable"

**Symptom:** Step 1 shows ❌

**Fix:**

```bash
# 1. Verify API is running
curl http://localhost:3001/health

# 2. If no response:
npm run dev &
sleep 3
npm run smoke
```

### ❌ Recommendations show timeout / error

**Symptom:** "Analysis service unavailable" or blank results after SSE stream

**This is expected.** The fallback system activates automatically when the agent service is unavailable. You should still see recommendations within 25 seconds (profile-derived).

**To debug:** Check browser console for correlation ID (X-Correlation-Id header), then:

```bash
# Search logs with correlation ID
grep "abc-123" ~/.npm-logs/* 2>/dev/null || echo "Logs not found"
```

### ❌ Git/npm issues

**Symptom:** "Permission denied" or "EACCES"

**Fix:**

```bash
# Don't use sudo. Instead, fix npm permissions:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Then reinstall:
npm install -g n  # Node version manager
n latest
```

---

## Performance Benchmarks

These are expected timing for the full user flow:

| Stage                | Time      | Device           |
| -------------------- | --------- | ---------------- |
| Session create       | <10ms     | Local            |
| Intake (5 messages)  | <250ms    | Local            |
| Analyze trigger      | <50ms     | Local            |
| SSE stream → results | 2–25s     | Local (fallback) |
| **Total end-to-end** | **2–30s** | **Local**        |

If any stage takes >2x these times, see troubleshooting above.

---

## Common Workflows

### Workflow 1: Run Demo for Judges

```bash
# 1. Terminal 1
npm run dev &
sleep 2

# 2. Terminal 2
npm run smoke  # Verify readiness

# 3. Browser
# Open http://localhost:5173
# Complete: Home → Onboarding (5 questions) → Results
```

### Workflow 2: Run Full Test Suite (CI/CD)

```bash
# Equivalent to what CI runs:
npm run lint
npm run build
npm run test
npm run demo:pass  # Final readiness check
```

### Workflow 3: Deploy Publicly

```bash
# See docs/DEPLOYMENT.md for:
# - Vercel one-click deploy
# - Custom Node.js hosting
# - Environment configuration
```

### Workflow 4: Contribute Code

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes (frontend or api)

# 3. Run tests
npm run test

# 4. Run demo pass to verify nothing broke
npm run demo:pass

# 5. Commit & push
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature

# Then create PR on GitHub
```

---

## Frontend Development

### Start Dev Server with Hot Reload

```bash
npm run dev --workspace frontend
```

Opens on http://localhost:5173 with hot module replacement (HMR).

### Build Frontend for Production

```bash
npm run build --workspace frontend
# Output: frontend/dist/
```

### Frontend Tests

```bash
npm run test --workspace frontend
npm run test:watch --workspace frontend  # Watch mode
npm run test:ui --workspace frontend     # Visual test runner
```

---

## API Development

### Start API Dev Server

```bash
npm run dev --workspace api
```

Runs on http://localhost:3001 with auto-restart on file changes.

### Build API for Production

```bash
npm run build --workspace api
# Output: api/dist/server.js
# Start: node api/dist/server.js
```

### API Tests

```bash
npm run test --workspace api            # One-time
npm run test:watch --workspace api      # Watch mode
```

### API Database

```bash
# Generate migrations (if you modified schema)
npm run db:generate --workspace api

# Run migrations
npm run db:migrate --workspace api

# Open Drizzle Studio (visual DB browser)
npm run db:studio --workspace api
# Opens http://localhost:3000
```

---

## Documentation

All comprehensive guides are in the `docs/` folder:

| File                             | Purpose                            |
| -------------------------------- | ---------------------------------- |
| **THIS FILE**                    | Quick start (5 min)                |
| `docs/DEPLOYMENT.md`             | Production hosting guide           |
| `docs/LOCAL_ARTIFACTS.md`        | Setup knowledge & versioned assets |
| `docs/OBSERVABILITY.md`          | Debugging with correlation IDs     |
| `docs/MOBILE_POLISH.md`          | Mobile reliability checklist       |
| `docs/ops-endpoint-reference.md` | Operator control panel API         |
| `docs/operator-playbook.md`      | Live demo runbook                  |
| `docs/demo-contingency-plan.md`  | Emergency recovery                 |
| `docs/TESTING.md`                | Comprehensive testing guide        |
| `docs/ARCHITECTURE.md`           | System design & boundaries         |

---

## Support & Questions

- **Repository:** https://github.com/jonathannnty/DH-2026
- **Issues:** https://github.com/jonathannnty/DH-2026/issues
- **Docs:** See files listed above

---

## Key Scripts Reference

```bash
# Development
npm run dev                 # Start both frontend + API

# Testing & Validation
npm run test                # All tests
npm run demo:pass          # Demo readiness check (CI gate)
npm run smoke              # Under-60s smoke test

# Build & Lint
npm run build              # Build all workspaces
npm run lint               # Lint all workspaces

# Workspace-specific
npm run dev --workspace frontend
npm run dev --workspace api
npm run test --workspace frontend
npm run test --workspace api
npm run build --workspace frontend
npm run build --workspace api
```

---

## Checklist: First-Time Setup

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Git installed (`git --version`)
- [ ] Repository cloned (`git clone ...`)
- [ ] Dependencies installed (`npm install`)
- [ ] Environment configured (`cp api/.env.example api/.env`)
- [ ] Smoke test passes (`npm run smoke`)
- [ ] Frontend loads (`npm run dev`, then http://localhost:5173)
- [ ] Can complete full user flow (Home → Onboarding → Results)

**If all checks pass, you're ready to demo!**
