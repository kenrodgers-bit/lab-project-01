# Lab Inventory Runtime Package

## Package Contents
- `dist` (compiled frontend)
- `server` (backend API + migrations)
- `install-runtime-host.bat` (one-time setup)
- `start-hospital.bat` (daily startup)

## Host PC Requirements
- Windows PC
- Node.js LTS installed
- PostgreSQL installed
- Database created: `lab_inventory`

## One-Time Setup
1. Copy this folder to the hospital host PC.
2. Copy `server/.env.example` to `server/.env`.
3. Edit `server/.env` and set:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CORS_ORIGIN` to `http://HOST_IP:4000,http://localhost:4000`
4. Run `install-runtime-host.bat`.

## Daily Startup
1. Run `start-hospital.bat`.
2. Keep the console window open.
3. Staff open `http://HOST_IP:4000` on computers in the same LAN/Wi-Fi.

## Notes
- Change default passwords immediately after first login.
- Configure Windows Firewall to allow only `LocalSubnet` for port `4000`.
