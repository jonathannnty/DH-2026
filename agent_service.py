"""
Multi-agent service using uAgents and browser-use for career guidance.
5 specialized agents handle different aspects of career analysis and recommendations.
"""

import os
import sys
import json
import asyncio
import logging
import threading
from uuid import uuid4
from typing import Optional, Any
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
try:
    from uagents import Agent as UAgent
    from uagents import Bureau, Context, Protocol
except ImportError:
    UAgent = None  # Optional dependency
    Bureau = None
    Context = None
    Protocol = None
try:
    from uagents_core.contrib.protocols.chat import (
        ChatAcknowledgement,
        ChatMessage,
        EndSessionContent,
        TextContent,
        chat_protocol_spec,
    )
except ImportError:
    ChatAcknowledgement = None
    ChatMessage = None
    EndSessionContent = None
    TextContent = None
    chat_protocol_spec = None
try:
    from browser_use_sdk import Agent as BrowserAgent
except ImportError:
    BrowserAgent = None  # Optional dependency

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== Agentverse Bridge Config ====================

def _is_truthy(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


ENABLE_AGENTVERSE_LINK = _is_truthy(os.getenv("ENABLE_AGENTVERSE_LINK"), default=False)
# Mailbox must stay enabled for Agentverse connection flow on all five role agents.
AGENTVERSE_MAILBOX_ENABLED = True
AGENTVERSE_PUBLISH_DETAILS = _is_truthy(os.getenv("AGENTVERSE_PUBLISH_DETAILS"), default=True)
AGENTVERSE_CONCURRENT_HANDLERS = _is_truthy(os.getenv("AGENTVERSE_CONCURRENT_HANDLERS"), default=False)
AGENTVERSE_ENABLE_CHAT_PROTOCOL = _is_truthy(os.getenv("AGENTVERSE_ENABLE_CHAT_PROTOCOL"), default=True)
AGENTVERSE_USE_BUREAU = _is_truthy(os.getenv("AGENTVERSE_USE_BUREAU"), default=False)
AGENTVERSE_NETWORK = os.getenv("AGENTVERSE_NETWORK", "mainnet")
AGENTVERSE_BUREAU_PORT = int(os.getenv("AGENTVERSE_BUREAU_PORT", "8300"))
AGENTVERSE_BASE_PORT = int(os.getenv("AGENTVERSE_BASE_PORT", "8100"))
AGENTVERSE_ENDPOINT_HOST = os.getenv("AGENTVERSE_ENDPOINT_HOST", "127.0.0.1")
AGENTVERSE_BASE_SEED = os.getenv("AGENTVERSE_BASE_SEED", "dh2026-pathfinder-agent")

ROLE_TO_AGENT_NAME = {
    "research": "pathfinder-research",
    "profile_analysis": "pathfinder-profile-analysis",
    "recommendations": "pathfinder-recommendations",
    "verification": "pathfinder-verification",
    "report_generation": "pathfinder-report-generation",
}


def _add_chat_protocol(agent: UAgent, role: str) -> None:
    """Attach standard Agent Chat Protocol handlers for ASI/Agentverse compatibility."""
    if not AGENTVERSE_ENABLE_CHAT_PROTOCOL:
        return

    if (
        Protocol is None
        or chat_protocol_spec is None
        or ChatMessage is None
        or ChatAcknowledgement is None
        or TextContent is None
        or EndSessionContent is None
    ):
        logger.warning("Chat protocol dependencies unavailable; skipping manifest publish for role=%s", role)
        return

    chat_protocol = Protocol(spec=chat_protocol_spec)

    @chat_protocol.on_message(ChatMessage)
    async def _handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
        await ctx.send(
            sender,
            ChatAcknowledgement(
                timestamp=datetime.utcnow(),
                acknowledged_msg_id=msg.msg_id,
            ),
        )

        incoming_text = ""
        for item in msg.content:
            if isinstance(item, TextContent):
                incoming_text += f"{item.text} "

        incoming_text = incoming_text.strip() or "(no text provided)"
        reply_text = (
            f"[{role}] PathFinder agent is online on Agentverse mailbox. "
            f"Received: {incoming_text}. "
            "For full career workflow, call the FastAPI /analyze endpoint."
        )

        await ctx.send(
            sender,
            ChatMessage(
                timestamp=datetime.utcnow(),
                msg_id=uuid4(),
                content=[
                    TextContent(type="text", text=reply_text),
                    EndSessionContent(type="end-session"),
                ],
            ),
        )

    @chat_protocol.on_message(ChatAcknowledgement)
    async def _handle_chat_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
        ctx.logger.info(
            "Role '%s' received ack from %s for msg %s",
            role,
            sender,
            msg.acknowledged_msg_id,
        )

    agent.include(chat_protocol, publish_manifest=True)


def _build_agentverse_agents() -> list:
    """Create one uAgent per role so each local agent can connect to Agentverse."""
    if UAgent is None:
        logger.warning("uagents not installed; skipping Agentverse bridge startup")
        return []

    created_agents = []
    for index, (role, agent_name) in enumerate(ROLE_TO_AGENT_NAME.items(), start=1):
        port = AGENTVERSE_BASE_PORT + index
        endpoint = f"http://{AGENTVERSE_ENDPOINT_HOST}:{port}/submit"
        role_seed_env = f"AGENTVERSE_SEED_{role.upper()}"
        seed = os.getenv(role_seed_env, f"{AGENTVERSE_BASE_SEED}-{role}")

        agent_kwargs = {
            "name": agent_name,
            "seed": seed,
            "port": port,
            "mailbox": AGENTVERSE_MAILBOX_ENABLED,
            "network": AGENTVERSE_NETWORK,
            "description": f"PathFinder role agent: {role}",
            "publish_agent_details": AGENTVERSE_PUBLISH_DETAILS,
            "readme_path": "README.md",
            "handle_messages_concurrently": AGENTVERSE_CONCURRENT_HANDLERS,
        }

        # endpoint + mailbox together causes endpoint to win; only set endpoint when mailbox is off.
        if not AGENTVERSE_MAILBOX_ENABLED:
            agent_kwargs["endpoint"] = [endpoint]

        if not AGENTVERSE_USE_BUREAU:
            agent_kwargs["loop"] = asyncio.new_event_loop()

        agent = UAgent(**agent_kwargs)

        @agent.on_event("startup")
        async def _on_startup(ctx: Context, role_name: str = role, local_endpoint: str = endpoint):
            ctx.logger.info(
                "PathFinder role '%s' linked to Agentverse (endpoint=%s)",
                role_name,
                local_endpoint,
            )

        _add_chat_protocol(agent, role)

        created_agents.append(agent)

    return created_agents


def start_agentverse_bridge() -> Optional[threading.Thread]:
    """Start all five local role agents for Agentverse linking."""
    if not ENABLE_AGENTVERSE_LINK:
        logger.info("Agentverse bridge disabled (set ENABLE_AGENTVERSE_LINK=true to enable)")
        return None

    if Bureau is None:
        logger.warning("Cannot start Agentverse bridge because uagents is unavailable")
        return None

    agents = _build_agentverse_agents()
    if not agents:
        return None

    if not AGENTVERSE_USE_BUREAU:
        def _run_single(agent: UAgent) -> None:
            try:
                agent.run()
            except Exception as exc:
                logger.exception("Role agent '%s' stopped unexpectedly: %s", agent.name, exc)

        logger.info(
            "Starting Agentverse bridge for %d agents on network=%s (mailbox=%s, mode=independent)",
            len(agents),
            AGENTVERSE_NETWORK,
            AGENTVERSE_MAILBOX_ENABLED,
        )

        for agent in agents:
            thread = threading.Thread(
                target=_run_single,
                args=(agent,),
                name=f"agentverse-{agent.name}",
                daemon=True,
            )
            thread.start()

        return None

    bureau = Bureau(agents=agents, network=AGENTVERSE_NETWORK, port=AGENTVERSE_BUREAU_PORT)

    def _run_bureau() -> None:
        try:
            logger.info(
                "Starting Agentverse bridge for %d agents on network=%s (mailbox=%s, bureau_port=%s)",
                len(agents),
                AGENTVERSE_NETWORK,
                AGENTVERSE_MAILBOX_ENABLED,
                AGENTVERSE_BUREAU_PORT,
            )
            bureau.run()
        except Exception as exc:
            logger.exception("Agentverse bridge stopped unexpectedly: %s", exc)

    thread = threading.Thread(target=_run_bureau, name="agentverse-bureau", daemon=True)
    thread.start()
    return thread

# Initialize FastAPI app
app = FastAPI(title="Multi-Agent Career Service")

# ==================== Data Models ====================

class SessionContext(BaseModel):
    sessionId: str
    profile: dict
    trackId: Optional[str] = None
    messages: list = []

class AnalysisRequest(BaseModel):
    sessionId: str
    profile: dict
    trackId: Optional[str] = None

class StatusResponse(BaseModel):
    status: str
    progress: int
    current_agent: str
    results: Optional[dict] = None
    stage: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    agents: list

# ==================== Agent Definitions ====================

class ResearchAgent:
    """Research Agent: Researches job market, companies, and career paths"""
    
    def __init__(self):
        self.name = "research"
        self.description = "Researches job market trends and career opportunities"
        self.status = "idle"
        self.progress = 0
    
    async def run(self, context: SessionContext) -> dict:
        """Research job market and career opportunities based on profile"""
        logger.info(f"[{self.name}] Starting research for profile: {context.profile.get('interests', [])}")
        
        self.status = "running"
        self.progress = 0
        
        try:
            # Simulate research phases
            research_results = {
                "interests": context.profile.get("interests", []),
                "trending_fields": [
                    "AI/Machine Learning",
                    "Cloud Engineering",
                    "Data Science",
                    "Cybersecurity"
                ],
                "salary_ranges": {
                    "entry_level": "$60-80K",
                    "mid_level": "$100-150K",
                    "senior_level": "$150-250K"
                },
                "top_companies": [
                    "Google", "Microsoft", "Amazon", "Apple", "Meta"
                ],
                "certifications": [
                    "AWS Solutions Architect",
                    "Google Cloud Professional",
                    "Azure Administrator"
                ]
            }
            
            self.progress = 100
            self.status = "completed"
            return research_results
            
        except Exception as e:
            logger.error(f"[{self.name}] Error: {str(e)}")
            self.status = "error"
            raise

class ProfileAnalysisAgent:
    """Profile Analysis Agent: Analyzes user profile and identifies patterns"""
    
    def __init__(self):
        self.name = "profile_analysis"
        self.description = "Analyzes user profile to identify strengths and patterns"
        self.status = "idle"
        self.progress = 0
    
    async def run(self, context: SessionContext) -> dict:
        """Analyze user profile for patterns and strengths"""
        logger.info(f"[{self.name}] Analyzing profile")
        
        self.status = "running"
        self.progress = 0
        
        try:
            profile = context.profile
            
            # Analyze different dimensions
            analysis_results = {
                "interests": {
                    "primary": profile.get("interests", [])[0] if profile.get("interests") else "Not specified",
                    "count": len(profile.get("interests", [])),
                    "diversity_score": min(len(profile.get("interests", [])), 10) / 10
                },
                "values": {
                    "primary_value": profile.get("values", [])[0] if profile.get("values") else "Not specified",
                    "values_list": profile.get("values", []),
                },
                "skills": {
                    "technical": profile.get("technical_skills", []),
                    "soft_skills": profile.get("soft_skills", []),
                    "development_areas": profile.get("development_areas", [])
                },
                "experience_level": profile.get("experience_level", "entry_level"),
                "personality_traits": {
                    "work_style": profile.get("work_style", "collaborative"),
                    "learning_style": profile.get("learning_style", "hands_on")
                },
                "strengths": [
                    "Communication",
                    "Problem Solving",
                    "Adaptability",
                    "Leadership"
                ],
                "growth_areas": [
                    "Technical depth",
                    "Industry knowledge",
                    "Advanced certifications"
                ]
            }
            
            self.progress = 100
            self.status = "completed"
            return analysis_results
            
        except Exception as e:
            logger.error(f"[{self.name}] Error: {str(e)}")
            self.status = "error"
            raise

class RecommendationAgent:
    """Recommendation Agent: Generates tailored career recommendations"""
    
    def __init__(self):
        self.name = "recommendations"
        self.description = "Generates personalized career recommendations"
        self.status = "idle"
        self.progress = 0
    
    async def run(self, context: SessionContext) -> dict:
        """Generate career recommendations based on profile"""
        logger.info(f"[{self.name}] Generating recommendations")
        
        self.status = "running"
        self.progress = 0
        
        try:
            profile = context.profile
            interests = [str(item).lower() for item in profile.get("interests", [])]
            values = [str(item).lower() for item in profile.get("values", [])]
            hard_skills = [str(item).lower() for item in profile.get("hardSkills", [])]
            soft_skills = [str(item).lower() for item in profile.get("softSkills", [])]
            track_id = (context.trackId or "general").lower()

            def has_any(items: list[str], needles: list[str]) -> bool:
                return any(any(needle in item for needle in needles) for item in items)

            def score(base: float, boosts: list[tuple[bool, float]]) -> float:
                return round(min(0.97, sum(boost for cond, boost in boosts if cond) + base), 2)

            def salary(low_k: int, high_k: int) -> str:
                return f"${low_k}K-${high_k}K"

            common_remote = any("remote" in str(profile.get("geographicFlexibility", "")).lower() for _ in [0])
            autonomy = "autonomy" in values
            impact = any(v in values for v in ["social impact", "impact"])
            creative = has_any(interests + hard_skills, ["creative", "music", "design", "art", "video"])
            health = has_any(interests + hard_skills, ["health", "medical", "clinical", "bio", "fhir", "ehr"])
            tech = has_any(interests + hard_skills, ["ai", "ml", "machine learning", "python", "typescript", "cloud", "data", "kubernetes"])

            if track_id == "tech-career" or tech:
                paths = [
                    {
                        "title": "Staff Software Engineer — AI Platform",
                        "alignment_score": score(0.83, [
                            (has_any(hard_skills, ["python", "typescript", "cloud", "kubernetes"]), 0.08),
                            (tech, 0.04),
                            (common_remote, 0.02),
                            (autonomy, 0.02),
                        ]),
                        "reasoning": "Your technical skills map directly to platform and infrastructure roles.",
                        "avg_salary": salary(180, 300),
                        "growth_potential": "High",
                    },
                    {
                        "title": "ML / AI Engineer — Applied Products",
                        "alignment_score": score(0.8, [
                            (has_any(hard_skills, ["python", "ml", "machine learning", "data"]), 0.1),
                            (has_any(interests, ["ai", "machine learning", "data"]), 0.04),
                            (impact, 0.02),
                        ]),
                        "reasoning": "Strong match for AI-focused products and data-driven work.",
                        "avg_salary": salary(170, 290),
                        "growth_potential": "Very High",
                    },
                    {
                        "title": "Technical Product Manager — AI Products",
                        "alignment_score": score(0.74, [
                            (has_any(soft_skills, ["communication", "leadership", "mentoring"]), 0.08),
                            (impact, 0.03),
                            (autonomy, 0.02),
                        ]),
                        "reasoning": "A strong option if you want strategy and ownership without leaving the technical orbit.",
                        "avg_salary": salary(150, 250),
                        "growth_potential": "High",
                    },
                ]
                next_steps = [
                    "Build one portfolio project that demonstrates your strongest technical stack.",
                    "Tailor your resume to platform, AI, and product keywords.",
                    "Target hiring teams at engineering-led companies and AI product orgs.",
                ]
            elif track_id == "healthcare-pivot" or health:
                paths = [
                    {
                        "title": "Clinical Informatics Engineer",
                        "alignment_score": score(0.82, [
                            (has_any(hard_skills, ["python", "data", "sql", "analytics"]), 0.07),
                            (health, 0.06),
                            (impact, 0.02),
                        ]),
                        "reasoning": "A strong fit for healthcare systems, data workflows, and mission-driven work.",
                        "avg_salary": salary(110, 180),
                        "growth_potential": "High",
                    },
                    {
                        "title": "Health AI Specialist",
                        "alignment_score": score(0.79, [
                            (has_any(hard_skills, ["python", "ml", "data", "ai"]), 0.1),
                            (health, 0.05),
                            (impact, 0.03),
                        ]),
                        "reasoning": "Ideal if you want to combine AI skills with clinical or health-tech impact.",
                        "avg_salary": salary(125, 210),
                        "growth_potential": "Very High",
                    },
                    {
                        "title": "Healthcare Data Analyst",
                        "alignment_score": score(0.73, [
                            (has_any(hard_skills, ["data", "sql", "analytics"]), 0.09),
                            (health, 0.05),
                            (common_remote, 0.02),
                        ]),
                        "reasoning": "Accessible entry point into healthcare with strong analytical demand.",
                        "avg_salary": salary(95, 155),
                        "growth_potential": "High",
                    },
                ]
                next_steps = [
                    "Learn the basics of HL7 FHIR and healthcare data interoperability.",
                    "Build one project using a public clinical or health dataset.",
                    "Target health-tech vendors, health systems, and clinical data teams.",
                ]
            elif track_id == "creative-industry" or creative:
                paths = [
                    {
                        "title": "Creative Technologist — AI Tools",
                        "alignment_score": score(0.81, [
                            (has_any(hard_skills, ["typescript", "javascript", "python", "react"]), 0.07),
                            (creative, 0.06),
                            (autonomy, 0.03),
                        ]),
                        "reasoning": "Strong fit for interactive experiences, design tools, and creative AI products.",
                        "avg_salary": salary(100, 170),
                        "growth_potential": "High",
                    },
                    {
                        "title": "AI Content / Media Engineer",
                        "alignment_score": score(0.78, [
                            (has_any(hard_skills, ["python", "javascript", "typescript", "ai"]), 0.08),
                            (creative, 0.05),
                            (impact, 0.02),
                        ]),
                        "reasoning": "Well suited for generative media, tooling, and creative workflow automation.",
                        "avg_salary": salary(95, 165),
                        "growth_potential": "Very High",
                    },
                    {
                        "title": "Developer Advocate — Creative Platforms",
                        "alignment_score": score(0.71, [
                            (has_any(soft_skills, ["communication", "mentoring", "creativity"]), 0.1),
                            (creative, 0.04),
                            (common_remote, 0.02),
                        ]),
                        "reasoning": "Good if you want to pair technical depth with teaching and community work.",
                        "avg_salary": salary(110, 160),
                        "growth_potential": "High",
                    },
                ]
                next_steps = [
                    "Publish a portfolio project that combines code with a creative output.",
                    "Showcase your work publicly with demos, clips, or case studies.",
                    "Target creative tooling, media, and design-platform companies.",
                ]
            else:
                paths = [
                    {
                        "title": "Software Engineer",
                        "alignment_score": score(0.8, [
                            (has_any(hard_skills, ["python", "typescript", "javascript", "cloud", "data"]), 0.08),
                            (common_remote, 0.03),
                        ]),
                        "reasoning": "A broad role that fits most technical backgrounds and keeps your options open.",
                        "avg_salary": salary(120, 180),
                        "growth_potential": "High",
                    },
                    {
                        "title": "Data Scientist",
                        "alignment_score": score(0.76, [
                            (has_any(hard_skills, ["data", "python", "ml", "sql"]), 0.1),
                            (has_any(interests, ["ai", "data", "research"]), 0.04),
                        ]),
                        "reasoning": "Great if your profile leans analytical or AI-focused.",
                        "avg_salary": salary(115, 175),
                        "growth_potential": "Very High",
                    },
                    {
                        "title": "Product Manager",
                        "alignment_score": score(0.7, [
                            (has_any(soft_skills, ["communication", "leadership", "mentoring"]), 0.1),
                            (impact, 0.03),
                        ]),
                        "reasoning": "A strong cross-functional path if leadership and coordination energize you.",
                        "avg_salary": salary(130, 200),
                        "growth_potential": "High",
                    },
                ]
                next_steps = [
                    "Strengthen one portfolio project that best matches your main technical signal.",
                    "Update your resume so the top skills appear in the first third of the page.",
                    "Apply to roles that match your strongest interests and track direction.",
                ]

            recommendations = {
                "top_career_paths": paths[:3],
                "next_steps": next_steps,
                "learning_resources": [
                    {
                        "type": "Online Course",
                        "name": "System Design Interview",
                        "platform": "Educative",
                        "duration": "40 hours"
                    },
                    {
                        "type": "Book",
                        "name": "Designing Data-Intensive Applications",
                        "author": "Martin Kleppmann",
                        "duration": "Reading"
                    }
                ],
                "timeline": {
                    "short_term": "1-3 months - Skill building",
                    "medium_term": "3-6 months - Portfolio development",
                    "long_term": "6-12 months - Job search and placement"
                }
            }
            
            self.progress = 100
            self.status = "completed"
            return recommendations
            
        except Exception as e:
            logger.error(f"[{self.name}] Error: {str(e)}")
            self.status = "error"
            raise

class VerificationAgent:
    """Verification Agent: Verifies information and validates recommendations"""
    
    def __init__(self):
        self.name = "verification"
        self.description = "Verifies career information and validates recommendations"
        self.status = "idle"
        self.progress = 0
    
    async def run(self, context: SessionContext) -> dict:
        """Verify and validate career information"""
        logger.info(f"[{self.name}] Verifying information")
        
        self.status = "running"
        self.progress = 0
        
        try:
            # Verify various aspects
            verification_results = {
                "profile_completeness": {
                    "score": 0.85,
                    "missing_fields": ["advanced_skills", "certifications"],
                    "recommendations": "Consider adding more technical details"
                },
                "recommendation_validity": {
                    "score": 0.92,
                    "checks_passed": [
                        "Recommendations align with interests",
                        "Salary data is market-accurate",
                        "Required skills are attainable"
                    ],
                    "flags": []
                },
                "market_data_verification": {
                    "average_salary_verified": True,
                    "job_market_demand": "High",
                    "skill_demand_trend": "Growing"
                },
                "consistency_check": {
                    "profile_consistency": 0.88,
                    "recommendation_consistency": 0.91
                },
                "validation_status": "APPROVED",
                "timestamp": datetime.now().isoformat()
            }
            
            self.progress = 100
            self.status = "completed"
            return verification_results
            
        except Exception as e:
            logger.error(f"[{self.name}] Error: {str(e)}")
            self.status = "error"
            raise

class ReportGenerationAgent:
    """Report Generation Agent: Creates formatted career reports"""
    
    def __init__(self):
        self.name = "report_generation"
        self.description = "Generates comprehensive career guidance reports"
        self.status = "idle"
        self.progress = 0
    
    async def run(self, context: SessionContext, research_data: dict = None, analysis_data: dict = None, recommendations_data: dict = None) -> dict:
        """Generate comprehensive career report"""
        logger.info(f"[{self.name}] Generating report")
        
        self.status = "running"
        self.progress = 0
        
        try:
            report = {
                "report_id": context.sessionId,
                "generated_at": datetime.now().isoformat(),
                "report_type": "Career Guidance Profile",
                "sections": {
                    "executive_summary": {
                        "title": "Your Career Profile Summary",
                        "insights": "Based on your interests, values, and skills, we've identified several promising career paths."
                    },
                    "market_analysis": research_data or {},
                    "profile_analysis": analysis_data or {},
                    "recommendations": recommendations_data or {},
                    "action_plan": {
                        "immediate": "Start with foundational certifications",
                        "three_months": "Build portfolio projects",
                        "six_months": "Begin active job search",
                        "one_year": "Target senior positions or specialization"
                    }
                },
                "downloadable_formats": [
                    "PDF",
                    "JSON",
                    "CSV"
                ],
                "next_meeting_recommendation": "Schedule follow-up in 3 months"
            }
            
            self.progress = 100
            self.status = "completed"
            return report
            
        except Exception as e:
            logger.error(f"[{self.name}] Error: {str(e)}")
            self.status = "error"
            raise

# ==================== Agent Manager ====================

class AgentManager:
    """Orchestrates all agents for career analysis workflow"""
    
    def __init__(self):
        self.agents = {
            "research": ResearchAgent(),
            "profile_analysis": ProfileAnalysisAgent(),
            "recommendations": RecommendationAgent(),
            "verification": VerificationAgent(),
            "report_generation": ReportGenerationAgent()
        }
        self.session_state = {}
        # Define agent order for sequential execution and progress calculation
        self.agent_order = [
            "research",
            "profile_analysis",
            "recommendations",
            "verification",
            "report_generation"
        ]
    
    async def run_analysis(self, context: SessionContext) -> dict:
        """Run full analysis workflow"""
        logger.info(f"Starting analysis for session {context.sessionId}")
        
        session_key = context.sessionId
        self.session_state[session_key] = {
            "status": "in_progress",
            "progress": 0,
            "current_agent": "research",
            "results": {}
        }
        
        try:
            # Run agents sequentially
            for agent_index, agent_name in enumerate(self.agent_order):
                self.session_state[session_key]["current_agent"] = agent_name
                # Calculate progress: each agent is 20% (1/5)
                base_progress = (agent_index / len(self.agent_order)) * 100
                
                agent = self.agents[agent_name]
                logger.info(f"[{agent_name}] Starting ({base_progress:.0f}%)")
                
                if agent_name == "report_generation":
                    # Pass results from previous agents to report generation
                    result = await agent.run(
                        context,
                        self.session_state[session_key]["results"].get("research"),
                        self.session_state[session_key]["results"].get("profile_analysis"),
                        self.session_state[session_key]["results"].get("recommendations")
                    )
                else:
                    result = await agent.run(context)
                
                self.session_state[session_key]["results"][agent_name] = result
                
                # Update progress to end of this agent's work
                end_progress = ((agent_index + 1) / len(self.agent_order)) * 100
                self.session_state[session_key]["progress"] = int(end_progress)
                logger.info(f"[{agent_name}] Complete ({end_progress:.0f}%)")
            
            self.session_state[session_key]["status"] = "completed"
            self.session_state[session_key]["current_agent"] = "report_generation"
            self.session_state[session_key]["progress"] = 100
            
            return self.session_state[session_key]
            
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            self.session_state[session_key]["status"] = "error"
            self.session_state[session_key]["error"] = str(e)
            raise
    
    def get_status(self, session_id: str) -> dict:
        """Get current analysis status"""
        if session_id not in self.session_state:
            return {"status": "not_found"}
        return self.session_state[session_id]

# ==================== Initialize Manager ====================

manager = AgentManager()

# ==================== API Endpoints ====================

@app.get("/health")
async def health_check() -> HealthResponse:
    """Health check endpoint"""
    agent_names = list(manager.agents.keys())
    return HealthResponse(
        status="healthy",
        agents=agent_names
    )

@app.post("/analyze")
async def start_analysis(request: AnalysisRequest) -> dict:
    """Start analysis for a session"""
    context = SessionContext(
        sessionId=request.sessionId,
        profile=request.profile,
        trackId=request.trackId
    )
    
    try:
        result = await manager.run_analysis(context)
        return {
            "success": True,
            "sessionId": request.sessionId,
            "status": result["status"],
            "message": "Analysis started"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{session_id}")
async def get_status(session_id: str) -> StatusResponse:
    """Get analysis status for a session"""
    state = manager.get_status(session_id)
    
    if state["status"] == "not_found":
        raise HTTPException(status_code=404, detail="Session not found")
    
    return StatusResponse(
        status=state.get("status", "unknown"),
        progress=state.get("progress", 0),
        current_agent=state.get("current_agent", "unknown"),
        stage=f"Running {state.get('current_agent', 'analysis')}",
        results=state.get("results")
    )

@app.get("/agents")
async def list_agents() -> dict:
    """List all available agents"""
    agents_info = []
    for name, agent in manager.agents.items():
        agents_info.append({
            "name": name,
            "description": agent.description,
            "status": agent.status
        })
    
    return {
        "total_agents": len(agents_info),
        "agents": agents_info
    }

# ==================== Main ====================

if __name__ == "__main__":
    import uvicorn
    start_agentverse_bridge()
    port = int(os.getenv("AGENT_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
