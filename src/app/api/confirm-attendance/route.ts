import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import Registration from '@/models/Registration';
import User from '@/models/User';
import Event from '@/models/Event';
import QRCode from 'qrcode';
import { sendRegistrationEmail } from '@/lib/email';
import { promoteTopWaitlistUser } from '@/lib/algorithms/waitlistManager';
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

  // Check token expiry
  if (registration.confirmTokenExpiry && new Date() > registration.confirmTokenExpiry) {
    // Token expired — free the spot atomically
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {
      await Registration.deleteOne({ _id: registration._id }, { session: dbSession });
      await Event.findByIdAndUpdate(
        registration.eventId,
        { $inc: { registeredCount: -1 } },
        { session: dbSession }
      );
      await dbSession.commitTransaction();
    } catch (txErr) {
      await dbSession.abortTransaction();
      console.error('[confirm-attendance] Expiry cleanup failed:', txErr);
    } finally {
      dbSession.endSession();
    }

    // Promote waitlist after freeing spot
    void promoteTopWaitlistUser(registration.eventId.toString()).catch(err =>
      console.error('[Waitlist] Promotion after token expiry failed:', err)
    );

    void import('@/lib/ml/reliabilityScoring').then(({ updateStudentReliability }) => {
      updateStudentReliability(registration.userId.toString())
        .catch(err => console.error('[Reliability] Post-expiry update failed:', err));
    }).catch(() => {});

    return NextResponse.redirect(
      new URL('/my-events?confirm=expired', process.env.NEXTAUTH_URL ?? 'http://localhost:3000')
    );
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
