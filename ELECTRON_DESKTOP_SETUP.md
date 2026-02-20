# Electron Desktop Packaging Guide (LAN-Hosted)

This project now supports a Windows desktop host app that starts the Express API locally and exposes it on the LAN.

## Architecture
- `electron/main.cjs`: desktop process lifecycle
- `electron/preload.cjs`: secure IPC bridge for UI actions
- `electron/control.html`: local control panel (status, auto-start toggle, stop)
- `server/src/index.js`: exports `startServer` and `stopServer`
- App serves frontend from `dist` and API from `/api`

## Runtime behavior
1. Desktop app checks if port `5000` is free.
2. If free, it starts Express on `0.0.0.0:5000`.
3. It waits for `/health` to respond.
4. It opens default browser to `http://localhost:5000`.
5. LAN users can access `http://<host-local-ip>:5000`.
6. Logs are written to `%APPDATA%\\Lab Inventory Desktop\\logs\\desktop.log`.

## First-run config wizard
On first launch, the desktop app shows a setup wizard and asks for:
- `DATABASE_URL`
- `JWT_SECRET`
- optional `JWT_EXPIRES_IN` (default `8h`)

Values are saved to:
- `%APPDATA%\Lab Inventory Desktop\runtime-config.json`

After the first save, next launches start automatically with saved values.

## Environment (optional)
You can still pre-set these via environment variables if needed:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `APP_PORT` (default `5000`)

The desktop process sets:
- `HOST=0.0.0.0`
- `PORT=5000` (unless `APP_PORT` override)
- `CORS_ORIGIN` automatically if not supplied

## Firewall notes
Allow inbound TCP `5000` on Private profile (LocalSubnet recommended).
Example PowerShell (run as Administrator):

```powershell
New-NetFirewallRule -DisplayName "Lab Inventory Desktop LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5000 -RemoteAddress LocalSubnet -Profile Private
```

## Build commands
From project root:

```powershell
npm install
npm run build
npm run electron:dist
```

Installer output:
- `release/electron/Lab Inventory Desktop Setup <version>.exe`

Portable output (optional):

```powershell
npm run electron:pack
```

## Local development run
```powershell
npm run electron:dev
```

## Step-by-step to generate setup.exe
1. Open PowerShell in project root.
2. Run `npm install`.
3. Run `npm run build`.
4. Run `npm run electron:dist`.
5. Open `release/electron`.
6. Distribute the generated `Setup.exe`.

## Step-by-step first launch on hospital host PC
1. Run the installed desktop app.
2. Enter `DATABASE_URL` and `JWT_SECRET` in the wizard.
3. Click **Save and Start**.
4. Browser opens automatically at `http://localhost:5000`.
5. Staff on LAN can use `http://<host-ip>:5000`.

## Optional auto-start on Windows boot
The desktop control window includes a checkbox:
- "Start automatically when Windows starts"
- This toggles Electron `app.setLoginItemSettings`.
