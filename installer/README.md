# Windows Setup.exe Builder

This folder builds a Windows installer (`Setup.exe`) for your compiled hospital app package.

## Prerequisites
- Inno Setup 6 installed (`ISCC.exe`)
- Compiled runtime package present at `release/lab-inventory-compiled`

## Build Steps
1. Double-click `build-installer.bat`
2. Wait for compile to finish
3. Find output in `release/LabInventorySetup.exe`

## Important install location
- Install to a writable folder (default now: `%LOCALAPPDATA%\Lab Inventory System`)
- Do **not** install to `Program Files` if you plan to run `npm install` during first-time setup

## If you already got EPERM in Program Files
1. Uninstall the old app (or delete old install folder)
2. Reinstall using new installer build
3. Confirm install path is under `%LOCALAPPDATA%`
4. Run `install-runtime-host.bat` again

## What the installer includes
- Compiled frontend (`dist`)
- Backend server files (`server`)
- Host scripts:
  - `install-runtime-host.bat`
  - `start-hospital.bat`

## What the installer does not include
- Node.js
- PostgreSQL

These must already exist on the hospital host PC.
