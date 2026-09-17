import express from 'express';
import Category from '../models/Category.js';
import WorkerProfile from '../models/WorkerProfile.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();

    const stats = await WorkerProfile.aggregate([
      { $match: { isActive: true, isSuspended: { $ne: true } } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$category',
          workers: { $sum: 1 },
          verified: { $sum: { $cond: ['$user.idVerified', 1, 0] } },
        },
      },
    ]);

    const statsBySlug = Object.fromEntries(
      stats.map((s) => [s._id, { workers: s.workers, verified: s.verified }])
    );

    const enriched = categories.map((c) => ({
      ...c,
      workerCount:   statsBySlug[c.slug]?.workers  || 0,
      verifiedCount: statsBySlug[c.slug]?.verified || 0,
    }));

    res.json({ success: true, data: enriched, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

export default router;
