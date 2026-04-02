import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Waitlist from '@/models/Waitlist';
import Event from '@/models/Event';

// GET /api/waitlist/my — returns all waitlist entries for the current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ entries: [] });

  await dbConnect();
  const userId = session.user.id;

  const entries = await Waitlist.find({ userId })
    .populate('eventId', 'title date venue capacity registeredCount feeType feeAmount')
    .sort({ createdAt: -1 })
    .lean();

  // Compute position for each entry
  const enriched = await Promise.all(entries.map(async (entry) => {
    const position = await Waitlist.countDocuments({
      eventId: entry.eventId,
      priorityScore: { $lt: entry.priorityScore },
    }) + 1;

    const queueLength = await Waitlist.countDocuments({ eventId: entry.eventId });

    return {
      ...entry,
      eventId: (entry.eventId as any)?._id?.toString() || entry.eventId.toString(),
      event: entry.eventId,
      position,
      queueLength,
    };
  }));

  return NextResponse.json({ entries: enriched });
}
