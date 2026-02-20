CREATE OR REPLACE FUNCTION reset_lab_inventory_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  TRUNCATE TABLE inventory_requests, inventory_items, audit_logs, department_permissions, users RESTART IDENTITY CASCADE;

  INSERT INTO users (id, name, email, role, department, is_active, password_hash) VALUES
    ('USR-001', 'Dr. Sarah Smith', 'admin@hospital.lab', 'admin', 'Haematology', true, crypt('adminset@lab01', gen_salt('bf'))),
    ('USR-002', 'Lab Staff', 'staff@hospital.lab', 'staff', 'Microbiology', true, crypt('staffset@lab01', gen_salt('bf'))),
    ('USR-003', 'Dr. Wilson', 'wilson@hospital.lab', 'staff', 'Chemistry', true, crypt('staffset@lab01', gen_salt('bf'))),
    ('USR-004', 'Lab Tech Anita', 'anita@hospital.lab', 'staff', 'Pathology', true, crypt('staffset@lab01', gen_salt('bf')));

  INSERT INTO department_permissions (department, can_request, can_approve, can_edit_inventory) VALUES
    ('Haematology', true, false, false),
    ('Microbiology', true, false, false),
    ('Chemistry', true, false, false),
    ('Pathology', true, false, false);

  INSERT INTO inventory_items (id, name, category, department, current_stock, min_stock, unit, last_updated) VALUES
    ('INV-001', 'Blood Collection Tubes', 'Consumables', 'Haematology', 245, 50, 'pieces', '2026-02-14T11:00:00.000Z'),
    ('INV-002', 'Microscope Slides', 'Consumables', 'Microbiology', 15, 25, 'boxes', '2026-02-14T09:00:00.000Z'),
    ('INV-003', 'Reagent Kit A', 'Reagents', 'Chemistry', 8, 10, 'kits', '2026-02-13T08:00:00.000Z'),
    ('INV-004', 'Centrifuge Tubes', 'Consumables', 'Haematology', 0, 20, 'pieces', '2026-02-12T08:00:00.000Z'),
    ('INV-005', 'Culture Media', 'Reagents', 'Microbiology', 125, 30, 'bottles', '2026-02-14T11:20:00.000Z'),
    ('INV-006', 'Staining Solution', 'Reagents', 'Pathology', 22, 20, 'bottles', '2026-02-15T06:20:00.000Z');

  INSERT INTO inventory_requests (
    id, requester_id, requester_name, department, item_id, item_name, requested_qty, approved_qty, unit, status, priority,
    request_date, reviewed_by, reviewed_date, review_note
  ) VALUES
    ('REQ-001', 'USR-002', 'Lab Staff', 'Microbiology', 'INV-005', 'Culture Media', 50, 40, 'bottles', 'partially_approved', 'high',
      '2026-02-14T08:20:00.000Z', 'Dr. Sarah Smith', '2026-02-14T10:00:00.000Z', 'Partial release due to lab-wide rationing'),
    ('REQ-002', 'USR-003', 'Dr. Wilson', 'Chemistry', 'INV-003', 'Reagent Kit A', 5, NULL, 'kits', 'pending', 'medium',
      '2026-02-15T10:00:00.000Z', NULL, NULL, NULL),
    ('REQ-003', 'USR-004', 'Lab Tech Anita', 'Pathology', 'INV-006', 'Staining Solution', 10, 10, 'bottles', 'approved', 'low',
      '2026-02-13T13:00:00.000Z', 'Dr. Sarah Smith', '2026-02-13T14:30:00.000Z', NULL);

  INSERT INTO audit_logs (id, actor_id, actor_name, action, target, details, created_at) VALUES
    ('LOG-001', 'USR-001', 'Dr. Sarah Smith', 'request_partially_approved', 'REQ-001', 'Approved 40/50 bottles of Culture Media', '2026-02-14T10:00:00.000Z'),
    ('LOG-002', 'USR-001', 'Dr. Sarah Smith', 'request_approved', 'REQ-003', 'Approved 10 bottles of Staining Solution', '2026-02-13T14:30:00.000Z'),
    ('LOG-003', 'system', 'System', 'low_stock_alert', 'INV-002', 'Microscope Slides dropped below minimum level', '2026-02-14T09:00:00.000Z');
END;
$$;

SELECT reset_lab_inventory_data();
