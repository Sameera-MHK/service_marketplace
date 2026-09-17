import express from 'express';
import LiveClass        from '../models/LiveClass.js';
import Category         from '../models/Category.js';
import WorkerProfile    from '../models/WorkerProfile.js';
import Payout           from '../models/Payout.js';
import PlatformSettings from '../models/PlatformSettings.js';
import User             from '../models/User.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { resolveEffectiveLiveClassCommission, computeSplit } from '../services/commissionService.js';
import * as liveKitService from '../services/liveKitService.js';
import { createConsultationPaymentIntent, retrievePaymentIntent, refundPaymentIntent } from '../services/stripeService.js';
import { scheduleLiveClassReminder, cancelLiveClassReminder } from '../services/agendaService.js';
import {
  sendLiveClassEnrollmentConfirmation,
  sendLiveClassNewEnrollmentHost,
  sendLiveClassCancellationStudent,
} from '../services/emailService.js';
import {
  sendSMS,
  smsLiveClassEnrolled,
  smsLiveClassNewEnrollment,
  smsLiveClassCancelled,
} from '../services/smsService.js';
import { DEFAULT_CURRENCY, TIMEZONE, DATE_LOCALE } from '../config/site.js';

const router = express.Router();

// ── PUBLIC: platform settings (commission rate) ───────────────────────────────
// Must come BEFORE /:id so "settings" is not treated as an id.
router.get('/settings', async (req, res) => {
  try {
    const settings = await PlatformSettings.get();
    res.json({
      success: true,
      data: { defaultCommissionPercent: settings.liveClassDefaultCommissionPercent ?? 12 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── WORKER: own effective commission rate (resolves override → category → platform) ──
// Must come BEFORE /:id so "my-rate" is not treated as an id.
router.get('/my-rate', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const result = await resolveEffectiveLiveClassCommission(req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── WORKER: live class balance (computed — works for all historic data) ───────
// Must come BEFORE /:id so "me" is not treated as an id.
//
// available[cur] = sum(completed hostPayout for cur)
//                - sum(payouts where source=live_class, status∈{pending,processing,completed}, cur)
// pending[cur]   = sum(payouts where source=live_class, status∈{pending,processing}, cur)
//
// Rejected/cancelled payouts put the money back into available automatically.
router.get('/me/balance', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const [completedClasses, payouts] = await Promise.all([
      LiveClass.find({ hostId: req.user.id, status: 'completed' })
        .select('hostPayout currency').lean(),
      Payout.find({ workerId: req.user.id, source: 'live_class' })
        .select('amount currency status').lean(),
    ]);

    // Accumulate total earned per currency
    const totalEarned = {};
    for (const cls of completedClasses) {
      const cur = (cls.currency || DEFAULT_CURRENCY).toUpperCase();
      totalEarned[cur] = (totalEarned[cur] || 0) + (cls.hostPayout || 0);
    }

    // Accumulate paid-out and pending amounts per currency
    const totalPaidOut = {};
    const totalPending = {};
    for (const p of payouts) {
      const cur = p.currency.toUpperCase();
      if (['pending', 'processing'].includes(p.status)) {
        totalPending[cur] = (totalPending[cur] || 0) + p.amount;
      }
      if (['pending', 'processing', 'completed'].includes(p.status)) {
        totalPaidOut[cur] = (totalPaidOut[cur] || 0) + p.amount;
      }
    }

    // Build available and pending maps
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

// ── WORKER: request live class withdrawal ─────────────────────────────────────
router.post('/me/payouts/request', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const { amount, currency } = req.body;
    if (!amount || !currency) {
      return res.status(400).json({ success: false, message: 'amount and currency required' });
    }

    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile?.payoutDetails?.method) {
      return res.status(400).json({ success: false, message: 'Set your payout details first' });
    }

    // Recompute available balance on the server side (same logic as GET /me/balance)
    const cur = currency.toUpperCase();
    const [completedClasses, existingPayouts] = await Promise.all([
      LiveClass.find({ hostId: req.user.id, status: 'completed', currency: { $in: [cur, cur.toLowerCase()] } })
        .select('hostPayout currency').lean(),
      Payout.find({ workerId: req.user.id, source: 'live_class', currency: cur,
        status: { $in: ['pending', 'processing', 'completed'] } })
        .select('amount').lean(),
    ]);

    const totalEarned    = completedClasses.reduce((s, c) => s + (c.hostPayout || 0), 0);
    const totalCommitted = existingPayouts.reduce((s, p) => s + p.amount, 0);
    const available      = Math.max(0, totalEarned - totalCommitted);

    const amt = Number(amount);
    if (amt <= 0 || amt > available) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between 1 and ${available} ${cur}`,
      });
    }

    const payout = await Payout.create({
      workerId: req.user.id,
      amount:   amt,
      currency: cur,
      source:   'live_class',
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

// ── WORKER: live class payout history ─────────────────────────────────────────
router.get('/me/payouts', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const payouts = await Payout.find({ workerId: req.user.id, source: 'live_class' })
      .sort({ requestedAt: -1 })
      .limit(50);
    res.json({ success: true, data: payouts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUBLIC: browse open/upcoming classes ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, hostId, page = 1, limit = 20 } = req.query;

    // When fetching by host we also include live (currently running) classes
    const filter = hostId
      ? { hostId, status: { $in: ['open', 'live'] } }
      : { status: 'open', scheduledAt: { $gt: new Date() } };

    if (category) filter.category = category;

    const classes = await LiveClass.find(filter)
      .populate('hostId', 'name profilePhoto location')
      .sort({ scheduledAt: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, data: classes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── WORKER: teacher's own classes ─────────────────────────────────────────────
// Must come BEFORE /:id so Express doesn't treat "mine" as an id.
router.get('/mine', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const classes = await LiveClass.find({ hostId: req.user.id }).sort({ scheduledAt: -1 });
    res.json({ success: true, data: classes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── CLIENT: enrolled classes ──────────────────────────────────────────────────
// Must come BEFORE /:id so "my-enrollments" is not treated as an id.
router.get('/my-enrollments', authenticateToken, async (req, res) => {
  try {
    const classes = await LiveClass.find({
      'enrolledStudents.userId': req.user.id,
    })
      .populate('hostId', 'name profilePhoto location')
      .sort({ scheduledAt: 1 })
      .lean();

    // Mark each with the student's own enrollment record
    const enriched = classes.map(cls => ({
      ...cls,
      myEnrollment: cls.enrolledStudents.find(
        e => e.userId.toString() === req.user.id.toString()
      ),
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUBLIC: class detail ──────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id)
      .populate('hostId', 'name profilePhoto location')
      .populate('enrolledStudents.userId', 'name');

    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found' });

    const data = liveClass.toJSON();
    data.isEnrolled = req.user
      ? liveClass.enrolledStudents.some(e => e.userId._id.toString() === req.user.id.toString())
      : false;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── WORKER: create class ──────────────────────────────────────────────────────
router.post('/', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const { title, description, category, scheduledAt, durationMinutes, pricePerSeat, maxSeats } = req.body;

    // Check subscription plan — free workers cannot host live classes
    const profile = await WorkerProfile.findOne({ userId: req.user.id }).lean();
    if (!profile || profile.subscriptionPlan === 'free') {
      return res.status(403).json({
        success: false,
        message: 'A Pro or Elite subscription is required to host live classes.',
      });
    }

    // Verify the worker's category is eligible for live classes
    const categorySlug = category || profile?.category;
    if (categorySlug) {
      const cat = await Category.findOne({ slug: categorySlug }).lean();
      if (cat && !cat.liveClassesEligible) {
        return res.status(403).json({
          success: false,
          message: 'Live classes are not enabled for your category. Contact support to request access.',
        });
      }
    }

    const liveClass = await LiveClass.create({
      hostId: req.user.id,
      title,
      description,
      category: categorySlug,
      scheduledAt,
      durationMinutes,
      pricePerSeat,
      maxSeats,
      status: 'open',
    });

    // Schedule the 1-hour reminder (will notify host + all enrolled students when it fires)
    await scheduleLiveClassReminder(liveClass._id, liveClass.scheduledAt).catch(console.error);

    res.status(201).json({ success: true, data: liveClass });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── WORKER: edit class ────────────────────────────────────────────────────────
router.put('/:id', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found' });

    if (liveClass.hostId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }
    if (!['draft', 'open'].includes(liveClass.status)) {
      return res.status(400).json({ success: false, message: 'Class cannot be edited in its current status' });
    }

    const allowed = ['title', 'description', 'scheduledAt', 'durationMinutes', 'pricePerSeat', 'maxSeats', 'category'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) liveClass[field] = req.body[field];
    }

    await liveClass.save();

    // If scheduledAt changed, reschedule the reminder
    if (req.body.scheduledAt) {
      await scheduleLiveClassReminder(liveClass._id, liveClass.scheduledAt).catch(console.error);
    }

    res.json({ success: true, data: liveClass });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── WORKER: cancel class ──────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found' });

    if (liveClass.hostId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }
    if (liveClass.status === 'live') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a class that is currently live' });
    }
    if (!['draft', 'open'].includes(liveClass.status)) {
      return res.status(400).json({ success: false, message: 'Class cannot be cancelled in its current status' });
    }

    // Refund all paid enrollments
    const refundErrors = [];
    for (const enrollment of liveClass.enrolledStudents) {
      if (enrollment.paymentIntentId) {
        try {
          await refundPaymentIntent(enrollment.paymentIntentId);
        } catch (refundErr) {
          refundErrors.push({ paymentIntentId: enrollment.paymentIntentId, error: refundErr.message });
        }
      }
    }

    liveClass.status = 'cancelled';
    liveClass.cancelledAt = new Date();
    if (req.body.cancellationReason) liveClass.cancellationReason = req.body.cancellationReason;
    await liveClass.save();

    // Cancel the reminder job
    await cancelLiveClassReminder(liveClass._id).catch(console.error);

    // Notify enrolled students (fire-and-forget)
    const studentIds = liveClass.enrolledStudents.map(e => e.userId);
    if (studentIds.length > 0) {
      const host    = await User.findById(liveClass.hostId).select('name').lean();
      const students = await User.find({ _id: { $in: studentIds } }).select('name phone email').lean();
      const reason   = liveClass.cancellationReason || '';

      Promise.all(students.map(async (student) => {
        try {
          if (student.email) {
            await sendLiveClassCancellationStudent(
              student.email, student.name, liveClass.title, host?.name || 'Host', reason
            );
          }
          if (student.phone) {
            await sendSMS(student.phone, smsLiveClassCancelled(student.name, liveClass.title));
          }
        } catch (e) {
          console.error(`[liveClasses] cancel notify failed for student ${student._id}:`, e.message);
        }
      })).catch(console.error);
    }

    res.json({ success: true, data: liveClass, refundErrors: refundErrors.length ? refundErrors : undefined });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── WORKER: start class ───────────────────────────────────────────────────────
router.post('/:id/start', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found' });

    if (liveClass.hostId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }
    if (liveClass.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Class must be open to start' });
    }

    // Lazily assign room name
    if (!liveClass.liveKitRoomName) {
      liveClass.liveKitRoomName = `live-class-${liveClass._id}`;
    }

    // Resolve and store live-class commission percent
    const { percent } = await resolveEffectiveLiveClassCommission(req.user.id);
    liveClass.commissionPercent = percent;
    liveClass.status = 'live';
    await liveClass.save();

    const token = await liveKitService.issueAccessToken({
      roomName: liveClass.liveKitRoomName,
      identity: req.user.id.toString(),
      name: req.user.name,
      isModerator: true,
      ttlSeconds: liveClass.durationMinutes * 60 + 1800, // class duration + 30 min buffer
    });

    res.json({
      success: true,
      data: {
        token,
        url: process.env.LIVEKIT_URL,
        roomName: liveClass.liveKitRoomName,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── WORKER: end class ─────────────────────────────────────────────────────────
router.post('/:id/end', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found' });

    if (liveClass.hostId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }
    if (liveClass.status !== 'live') {
      return res.status(400).json({ success: false, message: 'Class must be live to end' });
    }

    const totalRevenue = liveClass.enrolledStudents.length * liveClass.pricePerSeat;
    const { commissionAmount, proPayout } = computeSplit({
      price: totalRevenue,
      percent: liveClass.commissionPercent ?? 0,
    });

    liveClass.status = 'completed';
    liveClass.completedAt = new Date();
    liveClass.totalRevenue = totalRevenue;
    liveClass.commissionAmount = commissionAmount;
    liveClass.hostPayout = proPayout;
    await liveClass.save();

    // Balance is computed dynamically from completed LiveClass records (GET /me/balance),
    // so no stored field update is needed here.

    // Close the LiveKit room so all participants are disconnected immediately
    await liveKitService.deleteRoom(liveClass.liveKitRoomName);

    res.json({ success: true, data: liveClass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── CLIENT: enroll (create payment intent) ────────────────────────────────────
router.post('/:id/enroll', authenticateToken, requireRole('client'), async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found' });

    if (liveClass.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Class is not open for enrollment' });
    }
    if (liveClass.scheduledAt <= new Date()) {
      return res.status(400).json({ success: false, message: 'Class has already started or passed' });
    }
    if (liveClass.enrolledStudents.length >= liveClass.maxSeats) {
      return res.status(400).json({ success: false, message: 'No seats available' });
    }
    const alreadyEnrolled = liveClass.enrolledStudents.some(
      e => e.userId.toString() === req.user.id.toString()
    );
    if (alreadyEnrolled) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this class' });
    }

    const { id: paymentIntentId, clientSecret } = await createConsultationPaymentIntent({
      amount: liveClass.pricePerSeat,
      currency: liveClass.currency || DEFAULT_CURRENCY,
      metadata: {
        liveClassId: liveClass._id.toString(),
        userId: req.user.id.toString(),
      },
    });

    res.json({ success: true, data: { clientSecret, paymentIntentId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── CLIENT: confirm payment ───────────────────────────────────────────────────
router.post('/:id/confirm-payment', authenticateToken, requireRole('client'), async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId is required' });
    }

    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found' });

    const pi = await retrievePaymentIntent(paymentIntentId);
    if (pi.status !== 'succeeded') {
      return res.status(400).json({ success: false, message: 'Payment has not succeeded' });
    }

    const alreadyEnrolled = liveClass.enrolledStudents.some(
      e => e.userId.toString() === req.user.id.toString()
    );
    if (alreadyEnrolled) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this class' });
    }

    liveClass.enrolledStudents.push({
      userId: req.user.id,
      paymentIntentId,
      enrolledAt: new Date(),
    });
    await liveClass.save();

    // Schedule / refresh the 1-hour reminder for all students
    await scheduleLiveClassReminder(liveClass._id, liveClass.scheduledAt).catch(console.error);

    // Send notifications (fire-and-forget to keep response fast)
    ;(async () => {
      try {
        const [student, host] = await Promise.all([
          User.findById(req.user.id).select('name phone email').lean(),
          User.findById(liveClass.hostId).select('name phone email').lean(),
        ]);
        const scheduledAt = new Date(liveClass.scheduledAt);
        const time = scheduledAt.toLocaleTimeString(DATE_LOCALE, {
          hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TIMEZONE,
        });
        const date = scheduledAt.toLocaleDateString(DATE_LOCALE, {
          weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', timeZone: TIMEZONE,
        });
        const classUrl = `${process.env.CLIENT_URL}/live-classes/${liveClass._id}`;

        if (student?.email) {
          await sendLiveClassEnrollmentConfirmation(
            student.email, student.name, liveClass.title, host?.name || 'Host', time, date, classUrl
          );
        }
        if (student?.phone) {
          await sendSMS(student.phone, smsLiveClassEnrolled(student.name, liveClass.title, date, time));
        }
        if (host?.email) {
          await sendLiveClassNewEnrollmentHost(
            host.email, host.name, student?.name || 'A student', liveClass.title,
            liveClass.enrolledStudents.length, liveClass.maxSeats
          );
        }
        if (host?.phone) {
          await sendSMS(host.phone, smsLiveClassNewEnrollment(host.name, student?.name || 'A student', liveClass.title));
        }
      } catch (notifyErr) {
        console.error('[liveClasses] confirm-payment notify failed:', notifyErr.message);
      }
    })();

    res.json({ success: true, data: liveClass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── ANY AUTHENTICATED: join class (get LiveKit token) ─────────────────────────
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found' });

    if (liveClass.status !== 'live') {
      return res.status(400).json({ success: false, message: 'Class is not live' });
    }

    const isHost = liveClass.hostId.toString() === req.user.id.toString();
    const enrollmentIndex = liveClass.enrolledStudents.findIndex(
      e => e.userId.toString() === req.user.id.toString()
    );
    const isEnrolled = enrollmentIndex !== -1;

    if (!isHost && !isEnrolled) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this class' });
    }

    // Record first join time for enrolled students
    if (isEnrolled && !liveClass.enrolledStudents[enrollmentIndex].joinedAt) {
      liveClass.enrolledStudents[enrollmentIndex].joinedAt = new Date();
      await liveClass.save();
    }

    const token = await liveKitService.issueAccessToken({
      roomName: liveClass.liveKitRoomName,
      identity: req.user.id.toString(),
      name: req.user.name,
      isModerator: isHost,
      ttlSeconds: liveClass.durationMinutes * 60 + 1800,
    });

    res.json({
      success: true,
      data: {
        token,
        url: process.env.LIVEKIT_URL,
        roomName: liveClass.liveKitRoomName,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
