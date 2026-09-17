/**
 * cleanTestUsers.js — Remove all demo / test accounts
 *
 * Targets every user whose email ends with @example.com.
 * Cascades through every linked collection so nothing is orphaned.
 *
 * Safe flags:
 *   --dry-run   Preview counts without touching the DB.
 *   --force     Required for the live delete to proceed (safety gate).
 *
 * Usage:
 *   node seeds/cleanTestUsers.js --dry-run
 *   node seeds/cleanTestUsers.js --force
 */

import 'dotenv/config';
import mongoose from 'mongoose';

import User                 from '../models/User.js';
import WorkerProfile        from '../models/WorkerProfile.js';
import BusinessProfile      from '../models/BusinessProfile.js';
import WorkerOffer          from '../models/WorkerOffer.js';
import Job                  from '../models/Job.js';
import ConsultationBooking  from '../models/ConsultationBooking.js';
import ConsultationOffering from '../models/ConsultationOffering.js';
import LiveClass            from '../models/LiveClass.js';
import ShopItem             from '../models/ShopItem.js';
import ShopRequest          from '../models/ShopRequest.js';
import ShopSale             from '../models/ShopSale.js';
import Subscription         from '../models/Subscription.js';
import Notification         from '../models/Notification.js';
import ProgressPost         from '../models/ProgressPost.js';
import FeaturedRequest      from '../models/FeaturedRequest.js';
import Payout               from '../models/Payout.js';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');
const TEST_DOMAIN = '@example.com';

// ── Helpers ─────────────────────────────────────────────────────────────────
async function countOrDelete(model, filter, label, dry) {
  const count = await model.countDocuments(filter);
  if (count === 0) return 0;
  if (dry) {
    console.log(`   🔍  ${label.padEnd(28)} ${count} would be deleted`);
  } else {
    await model.deleteMany(filter);
    console.log(`   ✅  ${label.padEnd(28)} ${count} deleted`);
  }
  return count;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  if (!DRY_RUN && !FORCE) {
    console.error('❌  Safety gate: pass --force to delete, or --dry-run to preview.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Connected to MongoDB');
  console.log(DRY_RUN ? '🔍  DRY RUN — nothing will be deleted\n' : '⚠️   LIVE DELETE\n');

  // ── 1. Find all test user IDs ─────────────────────────────────────────────
  const testUsers = await User.find(
    { email: { $regex: `${TEST_DOMAIN}$`, $options: 'i' } },
    '_id email role',
  ).lean();

  if (testUsers.length === 0) {
    console.log('ℹ️   No test users found — nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${testUsers.length} test user(s) matching *${TEST_DOMAIN}:\n`);
  testUsers.forEach((u) => console.log(`   • [${u.role.padEnd(8)}] ${u.email}`));
  console.log();

  const userIds = testUsers.map((u) => u._id);

  // ── 2. Find linked worker / business profile IDs ──────────────────────────
  const workerProfiles = await WorkerProfile.find(
    { userId: { $in: userIds } }, '_id',
  ).lean();
  const workerProfileIds = workerProfiles.map((p) => p._id);

  const bizProfiles = await BusinessProfile.find(
    { userId: { $in: userIds } }, '_id',
  ).lean();
  const bizProfileIds = bizProfiles.map((p) => p._id);

  // ── 3. Cascade delete ─────────────────────────────────────────────────────
  let total = 0;

  console.log('─── Worker-linked data ──────────────────────────────────────');
  total += await countOrDelete(WorkerOffer,          { workerId:   { $in: workerProfileIds } }, 'WorkerOffer',          DRY_RUN);
  total += await countOrDelete(ConsultationOffering, { workerId:   { $in: workerProfileIds } }, 'ConsultationOffering', DRY_RUN);
  total += await countOrDelete(ProgressPost,         { workerId:   { $in: workerProfileIds } }, 'ProgressPost',         DRY_RUN);
  total += await countOrDelete(FeaturedRequest,      { workerId:   { $in: workerProfileIds } }, 'FeaturedRequest',      DRY_RUN);
  total += await countOrDelete(Payout,               { workerId:   { $in: workerProfileIds } }, 'Payout',               DRY_RUN);
  total += await countOrDelete(WorkerProfile,        { _id:        { $in: workerProfileIds } }, 'WorkerProfile',        DRY_RUN);

  console.log('\n─── Business-linked data ────────────────────────────────────');
  total += await countOrDelete(ShopItem,    { businessId: { $in: bizProfileIds } }, 'ShopItem',    DRY_RUN);
  total += await countOrDelete(ShopRequest, { businessId: { $in: bizProfileIds } }, 'ShopRequest', DRY_RUN);
  total += await countOrDelete(ShopSale,    { businessId: { $in: bizProfileIds } }, 'ShopSale',    DRY_RUN);
  total += await countOrDelete(BusinessProfile, { _id: { $in: bizProfileIds } },   'BusinessProfile', DRY_RUN);

  console.log('\n─── User-linked data ────────────────────────────────────────');
  total += await countOrDelete(Job,                 { clientId:  { $in: userIds } }, 'Job (as client)',      DRY_RUN);
  total += await countOrDelete(Job,                 { workerId:  { $in: workerProfileIds } }, 'Job (as worker)', DRY_RUN);
  total += await countOrDelete(ConsultationBooking, { clientId:  { $in: userIds } }, 'ConsultationBooking',  DRY_RUN);
  total += await countOrDelete(LiveClass,           { hostId:    { $in: userIds } }, 'LiveClass',            DRY_RUN);
  total += await countOrDelete(Subscription,        { userId:    { $in: userIds } }, 'Subscription',         DRY_RUN);
  total += await countOrDelete(Notification,        { userId:    { $in: userIds } }, 'Notification',         DRY_RUN);

  console.log('\n─── Users ───────────────────────────────────────────────────');
  total += await countOrDelete(User, { _id: { $in: userIds } }, 'User', DRY_RUN);

  // ── 4. Summary ────────────────────────────────────────────────────────────
  console.log();
  if (DRY_RUN) {
    console.log(`🔍  Dry run complete — ${total} total documents would be removed.`);
    console.log('    Run with --force to apply.\n');
  } else {
    console.log(`🎉  Done — ${total} total documents removed.`);
    console.log('    All real users and platform data are untouched.\n');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
