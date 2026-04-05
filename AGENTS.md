# Multi-Agent Career Guidance System

This system uses **4 specialized agents** with uAgents (fetch.ai) and browser-use to provide comprehensive career guidance. Each agent handles a specific phase of the analysis pipeline.

## The 4 Agents

### 1. **Research Agent**
- **Purpose**: Researches job market trends, companies, and career opportunities
- **Capabilities**:
  - Market trend analysis
  - Salary range research
  - Top company identification
  - Industry certification mapping
  - Job posting analysis (using browser-use for web scraping)

### 2. **Profile Analysis Agent**
- **Purpose**: Analyzes user profile to identify strengths, patterns, and growth areas
- **Capabilities**:
  - Interest analysis
  - Value mapping
  - Skill assessment
  - Personality trait evaluation
  - Growth opportunity identification
  - Diversity scoring of interests

### 3. **Recommendations Agent**
- **Purpose**: Generates tailored career recommendations based on profile and research
- **Capabilities**:
  - Career path ranking
  - Salary expectations
  - Next step planning
  - Learning resource curation
  - Timeline development
  - Alignment scoring
  - Profile completeness checking
  - Recommendation validity assessment
  - Market data verification
  - Consistency validation
  - Quality assurance checks
  - Flag generation for anomalies

### 4. **Report Generation Agent**
- **Purpose**: Creates comprehensive, formatted career guidance reports
- **Capabilities**:
  - Multi-section report generation
  - Executive summaries
  - Action plan creation
  - Timeline generation
  - Multi-format output (PDF, JSON, CSV)
  - Follow-up recommendations

## Architecture

```
┌─────────────────────────────────────┐
│   Frontend (React/TypeScript)       │
│   Session & UI Management           │
└────────────────┬────────────────────┘
                 │
┌────────────────▼─────────────────────┐
│   Backend API (Fastify/TypeScript)   │
│   Session Routes & Orchestration     │
└────────────────┬─────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│   Multi-Agent Service (Python/FastAPI)      │
│                                              │
│  ┌─────┐ ┌────────┐ ┌──────────┐           │
│  │ 1   │ │   2    │ │    3     │           │
│  │Res. │→│Profile │→│Recommend │           │
│  │     │ │Analysis│ │         │           │
│  └─────┘ └────────┘ └──────────┘           │
│             ↓                                │
│        ┌──────────┐                         │
│        │    4     │                         │
│        │Report Gen│                         │
│        │         │                          │
│        └──────────┘                         │
│                                              │
│  + browser-use for web automation          │
│  + uagents for agent orchestration         │
│  + LLM integration (OpenAI/Anthropic)      │
└─────────────────────────────────────────────┘
```

## Setup & Running

### Prerequisites
```bash
python3.10+
node.js 18+
pip
npm
```

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Install Playwright (for browser automation)
```bash
playwright install
```

### 3. Set Environment Variables
```bash
# Agent Service
export AGENT_SERVICE_URL=http://localhost:8000
export AGENT_PORT=8000

# Agentverse bridge (local uAgents -> Agentverse)
export ENABLE_AGENTVERSE_LINK=true
export AGENTVERSE_MAILBOX_ENABLED=true
export AGENTVERSE_NETWORK=mainnet
export AGENTVERSE_BASE_SEED=replace-with-a-unique-seed-prefix
export AGENTVERSE_BASE_PORT=8100
export AGENTVERSE_BUREAU_PORT=8300
export AGENTVERSE_ENDPOINT_HOST=127.0.0.1
export AGENTVERSE_ENABLE_CHAT_PROTOCOL=true
export AGENTVERSE_USE_BUREAU=false

# LLM Providers (optional, for advanced features)
export OPENAI_API_KEY=sk_...
export BROWSER_USE_API_KEY=bu_...
```

Optional: override deterministic seeds per role (otherwise they are derived from `AGENTVERSE_BASE_SEED`):

```bash
export AGENTVERSE_SEED_RESEARCH=...
export AGENTVERSE_SEED_PROFILE_ANALYSIS=...
export AGENTVERSE_SEED_RECOMMENDATIONS=...
export AGENTVERSE_SEED_REPORT_GENERATION=...
```

### 4. Start Agent Service
```bash
python agent_service.py
```

The service will start on `http://localhost:8000` and automatically initialize all 4 agents.

When `ENABLE_AGENTVERSE_LINK=true`, the same process also starts 4 local uAgents (one per role) and links them to Agentverse via mailbox mode.

### 4.1 Connect each local agent in Agentverse Inspector

After startup, check logs for each role agent's inspector URL (`https://agentverse.ai/inspect/?uri=...&address=...`).

1. Open each inspector URL.
2. Click **Connect**.
3. Select **Mailbox**.
4. Click **Finish**.

Once connected, each role agent is discoverable as an active local Agentverse-linked agent while the process is running.

Each role agent also publishes an Agent Chat Protocol manifest (when `AGENTVERSE_ENABLE_CHAT_PROTOCOL=true`) so it can be queried via standard chat-protocol flows and ASI-compatible tooling.

`AGENTVERSE_USE_BUREAU=false` runs each role agent on its own localhost port (recommended for Inspector). Set it to `true` only if you explicitly want Bureau multiplexing.

### 5. Run Backend API
```bash
cd api
npm install
npm run build
npm run dev
```

### 6. Run Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Agent Service Endpoints

**Health Check**
```http
GET /health
Response: { "status": "healthy", "agents": ["research", "profile_analysis", ...] }
```

**Start Analysis**
```http
POST /analyze
Body: { "sessionId": "...", "profile": {...}, "trackId": "..." }
Response: { "success": true, "status": "in_progress" }
```

**Get Status**
```http
GET /status/{sessionId}
Response: { "status": "completed", "progress": 100, "results": {...} }
```

**List Agents**
```http
GET /agents
Response: { "total_agents": 4, "agents": [...] }
```

### Backend API Endpoints (Using Agents)

**Create Session**
```http
POST /sessions
Response: { "id": "...", "status": "intake", "messages": [...] }
```

**Send Message (Intake Phase)**
```http
POST /sessions/{sessionId}/messages
Body: { "content": "..." }
Response: { "id": "...", "sessionId": "...", "messages": [...] }
```

**Start Analysis (Triggers All 4 Agents)**
```http
POST /sessions/{sessionId}/analyze
Response: { "status": "intake→analysis", "message": "Analysis started" }
```

**Get Results**
```http
GET /sessions/{sessionId}/results
Response: { "recommendations": [...], "profile": {...}, "report": {...} }
```

## Workflow Example

1. **User Intake** (Frontend)
   - User answers career questions

2. **Profile Creation** (Backend)
   - Session stores user responses

3. **Agent Pipeline** (All 4 Agents)
   ```
   Research Agent
   ├─ Analyzes job market, salaries, companies
   └─ Returns market data
   
   Profile Analysis Agent
   ├─ Identifies patterns in interests/values
   └─ Returns analysis
   
   Recommendations Agent
   ├─ Generates career paths
  ├─ Validates recommendation consistency
   └─ Returns recommendations
   
   Report Generation Agent
   ├─ Combines all results
   └─ Returns formatted report
   ```

4. **Results Delivery** (Backend + Frontend)
   - Display recommendations
   - Show career paths
   - Provide action plan

## Configuration

### Adding Browser Automation

To use browser-use for web scraping (e.g., job posting analysis):

```python
from browser_use_sdk import Agent as BrowserAgent

async def research_jobs():
    agent = BrowserAgent(api_key=os.getenv("BROWSER_USE_API_KEY"))
    
    result = await agent.run(
        task="Search for Python developer jobs on LinkedIn in San Francisco"
    )
    return result
```

### Integrating with LLMs

Currently agents use rule-based recommendations. To add LLM capability:

```python
from langchain.llms import OpenAI

llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# In any agent
response = await llm.apredict(
    "Generate career recommendations based on: {profile}"
)
```

## Monitoring & Debugging

### Enable Debug Logging
```bash
export LOG_LEVEL=DEBUG
python agent_service.py
```

### Monitor Agent Status
```bash
curl http://localhost:8000/agents
```

### Check Session Progress
```bash
curl http://localhost:8000/status/{sessionId}
```

## Performance Notes

- **Sequential Execution**: Agents run in sequence for now (Research → Analysis → Rec.+Validation → Report)
- **Future Enhancement**: Parallel execution with uAgent messaging protocol
- **Caching**: Results are cached in-memory (production should use Redis)
- **Timeout**: Requests timeout after 10 seconds

## Troubleshooting

### Agent Service Not Responding
```bash
# Check if service is running
curl http://localhost:8000/health

# View logs
tail -f agent_service.log

# Restart service
pkill -f agent_service
python agent_service.py
```

### Browser Automation Issues
```bash
# Reinstall Playwright browsers
playwright install --with-deps
```

### LLM Integration Errors
- Verify API keys are set: `echo $OPENAI_API_KEY`
- Check API key format (OpenAI keys start with `sk_`)
- Check quota and rate limits in provider console

## Future Enhancements

1. **Parallel Agent Execution** using uAgent messaging protocol
2. **Real-time Progress Streaming** with WebSockets
3. **Web Scraping** with browser-use for live job data
4. **AI-Powered Recommendations** with Claude/GPT-4
5. **Persistent State** with Redis/PostgreSQL
6. **Agent Learning** from user feedback
7. **Custom Agent Chains** for specialized tracks
8. **Integration** with ATS systems and job boards

## Resources

- [uAgents Documentation](https://fetch.ai/docs)
- [Browser Use Documentation](https://docs.browser-use.com)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [LangChain Documentation](https://docs.langchain.com)
