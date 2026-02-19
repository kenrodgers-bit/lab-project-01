const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');
const path = require('path');

const express = require('express');
const cors = require('cors');
const { z } = require('zod');
const { query, withTransaction, pool } = require('./db');
const { requireAuth, requireRole, signToken } = require('./auth');
const { getSnapshot, writeAudit } = require('./services');

const app = express();
const port = Number(process.env.PORT || 4000);
const distPath = path.resolve(__dirname, '..', '..', 'dist');

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable.');
}
if (!process.env.JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable.');
}
if (process.env.JWT_SECRET === 'replace_with_a_long_random_secret') {
  console.warn('WARNING: JWT_SECRET is still using the placeholder value.');
}

function parseAllowedOrigins(raw) {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function createRateLimiter({ windowMs, maxRequests, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = hits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    hits.set(key, entry);

    if (entry.count > maxRequests) {
      const retrySeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retrySeconds.toString());
      return res.status(429).json({ message });
    }

    // best-effort cleanup to prevent unbounded map growth
    if (hits.size > 2000) {
      for (const [storedKey, storedEntry] of hits.entries()) {
        if (storedEntry.resetAt <= now) {
          hits.delete(storedKey);
        }
      }
    }
    return next();
  };
}

const allowedOrigins = parseAllowedOrigins(
  process.env.CORS_ORIGIN || 'http://127.0.0.1:5500,http://localhost:5500',
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS.'));
    },
    credentials: false,
  }),
);
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'Malformed JSON payload.' });
  }
  return next(error);
});

const authRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many authentication attempts. Try again shortly.',
});

function makeId(prefix) {
  const rand = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `${prefix}-${Date.now()}-${rand}`;
}

const departmentNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[A-Za-z][A-Za-z0-9\s&()\-\/]*$/, 'Invalid department name');

async function departmentExists(department, client = { query }) {
  const result = await client.query(
    `SELECT 1 FROM department_permissions WHERE lower(department) = lower($1) LIMIT 1`,
    [department],
  );
  return result.rowCount > 0;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'lab-inventory-backend' });
});

app.get(
  '/health/ready',
  asyncRoute(async (_req, res) => {
    await query('SELECT 1');
    res.json({ ok: true, service: 'lab-inventory-backend', database: 'reachable' });
  }),
);

app.post('/api/auth/login', authRateLimiter, asyncRoute(async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid login payload.' });
  }

  const { email, password } = parsed.data;
  const result = await query(
    `
    SELECT id, name, email, role, department, is_active AS "isActive"
    FROM users
    WHERE lower(email) = lower($1)
      AND is_active = true
      AND password_hash = crypt($2, password_hash)
    LIMIT 1
    `,
    [email, password],
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const user = result.rows[0];
  const token = signToken(user);

  await query(
    `
    INSERT INTO audit_logs (id, actor_id, actor_name, action, target, details, created_at)
    VALUES ($1, $2, $3, 'login', $2, 'User logged in', NOW())
    `,
    [makeId('LOG'), user.id, user.name],
  );

  return res.json({ token, user });
}));

app.get('/api/auth/me', requireAuth, asyncRoute(async (req, res) => {
  const result = await query(
    `
    SELECT id, name, email, role, department, is_active AS "isActive"
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [req.auth.sub],
  );
  if (result.rowCount === 0) {
    return res.status(401).json({ message: 'User not found.' });
  }
  return res.json({ user: result.rows[0] });
}));

app.get('/api/bootstrap', requireAuth, asyncRoute(async (_req, res) => {
  const snapshot = await getSnapshot(pool);
  if (_req.auth.role === 'admin') {
    return res.json(snapshot);
  }

  const staffRequests = snapshot.requests.filter((request) => request.requesterId === _req.auth.sub);
  const ownRequestIds = new Set(staffRequests.map((request) => request.id));
  const staffLogs = snapshot.auditLogs.filter(
    (log) => log.actorId === _req.auth.sub || ownRequestIds.has(log.target),
  );

  return res.json({
    users: snapshot.users.filter((user) => user.id === _req.auth.sub),
    inventory: snapshot.inventory.filter((item) => item.department === _req.auth.department),
    requests: staffRequests,
    auditLogs: staffLogs,
    permissions: snapshot.permissions.filter((permission) => permission.department === _req.auth.department),
  });
}));

app.post('/api/departments', requireAuth, requireRole('admin'), asyncRoute(async (req, res) => {
  const parsed = departmentNameSchema.safeParse(req.body?.name);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid department name.' });
  }
  const name = parsed.data;
  if (await departmentExists(name)) {
    return res.status(409).json({ message: 'Department already exists.' });
  }

  await withTransaction(async (client) => {
    await client.query(
      `
      INSERT INTO department_permissions (department, can_request, can_approve, can_edit_inventory)
      VALUES ($1, true, false, false)
      `,
      [name],
    );
    await writeAudit(client, {
      actorId: req.auth.sub,
      actorName: req.auth.name,
      action: 'department_created',
      target: name,
      details: `Department ${name} created`,
    });
  });

  return res.json({ ok: true });
}));

app.post('/api/users', requireAuth, requireRole('admin'), asyncRoute(async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['admin', 'staff']),
    department: departmentNameSchema,
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid user payload.' });
  }

  const payload = parsed.data;
  if (!(await departmentExists(payload.department))) {
    return res.status(400).json({ message: 'Department does not exist.' });
  }
  const existing = await query('SELECT 1 FROM users WHERE lower(email) = lower($1) LIMIT 1', [payload.email]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ message: 'Email already exists.' });
  }

  const defaultPassword = payload.role === 'admin' ? 'adminset@lab01' : 'staffset@lab01';
  const id = makeId('USR');
  await withTransaction(async (client) => {
    await client.query(
      `
      INSERT INTO users (id, name, email, role, department, is_active, password_hash)
      VALUES ($1, $2, lower($3), $4, $5, true, crypt($6, gen_salt('bf')))
      `,
      [id, payload.name.trim(), payload.email, payload.role, payload.department, defaultPassword],
    );
    await writeAudit(client, {
      actorId: req.auth.sub,
      actorName: req.auth.name,
      action: 'user_created',
      target: id,
      details: `${payload.name.trim()} (${payload.role}) created`,
    });
  });
  return res.json({ ok: true });
}));

app.patch('/api/users/:id', requireAuth, requireRole('admin'), asyncRoute(async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    department: departmentNameSchema.optional(),
    role: z.enum(['admin', 'staff']).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid update payload.' });
  }

  const currentRecord = await query(
    `
    SELECT id, role, is_active AS "isActive"
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [req.params.id],
  );
  if (currentRecord.rowCount === 0) {
    return res.status(404).json({ message: 'User not found.' });
  }
  const targetUser = currentRecord.rows[0];

  if (
    parsed.data.role &&
    parsed.data.role !== targetUser.role &&
    targetUser.role === 'admin' &&
    targetUser.isActive
  ) {
    const activeAdmins = await query(
      `
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE role = 'admin' AND is_active = true
      `,
    );
    if (activeAdmins.rows[0].count <= 1) {
      return res.status(400).json({ message: 'At least one active admin account is required.' });
    }
  }

  const fields = [];
  const values = [];
  let index = 1;
  if (parsed.data.name) {
    fields.push(`name = $${index++}`);
    values.push(parsed.data.name.trim());
  }
  if (parsed.data.department) {
    if (!(await departmentExists(parsed.data.department))) {
      return res.status(400).json({ message: 'Department does not exist.' });
    }
    fields.push(`department = $${index++}`);
    values.push(parsed.data.department);
  }
  if (parsed.data.role) {
    fields.push(`role = $${index++}`);
    values.push(parsed.data.role);
  }
  if (fields.length === 0) {
    return res.status(400).json({ message: 'No update fields provided.' });
  }
  values.push(req.params.id);
  const updated = await query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING id, name`, values);
  const updatedUser = updated.rows[0];
  await query(
    `
    INSERT INTO audit_logs (id, actor_id, actor_name, action, target, details, created_at)
    VALUES ($1, $2, $3, 'user_updated', $4, 'User profile updated', NOW())
    `,
    [makeId('LOG'), req.auth.sub, req.auth.name, req.params.id],
  );
  return res.json({ ok: true, user: updatedUser });
}));

app.post('/api/users/:id/toggle-status', requireAuth, requireRole('admin'), asyncRoute(async (req, res) => {
  const lookup = await query(
    `
    SELECT id, name, role, is_active AS "isActive"
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [req.params.id],
  );
  if (lookup.rowCount === 0) {
    return res.status(404).json({ message: 'User not found.' });
  }
  const targetUser = lookup.rows[0];

  if (targetUser.id === req.auth.sub && targetUser.isActive) {
    return res.status(400).json({ message: 'You cannot deactivate your own account.' });
  }
  if (targetUser.role === 'admin' && targetUser.isActive) {
    const activeAdmins = await query(
      `
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE role = 'admin' AND is_active = true
      `,
    );
    if (activeAdmins.rows[0].count <= 1) {
      return res.status(400).json({ message: 'At least one active admin account is required.' });
    }
  }

  const result = await query(
    `
    UPDATE users
    SET is_active = NOT is_active
    WHERE id = $1
    RETURNING id, name, role, is_active AS "isActive"
    `,
    [req.params.id],
  );
  const user = result.rows[0];
  await query(
    `
    INSERT INTO audit_logs (id, actor_id, actor_name, action, target, details, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `,
    [
      makeId('LOG'),
      req.auth.sub,
      req.auth.name,
      user.isActive ? 'user_activated' : 'user_deactivated',
      user.id,
      `${user.name} account ${user.isActive ? 'activated' : 'deactivated'}`,
    ],
  );
  return res.json({ ok: true, user });
}));

app.patch('/api/permissions/:department', requireAuth, requireRole('admin'), asyncRoute(async (req, res) => {
  const dep = departmentNameSchema.safeParse(req.params.department);
  if (!dep.success) {
    return res.status(400).json({ message: 'Invalid department.' });
  }
  if (!(await departmentExists(dep.data))) {
    return res.status(404).json({ message: 'Department not found.' });
  }
  const schema = z.object({
    canRequest: z.boolean().optional(),
    canApprove: z.boolean().optional(),
    canEditInventory: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid permissions payload.' });
  }

  const fields = [];
  const values = [];
  let index = 1;
  if (typeof parsed.data.canRequest === 'boolean') {
    fields.push(`can_request = $${index++}`);
    values.push(parsed.data.canRequest);
  }
  if (typeof parsed.data.canApprove === 'boolean') {
    fields.push(`can_approve = $${index++}`);
    values.push(parsed.data.canApprove);
  }
  if (typeof parsed.data.canEditInventory === 'boolean') {
    fields.push(`can_edit_inventory = $${index++}`);
    values.push(parsed.data.canEditInventory);
  }
  if (fields.length === 0) {
    return res.status(400).json({ message: 'No permission fields provided.' });
  }
  values.push(dep.data);
  await query(
    `UPDATE department_permissions SET ${fields.join(', ')} WHERE lower(department) = lower($${index})`,
    values,
  );
  await query(
    `
    INSERT INTO audit_logs (id, actor_id, actor_name, action, target, details, created_at)
    VALUES ($1, $2, $3, 'permissions_updated', $4, 'Department permissions changed', NOW())
    `,
    [makeId('LOG'), req.auth.sub, req.auth.name, dep.data],
  );
  return res.json({ ok: true });
}));

app.post('/api/inventory', requireAuth, requireRole('admin'), asyncRoute(async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    department: departmentNameSchema,
    currentStock: z.number().int().min(0),
    minStock: z.number().int().min(0),
    unit: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid inventory payload.' });
  }
  const payload = parsed.data;
  if (!(await departmentExists(payload.department))) {
    return res.status(400).json({ message: 'Department does not exist.' });
  }
  const duplicate = await query(
    `
    SELECT 1
    FROM inventory_items
    WHERE lower(name) = lower($1) AND department = $2
    LIMIT 1
    `,
    [payload.name, payload.department],
  );
  if (duplicate.rowCount > 0) {
    return res.status(409).json({ message: 'Item already exists in this department.' });
  }
  const id = makeId('INV');
  await withTransaction(async (client) => {
    await client.query(
      `
      INSERT INTO inventory_items
      (id, name, category, department, current_stock, min_stock, unit, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `,
      [id, payload.name.trim(), payload.category.trim(), payload.department, payload.currentStock, payload.minStock, payload.unit.trim()],
    );
    await writeAudit(client, {
      actorId: req.auth.sub,
      actorName: req.auth.name,
      action: 'inventory_created',
      target: id,
      details: `${payload.name.trim()} added (${payload.currentStock} ${payload.unit.trim()})`,
    });
  });
  return res.json({ ok: true });
}));

app.patch('/api/inventory/:id', requireAuth, requireRole('admin'), asyncRoute(async (req, res) => {
  const schema = z.object({
    currentStock: z.number().int().min(0).optional(),
    minStock: z.number().int().min(0).optional(),
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    unit: z.string().min(1).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid update payload.' });
  }
  const fields = [];
  const values = [];
  let index = 1;
  if (typeof parsed.data.currentStock === 'number') {
    fields.push(`current_stock = $${index++}`);
    values.push(parsed.data.currentStock);
  }
  if (typeof parsed.data.minStock === 'number') {
    fields.push(`min_stock = $${index++}`);
    values.push(parsed.data.minStock);
  }
  if (parsed.data.name) {
    fields.push(`name = $${index++}`);
    values.push(parsed.data.name.trim());
  }
  if (parsed.data.category) {
    fields.push(`category = $${index++}`);
    values.push(parsed.data.category.trim());
  }
  if (parsed.data.unit) {
    fields.push(`unit = $${index++}`);
    values.push(parsed.data.unit.trim());
  }
  if (fields.length === 0) {
    return res.status(400).json({ message: 'No update fields provided.' });
  }
  fields.push(`last_updated = NOW()`);
  values.push(req.params.id);
  const result = await query(
    `
    UPDATE inventory_items
    SET ${fields.join(', ')}
    WHERE id = $${index}
    RETURNING id, name, current_stock AS "currentStock", min_stock AS "minStock"
    `,
    values,
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Inventory item not found.' });
  }
  const item = result.rows[0];
  await withTransaction(async (client) => {
    await writeAudit(client, {
      actorId: req.auth.sub,
      actorName: req.auth.name,
      action: 'inventory_updated',
      target: item.id,
      details: `${item.name} stock updated to ${item.currentStock}`,
    });
    if (item.currentStock <= item.minStock) {
      await writeAudit(client, {
        actorId: 'system',
        actorName: 'System',
        action: 'low_stock_alert',
        target: item.id,
        details: `${item.name} dropped below minimum stock`,
      });
    }
  });
  return res.json({ ok: true });
}));

app.post('/api/requests', requireAuth, asyncRoute(async (req, res) => {
  if (req.auth.role !== 'staff') {
    return res.status(403).json({ message: 'Only staff can submit requests.' });
  }
  const schema = z.object({
    itemId: z.string().min(1),
    requestedQty: z.number().int().positive(),
    priority: z.enum(['high', 'medium', 'low']),
    reviewNote: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request payload.' });
  }

  const permission = await query(
    `
    SELECT can_request AS "canRequest"
    FROM department_permissions
    WHERE lower(department) = lower($1)
    LIMIT 1
    `,
    [req.auth.department],
  );
  if (permission.rowCount === 0 || !permission.rows[0].canRequest) {
    return res.status(403).json({ message: 'Request permission disabled for your department.' });
  }

  const user = await query(
    `SELECT id, name, department FROM users WHERE id = $1 LIMIT 1`,
    [req.auth.sub],
  );
  if (user.rowCount === 0) {
    return res.status(401).json({ message: 'User not found.' });
  }

  const item = await query(
    `
    SELECT id, name, unit, department
    FROM inventory_items
    WHERE id = $1
    LIMIT 1
    `,
    [parsed.data.itemId],
  );
  if (item.rowCount === 0) {
    return res.status(404).json({ message: 'Inventory item not found.' });
  }
  if (item.rows[0].department !== user.rows[0].department) {
    return res.status(403).json({ message: 'Cannot request items outside your department.' });
  }

  const requestId = makeId('REQ');
  await withTransaction(async (client) => {
    await client.query(
      `
      INSERT INTO inventory_requests
      (
        id, requester_id, requester_name, department, item_id, item_name,
        requested_qty, approved_qty, unit, status, priority, request_date,
        reviewed_by, reviewed_date, review_note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, 'pending', $9, NOW(), NULL, NULL, $10)
      `,
      [
        requestId,
        user.rows[0].id,
        user.rows[0].name,
        user.rows[0].department,
        item.rows[0].id,
        item.rows[0].name,
        parsed.data.requestedQty,
        item.rows[0].unit,
        parsed.data.priority,
        parsed.data.reviewNote || null,
      ],
    );
    await writeAudit(client, {
      actorId: user.rows[0].id,
      actorName: user.rows[0].name,
      action: 'request_submitted',
      target: requestId,
      details: `${item.rows[0].name}: ${parsed.data.requestedQty} ${item.rows[0].unit}`,
    });
  });
  return res.json({ ok: true });
}));

app.post('/api/requests/:id/review', requireAuth, requireRole('admin'), asyncRoute(async (req, res) => {
  const schema = z.object({
    status: z.enum(['approved', 'partially_approved', 'rejected']),
    approvedQty: z.number().int().min(0).optional(),
    reviewNote: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid review payload.' });
  }

  const review = parsed.data;
  try {
    await withTransaction(async (client) => {
      const reqResult = await client.query(
        `
        SELECT *
        FROM inventory_requests
        WHERE id = $1
        FOR UPDATE
        `,
        [req.params.id],
      );
      if (reqResult.rowCount === 0) {
        throw new Error('NOT_FOUND');
      }
      const requestRow = reqResult.rows[0];
      if (requestRow.status !== 'pending') {
        throw new Error('ALREADY_REVIEWED');
      }
      if (requestRow.requester_id === req.auth.sub) {
        throw new Error('SELF_REVIEW');
      }

      const invResult = await client.query(
        `
        SELECT id, name, current_stock, min_stock, unit
        FROM inventory_items
        WHERE id = $1
        FOR UPDATE
        `,
        [requestRow.item_id],
      );
      if (invResult.rowCount === 0) {
        throw new Error('INVENTORY_NOT_FOUND');
      }
      const item = invResult.rows[0];

      let finalStatus = review.status;
      let finalApprovedQty = null;
      if (review.status !== 'rejected') {
        const desiredQty = typeof review.approvedQty === 'number' ? review.approvedQty : requestRow.requested_qty;
        const boundedQty = Math.min(desiredQty, requestRow.requested_qty, item.current_stock);
        if (boundedQty <= 0) {
          finalStatus = 'rejected';
          finalApprovedQty = null;
        } else {
          finalApprovedQty = boundedQty;
          finalStatus = boundedQty < requestRow.requested_qty ? 'partially_approved' : 'approved';
        }
      }

      await client.query(
        `
        UPDATE inventory_requests
        SET
          status = $2,
          approved_qty = $3,
          reviewed_by = $4,
          reviewed_date = NOW(),
          review_note = COALESCE($5, review_note)
        WHERE id = $1
        `,
        [requestRow.id, finalStatus, finalApprovedQty, req.auth.name, review.reviewNote || null],
      );

      if (finalApprovedQty && finalApprovedQty > 0) {
        const nextStock = Math.max(0, item.current_stock - finalApprovedQty);
        await client.query(
          `
          UPDATE inventory_items
          SET current_stock = $2, last_updated = NOW()
          WHERE id = $1
          `,
          [item.id, nextStock],
        );
        if (item.current_stock > item.min_stock && nextStock <= item.min_stock) {
          await writeAudit(client, {
            actorId: 'system',
            actorName: 'System',
            action: 'low_stock_alert',
            target: item.id,
            details: `${item.name} reached critical stock level`,
          });
        }
      }

      await writeAudit(client, {
        actorId: req.auth.sub,
        actorName: req.auth.name,
        action:
          finalStatus === 'rejected'
            ? 'request_rejected'
            : finalStatus === 'approved'
              ? 'request_approved'
              : 'request_partially_approved',
        target: requestRow.id,
        details:
          finalStatus === 'rejected'
            ? `Rejected ${requestRow.item_name}. ${review.reviewNote || 'No reason provided'}`
            : `Approved ${finalApprovedQty}/${requestRow.requested_qty} ${requestRow.unit} for ${requestRow.item_name}`,
      });
    });
    return res.json({ ok: true });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Request not found.' });
    if (error.message === 'ALREADY_REVIEWED') return res.status(409).json({ message: 'Request already reviewed.' });
    if (error.message === 'SELF_REVIEW') return res.status(403).json({ message: 'Cannot review your own request.' });
    if (error.message === 'INVENTORY_NOT_FOUND') return res.status(404).json({ message: 'Inventory item missing.' });
    throw error;
  }
}));

app.get('/api/admin/backup/export', requireAuth, requireRole('admin'), asyncRoute(async (_req, res) => {
  const snapshot = await getSnapshot(pool);
  return res.json({
    exportedAt: new Date().toISOString(),
    app: 'Lab Inventory Management System',
    ...snapshot,
  });
}));

app.post('/api/admin/backup/import', requireAuth, requireRole('admin'), asyncRoute(async (req, res) => {
  const schema = z.object({
    users: z.array(z.any()),
    inventory: z.array(z.any()),
    requests: z.array(z.any()),
    auditLogs: z.array(z.any()),
    permissions: z.array(z.any()),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid backup payload.' });
  }
  const data = parsed.data;

  await withTransaction(async (client) => {
    await client.query('TRUNCATE TABLE inventory_requests, inventory_items, audit_logs, department_permissions, users RESTART IDENTITY CASCADE');

    for (const user of data.users) {
      await client.query(
        `
        INSERT INTO users (id, name, email, role, department, is_active, password_hash)
        VALUES ($1, $2, lower($3), $4, $5, $6, crypt($7, gen_salt('bf')))
        `,
        [
          user.id,
          user.name,
          user.email,
          user.role,
          user.department,
          Boolean(user.isActive),
          user.role === 'admin' ? 'adminset@lab01' : 'staffset@lab01',
        ],
      );
    }

    for (const p of data.permissions) {
      await client.query(
        `
        INSERT INTO department_permissions (department, can_request, can_approve, can_edit_inventory)
        VALUES ($1, $2, $3, $4)
        `,
        [p.department, Boolean(p.canRequest), Boolean(p.canApprove), Boolean(p.canEditInventory)],
      );
    }

    for (const i of data.inventory) {
      await client.query(
        `
        INSERT INTO inventory_items
        (id, name, category, department, current_stock, min_stock, unit, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, NOW()))
        `,
        [i.id, i.name, i.category, i.department, i.currentStock, i.minStock, i.unit, i.lastUpdated || null],
      );
    }

    for (const r of data.requests) {
      await client.query(
        `
        INSERT INTO inventory_requests
        (
          id, requester_id, requester_name, department, item_id, item_name,
          requested_qty, approved_qty, unit, status, priority, request_date,
          reviewed_by, reviewed_date, review_note
        )
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::timestamptz, NOW()), $13, $14::timestamptz, $15)
        `,
        [
          r.id,
          r.requesterId,
          r.requesterName,
          r.department,
          r.itemId,
          r.itemName,
          r.requestedQty,
          r.approvedQty,
          r.unit,
          r.status,
          r.priority,
          r.requestDate || null,
          r.reviewedBy,
          r.reviewedDate,
          r.reviewNote,
        ],
      );
    }

    for (const a of data.auditLogs) {
      await client.query(
        `
        INSERT INTO audit_logs (id, actor_id, actor_name, action, target, details, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()))
        `,
        [a.id, a.actorId, a.actorName, a.action, a.target, a.details, a.createdAt || null],
      );
    }

    await writeAudit(client, {
      actorId: req.auth.sub,
      actorName: req.auth.name,
      action: 'data_restore',
      target: 'system',
      details: 'System data restored from backup',
    });
  });
  return res.json({ ok: true });
}));

app.post('/api/admin/reset', requireAuth, requireRole('admin'), asyncRoute(async (_req, res) => {
  await query('SELECT reset_lab_inventory_data()');
  return res.json({ ok: true });
}));

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api|health).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.message === 'Origin not allowed by CORS.') {
    return res.status(403).json({ message: 'Request blocked by CORS policy.' });
  }
  return res.status(500).json({ message: 'Unexpected server error.' });
});

app.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`);
});
