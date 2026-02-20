@echo off
setlocal
cd /d "%~dp0"
title Build Lab Inventory Setup.exe

set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"

if not exist "%ISCC%" (
  echo ERROR: Inno Setup compiler not found.
  echo Install Inno Setup 6 from: https://jrsoftware.org/isdl.php
  pause
  exit /b 1
)

if not exist "..\release\lab-inventory-compiled\dist\index.html" (
  echo ERROR: Compiled package not found at ..\release\lab-inventory-compiled
  echo Build/package first, then run this script again.
  pause
  exit /b 1
)

echo Building installer...
"%ISCC%" "lab-inventory.iss"
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo Success. Installer created at:
echo ..\release\LabInventorySetup.exe
pause
exit /b 0
