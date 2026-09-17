import WorkerProfile from '../models/WorkerProfile.js';
import Category from '../models/Category.js';
import PlatformSettings from '../models/PlatformSettings.js';
import ConsultationBooking from '../models/ConsultationBooking.js';
import ShopItem    from '../models/ShopItem.js';
import ShopRequest from '../models/ShopRequest.js';

export async function resolveEffectiveCommission(workerUserId) {
  const settings = await PlatformSettings.get();
  const platformDefault = settings.consultationDefaultCommissionPercent ?? 15;

  const profile = await WorkerProfile.findOne({ userId: workerUserId }).lean();
  if (!profile) {
    return { percent: platformDefault, source: 'platform_default', detail: { platformDefault } };
  }

  const override = profile.commissionOverride;
  if (override?.percent != null) {
    const stillValid = !override.expiresAt || override.expiresAt > new Date();
    if (stillValid) {
      return {
        percent: override.percent,
        source:  'pro_override',
        detail:  { note: override.note, expiresAt: override.expiresAt },
      };
    }
  }

  if (settings.consultationVolumeTiers?.enabled) {
    const tiers = (settings.consultationVolumeTiers.tiers || [])
      .slice()
      .sort((a, b) => b.minSessions - a.minSessions);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const completedThisMonth = await ConsultationBooking.countDocuments({
      workerId: workerUserId,
      status:   { $in: ['completed', 'in_progress'] },
      startsAt: { $gte: monthStart },
    });

    const matched = tiers.find((t) => completedThisMonth >= t.minSessions);
    if (matched) {
      const category = await Category.findOne({ slug: profile.category }).lean();
      const baseline = category?.defaultCommissionPercent ?? platformDefault;

      if (matched.percent < baseline) {
        return {
          percent: matched.percent,
          source:  'volume_tier',
          detail:  { sessionsThisMonth: completedThisMonth, minSessions: matched.minSessions },
        };
      }
    }
  }

  const category = await Category.findOne({ slug: profile.category }).lean();
  if (category?.defaultCommissionPercent != null) {
    return {
      percent: category.defaultCommissionPercent,
      source:  'category_default',
      detail:  { categorySlug: category.slug },
    };
  }

  return { percent: platformDefault, source: 'platform_default', detail: { platformDefault } };
}

/**
 * Resolve the live-class commission rate for a worker.
 * Checks (in order): per-worker override → category default → platform default.
 */
export async function resolveEffectiveLiveClassCommission(workerUserId) {
  const settings = await PlatformSettings.get();
  const platformDefault = settings.liveClassDefaultCommissionPercent ?? 12;

  const profile = await WorkerProfile.findOne({ userId: workerUserId }).lean();
  if (!profile) return { percent: platformDefault, source: 'platform_default' };

  // 1. Per-worker live-class-specific override (checked first)
  const lcOverride = profile.liveClassCommissionOverride;
  if (lcOverride?.percent != null) {
    const stillValid = !lcOverride.expiresAt || lcOverride.expiresAt > new Date();
    if (stillValid) {
      return {
        percent: lcOverride.percent,
        source:  'live_class_override',
        detail:  { note: lcOverride.note, expiresAt: lcOverride.expiresAt },
      };
    }
  }

  // 2. Blanket per-worker override (shared with consultations — fallback)
  const override = profile.commissionOverride;
  if (override?.percent != null) {
    const stillValid = !override.expiresAt || override.expiresAt > new Date();
    if (stillValid) {
      return {
        percent: override.percent,
        source:  'pro_override',
        detail:  { note: override.note, expiresAt: override.expiresAt },
      };
    }
  }

  // 3. Category default
  const category = await Category.findOne({ slug: profile.category }).lean();
  if (category?.defaultCommissionPercent != null) {
    return { percent: category.defaultCommissionPercent, source: 'category_default' };
  }

  // 4. Platform default
  return { percent: platformDefault, source: 'platform_default' };
}

export function computeSplit({ price, percent }) {
  const commissionAmount = Math.round((price * percent) / 100 * 100) / 100;
  const proPayout        = Math.round((price - commissionAmount) * 100) / 100;
  return { commissionAmount, proPayout };
}

/**
 * Resolve shop commission for a worker.
 *
 * Logic (in order):
 *   1. Count lifetime sales (ShopItem.soldCount sum + completed ShopRequests).
 *   2. If sales < shopFreeSellingCount → 0% (free introductory period).
 *   3. Per-worker shopCommissionOverride (set by admin).
 *   4. Platform default (shopDefaultCommissionPercent).
 *
 * Returns:
 *   { percent, isFree, salesSoFar, freeUntil, source }
 */
export async function resolveShopCommission(workerUserId) {
  const settings    = await PlatformSettings.get();
  const freeCount   = settings.shopFreeSellingCount         ?? 2;
  const defaultRate = settings.shopDefaultCommissionPercent ?? 15;

  // Count total completed shop sales for this worker
  const items = await ShopItem.find({ workerId: workerUserId }, 'soldCount').lean();
  const itemSales = items.reduce((sum, i) => sum + (i.soldCount || 0), 0);

  const commissionSales = await ShopRequest.countDocuments({
    workerId: workerUserId,
    status: { $in: ['paid', 'in_progress', 'completed'] },
  });

  const salesSoFar = itemSales + commissionSales;

  // Free introductory period
  if (salesSoFar < freeCount) {
    return { percent: 0, isFree: true, salesSoFar, freeUntil: freeCount, source: 'free_intro' };
  }

  // Per-worker override (admin-set)
  const profile = await WorkerProfile.findOne({ userId: workerUserId }).lean();
  const override = profile?.shopCommissionOverride;
  if (override?.percent != null) {
    const stillValid = !override.expiresAt || override.expiresAt > new Date();
    if (stillValid) {
      return {
        percent: override.percent,
        isFree: false,
        salesSoFar,
        freeUntil: freeCount,
        source: 'override',
        note: override.note,
      };
    }
  }

  return { percent: defaultRate, isFree: false, salesSoFar, freeUntil: freeCount, source: 'platform_default' };
}
