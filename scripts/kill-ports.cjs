#!/usr/bin/env node

const { execSync } = require('node:child_process');

const ports = process.argv.slice(2).filter(Boolean);

if (ports.length === 0) {
  process.exit(0);
}

for (const port of ports) {
  try {
    const output = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();

    if (!output) {
      continue;
    }

    const pids = output
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);

    if (pids.length === 0) {
      continue;
    }

    execSync(`kill ${pids.join(' ')}`, {
      stdio: 'ignore',
    });
  } catch (_error) {
    // Ignore missing listeners or already-stopped processes.
  }
}
