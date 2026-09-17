import express from 'express';
import * as stripeService from '../services/stripeService.js';
import ConsultationBooking from '../models/ConsultationBooking.js';
import LiveClass            from '../models/LiveClass.js';
import ShopItem             from '../models/ShopItem.js';
import ShopRequest          from '../models/ShopRequest.js';
import ShopSale             from '../models/ShopSale.js';
import WorkerProfile        from '../models/WorkerProfile.js';
import User                 from '../models/User.js';
import { computeSplit, resolveShopCommission } from '../services/commissionService.js';
import { scheduleConsultationReminder, scheduleLiveClassReminder } from '../services/agendaService.js';
import {
  sendLiveClassEnrollmentConfirmation,
  sendLiveClassNewEnrollmentHost,
} from '../services/emailService.js';
import {
  sendSMS,
  smsLiveClassEnrolled,
  smsLiveClassNewEnrollment,
} from '../services/smsService.js';
import { DEFAULT_CURRENCY, TIMEZONE, DATE_LOCALE } from '../config/site.js';

const router = express.Router();

// IMPORTANT: this route must receive the *raw* request body to validate the
// webhook signature. Mounted with express.raw() in server.js BEFORE express.json().
router.post('/', async (req, res) => {
  let event;
  try {
    event = stripeService.constructWebhookEvent(req.body, req.headers['stripe-signature']);
  } catch (err) {
    console.error('[stripe-webhook] signature verify failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent    = event.data.object;
        const { bookingId, liveClassId, userId, shopItemId, shopRequestId } = intent.metadata || {};

        // ── Live class enrollment ─────────────────────────────────────────
        if (liveClassId) {
          const liveClass = await LiveClass.findById(liveClassId)
            .populate('hostId', 'name phone email');

          if (liveClass && liveClass.status === 'open') {
            const alreadyEnrolled = liveClass.enrolledStudents.some(
              e => e.userId.toString() === userId
            );

            if (!alreadyEnrolled) {
              liveClass.enrolledStudents.push({
                userId,
                paymentIntentId: intent.id,
                enrolledAt: new Date(),
              });
              await liveClass.save();

              // Schedule 1-hour reminder (idempotent, re-schedules if already set)
              await scheduleLiveClassReminder(liveClass._id, liveClass.scheduledAt);

              // Notify student
              const student = await User.findById(userId).select('name phone email').lean();
              if (student) {
                const scheduledAt = new Date(liveClass.scheduledAt);
                const time = scheduledAt.toLocaleTimeString(DATE_LOCALE, {
                  hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TIMEZONE,
                });
                const date = scheduledAt.toLocaleDateString(DATE_LOCALE, {
                  weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', timeZone: TIMEZONE,
                });
                const classUrl = `${process.env.CLIENT_URL}/live-classes/${liveClass._id}`;

                if (student.email) {
                  await sendLiveClassEnrollmentConfirmation(
                    student.email, student.name, liveClass.title,
                    liveClass.hostId?.name || 'Host', time, date, classUrl
                  ).catch(err => console.error('[stripe-webhook] enrollment email failed:', err.message));
                }
                if (student.phone) {
                  await sendSMS(
                    student.phone,
                    smsLiveClassEnrolled(student.name, liveClass.title, date, time)
                  ).catch(err => console.error('[stripe-webhook] enrollment SMS failed:', err.message));
                }

                // Notify host
                const host = liveClass.hostId;
                const enrolledCount = liveClass.enrolledStudents.length;
                if (host?.email) {
                  await sendLiveClassNewEnrollmentHost(
                    host.email, host.name, student.name, liveClass.title,
                    enrolledCount, liveClass.maxSeats
                  ).catch(err => console.error('[stripe-webhook] host email failed:', err.message));
                }
                if (host?.phone) {
                  await sendSMS(
                    host.phone,
                    smsLiveClassNewEnrollment(host.name, student.name, liveClass.title)
                  ).catch(err => console.error('[stripe-webhook] host SMS failed:', err.message));
                }
              }

              console.log(`[stripe-webhook] live class enrollment confirmed — class ${liveClassId} user ${userId}`);
            }
          }
          break;
        }

        // ── Shop direct purchase ──────────────────────────────────────────
        if (shopItemId) {
          // Idempotency: /confirm endpoint may have already created the ShopSale
          const existingSale = await ShopSale.findOne({ paymentIntentId: intent.id }).lean();
          if (existingSale) {
            console.log(`[stripe-webhook] shop item sale already processed — ${intent.id}`);
            break;
          }

          const item = await ShopItem.findById(shopItemId);
          if (!item) { console.warn(`[stripe-webhook] shop item not found: ${shopItemId}`); break; }

          const commission = await resolveShopCommission(String(item.workerId));
          const { commissionAmount, proPayout } = computeSplit({ price: item.price, percent: commission.percent });

          // Credit worker balance
          const profile = await WorkerProfile.findOne({ userId: item.workerId });
          if (profile) {
            const cur     = (item.currency || DEFAULT_CURRENCY).toUpperCase();
            const current = profile.availableBalances.get(cur) || 0;
            profile.availableBalances.set(cur, current + proPayout);
            await profile.save();
          }

          // Update item stock / sold count
          if (item.stock !== null) {
            item.stock = Math.max(0, item.stock - 1);
            if (item.stock === 0) item.status = 'sold_out';
          }
          item.soldCount              += 1;
          item.lastCommissionPercent   = commission.percent;
          item.lastWorkerEarning       = proPayout;
          item.lastPlatformEarning     = commissionAmount;
          await item.save();

          // Record sale
          await ShopSale.create({
            workerId:          item.workerId,
            buyerId:           intent.metadata?.buyerId,
            shopItemId:        item._id,
            paymentIntentId:   intent.id,
            type:              'direct',
            itemTitle:         item.title,
            amount:            item.price,
            workerEarning:     proPayout,
            platformEarning:   commissionAmount,
            commissionPercent: commission.percent,
            isFreeCommission:  commission.isFree,
            currency:          (item.currency || DEFAULT_CURRENCY).toUpperCase(),
          });

          console.log(`[stripe-webhook] shop item sale confirmed via webhook — item ${shopItemId}`);
          break;
        }

        // ── Shop commission request payment ───────────────────────────────────
        if (shopRequestId) {
          const request = await ShopRequest.findById(shopRequestId);

          // Idempotency: /confirm-payment may have already moved it to in_progress
          if (!request || ['in_progress', 'paid', 'completed'].includes(request.status)) {
            console.log(`[stripe-webhook] shop request already processed — ${shopRequestId}`);
            break;
          }

          const commission = await resolveShopCommission(String(request.workerId));
          const price      = request.quotedPrice;
          const { commissionAmount, proPayout } = computeSplit({ price, percent: commission.percent });

          // Credit worker balance
          const profile = await WorkerProfile.findOne({ userId: request.workerId });
          if (profile) {
            const current = profile.availableBalances.get(DEFAULT_CURRENCY) || 0;
            profile.availableBalances.set(DEFAULT_CURRENCY, current + proPayout);
            await profile.save();
          }

          // Update request status
          request.status             = 'in_progress';
          request.commissionPercent  = commission.percent;
          request.workerEarning      = proPayout;
          request.platformEarning    = commissionAmount;
          request.isFreeCommission   = commission.isFree;
          await request.save();

          // Record sale (upsert so /confirm-payment arriving later won't duplicate)
          await ShopSale.findOneAndUpdate(
            { paymentIntentId: intent.id },
            {
              $setOnInsert: {
                workerId:          request.workerId,
                buyerId:           request.clientId,
                shopRequestId:     request._id,
                paymentIntentId:   intent.id,
                type:              'commission_request',
                itemTitle:         request.title,
                amount:            price,
                workerEarning:     proPayout,
                platformEarning:   commissionAmount,
                commissionPercent: commission.percent,
                isFreeCommission:  commission.isFree,
                currency:          DEFAULT_CURRENCY,
                soldAt:            new Date(),
              },
            },
            { upsert: true, new: true }
          );

          console.log(`[stripe-webhook] shop commission request confirmed via webhook — req ${shopRequestId}`);
          break;
        }

        // ── Consultation booking ──────────────────────────────────────────
        if (!bookingId) break;

        const booking = await ConsultationBooking.findById(bookingId);
        if (!booking || booking.status !== 'pending_payment') break;

        booking.status         = 'confirmed';
        booking.stripeChargeId = intent.latest_charge;
        await booking.save();

        const profile = await WorkerProfile.findOne({ userId: booking.workerId });
        if (profile) {
          const current = profile.availableBalances.get(booking.currency) || 0;
          profile.availableBalances.set(booking.currency, current + booking.proPayout);
          await profile.save();
        }

        await scheduleConsultationReminder(booking._id, booking.startsAt);
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent    = event.data.object;
        const { bookingId } = intent.metadata || {};
        // For live classes, no DB action needed — student was never added to enrolledStudents
        if (bookingId) {
          await ConsultationBooking.findByIdAndUpdate(bookingId, {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: 'admin',
            cancellationReason: 'Payment failed',
          });
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
