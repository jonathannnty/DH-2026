"""Thread-safe in-memory session state store for the agent service."""

from __future__ import annotations

import threading
from typing import Optional
from models import SessionStatus, CareerRecommendation


class SessionState:
    __slots__ = ("session_id", "status", "progress", "stage", "recommendations", "error", "_lock")

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self.status = SessionStatus.pending
        self.progress: int = 0
        self.stage: Optional[str] = None
        self.recommendations: Optional[list[CareerRecommendation]] = None
        self.error: Optional[str] = None
        self._lock = threading.Lock()

    def update(
        self,
        *,
        status: Optional[SessionStatus] = None,
        progress: Optional[int] = None,
        stage: Optional[str] = None,
        recommendations: Optional[list[CareerRecommendation]] = None,
        error: Optional[str] = None,
    ) -> None:
        with self._lock:
            if status is not None:
                self.status = status
            if progress is not None:
                self.progress = progress
            if stage is not None:
                self.stage = stage
            if recommendations is not None:
                self.recommendations = recommendations
            if error is not None:
                self.error = error


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}
        self._lock = threading.Lock()

    def create(self, session_id: str) -> SessionState:
        state = SessionState(session_id)
        with self._lock:
            self._sessions[session_id] = state
        return state

    def get(self, session_id: str) -> Optional[SessionState]:
        return self._sessions.get(session_id)

    def get_or_create(self, session_id: str) -> SessionState:
        existing = self.get(session_id)
        if existing:
            return existing
        return self.create(session_id)

    def delete(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)


# Module-level singleton
store = SessionStore()
