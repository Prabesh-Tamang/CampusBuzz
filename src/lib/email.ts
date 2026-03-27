import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
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
  const mailOptions = {
    from: `"CollegePulse" <${process.env.EMAIL_USER}>`,
    to,
    subject: `✅ Registration Confirmed – ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #14b8a6, #0d9488); padding: 40px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px;">CollegePulse</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">You're registered! 🎉</p>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 18px;">Hi <strong>${name}</strong>,</p>
          <p>Your registration for <strong style="color: #14b8a6;">${eventName}</strong> is confirmed!</p>
          <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px;"><strong>📅 Date:</strong> ${eventDate}</p>
            <p style="margin: 0 0 8px;"><strong>📍 Venue:</strong> ${eventVenue}</p>
            <p style="margin: 0;"><strong>🎫 Registration ID:</strong> ${registrationId}</p>
          </div>
          <p style="text-align: center; color: #94a3b8;">Show this QR code at the event entrance:</p>
          <div style="text-align: center; background: white; display: inline-block; padding: 16px; border-radius: 12px; margin: 0 auto; display: block;">
            <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
          </div>
          <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 32px;">CollegePulse – Powering Campus Events</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
