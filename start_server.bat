@echo off
cd /d "%~dp0"

echo ==============================================
echo   Python Variable Adventure - Server
echo ==============================================
echo.

REM ---------- Check Node.js ----------
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Node.js not found. Starting auto-install...
    echo.
    
    REM Method 1: Try winget (built-in Windows 10/11)
    winget install OpenJS.NodeJS.LTS --silent >nul 2>&1
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
        echo [OK] Node.js installed via winget
        goto check_ok
    )

    REM Method 2: Download and install via PowerShell
    echo [INFO] Downloading Node.js installer, please wait...
    powershell -NoProfile -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%TEMP%\nodejs_installer.msi' }"
    if exist "%TEMP%\nodejs_installer.msi" (
        echo [INFO] Installing Node.js silently...
        msiexec /i "%TEMP%\nodejs_installer.msi" /quiet /norestart
        timeout /t 5 /nobreak >nul
        del "%TEMP%\nodejs_installer.msi" >nul 2>&1
        set "PATH=C:\Program Files\nodejs;%PATH%"
    )

    :: Verify again
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Auto-install failed.
        echo Please manually install Node.js from:
        echo   https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
    echo [OK] Node.js installed successfully
)

:check_ok
echo [OK] Node.js detected: 
node --version
echo [OK] Working directory: %cd%

REM ---------- Install dependencies ----------
if not exist "node_modules\express" (
    echo [INFO] Installing dependencies, please wait...
    call npm install
    if not exist "node_modules\express" (
        echo [WARN] Failed. Please run: npm install
    )
)

echo.
echo Starting server...
echo Website: http://localhost:3000
echo Press Ctrl+C to stop the server
echo ==============================================
echo.

node server.js

pause