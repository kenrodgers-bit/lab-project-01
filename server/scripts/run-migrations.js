const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const isSeedOnly = process.argv.includes('--seed');
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const selected = isSeedOnly ? files.filter((f) => f.startsWith('002_')) : files;

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map((row) => row.filename));

    for (const file of selected) {
      if (!isSeedOnly && applied.has(file)) {
        process.stdout.write(`Skipping ${file} (already applied)...\n`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      process.stdout.write(`Running ${file}...\n`);
      await client.query(sql);
      if (!isSeedOnly) {
        await client.query(
          `
          INSERT INTO schema_migrations (filename, applied_at)
          VALUES ($1, NOW())
          ON CONFLICT (filename) DO NOTHING
          `,
          [file],
        );
      }
    }
    process.stdout.write('Migrations completed.\n');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
