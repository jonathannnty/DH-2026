"""
Career analysis engine.

Two-stage pipeline:
  Stage 1 — Claude structured analysis (always runs, ~5s)
  Stage 2 — Browser Use enrichment (runs if available, 60s timeout)

Stage 2 enriches the top recommendation with real salary data and active
job postings, then updates the recommendation in place.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Optional

import anthropic

from models import CareerProfile, CareerRecommendation, SalaryRange, SessionStatus
from store import SessionState

logger = logging.getLogger(__name__)

# ── Claude client — lazy so the key is read after dotenv loads ────────────────

_claude: anthropic.Anthropic | None = None


def _get_claude() -> anthropic.Anthropic:
    global _claude
    if _claude is None:
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. "
                "Add it to api/.env or set it in the environment."
            )
        _claude = anthropic.Anthropic(api_key=key)
    return _claude

# Model IDs
ANALYSIS_MODEL = "claude-sonnet-4-6"   # best for structured reasoning
BROWSER_MODEL = "claude-haiku-4-5-20251001"  # fast + cheap for browser tasks

# ── Browser Use availability ──────────────────────────────────────────────────

try:
    from browser_use import Agent as BrowserAgent
    from langchain_anthropic import ChatAnthropic
    BROWSER_USE_AVAILABLE = True
    logger.info("Browser Use is available")
except ImportError:
    BROWSER_USE_AVAILABLE = False
    logger.warning("Browser Use not installed — enrichment will be skipped")

# ── Track context injected into the prompt ───────────────────────────────────

TRACK_CONTEXT: dict[str, str] = {
    "tech-career": (
        "Focus on software engineering, ML/AI, and tech leadership roles. "
        "Emphasize current tech compensation benchmarks, engineering career ladders, "
        "and the most in-demand technical skills. Recommend roles at software-first companies."
    ),
    "healthcare-pivot": (
        "Focus on healthcare, health-tech, and biotech roles. "
        "Consider clinical, informatics, and health-data paths. "
        "Note relevant certifications (HIPAA, HL7/FHIR, CHDA) and typical healthcare salary bands."
    ),
    "creative-industry": (
        "Focus on design, media, content, and creative technology roles. "
        "Consider AI creative tools, UX, studio work, and independent practice. "
        "Highlight portfolio requirements and typical project-based compensation."
    ),
    "general": (
        "Provide a broad, sector-agnostic career assessment. "
        "Pick the three roles with the highest evidence of fit regardless of industry."
    ),
}

# ── Claude tool schema for structured recommendations ────────────────────────

RECOMMENDATIONS_TOOL = {
    "name": "submit_recommendations",
    "description": (
        "Submit exactly 3 career recommendations in order from highest to lowest fit score. "
        "Each must include all required fields."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "recommendations": {
                "type": "array",
                "minItems": 3,
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "required": ["title", "summary", "fitScore", "reasons", "concerns", "nextSteps", "salaryRange"],
                    "properties": {
                        "title": {"type": "string", "description": "Job title — concise and specific"},
                        "summary": {"type": "string", "description": "2-3 sentence explanation of why this role fits"},
                        "fitScore": {"type": "integer", "minimum": 0, "maximum": 100},
                        "reasons": {
                            "type": "array",
                            "minItems": 3,
                            "maxItems": 5,
                            "items": {"type": "string"},
                            "description": "Specific reasons this role fits the profile",
                        },
                        "concerns": {
                            "type": "array",
                            "minItems": 1,
                            "maxItems": 3,
                            "items": {"type": "string"},
                            "description": "Honest watch-outs or tradeoffs",
                        },
                        "nextSteps": {
                            "type": "array",
                            "minItems": 2,
                            "maxItems": 4,
                            "items": {"type": "string"},
                            "description": "Concrete, actionable steps to pursue this role",
                        },
                        "salaryRange": {
                            "type": "object",
                            "required": ["low", "high", "currency"],
                            "properties": {
                                "low": {"type": "integer", "description": "25th percentile annual USD"},
                                "high": {"type": "integer", "description": "75th percentile annual USD"},
                                "currency": {"type": "string", "enum": ["USD"]},
                            },
                        },
                    },
                },
            }
        },
        "required": ["recommendations"],
    },
}


# ── Stage 1: Claude analysis ──────────────────────────────────────────────────

def _build_prompt(profile: CareerProfile, track_id: Optional[str]) -> str:
    track_note = TRACK_CONTEXT.get(track_id or "general", TRACK_CONTEXT["general"])

    parts = [
        "You are an expert career advisor. Analyze the following 12-dimension career profile "
        "and generate exactly 3 tailored career recommendations.\n",
        f"**Track context:** {track_note}\n",
        "**Career Profile:**",
    ]

    if profile.interests:
        parts.append(f"- Interests: {', '.join(profile.interests)}")
    if profile.values:
        parts.append(f"- Values: {', '.join(profile.values)}")
    if profile.workingStyle:
        parts.append(f"- Working style: {profile.workingStyle}")
    if profile.hardSkills:
        parts.append(f"- Hard skills: {', '.join(profile.hardSkills)}")
    if profile.softSkills:
        parts.append(f"- Soft skills: {', '.join(profile.softSkills)}")
    if profile.riskTolerance:
        parts.append(f"- Risk tolerance: {profile.riskTolerance}")
    if profile.financialNeeds:
        fn = profile.financialNeeds
        salary_str = ""
        if fn.minimumSalary:
            salary_str += f"minimum ${fn.minimumSalary:,}"
        if fn.targetSalary:
            salary_str += f", target ${fn.targetSalary:,}"
        if fn.hasDebt is not None:
            salary_str += f", has debt: {fn.hasDebt}"
        if salary_str:
            parts.append(f"- Financial needs: {salary_str.strip(', ')}")
    if profile.geographicFlexibility:
        parts.append(f"- Geographic flexibility: {profile.geographicFlexibility}")
    if profile.educationLevel:
        parts.append(f"- Education: {profile.educationLevel}")
    if profile.timelineUrgency:
        parts.append(f"- Timeline urgency: {profile.timelineUrgency}")
    if profile.purposePriorities:
        parts.append(f"- Purpose priorities: {', '.join(profile.purposePriorities)}")
    if profile.burnoutConcerns:
        parts.append(f"- Burnout concerns: {', '.join(profile.burnoutConcerns)}")

    parts.append(
        "\nCall `submit_recommendations` with exactly 3 recommendations sorted by fitScore descending. "
        "Be specific — mention actual companies, tools, and certifications relevant to this profile."
    )

    return "\n".join(parts)


def run_claude_analysis(
    profile: CareerProfile,
    track_id: Optional[str],
) -> list[CareerRecommendation]:
    """Synchronous Claude call that returns structured recommendations."""
    response = _get_claude().messages.create(
        model=ANALYSIS_MODEL,
        max_tokens=4096,
        tools=[RECOMMENDATIONS_TOOL],
        tool_choice={"type": "tool", "name": "submit_recommendations"},
        messages=[{"role": "user", "content": _build_prompt(profile, track_id)}],
    )

    # Extract tool_use block
    for block in response.content:
        if block.type == "tool_use" and block.name == "submit_recommendations":
            raw_recs = block.input.get("recommendations", [])
            return [
                CareerRecommendation(
                    title=r["title"],
                    summary=r["summary"],
                    fitScore=r["fitScore"],
                    reasons=r["reasons"],
                    concerns=r["concerns"],
                    nextSteps=r["nextSteps"],
                    salaryRange=SalaryRange(**r["salaryRange"]) if r.get("salaryRange") else None,
                )
                for r in raw_recs
            ]

    raise ValueError("Claude did not return a submit_recommendations tool call")


# ── Stage 2: Browser Use enrichment ──────────────────────────────────────────

BROWSER_TASK_TEMPLATE = """\
Search for real salary data and top hiring companies for this role: "{title}".

Steps:
1. Go to levels.fyi (or glassdoor.com if unavailable).
2. Search for "{title}" roles.
3. Find the median/P50 salary and the top 3 companies currently hiring.
4. Return ONLY a JSON object like:
   {{"median_salary": 180000, "top_companies": ["Google", "Meta", "Stripe"]}}

Do not navigate to any other pages. Stop after you have the JSON.
"""


async def _enrich_with_browser(rec: CareerRecommendation) -> CareerRecommendation:
    """Attempt to enrich one recommendation with real salary + company data."""
    if not BROWSER_USE_AVAILABLE:
        return rec

    llm = ChatAnthropic(
        model=BROWSER_MODEL,
        api_key=os.environ["ANTHROPIC_API_KEY"],
    )
    agent = BrowserAgent(
        task=BROWSER_TASK_TEMPLATE.format(title=rec.title),
        llm=llm,
    )

    try:
        result = await asyncio.wait_for(agent.run(), timeout=90.0)
        # result.final_result() returns the last string the agent produced
        raw = result.final_result() if hasattr(result, "final_result") else str(result)

        # Try to parse JSON from the result
        # The agent may wrap it in prose, so find the first {...}
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(raw[start:end])
            median = data.get("median_salary")
            companies = data.get("top_companies", [])

            if median and isinstance(median, (int, float)):
                # Update salary range centred around the median
                margin = int(median * 0.25)
                rec = rec.model_copy(update={
                    "salaryRange": SalaryRange(
                        low=int(median - margin),
                        high=int(median + margin),
                        currency="USD",
                    )
                })

            if companies:
                # Append enriched company list to nextSteps
                company_str = ", ".join(str(c) for c in companies[:5])
                enriched_steps = list(rec.nextSteps)
                enriched_steps.append(f"Top companies currently hiring: {company_str}")
                rec = rec.model_copy(update={"nextSteps": enriched_steps})

    except (asyncio.TimeoutError, json.JSONDecodeError, Exception) as exc:
        logger.warning("Browser Use enrichment failed for '%s': %s", rec.title, exc)

    return rec


# ── Main pipeline ─────────────────────────────────────────────────────────────

async def analyze(
    session_id: str,
    profile: CareerProfile,
    track_id: Optional[str],
    state: SessionState,
) -> None:
    """
    Full analysis pipeline. Updates `state` throughout so the SSE poller
    can stream progress to the frontend.
    """
    try:
        # Stage 1: Claude analysis
        state.update(status=SessionStatus.analyzing, progress=10, stage="Reading your profile")
        await asyncio.sleep(0)  # yield to event loop

        state.update(progress=30, stage="Evaluating career fit with Claude AI")
        recs = await asyncio.to_thread(run_claude_analysis, profile, track_id)

        state.update(progress=70, stage="Scoring and ranking recommendations")
        await asyncio.sleep(0.2)

        # Stage 2: Browser Use enrichment on top recommendation (best-effort)
        if BROWSER_USE_AVAILABLE and recs:
            state.update(progress=75, stage="Enriching with live job market data")
            recs[0] = await _enrich_with_browser(recs[0])

        state.update(
            status=SessionStatus.complete,
            progress=100,
            stage="Analysis complete",
            recommendations=recs,
        )
        logger.info("Analysis complete for session %s", session_id)

    except Exception as exc:
        logger.exception("Analysis failed for session %s", session_id)
        state.update(
            status=SessionStatus.error,
            progress=0,
            stage=None,
            error=str(exc),
        )
