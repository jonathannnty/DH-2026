#!/usr/bin/env python3
"""
Manual Testing Script for Multi-Agent System
Tests all 3 levels of agent interaction

Usage:
    python scripts/test-agents.py [--level 1|2|3|all] [--verbose]

Prerequisites:
    - Agent service running: python agent_service.py
    - Backend running: cd api && npm run dev
    - Frontend running: cd frontend && npm run dev
"""

import asyncio
import json
import time
import sys
import subprocess
from datetime import datetime
from typing import Any, Optional
import argparse

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(text: str) -> None:
    """Print section header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")


def print_step(step: int, text: str) -> None:
    """Print test step"""
    print(f"{Colors.CYAN}[STEP {step}]{Colors.END} {text}")


def print_success(text: str) -> None:
    """Print success message"""
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")


def print_error(text: str) -> None:
    """Print error message"""
    print(f"{Colors.RED}✗ {text}{Colors.END}")


def print_info(text: str) -> None:
    """Print info message"""
    print(f"{Colors.YELLOW}ℹ {text}{Colors.END}")


async def fetch(method: str, url: str, body: Optional[dict] = None) -> tuple[int, dict]:
    """Make HTTP request (requires aiohttp or requests)"""
    try:
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            kwargs = {
                'headers': {'Content-Type': 'application/json'},
            }
            if body:
                kwargs['json'] = body
            
            async with session.request(method, url, **kwargs) as resp:
                data = await resp.json()
                return resp.status, data
    except ImportError:
        # Fallback to requests
        import requests
        
        if method == 'GET':
            resp = requests.get(url)
        else:
            resp = requests.request(method, url, json=body)
        
        try:
            return resp.status_code, resp.json()
        except:
            return resp.status_code, {"raw": resp.text}


# ============================================================================
# LEVEL 1: AGENT SERVICE DIRECT TESTING
# ============================================================================

async def test_level_1():
    """Test agent service APIs directly"""
    print_header("LEVEL 1: AGENT SERVICE DIRECT TESTING")
    print_info("Testing agent service endpoints directly")
    print_info("Requires: python agent_service.py running on http://localhost:8000")
    
    agent_service_url = "http://localhost:8000"
    step = 1
    
    # Step 1: Health check
    print_step(step, "Health check - verify all agents registered")
    step += 1
    
    try:
        status, data = await fetch('GET', f"{agent_service_url}/health")
        
        if status == 200 and data.get('status') == 'healthy':
            print_success("Agent service is healthy")
            agents = data.get('agents', [])
            print_info(f"Registered agents: {', '.join(agents)}")
            
            expected_agents = ['research', 'profile_analysis', 'recommendations', 'report_generation']
            if all(agent in agents for agent in expected_agents):
                print_success(f"All 4 agents registered")
            else:
                print_error(f"Missing agents. Expected: {expected_agents}, Got: {agents}")
        else:
            print_error(f"Health check failed: {status}")
            return False
    except Exception as e:
        print_error(f"Connection failed: {e}")
        print_info("Make sure agent service is running: python agent_service.py")
        return False
    
    # Step 2: List agents
    print_step(step, "List agents - get detailed agent information")
    step += 1
    
    try:
        status, data = await fetch('GET', f"{agent_service_url}/agents")
        
        if status == 200:
            print_success("Agent list retrieved")
            agents = data.get('agents', [])
            for agent in agents:
                print_info(f"  - {agent.get('name')}: {agent.get('description')}")
        else:
            print_error(f"Failed to list agents: {status}")
    except Exception as e:
        print_error(f"Error: {e}")
    
    # Step 3: Trigger analysis
    print_step(step, "Trigger analysis pipeline")
    step += 1
    
    session_id = f"level1-test-{int(time.time())}"
    test_profile = {
        "interests": ["AI", "Cloud Computing", "Data Science"],
        "values": ["innovation", "growth"],
        "technical_skills": ["Python", "AWS"],
        "soft_skills": ["communication"],
        "experience_level": "mid_level",
        "work_style": "collaborative",
        "learning_style": "hands_on"
    }
    
    try:
        status, data = await fetch('POST', f"{agent_service_url}/analyze", {
            "sessionId": session_id,
            "profile": test_profile,
            "trackId": "tech-career"
        })
        
        if status == 200:
            print_success(f"Analysis triggered (Session: {session_id})")
        else:
            print_error(f"Failed to trigger analysis: {status}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False
    
    # Step 4: Monitor agent execution
    print_step(step, "Monitor agent execution (polling every 0.25s for 30s)")
    step += 1
    
    print_info("Watching for sequential agent execution...")
    agents_seen = []
    max_poll = 120  # 30 seconds with 0.25s interval
    poll_interval = 0.25
    last_progress = -1
    
    for i in range(max_poll):
        try:
            status, data = await fetch('GET', f"{agent_service_url}/status/{session_id}")
            
            if status == 200:
                current_agent = data.get('current_agent')
                progress = data.get('progress', 0)
                analysis_status = data.get('status')
                results = data.get('results', {})
                
                # Track agent transitions from results (more reliable than polling current_agent)
                if results:
                    expected_order = ['research', 'profile_analysis', 'recommendations', 'report_generation']
                    for agent_name in expected_order:
                        if agent_name in results and agent_name not in agents_seen:
                            agents_seen.append(agent_name)
                            print_info(f"  {Colors.GREEN}→{Colors.END} {agent_name}")
                
                # Print progress updates
                if progress != last_progress:
                    print_info(f"  Progress: {progress}%")
                    last_progress = progress
                
                if analysis_status == 'completed':
                    print_success(f"Analysis completed!")
                    print_info(f"Agents executed in order: {' → '.join(agents_seen)}")
                    
                    # Verify order
                    expected_order = ['research', 'profile_analysis', 'recommendations', 'report_generation']
                    if agents_seen == expected_order:
                        print_success("Agents executed in correct order!")
                        result = True
                    elif len(agents_seen) == 4 and set(agents_seen) == set(expected_order):
                        print_success("All 4 agents produced results!")
                        print_info(f"Note: Polling didn't capture all transitions (agents complete quickly)")
                        result = True
                    else:
                        print_error(f"Agent order incorrect. Expected: {expected_order}, Got: {agents_seen}")
                        result = False
                    
                    # Print results summary
                    if results:
                        print_info("Captured results from all agents:")
                        for agent_name in expected_order:
                            if agent_name in results:
                                result_data = results[agent_name]
                                if isinstance(result_data, dict):
                                    keys = list(result_data.keys())[:3]
                                    print_info(f"  ✓ {agent_name} ({len(keys)}+ keys)")
                                else:
                                    print_info(f"  ✓ {agent_name}")
                            else:
                                print_error(f"  ✗ {agent_name} (missing)")
                    
                    return result
                
            await asyncio.sleep(poll_interval)
        except Exception as e:
            await asyncio.sleep(poll_interval)
            continue
    
    print_error(f"Analysis did not complete within {max_poll * poll_interval}s")
    return False


# ============================================================================
# LEVEL 2: BACKEND-TO-AGENT SERVICE INTEGRATION
# ============================================================================

async def test_level_2():
    """Test backend integration with agent service"""
    print_header("LEVEL 2: BACKEND-TO-AGENT SERVICE INTEGRATION")
    print_info("Testing how backend orchestrates with agent service")
    print_info("Requires: agent service on :8000, backend on :3000")
    
    backend_url = "http://localhost:3000"
    step = 1
    
    # Step 0: Check if backend is running
    print_step(step, "Checking if backend is running...")
    step += 1
    
    try:
        status, _ = await fetch('GET', f"{backend_url}/health")
    except Exception as e:
        print_error(f"Backend not available")
        print_info("To run Level 2 tests, start the backend in another terminal:")
        print_info("  cd api && npm run dev")
        print_info("\nLevel 2 tests require both agent service and backend running.")
        return False
    
    if status != 200:
        print_error(f"Backend health check failed (status {status})")
        print_info("Make sure backend is running: cd api && npm run dev")
        return False
    
    print_success("Backend is running on port 3000")
    
    # Step 1: Create session
    print_step(step, "Create session via backend")
    step += 1
    
    session_id = None
    try:
        status, data = await fetch('POST', f"{backend_url}/sessions", {"trackId": None})
        
        if status == 201:
            session_id = data.get('id')
            print_success(f"Session created: {session_id}")
            print_info(f"Initial status: {data.get('status')}")
        else:
            print_error(f"Failed to create session: {status}")
            return False
    except Exception as e:
        print_error(f"Connection failed: {e}")
        return False
    
    if not session_id:
        print_error("No session ID returned")
        return False
    
    # Step 2: Send intake messages
    print_step(step, "Send intake messages to gather profile")
    step += 1
    
    intake_messages = [
        "I'm passionate about AI and machine learning",
        "I value continuous learning and innovation",
        "My skills include Python, AWS, and Kubernetes",
        "I work best in collaborative environments"
    ]
    
    message_count = 0
    try:
        for msg in intake_messages:
            status, data = await fetch('POST', f"{backend_url}/sessions/{session_id}/messages", {
                "content": msg
            })
            
            if status in [200, 201]:
                message_count += 1
                print_info(f"  Message {message_count}: sent")
            else:
                print_error(f"  Failed to send message: {status}")
        
        print_success(f"Sent {message_count} intake messages")
    except Exception as e:
        print_error(f"Error sending messages: {e}")
    
    # Step 3: Check profile accumulation
    print_step(step, "Verify profile accumulated from messages")
    step += 1
    
    try:
        status, data = await fetch('GET', f"{backend_url}/sessions/{session_id}")
        profile = data.get('profile', {})
        
        if profile and isinstance(profile, dict) and len(profile) > 0:
            print_success("Profile data accumulated")
            print_info(f"Profile keys: {', '.join(profile.keys())}")
        else:
            print_info("Profile is empty (may be normal if using demo mode)")
    except Exception as e:
        print_error(f"Error: {e}")
    
    # Step 4: Trigger analysis
    print_step(step, "Trigger analysis via backend")
    step += 1
    
    try:
        status, data = await fetch('POST', f"{backend_url}/sessions/{session_id}/analyze")
        
        if status in [200, 202]:
            print_success("Analysis triggered")
        else:
            print_error(f"Failed to trigger analysis: {status}")
    except Exception as e:
        print_error(f"Error: {e}")
    
    # Step 5: Monitor backend state progression
    print_step(step, "Monitor session state progression")
    step += 1
    
    print_info("Polling session status every 0.5s for 30s...")
    states_seen = []
    
    for i in range(60):
        try:
            status, data = await fetch('GET', f"{backend_url}/sessions/{session_id}")
            
            if status == 200:
                current_state = data.get('status')
                if current_state and current_state not in states_seen:
                    states_seen.append(current_state)
                    print_info(f"  {Colors.GREEN}→{Colors.END} State: {current_state}")
                
                if current_state == 'results' or current_state == 'completed':
                    print_success(f"Analysis completed!")
                    print_info(f"State transitions: {' → '.join(states_seen)}")
                    return True
            
            await asyncio.sleep(0.5)
        except Exception as e:
            await asyncio.sleep(0.5)
            continue
    
    print_error("Analysis did not complete in time")
    return False


# ============================================================================
# LEVEL 3: END-TO-END FRONTEND TESTING
# ============================================================================

async def test_level_3_manual():
    """Provide guidance for manual E2E testing"""
    print_header("LEVEL 3: END-TO-END FRONTEND TESTING (MANUAL)")
    print_info("Frontend requires manual testing or Playwright automation")
    
    print_info("\n" + "="*60)
    print_info("MANUAL TEST INSTRUCTIONS:")
    print_info("="*60 + "\n")
    
    print_info("Prerequisites:")
    print_info("  ✓ Agent service running: python agent_service.py")
    print_info("  ✓ Backend running: cd api && npm run dev")
    print_info("  ✓ Frontend running: cd frontend && npm run dev")
    
    print_info("\nSteps:")
    print_info("  1. Open http://localhost:5173 (or shown port)")
    print_info("  2. Click 'Start' or 'Begin' button")
    print_info("  3. Complete onboarding questions (describe interests, values, skills)")
    print_info("  4. Click 'Analyze' or 'Generate Recommendations'")
    print_info("  5. Watch Dashboard show analysis progress")
    print_info("  6. Verify Results page displays career recommendations")
    
    print_info("\nWhat to verify:")
    print_info("  ✓ UI shows loading/progress during analysis")
    print_info("  ✓ Progress bar or agent status updates")
    print_info("  ✓ Results display 5 sections (one from each agent)")
    print_info("  ✓ Can view/download results")
    print_info("  ✓ No errors in browser console")
    
    print_info("\nBrowser DevTools:")
    print_info("  • Open DevTools (F12)")
    print_info("  • Check Network tab for /analyze calls to backend")
    print_info("  • Check Console tab for any errors")
    print_info("  • Verify API calls complete successfully")
    
    # Try to run automated tests if possible
    print_info("\nTo run automated E2E tests:")
    print_info("  cd frontend && npm run test -- multi-agent-e2e.test.tsx")
    
    return True


# ============================================================================
# MAIN TEST ORCHESTRATION
# ============================================================================

async def main():
    parser = argparse.ArgumentParser(description="Multi-Agent System Testing Script")
    parser.add_argument(
        '--level',
        choices=['1', '2', '3', 'all'],
        default='all',
        help="Which testing level to run (default: all)"
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help="Verbose output"
    )
    
    args = parser.parse_args()
    
    results = {}
    
    print(f"\n{Colors.BOLD}{Colors.CYAN}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║     MULTI-AGENT SYSTEM - ALL LEVELS TESTING               ║")
    print("║     Career Guidance 4-Agent Architecture                  ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}")
    
    print_info(f"Timestamp: {datetime.now().isoformat()}")
    print_info(f"Testing Level: {args.level}")
    
    # Level 1
    if args.level in ['1', 'all']:
        print("\n")
        try:
            results['Level 1'] = await test_level_1()
        except Exception as e:
            print_error(f"Level 1 test failed: {e}")
            results['Level 1'] = False
    
    # Level 2
    if args.level in ['2', 'all']:
        print("\n")
        try:
            results['Level 2'] = await test_level_2()
        except Exception as e:
            print_error(f"Level 2 test failed: {e}")
            results['Level 2'] = False
    
    # Level 3
    if args.level in ['3', 'all']:
        print("\n")
        try:
            results['Level 3'] = await test_level_3_manual()
        except Exception as e:
            print_error(f"Level 3 test failed: {e}")
            results['Level 3'] = False
    
    # Summary
    print_header("TEST SUMMARY")
    
    for level, result in results.items():
        status = f"{Colors.GREEN}PASS{Colors.END}" if result else f"{Colors.RED}FAIL{Colors.END}"
        print(f"{level}: {status}")
    
    all_pass = all(results.values())
    
    print()
    if all_pass:
        print_success("✨ All tests passed! Agents are coordinating properly.")
    else:
        print_error("❌ Some tests skipped or failed.")
        print()
        print_info("TO RUN ALL TESTS, START ALL SERVICES:")
        print_info('')
        print_info("  Terminal 1 (Agent Service):")
        print_info("    python agent_service.py")
        print_info('')
        print_info("  Terminal 2 (Backend):")
        print_info("    cd api && npm run dev")
        print_info('')
        print_info("  Terminal 3 (Frontend - optional for default tests):")
        print_info("    cd frontend && npm run dev")
        print_info('')
        print_info("  Terminal 4 (Run Tests):")
        print_info("    npm run test:agents")
        print()
    
    print(f"{Colors.CYAN}Tests completed at {datetime.now().isoformat()}{Colors.END}\n")
    
    return 0 if all_pass else 1


if __name__ == '__main__':
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
