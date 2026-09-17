import express from 'express';
import WorkerProfile from '../models/WorkerProfile.js';
import BusinessProfile from '../models/BusinessProfile.js';
import FeaturedRequest from '../models/FeaturedRequest.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Category from '../models/Category.js';
import Subscription from '../models/Subscription.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import ContactMessage from '../models/ContactMessage.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { recalculateScore } from '../services/scoreService.js';
import { clearWorkerFlag, checkWorkerFlags } from '../services/flagService.js';
import * as audit from '../services/auditService.js';
import multer from 'multer';
import { uploadBuffer, deleteByUrl } from '../services/cloudinaryService.js';
import PlatformSettings from '../models/PlatformSettings.js';
import Payout from '../models/Payout.js';
import { resolveEffectiveCommission, resolveEffectiveLiveClassCommission } from '../services/commissionService.js';
import { PLANS } from '../config/plans.js';

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/jpeg|jpg|png|webp|avif/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WebP and AVIF images are allowed'));
  },
});

const router = express.Router();
router.use(authenticateToken, requireRole('admin'));

// GET /admin/analytics — revenue, MRR, churn, category breakdown, trends
router.get('/analytics', async (req, res) => {
  try {
    const now       = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [revenueAll, revenueThisMonth, revenueLastMonth] = await Promise.all([
      Subscription.aggregate([
        { $match: { status: { $in: ['active', 'expired'] } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),
      Subscription.aggregate([
        { $match: { status: { $in: ['active', 'expired'] }, activatedAt: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),
      Subscription.aggregate([
        { $match: { status: { $in: ['active', 'expired'] }, activatedAt: { $gte: lastMonth, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),
    ]);

    const [activePro, activeElite] = await Promise.all([
      WorkerProfile.countDocuments({ subscriptionPlan: 'pro',   subscriptionExpiry: { $gt: now } }),
      WorkerProfile.countDocuments({ subscriptionPlan: 'elite', subscriptionExpiry: { $gt: now } }),
    ]);
    const mrr = (activePro * PLANS.pro.price) + (activeElite * PLANS.elite.price);

    const [freePlan, proPlan, elitePlan] = await Promise.all([
      WorkerProfile.countDocuments({ subscriptionPlan: 'free' }),
      WorkerProfile.countDocuments({ subscriptionPlan: 'pro' }),
      WorkerProfile.countDocuments({ subscriptionPlan: 'elite' }),
    ]);

    const [churnThisMonth, churnLastMonth] = await Promise.all([
      Subscription.countDocuments({ status: 'expired', expiresAt: { $gte: thisMonth, $lte: now } }),
      Subscription.countDocuments({ status: 'expired', expiresAt: { $gte: lastMonth, $lte: lastMonthEnd } }),
    ]);

    const totalPaidThisMonth = activePro + activeElite + churnThisMonth;
    const churnRate = totalPaidThisMonth > 0
      ? Math.round((churnThisMonth / totalPaidThisMonth) * 100)
      : 0;

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const revenueTrend = await Subscription.aggregate([
      { $match: { status: { $in: ['active', 'expired'] }, activatedAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$activatedAt' }, month: { $month: '$activatedAt' } },
          revenue: { $sum: '$amountPaid' },
          count:   { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year  = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = revenueTrend.find((r) => r._id.year === year && r._id.month === month);
      months.push({
        label:   d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        revenue: found?.revenue || 0,
        subs:    found?.count   || 0,
      });
    }

    const workersByCategory = await WorkerProfile.aggregate([
      { $group: { _id: '$category', workers: { $sum: 1 } } },
      { $sort: { workers: -1 } },
      { $limit: 10 },
    ]);

    const jobsByCategory = await Job.aggregate([
      { $group: { _id: '$category', jobs: { $sum: 1 } } },
      { $sort: { jobs: -1 } },
      { $limit: 10 },
    ]);

    const categoryIds = [...new Set([
      ...workersByCategory.map((c) => c._id),
      ...jobsByCategory.map((c) => c._id),
    ])];
    const categoryDocs = await Category.find({ slug: { $in: categoryIds } }).select('name slug icon');
    const catName = (slug) => categoryDocs.find((c) => c.slug === slug)?.name || slug;

    const categoryStats = categoryIds.map((slug) => ({
      slug,
      name:    catName(slug),
      workers: workersByCategory.find((c) => c._id === slug)?.workers || 0,
      jobs:    jobsByCategory.find((c) => c._id === slug)?.jobs       || 0,
    })).sort((a, b) => (b.workers + b.jobs) - (a.workers + a.jobs)).slice(0, 10);

    const registrationTrend = await User.aggregate([
      { $match: { role: 'worker', createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const registrations = months.map((m, i) => {
      const d     = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const year  = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = registrationTrend.find((r) => r._id.year === year && r._id.month === month);
      return { label: m.label, count: found?.count || 0 };
    });

    res.json({
      success: true,
      data: {
        revenue: {
          allTime:   revenueAll[0]?.total       || 0,
          thisMonth: revenueThisMonth[0]?.total || 0,
          lastMonth: revenueLastMonth[0]?.total || 0,
        },
        mrr,
        plans:  { free: freePlan, pro: proPlan, elite: elitePlan },
        churn:  { thisMonth: churnThisMonth, lastMonth: churnLastMonth, rate: churnRate },
        trend:  months,
        categoryStats,
        registrations,
        activeSubscribers: activePro + activeElite,
      },
      message: 'OK',
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Content Moderation ────────────────────────────────────────────────────

router.get('/moderation', async (req, res) => {
  try {
    const [pendingBios, pendingPhotos] = await Promise.all([
      WorkerProfile.find({ bioStatus: 'pending', pendingBio: { $exists: true, $ne: '' } })
        .populate('userId', 'name email profilePhoto')
        .select('userId bio pendingBio bioStatus category'),
      WorkerProfile.find({ 'pendingPortfolioPhotos.0': { $exists: true } })
        .populate('userId', 'name email profilePhoto')
        .select('userId pendingPortfolioPhotos category'),
    ]);
    res.json({ success: true, data: { pendingBios, pendingPhotos }, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/moderation/bio/:workerId/approve', async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.params.workerId });
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Profile not found' });

    const worker = await User.findById(req.params.workerId).select('name email');

    profile.bio        = profile.pendingBio;
    profile.pendingBio = undefined;
    profile.bioStatus  = 'approved';
    await profile.save();

    await Notification.create({
      userId: profile.userId,
      type: 'score_changed',
      message: 'Your bio has been approved and is now live on your profile.',
    });

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'bio_approved',
      targetType: 'worker',
      targetId:   req.params.workerId,
      targetName: worker?.name,
      detail:     { approvedBio: profile.bio?.substring(0, 200) },
    }, req);

    res.json({ success: true, data: profile, message: 'Bio approved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/moderation/bio/:workerId/reject', async (req, res) => {
  try {
    const { reason = 'Content does not meet our community guidelines' } = req.body;
    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.params.workerId },
      { $unset: { pendingBio: '' }, bioStatus: 'rejected' },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Profile not found' });

    const worker = await User.findById(req.params.workerId).select('name');

    await Notification.create({
      userId: profile.userId,
      type: 'score_changed',
      message: `Your bio was not approved: ${reason}. Please rewrite and resubmit.`,
    });

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'bio_rejected',
      targetType: 'worker',
      targetId:   req.params.workerId,
      targetName: worker?.name,
      detail:     { reason },
    }, req);

    res.json({ success: true, data: profile, message: 'Bio rejected' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/moderation/photo/:workerId/approve', async (req, res) => {
  try {
    const { url } = req.body;
    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.params.workerId },
      {
        $pull: { pendingPortfolioPhotos: { url } },
        $push: { portfolioPhotos: url },
      },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Profile not found' });

    const worker = await User.findById(req.params.workerId).select('name');

    if (!profile.pendingPortfolioPhotos?.length) {
      await Notification.create({
        userId: profile.userId,
        type: 'score_changed',
        message: 'Your portfolio photos have been approved and are now visible to clients.',
      });
    }

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'photo_approved',
      targetType: 'worker',
      targetId:   req.params.workerId,
      targetName: worker?.name,
      detail:     { url },
    }, req);

    res.json({ success: true, data: profile, message: 'Photo approved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/moderation/photo/:workerId/reject', async (req, res) => {
  try {
    const { url, reason = 'Photo does not meet our content guidelines' } = req.body;
    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.params.workerId },
      { $pull: { pendingPortfolioPhotos: { url } } },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Profile not found' });

    const worker = await User.findById(req.params.workerId).select('name');

    await Notification.create({
      userId: profile.userId,
      type: 'score_changed',
      message: `A portfolio photo was removed: ${reason}.`,
    });

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'photo_rejected',
      targetType: 'worker',
      targetId:   req.params.workerId,
      targetName: worker?.name,
      detail:     { url, reason },
    }, req);

    res.json({ success: true, data: profile, message: 'Photo rejected' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/action-required', async (req, res) => {
  try {
    const [disputes, idPending] = await Promise.all([
      Job.find({ status: 'disputed' })
        .populate('clientId', 'name email phone')
        .populate('workerId', 'name email phone')
        .sort({ createdAt: -1 }),
      WorkerProfile.find({ 'flagReasons.type': 'nic_pending', isSuspended: false })
        .populate('userId', 'name email phone createdAt idVerified idNumber idPhotoFront idPhotoBack idSubmitted')
        .sort({ registeredAt: -1 }),
    ]);
    res.json({ success: true, data: { disputes, idPending }, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/flagged', async (req, res) => {
  try {
    const flagged = await WorkerProfile.find({ flagged: true })
      .populate('userId', 'name email phone idVerified')
      .sort({ 'flagReasons.createdAt': -1 });
    res.json({ success: true, data: flagged, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [totalWorkers, totalClients, totalJobs, openDisputes, pendingNic, flaggedWorkers, activeJobs] =
      await Promise.all([
        WorkerProfile.countDocuments(),
        User.countDocuments({ role: 'client' }),
        Job.countDocuments(),
        Job.countDocuments({ status: 'disputed' }),
        WorkerProfile.countDocuments({ 'flagReasons.type': 'nic_pending' }),
        WorkerProfile.countDocuments({ flagged: true }),
        Job.countDocuments({ status: { $in: ['accepted', 'in_progress'] } }),
      ]);
    res.json({
      success: true,
      data: { totalWorkers, totalClients, totalJobs, openDisputes, pendingNic, flaggedWorkers, activeJobs },
      message: 'OK',
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/action-count', async (req, res) => {
  try {
    const [disputes, idPending, pendingSubs, pendingContent, pendingFeatured, unreadMessages] = await Promise.all([
      Job.countDocuments({ status: 'disputed' }),
      WorkerProfile.countDocuments({ 'flagReasons.type': 'nic_pending', isSuspended: false }),
      Subscription.countDocuments({ status: 'pending' }),
      WorkerProfile.countDocuments({
        $or: [
          { bioStatus: 'pending', pendingBio: { $exists: true, $ne: '' } },
          { 'pendingPortfolioPhotos.0': { $exists: true } },
        ],
      }),
      FeaturedRequest.countDocuments({ status: 'pending' }),
      ContactMessage.countDocuments({ isRead: false }),
    ]);
    res.json({
      success: true,
      data: { total: disputes + idPending + pendingSubs + pendingContent + pendingFeatured, disputes, idPending, pendingSubs, pendingContent, pendingFeatured, unreadMessages },
      message: 'OK',
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/workers', async (req, res) => {
  try {
    const { search, category, band } = req.query;
    const profileFilter = {};
    if (category) profileFilter.category = category;
    if (band) profileFilter.scoreBand = band;

    let profiles = await WorkerProfile.find(profileFilter)
      .populate('userId', '-passwordHash')
      .sort({ skillScore: -1 });

    if (search) {
      const q = search.toLowerCase();
      profiles = profiles.filter(
        (p) =>
          p.userId?.name?.toLowerCase().includes(q) ||
          p.userId?.email?.toLowerCase().includes(q) ||
          p.userId?.phone?.includes(q)
      );
    }

    res.json({ success: true, data: profiles, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/disputes/:jobId/resolve', async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, data: null, message: 'Job not found' });

    job.disputeOutcome = req.body.outcome;
    job.status = 'completed';
    job.flagged = false;
    job.flagReason = null;
    await job.save();

    if (job.workerId) await recalculateScore(job.workerId);

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'dispute_resolved',
      targetType: 'job',
      targetId:   String(job._id),
      targetName: job.title,
      detail:     { outcome: req.body.outcome, workerId: job.workerId, clientId: job.clientId },
    }, req);

    res.json({ success: true, data: job, message: 'Dispute resolved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/workers/:id/verify-idDoc', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { idVerified: true }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, data: null, message: 'User not found' });
    await recalculateScore(req.params.id);

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'nic_verified',
      targetType: 'worker',
      targetId:   req.params.id,
      targetName: user.name,
      detail:     { idNumber: user.idNumber },
    }, req);

    res.json({ success: true, data: user, message: 'ID verified and score updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

/* ── Admin-granted subscription plan ─────────────────────────────── */
router.put('/workers/:id/subscription', async (req, res) => {
  try {
    const { plan, expiresAt } = req.body;
    if (!['free', 'pro', 'elite'].includes(plan)) {
      return res.status(400).json({ success: false, data: null, message: 'Invalid plan' });
    }
    const update = {
      subscriptionPlan:   plan,
      subscriptionExpiry: plan === 'free' ? null : (expiresAt ? new Date(expiresAt) : null),
    };
    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.params.id },
      update,
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Worker not found' });

    const worker = await User.findById(req.params.id).select('name');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'worker_subscription_granted',
      targetType: 'worker',
      targetId:   req.params.id,
      targetName: worker?.name,
      detail:     update,
    });

    res.json({ success: true, data: { subscriptionPlan: profile.subscriptionPlan, subscriptionExpiry: profile.subscriptionExpiry }, message: 'Plan updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/workers/:id/suspend', async (req, res) => {
  try {
    const reason = req.body.reason || 'Admin action';
    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.params.id },
      { isSuspended: true, suspensionReason: reason },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Worker not found' });
    await checkWorkerFlags(req.params.id);

    const worker = await User.findById(req.params.id).select('name email');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'worker_suspended',
      targetType: 'worker',
      targetId:   req.params.id,
      targetName: worker?.name,
      detail:     { reason, workerEmail: worker?.email },
    }, req);

    res.json({ success: true, data: profile, message: 'Worker suspended' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/workers/:id/reinstate', async (req, res) => {
  try {
    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.params.id },
      { isSuspended: false, suspensionReason: null },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Worker not found' });
    await recalculateScore(req.params.id);

    const worker = await User.findById(req.params.id).select('name email');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'worker_reinstated',
      targetType: 'worker',
      targetId:   req.params.id,
      targetName: worker?.name,
      detail:     { workerEmail: worker?.email },
    }, req);

    res.json({ success: true, data: profile, message: 'Worker reinstated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/workers/:id/feature', async (req, res) => {
  try {
    const { until } = req.body;
    const featuredUntil = until ? new Date(until) : null;

    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.params.id },
      { featuredUntil },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Worker not found' });

    const worker = await User.findById(req.params.id).select('name email');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     featuredUntil ? 'worker_featured' : 'worker_unfeatured',
      targetType: 'worker',
      targetId:   req.params.id,
      targetName: worker?.name,
      detail:     { featuredUntil },
    });

    res.json({ success: true, data: profile, message: featuredUntil ? 'Worker featured' : 'Featured removed' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

/* ── Per-worker feature access (consultations / live classes / shop) ── */
router.put('/workers/:id/features', async (req, res) => {
  try {
    const { consultations, liveClasses, shop } = req.body;
    const update = {};
    if (consultations !== undefined) update['features.consultations'] = !!consultations;
    if (liveClasses   !== undefined) update['features.liveClasses']   = !!liveClasses;
    if (shop          !== undefined) update['features.shop']          = !!shop;

    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.params.id },
      { $set: update },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Worker not found' });

    const worker = await User.findById(req.params.id).select('name');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'worker_features_updated',
      targetType: 'worker',
      targetId:   req.params.id,
      targetName: worker?.name,
      detail:     update,
    });

    res.json({ success: true, data: profile.features, message: 'Features updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/workers/:id/clear-flag', async (req, res) => {
  try {
    await clearWorkerFlag(req.params.id);

    const worker = await User.findById(req.params.id).select('name email');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'worker_flag_cleared',
      targetType: 'worker',
      targetId:   req.params.id,
      targetName: worker?.name,
      detail:     { workerEmail: worker?.email },
    }, req);

    res.json({ success: true, data: null, message: 'Flag cleared' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Consultations: platform settings ───────────────────────────────────────

// ── Live-class commission settings ───────────────────────────────────────────
router.get('/settings/live-classes', async (req, res) => {
  try {
    const settings = await PlatformSettings.get();
    res.json({
      success: true,
      data: {
        defaultCommissionPercent: settings.liveClassDefaultCommissionPercent ?? 12,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/settings/live-classes', async (req, res) => {
  try {
    const settings = await PlatformSettings.get();
    if (req.body.defaultCommissionPercent !== undefined) {
      const v = Number(req.body.defaultCommissionPercent);
      if (Number.isNaN(v) || v < 0 || v > 100) {
        return res.status(400).json({ success: false, message: 'Percent must be 0–100' });
      }
      settings.liveClassDefaultCommissionPercent = v;
    }
    settings.updatedAt = new Date();
    settings.updatedBy = req.user.id;
    await settings.save();
    res.json({ success: true, data: { defaultCommissionPercent: settings.liveClassDefaultCommissionPercent } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Shop Settings ──────────────────────────────────────────────────────────
router.get('/settings/shop', async (req, res) => {
  try {
    const settings = await PlatformSettings.get();
    res.json({
      success: true,
      data: {
        defaultCommissionPercent: settings.shopDefaultCommissionPercent ?? 15,
        freeSellingCount:         settings.shopFreeSellingCount         ?? 2,
        updatedAt:                settings.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/settings/shop', async (req, res) => {
  try {
    const settings = await PlatformSettings.get();

    if (req.body.defaultCommissionPercent !== undefined) {
      const v = Number(req.body.defaultCommissionPercent);
      if (Number.isNaN(v) || v < 0 || v > 100)
        return res.status(400).json({ success: false, message: 'Percent must be 0–100' });
      settings.shopDefaultCommissionPercent = v;
    }
    if (req.body.freeSellingCount !== undefined) {
      const v = Number(req.body.freeSellingCount);
      if (Number.isNaN(v) || v < 0 || v > 100)
        return res.status(400).json({ success: false, message: 'Free count must be 0–100' });
      settings.shopFreeSellingCount = v;
    }

    settings.updatedAt = new Date();
    settings.updatedBy = req.user.id;
    await settings.save();
    res.json({
      success: true,
      data: {
        defaultCommissionPercent: settings.shopDefaultCommissionPercent,
        freeSellingCount:         settings.shopFreeSellingCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Per-worker shop commission override
router.put('/workers/:id/shop-commission-override', async (req, res) => {
  try {
    const { percent, expiresAt, note } = req.body;
    if (percent == null || percent < 0 || percent > 100)
      return res.status(400).json({ success: false, message: 'Percent must be 0–100' });

    const profile = await WorkerProfile.findOne({ userId: req.params.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Worker profile not found' });

    profile.shopCommissionOverride = {
      percent: Number(percent),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      note: note || '',
      setBy: req.user.id,
      setAt: new Date(),
    };
    await profile.save();
    res.json({ success: true, data: profile.shopCommissionOverride });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/workers/:id/shop-commission-override', async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.params.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Worker not found' });
    profile.shopCommissionOverride = undefined;
    await profile.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Effective shop commission for a worker (for admin display) ─────────────
router.get('/workers/:id/effective-shop-commission', async (req, res) => {
  try {
    const { resolveShopCommission } = await import('../services/commissionService.js');
    const result = await resolveShopCommission(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/settings/consultations', async (req, res) => {
  try {
    const settings = await PlatformSettings.get();
    res.json({
      success: true,
      data: {
        defaultCommissionPercent: settings.consultationDefaultCommissionPercent,
        volumeTiers:              settings.consultationVolumeTiers,
        updatedAt:                settings.updatedAt,
      },
      message: 'OK',
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/settings/consultations', async (req, res) => {
  try {
    const settings = await PlatformSettings.get();
    const before = {
      defaultCommissionPercent: settings.consultationDefaultCommissionPercent,
      volumeTiers:              settings.consultationVolumeTiers,
    };

    if (req.body.defaultCommissionPercent !== undefined) {
      const v = Number(req.body.defaultCommissionPercent);
      if (Number.isNaN(v) || v < 0 || v > 100) {
        return res.status(400).json({ success: false, data: null, message: 'Default percent must be 0–100' });
      }
      settings.consultationDefaultCommissionPercent = v;
    }
    if (req.body.volumeTiers !== undefined) {
      const vt = req.body.volumeTiers;
      if (typeof vt.enabled === 'boolean') settings.consultationVolumeTiers.enabled = vt.enabled;
      if (Array.isArray(vt.tiers)) {
        const cleaned = vt.tiers
          .map((t) => ({ minSessions: Number(t.minSessions), percent: Number(t.percent) }))
          .filter((t) => !Number.isNaN(t.minSessions) && !Number.isNaN(t.percent))
          .sort((a, b) => a.minSessions - b.minSessions);
        settings.consultationVolumeTiers.tiers = cleaned;
      }
    }
    settings.updatedAt = new Date();
    settings.updatedBy = req.user.id;
    await settings.save();

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'consultation_settings_updated',
      targetType: 'settings',
      targetId:   'singleton',
      targetName: 'Consultation settings',
      detail:     { before, after: {
        defaultCommissionPercent: settings.consultationDefaultCommissionPercent,
        volumeTiers:              settings.consultationVolumeTiers,
      } },
    }, req);

    res.json({ success: true, data: settings, message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Consultations: per-Pro commission override ─────────────────────────────

router.get('/workers/:id/effective-commission', async (req, res) => {
  try {
    const result = await resolveEffectiveCommission(req.params.id);
    res.json({ success: true, data: result, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/workers/:id/commission-override', async (req, res) => {
  try {
    const { percent, expiresAt, note } = req.body;
    if (percent == null) {
      return res.status(400).json({ success: false, data: null, message: 'percent required' });
    }
    const p = Number(percent);
    if (Number.isNaN(p) || p < 0 || p > 100) {
      return res.status(400).json({ success: false, data: null, message: 'percent must be 0–100' });
    }

    const profile = await WorkerProfile.findOne({ userId: req.params.id });
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Worker not found' });

    const previous = profile.commissionOverride;

    profile.commissionOverride = {
      percent:   p,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      note:      note || '',
      setBy:     req.user.id,
      setAt:     new Date(),
    };
    await profile.save();

    const worker = await User.findById(req.params.id).select('name email');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'commission_override_set',
      targetType: 'worker',
      targetId:   req.params.id,
      targetName: worker?.name,
      detail:     { before: previous, after: profile.commissionOverride },
    }, req);

    res.json({ success: true, data: profile.commissionOverride, message: 'Override set' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.delete('/workers/:id/commission-override', async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.params.id });
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Worker not found' });

    const previous = profile.commissionOverride;
    profile.commissionOverride = undefined;
    await profile.save();

    const worker = await User.findById(req.params.id).select('name email');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'commission_override_removed',
      targetType: 'worker',
      targetId:   req.params.id,
      targetName: worker?.name,
      detail:     { previous },
    }, req);

    res.json({ success: true, data: null, message: 'Override removed' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Live classes: per-worker commission override ───────────────────────────

router.get('/workers/:id/effective-live-class-commission', async (req, res) => {
  try {
    const result = await resolveEffectiveLiveClassCommission(req.params.id);
    res.json({ success: true, data: result, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/workers/:id/live-class-commission-override', async (req, res) => {
  try {
    const { percent, expiresAt, note } = req.body;
    if (percent == null) {
      return res.status(400).json({ success: false, data: null, message: 'percent required' });
    }
    const p = Number(percent);
    if (Number.isNaN(p) || p < 0 || p > 100) {
      return res.status(400).json({ success: false, data: null, message: 'percent must be 0–100' });
    }

    const profile = await WorkerProfile.findOne({ userId: req.params.id });
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Worker not found' });

    const previous = profile.liveClassCommissionOverride;
    profile.liveClassCommissionOverride = {
      percent:   p,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      note:      note || '',
      setBy:     req.user.id,
      setAt:     new Date(),
    };
    await profile.save();

    const worker = await User.findById(req.params.id).select('name email');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'live_class_commission_override_set',
      targetType: 'worker',
      targetId:   req.params.id,
      targetName: worker?.name,
      detail:     { before: previous, after: profile.liveClassCommissionOverride },
    }, req);

    res.json({ success: true, data: profile.liveClassCommissionOverride, message: 'Live class override set' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.delete('/workers/:id/live-class-commission-override', async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.params.id });
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Worker not found' });

    const previous = profile.liveClassCommissionOverride;
    profile.liveClassCommissionOverride = undefined;
    await profile.save();

    const worker = await User.findById(req.params.id).select('name email');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'live_class_commission_override_removed',
      targetType: 'worker',
      targetId:   req.params.id,
      targetName: worker?.name,
      detail:     { previous },
    }, req);

    res.json({ success: true, data: null, message: 'Live class override removed' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Consultations: payouts queue ───────────────────────────────────────────

router.get('/payouts', async (req, res) => {
  try {
    const { status = 'pending', limit = 100 } = req.query;
    const filter = status === 'all' ? {} : { status };
    const payouts = await Payout.find(filter)
      .populate('workerId', 'name email phone')
      .populate('processedBy', 'name')
      .sort({ requestedAt: status === 'pending' ? 1 : -1 })
      .limit(Number(limit));
    res.json({ success: true, data: payouts, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/payouts/:id/process', async (req, res) => {
  try {
    const { transactionRef, adminNote } = req.body;
    const payout = await Payout.findById(req.params.id);
    if (!payout)                            return res.status(404).json({ success: false, data: null, message: 'Payout not found' });
    if (payout.status !== 'pending' && payout.status !== 'processing') {
      return res.status(400).json({ success: false, data: null, message: `Cannot process a payout in '${payout.status}' state` });
    }

    payout.status         = 'completed';
    payout.processedAt    = new Date();
    payout.processedBy    = req.user.id;
    payout.transactionRef = transactionRef || '';
    payout.adminNote      = adminNote || '';
    await payout.save();

    const profile = await WorkerProfile.findOne({ userId: payout.workerId });
    if (profile) {
      const pending = profile.pendingBalances.get(payout.currency) || 0;
      profile.pendingBalances.set(payout.currency, Math.max(0, pending - payout.amount));
      await profile.save();
    }

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'payout_processed',
      targetType: 'payout',
      targetId:   String(payout._id),
      targetName: `${payout.amount} ${payout.currency}`,
      detail:     { workerId: String(payout.workerId), transactionRef, method: payout.method },
    }, req);

    res.json({ success: true, data: payout, message: 'Payout marked as completed' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/payouts/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const payout = await Payout.findById(req.params.id);
    if (!payout)                          return res.status(404).json({ success: false, data: null, message: 'Payout not found' });
    if (payout.status !== 'pending')      return res.status(400).json({ success: false, data: null, message: 'Only pending payouts can be rejected' });

    payout.status          = 'rejected';
    payout.processedAt     = new Date();
    payout.processedBy     = req.user.id;
    payout.rejectionReason = reason || '';
    await payout.save();

    const profile = await WorkerProfile.findOne({ userId: payout.workerId });
    if (profile) {
      const pending = profile.pendingBalances.get(payout.currency) || 0;
      const available = profile.availableBalances.get(payout.currency) || 0;
      profile.pendingBalances.set(payout.currency,   Math.max(0, pending - payout.amount));
      profile.availableBalances.set(payout.currency, available + payout.amount);
      await profile.save();
    }

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'payout_rejected',
      targetType: 'payout',
      targetId:   String(payout._id),
      targetName: `${payout.amount} ${payout.currency}`,
      detail:     { workerId: String(payout.workerId), reason },
    }, req);

    res.json({ success: true, data: payout, message: 'Payout rejected and refunded' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Categories ────────────────────────────────────────────────────────────

router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, data: categories, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, icon, group } = req.body;
    if (!name) return res.status(400).json({ success: false, data: null, message: 'Name required' });

    const slug = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const exists = await Category.findOne({ slug });
    if (exists) return res.status(400).json({ success: false, data: null, message: 'Category already exists' });

    const category = await Category.create({ name: name.trim(), slug, icon: icon || '🔧', group: group || 'home_construction' });

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'category_created',
      targetType: 'category',
      targetId:   String(category._id),
      targetName: category.name,
      detail:     { slug: category.slug, icon: category.icon, group: category.group },
    }, req);

    res.status(201).json({ success: true, data: category, message: 'Category created' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const before = await Category.findById(req.params.id);
    if (!before) return res.status(404).json({ success: false, data: null, message: 'Not found' });

    const updates = {};
    if (req.body.name !== undefined) {
      updates.name = req.body.name.trim();
      updates.slug = req.body.name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
    if (req.body.icon !== undefined) updates.icon = req.body.icon;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.group !== undefined) updates.group = req.body.group;
    if (req.body.coverImage !== undefined) updates.coverImage = req.body.coverImage;
    if (req.body.consultationsEligible !== undefined) updates.consultationsEligible = req.body.consultationsEligible;
    if (req.body.liveClassesEligible   !== undefined) updates.liveClassesEligible   = req.body.liveClassesEligible;
    if (req.body.shopEligible          !== undefined) updates.shopEligible          = req.body.shopEligible;
    if (req.body.defaultCommissionPercent !== undefined) {
      const v = req.body.defaultCommissionPercent;
      updates.defaultCommissionPercent = v === null || v === '' ? null : Number(v);
    }

    const category = await Category.findByIdAndUpdate(req.params.id, updates, { new: true });

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'category_updated',
      targetType: 'category',
      targetId:   req.params.id,
      targetName: category.name,
      detail:     {
        before: { name: before.name, icon: before.icon, isActive: before.isActive, group: before.group },
        after:  { name: category.name, icon: category.icon, isActive: category.isActive, group: category.group },
      },
    }, req);

    res.json({ success: true, data: category, message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.post('/categories/:id/cover', coverUpload.single('coverImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, data: null, message: 'No file uploaded' });

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, data: null, message: 'Not found' });

    const url = await uploadBuffer(req.file.buffer, `${process.env.CLOUDINARY_FOLDER || 'skillhub'}/category-covers`, {
      transformation: [
        { width: 1600, height: 900, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    const previous = category.coverImage;
    category.coverImage = url;
    await category.save();

    if (previous) await deleteByUrl(previous);

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'category_cover_updated',
      targetType: 'category',
      targetId:   String(category._id),
      targetName: category.name,
      detail:     { coverImage: category.coverImage },
    }, req);

    res.json({ success: true, data: category, message: 'Cover image updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.delete('/categories/:id/cover', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, data: null, message: 'Not found' });

    const previous = category.coverImage;
    category.coverImage = '';
    await category.save();

    if (previous) await deleteByUrl(previous);

    res.json({ success: true, data: category, message: 'Cover image removed' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, data: null, message: 'Not found' });

    const inUse = await WorkerProfile.countDocuments({ category: category.slug });
    if (inUse > 0) {
      return res.status(400).json({
        success: false, data: null,
        message: `Cannot delete — ${inUse} worker(s) are registered under this category. Deactivate it instead.`,
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'category_deleted',
      targetType: 'category',
      targetId:   req.params.id,
      targetName: category.name,
      detail:     { slug: category.slug },
    }, req);

    res.json({ success: true, data: null, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Audit Log ─────────────────────────────────────────────────────────────

router.get('/audit', async (req, res) => {
  try {
    const { action, adminId, targetId, page = 1, limit = 50 } = req.query;
    const PAGE  = Math.max(1, parseInt(page, 10) || 1);
    const LIMIT = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const SKIP  = (PAGE - 1) * LIMIT;

    const filter = {};
    if (action)   filter.action   = action;
    if (adminId)  filter.adminId  = adminId;
    if (targetId) filter.targetId = targetId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(SKIP)
        .limit(LIMIT),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page: PAGE, limit: LIMIT, total, pages: Math.ceil(total / LIMIT) },
      message: 'OK',
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Featured Requests ─────────────────────────────────────────────────────

router.get('/featured-requests', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const filter = status === 'all' ? {} : { status };
    const requests = await FeaturedRequest.find(filter)
      .sort({ requestedAt: -1 })
      .populate('workerId', 'name email profilePhoto')
      .populate('reviewedBy', 'name');
    res.json({ success: true, data: requests, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/featured-requests/:id/approve', async (req, res) => {
  try {
    const request = await FeaturedRequest.findById(req.params.id).populate('workerId', 'name email');
    if (!request) return res.status(404).json({ success: false, data: null, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, data: null, message: 'Request already reviewed' });

    const DAYS = { '1_week': 7, '2_weeks': 14, '1_month': 30 };
    const featuredUntil = new Date(Date.now() + DAYS[request.period] * 86_400_000);

    await Promise.all([
      FeaturedRequest.findByIdAndUpdate(req.params.id, {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      }),
      WorkerProfile.findOneAndUpdate(
        { userId: request.workerId._id },
        { featuredUntil }
      ),
      Notification.create({
        userId: request.workerId._id,
        type: 'job_accepted',
        message: `🌟 Your featured listing has been activated! You'll appear on the landing page until ${featuredUntil.toLocaleDateString()}.`,
      }),
    ]);

    await audit.log({
      adminId: req.user.id, adminEmail: req.user.email,
      action: 'featured_request_approved', targetType: 'worker',
      targetId: request.workerId._id, targetName: request.workerId.name,
      detail: { period: request.period, amount: request.amount, featuredUntil },
    });

    res.json({ success: true, data: null, message: 'Featured listing activated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/featured-requests/:id/reject', async (req, res) => {
  try {
    const { reason = 'Payment could not be verified' } = req.body;
    const request = await FeaturedRequest.findById(req.params.id).populate('workerId', 'name email');
    if (!request) return res.status(404).json({ success: false, data: null, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, data: null, message: 'Request already reviewed' });

    await Promise.all([
      FeaturedRequest.findByIdAndUpdate(req.params.id, {
        status: 'rejected',
        rejectedReason: reason,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      }),
      Notification.create({
        userId: request.workerId._id,
        type: 'score_changed',
        message: `Your featured listing request was not approved. Reason: ${reason}. Please contact support if you need help.`,
      }),
    ]);

    await audit.log({
      adminId: req.user.id, adminEmail: req.user.email,
      action: 'featured_request_rejected', targetType: 'worker',
      targetId: request.workerId._id, targetName: request.workerId.name,
      detail: { reason },
    });

    res.json({ success: true, data: null, message: 'Request rejected' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Business admin routes ────────────────────────────────────────────────────

router.get('/businesses', async (req, res) => {
  try {
    const { search } = req.query;
    let profiles = await BusinessProfile.find({})
      .populate('userId', '-passwordHash')
      .sort({ createdAt: -1 });

    if (search) {
      const q = search.toLowerCase();
      profiles = profiles.filter(
        (p) =>
          p.businessName?.toLowerCase().includes(q) ||
          p.userId?.email?.toLowerCase().includes(q) ||
          p.userId?.phone?.includes(q) ||
          p.district?.toLowerCase().includes(q)
      );
    }
    res.json({ success: true, data: profiles, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/businesses/:id/verify', async (req, res) => {
  try {
    const profile = await BusinessProfile.findOne({ userId: req.params.id });
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Not found' });
    profile.isVerified = !profile.isVerified;
    await profile.save();
    await audit.log({
      adminId: req.user.id, adminEmail: req.user.email,
      action: profile.isVerified ? 'business_verified' : 'business_unverified',
      targetType: 'business', targetId: req.params.id, targetName: profile.businessName,
    });
    res.json({ success: true, data: profile, message: profile.isVerified ? 'Verified' : 'Unverified' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/businesses/:id/suspend', async (req, res) => {
  try {
    const profile = await BusinessProfile.findOneAndUpdate(
      { userId: req.params.id },
      { isSuspended: true },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Not found' });
    await audit.log({
      adminId: req.user.id, adminEmail: req.user.email,
      action: 'business_suspended', targetType: 'business',
      targetId: req.params.id, targetName: profile.businessName,
    });
    res.json({ success: true, data: profile, message: 'Business suspended' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/businesses/:id/reinstate', async (req, res) => {
  try {
    const profile = await BusinessProfile.findOneAndUpdate(
      { userId: req.params.id },
      { isSuspended: false },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Not found' });
    await audit.log({
      adminId: req.user.id, adminEmail: req.user.email,
      action: 'business_reinstated', targetType: 'business',
      targetId: req.params.id, targetName: profile.businessName,
    });
    res.json({ success: true, data: profile, message: 'Business reinstated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/businesses/:id/feature', async (req, res) => {
  try {
    const { until } = req.body;
    const profile = await BusinessProfile.findOneAndUpdate(
      { userId: req.params.id },
      { featuredUntil: until ? new Date(until) : null },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Not found' });
    await audit.log({
      adminId: req.user.id, adminEmail: req.user.email,
      action: until ? 'business_featured' : 'business_unfeatured',
      targetType: 'business', targetId: req.params.id, targetName: profile.businessName,
      detail: { until },
    });
    res.json({ success: true, data: profile, message: 'Updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

export default router;
