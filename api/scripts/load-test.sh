#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Load test: simulates concurrent demo traffic
#
# Prerequisites:
#   DEMO_MODE=true npm run dev --workspace api
#
# Tests:
#   1. Concurrent session creation (burst of 20)
#   2. Rapid-fire messages on a single session
#   3. Concurrent analyze + stream (5 simultaneous)
#   4. Health endpoint under load
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

API="${API_URL:-http://localhost:3001}"
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}  PASS${NC} $1"; }
fail() { echo -e "${RED}  FAIL${NC} $1"; }
section() { echo -e "\n${BLUE}━━ $1 ━━${NC}"; }

MESSAGES=(
  "technology, artificial intelligence, music production, education"
  "autonomy, innovation, social impact"
  "independent deep-focus with occasional collaboration"
  "Python, TypeScript, machine learning, data analysis, audio engineering"
  "communication, problem-solving, mentoring, creativity"
  "medium"
  "minimum salary 75000, target salary 120000, no debt"
  "remote"
  "bachelor's in Computer Science"
  "short"
  "helping people learn, building things, creative expression"
  "open-plan offices, constant meetings, micromanagement"
)

# ── Reset before test ──
curl -s -X POST "$API/ops/reset" > /dev/null

# ── 1. Concurrent session creation ──────────────────────────────────
section "1. Concurrent session creation (20 burst)"
START=$(date +%s%N)
PIDS=()
TMPDIR_LOAD=$(mktemp -d)
for i in $(seq 1 20); do
  curl -s -o "$TMPDIR_LOAD/create_$i.json" -w "%{http_code}" -X POST "$API/sessions" > "$TMPDIR_LOAD/code_$i.txt" &
  PIDS+=($!)
done
for pid in "${PIDS[@]}"; do wait "$pid"; done
END=$(date +%s%N)
ELAPSED=$(( (END - START) / 1000000 ))

FAIL_COUNT=0
for i in $(seq 1 20); do
  CODE=$(cat "$TMPDIR_LOAD/code_$i.txt")
  [[ "$CODE" != "201" ]] && FAIL_COUNT=$((FAIL_COUNT + 1))
done

if [[ $FAIL_COUNT -eq 0 ]]; then
  pass "20/20 sessions created in ${ELAPSED}ms"
else
  fail "$FAIL_COUNT/20 failed (${ELAPSED}ms)"
fi

# ── 2. Rapid-fire messages ──────────────────────────────────────────
section "2. Rapid-fire intake (12 messages, sequential)"
SESSION_JSON=$(curl -s -X POST "$API/sessions")
SID=$(echo "$SESSION_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "$SESSION_JSON" | python -c "import sys,json;print(json.load(sys.stdin)['id'])")
START=$(date +%s%N)
MSG_FAIL=0
for i in "${!MESSAGES[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/sessions/$SID/messages" \
    -H 'Content-Type: application/json' \
    -d "{\"content\": \"${MESSAGES[$i]}\"}")
  [[ "$CODE" != "200" ]] && MSG_FAIL=$((MSG_FAIL + 1))
done
END=$(date +%s%N)
ELAPSED=$(( (END - START) / 1000000 ))
AVG=$(( ELAPSED / 12 ))

if [[ $MSG_FAIL -eq 0 ]]; then
  pass "12/12 messages in ${ELAPSED}ms (avg ${AVG}ms/msg)"
else
  fail "$MSG_FAIL/12 failed (${ELAPSED}ms)"
fi

# ── 3. Concurrent analyze + stream ──────────────────────────────────
section "3. Concurrent analyze + stream (5 sessions)"

# Create and fill 5 sessions
SIDS=()
for i in $(seq 1 5); do
  S_JSON=$(curl -s -X POST "$API/sessions")
  S_ID=$(echo "$S_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "$S_JSON" | python -c "import sys,json;print(json.load(sys.stdin)['id'])")
  for msg in "${MESSAGES[@]}"; do
    curl -s -o /dev/null -X POST "$API/sessions/$S_ID/messages" \
      -H 'Content-Type: application/json' \
      -d "{\"content\": \"$msg\"}"
  done
  SIDS+=("$S_ID")
done

# Trigger all analyses concurrently
START=$(date +%s%N)
ANALYZE_PIDS=()
for sid in "${SIDS[@]}"; do
  curl -s -o /dev/null -X POST "$API/sessions/$sid/analyze" &
  ANALYZE_PIDS+=($!)
done
for pid in "${ANALYZE_PIDS[@]}"; do wait "$pid"; done

# Stream all concurrently
STREAM_PIDS=()
for i in "${!SIDS[@]}"; do
  curl -s -o "$TMPDIR_LOAD/stream_$i.txt" "$API/sessions/${SIDS[$i]}/stream" &
  STREAM_PIDS+=($!)
done
for pid in "${STREAM_PIDS[@]}"; do wait "$pid"; done
END=$(date +%s%N)
ELAPSED=$(( (END - START) / 1000000 ))

STREAM_FAIL=0
for i in "${!SIDS[@]}"; do
  if ! grep -q '"complete"' "$TMPDIR_LOAD/stream_$i.txt" 2>/dev/null; then
    STREAM_FAIL=$((STREAM_FAIL + 1))
  fi
done

if [[ $STREAM_FAIL -eq 0 ]]; then
  pass "5/5 analyze+stream completed in ${ELAPSED}ms"
else
  fail "$STREAM_FAIL/5 streams failed (${ELAPSED}ms)"
fi

# ── 4. Health under load ────────────────────────────────────────────
section "4. Health endpoint (50 concurrent requests)"
START=$(date +%s%N)
HEALTH_PIDS=()
for i in $(seq 1 50); do
  curl -s -o /dev/null -w "%{http_code}" "$API/health" > "$TMPDIR_LOAD/health_$i.txt" &
  HEALTH_PIDS+=($!)
done
for pid in "${HEALTH_PIDS[@]}"; do wait "$pid"; done
END=$(date +%s%N)
ELAPSED=$(( (END - START) / 1000000 ))

HEALTH_FAIL=0
for i in $(seq 1 50); do
  CODE=$(cat "$TMPDIR_LOAD/health_$i.txt")
  [[ "$CODE" != "200" ]] && HEALTH_FAIL=$((HEALTH_FAIL + 1))
done

if [[ $HEALTH_FAIL -eq 0 ]]; then
  pass "50/50 health checks in ${ELAPSED}ms"
else
  fail "$HEALTH_FAIL/50 failed (${ELAPSED}ms)"
fi

# ── Summary ─────────────────────────────────────────────────────────
section "DB state after load test"
curl -s "$API/ops/db/stats" | python3 -m json.tool 2>/dev/null || curl -s "$API/ops/db/stats" | python -m json.tool

# Cleanup temp
rm -rf "$TMPDIR_LOAD"
echo -e "\n${GREEN}Load test complete.${NC}"
