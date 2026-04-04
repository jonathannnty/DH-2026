# PathFinder AI — Agent Service

Python FastAPI service that runs the career analysis pipeline.
The Node.js API gateway (`api/`) calls this at `AGENT_SERVICE_URL` (default `http://localhost:8000`).

## Quick start

```bash
cd agent

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers (needed for Browser Use enrichment)
playwright install chromium

# Set your API key (copy from api/.env)
export ANTHROPIC_API_KEY=sk-ant-...

# Start the service
python main.py
```

The service listens on port 8000 by default. Override with `AGENT_PORT=<port>`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyze` | Start career analysis (202 Accepted) |
| GET | `/status/{sessionId}` | Poll progress and get recommendations |
| GET | `/health` | Liveness check + capability flags |

## Two-stage pipeline

**Stage 1 — Claude analysis (~5s)**
Uses `claude-sonnet-4-6` with structured tool use to generate 3 career recommendations
tailored to the 12-dimension profile and the selected sponsor track.

**Stage 2 — Browser Use enrichment (~60s, optional)**
Uses `claude-haiku-4-5` to drive a Playwright browser and look up real salary data
and top hiring companies on levels.fyi. Enriches the top recommendation in place.

If Browser Use is not installed or times out, Stage 1 results are returned as-is.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Drives both Claude analysis and Browser Use |
| `AGENT_PORT` | No | Port to listen on (default 8000) |

## Running without Browser Use

If you only want the Claude analysis (no browser automation):

```bash
pip install fastapi uvicorn pydantic anthropic
python main.py
```

Browser Use import is wrapped in a try/except — the service starts fine without it and
logs `"Browser Use not installed — enrichment will be skipped"`.
