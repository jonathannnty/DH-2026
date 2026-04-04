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
