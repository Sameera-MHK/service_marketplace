import express from 'express';
import Group         from '../models/Group.js';
import WorkerProfile from '../models/WorkerProfile.js';
import Category      from '../models/Category.js';

const router = express.Router();

/**
 * GET /api/groups
 * Returns all active groups ordered by `order`.
 * Each group includes:
 *   workerCount  — active workers in any category belonging to this group
 *   hasListings  — boolean shorthand for landing page "coming soon" logic
 */
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({ isActive: true }).sort({ order: 1 }).lean();

    // Map category slug → group slug
    const categories = await Category.find({ isActive: true }).select('slug group').lean();
    const slugToGroup = Object.fromEntries(categories.map((c) => [c.slug, c.group]));

    // Count active workers per category slug
    const workerStats = await WorkerProfile.aggregate([
      { $match: { isActive: true, isSuspended: { $ne: true } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    // Roll up counts to group level
    const groupCounts = {};
    for (const { _id: catSlug, count } of workerStats) {
      const grp = slugToGroup[catSlug];
      if (grp) groupCounts[grp] = (groupCounts[grp] || 0) + count;
    }

    const enriched = groups.map((g) => ({
      ...g,
      workerCount: groupCounts[g.slug] || 0,
      hasListings: (groupCounts[g.slug] || 0) > 0,
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
