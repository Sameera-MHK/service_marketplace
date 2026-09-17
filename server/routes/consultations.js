import express from 'express';
import mongoose from 'mongoose';
import WorkerProfile from '../models/WorkerProfile.js';
import ConsultationOffering from '../models/ConsultationOffering.js';
import ConsultationBooking from '../models/ConsultationBooking.js';
import Payout from '../models/Payout.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { resolveEffectiveCommission, computeSplit } from '../services/commissionService.js';
import { computeAvailableSlots } from '../services/availabilityService.js';
import * as stripeService from '../services/stripeService.js';
import { scheduleConsultationReminder, cancelConsultationReminder } from '../services/agendaService.js';
import * as liveKitService from '../services/liveKitService.js';
import { DEFAULT_CURRENCY, TIMEZONE } from '../config/site.js';

const router = express.Router();

// ── Worker: enable / disable ───────────────────────────────────────────────
// Only allowed if the admin has marked the worker's category as consultationsEligible
router.put('/me/enable', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Profile not found' });

    // Gate: admin must have granted consultations access to this worker
    if (!profile.features?.consultations) {
      return res.status(403).json({
        success: false, data: null,
        message: 'Consultations have not been enabled for your account. Contact support.',
      });
    }

    profile.consultationsEnabled = !!req.body.enabled;
    await profile.save();
    res.json({ success: true, data: { consultationsEnabled: profile.consultationsEnabled }, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Worker: my current commission rate ─────────────────────────────────────
router.get('/me/commission', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const result = await resolveEffectiveCommission(req.user.id);
    res.json({ success: true, data: result, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Worker: schedule ───────────────────────────────────────────────────────
router.get('/me/schedule', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id }).select('consultationSchedule consultationsEnabled');
    res.json({ success: true, data: profile?.consultationSchedule || null, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/me/schedule', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const { timezone, weeklySlots, blockedDates, bufferMinutes, advanceNoticeHours, bookingWindowDays } = req.body;
    const updates = {};
    if (timezone !== undefined)            updates['consultationSchedule.timezone'] = timezone;
    if (Array.isArray(weeklySlots))        updates['consultationSchedule.weeklySlots'] = weeklySlots;
    if (Array.isArray(blockedDates))       updates['consultationSchedule.blockedDates'] = blockedDates;
    if (bufferMinutes !== undefined)       updates['consultationSchedule.bufferMinutes'] = Number(bufferMinutes);
    if (advanceNoticeHours !== undefined)  updates['consultationSchedule.advanceNoticeHours'] = Number(advanceNoticeHours);
    if (bookingWindowDays !== undefined)   updates['consultationSchedule.bookingWindowDays'] = Number(bookingWindowDays);

    const profile = await WorkerProfile.findOneAndUpdate({ userId: req.user.id }, updates, { new: true });
    res.json({ success: true, data: profile?.consultationSchedule, message: 'Schedule updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Worker: offerings CRUD ─────────────────────────────────────────────────
router.get('/me/offerings', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const items = await ConsultationOffering.find({ workerId: req.user.id }).sort({ sortOrder: 1, createdAt: 1 });
    res.json({ success: true, data: items, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.post('/me/offerings', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const { title, description, durationMinutes, price, currency, sortOrder } = req.body;
    if (!title || !durationMinutes || price == null) {
      return res.status(400).json({ success: false, data: null, message: 'title, durationMinutes and price are required' });
    }
    const item = await ConsultationOffering.create({
      workerId:        req.user.id,
      title:           title.trim(),
      description:     description?.trim() || '',
      durationMinutes: Number(durationMinutes),
      price:           Number(price),
      currency:        (currency || DEFAULT_CURRENCY).toUpperCase(),
      sortOrder:       Number(sortOrder) || 0,
    });
    res.status(201).json({ success: true, data: item, message: 'Offering created' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/me/offerings/:id', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const item = await ConsultationOffering.findOne({ _id: req.params.id, workerId: req.user.id });
    if (!item) return res.status(404).json({ success: false, data: null, message: 'Offering not found' });

    const { title, description, durationMinutes, price, currency, isActive, sortOrder } = req.body;
    if (title !== undefined)           item.title = title.trim();
    if (description !== undefined)     item.description = description.trim();
    if (durationMinutes !== undefined) item.durationMinutes = Number(durationMinutes);
    if (price !== undefined)           item.price = Number(price);
    if (currency !== undefined)        item.currency = currency.toUpperCase();
    if (isActive !== undefined)        item.isActive = !!isActive;
    if (sortOrder !== undefined)       item.sortOrder = Number(sortOrder);
    await item.save();
    res.json({ success: true, data: item, message: 'Offering updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.delete('/me/offerings/:id', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const result = await ConsultationOffering.deleteOne({ _id: req.params.id, workerId: req.user.id });
    if (!result.deletedCount) return res.status(404).json({ success: false, data: null, message: 'Offering not found' });
    res.json({ success: true, data: null, message: 'Offering removed' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Worker: payout details + balance ──────────────────────────────────────
router.get('/me/payout-details', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id }).select('payoutDetails');
    res.json({ success: true, data: profile?.payoutDetails || null, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/me/payout-details', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const { method, bankName, branch, accountNumber, accountHolder, walletNumber, walletHolder } = req.body;
    if (!['bank', 'mobile_money', 'digital_wallet'].includes(method)) {
      return res.status(400).json({ success: false, data: null, message: 'method must be bank, mobile_money or digital_wallet' });
    }
    if (method === 'bank') {
      if (!bankName || !accountNumber || !accountHolder) {
        return res.status(400).json({ success: false, data: null, message: 'bankName, accountNumber and accountHolder required' });
      }
    } else {
      if (!walletNumber || !walletHolder) {
        return res.status(400).json({ success: false, data: null, message: 'walletNumber and walletHolder required' });
      }
    }

    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        payoutDetails: {
          method,
          bankName:      method === 'bank' ? bankName.trim() : undefined,
          branch:        method === 'bank' ? branch?.trim()  : undefined,
          accountNumber: method === 'bank' ? accountNumber.trim() : undefined,
          accountHolder: method === 'bank' ? accountHolder.trim() : undefined,
          walletNumber:  method !== 'bank' ? walletNumber.trim()  : undefined,
          walletHolder:  method !== 'bank' ? walletHolder.trim()  : undefined,
          updatedAt:     new Date(),
        },
      },
      { new: true }
    ).select('payoutDetails');
    res.json({ success: true, data: profile.payoutDetails, message: 'Payout details saved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/me/balance', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id }).select('availableBalances pendingBalances');
    res.json({
      success: true,
      data: {
        available: profile?.availableBalances ? Object.fromEntries(profile.availableBalances) : {},
        pending:   profile?.pendingBalances   ? Object.fromEntries(profile.pendingBalances)   : {},
      },
      message: 'OK',
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Worker: payouts (request + history) ───────────────────────────────────
router.post('/me/payouts/request', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const { amount, currency } = req.body;
    if (!amount || !currency) return res.status(400).json({ success: false, data: null, message: 'amount and currency required' });

    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile?.payoutDetails?.method) {
      return res.status(400).json({ success: false, data: null, message: 'Set your payout details first' });
    }
    const cur = currency.toUpperCase();
    const balance = profile.availableBalances.get(cur) || 0;
    const amt = Number(amount);
    if (amt <= 0 || amt > balance) {
      return res.status(400).json({ success: false, data: null, message: `Amount must be between 0 and ${balance} ${cur}` });
    }

    profile.availableBalances.set(cur, balance - amt);
    const pendingCurrent = profile.pendingBalances.get(cur) || 0;
    profile.pendingBalances.set(cur, pendingCurrent + amt);
    await profile.save();

    const payout = await Payout.create({
      workerId:  req.user.id,
      amount:    amt,
      currency:  cur,
      method:    profile.payoutDetails.method,
      recipient: {
        bankName:      profile.payoutDetails.bankName,
        branch:        profile.payoutDetails.branch,
        accountNumber: profile.payoutDetails.accountNumber,
        accountHolder: profile.payoutDetails.accountHolder,
        walletNumber:  profile.payoutDetails.walletNumber,
        walletHolder:  profile.payoutDetails.walletHolder,
      },
      status: 'pending',
    });
    res.status(201).json({ success: true, data: payout, message: 'Payout requested' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/me/payouts', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const payouts = await Payout.find({ workerId: req.user.id }).sort({ requestedAt: -1 }).limit(50);
    res.json({ success: true, data: payouts, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Public: a Pro's consultation offerings + availability ──────────────────
router.get('/workers/:userId/offerings', async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.params.userId });
    if (!profile || !profile.consultationsEnabled) {
      return res.json({ success: true, data: { offerings: [], enabled: false }, message: 'OK' });
    }
    const offerings = await ConsultationOffering
      .find({ workerId: req.params.userId, isActive: true })
      .sort({ sortOrder: 1, price: 1 });

    res.json({
      success: true,
      data: {
        enabled:  true,
        timezone: profile.consultationSchedule?.timezone || TIMEZONE,
        offerings,
      },
      message: 'OK',
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/workers/:userId/slots', async (req, res) => {
  try {
    const { offeringId, from, to } = req.query;
    if (!offeringId) return res.status(400).json({ success: false, data: null, message: 'offeringId required' });

    const profile = await WorkerProfile.findOne({ userId: req.params.userId });
    if (!profile || !profile.consultationsEnabled) {
      return res.json({ success: true, data: { slots: [] }, message: 'OK' });
    }
    const offering = await ConsultationOffering.findOne({ _id: offeringId, workerId: req.params.userId, isActive: true });
    if (!offering) return res.status(404).json({ success: false, data: null, message: 'Offering not found' });

    const fromDate = from ? new Date(from) : new Date();
    const windowDays = profile.consultationSchedule?.bookingWindowDays || 30;
    const toDate = to
      ? new Date(to)
      : new Date(fromDate.getTime() + windowDays * 24 * 60 * 60 * 1000);

    const existingBookings = await ConsultationBooking.find({
      workerId: req.params.userId,
      status:   { $in: ['pending_payment', 'confirmed', 'in_progress'] },
      startsAt: { $gte: fromDate, $lte: toDate },
    }).select('startsAt endsAt');

    const slots = computeAvailableSlots({
      schedule:         profile.consultationSchedule,
      durationMinutes:  offering.durationMinutes,
      from:             fromDate,
      to:               toDate,
      existingBookings,
    });

    res.json({ success: true, data: { slots }, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Booking: create + payment intent ───────────────────────────────────────
router.post('/bookings', authenticateToken, async (req, res) => {
  try {
    const { workerUserId, offeringId, startsAt, clientNotes } = req.body;
    if (!workerUserId || !offeringId || !startsAt) {
      return res.status(400).json({ success: false, data: null, message: 'workerUserId, offeringId, startsAt required' });
    }

    const [workerProfile, offering] = await Promise.all([
      WorkerProfile.findOne({ userId: workerUserId }),
      ConsultationOffering.findOne({ _id: offeringId, workerId: workerUserId, isActive: true }),
    ]);
    if (!workerProfile?.consultationsEnabled) return res.status(404).json({ success: false, data: null, message: 'Pro not available for consultations' });
    if (!offering)                            return res.status(404).json({ success: false, data: null, message: 'Offering not found' });
    if (!workerProfile.payoutDetails?.method) {
      return res.status(400).json({ success: false, data: null, message: 'Pro has not set up payout details yet' });
    }

    const startDate = new Date(startsAt);
    const endDate   = new Date(startDate.getTime() + offering.durationMinutes * 60 * 1000);

    const conflict = await ConsultationBooking.findOne({
      workerId: workerUserId,
      status:   { $in: ['pending_payment', 'confirmed', 'in_progress'] },
      startsAt: { $lt: endDate },
      endsAt:   { $gt: startDate },
    });
    if (conflict) return res.status(409).json({ success: false, data: null, message: 'Slot just got taken — pick another time' });

    const { percent } = await resolveEffectiveCommission(workerUserId);
    const { commissionAmount, proPayout } = computeSplit({ price: offering.price, percent });

    const booking = await ConsultationBooking.create({
      clientId:   req.user.id,
      workerId:   workerUserId,
      offeringId,
      offering: {
        title:           offering.title,
        durationMinutes: offering.durationMinutes,
        price:           offering.price,
        currency:        offering.currency,
      },
      startsAt:           startDate,
      endsAt:             endDate,
      status:             'pending_payment',
      commissionPercent:  percent,
      commissionAmount,
      proPayout,
      clientPaid:         offering.price,
      currency:           offering.currency,
      clientNotes:        clientNotes || '',
    });

    const intent = await stripeService.createConsultationPaymentIntent({
      amount:   offering.price,
      currency: offering.currency,
      metadata: { bookingId: String(booking._id), clientUserId: req.user.id, workerUserId },
    });
    booking.stripePaymentIntentId = intent.id;
    await booking.save();

    res.status(201).json({
      success: true,
      data: { booking, clientSecret: intent.clientSecret },
      message: 'Booking created',
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Bookings: mine (both as client and as worker) ──────────────────────────
router.get('/bookings/mine', authenticateToken, async (req, res) => {
  try {
    const { role = 'client', when = 'upcoming' } = req.query;
    const filter = role === 'worker' ? { workerId: req.user.id } : { clientId: req.user.id };
    const now = new Date();

    if (when === 'upcoming') {
      filter.startsAt = { $gte: now };
      filter.status   = { $in: ['pending_payment', 'confirmed', 'in_progress'] };
    } else if (when === 'past') {
      filter.$or = [
        { startsAt: { $lt: now } },
        { status: { $in: ['completed', 'cancelled', 'no_show', 'refunded'] } },
      ];
    }

    const bookings = await ConsultationBooking.find(filter)
      .populate('clientId',  'name email phone profilePhoto')
      .populate('workerId',  'name email profilePhoto')
      .sort({ startsAt: when === 'upcoming' ? 1 : -1 })
      .limit(100);
    res.json({ success: true, data: bookings, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await ConsultationBooking.findById(req.params.id)
      .populate('clientId', 'name email phone profilePhoto')
      .populate('workerId', 'name email profilePhoto');
    if (!booking) return res.status(404).json({ success: false, data: null, message: 'Booking not found' });

    const userId = req.user.id;
    const isParty = String(booking.clientId._id) === userId || String(booking.workerId._id) === userId;
    if (!isParty && req.user.role !== 'admin') return res.status(403).json({ success: false, data: null, message: 'Forbidden' });

    res.json({ success: true, data: booking, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── LiveKit join token ─────────────────────────────────────────────────────
router.post('/bookings/:id/livekit-token', authenticateToken, async (req, res) => {
  try {
    const booking = await ConsultationBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, data: null, message: 'Booking not found' });

    const userId = req.user.id;
    const isClient = String(booking.clientId) === userId;
    const isWorker = String(booking.workerId) === userId;
    if (!isClient && !isWorker) return res.status(403).json({ success: false, data: null, message: 'Forbidden' });

    if (!['confirmed', 'in_progress'].includes(booking.status)) {
      return res.status(400).json({ success: false, data: null, message: 'Booking is not joinable' });
    }
    const now = new Date();
    const fiveMinBefore = new Date(booking.startsAt.getTime() - 5 * 60 * 1000);
    if (now < fiveMinBefore) {
      return res.status(400).json({ success: false, data: null, message: 'Call opens 5 minutes before start time' });
    }
    if (now > booking.endsAt) {
      return res.status(400).json({ success: false, data: null, message: 'This consultation has ended' });
    }

    if (!booking.liveKitRoomName) {
      booking.liveKitRoomName = `consultation-${booking._id}`;
      await booking.save();
    }

    const user = await User.findById(userId).select('name');
    const token = await liveKitService.issueAccessToken({
      roomName:     booking.liveKitRoomName,
      identity:     userId,
      name:         user.name,
      isModerator:  isWorker,
    });

    booking.joinedAt = booking.joinedAt || {};
    if (isClient && !booking.joinedAt.client) booking.joinedAt.client = now;
    if (isWorker && !booking.joinedAt.worker) booking.joinedAt.worker = now;
    if (booking.status === 'confirmed') booking.status = 'in_progress';
    await booking.save();

    res.json({
      success: true,
      data: { token, room: booking.liveKitRoomName, url: process.env.LIVEKIT_URL },
      message: 'OK',
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Confirm payment (client calls this right after Stripe resolves) ────────
router.post('/bookings/:id/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const booking = await ConsultationBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, data: null, message: 'Booking not found' });

    if (String(booking.clientId) !== req.user.id) {
      return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    }

    if (booking.status === 'confirmed') {
      return res.json({ success: true, data: booking, message: 'Already confirmed' });
    }

    if (booking.status !== 'pending_payment') {
      return res.status(400).json({ success: false, data: null, message: `Cannot confirm a booking with status: ${booking.status}` });
    }

    const intent = await stripeService.retrievePaymentIntent(booking.stripePaymentIntentId);
    if (intent.status !== 'succeeded') {
      return res.status(402).json({ success: false, data: null, message: `Payment not completed (status: ${intent.status})` });
    }

    booking.status         = 'confirmed';
    booking.stripeChargeId = intent.latest_charge;
    await booking.save();

    const profile = await WorkerProfile.findOne({ userId: booking.workerId });
    if (profile) {
      const cur = booking.currency;
      const current = profile.availableBalances.get(cur) || 0;
      profile.availableBalances.set(cur, current + booking.proPayout);
      await profile.save();
    }

    await scheduleConsultationReminder(booking._id, booking.startsAt);

    res.json({ success: true, data: booking, message: 'Booking confirmed' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Cancel a booking ───────────────────────────────────────────────────────
router.put('/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const booking = await ConsultationBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, data: null, message: 'Booking not found' });

    const userId = req.user.id;
    const isClient = String(booking.clientId) === userId;
    const isWorker = String(booking.workerId) === userId;
    if (!isClient && !isWorker) return res.status(403).json({ success: false, data: null, message: 'Forbidden' });

    if (!['pending_payment', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ success: false, data: null, message: 'This booking cannot be cancelled' });
    }

    const wasConfirmed = booking.status === 'confirmed';
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = isClient ? 'client' : 'worker';
    booking.cancellationReason = req.body.reason || '';

    if (wasConfirmed && booking.stripePaymentIntentId) {
      try {
        const refund = await stripeService.refundPaymentIntent(booking.stripePaymentIntentId);
        if (refund?.id) {
          booking.stripeRefundId = refund.id;
          booking.status = 'refunded';

          const profile = await WorkerProfile.findOne({ userId: booking.workerId });
          if (profile) {
            const cur = booking.currency;
            const cur_balance = profile.availableBalances.get(cur) || 0;
            profile.availableBalances.set(cur, Math.max(0, cur_balance - booking.proPayout));
            await profile.save();
          }
        }
      } catch (e) { /* surface in admin */ }
    }
    await booking.save();

    await cancelConsultationReminder(booking._id);

    res.json({ success: true, data: booking, message: 'Cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

export default router;
