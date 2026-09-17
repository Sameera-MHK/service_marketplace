import { Agenda } from 'agenda';
import { MongoBackend } from '@agendajs/mongo-backend';
import {
  sendSMS,
  smsConsultationReminderClient, smsConsultationReminderWorker,
  smsLiveClassReminderStudent, smsLiveClassReminderHost,
} from './smsService.js';
import {
  sendConsultationReminderClient, sendConsultationReminderWorker,
  sendLiveClassReminderStudent, sendLiveClassReminderHost,
} from './emailService.js';
import ConsultationBooking from '../models/ConsultationBooking.js';
import LiveClass from '../models/LiveClass.js';
import User      from '../models/User.js';
import { computeSplit }     from './commissionService.js';
import { TIMEZONE, DATE_LOCALE } from '../config/site.js';

const agenda = new Agenda({
  backend: new MongoBackend({ address: process.env.MONGO_URI, collection: 'agendaJobs' }),
  processEvery: '30 seconds',
  maxConcurrency: 5,
  defaultConcurrency: 1,
});

// ── Job definitions ──────────────────────────────────────────────────────────

agenda.define('consultation-reminder', { priority: 'high', concurrency: 3 }, async (job) => {
  const { bookingId } = job.attrs.data;

  const booking = await ConsultationBooking.findById(bookingId).lean();
  if (!booking) return;

  if (!['confirmed', 'in_progress'].includes(booking.status)) return;
  if (booking.smsReminderSent) return;

  const [client, worker] = await Promise.all([
    User.findById(booking.clientId).select('name phone email').lean(),
    User.findById(booking.workerId).select('name phone email').lean(),
  ]);

  const clientUrl = `${process.env.CLIENT_URL}/dashboard/bookings`;
  const startsAt  = new Date(booking.startsAt);

  const time = startsAt.toLocaleTimeString(DATE_LOCALE, {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TIMEZONE,
  });
  const date = startsAt.toLocaleDateString(DATE_LOCALE, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: TIMEZONE,
  });

  await Promise.all([
    client?.phone && sendSMS(client.phone,  smsConsultationReminderClient(client.name, worker?.name || 'your Pro', time)),
    worker?.phone && sendSMS(worker.phone,  smsConsultationReminderWorker(worker.name, client?.name || 'your client', time)),
    client?.email && sendConsultationReminderClient(client.email, client.name, worker?.name || 'your Pro', time, date, clientUrl),
    worker?.email && sendConsultationReminderWorker(worker.email, worker.name, client?.name || 'your client', time, date, clientUrl),
  ]);

  await ConsultationBooking.updateOne({ _id: bookingId }, { smsReminderSent: true });

  console.log(`[agenda] Consultation reminder sent — booking ${bookingId}`);
});

// ── Live class: 1-hour reminder ──────────────────────────────────────────────

agenda.define('live-class-reminder', { priority: 'high', concurrency: 5 }, async (job) => {
  const { liveClassId } = job.attrs.data;

  const liveClass = await LiveClass.findById(liveClassId)
    .populate('hostId', 'name phone email')
    .lean();

  if (!liveClass) return;
  if (!['open', 'live'].includes(liveClass.status)) return;
  if (liveClass.reminderSent) return; // guard against double-fire

  const scheduledAt = new Date(liveClass.scheduledAt);
  const classUrl    = `${process.env.CLIENT_URL}/live-classes/${liveClass._id}`;

  const time = scheduledAt.toLocaleTimeString(DATE_LOCALE, {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TIMEZONE,
  });
  const date = scheduledAt.toLocaleDateString(DATE_LOCALE, {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', timeZone: TIMEZONE,
  });

  // Notify host
  const host = liveClass.hostId;
  const studentCount = liveClass.enrolledStudents.length;
  if (host?.email) {
    await sendLiveClassReminderHost(host.email, host.name, liveClass.title, studentCount, time, date, classUrl).catch(console.error);
  }
  if (host?.phone) {
    await sendSMS(host.phone, smsLiveClassReminderHost(host.name, liveClass.title, studentCount, time)).catch(console.error);
  }

  // Notify each enrolled student
  const studentIds = liveClass.enrolledStudents.map(e => e.userId);
  const students   = await User.find({ _id: { $in: studentIds } }).select('name phone email').lean();

  await Promise.all(students.map(async (student) => {
    try {
      if (student.email) {
        await sendLiveClassReminderStudent(student.email, student.name, liveClass.title, host?.name || 'your host', time, date, classUrl);
      }
      if (student.phone) {
        await sendSMS(student.phone, smsLiveClassReminderStudent(student.name, liveClass.title, time));
      }
    } catch (err) {
      console.error(`[agenda] live-class-reminder: failed to notify student ${student._id}:`, err.message);
    }
  }));

  // Mark reminder as sent so re-fires don't duplicate
  await LiveClass.updateOne({ _id: liveClassId }, { reminderSent: true });
  console.log(`[agenda] Live class reminder sent — ${liveClassId}, ${studentCount} students`);
});

// ── Auto-complete stale live sessions ────────────────────────────────────────
// Runs every 10 minutes. If a class has been "live" for longer than its
// scheduled duration + a 30-min grace period, end it automatically.

agenda.define('auto-complete-live-classes', { concurrency: 1 }, async () => {
  const now = new Date();
  const staleLive = await LiveClass.find({ status: 'live' }).lean();

  for (const cls of staleLive) {
    const expectedEnd = new Date(
      new Date(cls.scheduledAt).getTime() + (cls.durationMinutes + 30) * 60_000
    );
    if (now < expectedEnd) continue;

    try {
      const totalRevenue = cls.enrolledStudents.length * cls.pricePerSeat;
      const { commissionAmount, proPayout } = computeSplit({
        price: totalRevenue,
        percent: cls.commissionPercent ?? 0,
      });

      await LiveClass.updateOne({ _id: cls._id }, {
        status:           'completed',
        completedAt:      now,
        totalRevenue,
        commissionAmount,
        hostPayout:       proPayout,
      });

      // Live class balance is computed dynamically from completed LiveClass records,
      // so no stored field update is needed here.

      console.log(`[agenda] Auto-completed stale live class ${cls._id}`);
    } catch (err) {
      console.error(`[agenda] auto-complete-live-classes error for ${cls._id}:`, err.message);
    }
  }
});

// ── Helpers exported to other modules ────────────────────────────────────────

export async function scheduleConsultationReminder(bookingId, startsAt) {
  const reminderAt = new Date(new Date(startsAt).getTime() - 10 * 60 * 1000);

  await agenda.cancel({ name: 'consultation-reminder', 'data.bookingId': String(bookingId) });

  if (reminderAt > new Date()) {
    await agenda.schedule(reminderAt, 'consultation-reminder', { bookingId: String(bookingId) });
    console.log(`[agenda] Reminder scheduled — booking ${bookingId} at ${reminderAt.toISOString()}`);
  }
}

export async function cancelConsultationReminder(bookingId) {
  const count = await agenda.cancel({ name: 'consultation-reminder', 'data.bookingId': String(bookingId) });
  if (count) console.log(`[agenda] Reminder cancelled — booking ${bookingId}`);
}

/**
 * Schedule (or re-schedule) the 1-hour pre-class reminder for a live class.
 * Safe to call multiple times — cancels any existing job first.
 */
export async function scheduleLiveClassReminder(liveClassId, scheduledAt) {
  const reminderAt = new Date(new Date(scheduledAt).getTime() - 60 * 60 * 1000); // 1 hour before
  await agenda.cancel({ name: 'live-class-reminder', 'data.liveClassId': String(liveClassId) });
  if (reminderAt > new Date()) {
    await agenda.schedule(reminderAt, 'live-class-reminder', { liveClassId: String(liveClassId) });
    console.log(`[agenda] Live class reminder scheduled — ${liveClassId} at ${reminderAt.toISOString()}`);
  }
}

export async function cancelLiveClassReminder(liveClassId) {
  const count = await agenda.cancel({ name: 'live-class-reminder', 'data.liveClassId': String(liveClassId) });
  if (count) console.log(`[agenda] Live class reminder cancelled — ${liveClassId}`);
}

export { agenda };
