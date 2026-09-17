import { SITE_NAME, SITE_HOST, PHONE_COUNTRY_CODE, PHONE_NATIONAL_DIGITS } from '../config/site.js';

const GSM7 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  ' !"#$%&\'()*+,-./:;<=>?@_\n\r' +
  '£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉÀ' +
  '{}[]\\^~|€';

const GSM7_SET = new Set(GSM7);

function toGSM7(text) {
  return [...String(text)]
    .map((ch) => (GSM7_SET.has(ch) ? ch : '?'))
    .join('');
}

/**
 * Normalise a phone number to bare international format (no `+`, no spaces).
 * Accepts `00<cc>…`, `<cc>…`, `0<national>` and a bare national number.
 * Country code and national-number length come from config/site.js.
 *
 * Returns null when the number cannot be interpreted.
 */
export function normalizePhone(phone) {
  if (!phone) return null;
  const cc  = PHONE_COUNTRY_CODE;
  const nsn = PHONE_NATIONAL_DIGITS;

  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('00' + cc))                              digits = digits.slice(2);
  if (digits.startsWith(cc) && digits.length === cc.length + nsn) return digits;
  if (digits.startsWith('0')  && digits.length === nsn + 1)       return cc + digits.slice(1);
  if (digits.length === nsn)                                      return cc + digits;
  return null;
}

/**
 * Send a transactional SMS through an HTTP gateway.
 *
 * The request body matches the widely used
 * `{ api_token, recipient, sender_id, type, message }` shape. Point
 * `SMS_API_URL` at your provider's send endpoint; if it or `SMS_API_TOKEN` is
 * unset, messages are logged to the console instead of being sent, so local
 * development needs no SMS account.
 */
export async function sendSMS(phone, message) {
  const token    = process.env.SMS_API_TOKEN;
  const endpoint = process.env.SMS_API_URL;
  const senderId = process.env.SMS_SENDER_ID || SITE_NAME;

  if (!token || !endpoint) {
    console.log(`[SMS] Gateway not configured — logging instead. To: ${phone} | Msg: ${message}`);
    return;
  }

  const recipient = normalizePhone(phone);
  if (!recipient) {
    console.warn(`[SMS] Invalid phone number skipped: ${phone}`);
    return;
  }

  const safeMessage = toGSM7(message).slice(0, 160);

  try {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify({
        api_token: token,
        recipient,
        sender_id: senderId,
        type:      'plain',
        message:   safeMessage,
      }),
    });

    const json = await res.json().catch(() => null);
    if (res.ok && json?.status !== 'error') {
      console.log(`[SMS] OK - Sent to ${recipient}`);
    } else {
      console.warn(`[SMS] FAILED - ${recipient}:`, json?.message || res.statusText);
    }
  } catch (err) {
    console.error('[SMS] Request error:', err.message);
  }
}

function fmtNum(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function smsNewJob(workerName, jobTitle, clientName, date) {
  return `${SITE_NAME}: Hi ${workerName}, you have a new job request. Job: ${jobTitle}. From: ${clientName}. Date: ${date}. Login at ${SITE_HOST}`;
}

export function smsDepositPaid(workerName, jobTitle, amount) {
  return `${SITE_NAME}: Hi ${workerName}, deposit of ${fmtNum(amount)} received for "${jobTitle}". You can start the job now.`;
}

export function smsJobCompleted(clientName, jobTitle) {
  return `${SITE_NAME}: Hi ${clientName}, your worker has marked "${jobTitle}" as complete. Please log in to confirm and release payment.`;
}

export function smsDisputeOpened(recipientName, jobTitle) {
  return `${SITE_NAME}: Hi ${recipientName}, a dispute has been raised on "${jobTitle}". Our team will review and contact you within 24 hours.`;
}

export function smsSubscriptionApproved(workerName, planName, expiry) {
  return `${SITE_NAME}: Hi ${workerName}, your ${planName} plan is now active until ${expiry}. You can now receive leads on ${SITE_HOST}`;
}

export function smsSubscriptionRejected(workerName, planName, reason) {
  return `${SITE_NAME}: Hi ${workerName}, your ${planName} subscription could not be verified. Reason: ${reason}. Please resubmit at ${SITE_HOST}`;
}

export function smsConsultationReminderClient(clientName, proName, time) {
  return `${SITE_NAME}: Hi ${clientName}, your consultation with ${proName} starts in 10 minutes at ${time}. Join at ${SITE_HOST}/dashboard/bookings`;
}

export function smsConsultationReminderWorker(proName, clientName, time) {
  return `${SITE_NAME}: Hi ${proName}, your consultation with ${clientName} starts in 10 minutes at ${time}. Join at ${SITE_HOST}/dashboard/bookings`;
}

// ── Live class SMS ────────────────────────────────────────────────────────────

export function smsLiveClassEnrolled(studentName, classTitle, date, time) {
  return `${SITE_NAME}: Hi ${studentName}, you're enrolled in "${classTitle}" on ${date} at ${time}. View at ${SITE_HOST}/live-classes`;
}

export function smsLiveClassNewEnrollment(hostName, studentName, classTitle) {
  return `${SITE_NAME}: Hi ${hostName}, ${studentName} enrolled in your class "${classTitle}". Login to view details.`;
}

export function smsLiveClassReminderStudent(studentName, classTitle, time) {
  return `${SITE_NAME}: Hi ${studentName}, your live class "${classTitle}" starts in 1 hour at ${time}. Be ready at ${SITE_HOST}/live-classes`;
}

export function smsLiveClassReminderHost(hostName, classTitle, studentCount, time) {
  return `${SITE_NAME}: Hi ${hostName}, your class "${classTitle}" starts in 1 hour at ${time}. ${studentCount} student${studentCount !== 1 ? 's' : ''} enrolled. Login to start.`;
}

export function smsLiveClassCancelled(studentName, classTitle) {
  return `${SITE_NAME}: Hi ${studentName}, the class "${classTitle}" has been cancelled. A full refund will be issued within 5-10 business days.`;
}
