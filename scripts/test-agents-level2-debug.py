#!/usr/bin/env python3
"""
Level 2 Diagnostic Test - Debug backend integration issues
Helps identify what's wrong when Level 2 tests aren't passing

Usage:
    python scripts/test-agents-level2-debug.py
    python scripts/test-agents-level2-debug.py --backend-port 3001
"""

import asyncio
import json
import sys
import argparse
from typing import Optional

# Color codes
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

async def fetch(method: str, url: str, body: Optional[dict] = None) -> tuple[int, dict]:
    """Make HTTP request"""
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            kwargs = {}
            if method != 'GET' and body is not None:
                kwargs['json'] = body
                kwargs['headers'] = {'Content-Type': 'application/json'}
            async with session.request(method, url, **kwargs) as resp:
                try:
                    data = await resp.json()
                except:
                    data = {"text": await resp.text()}
                return resp.status, data
    except ImportError:
        import requests
        if method == 'GET':
            resp = requests.get(url)
        else:
            resp = requests.request(method, url, json=body)
        try:
            return resp.status_code, resp.json()
        except:
            return resp.status_code, {"text": resp.text}

async def main():
    """Diagnostic test for Level 2"""
    # Parse arguments
    parser = argparse.ArgumentParser(description='Level 2 Diagnostic Test')
    parser.add_argument('--backend-port', type=int, default=3000, help='Backend port (default: 3000)')
    parser.add_argument('--agent-port', type=int, default=8000, help='Agent service port (default: 8000)')
    args = parser.parse_args()
    
    backend_url = f"http://localhost:{args.backend_port}"
    agent_url = f"http://localhost:{args.agent_port}"
    
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}LEVEL 2 DIAGNOSTIC TEST{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    # Step 1: Check backend
    print(f"{Colors.YELLOW}[1]{Colors.END} Checking if backend is running...")
    try:
        status, data = await fetch('GET', f"{backend_url}/health")
        if status == 200:
            print(f"{Colors.GREEN}✓{Colors.END} Backend responding on :3000")
        else:
            print(f"{Colors.RED}✗{Colors.END} Backend health check returned {status}")
            print(f"   Start backend with: cd api && npm run dev")
            return False
    except Exception as e:
        print(f"{Colors.RED}✗{Colors.END} Backend not reachable: {e}")
        print(f"   Start backend with: cd api && npm run dev")
        return False
    
    # Step 2: Check agent service
    print(f"\n{Colors.YELLOW}[2]{Colors.END} Checking if agent service is running...")
    try:
        status, data = await fetch('GET', f"{agent_url}/health")
        if status == 200:
            print(f"{Colors.GREEN}✓{Colors.END} Agent service responding on :8000")
        else:
            print(f"{Colors.RED}✗{Colors.END} Agent service health check returned {status}")
            print(f"   Start agent service with: python agent_service.py")
            return False
    except Exception as e:
        print(f"{Colors.RED}✗{Colors.END} Agent service not reachable: {e}")
        print(f"   Start agent service with: python agent_service.py")
        return False
    
    # Step 3: Create session
    print(f"\n{Colors.YELLOW}[3]{Colors.END} Creating session...")
    session_id = None
    try:
        status, data = await fetch('POST', f"{backend_url}/sessions", {})
        if status == 201:
            session_id = data.get('id')
            print(f"{Colors.GREEN}✓{Colors.END} Session created: {session_id}")
            print(f"   Status: {data.get('status')}")
            print(f"   Messages: {len(data.get('messages', []))}")
        else:
            print(f"{Colors.RED}✗{Colors.END} Failed to create session (status {status})")
            print(f"   Response: {json.dumps(data, indent=2)}")
            return False
    except Exception as e:
        print(f"{Colors.RED}✗{Colors.END} Error creating session: {e}")
        return False
    
    if not session_id:
        print(f"{Colors.RED}✗{Colors.END} No session ID returned")
        return False
    
    # Step 4: Send messages
    print(f"\n{Colors.YELLOW}[4]{Colors.END} Sending intake messages...")
    messages = [
        "I'm interested in AI and cloud computing",
        "I value innovation and continuous learning",
        "My skills include Python and AWS"
    ]
    
    for i, msg in enumerate(messages, 1):
        try:
            status, data = await fetch('POST', f"{backend_url}/sessions/{session_id}/messages", 
                                      {"content": msg})
            if status in [200, 201]:
                print(f"{Colors.GREEN}✓{Colors.END} Message {i} sent")
            else:
                print(f"{Colors.RED}✗{Colors.END} Failed to send message {i} (status {status})")
                print(f"   Response: {json.dumps(data, indent=2)}")
        except Exception as e:
            print(f"{Colors.RED}✗{Colors.END} Error sending message {i}: {e}")
    
    # Step 5: Trigger analysis
    print(f"\n{Colors.YELLOW}[5]{Colors.END} Triggering analysis...")
    try:
        status, data = await fetch('POST', f"{backend_url}/sessions/{session_id}/analyze", {})
        if status in [200, 202]:
            print(f"{Colors.GREEN}✓{Colors.END} Analysis triggered")
            print(f"   Response: {json.dumps(data, indent=2)}")
        else:
            print(f"{Colors.RED}✗{Colors.END} Failed to trigger analysis (status {status})")
            print(f"   Response: {json.dumps(data, indent=2)}")
            print(f"\n   Common issues:")
            print(f"   - Agent service not reachable from backend")
            print(f"   - Backend not calling agent service correctly")
            print(f"   - Profile data is malformed or empty")
            return False
    except Exception as e:
        print(f"{Colors.RED}✗{Colors.END} Error triggering analysis: {e}")
        return False
    
    # Step 6: Wait for completion
    print(f"\n{Colors.YELLOW}[6]{Colors.END} Waiting for analysis to complete (up to 30s)...")
    for attempt in range(60):
        try:
            status, data = await fetch('GET', f"{backend_url}/sessions/{session_id}")
            if status == 200:
                session_status = data.get('status')
                print(f"   Attempt {attempt+1}: Status = {session_status}")
                
                if session_status == 'complete':
                    print(f"{Colors.GREEN}✓{Colors.END} Analysis completed!")
                    # Show recommendations if available
                    recs = data.get('recommendations', [])
                    if recs:
                        print(f"   Recommendations received: {len(recs)} items")
                    return True
                elif session_status == 'error':
                    print(f"{Colors.RED}✗{Colors.END} Analysis failed with error status")
                    return False
            
            await asyncio.sleep(0.5)
        except Exception as e:
            await asyncio.sleep(0.5)
    
    print(f"{Colors.RED}✗{Colors.END} Analysis did not complete within 30 seconds")
    print(f"\n   Debugging:")
    print(f"   1. Check backend logs (terminal running 'cd api && npm run dev')")
    print(f"   2. Check agent service logs (terminal running 'python agent_service.py')")
    print(f"   3. Verify agent service is reachable from backend")
    print(f"   4. Check AGENT_SERVICE_URL in backend code")
    return False

if __name__ == '__main__':
    result = asyncio.run(main())
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}\n")
    exit_code = 0 if result else 1
    sys.exit(exit_code)
