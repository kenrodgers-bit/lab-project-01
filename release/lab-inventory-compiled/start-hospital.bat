@echo off
setlocal
cd /d "%~dp0"
title Lab Inventory - Hospital Runtime

if not exist "dist\index.html" (
  echo ERROR: dist\index.html not found.
  pause
  exit /b 1
)

if not exist "server\.env" (
  echo ERROR: Missing server\.env file.
  echo Copy server\.env.example to server\.env and fill in values.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.16.*' -or $_.IPAddress -like '172.17.*' -or $_.IPAddress -like '172.18.*' -or $_.IPAddress -like '172.19.*' -or $_.IPAddress -like '172.2?.*' -or $_.IPAddress -like '172.3?.*' } ^| Select-Object -ExpandProperty IPAddress -First 1)"`) do set LAN_IP=%%I
if "%LAN_IP%"=="" set LAN_IP=localhost

echo Starting Lab Inventory...
echo Host URL: http://localhost:4000
echo LAN URL:  http://%LAN_IP%:4000
echo.
echo Keep this window open. Press Ctrl+C to stop.
echo.

call npm --prefix server start
