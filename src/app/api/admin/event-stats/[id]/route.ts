import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Waitlist from '@/models/Waitlist';
import EventInterest from '@/models/EventInterest';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const [waitlistCount, notifyCount] = await Promise.all([
    Waitlist.countDocuments({ eventId: params.id }),
    EventInterest.countDocuments({ eventId: params.id }),
  ]);

  return NextResponse.json({ waitlistCount, notifyCount });
}
