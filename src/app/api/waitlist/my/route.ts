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

  const rawEntries: any = await Waitlist.find({ userId })
    .populate('eventId', 'title date venue capacity registeredCount feeType feeAmount')
    .sort({ priorityScore: 1 }) // lowest score = highest priority first
    .lean();

  // Deduplicate by eventId — keep only the entry with the lowest priorityScore per event
  const seen = new Set<string>();
  const uniqueEntries = rawEntries.filter((entry: any) => {
    const eid = (entry.eventId as any)?._id?.toString() || entry.eventId.toString();
    if (seen.has(eid)) return false;
    seen.add(eid);
    return true;
  });

  // Compute position for each entry
  const enriched = await Promise.all(uniqueEntries.map(async (entry: any) => {
    const eid = (entry.eventId as any)?._id?.toString() || entry.eventId.toString();

    const position = await Waitlist.countDocuments({
      eventId: entry.eventId,
      priorityScore: { $lt: entry.priorityScore },
    }) + 1;

    const queueLength = await Waitlist.countDocuments({ eventId: entry.eventId });

    return {
      ...entry,
      eventId: eid,
      event: entry.eventId,
      position,
      queueLength,
    };
  }));

  return NextResponse.json({ entries: enriched });
}
