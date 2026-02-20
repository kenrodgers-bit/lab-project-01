@echo off
setlocal
cd /d "%~dp0"
title Lab Inventory - Runtime Setup

echo [1/3] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js LTS is not installed.
  pause
  exit /b 1
)

echo [2/3] Installing backend dependencies...
call npm --prefix server install
if errorlevel 1 goto :fail

echo [3/3] Running database migrations...
call npm --prefix server run migrate
if errorlevel 1 goto :fail

echo.
echo Runtime setup complete.
echo Next step: run start-hospital.bat
pause
exit /b 0

:fail
echo.
echo Setup failed. Review errors above and rerun.
pause
exit /b 1
