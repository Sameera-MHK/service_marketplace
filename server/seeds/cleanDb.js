/**
 * cleanDb.js — Production DB reset
 *
 * Keeps:   admin users, Categories, PlatformSettings
 * Deletes: everything else (users, profiles, jobs, bookings,
 *          live classes, shop data, payouts, notifications, etc.)
 *
 * Usage:
 *   node seeds/cleanDb.js
 *
 * Add --dry-run to preview what would be deleted without touching the DB.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

import User                from '../models/User.js';
import WorkerProfile       from '../models/WorkerProfile.js';
import BusinessProfile     from '../models/BusinessProfile.js';
import Job                 from '../models/Job.js';
import WorkerOffer         from '../models/WorkerOffer.js';
import FeaturedRequest     from '../models/FeaturedRequest.js';
import ConsultationBooking from '../models/ConsultationBooking.js';
import ConsultationOffering from '../models/ConsultationOffering.js';
import LiveClass           from '../models/LiveClass.js';
import ShopItem            from '../models/ShopItem.js';
import ShopRequest         from '../models/ShopRequest.js';
import ShopSale            from '../models/ShopSale.js';
import Payout              from '../models/Payout.js';
import Subscription        from '../models/Subscription.js';
import Notification        from '../models/Notification.js';
import ProgressPost        from '../models/ProgressPost.js';
import ContactMessage      from '../models/ContactMessage.js';
import AuditLog            from '../models/AuditLog.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function clean() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');
  if (DRY_RUN) console.log('🔍 DRY RUN — no data will be deleted\n');

  // ── Find admins (always show them so you can confirm they exist) ──────────
  const admins = await User.find({ role: 'admin' }).select('name email').lean();
  if (admins.length === 0) {
    console.error('❌ No admin user found — aborting. Create an admin first.');
    process.exit(1);
  }
  console.log(`🛡️  Admin(s) that will be KEPT:`);
  admins.forEach(a => console.log(`   • ${a.name} <${a.email}>`));
  console.log();

  // ── Collections to wipe completely ───────────────────────────────────────
  const wipeAll = [
    { model: WorkerProfile,        label: 'WorkerProfile'        },
    { model: BusinessProfile,      label: 'BusinessProfile'      },
    { model: WorkerOffer,          label: 'WorkerOffer'          },
    { model: FeaturedRequest,      label: 'FeaturedRequest'      },
    { model: Job,                  label: 'Job'                  },
    { model: ConsultationBooking,  label: 'ConsultationBooking'  },
    { model: ConsultationOffering, label: 'ConsultationOffering' },
    { model: LiveClass,            label: 'LiveClass'            },
    { model: ShopItem,             label: 'ShopItem'             },
    { model: ShopRequest,          label: 'ShopRequest'          },
    { model: ShopSale,             label: 'ShopSale'             },
    { model: Payout,               label: 'Payout'               },
    { model: Subscription,         label: 'Subscription'         },
    { model: Notification,         label: 'Notification'         },
    { model: ProgressPost,         label: 'ProgressPost'         },
    { model: ContactMessage,       label: 'ContactMessage'       },
    { model: AuditLog,             label: 'AuditLog'             },
  ];

  let totalDeleted = 0;

  for (const { model, label } of wipeAll) {
    const count = await model.countDocuments();
    if (DRY_RUN) {
      console.log(`   🗑️  ${label}: ${count} documents would be deleted`);
    } else {
      await model.deleteMany({});
      console.log(`   ✅ ${label}: ${count} deleted`);
    }
    totalDeleted += count;
  }

  // ── Users — delete all except admins ─────────────────────────────────────
  console.log();
  const nonAdminCount = await User.countDocuments({ role: { $ne: 'admin' } });
  if (DRY_RUN) {
    console.log(`   🗑️  User (non-admin): ${nonAdminCount} would be deleted`);
  } else {
    await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`   ✅ User (non-admin): ${nonAdminCount} deleted`);
  }
  totalDeleted += nonAdminCount;

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log();
  if (DRY_RUN) {
    console.log(`🔍 DRY RUN complete — ${totalDeleted} total documents would be deleted.`);
    console.log('   Run without --dry-run to apply.');
  } else {
    console.log(`🎉 DB clean complete — ${totalDeleted} total documents deleted.`);
    console.log('   Categories and PlatformSettings were left untouched.');
  }

  await mongoose.disconnect();
}

clean().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
