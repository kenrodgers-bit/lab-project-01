@echo off
setlocal

cd /d "%~dp0"
title Lab Inventory - Hospital Host

if not exist "dist\index.html" (
  echo Frontend build not found. Running first-time setup...
  call install-hospital-host.bat
  if errorlevel 1 exit /b 1
)

if not exist "server\.env" (
  echo ERROR: Missing server\.env file.
  echo Create server\.env, then run this script again.
  pause
  exit /b 1
)

echo Starting Lab Inventory server...
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.16.*' -or $_.IPAddress -like '172.17.*' -or $_.IPAddress -like '172.18.*' -or $_.IPAddress -like '172.19.*' -or $_.IPAddress -like '172.2?.*' -or $_.IPAddress -like '172.3?.*' } ^| Select-Object -ExpandProperty IPAddress -First 1)"`) do set LAN_IP=%%I
if "%LAN_IP%"=="" set LAN_IP=localhost

echo Open from this host:   http://localhost:4000
echo Open from LAN devices: http://%LAN_IP%:4000
echo.
echo Keep this window open while the system is in use.
echo Press Ctrl+C to stop.
echo.

call npm --prefix server start
