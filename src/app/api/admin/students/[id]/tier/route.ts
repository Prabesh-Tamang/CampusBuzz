import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const { tier, note } = await req.json();

    if (!['champion', 'regular', 'new', 'unreliable'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    let score: number | null;
    if (tier === 'new') {
      score = null;
    } else if (tier === 'champion') {
      score = 85;
    } else if (tier === 'regular') {
      score = 55;
    } else {
      score = 20;
    }

    await User.findByIdAndUpdate(params.id, {
      engagementTier: tier,
      reliabilityScore: score,
      $push: {
        scoreHistory: {
          $each: [{
            score: score ?? 0,
            tier,
            reason: note?.trim() || `Admin override — tier set to ${tier}`,
            changedAt: new Date(),
          }],
          $position: 0,
          $slice: 20,
        },
      },
    });

    return NextResponse.json({ success: true, tier, score });
  } catch (err) {
    console.error('[POST /api/admin/students/[id]/tier]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
