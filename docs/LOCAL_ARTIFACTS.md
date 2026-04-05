# Local Artifacts & Setup Knowledge

This document captures setup and runtime knowledge previously localized to development machines. All artifacts are now version-controlled or documented here.

## Repo-Versioned Artifacts

### Demo Scripts

- **`demo-pass.sh`** — One-command demo readiness verification (used in CI)
- **`smoke.sh`** — Under-60s judge pre-demo smoke test
- **`demo-startup.ps1`** — Windows PowerShell (one-command startup with scenario seeding)

**Usage:**

```bash
npm run demo:pass        # Local or CI readiness check
npm run smoke           # Pre-demo validation
.\demo-startup.ps1 -Scenario swe  # PowerShell on Windows
```

### Environment Templates

- **`api/.env.example`** — Default/local development variables
- **`api/.env`** — Developer's local machine (git-ignored)
- **`api/.env.production`** — Production deployment template

**Setup:**

```bash
cp api/.env.example api/.env
# Edit API_KEY fields as needed
```

### Documentation Assets

All documentation is version-controlled in `docs/`:

| File                             | Purpose                               |
| -------------------------------- | ------------------------------------- |
| `docs/DEPLOYMENT.md`             | Public hosting guide (Vercel/Node.js) |
| `docs/ops-endpoint-reference.md` | Operator control panel reference      |
| `docs/OBSERVABILITY.md`          | Debugging & correlation ID guide      |
| `README.md`                      | Quick start and repository overview   |
| `TESTING_QUICK_START.md`         | Fast testing guide                    |
| `docs/TESTING.md`                | Comprehensive testing suite           |
| `docs/TROUBLESHOOTING_LEVEL2.md` | Advanced troubleshooting              |
| `docs/operator-playbook.md`      | Live demo operator guide              |
| `docs/demo-contingency-plan.md`  | Emergency recovery plans              |

## No Remaining Local-Only Artifacts

### ✅ What Was Migrated

- Demo startup scripts (PowerShell, bash) → Repo root + documented
- Environment templates → `api/.env.*` files
- Deployment knowledge → `docs/DEPLOYMENT.md`
- Operator runbooks → `docs/operator-playbook.md`
- Debugging guides → `docs/OBSERVABILITY.md`

### ✅ What Is Versioned

- All critical path scripts
- All configuration templates
- All documentation

### ✅ What Remains Local (By Design)

- `api/.env` (git-ignored, contains personal API keys)
- `api/dev.db` (git-ignored, local database)
- `frontend/.env.local` (git-ignored, optional local overrides)
- `node_modules/` (git-ignored, installed locally)

## New Contributor Workflow

Fresh clone can now run with only:

```bash
# 1. Clone repo
git clone https://github.com/jonathannnty/DH-2026.git
cd DH-2026

# 2. Install & setup
npm install
cp api/.env.example api/.env
# Edit .env if using cloud LLM keys (optional)

# 3. Verify readiness
npm run demo:pass       # Green = demo-ready

# 4. Run locally
npm run dev             # Terminal 1: Frontend + API
./demo-startup.ps1      # Terminal 2 (Windows): Pre-load scenario

# 5. Pre-demo smoke test
npm run smoke           # Validate golden path
```

## Machine-Specific Setup (Not in Repo)

### Python Agent Service

Required for full workflows, but NOT required for public demo (fallback handles it).

**Local setup:**

```bash
pip install -r requirements.txt
python agent_service.py  # Runs on localhost:8000
```

**Verify:**

```bash
curl http://localhost:8000/health
```

### Browser for Integration Tests

Optional for running e2e tests locally:

```bash
# Install Playwright browsers (one-time)
npx playwright install

# Run e2e tests
RUN_LEVEL3_E2E_TESTS=true npm run test --workspace frontend
```

## Conclusion

All critical setup and operational knowledge is now in version control. New contributors, operators, and CI/CD systems can run the demo without tribal knowledge or local-only artifacts.

**Definition of Done for Item 4:** ✅ No critical run/test/demo workflow depends on untracked local artifacts.
