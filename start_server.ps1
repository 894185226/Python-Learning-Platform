# Python Variable Adventure - Start Server
# Usage: Right-click -> Run with PowerShell
# Or: powershell -ExecutionPolicy Bypass -File start_server.ps1

Set-Location $PSScriptRoot

Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Python Variable Adventure" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

# Check Node.js
Write-Host "[1/3] Checking Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = & node --version 2>&1
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "Please run setup_server.bat first to install the environment." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check MySQL
Write-Host "[2/3] Checking MySQL..." -ForegroundColor Cyan
$mysqlOk = $false
try {
    $null = & mysql -u root -e "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) { $mysqlOk = $true }
} catch { }

if (-not $mysqlOk) {
    Write-Host "[WARN] MySQL is not running. Attempting to start..." -ForegroundColor Yellow
    $services = @("MySQL97", "MySQL90", "MySQL84", "MySQL80", "MySQL", "MySQL57")
    foreach ($svc in $services) {
        $svcStatus = & sc query $svc 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Starting $svc..." -ForegroundColor Yellow
            & net start $svc 2>&1 | Out-Null
            Start-Sleep -Seconds 3
            $null = & mysql -u root -e "SELECT 1" 2>&1
            if ($LASTEXITCODE -eq 0) { $mysqlOk = $true; break }
        }
    }
}

if ($mysqlOk) {
    Write-Host "[OK] MySQL is running" -ForegroundColor Green
} else {
    Write-Host "[WARN] Could not start MySQL." -ForegroundColor Yellow
    Write-Host "The website needs MySQL to save student data." -ForegroundColor Yellow
    Write-Host "Please run setup_server.bat first to configure MySQL." -ForegroundColor Yellow
}

# Check port 3000
Write-Host "[3/3] Starting web server..." -ForegroundColor Cyan
$portInUse = & netstat -ano 2>$null | Select-String ":3000 .*LISTENING"
if ($portInUse) {
    Write-Host "[INFO] Port 3000 is in use, freeing..." -ForegroundColor Yellow
    $portInUse | ForEach-Object {
        $pid = ($_ -split '\s+')[-1]
        & taskkill /f /pid $pid 2>$null | Out-Null
    }
    Start-Sleep -Seconds 2
    Write-Host "[OK] Port 3000 freed" -ForegroundColor Green
}

# Detect LAN IP
$lanIP = $null
$ipConfig = & ipconfig 2>$null
$ipConfig | Select-String "IPv4" | ForEach-Object {
    $ip = ($_ -replace '.*:\s*', '').Trim()
    if ($ip -ne "127.0.0.1" -and -not $lanIP) { $lanIP = $ip }
}

# Configure firewall
Write-Host "[INFO] Configuring Windows Firewall..." -ForegroundColor Cyan
$fwResult = & netsh advfirewall firewall add rule name="Python Learning Platform (Port 3000)" dir=in action=allow protocol=TCP localport=3000 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Firewall rule may already exist" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Firewall rule added for port 3000" -ForegroundColor Green
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Python Variable Adventure" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Teacher (this machine):" -ForegroundColor White
Write-Host "    http://localhost:3000" -ForegroundColor Cyan
Write-Host "    http://localhost:3000/admin.html" -ForegroundColor Cyan
Write-Host ""
if ($lanIP) {
    Write-Host "  Students (LAN - share this address):" -ForegroundColor White
    Write-Host "    http://${lanIP}:3000" -ForegroundColor Cyan
    Write-Host ""
}
Write-Host "  Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

# Open browser
Write-Host "Starting server, opening browser..." -ForegroundColor Cyan
if ($lanIP) {
    Start-Process "http://${lanIP}:3000"
} else {
    Start-Process "http://localhost:3000"
}

# Run server
Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
node server.js

Write-Host ""
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "[Server stopped] Exit code: $LASTEXITCODE" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow
Read-Host "Press Enter to exit"