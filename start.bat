@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org then run this file again.
  pause
  exit /b
)
if not exist node_modules (
  echo Installing server packages - first run only...
  call npm install --omit=dev
)
if not exist client\dist\index.html (
  echo Building the 3D client - first run, or after code changes...
  call npm run build
)
start "" /min cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"
echo Starting library at http://localhost:3000  (close this window to stop)
node server/index.js
pause
