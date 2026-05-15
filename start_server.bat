@echo off
cls
echo ==============================================
echo     Python Variable Adventure - Server
echo ==============================================
echo.
echo Starting HTTP Server...
echo Server Address: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "C:\Users\Public\PythonVariableLesson"
python -m http.server 8000