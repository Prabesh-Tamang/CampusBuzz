import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import Registration from '@/models/Registration';
import Event from '@/models/Event';
import User from '@/models/User';
import QRCode from 'qrcode';
import { sendRegistrationEmail } from '@/lib/email';
import { format } from 'date-fns';
import crypto from 'crypto';

function generateRegistrationId(): string {
  const unique = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `CP-${unique}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    await dbConnect();
    const { eventId } = await req.json();

    const event = await Event.findById(eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    if (event.feeType === 'paid') return NextResponse.json({ error: 'Paid event — use payment flow' }, { status: 400 });

    if (event.date < new Date()) {
      return NextResponse.json({ error: 'This event has already ended' }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    const existing = await Registration.findOne({ userId, eventId });
    if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 409 });

    const user = await User.findById(userId);
    const registrationId = generateRegistrationId();
    const qrData = JSON.stringify({ registrationId, eventId, userId });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      const eventWithSession = await Event.findById(eventId).session(mongoSession);
      if (!eventWithSession || eventWithSession.registeredCount >= eventWithSession.capacity) {
        await mongoSession.abortTransaction();
        return NextResponse.json({ error: 'Event is full' }, { status: 400 });
      }

      const registration = await Registration.create([{
        userId,
        eventId,
        registrationId,
        qrCode: qrCodeDataUrl,
        checkedIn: false,
      }], { session: mongoSession });

      await Event.findByIdAndUpdate(
        eventId,
        { $inc: { registeredCount: 1 } },
        { session: mongoSession }
      );

      await mongoSession.commitTransaction();

      void sendRegistrationEmail({
        to: user ? user.email : '',
        name: user ? user.name : '',
        eventName: event.title,
        eventDate: format(event.date, 'PPP'),
        eventVenue: event.venue,
        qrCodeDataUrl,
        registrationId,
      }).catch((err: unknown) => {
        console.error('[Email] Failed to send registration confirmation:', err);
      });

      return NextResponse.json({ registration: registration[0], qrCode: qrCodeDataUrl }, { status: 201 });
    } catch (err) {
      await mongoSession.abortTransaction();
      throw err;
    } finally {
      mongoSession.endSession();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    await dbConnect();
    const { eventId } = await req.json();
    const userId = (session.user as { id: string }).id;

    const registration = await Registration.findOne({ userId, eventId });
    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      await Registration.deleteOne({ userId, eventId }, { session: mongoSession });
      await Event.findByIdAndUpdate(eventId, { $inc: { registeredCount: -1 } }, { session: mongoSession });
      await mongoSession.commitTransaction();
    } catch (err) {
      await mongoSession.abortTransaction();
      throw err;
    } finally {
      mongoSession.endSession();
    }

    return NextResponse.json({ success: true }, { status: 200 });
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
