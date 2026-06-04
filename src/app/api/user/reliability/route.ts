import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import {
  computeMetrics,
  getTierBenefits,
  isReliabilityModelReady,
} from '@/lib/ml/reliabilityScoring';
import { MODEL_PARAMS } from '@/lib/ml/constants';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    await connectDB();
    const userId = session.user.id;

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
    let improvementTip = '';
    if (tier === 'unreliable') {
      if (metrics.attendanceRate < 0.25) {
        const needed = Math.ceil(metrics.totalRegistrations * 0.25) - Math.round(metrics.attendanceRate * metrics.totalRegistrations);
        improvementTip = `Attend your next ${Math.max(needed, 1)} registered event${needed > 1 ? 's' : ''} to reach Regular status.`;
      } else if (metrics.waitlistAbandonRate >= 0.5) {
        improvementTip = 'Keep your next waitlist spot when promoted to improve your score.';
      } else {
        improvementTip = 'Reduce the number of unconfirmed registrations you hold at once.';
      }
    } else if (tier === 'regular') {
      const needed = Math.ceil(metrics.totalRegistrations * 0.70) - Math.round(metrics.attendanceRate * metrics.totalRegistrations);
      improvementTip = needed > 0
        ? `Attend ${needed} more event${needed > 1 ? 's' : ''} to reach Champion status.`
        : 'Maintain your attendance rate to reach Champion status.';
    } else if (tier === 'new') {
      const attended = Math.round(metrics.attendanceRate * metrics.totalRegistrations);
      const remaining = Math.max(3 - attended, 1);
      improvementTip = `Attend ${remaining} more event${remaining > 1 ? 's' : ''} to unlock your reliability score.`;
    } else if (tier === 'champion') {
      improvementTip = 'Keep it up! Maintain your attendance rate to stay Champion.';
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
