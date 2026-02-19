# Deployment Guide

## Architecture
- Frontend: React + Vite (`/`)
- Backend: Node.js + Express + PostgreSQL (`/server`)
- Auth: JWT (server-issued, role claims)
- Business logic + audit logging: server-side
- Optional single-service deploy: backend serves built frontend from `dist`

## 1. Backend Setup
1. Create PostgreSQL database (example: `lab_inventory`).
2. Copy `server/.env.example` to `server/.env` and set:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CORS_ORIGIN` (comma-separated origins supported)
3. Install backend deps:
   - `cd server`
   - `npm install`
4. Run migrations + seed:
   - `npm run migrate`
5. Start backend:
   - `npm run dev`

Backend default URL: `http://localhost:4000`

## 2. Frontend Setup
1. Copy `.env.example` to `.env` (project root).
2. Ensure `VITE_API_BASE_URL` points to backend (`http://localhost:4000`).
3. Install + run:
   - `npm install`
   - `npm run dev`

Frontend default URL: `http://127.0.0.1:5500`

## 2A. Railway (Single Service)
Use this when you want Railway to host both frontend + backend on one URL.

1. Push this repository to GitHub.
2. In Railway, create a new project from the repo root.
3. Set environment variables in Railway service:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN=8h`
   - `CORS_ORIGIN=https://<your-railway-domain>`
4. Railway config is included in `railway.json`:
   - Build: installs deps, builds frontend, runs DB migrations
   - Start: runs backend (`npm --prefix server start`)
5. Deploy. Railway health check should pass on `/health/ready`.

Notes:
- Frontend routes are served by Express from `dist`.
- API stays under `/api/*` on the same domain.

## 3. Default Credentials
- Admin: `admin@hospital.lab` / `adminset@lab01`
- Staff: `staff@hospital.lab` / `staffset@lab01`

## 4. Production Checklist
- Use HTTPS only.
- Put backend behind reverse proxy (Nginx/IIS/Apache).
- Rotate `JWT_SECRET` and admin credentials.
- Restrict backend to hospital network/VPN.
- Schedule PostgreSQL backups.
- Use Admin backup export/import for operational snapshots.
- Enable centralized monitoring/log forwarding.
- Monitor readiness endpoint `GET /health/ready`.

## 5. Data Model / Migrations
- SQL migrations in `server/migrations`.
- `001_init.sql`: schema.
- `002_seed.sql`: seed data + `reset_lab_inventory_data()` function.
- `003_dynamic_departments.sql`: enables runtime department creation.
- `005_remove_password_reset_tokens.sql`: removes password reset token storage.
- Migration history is tracked in `schema_migrations`; rerunning `npm run migrate` will skip already-applied files.

## 6. Operational Notes
- All request approvals, inventory edits, and audit logs are enforced server-side.
- Frontend reads/writes through API only.
- In single-service mode, Express serves frontend `dist` and handles SPA route fallback.
- Use `POST /api/admin/reset` via Admin UI to restore baseline dataset.
- Admin can create new departments from the Admin page, then assign users/inventory to them.
- Authentication endpoints include request-rate limiting to reduce brute-force risk.
