import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Event from '@/models/Event';
import Registration from '@/models/Registration';
import User from '@/models/User';
import { promoteTopWaitlistUser } from '@/lib/algorithms/waitlistManager';
import { sendAttendanceConfirmation } from '@/lib/email';
import crypto from 'crypto';
import { format } from 'date-fns';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * POST /api/admin/run-confirmations
 *
 * Body (optional): { force: true } — sends confirmation to ALL unconfirmed
 * registrations for upcoming free events regardless of time window.
 *
 * Normal mode (no force):
 *   Job 1 — events in 23-25h → send confirmation emails
 *   Job 2 — events in 0-2h   → cancel unconfirmed, promote waitlist
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const now = new Date();

  let force = false;
  try {
    const body = await req.json();
    force = !!body?.force;
  } catch { /* body is optional */ }

  let confirmEmailsSent = 0;
  let cancelledCount = 0;
  let promotedCount = 0;

  if (force) {
    // ── FORCE MODE: send confirmation to all unconfirmed registrations
    // for any upcoming free event that hasn't started yet
    const upcomingFreeEvents = await Event.find({
      feeType: 'free',
      isActive: true,
      isCancelled: { $ne: true },
      date: { $gt: now },
    }).lean() as any[];

    for (const event of upcomingFreeEvents) {
      const regs = await Registration.find({
        eventId: event._id,
        confirmed: false,
        confirmToken: { $exists: false },
      }).lean() as any[];

      for (const reg of regs) {
        const user = await User.findById(reg.userId).select('email name').lean() as any;
        if (!user?.email) continue;

        const token = crypto.randomBytes(32).toString('hex');
        await Registration.findByIdAndUpdate(reg._id, { confirmToken: token });

        const confirmUrl = `${APP_URL}/api/confirm-attendance?token=${token}`;
        await sendAttendanceConfirmation({
          to: user.email,
          name: user.name,
          eventName: event.title,
          eventDate: format(new Date(event.date), 'PPP p'),
          eventVenue: event.venue,
          confirmUrl,
        });
        confirmEmailsSent++;
      }
    }
  } else {
    // ── NORMAL MODE ──────────────────────────────────────────────────────────

    // Job 1: Send confirmation emails (events in 23-25 hours)
    const confirmWindowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const confirmWindowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const eventsNeedingConfirmation = await Event.find({
      feeType: 'free',
      isActive: true,
      isCancelled: { $ne: true },
      date: { $gte: confirmWindowStart, $lte: confirmWindowEnd },
    }).lean() as any[];

    for (const event of eventsNeedingConfirmation) {
      const regs = await Registration.find({
        eventId: event._id,
        confirmed: false,
        confirmToken: { $exists: false },
      }).lean() as any[];

      for (const reg of regs) {
        const user = await User.findById(reg.userId).select('email name').lean() as any;
        if (!user?.email) continue;

        const token = crypto.randomBytes(32).toString('hex');
        await Registration.findByIdAndUpdate(reg._id, { confirmToken: token });

        const confirmUrl = `${APP_URL}/api/confirm-attendance?token=${token}`;
        await sendAttendanceConfirmation({
          to: user.email,
          name: user.name,
          eventName: event.title,
          eventDate: format(new Date(event.date), 'PPP p'),
          eventVenue: event.venue,
          confirmUrl,
        });
        confirmEmailsSent++;
      }
    }

    // Job 2: Auto-cancel unconfirmed (events in 0-2 hours)
    const cancelWindowStart = new Date(now.getTime());
    const cancelWindowEnd   = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const eventsStartingSoon = await Event.find({
      feeType: 'free',
      isActive: true,
      isCancelled: { $ne: true },
      date: { $gte: cancelWindowStart, $lte: cancelWindowEnd },
    }).lean() as any[];

    for (const event of eventsStartingSoon) {
      const unconfirmed = await Registration.find({
        eventId: event._id,
        confirmed: false,
        confirmToken: { $exists: true },
      }).lean() as any[];

      for (const reg of unconfirmed) {
        await Registration.deleteOne({ _id: reg._id });
        await Event.findByIdAndUpdate(event._id, { $inc: { registeredCount: -1 } });
        cancelledCount++;

        try {
          await promoteTopWaitlistUser(event._id.toString());
          promotedCount++;
        } catch { /* no waitlist */ }
      }
    }
  }

  return NextResponse.json({
    success: true,
    mode: force ? 'force' : 'normal',
    confirmEmailsSent,
    cancelledCount,
    promotedCount,
    message: confirmEmailsSent === 0 && !force
      ? 'No events in the 23-25h window. Use "Force Send" to send to all upcoming events.'
      : undefined,
  });
}
