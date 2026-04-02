import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Registration from '@/models/Registration';
import Waitlist from '@/models/Waitlist';
import {
  joinWaitlist, leaveWaitlist, getPosition, getHeap
} from '@/lib/algorithms/waitlistManager';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  await connectDB();
  const { eventId } = await req.json();
  const userId = session.user.id;

  const event = await Event.findById(eventId);
  if (!event || !event.isActive)
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Paid events use "Notify Me" instead of waitlist
  if (event.feeType === 'paid')
    return NextResponse.json({ error: 'Paid events use the Notify Me system instead of waitlist' }, { status: 400 });

  if (event.registeredCount < event.capacity)
    return NextResponse.json({ error: 'Event has spots available — register directly' }, { status: 400 });

  const alreadyRegistered = await Registration.findOne({ userId, eventId });
  if (alreadyRegistered)
    return NextResponse.json({ error: 'Already registered for this event' }, { status: 409 });

  const alreadyWaitlisted = await Waitlist.findOne({ userId, eventId });
  if (alreadyWaitlisted)
    return NextResponse.json({ error: 'Already on waitlist' }, { status: 409 });

  const result = await joinWaitlist(userId, eventId);
  return NextResponse.json(result, { status: 201 });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

  const userId = session.user.id;
  const position = await getPosition(userId, eventId);
  if (position === -1)
    return NextResponse.json({ error: 'Not on waitlist' }, { status: 404 });

  const heap = await getHeap(eventId);
  return NextResponse.json({ position, queueLength: heap.size() });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  await connectDB();
  const { eventId } = await req.json();
  const userId = session.user.id;

  const entry = await Waitlist.findOne({ userId, eventId });
  if (!entry) return NextResponse.json({ error: 'Not on waitlist' }, { status: 404 });

  await leaveWaitlist(userId, eventId);
  return NextResponse.json({ success: true });
}
