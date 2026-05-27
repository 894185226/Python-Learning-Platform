@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==============================================
echo   Python Variable Adventure - Server
echo ==============================================
echo.

REM =====================================================
REM  Phase 1: Check Node.js
REM =====================================================
echo [Phase 1] Checking Node.js...

set "NODE_PATH="
for %%i in (node.exe) do (
    if exist "%%~$PATH:i" (
        set "NODE_PATH=%%~$PATH:i"
    )
)

if not defined NODE_PATH (
    echo [WARN] Node.js not found in PATH, searching common locations...
    
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_PATH=C:\Program Files\nodejs\node.exe"
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "NODE_PATH=C:\Program Files (x86)\nodejs\node.exe"
        set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "NODE_PATH=%LOCALAPPDATA%\Programs\nodejs\node.exe"
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
    )
)

if not defined NODE_PATH (
    echo [INFO] Attempting auto-install via winget...
    winget install OpenJS.NodeJS.LTS --silent >nul 2>&1
    
    for %%i in (node.exe) do (
        if exist "%%~$PATH:i" set "NODE_PATH=%%~$PATH:i"
    )
    
    if not defined NODE_PATH (
        echo.
        echo [ERROR] Failed to install Node.js automatically!
        echo Please install Node.js from: https://nodejs.org/
        echo.
        goto :end_with_pause
    )
    echo [OK] Node.js installed successfully
)

echo [OK] Node.js version:
node --version
echo.

REM =====================================================
REM  Phase 2: Install npm dependencies
REM =====================================================
echo [Phase 2] Installing dependencies...

if not exist "node_modules\" (
    echo [INFO] Running npm install...
    call npm install 2>nul
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed!
        echo Try: npm install --registry=https://registry.npmmirror.com
        echo.
        goto :end_with_pause
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)

echo.

REM =====================================================
REM  Phase 3: Check MySQL
REM =====================================================
echo [Phase 3] Checking MySQL...

set "MYSQL_OK=0"

rem 先在 PATH 中查找 mysql.exe
for %%i in (mysql.exe) do (
    if exist "%%~$PATH:i" set "MYSQL_OK=1"
)

rem 如果 PATH 中没有，搜索常见安装目录
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
            echo [OK] Found MySQL at: %%~d
        )
    )
)

rem 仍未找到，尝试 winget 安装
if !MYSQL_OK!==0 (
    echo [INFO] Attempting auto-install MySQL via winget...
    winget install Oracle.MySQL --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    
    for %%d in (
        "C:\Program Files\MySQL\MySQL Server 9.7\bin"
        "C:\Program Files\MySQL\MySQL Server 9.0\bin"
        "C:\Program Files\MySQL\MySQL Server 8.4\bin"
        "C:\Program Files\MySQL\MySQL Server 8.0\bin"
    ) do (
        if exist "%%~d\mysql.exe" (
            set "PATH=%%~d;!PATH!"
            set "MYSQL_OK=1"
            echo [OK] MySQL installed at: %%~d
        )
    )
    
    if !MYSQL_OK!==0 (
        echo.
        echo [ERROR] Failed to install MySQL automatically!
        echo Please install MySQL from: https://dev.mysql.com/downloads/installer/
        echo Important: Set root password to empty during setup.
        echo.
        goto :end_with_pause
    )
)

echo [OK] MySQL found:
mysql --version 2>nul
echo.

REM =====================================================
REM  Phase 4: Start MySQL service
REM =====================================================
echo [Phase 4] Starting MySQL service...

set "CONNECTED=0"

rem 先测试连接是否已经可用
mysql -u root -e "SELECT 1" 2>nul
if !errorlevel!==0 (
    set "CONNECTED=1"
    echo [OK] MySQL already connected
)

rem 如果连接不通，尝试启动服务
if !CONNECTED!==0 (
    echo [INFO] Attempting to start MySQL service...
    
    rem 遍历可能的服务名，尝试启动
    for %%s in (MySQL97 MySQL90 MySQL84 MySQL80 MySQL MySQL57) do (
        if !CONNECTED!==0 (
            net start "%%s" >nul 2>&1
            if !errorlevel!==0 (
                echo [OK] Service %%s started
                timeout /t 2 /nobreak >nul
                mysql -u root -e "SELECT 1" 2>nul
                if !errorlevel!==0 set "CONNECTED=1"
            )
        )
    )
)

rem 如果还是连不上，说明 MySQL 服务确实有问题
if !CONNECTED!==0 (
    echo.
    echo [WARNING] Cannot connect to MySQL!
    echo.
    echo Possible reasons:
    echo   1. MySQL service is not running
    echo      - Open Services ^(services.msc^)
    echo      - Find MySQL service and start it manually
    echo      - Then re-run this script
    echo.
    echo   2. MySQL root password is not empty
    echo      - Edit server.js and update the password field
    echo      - Current config: user=root, password=(empty)
    echo.
    echo Press any key to continue (server may fail to start)...
    pause >nul
) else (
    echo [OK] MySQL connection verified
)

echo.

REM =====================================================
REM  Phase 5: Start Node.js server
REM =====================================================
echo ==============================================
echo   Starting server...
echo   Website: http://localhost:3000
echo   Press Ctrl+C to stop
echo ==============================================
echo.

node server.js

if !errorlevel! neq 0 (
    echo.
    echo [ERROR] Server exited with error code !errorlevel!
    echo.
    echo Common issues:
    echo   1. MySQL not running or not accessible
    echo   2. Check the error messages above for details
    echo.
)

:end_with_pause
echo.
echo Press any key to close this window...
pause >nul