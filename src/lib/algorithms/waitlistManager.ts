import { MinHeap } from './minHeap';
import Waitlist from '@/models/Waitlist';
import Registration from '@/models/Registration';
import Event from '@/models/Event';
import User from '@/models/User';
import mongoose from 'mongoose';
import { sendPromotionEmail } from '@/lib/email';
import crypto from 'crypto';

export interface WaitlistEntry {
  userId: string;
  eventId: string;
  priorityScore: number;
  joinedAt: Date;
}

const heaps = new Map<string, MinHeap<WaitlistEntry>>();

const comparator = (a: WaitlistEntry, b: WaitlistEntry) =>
  a.priorityScore - b.priorityScore;

export async function computePriorityScore(
  userId: string,
  joinedAt: Date
): Promise<number> {
  const attendanceBonus = await Registration.countDocuments({
    userId,
    checkedIn: true,
  });
  return joinedAt.getTime() - attendanceBonus * 3_600_000;
}

export async function buildHeap(eventId: string): Promise<MinHeap<WaitlistEntry>> {
  const entries = await Waitlist.find({ eventId })
    .sort({ priorityScore: 1 })
    .lean();

  const heap = new MinHeap<WaitlistEntry>(comparator);
  entries.forEach(e =>
    heap.insert({
      userId: e.userId.toString(),
      eventId: e.eventId.toString(),
      priorityScore: e.priorityScore,
      joinedAt: e.joinedAt,
    })
  );

  heaps.set(eventId, heap);
  return heap;
}

export async function getHeap(eventId: string): Promise<MinHeap<WaitlistEntry>> {
  if (!heaps.has(eventId)) {
    return buildHeap(eventId);
  }
  return heaps.get(eventId)!;
}

export function invalidateHeap(eventId: string): void {
  heaps.delete(eventId);
}

export async function joinWaitlist(
  userId: string,
  eventId: string
): Promise<{ position: number; priorityScore: number; queueLength: number }> {
  const joinedAt = new Date();
  const priorityScore = await computePriorityScore(userId, joinedAt);

  await Waitlist.create({ eventId, userId, priorityScore, joinedAt });

  const heap = await getHeap(eventId);
  heap.insert({ userId, eventId, priorityScore, joinedAt });

  const position = await getPosition(userId, eventId);
  return { position, priorityScore, queueLength: heap.size() };
}

export async function leaveWaitlist(
  userId: string,
  eventId: string
): Promise<void> {
  await Waitlist.deleteOne({ userId, eventId });
  invalidateHeap(eventId);
}

export async function getPosition(
  userId: string,
  eventId: string
): Promise<number> {
  const userEntry = await Waitlist.findOne({ userId, eventId });
  if (!userEntry) return -1;

  const position = await Waitlist.countDocuments({
    eventId,
    priorityScore: { $lt: userEntry.priorityScore },
  });

  return position + 1;
}

export async function promoteTopWaitlistUser(eventId: string): Promise<void> {
  const heap = await getHeap(eventId);
  if (heap.isEmpty()) return;

  const top = heap.extractMin();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Waitlist.deleteOne({ userId: top.userId, eventId }, { session });

    const registrationId = `CP-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const QRCode = await import('qrcode');
    const qrData = JSON.stringify({ registrationId, eventId, userId: top.userId });
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 300, margin: 2, errorCorrectionLevel: 'H',
    });

    await Registration.create([{
      userId: top.userId,
      eventId,
      registrationId,
      qrCode,
      checkedIn: false,
    }], { session });

    await Event.findByIdAndUpdate(
      eventId,
      { $inc: { registeredCount: 1 } },
      { session }
    );

    await session.commitTransaction();

    const user = await User.findById(top.userId).select('email name');
    const event = await Event.findById(eventId).select('title date venue');
    if (user && event) {
      void sendPromotionEmail({
        to: user.email,
        name: user.name,
        eventName: event.title,
        eventDate: event.date.toISOString(),
        eventVenue: event.venue,
        qrCodeDataUrl: qrCode,
        registrationId,
      }).catch(err => console.error('[Waitlist] Promotion email failed:', err));
    }
  } catch (err) {
    await session.abortTransaction();
    heap.insert(top);
    throw err;
  } finally {
    session.endSession();
  }
}
