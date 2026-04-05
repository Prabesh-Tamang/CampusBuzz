import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';
import Event from '@/models/Event';
import { ANOMALY_BLOCK_THRESHOLD } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const registrationId = searchParams.get('registrationId');
    if (!registrationId) return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 });

    await dbConnect();
    const userId = (session.user as { id: string }).id;

    // Check both registrationId and userId ensuring users can only see their own
    const registration = await Registration.findOne({ registrationId, userId }).populate('eventId').lean() as any;
    
    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const event = registration.eventId as any;
    let status = 'PENDING';
    const now = new Date();

    if (registration.checkedIn) {
      status = registration.flagged && !registration.adminOverride ? 'FLAGGED' : 'CHECKED_IN';
    } else {
      if (registration.anomalyScore !== undefined && registration.anomalyScore !== null && registration.anomalyScore >= ANOMALY_BLOCK_THRESHOLD && !registration.adminOverride) {
        status = 'BLOCKED';
      } else if (new Date(event.endDate) < now) {
        status = 'QR_EXPIRED';
      }
    }

    return NextResponse.json({
      status,
      checkedInAt: registration.checkedInAt,
      eventTitle: event.title,
      qrCode: registration.qrCode || null
    }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
