import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import { verifyEsewaPayment, completeRegistration } from '@/lib/payment';
import { sendRegistrationEmail } from '@/lib/email';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const refId = searchParams.get('refId');
    const purchaseOrderId = searchParams.get('purchase_order_id');
    const amount = searchParams.get('total_amount');
    const status = searchParams.get('status');

    await dbConnect();

    if (status !== 'success') {
      return NextResponse.redirect(new URL(`/events?payment=failed&message=Payment+failed`, req.url));
    }

    const payment = await Payment.findOne({ purchaseOrderId });
    if (!payment) {
      return NextResponse.redirect(new URL(`/events?payment=failed&message=Payment+not+found`, req.url));
    }

    if (payment.status === 'completed') {
      return NextResponse.redirect(new URL(`/my-events?payment=success`, req.url));
    }

    const verified = await verifyEsewaPayment(
      refId || '',
      purchaseOrderId || '',
      amount || '0'
    );

    if (!verified) {
      await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
      return NextResponse.redirect(new URL(`/events?payment=failed&message=Verification+failed`, req.url));
    }

    await completeRegistration(payment._id.toString(), payment.userId.toString(), payment.eventId.toString());

    const Event = (await import('@/models/Event')).default;
    const User = (await import('@/models/User')).default;
    const event = await Event.findById(payment.eventId);
    const user = await User.findById(payment.userId);
    const updatedPayment = await Payment.findById(payment._id).populate('registrationId');

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

    return NextResponse.redirect(new URL(`/my-events?payment=success`, req.url));
  } catch (err) {
    console.error('[API /payment/esewa/callback]', err);
    return NextResponse.redirect(new URL(`/events?payment=failed&message=Server+error`, req.url));
  }
}
