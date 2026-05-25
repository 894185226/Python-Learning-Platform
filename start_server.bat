@echo off
cls
echo ==============================================
echo   Python Variable Adventure - Server
echo ==============================================
echo.
echo Starting Node.js server with MySQL database...
echo Website: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo ==============================================
echo.

cd /d "C:\Users\Public\PythonVariableLesson"
"C:\Users\89418\.trae-cn\binaries\node\versions\24.15.0\node.exe" server.js
pause