@echo off
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencies are missing. Install packages following README.md.
  pause
  exit /b 1
)
if not exist ".env.local" (
  echo Firebase config is missing. Create .env.local following README.md.
  pause
  exit /b 1
)
echo VUA TOI PRICE - http://127.0.0.1:5173
node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173 --strictPort
pause
