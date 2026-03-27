import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';
import Event from '@/models/Event';
import User from '@/models/User';
import QRCode from 'qrcode';
import { sendRegistrationEmail } from '@/lib/email';
import { format } from 'date-fns';

function generateRegistrationId() {
  return 'CP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    await dbConnect();
    const { eventId } = await req.json();

    const event = await Event.findById(eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (event.registeredCount >= event.capacity) {
      return NextResponse.json({ error: 'Event is full' }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    const existing = await Registration.findOne({ userId, eventId });
    if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 409 });

    const registrationId = generateRegistrationId();
    const qrData = JSON.stringify({ registrationId, eventId, userId });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });

    const registration = await Registration.create({
      userId,
      eventId,
      registrationId,
      qrCode: qrCodeDataUrl,
    });

    await Event.findByIdAndUpdate(eventId, { $inc: { registeredCount: 1 } });

    // Send email
    const user = await User.findById(userId);
    if (user) {
      try {
        await sendRegistrationEmail({
          to: user.email,
          name: user.name,
          eventName: event.title,
          eventDate: format(new Date(event.date), 'PPP p'),
          eventVenue: event.venue,
          qrCodeDataUrl,
          registrationId,
        });
      } catch (emailErr) {
        console.error('Email failed:', emailErr);
      }
    }

    return NextResponse.json({ registration, qrCode: qrCodeDataUrl }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const userId = (session.user as { id: string }).id;
    const registrations = await Registration.find({ userId }).populate('eventId').lean();
    return NextResponse.json(registrations);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
