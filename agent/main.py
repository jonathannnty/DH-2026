"""
PathFinder AI — Python agent service

FastAPI app exposing the analysis endpoints that the Node.js API gateway calls.

Endpoints
---------
POST /analyze           Accept a career profile, start background analysis
GET  /status/{id}       Poll analysis progress + final recommendations
GET  /health            Liveness + capability check
"""

from __future__ import annotations

# ── Load .env before any module that reads os.environ at import time ──────────
import os
from pathlib import Path
from dotenv import load_dotenv

_here = Path(__file__).parent
load_dotenv(_here / ".env")                  # agent/.env  (optional override)
load_dotenv(_here.parent / "api" / ".env")  # api/.env    (shared with Node)
# ─────────────────────────────────────────────────────────────────────────────

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from analyzer import analyze, BROWSER_USE_AVAILABLE, ANALYSIS_MODEL
from models import (
    AnalyzeRequest,
    AnalyzeResponse,
    HealthResponse,
    SessionStatus,
    StatusResponse,
    ResearchRequest,
    ResearchResult,
)
from store import store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info(
        "PathFinder agent service starting | model=%s | browser_use=%s",
        ANALYSIS_MODEL,
        "available" if BROWSER_USE_AVAILABLE else "unavailable",
    )
    yield
    logger.info("PathFinder agent service shutting down")


app = FastAPI(
    title="PathFinder AI Agent",
    description="Career analysis service powered by Claude + Browser Use",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── POST /analyze ─────────────────────────────────────────────────────────────

@app.post("/analyze", response_model=AnalyzeResponse, status_code=202)
async def start_analysis(body: AnalyzeRequest) -> AnalyzeResponse:
    """
    Accept a career profile and start background analysis.
    Returns 202 Accepted immediately; poll /status/{sessionId} for progress.
    """
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY is not configured",
        )

    state = store.get_or_create(body.sessionId)
    if state.status == SessionStatus.analyzing:
        # Idempotent — already running
        return AnalyzeResponse(sessionId=body.sessionId)

    state.update(status=SessionStatus.analyzing, progress=0, stage="Starting…")

    # Fire-and-forget background task
    asyncio.create_task(
        analyze(body.sessionId, body.profile, body.trackId, state)
    )

    logger.info("Analysis started for session %s (track=%s)", body.sessionId, body.trackId)
    return AnalyzeResponse(sessionId=body.sessionId)


# ── POST /research ────────────────────────────────────────────────────────────
# Pre-fetch web research data while user is still answering intake questions.
# Results are lightweight market data that will be used to enrich Claude analysis.

RESEARCH_TASK_TEMPLATE = """\
Research the job market for {track_label} careers. Return a JSON object with:
1. topRoles: 3-5 most in-demand job titles in {track_name}
2. marketInsights: 2-3 sentences on current market trends
3. companies: 5-10 top companies actively hiring in {track_name}

Return ONLY valid JSON like:
{{
  "topRoles": ["Role 1", "Role 2"],
  "marketInsights": "Current market insight...",
  "companies": ["Company A", "Company B"]
}}
"""

TRACK_RESEARCH_CONTEXT: dict[str, tuple[str, str]] = {
    "tech-career": ("Tech & Software Engineering", "software engineering"),
    "healthcare-pivot": ("Healthcare & Health-Tech", "healthcare and health-tech"),
    "creative-industry": ("Creative & Design", "creative industries and media"),
    "general": ("Technology", "technology and software"),
}


async def _do_research(track_id: Optional[str]) -> ResearchResult:
    """Run web research using Browser Use (if available), return market data."""
    if not BROWSER_USE_AVAILABLE:
        logger.info("Browser Use unavailable — skipping research enrichment")
        return ResearchResult()

    track_label, track_name = TRACK_RESEARCH_CONTEXT.get(
        track_id, TRACK_RESEARCH_CONTEXT["general"]
    )
    task = RESEARCH_TASK_TEMPLATE.format(
        track_label=track_label, track_name=track_name
    )

    try:
        from browser_use import Agent as BrowserAgent
        from langchain_anthropic import ChatAnthropic
        import json

        llm = ChatAnthropic(
            model="claude-haiku-4-5-20251001",
            api_key=os.environ["ANTHROPIC_API_KEY"],
        )
        agent = BrowserAgent(task=task, llm=llm)
        result = await asyncio.wait_for(agent.run(), timeout=30.0)
        raw = result.final_result() if hasattr(result, "final_result") else str(result)

        # Extract JSON
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(raw[start:end])
            return ResearchResult(
                topRoles=data.get("topRoles", []),
                marketInsights=data.get("marketInsights"),
                companies=data.get("companies", []),
            )
    except (asyncio.TimeoutError, json.JSONDecodeError, Exception) as exc:
        logger.warning("Research task failed: %s", exc)

    return ResearchResult()


@app.post("/research", response_model=ResearchResult)
async def prefetch_research(body: ResearchRequest) -> ResearchResult:
    """Pre-fetch web research data for later analysis enrichment."""
    logger.info("Research started for session %s (track=%s)", body.sessionId, body.trackId)
    return await _do_research(body.trackId)


# ── GET /status/{sessionId} ───────────────────────────────────────────────────

@app.get("/status/{session_id}", response_model=StatusResponse)
async def get_status(session_id: str) -> StatusResponse:
    """Poll analysis progress. Returns recommendations once status is 'complete'."""
    state = store.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    return StatusResponse(
        sessionId=state.session_id,
        status=state.status,
        progress=state.progress,
        stage=state.stage,
        recommendations=state.recommendations if state.status == SessionStatus.complete else None,
        error=state.error if state.status == SessionStatus.error else None,
    )


# ── GET /health ───────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        browserUse="available" if BROWSER_USE_AVAILABLE else "unavailable",
        model=ANALYSIS_MODEL,
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("AGENT_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
