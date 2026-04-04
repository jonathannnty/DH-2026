#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Golden-path demo script
#
# Prerequisites:
#   DEMO_MODE=true npm run dev --workspace api
#
# This walks through the entire happy path:
#   1. Create session
#   2. 12 intake messages → full profile
#   3. Trigger analysis
#   4. Stream SSE events
#   5. Fetch recommendations
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

API="${API_URL:-http://localhost:3001}"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

step() { echo -e "\n${BLUE}── $1 ──${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }

# ── 1. Create session ──────────────────────────────────────────────
step "Creating session"
SESSION_JSON=$(curl -s -X POST "$API/sessions")
SESSION_ID=$(echo "$SESSION_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "$SESSION_JSON" | python -c "import sys,json; print(json.load(sys.stdin)['id'])")
ok "Session: $SESSION_ID"

echo "Greeting:"
echo "$SESSION_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['messages'][0]['content'])" 2>/dev/null || echo "$SESSION_JSON" | python -c "import sys,json; print(json.load(sys.stdin)['messages'][0]['content'])"

# ── 2. Intake messages ─────────────────────────────────────────────
MESSAGES=(
  "technology, artificial intelligence, music production, education"
  "autonomy, innovation, social impact"
  "independent deep-focus with occasional collaboration"
  "Python, TypeScript, machine learning, data analysis, audio engineering"
  "communication, problem-solving, mentoring, creativity"
  "medium — open to moderate risk"
  "minimum salary \$75,000, target salary \$120,000, no debt"
  "remote — work from anywhere"
  "bachelor's in Computer Science"
  "short — within 6 months"
  "helping people learn, building things that matter, creative expression"
  "open-plan offices, constant meetings, micromanagement"
)

LABELS=(
  "Interests"
  "Values"
  "Working style"
  "Hard skills"
  "Soft skills"
  "Risk tolerance"
  "Financial needs"
  "Geographic flexibility"
  "Education"
  "Timeline"
  "Purpose priorities"
  "Burnout concerns"
)

for i in "${!MESSAGES[@]}"; do
  step "Step $((i+1))/12: ${LABELS[$i]}"
  echo -e "${YELLOW}User:${NC} ${MESSAGES[$i]}"

  RESP=$(curl -s -X POST "$API/sessions/$SESSION_ID/messages" \
    -H 'Content-Type: application/json' \
    -d "{\"content\": \"${MESSAGES[$i]}\"}")

  ASSISTANT=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['message']['content'])" 2>/dev/null || echo "$RESP" | python -c "import sys,json; print(json.load(sys.stdin)['message']['content'])")
  echo -e "${GREEN}Assistant:${NC} $ASSISTANT"
done

# ── 3. Show final profile ─────────────────────────────────────────
step "Final profile"
curl -s "$API/sessions/$SESSION_ID" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(json.dumps(d['profile'], indent=2))
print(f\"Status: {d['status']}\")
print(f\"Messages: {len(d['messages'])}\")
" 2>/dev/null || curl -s "$API/sessions/$SESSION_ID" | python -c "
import sys, json
d = json.load(sys.stdin)
print(json.dumps(d['profile'], indent=2))
print('Status: ' + d['status'])
print('Messages: ' + str(len(d['messages'])))
"

# ── 4. Trigger analysis ───────────────────────────────────────────
step "Triggering analysis"
curl -s -X POST "$API/sessions/$SESSION_ID/analyze" | python3 -m json.tool 2>/dev/null || curl -s -X POST "$API/sessions/$SESSION_ID/analyze" | python -m json.tool
ok "Analysis triggered"

# ── 5. Stream SSE events ──────────────────────────────────────────
step "Streaming SSE events"
curl -s -N "$API/sessions/$SESSION_ID/stream" | while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  [[ "$line" != data:* ]] && continue
  DATA="${line#data: }"
  TYPE=$(echo "$DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['type'])" 2>/dev/null || echo "$DATA" | python -c "import sys,json; print(json.load(sys.stdin)['type'])")
  echo "  Event: $TYPE → $DATA"
  [[ "$TYPE" == "complete" ]] && break
  [[ "$TYPE" == "error" ]] && break
done
ok "Stream complete"

# ── 6. Fetch recommendations ──────────────────────────────────────
step "Career recommendations"
curl -s "$API/sessions/$SESSION_ID/recommendations" | python3 -c "
import sys, json
recs = json.load(sys.stdin)
for i, r in enumerate(recs, 1):
    print(f\"\n  {i}. {r['title']} (fit: {r['fitScore']}%)\")
    print(f\"     {r['summary'][:100]}...\")
    sr = r.get('salaryRange')
    if sr:
        print(f\"     Salary: \${sr['low']:,} – \${sr['high']:,}\")
" 2>/dev/null || curl -s "$API/sessions/$SESSION_ID/recommendations" | python -c "
import sys, json
recs = json.load(sys.stdin)
for i, r in enumerate(recs, 1):
    print()
    print('  %d. %s (fit: %d%%)' % (i, r['title'], r['fitScore']))
    print('     %s...' % r['summary'][:100])
    sr = r.get('salaryRange')
    if sr:
        print('     Salary: \$%s - \$%s' % (format(sr['low'], ','), format(sr['high'], ',')))
"

echo ""
ok "Golden-path demo complete!"
