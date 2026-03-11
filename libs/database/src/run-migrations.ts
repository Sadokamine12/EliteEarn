import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

function loadEnvFile(filename: string): void {
  const filePath = join(process.cwd(), filename);

  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

async function run(): Promise<void> {
  loadEnvFile('.env');
  loadEnvFile('.env.local');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationDirectory = join(process.cwd(), 'migrations');
    const filenames = readdirSync(migrationDirectory)
      .filter((filename) => filename.endsWith('.sql'))
      .sort();

    const appliedResult = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations',
    );
    const applied = new Set(appliedResult.rows.map((row) => row.filename));

    for (const filename of filenames) {
      if (applied.has(filename)) {
        continue;
      }

      const sql = readFileSync(join(migrationDirectory, filename), 'utf8');
      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename],
        );
        await client.query('COMMIT');
        console.log(`Applied migration ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
