import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Registration from '@/models/Registration';
import Waitlist from '@/models/Waitlist';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalRegistrations,
      uniqueUsersArr,
      waitlistTotal,
      waitlistEventsArr,
      flaggedToday,
      blockedToday,
      totalCheckins,
    ] = await Promise.all([
      Registration.countDocuments({}),
      Registration.distinct('userId'),
      Waitlist.countDocuments({}),
      Waitlist.distinct('eventId'),
      Registration.countDocuments({ flagged: true, checkedInAt: { $gte: todayStart } }),
      Registration.countDocuments({
        flagged: true,
        checkedIn: false,
        anomalyScore: { $gte: 0.8 },
        updatedAt: { $gte: todayStart },
      }),
      Registration.countDocuments({ checkedIn: true }),
    ]);

    // Get cache stats
    const { recommendationCache } = await import('@/lib/recommendations/recommendationCache');
    const cacheStats = recommendationCache.stats();

    // Get ML model stats
    const { getModelStats } = await import('@/lib/ml/modelManager');
    const mlStats = getModelStats();

    return NextResponse.json({
      collaborativeFiltering: {
        usersInMatrix: uniqueUsersArr.length,
        totalRegistrations,
        cacheSize: cacheStats.size,
        status: uniqueUsersArr.length >= 2 ? 'active' : 'warming_up',
      },
      waitlist: {
        studentsWaiting: waitlistTotal,
        eventsWithWaitlist: waitlistEventsArr.length,
        status: 'active',
      },
      isolationForest: {
        trainedOnSamples: mlStats.trainingCount ?? 0,
        flaggedToday,
        blockedToday,
        totalCheckins,
        status: mlStats.trained ? 'active' : 'warming_up',
        minSamplesNeeded: 20,
      },
    });
  } catch (err) {
    console.error('[GET /api/admin/algorithm-stats]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
