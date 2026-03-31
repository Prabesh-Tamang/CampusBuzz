import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';
import { rateLimit } from '@/lib/rateLimit';
import { extractFeatures } from '@/lib/ml/checkinFeatures';
import { getModel, isModelReady, recordCheckin } from '@/lib/ml/modelManager';
import { ANOMALY_WARN_THRESHOLD, ANOMALY_BLOCK_THRESHOLD } from '@/lib/constants';

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

    // First, fetch the registration (with populated fields) to compute anomaly score
    // and to check if it exists at all
    const existing = await Registration.findOne({ registrationId })
      .populate('userId', 'name email')
      .populate('eventId', 'title date venue category');

    if (!existing) {
      return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 });
    }

    // If already checked in, return early before attempting atomic update
    if (existing.checkedIn) {
      return NextResponse.json({
        error: 'Already checked in',
        checkedInAt: existing.checkedInAt,
      }, { status: 400 });
    }

    const checkinTime = new Date();
    const event = existing.eventId as any;

    let anomalyScore: number | null = null;
    let flagged = false;
    let blocked = false;

    if (isModelReady()) {
      try {
        const ifoModel = await getModel();
        const features = await extractFeatures({
          userId: existing.userId.toString(),
          eventId: existing.eventId.toString(),
          eventCategory: event.category,
          eventDate: event.date,
          registrationCreatedAt: existing.createdAt,
          checkinTime,
        });

        anomalyScore = Math.round(ifoModel!.anomalyScore(features) * 1000) / 1000;
        flagged  = anomalyScore >= ANOMALY_WARN_THRESHOLD;
        blocked  = anomalyScore >= ANOMALY_BLOCK_THRESHOLD;
      } catch (err) {
        console.error('[IsolationForest] Scoring failed:', err);
      }
    }

    // Atomic update: only succeeds if checkedIn is still false (prevents race condition)
    const updated = await Registration.findOneAndUpdate(
      { registrationId, checkedIn: false },
      {
        $set: {
          checkedIn: !blocked,
          checkedInAt: blocked ? undefined : checkinTime,
          anomalyScore,
          flagged,
        },
      },
      { new: true }
    );

    // If findOneAndUpdate returned null, another request already checked in this registration
    if (!updated) {
      const alreadyCheckedIn = await Registration.findOne({ registrationId }).lean();
      return NextResponse.json({
        error: 'Already checked in',
        checkedInAt: alreadyCheckedIn?.checkedInAt,
      }, { status: 400 });
    }

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
        attendeeName: existing.userId?.name || 'Student',
        attendeeEmail: existing.userId?.email || '',
        eventTitle: event.title || 'Event',
        registrationId: existing.registrationId,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
