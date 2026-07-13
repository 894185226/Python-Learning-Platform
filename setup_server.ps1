# Python Variable Adventure - One-Click Setup
# This script installs and configures all required software.
# Run via: setup_server.bat (double-click)

param()

Set-Location $PSScriptRoot

# ============================================================
# Request admin privileges
# ============================================================
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "==============================================" -ForegroundColor Yellow
    Write-Host "  Requesting administrator privileges..." -ForegroundColor Yellow
    Write-Host "==============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please click [Yes] in the UAC dialog that appears." -ForegroundColor White
    Write-Host ""
    Start-Sleep -Seconds 1
    try {
        Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs -WorkingDirectory $PSScriptRoot
        exit 0
    } catch {
        Write-Host "[ERROR] Failed to elevate." -ForegroundColor Red
        Write-Host "Please manually run as Administrator:" -ForegroundColor Yellow
        Write-Host "  Right-click setup_server.bat -> Run as administrator" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Python Variable Adventure - One-Click Setup" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "This script will:" -ForegroundColor White
Write-Host "  1. Install Node.js (if needed)" -ForegroundColor White
Write-Host "  2. Install npm dependencies" -ForegroundColor White
Write-Host "  3. Install MySQL (if needed)" -ForegroundColor White
Write-Host "  4. Configure MySQL" -ForegroundColor White
Write-Host "  5. Initialize database" -ForegroundColor White
Write-Host "  6. Start web server at http://localhost:3000" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

# ============================================================
# Helper: Refresh PATH from registry
# ============================================================
function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# ============================================================
# Phase 1: Check/Install Node.js
# ============================================================
Write-Host "[Phase 1/6] Checking Node.js..." -ForegroundColor Cyan

$nodeOk = $false
try {
    $nodeVersion = & node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $nodeOk = $true
        Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
    }
} catch { }

if (-not $nodeOk) {
    # Try common install paths
    $nodePaths = @(
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe",
        "$env:ProgramFiles\nodejs\node.exe"
    )
    foreach ($p in $nodePaths) {
        if (Test-Path $p) {
            $env:Path = (Split-Path $p) + ";" + $env:Path
            $nodeOk = $true
            Write-Host "[OK] Found at: $(Split-Path $p)" -ForegroundColor Green
            break
        }
    }
}

if (-not $nodeOk) {
    # Try winget
    Write-Host "[INFO] Node.js not found. Trying winget install..." -ForegroundColor Yellow
    try {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            winget install OpenJS.NodeJS --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
        }
        Start-Sleep -Seconds 5
        Refresh-Path
        
        foreach ($p in $nodePaths) {
            if (Test-Path $p) {
                $env:Path = (Split-Path $p) + ";" + $env:Path
                $nodeOk = $true
                Write-Host "[OK] Installed at: $(Split-Path $p)" -ForegroundColor Green
                break
            }
        }
    } catch {
        Write-Host "[WARN] winget install failed" -ForegroundColor Yellow
    }
}

if (-not $nodeOk) {
    # Try PowerShell download
    Write-Host "[INFO] Downloading Node.js via PowerShell..." -ForegroundColor Yellow
    try {
        $installer = "$env:TEMP\nodejs_installer.msi"
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi" -OutFile $installer -ErrorAction Stop
        Start-Process msiexec.exe -ArgumentList "/i `"$installer`" /quiet /norestart" -Wait
        Remove-Item $installer -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Refresh-Path
    } catch {
        Write-Host "[WARN] Download failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    foreach ($p in $nodePaths) {
        if (Test-Path $p) {
            $env:Path = (Split-Path $p) + ";" + $env:Path
            $nodeOk = $true
            Write-Host "[OK] Installed at: $(Split-Path $p)" -ForegroundColor Green
            break
        }
    }
}

if (-not $nodeOk) {
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Red
    Write-Host "[ERROR] Failed to install Node.js!" -ForegroundColor Red
    Write-Host "==============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please manually install from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "After install, run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Verify
try {
    $v = & node --version 2>&1
    Write-Host "[OK] Node.js: $v" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is installed but not accessible in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# ============================================================
# Phase 2: Install npm dependencies
# ============================================================
Write-Host "[Phase 2/6] Installing npm dependencies..." -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "[OK] Dependencies already present" -ForegroundColor Green
} else {
    try {
        npm install 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[INFO] Trying mirror registry..." -ForegroundColor Yellow
            npm install --registry=https://registry.npmmirror.com 2>&1 | Out-Null
        }
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed"
        }
        Write-Host "[OK] Dependencies installed" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "==============================================" -ForegroundColor Red
        Write-Host "[ERROR] npm install failed!" -ForegroundColor Red
        Write-Host "==============================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please try these steps manually:" -ForegroundColor Yellow
        Write-Host "  1. Open Command Prompt as Administrator" -ForegroundColor Yellow
        Write-Host "  2. Navigate to this folder: cd /d `"$PSScriptRoot`"" -ForegroundColor Yellow
        Write-Host "  3. Run: npm install --registry=https://registry.npmmirror.com" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# ============================================================
# Phase 3: Check/Install MySQL
# ============================================================
Write-Host "[Phase 3/6] Checking MySQL..." -ForegroundColor Cyan

$mysqlBin = $null
$mysqlOk = $false

try {
    $null = & mysql --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $mysqlBin = (Get-Command mysql).Source | Split-Path
        $mysqlOk = $true
        Write-Host "[OK] MySQL found in PATH: $mysqlBin" -ForegroundColor Green
    }
} catch { }

if (-not $mysqlOk) {
    $mysqlPaths = @(
        "C:\Program Files\MySQL\MySQL Server 9.7\bin",
        "C:\Program Files\MySQL\MySQL Server 9.0\bin",
        "C:\Program Files\MySQL\MySQL Server 8.4\bin",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin",
        "C:\Program Files\MySQL\MySQL Server 5.7\bin",
        "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin",
        "C:\Program Files (x86)\MySQL\MySQL Server 5.7\bin"
    )
    foreach ($p in $mysqlPaths) {
        if (Test-Path "$p\mysql.exe") {
            $mysqlBin = $p
            $env:Path = "$p;$env:Path"
            $mysqlOk = $true
            Write-Host "[OK] Found at: $p" -ForegroundColor Green
            break
        }
    }
}

if (-not $mysqlOk) {
    Write-Host "[INFO] MySQL not found. Trying winget install..." -ForegroundColor Yellow
    try {
        winget install Oracle.MySQL --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
        Start-Sleep -Seconds 5
        Refresh-Path
        
        foreach ($p in $mysqlPaths) {
            if (Test-Path "$p\mysql.exe") {
                $mysqlBin = $p
                $env:Path = "$p;$env:Path"
                $mysqlOk = $true
                Write-Host "[OK] Installed at: $p" -ForegroundColor Green
                break
            }
        }
    } catch {
        Write-Host "[WARN] winget install failed" -ForegroundColor Yellow
    }
}

if (-not $mysqlOk) {
    Write-Host "[WARN] MySQL not found and winget not available" -ForegroundColor Yellow
    Write-Host "[INFO] Attempting to continue without MySQL installation..." -ForegroundColor Yellow
    Write-Host "[INFO] server.js will create database if MySQL is running" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================
# Phase 4: Configure MySQL
# ============================================================
if ($mysqlOk) {
    Write-Host "[Phase 4/6] Configuring MySQL..." -ForegroundColor Cyan
    
    # Find mysqld
    $mysqld = $null
    if ($mysqlBin) {
        if (Test-Path "$mysqlBin\mysqld.exe") {
            $mysqld = "$mysqlBin\mysqld.exe"
        } else {
            $parent = Split-Path $mysqlBin -Parent
            if (Test-Path "$parent\bin\mysqld.exe") {
                $mysqld = "$parent\bin\mysqld.exe"
            }
        }
    }
    
    if ($mysqld) {
        Write-Host "[INFO] mysqld found: $mysqld" -ForegroundColor White
        
        # Find data directory
        $dataDir = $null
        $dataPaths = @()
        Get-ChildItem "C:\ProgramData\MySQL" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            if (Test-Path "$($_.FullName)\Data\mysql") {
                $dataPaths += "$($_.FullName)\Data"
            }
        }
        if ($dataPaths.Count -gt 0) {
            $dataDir = $dataPaths[0]
        }
        if (-not $dataDir) {
            $parent = Split-Path $mysqld -Parent | Split-Path -Parent
            $dataDir = "$parent\data"
        }
        
        Write-Host "[INFO] Data dir: $dataDir" -ForegroundColor White
        
        # Initialize if needed
        if (-not (Test-Path "$dataDir\mysql")) {
            Write-Host "[INFO] Data directory not initialized, running --initialize-insecure..." -ForegroundColor Yellow
            Write-Host "[INFO] This may take 30-60 seconds..." -ForegroundColor Yellow
            if (-not (Test-Path $dataDir)) {
                New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
            }
            try {
                & $mysqld --initialize-insecure --datadir="$dataDir" --console 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    & $mysqld --initialize-insecure --console 2>&1 | Out-Null
                }
                if (Test-Path "$dataDir\mysql") {
                    Write-Host "[OK] Data directory initialized" -ForegroundColor Green
                } else {
                    Write-Host "[WARN] Data directory still not found after init" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "[WARN] Initialization failed" -ForegroundColor Yellow
            }
        }
        
        # Find/create service
        $svcName = $null
        $svcNames = @("MySQL97", "MySQL90", "MySQL84", "MySQL80", "MySQL", "MySQL57")
        foreach ($s in $svcNames) {
            $svc = Get-Service -Name $s -ErrorAction SilentlyContinue
            if ($svc) {
                $svcName = $s
                break
            }
        }
        
        if (-not $svcName) {
            Write-Host "[INFO] No MySQL service found, creating..." -ForegroundColor Yellow
            try {
                $myIni = "$(Split-Path $mysqld -Parent | Split-Path -Parent)\my.ini"
                if (Test-Path $myIni) {
                    & $mysqld --install MySQL80 --defaults-file="$myIni" 2>&1 | Out-Null
                } else {
                    & $mysqld --install MySQL80 2>&1 | Out-Null
                }
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "[OK] MySQL80 service created" -ForegroundColor Green
                    $svcName = "MySQL80"
                } else {
                    Write-Host "[WARN] Service creation failed" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "[WARN] Service creation failed" -ForegroundColor Yellow
            }
        }
        
        if ($svcName) {
            Write-Host "[INFO] MySQL service: $svcName" -ForegroundColor White
        }
        
        # Start MySQL
        $connected = $false
        try {
            $null = & mysql -u root -e "SELECT 1" 2>&1
            if ($LASTEXITCODE -eq 0) {
                $connected = $true
                Write-Host "[OK] MySQL is already running and accessible" -ForegroundColor Green
            }
        } catch { }
        
        if (-not $connected -and $svcName) {
            Write-Host "[INFO] Starting service $svcName..." -ForegroundColor Yellow
            try {
                Start-Service -Name $svcName -ErrorAction Stop
                Write-Host "[INFO] Waiting for MySQL to be ready..." -ForegroundColor Yellow
                for ($i = 0; $i -lt 30; $i++) {
                    Start-Sleep -Seconds 1
                    $null = & mysql -u root -e "SELECT 1" 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        $connected = $true
                        Write-Host "[OK] MySQL service started" -ForegroundColor Green
                        break
                    }
                }
            } catch {
                Write-Host "[WARN] Service start failed: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
        
        if (-not $connected -and $mysqld) {
            Write-Host "[INFO] Trying direct mysqld start..." -ForegroundColor Yellow
            try {
                $proc = Start-Process $mysqld -ArgumentList "--console --datadir=`"$dataDir`"" -NoNewWindow -PassThru
                Write-Host "[INFO] Waiting for MySQL to accept connections..." -ForegroundColor Yellow
                for ($i = 0; $i -lt 15; $i++) {
                    Start-Sleep -Seconds 2
                    $null = & mysql -u root -e "SELECT 1" 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        $connected = $true
                        Write-Host "[OK] MySQL started directly" -ForegroundColor Green
                        break
                    }
                }
            } catch {
                Write-Host "[WARN] Direct start failed" -ForegroundColor Yellow
            }
        }
        
        if (-not $connected -and $mysqld) {
            Write-Host "[INFO] Attempting password reset via safe mode..." -ForegroundColor Yellow
            try {
                if ($svcName) { Stop-Service -Name $svcName -Force -ErrorAction SilentlyContinue }
                Get-Process mysqld -ErrorAction SilentlyContinue | Stop-Process -Force
                Start-Sleep -Seconds 2
                
                $proc = Start-Process $mysqld -ArgumentList "--console --skip-grant-tables --skip-networking --enable-named-pipe --datadir=`"$dataDir`"" -NoNewWindow -PassThru
                Start-Sleep -Seconds 8
                
                & mysql -u root --protocol=pipe -e "FLUSH PRIVILEGES;" 2>&1 | Out-Null
                & mysql -u root --protocol=pipe -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '';" 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    & mysql -u root --protocol=pipe -e "UPDATE mysql.user SET authentication_string='' WHERE User='root' AND Host='localhost'; FLUSH PRIVILEGES;" 2>&1 | Out-Null
                }
                Write-Host "[OK] Root password reset attempted" -ForegroundColor Green
                
                Get-Process mysqld -ErrorAction SilentlyContinue | Stop-Process -Force
                Start-Sleep -Seconds 2
                
                if ($svcName) {
                    Start-Service -Name $svcName -ErrorAction SilentlyContinue
                } else {
                    Start-Process $mysqld -ArgumentList "--console --datadir=`"$dataDir`"" -NoNewWindow
                }
                
                for ($i = 0; $i -lt 15; $i++) {
                    Start-Sleep -Seconds 2
                    $null = & mysql -u root -e "SELECT 1" 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        $connected = $true
                        Write-Host "[OK] MySQL reconnected with empty password" -ForegroundColor Green
                        break
                    }
                }
            } catch {
                Write-Host "[WARN] Password reset failed" -ForegroundColor Yellow
            }
        }
        
        if ($connected) {
            Write-Host "[OK] MySQL connection verified!" -ForegroundColor Green
        } else {
            Write-Host "[WARN] All startup attempts failed. MySQL is not running." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[WARN] mysqld.exe not found, cannot configure MySQL" -ForegroundColor Yellow
    }
}
Write-Host ""

# ============================================================
# Phase 5: Initialize database
# ============================================================
Write-Host "[Phase 5/6] Initializing database..." -ForegroundColor Cyan

try {
    $null = & mysql -u root -e "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        & mysql -u root -e "CREATE DATABASE IF NOT EXISTS python_var_lesson CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1 | Out-Null
        if (Test-Path "database.sql") {
            Get-Content "database.sql" | & mysql -u root python_var_lesson 2>&1 | Out-Null
            Write-Host "[OK] Database schema imported" -ForegroundColor Green
        }
        Write-Host "[OK] Database ready" -ForegroundColor Green
    } else {
        Write-Host "[WARN] MySQL not accessible" -ForegroundColor Yellow
        Write-Host "[INFO] server.js will create database on startup if MySQL is running" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARN] Database initialization skipped" -ForegroundColor Yellow
    Write-Host "[INFO] server.js will create database on startup" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================
# Phase 6: Start server
# ============================================================
Write-Host "[Phase 6/6] Starting web server..." -ForegroundColor Cyan

# Check port 3000
$portInUse = & netstat -ano 2>$null | Select-String ":3000 .*LISTENING"
if ($portInUse) {
    Write-Host "[INFO] Port 3000 is in use, freeing..." -ForegroundColor Yellow
    $portInUse | ForEach-Object {
        $pidStr = ($_ -split '\s+')[-1]
        & taskkill /f /pid $pidStr 2>$null | Out-Null
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
Write-Host "  (Browser will open automatically)" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

# Open browser
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
Write-Host ""
Read-Host "Press Enter to exit"