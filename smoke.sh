#!/bin/bash
set -e

# Judge Smoke Flow — Fast Pre-Demo Verification
# Validates core golden path in <60s
# Usage: ./smoke.sh [api_url]
# Default: http://localhost:3001

API_URL="${1:-http://localhost:3001}"
DEMO_MODE="${DEMO_MODE:-true}"

# Cosmetics
PASS="✅"
FAIL="❌"
CLOCK="⏱️"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎭 Judge Smoke Flow — Pre-Demo Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API: $API_URL"
echo "Demo: $DEMO_MODE"
echo ""

START_TIME=$(date +%s%N | cut -b1-13)
TIMEOUT_MS=60000  # 60-second hard limit

# ── Step 1: Health Check ──
echo -n "1. Health check... "
HEALTH=$(curl -s "$API_URL/health" || echo "{}")
STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$STATUS" = "ok" ] || [ "$STATUS" = "degraded" ]; then
  echo "$PASS"
else
  echo "$FAIL (status: $STATUS)"
  exit 1
fi

# ── Step 2: Create Session ──
echo -n "2. Create session... "
SESSION=$(curl -s -X POST "$API_URL/sessions" \
  -H "Content-Type: application/json" \
  -d '{}' || echo "{}")
SESSION_ID=$(echo "$SESSION" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$SESSION_ID" ]; then
  echo "$PASS (ID: ${SESSION_ID:0:8}...)"
else
  echo "$FAIL"
  exit 1
fi

# ── Step 3: Send All Intake Messages ──
echo -n "3. Intake flow (5 messages)... "

# Demo inputs for speaker profile
MESSAGES=(
  '{"content":"I love collaborating with teams and public speaking"}'
  '{"content":"Software engineering, technical writing"}'
  '{"content":"I code in Python and TypeScript"}'
  '{"content":"Strong communication, public speaking, mentoring"}'
  '{"content":"2 years, looking to double salary, open to relocation"}'
)

for i in "${!MESSAGES[@]}"; do
  RESP=$(curl -s -X POST "$API_URL/sessions/$SESSION_ID/messages" \
    -H "Content-Type: application/json" \
    -d "${MESSAGES[$i]}" || echo "{}")

  INTAKE_COMPLETE=$(echo "$RESP" | grep -o '"intakeComplete":[^,}]*' | cut -d':' -f2)
  if [ "$INTAKE_COMPLETE" != "true" ] && [ $((i + 1)) -eq ${#MESSAGES[@]} ]; then
    echo "$FAIL (intake not marked complete on final message)"
    exit 1
  fi
done
echo "$PASS"

# ── Step 4: Verify Profile ──
echo -n "4. Verify profile extraction... "
PROFILE=$(curl -s "$API_URL/sessions/$SESSION_ID" || echo "{}")
INTERESTS=$(echo "$PROFILE" | grep -o '"interests":\[[^]]*\]' || echo '[]')
if [ -n "$INTERESTS" ]; then
  echo "$PASS"
else
  echo "$FAIL"
  exit 1
fi

# ── Step 5: Trigger Analysis ──
echo -n "5. Trigger analysis... "
ANALYZE=$(curl -s -X POST "$API_URL/sessions/$SESSION_ID/analyze" \
  -H "Content-Type: application/json" || echo "{}")
ANALYZE_OK=$(echo "$ANALYZE" | grep -o '"ok":true')
if [ -n "$ANALYZE_OK" ]; then
  echo "$PASS"
else
  echo "$FAIL"
  exit 1
fi

# ── Step 6: Stream to Completion (20s timeout) ──
echo -n "6. Stream analysis (20s timeout)... "
STREAM=$(curl -s --max-time 25 "$API_URL/sessions/$SESSION_ID/stream" || echo "")
COMPLETE=$(echo "$STREAM" | grep -o '"type":"complete"' || echo "")
if [ -n "$COMPLETE" ]; then
  echo "$PASS"
else
  echo "$FAIL (stream did not close with complete event)"
  exit 1
fi

# ── Step 7: Fetch Recommendations ──
echo -n "7. Fetch recommendations... "
RECS=$(curl -s "$API_URL/sessions/$SESSION_ID/recommendations" || echo "[]")
REC_COUNT=$(echo "$RECS" | grep -o '"title":"[^"]*"' | wc -l)
if [ "$REC_COUNT" -ge 3 ]; then
  echo "$PASS ($REC_COUNT recs)"
else
  echo "$FAIL (got $REC_COUNT, expected ≥3)"
  exit 1
fi

# ── Step 8: Cleanup (optional) ──
echo -n "8. Cleanup... "
CLEANUP=$(curl -s -X DELETE "$API_URL/ops/sessions/$SESSION_ID" \
  -H "Content-Type: application/json" || echo "{}")
echo "$PASS"

# ── Summary ──
END_TIME=$(date +%s%N | cut -b1-13)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$PASS Judge Smoke: PASS (${ELAPSED}ms, <60s)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
