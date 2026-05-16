import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Registration from '@/models/Registration';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const tab = req.nextUrl.searchParams.get('tab') || 'pending';

  let query;
  if (tab === 'history') {
    query = { flagged: true, reviewStatus: { $in: ['approved', 'denied'] } };
  } else {
    query = {
      flagged: true,
      $or: [
        { reviewStatus: 'pending' },
        { reviewStatus: { $exists: false } },
      ],
    };
  }

  const flagged = await Registration.find(query)
    .populate('userId', 'name email college')
    .populate('eventId', 'title date venue category')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ flagged, total: flagged.length });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const { registrationId, action, adminNote } = await req.json();

  if (action === 'approve') {
    await Registration.findOneAndUpdate(
      { registrationId },
      {
        checkedIn: true,
        checkedInAt: new Date(),
        flagged: false,
        adminOverride: true,
        reviewStatus: 'approved',
        reviewedBy: (session.user as { id: string }).id,
        reviewedAt: new Date(),
      }
    );
    return NextResponse.json({ success: true, action: 'approved' });
  }

  if (action === 'deny') {
    await Registration.findOneAndUpdate(
      { registrationId },
      {
        checkedIn: false,
        flagged: true,
        adminOverride: false,
        reviewStatus: 'denied',
        adminNote: adminNote || 'Contact the event organiser',
        reviewedBy: (session.user as { id: string }).id,
        reviewedAt: new Date(),
      }
    );
    return NextResponse.json({ success: true, action: 'denied' });
  }

  if (action === 'reinstate') {
    await Registration.findOneAndUpdate(
      { registrationId },
      {
        reviewStatus: 'pending',
        flagged: true,
        checkedIn: false,
        adminOverride: false,
        $unset: { adminNote: '', reviewedBy: '', reviewedAt: '' },
      }
    );
    return NextResponse.json({ success: true, action: 'reinstated' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
