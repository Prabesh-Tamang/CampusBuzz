import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Registration from '@/models/Registration';
import Event from '@/models/Event';
import User from '@/models/User';
import { sendAttendanceConfirmation } from '@/lib/email';
import { CONFIRMATION_CONFIG, TIER_CONFIG } from '@/lib/constants';
import crypto from 'crypto';

function computeConfirmExpiry(
  tier: string,
  eventDate: Date
): Date {
  const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG]
    ?? TIER_CONFIG.new;

  const windowMs = tierConfig.confirmationWindowHours * 60 * 60 * 1000;
  const rawExpiry = new Date(Date.now() + windowMs);

  const latestAllowed = new Date(
    eventDate.getTime() - CONFIRMATION_CONFIG.minHoursBeforeEvent * 60 * 60 * 1000
  );

  if (rawExpiry > latestAllowed) {
    const minExpiry = new Date(Date.now() + 30 * 60 * 1000);
    return latestAllowed > minExpiry ? latestAllowed : minExpiry;
  }

  return rawExpiry;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    const event = await Event.findById(eventId)
      .select('title date isActive isCancelled')
      .lean() as any;

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const now = new Date();
    const eventDate = new Date(event.date);
    const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

    const pending = await Registration.countDocuments({
      eventId,
      confirmed: false,
      confirmationEmailSent: false,
    });

    const alreadySent = await Registration.countDocuments({
      eventId,
      confirmed: false,
      confirmationEmailSent: true,
    });

    return NextResponse.json({
      eventTitle: event.title,
      eventDate: event.date,
      daysUntilEvent: Math.round(daysUntilEvent),
      pendingCount: pending,
      alreadySentCount: alreadySent,
      tooFarAway: daysUntilEvent > CONFIRMATION_CONFIG.manualTriggerMaxDays,
    });
  } catch (err) {
    console.error('[GET /api/admin/run-confirmations]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { eventId, force, _autoTriggered } = body;

    if (!_autoTriggered) {
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const now = new Date();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // Collect events to process
    let eventsToProcess: any[] = [];
    if (eventId) {
      const event = await Event.findById(eventId).lean() as any;
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      eventsToProcess = [event];
    } else {
      // No eventId — process all upcoming events that need confirmations
      eventsToProcess = await Event.find({
        isActive: true,
        isCancelled: { $ne: true },
        date: { $gte: now },
      }).select('title date venue isActive isCancelled').lean() as any[];
    }

    let totalSent = 0;
    let totalFailed = 0;
    let processedCount = 0;

    for (const event of eventsToProcess) {
      const eventDate = new Date(event.date);
      const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

      if (daysUntilEvent > CONFIRMATION_CONFIG.manualTriggerMaxDays && !force) continue;
      if (eventDate < now) continue;

      const registrations = await Registration.find({
        eventId: event._id,
        confirmed: false,
        confirmationEmailSent: false,
      }).lean() as any[];

      if (registrations.length === 0) continue;

      let eventSent = 0;
      let eventFailed = 0;

      for (const reg of registrations) {
        try {
          const user = await User.findById(reg.userId)
            .select('email name engagementTier')
            .lean() as any;

          if (!user) continue;

          const tier = user.engagementTier ?? 'new';
          const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.new;
          const token = reg.confirmToken ?? crypto.randomBytes(32).toString('hex');
          const expiry = computeConfirmExpiry(tier, eventDate);
          const confirmUrl = `${appUrl}/api/confirm-attendance?token=${token}`;

          await Registration.findByIdAndUpdate(reg._id, {
            confirmToken: token,
            confirmTokenExpiry: expiry,
            confirmationEmailSent: true,
          });

          await sendAttendanceConfirmation({
            to: user.email,
            name: user.name,
            eventName: event.title,
            eventDate: eventDate.toLocaleDateString('en-NP', { dateStyle: 'full' }),
            eventVenue: event.venue,
            confirmUrl,
            confirmWindowHours: tierConfig.confirmationWindowHours,
          });

          eventSent++;
        } catch (emailErr) {
          console.error('[Confirmations] Email failed for reg', reg._id, emailErr);
          eventFailed++;
        }
      }

      totalSent += eventSent;
      totalFailed += eventFailed;
      processedCount++;
    }

    return NextResponse.json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      eventsProcessed: processedCount,
      message: `${totalSent} confirmation emails sent across ${processedCount} event(s)${totalFailed > 0 ? `, ${totalFailed} failed` : ''}`,
    });
  } catch (err) {
    console.error('[POST /api/admin/run-confirmations]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
