ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_check;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_department_check;
ALTER TABLE inventory_requests DROP CONSTRAINT IF EXISTS inventory_requests_department_check;
ALTER TABLE department_permissions DROP CONSTRAINT IF EXISTS department_permissions_department_check;
