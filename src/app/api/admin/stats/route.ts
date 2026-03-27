import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Event from '@/models/Event';
import Registration from '@/models/Registration';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 401 });
    }

    await dbConnect();

    const [totalEvents, totalUsers, totalRegistrations, checkedInCount, recentEvents] =
      await Promise.all([
        Event.countDocuments(),
        User.countDocuments({ role: 'student' }),
        Registration.countDocuments(),
        Registration.countDocuments({ checkedIn: true }),
        Event.find().sort({ createdAt: -1 }).limit(5).lean(),
      ]);

    return NextResponse.json({
      totalEvents,
      totalUsers,
      totalRegistrations,
      checkedInCount,
      recentEvents,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
