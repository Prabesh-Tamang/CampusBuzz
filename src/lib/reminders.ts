import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Registration from '@/models/Registration';

export async function autoTriggerConfirmations(): Promise<void> {
  try {
    await connectDB();
    const now = new Date();
    const windowStart = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000);

    const events = await Event.find({
      isActive: true,
      isCancelled: { $ne: true },
      date: { $gte: windowStart, $lte: windowEnd },
    }).select('_id').lean();

    if (events.length === 0) return;

    for (const event of events) {
      const evt = event as { _id: import('mongoose').Types.ObjectId };
      const pendingCount = await Registration.countDocuments({
        eventId: evt._id,
        confirmed: false,
        confirmationEmailSent: false,
      });

      if (pendingCount === 0) continue;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      await fetch(`${appUrl}/api/admin/run-confirmations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: evt._id.toString(),
          force: false,
          _autoTriggered: true,
        }),
      }).catch(err => console.error('[AutoConfirm] Trigger failed:', err));

      console.log(`[AutoConfirm] Triggered for event ${evt._id} (${pendingCount} pending)`);
    }
  } catch (err) {
    console.error('[AutoConfirm] Failed:', err);
  }
}

export async function sendPendingReminders(): Promise<void> {
  try {
    // Placeholder for future reminder logic
  } catch (err) {
    console.error('[Reminders] Failed:', err);
  }
}
