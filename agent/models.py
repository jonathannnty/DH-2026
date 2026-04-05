"""Shared Pydantic models for the PathFinder AI agent service."""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Career profile (mirrors TypeScript CareerProfile schema) ──────────────────

class FinancialNeeds(BaseModel):
    minimumSalary: Optional[int] = None
    targetSalary: Optional[int] = None
    hasDebt: Optional[bool] = None


class CareerProfile(BaseModel):
    interests: list[str] = Field(default_factory=list)
    values: list[str] = Field(default_factory=list)
    workingStyle: Optional[str] = None
    hardSkills: list[str] = Field(default_factory=list)
    softSkills: list[str] = Field(default_factory=list)
    riskTolerance: Optional[str] = None          # 'low' | 'medium' | 'high'
    financialNeeds: Optional[FinancialNeeds] = None
    geographicFlexibility: Optional[str] = None  # 'local' | 'remote' | 'relocate' | 'flexible'
    educationLevel: Optional[str] = None
    timelineUrgency: Optional[str] = None        # 'immediate' | 'short' | 'long'
    purposePriorities: list[str] = Field(default_factory=list)
    burnoutConcerns: list[str] = Field(default_factory=list)


# ── Recommendation (mirrors TypeScript CareerRecommendationSchema) ────────────

class SalaryRange(BaseModel):
    low: int
    high: int
    currency: str = "USD"


class CareerRecommendation(BaseModel):
    title: str
    summary: str
    fitScore: int = Field(ge=0, le=100)
    reasons: list[str]
    concerns: list[str]
    nextSteps: list[str]
    salaryRange: Optional[SalaryRange] = None


# ── API request / response contracts ─────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    sessionId: str
    profile: CareerProfile
    trackId: Optional[str] = None


class AnalyzeResponse(BaseModel):
    ok: bool = True
    sessionId: str


class ResearchRequest(BaseModel):
    sessionId: str
    trackId: Optional[str] = None


class ResearchResult(BaseModel):
    """Pre-fetched web research data to enrich later Claude analysis."""
    topRoles: list[str] = Field(default_factory=list)  # Top job titles in the track
    marketInsights: Optional[str] = None  # General market trends
    companies: list[str] = Field(default_factory=list)  # Companies actively hiring


class SessionStatus(str, Enum):
    pending = "pending"
    analyzing = "analyzing"
    complete = "complete"
    error = "error"


class StatusResponse(BaseModel):
    sessionId: str
    status: SessionStatus
    progress: int = Field(ge=0, le=100, default=0)
    stage: Optional[str] = None
    recommendations: Optional[list[CareerRecommendation]] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    browserUse: str = "unknown"    # 'available' | 'unavailable'
    model: str
