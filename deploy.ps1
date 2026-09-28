﻿<#
.SYNOPSIS
    Python Basic Learning Platform - One-Click Deploy & Rollback
.DESCRIPTION
    Check environment, build image, start containers, verify health.
    Supports version tagging and one-click rollback to previous version.
.PARAMETER SkipHealthCheck
    Skip health check verification after deploy
.PARAMETER Rollback
    Rollback to the previous version immediately
.PARAMETER Verbose
    Show detailed debug output during deploy
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File deploy.ps1
    powershell -ExecutionPolicy Bypass -File deploy.ps1 -Rollback
    powershell -ExecutionPolicy Bypass -File deploy.ps1 -Verbose
#>

param(
    [switch]$SkipHealthCheck,
    [switch]$Rollback,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

# Image names for version management
$IMAGE_NAME = "python-var-lesson"
$TAG_CURRENT = "current"
$TAG_PREVIOUS = "previous"
$TAG_BACKUP_PREFIX = "backup-"

# Color output helpers
function Write-Step { param($T) Write-Host ("`n>> " + $T) -ForegroundColor Cyan }
function Write-OK { param($T) Write-Host ("   [OK] " + $T) -ForegroundColor Green }
function Write-Warn { param($T) Write-Host ("   [WARN] " + $T) -ForegroundColor Yellow }
function Write-Err { param($T) Write-Host ("   [ERROR] " + $T) -ForegroundColor Red }
function Write-Info { param($T) Write-Host ("   [INFO] " + $T) -ForegroundColor Gray }
function Write-DebugLog { param($T) if ($Verbose) { Write-Host ("   [DEBUG] " + $T) -ForegroundColor DarkGray } }

# ===================================================
# Rollback Mode
# ===================================================
if ($Rollback) {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Yellow
    Write-Host "  ROLLBACK - Restore Previous Version" -ForegroundColor Yellow
    Write-Host "===========================================" -ForegroundColor Yellow
    Write-Host ""

    $prevImage = $IMAGE_NAME + ":" + $TAG_PREVIOUS
    $prevExists = docker image inspect $prevImage 2>$null

    if (-not $prevExists) {
        Write-Err "No previous version found. Cannot rollback."
        Write-Host ""
        Write-Host "Available backup images:" -ForegroundColor Gray
        docker images --filter "reference=$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}"
        exit 1
    }

    Write-Host "   Previous version: $prevImage" -ForegroundColor Gray

    # Stop current containers
    Write-Host "   Stopping current containers..." -ForegroundColor Gray
    docker-compose down --remove-orphans 2>$null

    # Restore previous image as current
    $currentImage = $IMAGE_NAME + ":" + $TAG_CURRENT
    Write-Host "   Restoring previous version as current..." -ForegroundColor Gray
    docker tag $prevImage $currentImage 2>$null

    # Start containers
    Write-Host "   Starting with previous version..." -ForegroundColor Gray
    docker-compose up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Rollback failed: containers did not start"
        docker-compose logs --tail=30
        exit 1
    }

    # Quick health check
    Write-Host "   Verifying rollback..." -ForegroundColor Gray
    $fmt = '{{.State.Health.Status}}'
    $appReady = $false
    for ($i = 1; $i -le 30; $i++) {
        $status = docker inspect pyvar_app --format $fmt 2>$null
        if ($status.Trim() -eq "healthy") {
            Write-OK ("Rollback successful! App ready (" + $i + "s)")
            $appReady = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $appReady) {
        Write-Warn "Rollback completed but app health check timed out"
        Write-Host "   Check logs: docker-compose logs -f" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Yellow
    Write-Host "  Rollback Complete" -ForegroundColor Yellow
    Write-Host "===========================================" -ForegroundColor Yellow
    Write-Host "  Platform:  http://localhost:3000" -ForegroundColor White
    Write-Host ""

    exit 0
}

# ===================================================
# Deploy Mode - Banner
# ===================================================
Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "  Python Basic Learning Platform - Deploy" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
$now = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Write-Host ("  Start: " + $now) -ForegroundColor Gray
Write-Host ("  Rollback:  powershell -File deploy.ps1 -Rollback") -ForegroundColor Gray

# ===================================================
# Step 1: Environment Check
# ===================================================
Write-Step "1/7 Environment Check"

$dockerVersion = docker --version 2>$null
if (-not $dockerVersion) {
    Write-Err "Docker not found. Please install Docker Desktop first."
    Write-Host "   Download: https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
    exit 1
}
Write-OK ("Docker: " + $dockerVersion.Trim())

$dockerInfo = docker info 2>$null
if (-not $dockerInfo) {
    Write-Err "Docker is not running. Please start Docker Desktop."
    exit 1
}

# Extract Docker info details
$dockerServerVersion = ""
$dockerDriver = ""
$dockerMemTotal = ""
$dockerInfo | ForEach-Object {
    if ($_ -match "Server Version: (.+)") { $dockerServerVersion = $matches[1] }
    if ($_ -match "Storage Driver: (.+)") { $dockerDriver = $matches[1] }
}
Write-OK "Docker engine is running"
Write-DebugLog ("Server: " + $dockerServerVersion + " | Storage: " + $dockerDriver)

$composeVersion = docker-compose --version 2>$null
if (-not $composeVersion) {
    Write-Err "docker-compose not found"
    exit 1
}
Write-OK ("Docker Compose: " + $composeVersion.Trim())

# Check disk space
try {
    $drive = (Get-Location).Drive.Name
    $disk = Get-PSDrive -Name $drive
    $freeGB = [math]::Round($disk.Free / 1GB, 1)
    Write-OK ("Disk free: " + $freeGB + " GB")
    if ($freeGB -lt 2) {
        Write-Warn ("Low disk space (" + $freeGB + " GB). Deployment may fail.")
    }
}
catch {
    Write-DebugLog "Cannot check disk space"
}

# Check port availability
$port3000 = netstat -ano 2>$null | Select-String ":3000 " | Select-String "LISTENING"
$port3306 = netstat -ano 2>$null | Select-String ":3306 " | Select-String "LISTENING"
Write-DebugLog ("Port 3000: " + (if ($port3000) { "in use" } else { "free" }))
Write-DebugLog ("Port 3306: " + (if ($port3306) { "in use" } else { "free" }))

# ===================================================
# Step 2: Environment Config
# ===================================================
Write-Step "2/7 Environment Config"

$hasEnv = Test-Path ".env"
if (-not $hasEnv) {
    $hasTemplate = Test-Path ".env.docker"
    if ($hasTemplate) {
        Write-Warn ".env not found, creating from .env.docker template"
        Copy-Item ".env.docker" ".env" -ErrorAction Stop
        Write-OK ".env created. Please edit passwords then re-run."
        Write-Host "   Edit: notepad .env" -ForegroundColor Gray
        exit 0
    }
    else {
        Write-Err ".env and .env.docker not found"
        exit 1
    }
}

$envContent = Get-Content ".env" -Raw -ErrorAction Stop
$hasDefaultPwd = $envContent -match "change_me_root_password"
if ($hasDefaultPwd) {
    Write-Warn "Default password detected in .env, please change before deploy"
    Write-Host "   Edit: notepad .env" -ForegroundColor Gray
    $response = Read-Host "   Continue with default password? (y/N)"
    $isYes = ($response -eq "y") -or ($response -eq "Y")
    if (-not $isYes) {
        exit 0
    }
}

Write-OK "Environment config ready"

# ===================================================
# Step 3: Backup Current Version
# ===================================================
Write-Step "3/7 Backup Current Version"

$currentImage = $IMAGE_NAME + ":" + $TAG_CURRENT
$currentExists = docker image inspect $currentImage 2>$null

if ($currentExists) {
    # Tag current as previous
    $prevImage = $IMAGE_NAME + ":" + $TAG_PREVIOUS
    Write-Info "Backing up current version as previous..."
    docker tag $currentImage $prevImage 2>$null
    Write-OK ("Current version backed up: " + $prevImage)

    # Create timestamped backup (keep max 3)
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupTag = $TAG_BACKUP_PREFIX + $timestamp
    $backupImage = $IMAGE_NAME + ":" + $backupTag
    docker tag $currentImage $backupImage 2>$null
    Write-OK ("Timestamp backup created: " + $backupTag)

    # Cleanup old backups (keep only 3 most recent)
    $allBackups = docker images --format "{{.Tag}}" $IMAGE_NAME 2>$null | Where-Object { $_ -like "backup-*" }
    if ($allBackups -and $allBackups.Count -gt 3) {
        $toRemove = $allBackups | Sort-Object -Descending | Select-Object -Skip 3
        foreach ($tag in $toRemove) {
            Write-Info ("Removing old backup: " + $tag)
            docker rmi ($IMAGE_NAME + ":" + $tag) 2>$null
        }
    }
}
else {
    Write-Info "No existing version to backup (first deployment)"
}

# ===================================================
# Step 4: Build Image
# ===================================================
Write-Step "4/7 Build Docker Image"
Write-Host "   Building from source..." -ForegroundColor Gray

$buildStart = Get-Date
docker-compose build --parallel 2>&1 | ForEach-Object {
    $line = $_.ToString()
    if ($line -match "ERROR|FAIL") {
        Write-Host ("   " + $line) -ForegroundColor Red
    }
    elseif ($line -match "DONE|SUCCESS") {
        Write-Host ("   " + $line) -ForegroundColor Green
    }
    elseif ($Verbose) {
        Write-Host ("   " + $line) -ForegroundColor DarkGray
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Err "Image build failed"
    Write-Host ""
    Write-Host "--- Build Failure Diagnostics ---" -ForegroundColor Yellow
    Dump-FailureDiagnostics
    exit 1
}

$buildTime = [math]::Round(((Get-Date) - $buildStart).TotalSeconds, 1)
Write-OK ("Image built successfully (" + $buildTime + "s)")

# Tag the newly built image as current
$builtImage = $IMAGE_NAME + ":latest"
$builtExists = docker image inspect $builtImage 2>$null
if ($builtExists) {
    docker tag $builtImage $currentImage 2>$null
    Write-DebugLog "Tagged latest as current"
}

# ===================================================
# Step 5: Start Containers
# ===================================================
Write-Step "5/7 Start Containers"

Write-Host "   Stopping old containers..." -ForegroundColor Gray
docker-compose down --remove-orphans 2>$null

Write-Host "   Starting services..." -ForegroundColor Gray
$containerOutput = docker-compose up -d 2>&1
if ($Verbose) {
    $containerOutput | ForEach-Object { Write-Host ("   " + $_) -ForegroundColor DarkGray }
}

if ($LASTEXITCODE -ne 0) {
    Write-Err "Container startup failed"
    Write-Host ""
    Write-Host "--- Startup Failure Diagnostics ---" -ForegroundColor Yellow
    Dump-FailureDiagnostics
    Write-Host ""
    Write-Host "--- Rollback Instructions ---" -ForegroundColor Yellow
    Write-Host "   powershell -File deploy.ps1 -Rollback" -ForegroundColor White
    exit 1
}

Write-OK "Containers started"

# ===================================================
# Step 6: Health Check
# ===================================================
if ($SkipHealthCheck) {
    Write-Step "6/7 Health Check (skipped)"
}
else {
    Write-Step "6/7 Health Check"

    $fmt = '{{.State.Health.Status}}'

    # Wait for MySQL
    Write-Host "   Waiting for MySQL..." -ForegroundColor Gray
    $mysqlReady = $false
    $mysqlLastStatus = ""
    for ($i = 1; $i -le 30; $i++) {
        $status = docker inspect pyvar_mysql --format $fmt 2>$null
        $mysqlLastStatus = $status.Trim()
        if ($mysqlLastStatus -eq "healthy") {
            Write-OK ("MySQL ready (" + $i + "s)")
            $mysqlReady = $true
            break
        }
        if ($Verbose -and $mysqlLastStatus -and $mysqlLastStatus -ne "") {
            Write-Host ("`r   Waiting MySQL... " + $i + "s (status: " + $mysqlLastStatus + ")") -NoNewline -ForegroundColor Gray
        }
        else {
            Write-Host ("`r   Waiting MySQL... " + $i + "s") -NoNewline -ForegroundColor Gray
        }
        Start-Sleep -Seconds 1
    }
    if (-not $mysqlReady) {
        Write-Err ("MySQL startup timeout. Last status: " + $mysqlLastStatus)
        Write-Host ""
        Write-Host "--- MySQL Failure Diagnostics ---" -ForegroundColor Yellow
        Write-Host "   MySQL container logs:" -ForegroundColor Gray
        docker logs pyvar_mysql --tail=50 2>$null
        Write-Host ""
        Write-Host "   MySQL container inspect:" -ForegroundColor Gray
        docker inspect pyvar_mysql --format '{{json .State}}' 2>$null | ForEach-Object { Write-Host ("   " + $_) -ForegroundColor DarkGray }
        Write-Host ""
        Write-Host "--- Rollback Instructions ---" -ForegroundColor Yellow
        Write-Host "   powershell -File deploy.ps1 -Rollback" -ForegroundColor White
        exit 1
    }

    # Wait for App
    Write-Host "   Waiting for App..." -ForegroundColor Gray
    $appReady = $false
    $appLastStatus = ""
    for ($i = 1; $i -le 30; $i++) {
        $status = docker inspect pyvar_app --format $fmt 2>$null
        $appLastStatus = $status.Trim()
        if ($appLastStatus -eq "healthy") {
            Write-OK ("App ready (" + $i + "s)")
            $appReady = $true
            break
        }
        if ($Verbose -and $appLastStatus -and $appLastStatus -ne "") {
            Write-Host ("`r   Waiting App... " + $i + "s (status: " + $appLastStatus + ")") -NoNewline -ForegroundColor Gray
        }
        else {
            Write-Host ("`r   Waiting App... " + $i + "s") -NoNewline -ForegroundColor Gray
        }
        Start-Sleep -Seconds 1
    }
    if (-not $appReady) {
        Write-Err ("App startup timeout. Last status: " + $appLastStatus)
        Write-Host ""
        Write-Host "--- App Failure Diagnostics ---" -ForegroundColor Yellow
        Dump-FailureDiagnostics
        Write-Host ""
        Write-Host "--- Rollback Instructions ---" -ForegroundColor Yellow
        Write-Host "   powershell -File deploy.ps1 -Rollback" -ForegroundColor White
        exit 1
    }

    # HTTP check
    Write-Host "   Verifying HTTP..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-OK "HTTP health check: 200 OK"
        }
        else {
            Write-Warn ("HTTP status: " + $response.StatusCode)
        }
    }
    catch {
        Write-Warn ("HTTP check failed: " + $_.Exception.Message)
    }
}

# ===================================================
# Step 7: Summary
# ===================================================
$duration = [math]::Round(((Get-Date) - $StartTime).TotalSeconds, 1)

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "  Deploy Successful!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ("  Duration: " + $duration + "s") -ForegroundColor White
Write-Host ""

Write-Host "  --- Container Status ---" -ForegroundColor Cyan
$psFmt = 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker ps --format $psFmt --filter "name=pyvar_"

Write-Host ""
Write-Host "  --- Version Info ---" -ForegroundColor Cyan
docker images --filter "reference=$IMAGE_NAME" --format "table {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" 2>$null

Write-Host ""
Write-Host "  --- URLs ---" -ForegroundColor Cyan
Write-Host "  Platform:  http://localhost:3000" -ForegroundColor White
Write-Host "  Admin:     http://localhost:3000/admin.html" -ForegroundColor White
Write-Host "  Monitor:   http://localhost:3000/monitor.html" -ForegroundColor White

Write-Host ""
Write-Host "  --- Commands ---" -ForegroundColor Cyan
Write-Host "  Logs:     docker-compose logs -f" -ForegroundColor Gray
Write-Host "  Stop:     docker-compose down" -ForegroundColor Gray
Write-Host "  Restart:  docker-compose restart" -ForegroundColor Gray
Write-Host "  Rollback: powershell -File deploy.ps1 -Rollback" -ForegroundColor Gray
Write-Host "  Clean:    docker-compose down -v" -ForegroundColor Gray
Write-Host ""

# ===================================================
# Helper: Dump failure diagnostics
# ===================================================
function Dump-FailureDiagnostics {
    Write-Host ("   Time: " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) -ForegroundColor Gray

    # Container status (all, not just running)
    Write-Host "   All containers (including stopped):" -ForegroundColor Gray
    $allFmt = 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    docker ps -a --format $allFmt --filter "name=pyvar_" 2>$null

    Write-Host ""

    # App container logs
    Write-Host "   App container logs (last 40 lines):" -ForegroundColor Gray
    docker logs pyvar_app --tail=40 2>$null

    Write-Host ""

    # MySQL container logs
    Write-Host "   MySQL container logs (last 20 lines):" -ForegroundColor Gray
    docker logs pyvar_mysql --tail=20 2>$null

    Write-Host ""

    # Image info
    Write-Host "   Docker images:" -ForegroundColor Gray
    docker images --filter "reference=$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" 2>$null

    Write-Host ""

    # Resource usage
    Write-Host "   Docker disk usage:" -ForegroundColor Gray
    docker system df 2>$null

    Write-Host ""

    # Recent events
    Write-Host "   Recent Docker events:" -ForegroundColor Gray
    docker events --since "5m" --until "0s" --filter "container=pyvar_app" --filter "container=pyvar_mysql" --format '{{.Time}} {{.Type}} {{.Action}} {{.Actor.Attributes.name}}' 2>$null

    Write-Host ""

    # docker-compose config check
    Write-Host "   docker-compose config validation:" -ForegroundColor Gray
    docker-compose config 2>&1 | Select-Object -First 5
}