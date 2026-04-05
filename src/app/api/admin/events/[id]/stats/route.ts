import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';
import Payment from '@/models/Payment';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const eventId = params.id;

    const registrations = await Registration.find({ eventId });
    const totalRegistrations = registrations.length;
    const checkIns = registrations.filter(r => r.checkedIn).length;
    const anomalyCount = registrations.filter(r => r.flagged).length;

    const payments = await Payment.find({ eventId, status: 'completed' });
    const revenue = payments.reduce((acc, p) => acc + p.amount, 0);

    return NextResponse.json({
      totalRegistrations,
      checkIns,
      revenue,
      anomalyCount
    });
  } catch (err) {
    console.error('[API /admin/events/[id]/stats]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
