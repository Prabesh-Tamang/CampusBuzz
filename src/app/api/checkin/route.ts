import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 401 });
    }

    await dbConnect();
    const { registrationId } = await req.json();

    const registration = await Registration.findOne({ registrationId }).populate('userId').populate('eventId');
    if (!registration) return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 });
    if (registration.checkedIn) {
      return NextResponse.json({ error: 'Already checked in', registration }, { status: 400 });
    }

    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    await registration.save();

    return NextResponse.json({ success: true, registration });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
