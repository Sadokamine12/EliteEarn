import { existsSync, readFileSync } from 'node:fs';
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
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const result = await pool.query<{ current_user: string; current_database: string }>(
      'select current_user, current_database()'
    );

    const row = result.rows[0];
    console.log(`user=${row.current_user}`);
    console.log(`database=${row.current_database}`);
    console.log('status=ok');
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
