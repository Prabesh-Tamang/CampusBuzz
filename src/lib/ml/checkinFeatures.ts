import Registration from '@/models/Registration';

export interface CheckinContext {
  userId: string;
  eventId: string;
  eventCategory: string;
  eventDate: Date;
  registrationCreatedAt: Date;
  checkinTime: Date;
}

export async function extractFeatures(ctx: CheckinContext): Promise<number[]> {
  const {
    userId, eventId, eventCategory,
    eventDate, registrationCreatedAt, checkinTime
  } = ctx;

  const hourOfDay = checkinTime.getHours();

  const daysSinceReg =
    (checkinTime.getTime() - registrationCreatedAt.getTime()) / 86_400_000;

  const totalRegistrations = await Registration.countDocuments({ userId });

  const totalCheckins = await Registration.countDocuments({ userId, checkedIn: true });
  const checkinRate = totalRegistrations > 0 ? totalCheckins / totalRegistrations : 0;

  const minutesRelativeToStart =
    (checkinTime.getTime() - eventDate.getTime()) / 60_000;

  const sameCategoryEvents = await Registration.aggregate([
    { $match: { userId, checkedIn: true } },
    { $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'event' } },
    { $unwind: '$event' },
    { $match: { 'event.category': eventCategory } },
    { $count: 'count' },
  ]);
  const sameCategoryCount = sameCategoryEvents[0]?.count ?? 0;

  return [
    hourOfDay,
    daysSinceReg,
    totalRegistrations,
    checkinRate,
    minutesRelativeToStart,
    sameCategoryCount,
  ];
}
