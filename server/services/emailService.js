import nodemailer from 'nodemailer';
import { SITE_NAME } from '../config/site.js';

/* ── Transporter ─────────────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

/* ── Send helper ─────────────────────────────────────────────────── */
export async function sendMail({ to, subject, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('\n📧 EMAIL (SMTP not configured — showing in console)');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"${SITE_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

/* ── Password reset email ─────────────────────────────────────────── */
export async function sendPasswordResetEmail(email, resetUrl) {
  await sendMail({
    to: email,
    subject: `Reset your ${SITE_NAME} password`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                      border-radius:14px;padding:10px 20px;">
            <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">sL</span>
          </div>
        </div>
        <h2 style="font-size:22px;font-weight:800;color:#1c1917;margin-bottom:8px;">
          Reset your password
        </h2>
        <p style="color:#78716c;font-size:14px;line-height:1.6;margin-bottom:24px;">
          We received a request to reset the password for your ${SITE_NAME} account.
          Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${resetUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                    color:#fff;font-weight:700;font-size:15px;padding:13px 32px;
                    border-radius:12px;text-decoration:none;">
            Reset Password →
          </a>
        </div>
        <p style="color:#a8a29e;font-size:12px;line-height:1.6;margin-bottom:4px;">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
        <p style="color:#a8a29e;font-size:12px;">
          Or copy this link: <a href="${resetUrl}" style="color:#7c3aed;">${resetUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #f5f5f4;margin:24px 0;" />
        <p style="color:#d6d3d1;font-size:11px;text-align:center;">
          © ${new Date().getFullYear()} ${SITE_NAME} · Local Skills Marketplace
        </p>
      </div>
    `,
  });
}

/* ── Generic notification email ───────────────────────────────────── */
export async function sendNotificationEmail(email, subject, bodyHtml) {
  await sendMail({
    to: email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                      border-radius:14px;padding:10px 20px;">
            <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">sL</span>
          </div>
        </div>
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #f5f5f4;margin:24px 0;" />
        <p style="color:#d6d3d1;font-size:11px;text-align:center;">
          © ${new Date().getFullYear()} ${SITE_NAME} · Local Skills Marketplace
        </p>
      </div>
    `,
  });
}

/* ── Consultation reminder emails ─────────────────────────────────── */
export async function sendConsultationReminderClient(email, clientName, proName, time, date, bookingUrl) {
  await sendMail({
    to: email,
    subject: `Your consultation starts in 10 minutes — ${proName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                      border-radius:14px;padding:10px 20px;">
            <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">sL</span>
          </div>
        </div>
        <h2 style="font-size:20px;font-weight:800;color:#1c1917;margin-bottom:8px;">
          Your session starts soon
        </h2>
        <p style="color:#78716c;font-size:14px;line-height:1.6;margin-bottom:20px;">
          Hi <strong>${clientName}</strong>, your consultation with <strong>${proName}</strong>
          starts in approximately <strong>10 minutes</strong>.
        </p>
        <div style="background:#f5f3ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0 0 6px;font-size:13px;color:#6d28d9;font-weight:700;">Session details</p>
          <p style="margin:0;font-size:14px;color:#1c1917;"><strong>Time:</strong> ${time}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Date:</strong> ${date}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Pro:</strong> ${proName}</p>
        </div>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${bookingUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                    color:#fff;font-weight:700;font-size:15px;padding:13px 32px;
                    border-radius:12px;text-decoration:none;">
            Join Call Now
          </a>
        </div>
        <p style="color:#a8a29e;font-size:12px;text-align:center;">
          Make sure your camera and microphone are ready before joining.
        </p>
        <hr style="border:none;border-top:1px solid #f5f5f4;margin:24px 0;" />
        <p style="color:#d6d3d1;font-size:11px;text-align:center;">
          © ${new Date().getFullYear()} ${SITE_NAME} · Local Skills Marketplace
        </p>
      </div>
    `,
  });
}

/* ── Live class email helpers ─────────────────────────────────────── */

/** Shared branded wrapper so all live-class emails look identical */
function liveClassEmail(bodyHtml) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                    border-radius:14px;padding:10px 20px;">
          <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">sL</span>
        </div>
      </div>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #f5f5f4;margin:24px 0;" />
      <p style="color:#d6d3d1;font-size:11px;text-align:center;">
        © ${new Date().getFullYear()} ${SITE_NAME} · Local Skills Marketplace
      </p>
    </div>
  `;
}

/**
 * Sent to a student immediately after successful enrollment.
 * @param {string} email
 * @param {string} studentName
 * @param {string} classTitle
 * @param {string} hostName
 * @param {string} time   e.g. "3:00 PM"
 * @param {string} date   e.g. "Saturday, 1 June 2026"
 * @param {string} classUrl  full URL to the class detail page
 */
export async function sendLiveClassEnrollmentConfirmation(email, studentName, classTitle, hostName, time, date, classUrl) {
  await sendMail({
    to: email,
    subject: `You're enrolled — ${classTitle}`,
    html: liveClassEmail(`
      <h2 style="font-size:20px;font-weight:800;color:#1c1917;margin-bottom:8px;">
        Enrollment confirmed 🎉
      </h2>
      <p style="color:#78716c;font-size:14px;line-height:1.6;margin-bottom:20px;">
        Hi <strong>${studentName}</strong>, you're all set for <strong>${classTitle}</strong>
        hosted by <strong>${hostName}</strong>.
      </p>
      <div style="background:#f5f3ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:13px;color:#6d28d9;font-weight:700;">Class details</p>
        <p style="margin:0;font-size:14px;color:#1c1917;"><strong>Class:</strong> ${classTitle}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Host:</strong> ${hostName}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Date:</strong> ${date}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Time:</strong> ${time}</p>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${classUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                  color:#fff;font-weight:700;font-size:15px;padding:13px 32px;
                  border-radius:12px;text-decoration:none;">
          View Class →
        </a>
      </div>
      <p style="color:#a8a29e;font-size:12px;text-align:center;">
        You'll receive a reminder 1 hour before the class starts. Make sure your camera and
        microphone are ready.
      </p>
    `),
  });
}

/**
 * Sent to the host when a new student enrolls.
 */
export async function sendLiveClassNewEnrollmentHost(email, hostName, studentName, classTitle, enrolledCount, maxSeats) {
  await sendMail({
    to: email,
    subject: `New enrollment — ${classTitle}`,
    html: liveClassEmail(`
      <h2 style="font-size:20px;font-weight:800;color:#1c1917;margin-bottom:8px;">
        New student enrolled
      </h2>
      <p style="color:#78716c;font-size:14px;line-height:1.6;margin-bottom:20px;">
        Hi <strong>${hostName}</strong>, <strong>${studentName}</strong> just enrolled in
        <strong>${classTitle}</strong>. You now have <strong>${enrolledCount}</strong> of
        ${maxSeats} seats filled.
      </p>
    `),
  });
}

/**
 * 1-hour reminder to a student before the class.
 */
export async function sendLiveClassReminderStudent(email, studentName, classTitle, hostName, time, date, classUrl) {
  await sendMail({
    to: email,
    subject: `Your class starts in 1 hour — ${classTitle}`,
    html: liveClassEmail(`
      <h2 style="font-size:20px;font-weight:800;color:#1c1917;margin-bottom:8px;">
        Class starts soon ⏰
      </h2>
      <p style="color:#78716c;font-size:14px;line-height:1.6;margin-bottom:20px;">
        Hi <strong>${studentName}</strong>, <strong>${classTitle}</strong> with
        <strong>${hostName}</strong> starts in approximately <strong>1 hour</strong>.
      </p>
      <div style="background:#f5f3ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:13px;color:#6d28d9;font-weight:700;">Session details</p>
        <p style="margin:0;font-size:14px;color:#1c1917;"><strong>Class:</strong> ${classTitle}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Host:</strong> ${hostName}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Date:</strong> ${date}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Time:</strong> ${time}</p>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${classUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                  color:#fff;font-weight:700;font-size:15px;padding:13px 32px;
                  border-radius:12px;text-decoration:none;">
          Join Class →
        </a>
      </div>
    `),
  });
}

/**
 * 1-hour reminder to the host before their class.
 */
export async function sendLiveClassReminderHost(email, hostName, classTitle, studentCount, time, date, classUrl) {
  await sendMail({
    to: email,
    subject: `Your class starts in 1 hour — ${classTitle}`,
    html: liveClassEmail(`
      <h2 style="font-size:20px;font-weight:800;color:#1c1917;margin-bottom:8px;">
        Your class is about to start ⏰
      </h2>
      <p style="color:#78716c;font-size:14px;line-height:1.6;margin-bottom:20px;">
        Hi <strong>${hostName}</strong>, <strong>${classTitle}</strong> starts in approximately
        <strong>1 hour</strong>. You have <strong>${studentCount}</strong> student${studentCount !== 1 ? 's' : ''} enrolled.
      </p>
      <div style="background:#f5f3ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:13px;color:#6d28d9;font-weight:700;">Session details</p>
        <p style="margin:0;font-size:14px;color:#1c1917;"><strong>Class:</strong> ${classTitle}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Date:</strong> ${date}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Time:</strong> ${time}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Students:</strong> ${studentCount}</p>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${classUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                  color:#fff;font-weight:700;font-size:15px;padding:13px 32px;
                  border-radius:12px;text-decoration:none;">
          Start Class →
        </a>
      </div>
    `),
  });
}

/**
 * Sent to all enrolled students when a class is cancelled.
 * @param {string} reason  optional cancellation reason
 */
export async function sendLiveClassCancellationStudent(email, studentName, classTitle, hostName, reason) {
  await sendMail({
    to: email,
    subject: `Class cancelled — ${classTitle}`,
    html: liveClassEmail(`
      <h2 style="font-size:20px;font-weight:800;color:#1c1917;margin-bottom:8px;">
        Class has been cancelled
      </h2>
      <p style="color:#78716c;font-size:14px;line-height:1.6;margin-bottom:20px;">
        Hi <strong>${studentName}</strong>, unfortunately <strong>${classTitle}</strong> hosted by
        <strong>${hostName}</strong> has been cancelled.
        ${reason ? `<br/><br/>Reason: <em>${reason}</em>` : ''}
      </p>
      <div style="background:#fef2f2;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">
          A full refund has been issued to your original payment method and should appear within 5–10 business days.
        </p>
      </div>
      <p style="color:#78716c;font-size:14px;line-height:1.6;">
        Browse other live classes at
        <a href="${process.env.CLIENT_URL}/live-classes" style="color:#7c3aed;">${SITE_NAME}</a>.
      </p>
    `),
  });
}

export async function sendConsultationReminderWorker(email, proName, clientName, time, date, bookingUrl) {
  await sendMail({
    to: email,
    subject: `Your consultation starts in 10 minutes — ${clientName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                      border-radius:14px;padding:10px 20px;">
            <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">sL</span>
          </div>
        </div>
        <h2 style="font-size:20px;font-weight:800;color:#1c1917;margin-bottom:8px;">
          Upcoming session reminder
        </h2>
        <p style="color:#78716c;font-size:14px;line-height:1.6;margin-bottom:20px;">
          Hi <strong>${proName}</strong>, your consultation with <strong>${clientName}</strong>
          starts in approximately <strong>10 minutes</strong>.
        </p>
        <div style="background:#f5f3ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0 0 6px;font-size:13px;color:#6d28d9;font-weight:700;">Session details</p>
          <p style="margin:0;font-size:14px;color:#1c1917;"><strong>Time:</strong> ${time}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Date:</strong> ${date}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#1c1917;"><strong>Client:</strong> ${clientName}</p>
        </div>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${bookingUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);
                    color:#fff;font-weight:700;font-size:15px;padding:13px 32px;
                    border-radius:12px;text-decoration:none;">
            Join Call Now
          </a>
        </div>
        <p style="color:#a8a29e;font-size:12px;text-align:center;">
          Make sure your camera and microphone are ready before joining.
        </p>
        <hr style="border:none;border-top:1px solid #f5f5f4;margin:24px 0;" />
        <p style="color:#d6d3d1;font-size:11px;text-align:center;">
          © ${new Date().getFullYear()} ${SITE_NAME} · Local Skills Marketplace
        </p>
      </div>
    `,
  });
}
