# ──────────────────────────────────────────────────────────────────────
# DH-2026 Demo Startup Script (PowerShell)
#
# One-command demo initialization for DiamondHacks judges
# Usage: .\demo-startup.ps1
#
# What it does:
#   1. Kills stale node/python processes on demo ports
#   2. Validates agent service health
#   3. Starts API + frontend in background
#   4. Opens browser with preloaded scenario
#   5. Prints startup checklist
# ──────────────────────────────────────────────────────────────────────

param(
    [string]$Scenario = "swe",  # Default to SWE scenario
    [switch]$SkipAgentCheck = $false,
    [switch]$NoOpenBrowser = $false
)

$ErrorActionPreference = "Stop"

function Print-Header {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  DH-2026 Demo Startup ($Scenario)                 ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
}

function Print-Step {
    param([string]$Message)
    Write-Host "▶ $Message" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Kill-StaleProcesses {
    Print-Step "Cleaning up stale processes..."
    
    # Kill node processes on ports 3001, 5173
    $nodePorts = @(3001, 5173)
    foreach ($port in $nodePorts) {
        $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
        if ($process) {
            $pid = $process.OwningProcess
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Print-Success "Killed process on port $port (PID: $pid)"
        }
    }
}

function Seed-DemoScenario {
    param([string]$Scenario)

    $scenarioFile = Join-Path $PSScriptRoot "data\demo-scenarios\$Scenario.json"
    if (-not (Test-Path $scenarioFile)) {
        Print-Warning "Scenario file not found: $scenarioFile"
        return $null
    }

    Print-Step "Seeding demo scenario '$Scenario'..."

    $scenarioObj = Get-Content $scenarioFile -Raw | ConvertFrom-Json

    $trackMap = @{
        "swe" = "tech-career"
        "datasci" = "tech-career"
        "designer" = "creative-industry"
        "pm" = "general"
    }

    $trackId = if ($trackMap.ContainsKey($Scenario)) { $trackMap[$Scenario] } else { "general" }

    # 1) Create session
    $createBody = @{ trackId = $trackId } | ConvertTo-Json
    $createRes = Invoke-RestMethod -Uri "http://localhost:3001/sessions" -Method Post -Body $createBody -ContentType "application/json"
    $sessionId = $createRes.id

    # 2) Send 12 intake answers based on scenario profile
    $profile = $scenarioObj.profile
    $messages = @(
        [string]$profile.interests,
        [string]$profile.values,
        [string]$profile.workingStyle,
        [string]$profile.hardSkills,
        [string]$profile.softSkills,
        [string]$profile.riskTolerance,
        "minimum salary $$($profile.salaryExpectations.minimum), target salary $$($profile.salaryExpectations.target)",
        [string]$profile.geographicPreference,
        [string]$profile.education,
        [string]$profile.timeline,
        [string]$profile.purposePriorities,
        [string]$profile.burnoutConcerns
    )

    foreach ($message in $messages) {
        $payload = @{ content = $message } | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:3001/sessions/$sessionId/messages" -Method Post -Body $payload -ContentType "application/json" | Out-Null
    }

    Print-Success "Scenario seeded: $($scenarioObj.name) (session: $sessionId)"
    return $sessionId
}

function Check-AgentHealth {
    if ($SkipAgentCheck) {
        Print-Warning "Agent health check skipped (--SkipAgentCheck)"
        return $true
    }
    
    Print-Step "Validating agent service health..."
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 3 -ErrorAction Stop
        $health = $response.Content | ConvertFrom-Json
        if ($health.status -eq "healthy") {
            Print-Success "Agent service is healthy"
            return $true
        } else {
            Print-Warning "Agent service returned status: $($health.status)"
            Print-Warning "System will use fallback recommendations if agent is unavailable"
            return $true
        }
    } catch {
        Print-Warning "Agent service not responding at http://localhost:8000"
        Print-Warning "Ensure: python agent_service.py is running in a separate terminal"
        Print-Warning "System will use fallback recommendations"
        return $true  # Allow startup anyway; fallback will handle it
    }
}

function Start-Services {
    Print-Step "Starting API service..."
    
    $apiProcess = Start-Process `
        -FilePath "npm" `
        -ArgumentList "run", "dev", "--workspace", "api" `
        -WorkingDirectory $PSScriptRoot `
        -PassThru `
        -NoNewWindow `
        -RedirectStandardOutput "$PSScriptRoot\.tmp-api.log" `
        -RedirectStandardError "$PSScriptRoot\.tmp-api-err.log"
    
    Print-Success "API service started (PID: $($apiProcess.Id))"
    
    # Give API time to boot
    Start-Sleep -Seconds 3
    
    # Verify API is responsive
    $maxRetries = 10
    $retries = 0
    while ($retries -lt $maxRetries) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Print-Success "API is ready (port 3001)"
                break
            }
        } catch {
            $retries++
            if ($retries -lt $maxRetries) {
                Start-Sleep -Seconds 1
            }
        }
    }
    
    if ($retries -ge $maxRetries) {
        Print-Warning "API health check timeout; proceeding anyway"
    }
    
    Print-Step "Starting frontend service..."
    
    $frontendProcess = Start-Process `
        -FilePath "npm" `
        -ArgumentList "run", "dev", "--workspace", "frontend" `
        -WorkingDirectory $PSScriptRoot `
        -PassThru `
        -NoNewWindow `
        -RedirectStandardOutput "$PSScriptRoot\.tmp-frontend.log" `
        -RedirectStandardError "$PSScriptRoot\.tmp-frontend-err.log"
    
    Print-Success "Frontend service started (PID: $($frontendProcess.Id))"
    
    # Give frontend time to boot
    Start-Sleep -Seconds 4
    
    # Verify frontend is responsive
    $maxRetries = 10
    $retries = 0
    while ($retries -lt $maxRetries) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Print-Success "Frontend is ready (port 5173)"
                break
            }
        } catch {
            $retries++
            if ($retries -lt $maxRetries) {
                Start-Sleep -Seconds 1
            }
        }
    }
    
    if ($retries -ge $maxRetries) {
        Print-Warning "Frontend health check timeout; proceeding anyway"
    }
    
    return @($apiProcess.Id, $frontendProcess.Id)
}

function Open-Browser {
    param(
        [string]$Scenario,
        [string]$SessionId
    )
    
    if ($NoOpenBrowser) {
        Print-Warning "Browser launch skipped (--NoOpenBrowser)"
        return
    }
    
    Print-Step "Opening browser with demo scenario..."

    $url = if ($SessionId) {
        "http://localhost:5173/onboarding?session=$SessionId"
    } else {
        "http://localhost:5173"
    }
    
    try {
        Start-Process msedge $url -ErrorAction SilentlyContinue
        Print-Success "Browser opened (Edge)"
    } catch {
        try {
            Start-Process chrome $url -ErrorAction SilentlyContinue
            Print-Success "Browser opened (Chrome)"
        } catch {
            try {
                Start-Process firefox $url -ErrorAction SilentlyContinue
                Print-Success "Browser opened (Firefox)"
            } catch {
                Print-Warning "Could not auto-open browser. Visit: $url"
            }
        }
    }
}

function Print-Checklist {
    param([string]$SessionId)

    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  Demo Readiness Checklist                                  ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green
    
    Write-Host "Pre-Demo (verify these before judges arrive):" -ForegroundColor Yellow
    Write-Host "  [✓] Agent service running: python agent_service.py"
    Write-Host "  [✓] Demo script activated: .\demo-startup.ps1"
    Write-Host "  [✓] Browser loaded at http://localhost:5173"
    Write-Host "  [✓] Scenario preloaded: $Scenario"
    Write-Host "  [✓] API responding: http://localhost:3001/health"
    if ($SessionId) {
        Write-Host "  [✓] Preloaded session: $SessionId"
    }
    
    Write-Host "`nDuring Demo (3-minute flow):" -ForegroundColor Yellow
    Write-Host "  1. Judge clicks 'Start Assessment' (preloaded scenario)"
    Write-Host "  2. Optionally show 1-2 questions to highlight intake validation"
    Write-Host "  3. Click 'Analyze' → watch SSE progress stream"
    Write-Host "  4. Results page → read top 3 recommendations"
    Write-Host "  5. Export: PDF download or copy-to-clipboard"
    
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "  • If API fails to start, check: npm install in root"
    Write-Host "  • If agent service unavailable, system uses fallback recommendations"
    Write-Host "  • If browser doesn't open, visit http://localhost:5173 manually"
    Write-Host "  • Logs available in: .tmp-api.log, .tmp-frontend.log"
    
    Write-Host "`nLog files (for debugging):" -ForegroundColor Yellow
    Write-Host "  • API:      $PSScriptRoot\.tmp-api.log"
    Write-Host "  • Frontend: $PSScriptRoot\.tmp-frontend.log"
    Write-Host "  • Agent:    (separate terminal running agent_service.py)`n"
}

# ──────────────────────────────────────────────────────────────────────
# Main execution
# ──────────────────────────────────────────────────────────────────────

Print-Header

try {
    Kill-StaleProcesses
    Check-AgentHealth
    $processIds = Start-Services
    $sessionId = Seed-DemoScenario -Scenario $Scenario
    Open-Browser -Scenario $Scenario -SessionId $sessionId
    Print-Checklist -SessionId $sessionId
    
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  Demo is READY! Press Ctrl+C to stop services             ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green
    
    # Keep script running until user interrupts
    while ($true) {
        Start-Sleep -Seconds 10
    }
    
} catch {
    Print-Error "Startup failed: $_"
    exit 1
}
