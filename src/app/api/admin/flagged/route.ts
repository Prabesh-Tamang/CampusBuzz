import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Registration from '@/models/Registration';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const flagged = await Registration.find({ flagged: true })
    .populate('userId', 'name email college')
    .populate('eventId', 'title date venue category')
    .sort({ anomalyScore: -1 })
    .lean();

  return NextResponse.json({ flagged, total: flagged.length });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { registrationId } = await req.json();

  await Registration.findOneAndUpdate(
    { registrationId },
    {
      checkedIn: true,
      checkedInAt: new Date(),
      flagged: false,
      adminOverride: true,
    }
  );

  return NextResponse.json({ success: true });
}
