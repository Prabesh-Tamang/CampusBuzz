import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Event from '@/models/Event';
import Registration from '@/models/Registration';
import EventInterest from '@/models/EventInterest';

// POST — express interest in a paid full event ("Notify Me")
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  await dbConnect();
  const { eventId } = await req.json();
  const userId = session.user.id;

  const event: any = await Event.findById(eventId).lean();
  if (!event || !event.isActive)
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (event.feeType !== 'paid')
    return NextResponse.json({ error: 'Notify Me is only for paid events' }, { status: 400 });

  if (event.registeredCount < event.capacity)
    return NextResponse.json({ error: 'Event has spots — register directly' }, { status: 400 });

  const alreadyRegistered = await Registration.findOne({ userId, eventId }).lean();
  if (alreadyRegistered)
    return NextResponse.json({ error: 'Already registered' }, { status: 409 });

  const alreadyInterested = await EventInterest.findOne({ userId, eventId }).lean();
  if (alreadyInterested)
    return NextResponse.json({ error: 'Already on notify list' }, { status: 409 });

  await EventInterest.create({ eventId, userId });
  return NextResponse.json({ success: true }, { status: 201 });
}

// GET — check if current user is on notify list for an event
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ interested: false });

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

  const interest = await EventInterest.findOne({ userId: session.user.id, eventId }).lean();
  const count = await EventInterest.countDocuments({ eventId });
  return NextResponse.json({ interested: !!interest, count });
}

// DELETE — remove interest
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  await dbConnect();
  const { eventId } = await req.json();
  await EventInterest.deleteOne({ userId: session.user.id, eventId });
  return NextResponse.json({ success: true });
}
