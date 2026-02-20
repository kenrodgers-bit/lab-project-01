@echo off
setlocal

cd /d "%~dp0"
title Lab Inventory - First-Time Host Setup

echo [1/5] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Install Node.js LTS, then run this again.
  pause
  exit /b 1
)

echo [2/5] Installing frontend dependencies...
call npm install
if errorlevel 1 goto :fail

echo [3/5] Installing backend dependencies...
call npm --prefix server install
if errorlevel 1 goto :fail

echo [4/5] Building frontend...
call npm run build
if errorlevel 1 goto :fail

echo [5/5] Running database migrations...
call npm --prefix server run migrate
if errorlevel 1 goto :fail

echo.
echo Setup complete.
echo Next time, just run: start-hospital.bat
pause
exit /b 0

:fail
echo.
echo Setup failed. Review the error above, then rerun this script.
pause
exit /b 1

