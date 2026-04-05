import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';
import { rateLimit } from '@/lib/rateLimit';
import { extractFeatures } from '@/lib/ml/checkinFeatures';
import { getModel, isModelReady, recordCheckin } from '@/lib/ml/modelManager';
import { ANOMALY_WARN_THRESHOLD, ANOMALY_BLOCK_THRESHOLD } from '@/lib/constants';

/**
 * Rule-based heuristic anomaly score used when the ML model hasn't
 * collected enough training data (< 20 check-ins).
 * Returns a 0-1 score where higher = more suspicious.
 */
function heuristicAnomalyScore(params: {
  hourOfDay: number;
  minutesRelativeToStart: number; // negative = scanning BEFORE event starts
  daysSinceReg: number;
}): number {
  let score = 0;

  // Scanning well before the event starts is highly suspicious
  if (params.minutesRelativeToStart < -60) score += 0.5;
  else if (params.minutesRelativeToStart < 0) score += 0.25;

  // Scanning at unusual hours (e.g. 1am-6am)
  if (params.hourOfDay >= 1 && params.hourOfDay < 6) score += 0.3;

  // Registered less than 5 minutes ago and scanning right away
  if (params.daysSinceReg < 0.003) score += 0.25; // < ~5 minutes

  return Math.min(score, 1.0);
}

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

    // Fetch registration with full event details (including endDate)
    const existing = await Registration.findOne({ registrationId })
      .populate('userId', 'name email')
      .populate('eventId', 'title date endDate venue category');

    if (!existing) {
      return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 });
    }

    // ─── FIX: Block check-in for events that have already ended ──────────────
    const event = existing.eventId as any;
    const now = new Date();
    if (event?.endDate && new Date(event.endDate) < now) {
      return NextResponse.json({
        success: false,
        message: `This event ended on ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Check-in is no longer allowed.`,
        eventEnded: true,
        registration: {
          attendeeName: (existing.userId as any)?.name || 'Student',
          attendeeEmail: (existing.userId as any)?.email || '',
          eventTitle: event.title || 'Event',
          registrationId: existing.registrationId,
        },
      }, { status: 400 });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // If already checked in, return early
    if (existing.checkedIn) {
      return NextResponse.json({
        error: 'Already checked in',
        checkedInAt: existing.checkedInAt,
      }, { status: 400 });
    }

    const checkinTime = new Date();

    let anomalyScore: number | null = null;
    let flagged = false;
    let blocked = false;

    if (isModelReady()) {
      // ── ML path: Isolation Forest ──────────────────────────────────────────
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
    } else {
      // ── Fallback path: rule-based heuristics ──────────────────────────────
      try {
        const daysSinceReg = (checkinTime.getTime() - existing.createdAt.getTime()) / 86_400_000;
        const minutesRelativeToStart = (checkinTime.getTime() - new Date(event.date).getTime()) / 60_000;
        const rawScore = heuristicAnomalyScore({
          hourOfDay: checkinTime.getHours(),
          minutesRelativeToStart,
          daysSinceReg,
        });
        if (rawScore > 0) {
          anomalyScore = Math.round(rawScore * 1000) / 1000;
          flagged  = anomalyScore >= ANOMALY_WARN_THRESHOLD;
          blocked  = anomalyScore >= ANOMALY_BLOCK_THRESHOLD;
        }
      } catch (err) {
        console.error('[Heuristic] Scoring failed:', err);
      }
    }

    // Atomic update: only succeeds if checkedIn is still false
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

    if (!updated) {
      const alreadyCheckedIn = await Registration.findOne({ registrationId }).lean();
      return NextResponse.json({
        error: 'Already checked in',
        checkedInAt: (alreadyCheckedIn as any)?.checkedInAt,
      }, { status: 400 });
    }

    if (!blocked) recordCheckin();

    if (blocked) {
      return NextResponse.json({
        success: false,
        blocked: true,
        anomalyScore,
        message: 'Verification issue detected. Please see the event organiser.',
        registration: {
          attendeeName: (existing.userId as any)?.name || 'Student',
          attendeeEmail: (existing.userId as any)?.email || '',
          eventTitle: event.title || 'Event',
          registrationId: existing.registrationId,
        },
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      warning: flagged,
      anomalyScore,
      registration: {
        attendeeName: (existing.userId as any)?.name || 'Student',
        attendeeEmail: (existing.userId as any)?.email || '',
        eventTitle: event.title || 'Event',
        registrationId: existing.registrationId,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

