import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';
import Event from '@/models/Event';
import { rateLimit } from '@/lib/rateLimit';
import { extractFeatures } from '@/lib/ml/checkinFeatures';
import { getModel, isModelReady, recordCheckin } from '@/lib/ml/modelManager';

const WARN_THRESHOLD  = 0.6;
const BLOCK_THRESHOLD = 0.8;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const { allowed } = rateLimit(`checkin:${ip}`, 30, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { registrationId } = await req.json();

    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId required' }, { status: 400 });
    }

    const registration = await Registration.findOne({ registrationId })
      .populate('userId', 'name email')
      .populate('eventId', 'title date venue category');

    if (!registration) {
      return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 });
    }

    if (registration.checkedIn) {
      return NextResponse.json({
        error: 'Already checked in',
        checkedInAt: registration.checkedInAt,
      }, { status: 400 });
    }

    const checkinTime = new Date();
    const event = registration.eventId as any;

    let anomalyScore: number | null = null;
    let flagged = false;
    let blocked = false;

    if (isModelReady()) {
      try {
        const ifoModel = await getModel();
        const features = await extractFeatures({
          userId: registration.userId.toString(),
          eventId: registration.eventId.toString(),
          eventCategory: event.category,
          eventDate: event.date,
          registrationCreatedAt: registration.createdAt,
          checkinTime,
        });

        anomalyScore = Math.round(ifoModel!.anomalyScore(features) * 1000) / 1000;
        flagged  = anomalyScore >= WARN_THRESHOLD;
        blocked  = anomalyScore >= BLOCK_THRESHOLD;
      } catch (err) {
        console.error('[IsolationForest] Scoring failed:', err);
      }
    }

    await Registration.findByIdAndUpdate(registration._id, {
      checkedIn: !blocked,
      checkedInAt: blocked ? undefined : checkinTime,
      anomalyScore,
      flagged,
    });

    if (!blocked) recordCheckin();

    if (blocked) {
      return NextResponse.json({
        success: false,
        blocked: true,
        anomalyScore,
        message: 'Verification issue detected. Please see the event organiser.',
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      warning: flagged,
      anomalyScore,
      registration: {
        attendeeName: registration.userId?.name || 'Student',
        attendeeEmail: registration.userId?.email || '',
        eventTitle: event.title || 'Event',
        registrationId: registration.registrationId,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
