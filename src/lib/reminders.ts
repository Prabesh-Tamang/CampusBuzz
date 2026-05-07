import Registration from '@/models/Registration';
import Event from '@/models/Event';
import User from '@/models/User';
import { sendEventReminderEmail } from './email';

// Track reminded registrations in memory to prevent duplicates
// Resets on server restart — worst case student gets 2 reminders, acceptable
const remindedSet = new Set<string>();

export async function sendPendingReminders(): Promise<void> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcomingEvents = await Event.find({
      isActive: true,
      isCancelled: { $ne: true },
      date: { $gte: windowStart, $lte: windowEnd },
    }).select('_id title date venue').lean();

    if (upcomingEvents.length === 0) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    for (const event of upcomingEvents) {
      const registrations = await Registration.find({
        eventId: event._id,
        confirmed: true,
        qrCode: { $ne: '' },
        checkedIn: false,
      }).select('_id registrationId userId qrCode').lean();

      for (const reg of registrations) {
        const key = `${(reg._id as any).toString()}-24h-reminder`;
        if (remindedSet.has(key)) continue;

        const user = await User.findById(reg.userId)
          .select('email name').lean();
        if (!user) continue;

        remindedSet.add(key);

        void sendEventReminderEmail({
          to: (user as any).email,
          name: (user as any).name,
          eventName: (event as any).title,
          eventDate: new Date((event as any).date).toLocaleDateString('en-NP', {
            dateStyle: 'full',
          } as any),
          eventVenue: (event as any).venue,
          qrCodeDataUrl: (reg as any).qrCode,
          registrationId: (reg as any).registrationId,
          eventUrl: `${appUrl}/events/${(event._id as any).toString()}`,
        }).catch(err =>
          console.error('[Reminder] Email failed for', (reg as any).registrationId, err)
        );
      }
    }
  } catch (err) {
    console.error('[Reminders] sendPendingReminders failed:', err);
  }
}
