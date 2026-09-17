/**
 * demoReset.js — restore a public demo to its seeded state.
 *
 * A hosted demo publishes its credentials, so its data gets edited and deleted
 * by visitors. Run this on a schedule (hourly is plenty) to put it back.
 *
 *   DEMO_MODE=true node seeds/demoReset.js
 *
 * REFUSES TO RUN unless DEMO_MODE=true, because it wipes every collection.
 * That guard is deliberate: this script must never be reachable from a
 * production environment by accident.
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../.env') });

if (process.env.DEMO_MODE !== 'true') {
  console.error('✗ Refusing to run: DEMO_MODE is not "true".');
  console.error('  This script deletes every document in the database.');
  console.error('  Set DEMO_MODE=true only on a throwaway demo deployment.');
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error('✗ MONGO_URI is not set.');
  process.exit(1);
}

// Last-ditch guard against a copy-pasted production URI.
const uri = process.env.MONGO_URI;
if (/prod|production|live/i.test(uri)) {
  console.error('✗ Refusing to run: MONGO_URI looks like a production database.');
  console.error(`  Host: ${uri.replace(/\/\/[^@]*@/, '//***@')}`);
  process.exit(1);
}

const steps = [
  ['seed.js',           'core data (users, pros, businesses, jobs)'],
  ['seedGroups.js',     'category groups'],
  ['seedCategories.js', 'categories'],
];

console.log(`\n🔄 Demo reset — ${new Date().toISOString()}\n`);

for (const [script, label] of steps) {
  process.stdout.write(`  • ${label} … `);
  const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  if (r.status !== 0) {
    console.log('FAILED');
    console.error(r.stderr?.toString() || r.stdout?.toString());
    process.exit(1);
  }
  console.log('ok');
}

console.log('\n✅ Demo reset complete.\n');
