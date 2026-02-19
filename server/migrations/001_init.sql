CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  department TEXT NOT NULL CHECK (department IN ('Haematology', 'Microbiology', 'Chemistry', 'Pathology')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS department_permissions (
  department TEXT PRIMARY KEY CHECK (department IN ('Haematology', 'Microbiology', 'Chemistry', 'Pathology')),
  can_request BOOLEAN NOT NULL DEFAULT true,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  can_edit_inventory BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('Haematology', 'Microbiology', 'Chemistry', 'Pathology')),
  current_stock INTEGER NOT NULL CHECK (current_stock >= 0),
  min_stock INTEGER NOT NULL CHECK (min_stock >= 0),
  unit TEXT NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  requester_name TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('Haematology', 'Microbiology', 'Chemistry', 'Pathology')),
  item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  item_name TEXT NOT NULL,
  requested_qty INTEGER NOT NULL CHECK (requested_qty > 0),
  approved_qty INTEGER,
  unit TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'partially_approved', 'rejected')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_date TIMESTAMPTZ,
  review_note TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
