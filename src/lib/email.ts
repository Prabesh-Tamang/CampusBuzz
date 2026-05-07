import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendRegistrationEmail({
  to,
  name,
  eventName,
  eventDate,
  eventVenue,
  qrCodeDataUrl,
  registrationId,
}: {
  to: string;
  name: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  qrCodeDataUrl: string;
  registrationId: string;
}) {
  const isPending = !qrCodeDataUrl;
  try {
    await transporter.sendMail({
      from: `"CampusBuzz" <${process.env.EMAIL_USER}>`,
      to,
      subject: isPending ? `📋 Registration Received — ${eventName}` : `✅ Attendance Confirmed – ${eventName}`,
      html: isPending ? `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:40px;text-align:center;">
          <h1 style="margin:0;color:white;font-size:28px;">CampusBuzz</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Registration received — confirmation required</p>
        </div>
        <div style="padding:40px;">
          <p style="font-size:18px;">Hi <strong>${name}</strong>,</p>
          <p>You've registered for <strong style="color:#14b8a6;">${eventName}</strong>!</p>
          <div style="background:#1e293b;border-radius:12px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 8px;"><strong>📅 Date:</strong> ${eventDate}</p>
            <p style="margin:0 0 8px;"><strong>📍 Venue:</strong> ${eventVenue}</p>
            <p style="margin:0;"><strong>🎫 Registration ID:</strong> ${registrationId}</p>
          </div>
          <div style="background:#f59e0b20;border:1px solid #f59e0b40;border-radius:12px;padding:16px;margin:24px 0;">
            <p style="margin:0;color:#f59e0b;font-size:14px;">⏰ <strong>Action required:</strong> You will receive a confirmation email 24 hours before the event. Confirm your attendance to receive your QR code entry pass. If you don't confirm, your spot will be released.</p>
          </div>
          <p style="color:#64748b;font-size:13px;text-align:center;margin-top:32px;">CampusBuzz – Powering Campus Events</p>
        </div>
      </div>` : `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#14b8a6,#0d9488);padding:40px;text-align:center;">
          <h1 style="margin:0;color:white;font-size:28px;">CampusBuzz</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Attendance confirmed! Here's your QR 🎉</p>
        </div>
        <div style="padding:40px;">
          <p style="font-size:18px;">Hi <strong>${name}</strong>,</p>
          <p>Your attendance for <strong style="color:#14b8a6;">${eventName}</strong> is confirmed!</p>
          <div style="background:#1e293b;border-radius:12px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 8px;"><strong>📅 Date:</strong> ${eventDate}</p>
            <p style="margin:0 0 8px;"><strong>📍 Venue:</strong> ${eventVenue}</p>
            <p style="margin:0;"><strong>🎫 Registration ID:</strong> ${registrationId}</p>
          </div>
          <p style="text-align:center;color:#94a3b8;">Show this QR code at the event entrance:</p>
          <div style="text-align:center;background:white;padding:16px;border-radius:12px;display:block;">
            <img src="${qrCodeDataUrl}" alt="QR Code" style="width:200px;height:200px;" />
          </div>
          <p style="color:#64748b;font-size:13px;text-align:center;margin-top:32px;">CampusBuzz – Powering Campus Events</p>
        </div>
      </div>`,
    });
  } catch (err) {
    console.error('[Email] sendRegistrationEmail failed:', err);
  }
}

export async function sendPaymentConfirmation({
  to,
  name,
  eventName,
  amount,
  provider,
  transactionId,
  qrCodeDataUrl,
  registrationId,
}: {
  to: string;
  name: string;
  eventName: string;
  amount: number;
  provider: string;
  transactionId: string;
  qrCodeDataUrl: string;
  registrationId: string;
}): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"CampusBuzz" <${process.env.EMAIL_USER}>`,
      to,
      subject: `💳 Payment Confirmed – ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #14b8a6, #0d9488); padding: 40px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px;">CampusBuzz</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Payment confirmed! 🎉</p>
          </div>
          <div style="padding: 40px;">
            <p style="font-size: 18px;">Hi <strong>${name}</strong>,</p>
            <p>Your payment for <strong style="color: #14b8a6;">${eventName}</strong> has been confirmed!</p>
            <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px;"><strong>💰 Amount Paid:</strong> NPR ${amount}</p>
              <p style="margin: 0 0 8px;"><strong>🏦 Provider:</strong> ${provider}</p>
              <p style="margin: 0 0 8px;"><strong>🔖 Transaction ID:</strong> ${transactionId}</p>
              <p style="margin: 0;"><strong>🎫 Registration ID:</strong> ${registrationId}</p>
            </div>
            <p style="text-align: center; color: #94a3b8;">Show this QR code at the event entrance:</p>
            <div style="text-align: center; background: white; display: inline-block; padding: 16px; border-radius: 12px; margin: 0 auto; display: block;">
              <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
            </div>
            <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 32px;">CampusBuzz – Powering Campus Events</p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Email] sendPaymentConfirmation failed:', err);
  }
}

export async function sendPromotionEmail({
  to,
  name,
  eventName,
  eventDate,
  eventVenue,
  qrCodeDataUrl,
  registrationId,
}: {
  to: string;
  name: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  qrCodeDataUrl: string;
  registrationId: string;
}): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"CampusBuzz" <${process.env.EMAIL_USER}>`,
      to,
      subject: `You're in! A spot opened up — ${eventName}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #14b8a6, #0d9488); padding: 40px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px;">CampusBuzz</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Great news! You're off the waitlist!</p>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 18px;">Hi <strong>${name}</strong>,</p>
          <p>A spot opened up and you've been promoted from the waitlist for <strong style="color: #14b8a6;">${eventName}</strong>.</p>
          <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px;"><strong>📅 Date:</strong> ${eventDate}</p>
            <p style="margin: 0 0 8px;"><strong>📍 Venue:</strong> ${eventVenue}</p>
            <p style="margin: 0;"><strong>🎫 Registration ID:</strong> ${registrationId}</p>
          </div>
          <p style="text-align: center; color: #94a3b8;">Show this QR code at the event entrance:</p>
          <div style="text-align: center; background: white; display: inline-block; padding: 16px; border-radius: 12px; margin: 0 auto; display: block;">
            <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
          </div>
          <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 32px;">CampusBuzz – Powering Campus Events</p>
        </div>
      </div>
    `,
    });
  } catch (err) {
    console.error('[Email] sendPromotionEmail failed:', err);
  }
}

export async function sendCancellationEmail({
  to,
  name,
  eventName,
  cancelReason,
}: {
  to: string;
  name: string;
  eventName: string;
  cancelReason: string;
}): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"CampusBuzz" <${process.env.EMAIL_USER}>`,
      to,
      subject: `❌ Event Cancelled – ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 40px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px;">CampusBuzz</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Event Cancelled</p>
          </div>
          <div style="padding: 40px;">
            <p style="font-size: 18px;">Hi <strong>${name}</strong>,</p>
            <p>We regret to inform you that <strong style="color: #14b8a6;">${eventName}</strong> has been cancelled.</p>
            <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px;"><strong>📋 Reason:</strong> ${cancelReason || 'No reason provided'}</p>
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">If you made a payment for this event, a refund will be processed. Please allow 5–7 business days for the amount to reflect in your account.</p>
            </div>
            <p>We apologise for any inconvenience caused. Keep an eye on CampusBuzz for upcoming events.</p>
            <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 32px;">CampusBuzz – Powering Campus Events</p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Email] sendCancellationEmail failed:', err);
  }
}

export async function sendRefundConfirmation({
  to,
  name,
  eventName,
  amount,
  provider,
}: {
  to: string;
  name: string;
  eventName: string;
  amount: number;
  provider: string;
}): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"CampusBuzz" <${process.env.EMAIL_USER}>`,
      to,
      subject: `💸 Refund Processed – ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #14b8a6, #0d9488); padding: 40px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px;">CampusBuzz</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Refund Processed 💸</p>
          </div>
          <div style="padding: 40px;">
            <p style="font-size: 18px;">Hi <strong>${name}</strong>,</p>
            <p>Your refund for <strong style="color: #14b8a6;">${eventName}</strong> has been processed.</p>
            <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px;"><strong>💰 Refunded Amount:</strong> NPR ${amount}</p>
              <p style="margin: 0 0 8px;"><strong>🏦 Provider:</strong> ${provider}</p>
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">Please allow 5–7 business days for the amount to reflect in your account.</p>
            </div>
            <p>We apologise for any inconvenience. We hope to see you at future events on CampusBuzz.</p>
            <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 32px;">CampusBuzz – Powering Campus Events</p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Email] sendRefundConfirmation failed:', err);
  }
}

// ── Attendance confirmation email (free events, 24h before) ──────────────────
export async function sendAttendanceConfirmation({
  to, name, eventName, eventDate, eventVenue, confirmUrl,
}: {
  to: string; name: string; eventName: string;
  eventDate: string; eventVenue: string; confirmUrl: string;
}): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"CampusBuzz" <${process.env.EMAIL_USER}>`,
      to,
      subject: `⚠️ Confirm your attendance — ${eventName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:40px;text-align:center;">
            <h1 style="margin:0;color:white;font-size:28px;">CampusBuzz</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Action required — confirm your spot</p>
          </div>
          <div style="padding:40px;">
            <p style="font-size:18px;">Hi <strong>${name}</strong>,</p>
            <p>Your event <strong style="color:#14b8a6;">${eventName}</strong> is <strong>tomorrow</strong>. Please confirm you're still attending.</p>
            <div style="background:#1e293b;border-radius:12px;padding:20px;margin:24px 0;">
              <p style="margin:0 0 8px;"><strong>📅 Date:</strong> ${eventDate}</p>
              <p style="margin:0;"><strong>📍 Venue:</strong> ${eventVenue}</p>
            </div>
            <p style="color:#f59e0b;font-size:14px;">⏰ If you don't confirm within 24 hours, your spot will be released to the next person on the waitlist.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${confirmUrl}" style="background:#14b8a6;color:#042f2e;padding:14px 32px;border-radius:12px;font-weight:700;text-decoration:none;font-size:16px;">
                ✅ Yes, I'm attending
              </a>
            </div>
            <p style="color:#64748b;font-size:13px;text-align:center;">CampusBuzz – Powering Campus Events</p>
          </div>
        </div>`,
    });
  } catch (err) {
    console.error('[Email] sendAttendanceConfirmation failed:', err);
  }
}

// ── Capacity increase notification (paid events) ─────────────────────────────
export async function sendCapacityIncreaseNotification({
  to, name, eventName, eventDate, eventVenue, eventUrl, eventId, feeAmount,
}: {
  to: string; name: string; eventName: string;
  eventDate: string; eventVenue: string; eventUrl: string;
  eventId: string; feeAmount: number;
}): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"CampusBuzz" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Spots Available — ${eventName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;
                    background:#0a1a18;color:#e2e8f0;padding:32px;border-radius:12px">
          <h2 style="color:#14b8a6;margin:0 0 8px">A spot opened up!</h2>
          <p style="color:#94a3b8;margin:0 0 24px">
            Hi ${name}, good news — a spot has become available for an event
            you expressed interest in.
          </p>
          <div style="background:#0f2420;border:1px solid #1e3a36;
                      border-radius:8px;padding:20px;margin-bottom:24px">
            <h3 style="color:#ffffff;margin:0 0 12px">${eventName}</h3>
            <p style="margin:4px 0;color:#94a3b8">📅 ${eventDate}</p>
            <p style="margin:4px 0;color:#94a3b8">📍 ${eventVenue}</p>
            <p style="margin:4px 0;color:#f59e0b;font-weight:500">
              💳 Rs. ${feeAmount}
            </p>
          </div>
          <p style="color:#94a3b8;margin-bottom:20px">
            Spots fill quickly. Register now before this one is taken.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/events/${eventId}"
             style="display:inline-block;background:#14b8a6;color:#ffffff;
                    padding:12px 24px;border-radius:8px;text-decoration:none;
                    font-weight:500">
            Register Now
          </a>
          <p style="color:#4a5568;font-size:12px;margin-top:24px">
            If you no longer want notifications for this event,
            you can remove your interest from the event page.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Email] sendCapacityIncreaseNotification failed:', err);
  }
}

// ── 24h event reminder email ──────────────────────────────────────────────────
export async function sendEventReminderEmail(params: {
  to: string;
  name: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  qrCodeDataUrl: string;
  registrationId: string;
  eventUrl: string;
}): Promise<void> {
  const { to, name, eventName, eventDate, eventVenue,
          qrCodeDataUrl, registrationId, eventUrl } = params;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? process.env.EMAIL_USER,
    to,
    subject: `Reminder — ${eventName} is tomorrow`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;
                  background:#0a1a18;color:#e2e8f0;padding:32px;border-radius:12px">
        <h2 style="color:#14b8a6;margin:0 0 8px">See you tomorrow!</h2>
        <p style="color:#94a3b8;margin:0 0 24px">
          Hi ${name}, this is a reminder for your upcoming event.
        </p>
        <div style="background:#0f2420;border:1px solid #1e3a36;
                    border-radius:8px;padding:20px;margin-bottom:24px">
          <h3 style="color:#ffffff;margin:0 0 12px">${eventName}</h3>
          <p style="margin:4px 0;color:#94a3b8">📅 ${eventDate}</p>
          <p style="margin:4px 0;color:#94a3b8">📍 ${eventVenue}</p>
          <p style="margin:4px 0;color:#94a3b8;font-size:12px">🎫 ${registrationId}</p>
        </div>
        <p style="color:#94a3b8;margin-bottom:16px">
          Show the QR code below at the entrance for check-in.
        </p>
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#ffffff;
                      padding:16px;border-radius:12px">
            <img src="${qrCodeDataUrl}" alt="QR Code"
                 style="width:180px;height:180px;display:block" />
          </div>
        </div>
        <a href="${eventUrl}"
           style="display:inline-block;background:#14b8a6;color:#ffffff;
                  padding:12px 24px;border-radius:8px;text-decoration:none;
                  font-weight:500;margin-bottom:24px">
          View Event Details
        </a>
        <p style="color:#4a5568;font-size:12px;margin-top:8px">
          If you can no longer attend, please cancel your registration so
          others on the waitlist can take your spot.
        </p>
      </div>
    `,
  });
}

// ── Capacity alert email to admin ─────────────────────────────────────────────
export async function sendCapacityAlertEmail(params: {
  adminEmail: string;
  eventName: string;
  eventDate: string;
  registeredCount: number;
  capacity: number;
  fillPercent: number;
  waitlistCount: number;
  eventAdminUrl: string;
}): Promise<void> {
  const { adminEmail, eventName, eventDate, registeredCount,
          capacity, fillPercent, waitlistCount, eventAdminUrl } = params;

  const isFull = fillPercent >= 100;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? process.env.EMAIL_USER,
    to: adminEmail,
    subject: isFull
      ? `Event Full — ${eventName}`
      : `${fillPercent}% Full — ${eventName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h2 style="color:${isFull ? '#ef4444' : '#f59e0b'};margin:0 0 16px">
          ${isFull ? '🎉 Event is Full!' : `⚡ ${fillPercent}% Capacity Reached`}
        </h2>
        <p style="margin:4px 0"><strong>${eventName}</strong></p>
        <p style="color:#6b7280;margin:4px 0">${eventDate}</p>
        <p style="margin:16px 0">
          Registered: <strong>${registeredCount} / ${capacity}</strong>
        </p>
        ${isFull && waitlistCount > 0
          ? `<p>Waitlist: <strong>${waitlistCount} students waiting</strong></p>`
          : ''}
        <p style="color:#6b7280;margin-bottom:24px">
          ${isFull
            ? 'Consider increasing capacity if the venue allows.'
            : 'Your event is filling up. Consider expanding capacity if needed.'}
        </p>
        <a href="${eventAdminUrl}"
           style="background:#14b8a6;color:#fff;padding:10px 20px;
                  border-radius:8px;text-decoration:none;font-weight:500">
          View Event
        </a>
      </div>
    `,
  });
}
