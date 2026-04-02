import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';
import User from '@/models/User';
import Event from '@/models/Event';
import QRCode from 'qrcode';
import { sendRegistrationEmail } from '@/lib/email';
import { format } from 'date-fns';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET /api/confirm-attendance?token=XXX
// Student clicks this link from their confirmation email
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/my-events?confirm=invalid', APP_URL));
  }

  await dbConnect();

  const registration = await Registration.findOne({ confirmToken: token });
  if (!registration) {
    return NextResponse.redirect(new URL('/my-events?confirm=invalid', APP_URL));
  }

  if (registration.confirmed) {
    // Already confirmed — just redirect
    return NextResponse.redirect(new URL('/my-events?confirm=already', APP_URL));
  }

  // Generate QR code now that attendance is confirmed
  const qrData = JSON.stringify({
    registrationId: registration.registrationId,
    eventId: registration.eventId.toString(),
    userId: registration.userId.toString(),
  });
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'H',
  });

  // Save QR, mark confirmed, clear token
  registration.qrCode = qrCodeDataUrl;
  registration.confirmed = true;
  registration.confirmToken = undefined;
  await registration.save();

  // Send QR via email
  try {
    const [user, event] = await Promise.all([
      User.findById(registration.userId).select('email name').lean() as any,
      Event.findById(registration.eventId).select('title date venue').lean() as any,
    ]);

    if (user && event) {
      await sendRegistrationEmail({
        to: user.email,
        name: user.name,
        eventName: event.title,
        eventDate: format(new Date(event.date), 'PPP'),
        eventVenue: event.venue,
        qrCodeDataUrl,
        registrationId: registration.registrationId,
      });
    }
  } catch (err) {
    console.error('[Confirm] Email send failed:', err);
  }

  return NextResponse.redirect(new URL('/my-events?confirm=success', APP_URL));
}
