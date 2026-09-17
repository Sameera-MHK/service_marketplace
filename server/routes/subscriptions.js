import express from 'express';
import Subscription from '../models/Subscription.js';
import WorkerProfile from '../models/WorkerProfile.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { PLANS, PAYMENT_METHODS } from '../config/plans.js';
import * as audit from '../services/auditService.js';
import { sendNotificationEmail } from '../services/emailService.js';
import { sendSMS, smsSubscriptionApproved, smsSubscriptionRejected } from '../services/smsService.js';
import { SITE_NAME, SUPPORT_EMAIL } from '../config/site.js';

const router = express.Router();

// GET /subscriptions/plans — public, returns plan config + payment methods
router.get('/plans', (req, res) => {
  res.json({ success: true, data: { plans: PLANS, paymentMethods: PAYMENT_METHODS }, message: 'OK' });
});

// GET /subscriptions/my — worker or business subscription history
router.get('/my', authenticateToken, async (req, res) => {
  const role = req.user.role;
  if (role !== 'worker' && role !== 'business') {
    return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
  }
  try {
    const [profile, history] = await Promise.all([
      role === 'worker'
        ? WorkerProfile.findOne({ userId: req.user.id }).select('subscriptionPlan subscriptionExpiry leadsThisMonth leadsResetDate')
        : null,
      Subscription.find({ workerId: req.user.id }).sort({ createdAt: -1 }),
    ]);
    res.json({ success: true, data: { profile, history }, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// POST /subscriptions/request — worker or business submits payment reference
router.post('/request', authenticateToken, async (req, res) => {
  const role = req.user.role;
  if (role !== 'worker' && role !== 'business') {
    return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
  }
  try {
    const { plan, paymentMethod, paymentReference } = req.body;

    if (!PLANS[plan] || plan === 'free') {
      return res.status(400).json({ success: false, data: null, message: 'Invalid plan' });
    }
    if (!paymentReference?.trim()) {
      return res.status(400).json({ success: false, data: null, message: 'Payment reference required' });
    }

    const existing = await Subscription.findOne({ workerId: req.user.id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ success: false, data: null, message: 'You already have a pending subscription request' });
    }

    const sub = await Subscription.create({
      workerId: req.user.id,
      userRole: role,
      plan,
      paymentMethod,
      paymentReference: paymentReference.trim(),
      amountPaid: PLANS[plan].price,
    });

    res.status(201).json({ success: true, data: sub, message: 'Subscription request submitted — admin will activate within 24 hours' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /subscriptions/:id/activate — admin activates
router.put('/:id/activate', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, data: null, message: 'Not found' });

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    sub.status = 'active';
    sub.activatedAt = now;
    sub.expiresAt = expiresAt;
    await sub.save();

    if (sub.userRole !== 'business') {
      await WorkerProfile.findOneAndUpdate(
        { userId: sub.workerId },
        { subscriptionPlan: sub.plan, subscriptionExpiry: expiresAt }
      );
    }

    await Notification.create({
      userId: sub.workerId,
      type: 'score_changed',
      message: `Your ${sub.plan.toUpperCase()} subscription is now active — expires ${expiresAt.toLocaleDateString()}`,
    });

    const worker = await User.findById(sub.workerId).select('name email');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'subscription_activated',
      targetType: 'subscription',
      targetId:   String(sub._id),
      targetName: worker?.name,
      detail:     {
        plan:             sub.plan,
        amountPaid:       sub.amountPaid,
        paymentMethod:    sub.paymentMethod,
        paymentReference: sub.paymentReference,
        expiresAt,
        workerEmail:      worker?.email,
      },
    }, req);

    if (worker?.email) {
      const planName    = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
      const expiryStr   = expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const dashUrl     = `${process.env.CLIENT_URL}/dashboard/worker/subscription`;

      const featuresByPlan = {
        pro:   ['Unlimited leads', 'Priority in search results', 'Pro badge on profile', 'Portfolio gallery — up to 12 photos', 'Service offer cards — up to 5 offers', 'Social media links visible to clients'],
        elite: ['Everything in Pro', 'Featured on landing page', 'Top of search results', 'Elite badge on profile', 'Up to 10 service offer cards', 'Dedicated admin support'],
      };
      const features = featuresByPlan[sub.plan] || [];

      await sendNotificationEmail(
        worker.email,
        `🎉 Your ${SITE_NAME} ${planName} plan is now active!`,
        `
          <h2 style="font-size:20px;font-weight:800;color:#1c1917;margin-bottom:8px;">
            You're now on the <span style="color:#7c3aed;">${planName}</span> plan!
          </h2>
          <p style="color:#78716c;font-size:14px;line-height:1.6;margin-bottom:20px;">
            Hi ${worker.name}, your payment has been verified and your ${planName} subscription is live.
            Your plan renews on <strong>${expiryStr}</strong>.
          </p>

          <div style="background:#f5f3ff;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="font-size:13px;font-weight:700;color:#6d28d9;margin-bottom:10px;">✨ What you now have access to:</p>
            ${features.map((f) => `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="color:#7c3aed;font-weight:700;">✓</span>
                <span style="font-size:13px;color:#4c1d95;">${f}</span>
              </div>`).join('')}
          </div>

          <div style="text-align:center;margin-bottom:8px;">
            <a href="${dashUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                      color:#fff;font-weight:700;font-size:14px;padding:12px 28px;
                      border-radius:12px;text-decoration:none;">
              Go to My Dashboard →
            </a>
          </div>
          <p style="color:#a8a29e;font-size:12px;text-align:center;">
            Questions? Reply to this email or contact ${SUPPORT_EMAIL}
          </p>
        `
      ).catch((err) => console.error('Subscription approval email error:', err));

      const expiryShort = expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      if (worker.phone) {
        sendSMS(worker.phone, smsSubscriptionApproved(worker.name, planName, expiryShort))
          .catch(() => {});
      }
    }

    res.json({ success: true, data: sub, message: 'Subscription activated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /subscriptions/:id/reject — admin rejects
router.put('/:id/reject', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: req.body.reason || 'Payment not confirmed' },
      { new: true }
    );
    if (!sub) return res.status(404).json({ success: false, data: null, message: 'Not found' });

    await Notification.create({
      userId: sub.workerId,
      type: 'score_changed',
      message: `Subscription request rejected: ${sub.rejectionReason}. Please resubmit with correct payment details.`,
    });

    const worker = await User.findById(sub.workerId).select('name email');
    await audit.log({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      action:     'subscription_rejected',
      targetType: 'subscription',
      targetId:   req.params.id,
      targetName: worker?.name,
      detail:     {
        plan:             sub.plan,
        reason:           sub.rejectionReason,
        paymentReference: sub.paymentReference,
        workerEmail:      worker?.email,
      },
    }, req);

    if (worker?.email) {
      const planName  = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
      const subUrl    = `${process.env.CLIENT_URL}/dashboard/worker/subscription`;

      await sendNotificationEmail(
        worker.email,
        `Your ${SITE_NAME} ${planName} subscription request was not approved`,
        `
          <h2 style="font-size:20px;font-weight:800;color:#1c1917;margin-bottom:8px;">
            Subscription request not approved
          </h2>
          <p style="color:#78716c;font-size:14px;line-height:1.6;margin-bottom:16px;">
            Hi ${worker.name}, unfortunately we were unable to verify your payment for the
            <strong>${planName}</strong> plan.
          </p>

          <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 10px 10px 0;
                      padding:14px 18px;margin-bottom:20px;">
            <p style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:4px;">Reason:</p>
            <p style="font-size:13px;color:#7f1d1d;margin:0;">${sub.rejectionReason}</p>
          </div>

          <p style="color:#78716c;font-size:14px;line-height:1.6;margin-bottom:20px;">
            Please double-check your payment details and submit a new request from your dashboard.
            If you believe this is an error, reply to this email with your payment screenshot and we'll review it.
          </p>

          <div style="text-align:center;margin-bottom:8px;">
            <a href="${subUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                      color:#fff;font-weight:700;font-size:14px;padding:12px 28px;
                      border-radius:12px;text-decoration:none;">
              Resubmit Payment →
            </a>
          </div>
          <p style="color:#a8a29e;font-size:12px;text-align:center;">
            Questions? Reply to this email or contact ${SUPPORT_EMAIL}
          </p>
        `
      ).catch((err) => console.error('Subscription rejection email error:', err));

      if (worker.phone) {
        sendSMS(worker.phone, smsSubscriptionRejected(worker.name, planName, sub.rejectionReason))
          .catch(() => {});
      }
    }

    res.json({ success: true, data: sub, message: 'Subscription rejected' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /subscriptions/pending — admin: all pending requests
router.get('/pending', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const pending = await Subscription.find({ status: 'pending' })
      .populate('workerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: pending, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /subscriptions/all — admin: full history with filters
router.get('/all', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const subs = await Subscription.find(filter)
      .populate('workerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: subs, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

export default router;
