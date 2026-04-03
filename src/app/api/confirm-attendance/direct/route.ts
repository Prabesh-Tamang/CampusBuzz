import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';
import User from '@/models/User';
import Event from '@/models/Event';
import QRCode from 'qrcode';
import { sendRegistrationEmail } from '@/lib/email';
import { format } from 'date-fns';

// POST /api/confirm-attendance/direct
// Student confirms attendance directly from the dashboard (no email token needed)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  await dbConnect();
  const { registrationId } = await req.json();
  const userId = session.user.id;

  // Find the registration — must belong to this user
  const registration = await Registration.findOne({ registrationId, userId });
  if (!registration) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  if (registration.confirmed) {
    return NextResponse.json({ error: 'Already confirmed', qrCode: registration.qrCode }, { status: 200 });
  }

  // Generate QR code
  const qrData = JSON.stringify({
    registrationId: registration.registrationId,
    eventId: registration.eventId.toString(),
    userId: registration.userId.toString(),
  });
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    width: 300, margin: 2, errorCorrectionLevel: 'H',
  });

  // Mark confirmed, set QR, clear token
  registration.qrCode = qrCodeDataUrl;
  registration.confirmed = true;
  registration.confirmToken = undefined;
  await registration.save();

  // Send QR via email (fire-and-forget)
  try {
    const [user, event] = await Promise.all([
      User.findById(userId).select('email name').lean() as any,
      Event.findById(registration.eventId).select('title date venue').lean() as any,
    ]);
    if (user && event) {
      sendRegistrationEmail({
        to: user.email,
        name: user.name,
        eventName: event.title,
        eventDate: format(new Date(event.date), 'PPP'),
        eventVenue: event.venue,
        qrCodeDataUrl,
        registrationId: registration.registrationId,
      }).catch(err => console.error('[Confirm direct] Email failed:', err));
    }
  } catch (err) {
    console.error('[Confirm direct] Email error:', err);
  }

  return NextResponse.json({ success: true, qrCode: qrCodeDataUrl });
}
