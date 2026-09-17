/**
 * Progress posts — anonymized "live work" feed for Pros and Businesses.
 *
 * Public:
 *   GET  /api/progress-posts/pulse/worker/:slug
 *   GET  /api/progress-posts/pulse/business/:slug
 *
 * Auth (poster):
 *   POST   /api/progress-posts                      — create (multipart, up to 4 photos)
 *   GET    /api/progress-posts/me                   — list own posts
 *   DELETE /api/progress-posts/:id                  — delete own (or admin)
 *
 * Auth (admin):
 *   GET    /api/progress-posts/admin/all            — moderation queue
 *   PATCH  /api/progress-posts/admin/:id            — flag/remove
 */
import express from 'express';
import ProgressPost from '../models/ProgressPost.js';
import Job from '../models/Job.js';
import WorkerProfile from '../models/WorkerProfile.js';
import BusinessProfile from '../models/BusinessProfile.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { upload, fileUrl } from '../middleware/upload.js';

const router = express.Router();

const DAY_MS  = 86_400_000;
const WINDOW_30 = () => new Date(Date.now() - 30 * DAY_MS);
const WINDOW_7  = () => new Date(Date.now() - 7 * DAY_MS);

function publicShape(doc) {
  return {
    _id:       doc._id,
    category:  doc.category,
    district:  doc.district,
    photos:    doc.photos,
    caption:   doc.caption,
    createdAt: doc.createdAt,
  };
}

/* ── GET /pulse/worker/:slug — public live-pulse for a worker ────────── */
router.get('/pulse/worker/:slug', optionalAuth, async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ slug: req.params.slug.toLowerCase() })
      .select('userId category serviceDistricts totalJobsCompleted');
    if (!profile) return res.status(404).json({ success: false, message: 'Worker not found.' });

    const userId = profile.userId;
    const since30 = WINDOW_30();

    const [completedLast30, inProgressNow, activeDistricts, posts] = await Promise.all([
      Job.countDocuments({
        workerId: userId,
        status:   'completed',
        createdAt: { $gte: since30 },
      }),
      Job.countDocuments({
        workerId: userId,
        status:   { $in: ['accepted', 'in_progress'] },
      }),
      Job.distinct('location.district', {
        workerId:  userId,
        status:    { $in: ['accepted', 'in_progress', 'completed'] },
        createdAt: { $gte: since30 },
        'location.district': { $nin: [null, ''] },
      }),
      ProgressPost.find({
        posterId:       userId,
        removedByAdmin: false,
      })
        .sort({ createdAt: -1 })
        .limit(8),
    ]);

    res.json({
      success: true,
      data: {
        counters: {
          completedLast30,
          inProgressNow,
          totalLifetime: profile.totalJobsCompleted || 0,
          activeDistricts: activeDistricts.filter(Boolean).slice(0, 6),
        },
        posts: posts.map(publicShape),
      },
    });
  } catch (err) {
    console.error('pulse/worker error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* ── GET /pulse/business/:slug — public live-pulse for a business ───── */
router.get('/pulse/business/:slug', optionalAuth, async (req, res) => {
  try {
    const profile = await BusinessProfile.findOne({ slug: req.params.slug.toLowerCase() })
      .select('userId district businessType totalInquiries');
    if (!profile) return res.status(404).json({ success: false, message: 'Business not found.' });

    const userId = profile.userId;
    const since30 = WINDOW_30();
    const since7  = WINDOW_7();

    const [postsLast30, postsLast7, activeDistricts, posts] = await Promise.all([
      ProgressPost.countDocuments({
        posterId:       userId,
        removedByAdmin: false,
        createdAt:      { $gte: since30 },
      }),
      ProgressPost.countDocuments({
        posterId:       userId,
        removedByAdmin: false,
        createdAt:      { $gte: since7 },
      }),
      ProgressPost.distinct('district', {
        posterId:       userId,
        removedByAdmin: false,
        createdAt:      { $gte: since30 },
      }),
      ProgressPost.find({
        posterId:       userId,
        removedByAdmin: false,
      })
        .sort({ createdAt: -1 })
        .limit(8),
    ]);

    res.json({
      success: true,
      data: {
        counters: {
          postsLast30,
          postsLast7,
          totalInquiries: profile.totalInquiries || 0,
          activeDistricts: activeDistricts.filter(Boolean).slice(0, 6),
        },
        posts: posts.map(publicShape),
      },
    });
  } catch (err) {
    console.error('pulse/business error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* ── POST / — create a progress post (auth) ──────────────────────────── */
router.post('/', authenticateToken, upload.array('photos', 4), async (req, res) => {
  try {
    const { jobId, category, district, caption } = req.body;
    const role = req.user.role;

    if (!['worker', 'business'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only Pros and Businesses can post progress.' });
    }

    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: 'At least one photo is required.' });
    }
    if (req.files.length > 4) {
      return res.status(400).json({ success: false, message: 'Maximum 4 photos.' });
    }

    let resolvedCategory = (category || '').trim();
    let resolvedDistrict = (district || '').trim();
    let resolvedJobId    = null;

    if (role === 'worker' && jobId) {
      const job = await Job.findById(jobId).select('workerId category location status');
      if (!job || String(job.workerId) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Job not found or not yours.' });
      }
      if (!['accepted', 'in_progress', 'completed'].includes(job.status)) {
        return res.status(400).json({ success: false, message: 'Can only post progress on active or completed jobs.' });
      }
      resolvedJobId    = job._id;
      resolvedCategory = job.category;
      resolvedDistrict = job.location?.district || resolvedDistrict;
    }

    if (!resolvedCategory || !resolvedDistrict) {
      if (role === 'worker') {
        const wp = await WorkerProfile.findOne({ userId: req.user.id }).select('category serviceDistricts');
        resolvedCategory ||= wp?.category;
        resolvedDistrict ||= wp?.serviceDistricts?.[0];
      } else {
        const bp = await BusinessProfile.findOne({ userId: req.user.id }).select('businessType district');
        resolvedCategory ||= bp?.businessType;
        resolvedDistrict ||= bp?.district;
      }
    }

    if (!resolvedCategory || !resolvedDistrict) {
      return res.status(400).json({ success: false, message: 'Category and district are required.' });
    }

    const post = await ProgressPost.create({
      posterId:   req.user.id,
      posterRole: role,
      jobId:      resolvedJobId,
      category:   resolvedCategory,
      district:   resolvedDistrict,
      photos:     req.files.map(fileUrl).filter(Boolean),
      caption:    (caption || '').slice(0, 200),
    });

    res.status(201).json({ success: true, data: publicShape(post) });
  } catch (err) {
    console.error('progress-post create error:', err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Server error.' });
  }
});

/* ── GET /me — own posts ─────────────────────────────────────────────── */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const posts = await ProgressPost.find({ posterId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: posts.map((p) => ({ ...publicShape(p), removedByAdmin: p.removedByAdmin, flagged: p.flagged })) });
  } catch (err) {
    console.error('progress-post me error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* ── DELETE /:id — own post (or admin) ───────────────────────────────── */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await ProgressPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Not found.' });

    if (String(post.posterId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    await post.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('progress-post delete error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* ── Admin moderation ────────────────────────────────────────────────── */
router.get('/admin/all', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  const { flagged } = req.query;
  const filter = flagged === 'true' ? { flagged: true, removedByAdmin: false } : {};
  const posts = await ProgressPost.find(filter)
    .sort({ flagged: -1, createdAt: -1 })
    .limit(100)
    .populate('posterId', 'name role');
  res.json({ success: true, data: posts });
});

router.patch('/admin/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  const { flagged, flagReason, removedByAdmin, removedReason } = req.body;
  const update = {};
  if (flagged        !== undefined) { update.flagged        = flagged;        update.flagReason    = flagReason || ''; }
  if (removedByAdmin !== undefined) { update.removedByAdmin = removedByAdmin; update.removedReason = removedReason || ''; }
  const post = await ProgressPost.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!post) return res.status(404).json({ success: false, message: 'Not found.' });
  res.json({ success: true, data: post });
});

export default router;
