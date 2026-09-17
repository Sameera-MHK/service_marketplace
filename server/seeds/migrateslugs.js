/**
 * One-time migration: backfill slug for any WorkerProfile or BusinessProfile
 * that was created before the slug field was added.
 *
 *   cd server && node seeds/migrateslugs.js
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkerProfile   from '../models/WorkerProfile.js';
import BusinessProfile from '../models/BusinessProfile.js';
import User            from '../models/User.js';
import { generateSlug } from '../utils/slugify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../.env') });

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('No MongoDB URI found. Set MONGO_URI in .env');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  // ── Workers ────────────────────────────────────────────────────────────────
  const workers = await WorkerProfile.find({ slug: { $in: [null, '', undefined] } })
    .populate('userId', 'name location');

  console.log(`Workers without slug: ${workers.length}`);
  let wOk = 0;
  for (const p of workers) {
    try {
      const slug = generateSlug(
        p.userId?.name || '',
        p.category || '',
        p.userId?.location?.district || ''
      );
      await WorkerProfile.updateOne({ _id: p._id }, { $set: { slug } });
      wOk++;
    } catch (e) {
      console.warn(`  skip worker ${p._id}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${wOk} workers updated\n`);

  // ── Businesses ─────────────────────────────────────────────────────────────
  const businesses = await BusinessProfile.find({ slug: { $in: [null, '', undefined] } });

  console.log(`Businesses without slug: ${businesses.length}`);
  let bOk = 0;
  for (const p of businesses) {
    try {
      const slug = generateSlug(
        p.businessName || '',
        p.businessType?.replace(/_/g, ' ') || '',
        p.district || ''
      );
      await BusinessProfile.updateOne({ _id: p._id }, { $set: { slug } });
      bOk++;
    } catch (e) {
      console.warn(`  skip business ${p._id}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${bOk} businesses updated\n`);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((e) => { console.error(e); process.exit(1); });
