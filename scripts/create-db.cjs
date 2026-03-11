const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

for (const name of ['.env', '.env.local']) {
  const filePath = path.join(process.cwd(), name);
  if (!fs.existsSync(filePath)) continue;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const adminUrl = new URL(databaseUrl);
const dbName = adminUrl.pathname.replace(/^\//, '');
adminUrl.pathname = '/postgres';

(async () => {
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();

  try {
    const exists = await client.query('select 1 from pg_database where datname = $1', [dbName]);
    if (exists.rowCount) {
      console.log(`exists=${dbName}`);
      return;
    }

    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`created=${dbName}`);
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
