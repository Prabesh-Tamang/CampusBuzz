import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import { verifyKhaltiPayment, completeRegistration } from '@/lib/payment';
import { sendRegistrationEmail } from '@/lib/email';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    await dbConnect();
    const { paymentId, pidx, transactionId, amount, userId, eventId } = await req.json();

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'completed') {
      return NextResponse.json({ success: true, message: 'Payment already verified' });
    }

    const verified = await verifyKhaltiPayment(pidx, transactionId, amount);
    
    if (!verified) {
      await Payment.findByIdAndUpdate(paymentId, { status: 'failed' });
      return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 400 });
    }

    await completeRegistration(paymentId, userId, eventId);

    const Event = (await import('@/models/Event')).default;
    const event = await Event.findById(eventId);
    const user = await (await import('@/models/User')).default.findById(userId);
    const updatedPayment = await Payment.findById(paymentId).populate('registrationId');

    if (user && event && updatedPayment.registrationId) {
      const registration = updatedPayment.registrationId as any;
      void sendRegistrationEmail({
        to: user.email,
        name: user.name,
        eventName: event.title,
        eventDate: format(event.date, 'PPP'),
        eventVenue: event.venue,
        qrCodeDataUrl: registration.qrCode,
        registrationId: registration.registrationId,
      }).catch(err => console.error('[Email] Failed:', err));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API /payment/khalti/verify]', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
