import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { initializePayment } from '@/lib/payment';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    await dbConnect();
    const { eventId, provider } = await req.json();

    if (!eventId || !provider) {
      return NextResponse.json({ error: 'eventId and provider required' }, { status: 400 });
    }

    if (!['esewa', 'khalti'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 });
    }

    const result = await initializePayment(session.user.id, eventId, provider);
    
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /payment/init]', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
