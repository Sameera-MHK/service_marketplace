/**
 * addBusinessPhotos.js
 *
 * Backfills the `photos` gallery array on any BusinessProfile that currently
 * has fewer than 2 photos. Uses curated Unsplash URLs grouped by businessType.
 *
 * Safe to run multiple times — only touches profiles with empty / thin galleries.
 *
 * Usage:
 *   node seeds/addBusinessPhotos.js            ← live update
 *   node seeds/addBusinessPhotos.js --dry-run  ← preview only
 *   node seeds/addBusinessPhotos.js --overwrite ← replace even existing galleries
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import BusinessProfile from '../models/BusinessProfile.js';

const DRY       = process.argv.includes('--dry-run');
const OVERWRITE = process.argv.includes('--overwrite');

// ── Photo sets by businessType ────────────────────────────────────────────────
const PHOTOS = {
  salon: [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600',
    'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600',
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600',
    'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600',
  ],
  barbershop: [
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600',
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600',
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600',
    'https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600',
  ],
  repair_shop: [
    'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=600',
    'https://images.unsplash.com/photo-1601972599720-36938d4ecd31?w=600',
    'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600',
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600',
  ],
  catering: [
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600',
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
  ],
  photography_studio: [
    'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600',
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600',
    'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=600',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600',
  ],
  cleaning_company: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600',
    'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600',
    'https://images.unsplash.com/photo-1527515545081-5db817172677?w=600',
    'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=600',
  ],
  tutoring_centre: [
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600',
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600',
  ],
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
    'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600',
  ],
  agency: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
  ],
  other: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600',
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600',
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600',
  ],
};

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGO_URI in .env');
  await mongoose.connect(uri);
  console.log('✅  MongoDB connected');

  const businesses = await BusinessProfile.find({}, '_id businessName businessType photos').lean();
  console.log(`🏪  ${businesses.length} business profiles found\n`);

  let updated = 0, skipped = 0;

  for (const biz of businesses) {
    const hasPhotos = Array.isArray(biz.photos) && biz.photos.length >= 2;

    if (hasPhotos && !OVERWRITE) {
      console.log(`⏭️   ${biz.businessName?.padEnd(35)} already has ${biz.photos.length} photos`);
      skipped++;
      continue;
    }

    const photoSet = PHOTOS[biz.businessType] || PHOTOS.other;

    if (DRY) {
      console.log(`🔍  (dry) ${biz.businessName?.padEnd(35)} ← ${photoSet.length} ${biz.businessType} photos`);
    } else {
      await BusinessProfile.updateOne({ _id: biz._id }, { $set: { photos: photoSet } });
      console.log(`✓   ${biz.businessName?.padEnd(35)} ← ${photoSet.length} photos`);
    }
    updated++;
  }

  console.log(`\n${'─'.repeat(45)}`);
  console.log(`✅  Updated  : ${updated}`);
  console.log(`⏭️   Skipped  : ${skipped}  (already had photos)`);
  console.log(`${'─'.repeat(45)}`);
  if (DRY) console.log('\n🔍  DRY RUN — nothing was saved.\n');

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
