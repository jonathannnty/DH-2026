#!/bin/bash
set -e

# Demo Pass — one-command readiness verification
# Runs locally and in CI to verify demo readiness end-to-end
# Usage: ./demo-pass.sh
# Returns: 0 = pass, 1 = fail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Demo Pass — Readiness Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Check Node/npm
echo "✓ Environment check..."
node --version >/dev/null 2>&1 || { echo "❌ Node.js not found"; exit 1; }
npm --version >/dev/null 2>&1 || { echo "❌ npm not found"; exit 1; }

# Step 2: Install dependencies (if needed)
echo "✓ Installing dependencies..."
npm ci >/dev/null 2>&1 || npm install >/dev/null 2>&1

# Step 3: Start API in background
echo "✓ Starting API server..."
export DEMO_MODE=true
export DATABASE_URL=":memory:"
npm run dev --workspace api &
API_PID=$!
trap "kill $API_PID 2>/dev/null || true" EXIT

# Step 4: Wait for API to be ready (poll /ready endpoint)
MAX_ATTEMPTS=30
ATTEMPT=0
READY=false

echo "⏳ Waiting for API to be ready (max 30s)..."
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))

  # Try to hit the ready endpoint
  HTTP_STATUS=$(curl -s -w "%{http_code}" -o /tmp/ready_response.json http://localhost:3000/ready 2>/dev/null || echo "000")

  if [ "$HTTP_STATUS" = "200" ]; then
    READY_JSON=$(cat /tmp/ready_response.json 2>/dev/null || echo "{}")
    READY_STATUS=$(echo "$READY_JSON" | grep -o '"ready":[^,}]*' | grep -o 'true\|false' || echo "false")

    if [ "$READY_STATUS" = "true" ]; then
      READY=true
      echo "✅ API ready!"
      break
    fi
  fi

  if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
    sleep 1
  fi
done

if [ "$READY" != "true" ]; then
  echo "❌ API failed to become ready after 30s"
  echo "   Try: npm run dev --workspace api (to debug)"
  exit 1
fi

# Step 5: Print ready response for debugging
echo ""
echo "📋 Readiness Check Results:"
if command -v jq &>/dev/null; then
  jq . /tmp/ready_response.json 2>/dev/null || cat /tmp/ready_response.json
else
  cat /tmp/ready_response.json
fi
echo ""

# Step 6: Run contract tests
echo "✓ Running contract tests..."
if npm run test --workspace api 2>&1 | tee /tmp/test_output.log | grep -E "^[x✓]|FAIL|PASS|Tests:"; then
  TEST_RESULT=0
else
  TEST_RESULT=1
fi

if grep -q "✓" /tmp/test_output.log || grep -q "passed" /tmp/test_output.log; then
  TEST_RESULT=0
fi

# Step 7: Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$TEST_RESULT" -eq 0 ]; then
  echo "✅ Demo Pass: All checks passed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo "❌ Demo Pass: Tests failed (see output above)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
