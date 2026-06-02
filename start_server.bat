@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Python Variable Adventure - Setup

:: ============================================================
::  Check for admin privileges & auto-elevate
:: ============================================================
net session >nul 2>&1
if !errorlevel! neq 0 (
    echo ==============================================
    echo   Requesting administrator privileges...
    echo ==============================================
    powershell -Command "Start-Process '%~f0' -Verb RunAs -WorkingDirectory '%~dp0'"
    exit /b
)

echo ==============================================
echo   Python Variable Adventure - One-Click Setup
echo ==============================================
echo.
echo This script will automatically:
echo   1. Detect or install Node.js
echo   2. Install npm dependencies
echo   3. Detect or install MySQL
echo   4. Configure MySQL (init, service, password)
echo   5. Start the web server
echo ==============================================
echo.

:: ============================================================
::  Phase 1: Node.js
:: ============================================================
echo [Phase 1/5] Checking Node.js...

set "NODE_DIR="
set "NODE_OK=0"

:: check PATH
for %%i in (node.exe) do (
    if exist "%%~$PATH:i" (
        set "NODE_OK=1"
        echo [OK] Node.js found in PATH
    )
)

:: search common install dirs
if !NODE_OK!==0 (
    echo [INFO] Searching for Node.js installation...
    for %%d in (
        "C:\Program Files\nodejs"
        "C:\Program Files (x86)\nodejs"
        "%LOCALAPPDATA%\Programs\nodejs"
        "%ProgramFiles%\nodejs"
    ) do (
        if exist "%%~d\node.exe" (
            set "PATH=%%~d;!PATH!"
            set "NODE_DIR=%%~d"
            set "NODE_OK=1"
            echo [OK] Found at: %%~d
        )
    )
)

:: if still not found, install via winget
if !NODE_OK!==0 (
    echo [INFO] Installing Node.js via winget...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    if !errorlevel! neq 0 (
        winget install OpenJS.NodeJS --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    )
    
    :: refresh PATH - search again after install
    for %%d in (
        "C:\Program Files\nodejs"
        "C:\Program Files (x86)\nodejs"
        "%LOCALAPPDATA%\Programs\nodejs"
        "%ProgramFiles%\nodejs"
    ) do (
        if exist "%%~d\node.exe" (
            set "PATH=%%~d;!PATH!"
            set "NODE_OK=1"
            echo [OK] Installed at: %%~d
        )
    )
    
    if !NODE_OK!==0 (
        echo.
        echo [ERROR] Failed to install Node.js!
        echo Please manually install: https://nodejs.org/
        echo.
        goto :end_with_pause
    )
)

echo [OK] Node.js version:
node --version
echo.

:: ============================================================
::  Phase 2: npm dependencies
:: ============================================================
echo [Phase 2/5] Installing npm dependencies...

if not exist "node_modules\" (
    echo [INFO] Running npm install...
    call npm install 2>nul
    if !errorlevel! neq 0 (
        echo [WARN] Default registry failed, trying mirror...
        call npm install --registry=https://registry.npmmirror.com 2>nul
        if !errorlevel! neq 0 (
            echo [ERROR] npm install failed!
            echo.
            goto :end_with_pause
        )
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already present
)
echo.

:: ============================================================
::  Phase 3: MySQL - detection
:: ============================================================
echo [Phase 3/5] Checking MySQL...

set "MYSQL_OK=0"
set "MYSQL_BIN="
set "MYSQL_BASE="
set "MYSQL_DATA="

:: check PATH first
for %%i in (mysql.exe) do (
    if exist "%%~$PATH:i" (
        set "MYSQL_OK=1"
        set "MYSQL_BIN=%%~dp$PATH:i"
        echo [OK] MySQL found in PATH
    )
)

:: search common installation directories
if !MYSQL_OK!==0 (
    echo [INFO] Searching for MySQL installation...
    for %%d in (
        "C:\Program Files\MySQL\MySQL Server 9.7\bin"
        "C:\Program Files\MySQL\MySQL Server 9.0\bin"
        "C:\Program Files\MySQL\MySQL Server 8.4\bin"
        "C:\Program Files\MySQL\MySQL Server 8.0\bin"
        "C:\Program Files\MySQL\MySQL Server 5.7\bin"
        "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin"
        "C:\Program Files (x86)\MySQL\MySQL Server 5.7\bin"
    ) do (
        if exist "%%~d\mysql.exe" (
            set "PATH=%%~d;!PATH!"
            set "MYSQL_OK=1"
            set "MYSQL_BIN=%%~d\"
            for %%b in ("%%~d\..") do set "MYSQL_BASE=%%~fb"
            echo [OK] Found at: %%~d
        )
    )
)

:: ============================================================
::  Phase 4: MySQL - install & configure
:: ============================================================
echo [Phase 4/5] Configuring MySQL...

if !MYSQL_OK!==0 (
    echo [INFO] Installing MySQL via winget...
    winget install Oracle.MySQL --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    
    :: search after install
    for %%d in (
        "C:\Program Files\MySQL\MySQL Server 9.7\bin"
        "C:\Program Files\MySQL\MySQL Server 9.0\bin"
        "C:\Program Files\MySQL\MySQL Server 8.4\bin"
        "C:\Program Files\MySQL\MySQL Server 8.0\bin"
        "C:\Program Files\MySQL\MySQL Server 5.7\bin"
        "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin"
    ) do (
        if exist "%%~d\mysql.exe" (
            set "PATH=%%~d;!PATH!"
            set "MYSQL_OK=1"
            set "MYSQL_BIN=%%~d\"
            for %%b in ("%%~d\..") do set "MYSQL_BASE=%%~fb"
            echo [OK] MySQL installed at: %%~d
        )
    )
    
    if !MYSQL_OK!==0 (
        echo [ERROR] MySQL installation failed!
        echo Please manually install from: https://dev.mysql.com/downloads/installer/
        echo Important: Set root password to EMPTY during setup!
        echo.
        goto :end_with_pause
    )
)

:: ---- MySQL found / installed, now configure ----

:: make sure mysqld is reachable
set "MYSQLD="
if defined MYSQL_BIN (
    if exist "!MYSQL_BIN!mysqld.exe" set "MYSQLD=!MYSQL_BIN!mysqld.exe"
)
if not defined MYSQLD (
    for %%i in (mysqld.exe) do (
        if exist "%%~$PATH:i" set "MYSQLD=%%~$PATH:i"
    )
)

:: detect MySQL base dir (parent of bin)
if not defined MYSQL_BASE (
    if defined MYSQLD (
        for %%b in ("!MYSQLD!\..") do set "MYSQL_BASE=%%~fb"
    )
)

echo [INFO] MySQL base dir: !MYSQL_BASE!
echo [INFO] MySQL bin dir:  !MYSQL_BIN!

:: ---- check & initialize data directory ----
set "DATA_DIR="
if defined MYSQL_BASE set "DATA_DIR=!MYSQL_BASE!\data"

:: also check common data dirs
if not exist "!DATA_DIR!\mysql\" (
    if exist "C:\ProgramData\MySQL\MySQL Server 8.0\Data\mysql\" (
        set "DATA_DIR=C:\ProgramData\MySQL\MySQL Server 8.0\Data"
    ) else if exist "C:\ProgramData\MySQL\MySQL Server 8.4\Data\mysql\" (
        set "DATA_DIR=C:\ProgramData\MySQL\MySQL Server 8.4\Data"
    ) else if exist "C:\ProgramData\MySQL\MySQL Server 9.0\Data\mysql\" (
        set "DATA_DIR=C:\ProgramData\MySQL\MySQL Server 9.0\Data"
    ) else if exist "C:\ProgramData\MySQL\MySQL Server 5.7\Data\mysql\" (
        set "DATA_DIR=C:\ProgramData\MySQL\MySQL Server 5.7\Data"
    )
)

if exist "!DATA_DIR!\mysql\" (
    echo [OK] Data directory exists: !DATA_DIR!
) else (
    echo [INFO] Data directory not initialized, running --initialize-insecure...
    echo [INFO] This may take 30-60 seconds...
    
    if defined MYSQLD (
        "!MYSQLD!" --initialize-insecure --console 2>&1
        if !errorlevel! neq 0 (
            :: try with explicit datadir
            if not exist "!DATA_DIR!" mkdir "!DATA_DIR!"
            "!MYSQLD!" --initialize-insecure --datadir="!DATA_DIR!" --console 2>&1
        )
    )
    
    :: check again
    if not exist "!DATA_DIR!\mysql\" (
        if exist "C:\ProgramData\MySQL\MySQL Server 8.0\Data\mysql\" (
            set "DATA_DIR=C:\ProgramData\MySQL\MySQL Server 8.0\Data"
        ) else if exist "C:\ProgramData\MySQL\MySQL Server 8.4\Data\mysql\" (
            set "DATA_DIR=C:\ProgramData\MySQL\MySQL Server 8.4\Data"
        )
    )
    
    if exist "!DATA_DIR!\mysql\" (
        echo [OK] Data directory initialized
    ) else (
        echo [WARN] Data directory initialization may have failed
        echo [INFO] Continuing anyway...
    )
)

:: ---- ensure Windows service exists ----
echo [INFO] Checking MySQL Windows service...

:: detect existing service name
set "SVC_NAME="
for %%s in (MySQL97 MySQL90 MySQL84 MySQL80 MySQL MySQL57) do (
    sc query "%%s" >nul 2>&1
    if !errorlevel!==0 if not defined SVC_NAME set "SVC_NAME=%%s"
)

if not defined SVC_NAME (
    echo [INFO] No MySQL service found, creating...
    if defined MYSQLD (
        :: try creating as MySQL80
        "!MYSQLD!" --install MySQL80 --defaults-file="!MYSQL_BASE!\my.ini" >nul 2>&1
        if !errorlevel! neq 0 (
            "!MYSQLD!" --install MySQL80 >nul 2>&1
        )
        if !errorlevel! neq 0 (
            "!MYSQLD!" --install MySQL >nul 2>&1
        )
        
        :: check which service was created
        for %%s in (MySQL80 MySQL MySQL84 MySQL90 MySQL97 MySQL57) do (
            sc query "%%s" >nul 2>&1
            if !errorlevel!==0 if not defined SVC_NAME set "SVC_NAME=%%s"
        )
    )
)

if defined SVC_NAME (
    echo [OK] MySQL service: !SVC_NAME!
) else (
    echo [WARN] Could not create MySQL service
    echo [INFO] Will try to start mysqld directly...
)

:: ---- start MySQL service ----
echo [INFO] Starting MySQL...

set "CONNECTED=0"

:: try connecting first (maybe already running)
mysql -u root -e "SELECT 1" 2>nul
if !errorlevel!==0 (
    set "CONNECTED=1"
    echo [OK] MySQL is already running and accessible
)

:: start via service
if !CONNECTED!==0 (
    if defined SVC_NAME (
        echo [INFO] Starting service !SVC_NAME!...
        net start "!SVC_NAME!" >nul 2>&1
        
        :: wait for startup
        echo [INFO] Waiting for MySQL to be ready...
        set "WAIT_COUNT=0"
        :wait_mysql
        timeout /t 1 /nobreak >nul
        set /a WAIT_COUNT+=1
        mysql -u root -e "SELECT 1" 2>nul
        if !errorlevel!==0 (
            set "CONNECTED=1"
        ) else if !WAIT_COUNT! lss 15 (
            goto :wait_mysql
        )
    )
)

:: try direct mysqld start as fallback
if !CONNECTED!==0 (
    if defined MYSQLD (
        echo [INFO] Trying direct mysqld start...
        start "" /B "!MYSQLD!" --console
        
        set "WAIT_COUNT=0"
        :wait_mysqld
        timeout /t 2 /nobreak >nul
        set /a WAIT_COUNT+=1
        mysql -u root -e "SELECT 1" 2>nul
        if !errorlevel!==0 (
            set "CONNECTED=1"
            echo [OK] MySQL started directly
        ) else if !WAIT_COUNT! lss 10 (
            goto :wait_mysqld
        )
    )
)

:: ---- handle root password ----
if !CONNECTED!==0 (
    :: maybe root password is not empty? try reset
    echo [INFO] Trying to reset root password...
    
    :: stop MySQL if running
    if defined SVC_NAME net stop "!SVC_NAME!" >nul 2>&1
    taskkill /f /im mysqld.exe >nul 2>&1
    
    :: start with skip-grant-tables
    if defined MYSQLD (
        echo [INFO] Starting MySQL in safe mode...
        start "" /B "!MYSQLD!" --console --skip-grant-tables --skip-networking
        
        timeout /t 5 /nobreak >nul
        
        :: reset root password
        mysql -u root -e "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY '';" 2>nul
        if !errorlevel!==0 echo [OK] Root password reset to empty
        
        :: restart normally
        taskkill /f /im mysqld.exe >nul 2>&1
        timeout /t 2 /nobreak >nul
        
        if defined SVC_NAME (
            net start "!SVC_NAME!" >nul 2>&1
        ) else (
            start "" /B "!MYSQLD!" --console
        )
        
        :: wait and test
        set "WAIT_COUNT=0"
        :wait_after_reset
        timeout /t 2 /nobreak >nul
        set /a WAIT_COUNT+=1
        mysql -u root -e "SELECT 1" 2>nul
        if !errorlevel!==0 (
            set "CONNECTED=1"
            echo [OK] MySQL reconnected with empty password
        ) else if !WAIT_COUNT! lss 10 (
            goto :wait_after_reset
        )
    )
)

:: ---- final connection check ----
if !CONNECTED!==0 (
    echo.
    echo ==============================================
    echo [WARNING] Could not connect to MySQL!
    echo ==============================================
    echo.
    echo Please manually verify:
    echo   1. Open Windows Services ^(services.msc^)
    echo   2. Find MySQL service and start it
    echo   3. Ensure root password is empty
    echo      OR edit server.js with correct password
    echo.
    echo For now, the server will try to start anyway...
    echo.
    echo Press any key to continue...
    pause >nul
) else (
    echo [OK] MySQL connection verified!
)

echo [OK] MySQL version:
mysql --version 2>nul
echo.

:: ============================================================
::  Phase 5: Start server
:: ============================================================
echo [Phase 5/5] Starting web server...
echo ==============================================
echo.
echo   Python Variable Adventure
echo   Website: http://localhost:3000
echo   Database: MySQL -^> python_var_lesson
echo   Press Ctrl+C in this window to stop
echo.
echo ==============================================
echo.

node server.js

if !errorlevel! neq 0 (
    echo.
    echo [ERROR] Server exited with code !errorlevel!
    echo Common causes:
    echo   1. MySQL not running - check services.msc
    echo   2. MySQL password mismatch - edit server.js
    echo   3. Port 3000 already in use
    echo.
)

:end_with_pause
echo.
echo Press any key to close this window...
pause >nul