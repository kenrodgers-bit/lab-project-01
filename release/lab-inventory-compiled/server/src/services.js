function makeLogId() {
  const rand = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `LOG-${Date.now()}-${rand}`;
}

async function writeAudit(client, { actorId, actorName, action, target, details }) {
  await client.query(
    `
    INSERT INTO audit_logs (id, actor_id, actor_name, action, target, details, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `,
    [makeLogId(), actorId, actorName, action, target, details],
  );
}

async function getSnapshot(client) {
  const [users, inventory, requests, auditLogs, permissions] = await Promise.all([
    client.query(
      `
      SELECT id, name, email, role, department, is_active AS "isActive"
      FROM users
      ORDER BY id
      `,
    ),
    client.query(
      `
      SELECT
        id,
        name,
        category,
        department,
        current_stock AS "currentStock",
        min_stock AS "minStock",
        unit,
        last_updated AS "lastUpdated"
      FROM inventory_items
      ORDER BY id
      `,
    ),
    client.query(
      `
      SELECT
        id,
        requester_id AS "requesterId",
        requester_name AS "requesterName",
        department,
        item_id AS "itemId",
        item_name AS "itemName",
        requested_qty AS "requestedQty",
        approved_qty AS "approvedQty",
        unit,
        status,
        priority,
        request_date AS "requestDate",
        reviewed_by AS "reviewedBy",
        reviewed_date AS "reviewedDate",
        review_note AS "reviewNote"
      FROM inventory_requests
      ORDER BY request_date DESC
      `,
    ),
    client.query(
      `
      SELECT
        id,
        actor_id AS "actorId",
        actor_name AS "actorName",
        action,
        target,
        details,
        created_at AS "createdAt"
      FROM audit_logs
      ORDER BY created_at DESC
      `,
    ),
    client.query(
      `
      SELECT
        department,
        can_request AS "canRequest",
        can_approve AS "canApprove",
        can_edit_inventory AS "canEditInventory"
      FROM department_permissions
      ORDER BY department
      `,
    ),
  ]);

  return {
    users: users.rows,
    inventory: inventory.rows,
    requests: requests.rows,
    auditLogs: auditLogs.rows,
    permissions: permissions.rows,
  };
}

module.exports = {
  writeAudit,
  getSnapshot,
};
