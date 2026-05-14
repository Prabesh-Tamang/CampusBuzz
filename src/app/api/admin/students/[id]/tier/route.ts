import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { updateStudentReliability } from '@/lib/ml/reliabilityScoring';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tier } = await req.json();
    const validTiers = ['champion', 'regular', 'new', 'unreliable'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier. Must be one of: champion, regular, new, unreliable' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findByIdAndUpdate(
      params.id,
      { engagementTier: tier },
      { new: true, select: 'name email engagementTier reliabilityScore' }
    ).lean();

    if (!user) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    void updateStudentReliability(params.id).catch(err =>
      console.error('[Reliability] Update after admin tier override failed:', err)
    );

    return NextResponse.json({
      success: true,
      user: {
        id: (user as any)._id.toString(),
        name: (user as any).name,
        email: (user as any).email,
        tier: (user as any).engagementTier,
        score: (user as any).reliabilityScore,
      },
    });
  } catch (err) {
    console.error('[PUT /api/admin/students/[id]/tier]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
