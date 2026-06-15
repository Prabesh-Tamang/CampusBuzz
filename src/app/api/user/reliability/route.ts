import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import {
  computeMetrics, getTierBenefits, isReliabilityModelReady,
  updateStudentReliability,
} from '@/lib/ml/reliabilityScoring';
import { MODEL_PARAMS } from '@/lib/ml/constants';
import { TIER_CONFIG } from '@/lib/constants';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    await dbConnect();
    const userId = session.user.id;

    // Ensure the reliability data is fresh by running the update
    await updateStudentReliability(userId);

    const user = await User.findById(userId)
      .select('engagementTier reliabilityScore createdAt scoreHistory')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tier = (user as any).engagementTier ?? 'new';
    const score = (user as any).reliabilityScore;
    const retentionDays = MODEL_PARAMS.RETENTION_DAYS[tier] ?? 30;
    const metrics = await computeMetrics(userId, retentionDays);
    const benefits = getTierBenefits(tier);

    // What does the student need to do to improve?
    const championConf = TIER_CONFIG.champion;
    let improvementTip = '';
    if (tier === 'new') {
      const needed = championConf.minAttended - metrics.totalAttended;
      improvementTip = `Attend ${Math.max(needed, 1)} more event${needed > 1 ? 's' : ''} to unlock your reliability score.`;
    } else if (tier === 'regular') {
      const attendedNeeded = championConf.minAttended - metrics.totalAttended;
      if (attendedNeeded > 0) {
        improvementTip = `Attend ${attendedNeeded} more event${attendedNeeded > 1 ? 's' : ''} and maintain ${Math.round(championConf.minAttendanceRate * 100)}%+ attendance to reach Champion.`;
      } else {
        improvementTip = `Maintain ${Math.round(championConf.minAttendanceRate * 100)}%+ attendance rate to reach Champion status.`;
      }
    } else if (tier === 'unreliable') {
      improvementTip = 'Attend your next registered events to improve your score and restore full access.';
    } else if (tier === 'champion') {
      improvementTip = 'Champion status maintained. Keep attending events to stay at the top.';
    }

    return NextResponse.json({
      tier,
      score,
      scoreHistory: (user as any).scoreHistory?.slice(0, 5) ?? [],
      metrics: {
        totalRegistered: metrics.totalRegistrations,
        totalAttended: Math.round(metrics.attendanceRate * metrics.totalRegistrations),
        attendanceRate: Math.round(metrics.attendanceRate * 100),
        waitlistAbandonRate: Math.round(metrics.waitlistAbandonRate * 100),
        bulkRegistrationScore: metrics.bulkRegistrationScore,
      },
      benefits: {
        confirmationWindowHours: benefits.confirmationWindowHours,
        waitlistMultiplier: benefits.waitlistMultiplier,
        waitlistPenaltyHours: benefits.waitlistPenaltyHours,
      },
      modelActive: isReliabilityModelReady(),
      improvementTip,
    });
  } catch (err) {
    console.error('[GET /api/user/reliability]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
