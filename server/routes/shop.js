import express from 'express';
import mongoose  from 'mongoose';
import ShopItem    from '../models/ShopItem.js';
import ShopRequest from '../models/ShopRequest.js';
import ShopSale    from '../models/ShopSale.js';
import Category    from '../models/Category.js';
import WorkerProfile from '../models/WorkerProfile.js';
import User        from '../models/User.js';
import Payout      from '../models/Payout.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createConsultationPaymentIntent, retrievePaymentIntent } from '../services/stripeService.js';
import { computeSplit, resolveShopCommission } from '../services/commissionService.js';
import { upload, fileUrl } from '../middleware/upload.js';
import { DEFAULT_CURRENCY } from '../config/site.js';

const router = express.Router();

// ── Guard: verify worker belongs to art_crafts_lifestyle ─────────────────────
async function requireArtWorker(req, res, next) {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id }).lean();
    if (!profile) return res.status(404).json({ success: false, message: 'Worker profile not found' });

    const cat = await Category.findOne({ slug: profile.category }).lean();
    if (cat?.group !== 'art_crafts_lifestyle') {
      return res.status(403).json({ success: false, message: 'Shop is only available for Art, Crafts & Lifestyle workers' });
    }
    req.workerProfile = profile;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC — browse shop items
// ═══════════════════════════════════════════════════════════════════════════════

// GET /shop/items  — browse all active items (art_crafts_lifestyle workers only)
router.get('/items', optionalAuth, async (req, res) => {
  try {
    const { workerId, limit = 24, page = 1 } = req.query;
    const filter = { status: 'active' };
    if (workerId) filter.workerId = workerId;

    const items = await ShopItem.find(filter)
      .populate('workerId', 'name profilePhoto location')
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await ShopItem.countDocuments(filter);
    res.json({ success: true, data: items, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /shop/items/:id  — single item detail
router.get('/items/:id', optionalAuth, async (req, res) => {
  try {
    const item = await ShopItem.findById(req.params.id)
      .populate('workerId', 'name profilePhoto location')
      .lean();
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER — manage shop items
// ═══════════════════════════════════════════════════════════════════════════════

// GET /shop/me/commission  — worker's current commission status
router.get('/me/commission', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const result = await resolveShopCommission(req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /shop/me/images  — upload up to 5 product images, returns URLs
router.post(
  '/me/images',
  authenticateToken, requireRole('worker'), requireArtWorker,
  upload.array('images', 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No images uploaded' });
      }
      const urls = req.files.map(fileUrl);
      res.json({ success: true, urls });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /shop/me/items
router.get('/me/items', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const items = await ShopItem.find({ workerId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /shop/me/items  — create listing
router.post('/me/items', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const { title, description, price, images, stock, tags, deliveryInfo, acceptsRequests } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!price || price < 0) return res.status(400).json({ success: false, message: 'Valid price is required' });

    const item = await ShopItem.create({
      workerId: req.user.id,
      title: title.trim(),
      description: description || '',
      price: Number(price),
      images: images || [],
      stock: stock != null ? Number(stock) : null,
      tags: tags || [],
      deliveryInfo: deliveryInfo || '',
      acceptsRequests: acceptsRequests !== false,
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /shop/me/items/:id  — edit listing
router.put('/me/items/:id', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const item = await ShopItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.workerId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorised' });

    const allowed = ['title', 'description', 'price', 'images', 'stock', 'tags', 'status', 'deliveryInfo', 'acceptsRequests'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    }
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /shop/me/items/:id  — remove listing
router.delete('/me/items/:id', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const item = await ShopItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.workerId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorised' });
    await item.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER — manage incoming custom requests
// ═══════════════════════════════════════════════════════════════════════════════

// GET /shop/me/requests
router.get('/me/requests', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const requests = await ShopRequest.find({ workerId: req.user.id })
      .populate('clientId', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /shop/me/requests/:id/quote  — send price quote
router.put('/me/requests/:id/quote', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const { quotedPrice, quotedNote } = req.body;
    if (!quotedPrice || quotedPrice <= 0) return res.status(400).json({ success: false, message: 'Valid quoted price required' });

    const request = await ShopRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.workerId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorised' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Can only quote a pending request' });

    request.quotedPrice = Number(quotedPrice);
    request.quotedNote  = quotedNote || '';
    request.quotedAt    = new Date();
    request.status      = 'quoted';
    await request.save();

    res.json({ success: true, data: request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /shop/me/requests/:id/decline
router.put('/me/requests/:id/decline', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const request = await ShopRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.workerId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorised' });
    if (!['pending', 'quoted'].includes(request.status)) return res.status(400).json({ success: false, message: 'Cannot decline at this stage' });

    request.status        = 'declined';
    request.declineReason = req.body.reason || '';
    await request.save();
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /shop/me/requests/:id/complete  — mark work as delivered
router.put('/me/requests/:id/complete', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const request = await ShopRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.workerId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorised' });
    if (request.status !== 'in_progress') return res.status(400).json({ success: false, message: 'Request must be in progress to complete' });

    request.status      = 'completed';
    request.completedAt = new Date();
    await request.save();
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT — buy items directly
// ═══════════════════════════════════════════════════════════════════════════════

// POST /shop/items/:id/buy  — create payment intent for direct purchase
router.post('/items/:id/buy', authenticateToken, requireRole('client'), async (req, res) => {
  try {
    const item = await ShopItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.status !== 'active') return res.status(400).json({ success: false, message: 'Item is not available' });
    if (item.stock !== null && item.stock <= 0) return res.status(400).json({ success: false, message: 'Out of stock' });

    const intent = await createConsultationPaymentIntent({
      amount:   item.price,
      currency: (item.currency || DEFAULT_CURRENCY).toLowerCase(),
      metadata: { shopItemId: String(item._id), buyerId: req.user.id },
    });

    res.json({ success: true, clientSecret: intent.clientSecret, paymentIntentId: intent.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /shop/items/:id/confirm  — confirm purchase after Stripe payment
router.post('/items/:id/confirm', authenticateToken, requireRole('client'), async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const intent = await retrievePaymentIntent(paymentIntentId);
    if (intent.status !== 'succeeded') return res.status(400).json({ success: false, message: 'Payment not completed' });
    if (intent.metadata?.shopItemId !== req.params.id) return res.status(400).json({ success: false, message: 'Payment mismatch' });

    // ── Idempotency — webhook may have already processed this ─────────────────
    const existing = await ShopSale.findOne({ paymentIntentId }).lean();
    if (existing) {
      const item = await ShopItem.findById(req.params.id).lean();
      return res.json({ success: true, data: item, alreadyProcessed: true });
    }

    const item = await ShopItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    // ── Commission split ──────────────────────────────────────────────────────
    const commission = await resolveShopCommission(String(item.workerId));
    const { commissionAmount, proPayout } = computeSplit({ price: item.price, percent: commission.percent });

    // ── Credit worker's available balance ─────────────────────────────────────
    const profile = await WorkerProfile.findOne({ userId: item.workerId });
    if (profile) {
      const cur     = (item.currency || DEFAULT_CURRENCY).toUpperCase();
      const current = profile.availableBalances.get(cur) || 0;
      profile.availableBalances.set(cur, current + proPayout);
      await profile.save();
    }

    // ── Update item ───────────────────────────────────────────────────────────
    if (item.stock !== null) {
      item.stock = Math.max(0, item.stock - 1);
      if (item.stock === 0) item.status = 'sold_out';
    }
    item.soldCount              += 1;
    item.lastCommissionPercent   = commission.percent;
    item.lastWorkerEarning       = proPayout;
    item.lastPlatformEarning     = commissionAmount;
    await item.save();

    // ── Record sale (idempotency + earnings history) ──────────────────────────
    await ShopSale.create({
      workerId:         item.workerId,
      buyerId:          req.user.id,
      shopItemId:       item._id,
      paymentIntentId,
      type:             'direct',
      itemTitle:        item.title,
      amount:           item.price,
      workerEarning:    proPayout,
      platformEarning:  commissionAmount,
      commissionPercent:commission.percent,
      isFreeCommission: commission.isFree,
      currency:         (item.currency || DEFAULT_CURRENCY).toUpperCase(),
    });

    res.json({ success: true, data: item, commission: { percent: commission.percent, isFree: commission.isFree, workerEarning: proPayout, platformEarning: commissionAmount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT — custom requests
// ═══════════════════════════════════════════════════════════════════════════════

// POST /shop/requests  — submit a custom commission request
router.post('/requests', authenticateToken, requireRole('client'), async (req, res) => {
  try {
    const { workerId, title, description, budgetMin, budgetMax, deadline, attachments } = req.body;
    if (!workerId)     return res.status(400).json({ success: false, message: 'workerId is required' });
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!description?.trim()) return res.status(400).json({ success: false, message: 'Description is required' });

    // Confirm the target worker is an art_crafts_lifestyle worker
    const profile = await WorkerProfile.findOne({ userId: workerId }).lean();
    const cat = await Category.findOne({ slug: profile?.category }).lean();
    if (cat?.group !== 'art_crafts_lifestyle') {
      return res.status(403).json({ success: false, message: 'This worker does not accept shop requests' });
    }

    const request = await ShopRequest.create({
      workerId,
      clientId: req.user.id,
      title: title.trim(),
      description: description.trim(),
      budgetMin:   budgetMin  ? Number(budgetMin)  : null,
      budgetMax:   budgetMax  ? Number(budgetMax)  : null,
      deadline:    deadline   ? new Date(deadline)  : null,
      attachments: attachments || [],
    });

    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /shop/my-requests  — client's own requests
router.get('/my-requests', authenticateToken, requireRole('client'), async (req, res) => {
  try {
    const requests = await ShopRequest.find({ clientId: req.user.id })
      .populate('workerId', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /shop/requests/:id/pay  — client pays accepted quote (create intent)
router.post('/requests/:id/pay', authenticateToken, requireRole('client'), async (req, res) => {
  try {
    const request = await ShopRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.clientId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorised' });
    if (request.status !== 'quoted') return res.status(400).json({ success: false, message: 'Request must be quoted before payment' });

    const intent = await createConsultationPaymentIntent({
      amount:   request.quotedPrice,
      currency: DEFAULT_CURRENCY.toLowerCase(),
      metadata: { shopRequestId: String(request._id), clientId: req.user.id, workerId: String(request.workerId) },
    });

    request.paymentIntentId = intent.id;
    request.clientSecret    = intent.clientSecret;
    request.status          = 'accepted';
    await request.save();

    res.json({ success: true, clientSecret: intent.clientSecret, paymentIntentId: intent.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /shop/requests/:id/confirm-payment  — confirm payment, move to in_progress
router.post('/requests/:id/confirm-payment', authenticateToken, requireRole('client'), async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const request = await ShopRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.clientId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorised' });

    // ── Idempotency — webhook may have already moved this to in_progress ───────
    if (['in_progress', 'paid', 'completed'].includes(request.status)) {
      return res.json({ success: true, data: request, alreadyProcessed: true });
    }

    const intent = await retrievePaymentIntent(paymentIntentId);
    if (intent.status !== 'succeeded') return res.status(400).json({ success: false, message: 'Payment not completed' });

    // ── Commission split ──────────────────────────────────────────────────────
    const commission = await resolveShopCommission(String(request.workerId));
    const price      = request.quotedPrice;
    const { commissionAmount, proPayout } = computeSplit({ price, percent: commission.percent });

    // ── Credit worker's available balance ─────────────────────────────────────
    const profile = await WorkerProfile.findOne({ userId: request.workerId });
    if (profile) {
      const cur     = DEFAULT_CURRENCY;
      const current = profile.availableBalances.get(cur) || 0;
      profile.availableBalances.set(cur, current + proPayout);
      await profile.save();
    }

    // ── Record split on request ───────────────────────────────────────────────
    request.status             = 'in_progress';
    request.commissionPercent  = commission.percent;
    request.workerEarning      = proPayout;
    request.platformEarning    = commissionAmount;
    request.isFreeCommission   = commission.isFree;
    await request.save();

    // ── Record sale (idempotency + earnings history) ──────────────────────────
    await ShopSale.findOneAndUpdate(
      { paymentIntentId: request.paymentIntentId || paymentIntentId },
      {
        $setOnInsert: {
          workerId:         request.workerId,
          buyerId:          request.clientId,
          shopRequestId:    request._id,
          paymentIntentId:  request.paymentIntentId || paymentIntentId,
          type:             'commission_request',
          itemTitle:        request.title,
          amount:           price,
          workerEarning:    proPayout,
          platformEarning:  commissionAmount,
          commissionPercent:commission.percent,
          isFreeCommission: commission.isFree,
          currency:         DEFAULT_CURRENCY,
          soldAt:           new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: request, commission: { percent: commission.percent, isFree: commission.isFree, workerEarning: proPayout, platformEarning: commissionAmount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /shop/me/balance  — available & pending withdrawal balance derived from ShopSale records
//
// available[cur] = sum(ShopSale.workerEarning)
//                - sum(Payout where source=shop, status∈{pending,processing,completed}, cur)
// pending[cur]   = sum(Payout where source=shop, status∈{pending,processing}, cur)
//
router.get('/me/balance', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const workerId = req.user.id;

    const [salesAgg, payouts] = await Promise.all([
      ShopSale.aggregate([
        { $match: { workerId: new mongoose.Types.ObjectId(workerId) } },
        { $group: { _id: { $ifNull: ['$currency', DEFAULT_CURRENCY] }, totalEarned: { $sum: '$workerEarning' } } },
      ]),
      Payout.find({ workerId, source: 'shop' }).select('amount currency status').lean(),
    ]);

    const totalEarned  = {};
    for (const s of salesAgg) totalEarned[s._id] = s.totalEarned;

    const totalPaidOut = {};
    const totalPending = {};
    for (const p of payouts) {
      const cur = p.currency.toUpperCase();
      if (['pending', 'processing'].includes(p.status))
        totalPending[cur] = (totalPending[cur] || 0) + p.amount;
      if (['pending', 'processing', 'completed'].includes(p.status))
        totalPaidOut[cur] = (totalPaidOut[cur] || 0) + p.amount;
    }

    const available = {};
    const pending   = {};
    const currencies = new Set([...Object.keys(totalEarned), ...Object.keys(totalPending)]);
    for (const cur of currencies) {
      available[cur] = Math.max(0, (totalEarned[cur] || 0) - (totalPaidOut[cur] || 0));
      if (totalPending[cur]) pending[cur] = totalPending[cur];
    }

    res.json({ success: true, data: { available, pending } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /shop/me/payouts/request  — request a withdrawal from shop earnings
router.post('/me/payouts/request', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    if (!amount || !currency)
      return res.status(400).json({ success: false, message: 'amount and currency required' });

    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile?.payoutDetails?.method)
      return res.status(400).json({ success: false, message: 'Set your payout details first' });

    // Recompute available balance server-side (same logic as GET /me/balance)
    const cur = currency.toUpperCase();
    const [salesAgg, existingPayouts] = await Promise.all([
      ShopSale.aggregate([
        { $match: { workerId: new mongoose.Types.ObjectId(req.user.id), currency: cur } },
        { $group: { _id: null, total: { $sum: '$workerEarning' } } },
      ]),
      Payout.find({ workerId: req.user.id, source: 'shop', currency: cur,
        status: { $in: ['pending', 'processing', 'completed'] } }).select('amount').lean(),
    ]);

    const totalEarned    = salesAgg[0]?.total || 0;
    const totalCommitted = existingPayouts.reduce((s, p) => s + p.amount, 0);
    const available      = Math.max(0, totalEarned - totalCommitted);

    const amt = Number(amount);
    if (amt <= 0 || amt > available)
      return res.status(400).json({ success: false, message: `Amount must be between 1 and ${available} ${cur}` });

    const payout = await Payout.create({
      workerId: req.user.id,
      amount:   amt,
      currency: cur,
      source:   'shop',
      method:   profile.payoutDetails.method,
      recipient: {
        bankName:      profile.payoutDetails.bankName,
        branch:        profile.payoutDetails.branch,
        accountNumber: profile.payoutDetails.accountNumber,
        accountHolder: profile.payoutDetails.accountHolder,
        walletNumber:  profile.payoutDetails.walletNumber,
        walletHolder:  profile.payoutDetails.walletHolder,
      },
    });

    res.status(201).json({ success: true, data: payout, message: 'Payout requested' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /shop/me/payouts  — shop withdrawal history
router.get('/me/payouts', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const payouts = await Payout.find({ workerId: req.user.id, source: 'shop' })
      .sort({ requestedAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: payouts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /shop/me/earnings  — worker's sale history + aggregate summary
router.get('/me/earnings', authenticateToken, requireRole('worker'), requireArtWorker, async (req, res) => {
  try {
    const workerId = req.user.id;
    const { limit = 20, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [sales, total, agg] = await Promise.all([
      ShopSale.find({ workerId })
        .sort({ soldAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      ShopSale.countDocuments({ workerId }),

      ShopSale.aggregate([
        { $match: { workerId: new mongoose.Types.ObjectId(workerId) } },
        {
          $group: {
            _id:            null,
            totalEarned:    { $sum: '$workerEarning' },
            totalPlatform:  { $sum: '$platformEarning' },
            totalRevenue:   { $sum: '$amount' },
            totalSales:     { $sum: 1 },
            freeSales:      { $sum: { $cond: ['$isFreeCommission', 1, 0] } },
          },
        },
      ]),
    ]);

    const summary = agg[0]
      ? {
          totalEarned:   agg[0].totalEarned,
          totalPlatform: agg[0].totalPlatform,
          totalRevenue:  agg[0].totalRevenue,
          totalSales:    agg[0].totalSales,
          freeSales:     agg[0].freeSales,
        }
      : { totalEarned: 0, totalPlatform: 0, totalRevenue: 0, totalSales: 0, freeSales: 0 };

    res.json({ success: true, data: { sales, total, page: Number(page), summary } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /shop/requests/:id/cancel  — client cancels before payment
router.put('/requests/:id/cancel', authenticateToken, requireRole('client'), async (req, res) => {
  try {
    const request = await ShopRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.clientId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorised' });
    if (['paid', 'in_progress', 'completed'].includes(request.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel at this stage' });
    }
    request.status = 'cancelled';
    await request.save();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
