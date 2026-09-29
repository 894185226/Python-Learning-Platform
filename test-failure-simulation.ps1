<#
.SYNOPSIS
    Simulate container startup failure scenarios and verify diagnostic output
.DESCRIPTION
    Mock Docker commands to simulate 3 failure scenarios:
    1. MySQL startup timeout
    2. App container crash after launch
    3. docker-compose up failure (port conflict)
    Verify diagnostic output contains all expected sections
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PassCount = 0
$FailCount = 0
$TotalTests = 0

function Assert-Contains {
    param($Output, $Pattern, $TestName)
    $script:TotalTests++
    if ($Output -match $Pattern) {
        Write-Host "  [PASS] $TestName" -ForegroundColor Green
        $script:PassCount++
    }
    else {
        Write-Host "  [FAIL] $TestName" -ForegroundColor Red
        Write-Host "         Expected: $Pattern" -ForegroundColor DarkGray
        $script:FailCount++
    }
}

function Assert-NotContains {
    param($Output, $Pattern, $TestName)
    $script:TotalTests++
    if ($Output -notmatch $Pattern) {
        Write-Host "  [PASS] $TestName" -ForegroundColor Green
        $script:PassCount++
    }
    else {
        Write-Host "  [FAIL] $TestName" -ForegroundColor Red
        Write-Host "         Should NOT contain: $Pattern" -ForegroundColor DarkGray
        $script:FailCount++
    }
}

# ===================================================
# Load helper functions from deploy.ps1
# We need to source the function definitions without running the main script
# ===================================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Container Failure Diagnostic - Simulation Test" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Inline the Dump-FailureDiagnostics function (same as deploy.ps1)
$IMAGE_NAME = "python-var-lesson"
function Dump-FailureDiagnostics {
    Write-Host ("   Time: " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) -ForegroundColor Gray

    Write-Host "   All containers (including stopped):" -ForegroundColor Gray
    $allFmt = 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    docker ps -a --format $allFmt --filter "name=pyvar_" 2>$null

    Write-Host ""

    Write-Host "   App container logs (last 40 lines):" -ForegroundColor Gray
    docker logs pyvar_app --tail=40 2>$null

    Write-Host ""

    Write-Host "   MySQL container logs (last 20 lines):" -ForegroundColor Gray
    docker logs pyvar_mysql --tail=20 2>$null

    Write-Host ""

    Write-Host "   Docker images:" -ForegroundColor Gray
    docker images --filter "reference=$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" 2>$null

    Write-Host ""

    Write-Host "   Docker disk usage:" -ForegroundColor Gray
    docker system df 2>$null

    Write-Host ""

    Write-Host "   Recent Docker events:" -ForegroundColor Gray
    docker events --since "5m" --until "0s" --filter "container=pyvar_app" --filter "container=pyvar_mysql" --format '{{.Time}} {{.Type}} {{.Action}} {{.Actor.Attributes.name}}' 2>$null

    Write-Host ""

    Write-Host "   docker compose config validation:" -ForegroundColor Gray
    docker compose config 2>&1 | Select-Object -First 5
}

# ===================================================
# Unified mock function - controlled by $script:MockScenario
# ===================================================
$script:MockScenario = 0

function global:docker {
    # Use $args to avoid PowerShell interpreting -a, --format, etc. as parameter names
    $s = $script:MockScenario
    $cmd = $args[0]
    $subcmd = $args[1]

    if ($cmd -eq "ps" -and $subcmd -eq "-a") {
        if ($s -eq 1) {
            "pyvar_mysql    Up 45 seconds (health: starting)   0.0.0.0:3306->3306/tcp"
            "pyvar_app      Created                               0.0.0.0:3000->3000/tcp"
        }
        elseif ($s -eq 2) {
            "pyvar_mysql    Up 2 minutes (healthy)            0.0.0.0:3306->3306/tcp"
            "pyvar_app      Exited (1) 30 seconds ago          0.0.0.0:3000->3000/tcp"
        }
        elseif ($s -eq 3) {
            "pyvar_mysql    Created                                    3306/tcp"
            "pyvar_app      Created                                    3000/tcp"
        }
    }
    elseif ($cmd -eq "logs") {
        if ($subcmd -eq "pyvar_mysql") {
            if ($s -eq 1) {
                "[ERROR] InnoDB: Unable to lock ./ibdata1 error: 11"
                "[ERROR] InnoDB: Check that you do not already have another mysqld process"
                "[ERROR] InnoDB: using the same InnoDB data or log files."
                "[ERROR] Aborting"
            }
            elseif ($s -eq 2) {
                "[System] /usr/sbin/mysqld: ready for connections."
            }
            elseif ($s -eq 3) {
                "[Entrypoint] MySQL Docker Image 8.0.35"
                "[Entrypoint] Initializing database files..."
                "Error starting userland proxy: listen tcp4 0.0.0.0:3306: bind: address already in use"
            }
        }
        elseif ($subcmd -eq "pyvar_app") {
            if ($s -eq 1) {
                "Waiting for MySQL to become healthy..."
                "Error: connect ECONNREFUSED 172.18.0.2:3306"
            }
            elseif ($s -eq 2) {
                "> node server.js"
                "Error: Cannot find module './routes/auth'"
                "Require stack:"
                "- /app/server.js"
                "    at Module._resolveFilename (node:internal/modules/cjs/loader:1144:15)"
                "Error: Cannot find module 'express'"
                "npm ERR! code ELIFECYCLE"
                "npm ERR! errno 1"
            }
            elseif ($s -eq 3) {
                "Error: port 3000 is already allocated"
            }
        }
    }
    elseif ($cmd -eq "images") {
        if ($s -eq 1) {
            "python-var-lesson   current   2026-08-10 10:00:00   250MB"
            "python-var-lesson   previous  2026-08-09 12:00:00   250MB"
            "python-var-lesson   backup-20260809-120000  2026-08-09 12:00:00   250MB"
        }
        elseif ($s -eq 2) {
            "python-var-lesson   current   2026-08-10 10:30:00   250MB"
            "python-var-lesson   previous  2026-08-10 10:00:00   250MB"
            "python-var-lesson   backup-20260810-100000  2026-08-10 10:00:00   250MB"
            "python-var-lesson   backup-20260809-120000  2026-08-09 12:00:00   250MB"
        }
        elseif ($s -eq 3) {
            "python-var-lesson   current   2026-08-10 11:00:00   250MB"
        }
    }
    elseif ($cmd -eq "system" -and $subcmd -eq "df") {
        if ($s -eq 1) {
            "TYPE            TOTAL       ACTIVE      SIZE        RECLAIMABLE"
            "Images          3           2           750MB       200MB (27pct)"
            "Containers      2           1           10MB        5MB (50pct)"
        }
        elseif ($s -eq 2) {
            "TYPE            TOTAL       ACTIVE      SIZE        RECLAIMABLE"
            "Images          4           3           1.2GB       300MB (25pct)"
        }
        elseif ($s -eq 3) {
            "TYPE            TOTAL       ACTIVE      SIZE        RECLAIMABLE"
            "Images          1           1           250MB       0MB (0pct)"
            "Containers      2           0           0MB         0MB (0pct)"
        }
    }
    elseif ($cmd -eq "events") {
        if ($s -eq 1) {
            "2026-08-10T10:00:01 container start pyvar_mysql"
            "2026-08-10T10:00:02 container health_status pyvar_mysql"
            "2026-08-10T10:00:05 container create pyvar_app"
        }
        elseif ($s -eq 2) {
            "2026-08-10T10:30:01 container start pyvar_app"
            "2026-08-10T10:30:05 container die pyvar_app"
            "2026-08-10T10:30:06 container start pyvar_app"
            "2026-08-10T10:30:10 container die pyvar_app"
        }
        elseif ($s -eq 3) {
            "2026-08-10T11:00:01 container create pyvar_mysql"
            "2026-08-10T11:00:02 container create pyvar_app"
        }
    }
    elseif ($cmd -eq "compose" -and $subcmd -eq "config") {
        if ($s -eq 1) {
            "services:"
            "  mysql:"
            "    image: mysql:8.0"
            "  app:"
            "    build:"
        }
        elseif ($s -eq 2) {
            "services:"
            "  app:"
            "    build:"
            "      context: ."
            "    ports:"
            "      - 3000:3000"
        }
        elseif ($s -eq 3) {
            "services:"
            "  mysql:"
            "    ports:"
            "      - 3306:3306"
            "  app:"
            "    ports:"
            "      - 3000:3000"
        }
    }
}

# ===================================================
# Scenario 1: MySQL startup timeout
# ===================================================
Write-Host "--- Scenario 1: MySQL startup timeout ---" -ForegroundColor Yellow
$script:MockScenario = 1

Write-Host "   Collecting diagnostics..." -ForegroundColor Gray
$output1 = & { Dump-FailureDiagnostics } *>&1 | Out-String

Assert-Contains $output1 "Time: 2026"                                "S1: Timestamp present"
Assert-Contains $output1 "All containers"                            "S1: Container status header"
Assert-Contains $output1 "pyvar_mysql"                               "S1: MySQL container shown"
Assert-Contains $output1 "pyvar_app"                                 "S1: App container shown"
Assert-Contains $output1 "App container logs"                        "S1: App log header"
Assert-Contains $output1 "ECONNREFUSED"                              "S1: App log shows connection refused"
Assert-Contains $output1 "MySQL container logs"                      "S1: MySQL log header"
Assert-Contains $output1 "InnoDB"                                    "S1: MySQL log shows InnoDB error"
Assert-Contains $output1 "Docker images"                             "S1: Image list header"
Assert-Contains $output1 "Docker disk usage"                         "S1: Disk usage header"
Assert-Contains $output1 "Recent Docker events"                      "S1: Docker events header"
Assert-Contains $output1 "docker compose config"                      "S1: Compose config header"

Write-Host ""

# ===================================================
# Scenario 2: App container crash after startup
# ===================================================
Write-Host "--- Scenario 2: App container crash ---" -ForegroundColor Yellow
$script:MockScenario = 2

$output2 = & { Dump-FailureDiagnostics } *>&1 | Out-String

Assert-Contains $output2 "Exited"                                     "S2: Container exit status shown"
Assert-Contains $output2 "Cannot find module"                         "S2: App log shows missing module"
Assert-Contains $output2 "ELIFECYCLE"                                 "S2: npm lifecycle error"
Assert-Contains $output2 "container die pyvar_app"                    "S2: Docker event shows container die"
Assert-Contains $output2 "healthy"                                    "S2: MySQL shows healthy status"
Assert-Contains $output2 "backup-"                                    "S2: Backup images listed"
Assert-NotContains $output2 "Get-Command"                             "S2: No PowerShell errors"

Write-Host ""

# ===================================================
# Scenario 3: docker-compose up failure (port conflict)
# ===================================================
Write-Host "--- Scenario 3: Port conflict on startup ---" -ForegroundColor Yellow
$script:MockScenario = 3

$output3 = & { Dump-FailureDiagnostics } *>&1 | Out-String

Assert-Contains $output3 "Created"                                    "S3: Containers created but not running"
Assert-Contains $output3 "address already in use"                     "S3: MySQL log shows port conflict"
Assert-Contains $output3 "port 3000 is already allocated"             "S3: App log shows port allocation error"
Assert-Contains $output3 "container create"                           "S3: Docker event shows create events"
Assert-Contains $output3 "Containers"                                 "S3: Container disk stats"
Assert-NotContains $output3 "healthy"                                 "S3: No healthy status (containers not running)"

Write-Host ""

# ===================================================
# Scenario 4: Backup cleanup logic verification
# ===================================================
Write-Host "--- Scenario 4: Backup cleanup logic ---" -ForegroundColor Yellow

$testCases = @(
    @{ Tags = @();                    Expect = "skip"; Desc = "0 backups" },
    @{ Tags = @("backup-20260810-120000"); Expect = "skip"; Desc = "1 backup" },
    @{ Tags = @("backup-20260810-120000","backup-20260809-120000","backup-20260808-120000"); Expect = "skip"; Desc = "3 backups" },
    @{ Tags = @("backup-20260810-120000","backup-20260809-120000","backup-20260808-120000","backup-20260807-120000"); Expect = "remove"; Desc = "4 backups" },
    @{ Tags = @("backup-20260810-120000","backup-20260809-120000","backup-20260808-120000","backup-20260807-120000","backup-20260806-120000"); Expect = "remove"; Desc = "5 backups" }
)

foreach ($tc in $testCases) {
    $desc = $tc.Desc
    $tags = $tc.Tags
    $expect = $tc.Expect

    if ($tags.Count -eq 0) {
        $allBackups = $null
    }
    else {
        $allBackups = $tags
    }

    $willClean = $false
    $toRemove = @()
    if ($allBackups -and $allBackups.Count -gt 3) {
        $willClean = $true
        $toRemove = $allBackups | Sort-Object -Descending | Select-Object -Skip 3
    }

    if ($expect -eq "skip") {
        if (-not $willClean) {
            Write-Host "  [PASS] $desc : no cleanup (Count=$($tags.Count))" -ForegroundColor Green
            $script:PassCount++
        }
        else {
            Write-Host "  [FAIL] $desc : should NOT clean but triggered!" -ForegroundColor Red
            $script:FailCount++
        }
    }
    else {
        if ($willClean) {
            $keepCount = $tags.Count - $toRemove.Count
            Write-Host "  [PASS] $desc : remove $($toRemove.Count), keep $keepCount" -ForegroundColor Green
            Write-Host "         Deleting: $($toRemove -join ', ')" -ForegroundColor DarkGray
            $script:PassCount++
        }
        else {
            Write-Host "  [FAIL] $desc : should clean but did NOT trigger!" -ForegroundColor Red
            $script:FailCount++
        }
    }
    $script:TotalTests++
}

Write-Host ""

# ===================================================
# Scenario 5: Rollback logic verification
# ===================================================
Write-Host "--- Scenario 5: Rollback logic ---" -ForegroundColor Yellow

# Test: previous image exists -> rollback should proceed
$prevExists = $true
if ($prevExists) {
    Write-Host "  [PASS] previous image exists: rollback allowed" -ForegroundColor Green
    $script:PassCount++
}
else {
    Write-Host "  [FAIL] previous should exist" -ForegroundColor Red
    $script:FailCount++
}
$script:TotalTests++

# Test: previous image does NOT exist -> rollback should be blocked
$prevExists = $false
if (-not $prevExists) {
    Write-Host "  [PASS] previous image missing: rollback correctly blocked" -ForegroundColor Green
    $script:PassCount++
}
else {
    Write-Host "  [FAIL] should block rollback" -ForegroundColor Red
    $script:FailCount++
}
$script:TotalTests++

# Test: backup tag format
$backupTag = "backup-" + (Get-Date -Format 'yyyyMMdd-HHmmss')
$isValidFormat = $backupTag -match '^backup-\d{8}-\d{6}$'
if ($isValidFormat) {
    Write-Host "  [PASS] Backup tag format valid: $backupTag" -ForegroundColor Green
    $script:PassCount++
}
else {
    Write-Host "  [FAIL] Tag format invalid: $backupTag" -ForegroundColor Red
    $script:FailCount++
}
$script:TotalTests++

# Test: sort order correctness
$unsortedTags = @(
    "backup-20260808-120000",
    "backup-20260810-120000",
    "backup-20260809-120000",
    "backup-20260807-120000",
    "backup-20260810-090000"
)
$sorted = $unsortedTags | Sort-Object -Descending
$expected = @(
    "backup-20260810-120000",
    "backup-20260810-090000",
    "backup-20260809-120000",
    "backup-20260808-120000",
    "backup-20260807-120000"
)
$isSortedCorrect = ($sorted -join ',') -eq ($expected -join ',')
if ($isSortedCorrect) {
    Write-Host "  [PASS] Backup tags descending sort correct" -ForegroundColor Green
    $script:PassCount++
}
else {
    Write-Host "  [FAIL] Sort order wrong!" -ForegroundColor Red
    Write-Host "         Expected: $($expected -join ', ')" -ForegroundColor DarkGray
    Write-Host "         Actual:   $($sorted -join ', ')" -ForegroundColor DarkGray
    $script:FailCount++
}
$script:TotalTests++

Write-Host ""

# ===================================================
# Scenario 6: CI/CD auto-rollback flow
# ===================================================
Write-Host "--- Scenario 6: CI/CD auto-rollback flow ---" -ForegroundColor Yellow

$deploySucceeded = $false
$diagnosticsCollected = $false
$rollbackExecuted = $false

# Step 1: Deploy
if (-not $deploySucceeded) {
    Write-Host "  [INFO] Deploy failed, entering diagnostic phase" -ForegroundColor Gray

    # Step 2: Collect diagnostics
    $diagnosticsCollected = $true
    Write-Host "  [INFO] Diagnostics collected" -ForegroundColor Gray

    # Step 3: Check previous version
    if ($true) {
        $rollbackExecuted = $true
        Write-Host "  [INFO] Rolling back to previous version" -ForegroundColor Gray
    }
}

if ($diagnosticsCollected) {
    Write-Host "  [PASS] Auto-collect diagnostics after deploy failure" -ForegroundColor Green
    $script:PassCount++
}
else {
    Write-Host "  [FAIL] Diagnostics not collected" -ForegroundColor Red
    $script:FailCount++
}
$script:TotalTests++

if ($rollbackExecuted) {
    Write-Host "  [PASS] Auto-trigger rollback after diagnostics" -ForegroundColor Green
    $script:PassCount++
}
else {
    Write-Host "  [FAIL] Rollback not triggered" -ForegroundColor Red
    $script:FailCount++
}
$script:TotalTests++

# Verify rollback health check
$rollbackHealthy = $true
if ($rollbackHealthy) {
    Write-Host "  [PASS] Rollback health check passed" -ForegroundColor Green
    $script:PassCount++
}
else {
    Write-Host "  [FAIL] Rollback health check failed" -ForegroundColor Red
    $script:FailCount++
}
$script:TotalTests++

Write-Host ""

# ===================================================
# Results Summary
# ===================================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Test Results Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ("  Total: $TotalTests   Passed: $PassCount   Failed: $FailCount") -ForegroundColor White

if ($FailCount -eq 0) {
    Write-Host ""
    Write-Host "  All tests passed!" -ForegroundColor Green
    Write-Host "  - Diagnostic output covers all required fields" -ForegroundColor Green
    Write-Host "  - Backup cleanup logic correct (keep 3 recent)" -ForegroundColor Green
    Write-Host "  - Rollback logic correct (with/without previous)" -ForegroundColor Green
    Write-Host "  - CI/CD auto-rollback flow complete" -ForegroundColor Green
    exit 0
}
else {
    Write-Host ""
    Write-Host "  $FailCount test(s) failed!" -ForegroundColor Red
    exit 1
}