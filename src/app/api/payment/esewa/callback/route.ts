import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import { completeRegistration } from '@/lib/payment';
import crypto from 'crypto';

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '';
const ESEWA_MERCHANT_ID = process.env.ESEWA_MERCHANT_ID || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function verifyEsewaSignature(data: string, receivedSignature: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', ESEWA_SECRET_KEY);
    hmac.update(data);
    const expected = hmac.digest('base64');
    return expected === receivedSignature;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // eSewa v2 returns a base64-encoded JSON in the 'data' param on success
    const encodedData = searchParams.get('data');

    await dbConnect();

    if (!encodedData) {
      return NextResponse.redirect(new URL('/payment/failed?reason=No+data+received', APP_URL));
    }

    // Decode the base64 response
    let esewaData: any;
    try {
      esewaData = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.redirect(new URL('/payment/failed?reason=Invalid+response', APP_URL));
    }

    const { status, transaction_uuid, total_amount, transaction_code, signed_field_names, signature } = esewaData;

    // Verify signature
    if (signed_field_names && signature) {
      const fields = signed_field_names.split(',');
      const message = fields.map((f: string) => `${f}=${esewaData[f]}`).join(',');
      if (!verifyEsewaSignature(message, signature)) {
        return NextResponse.redirect(new URL('/payment/failed?reason=Signature+mismatch', APP_URL));
      }
    }

    if (status !== 'COMPLETE') {
      const payment = await Payment.findOne({ purchaseOrderId: transaction_uuid });
      if (payment) await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
      return NextResponse.redirect(new URL(`/payment/failed?reason=${encodeURIComponent(status || 'Payment failed')}`, APP_URL));
    }

    // Find payment by purchaseOrderId (= transaction_uuid we sent)
    const payment = await Payment.findOne({ purchaseOrderId: transaction_uuid });
    if (!payment) {
      return NextResponse.redirect(new URL('/payment/failed?reason=Payment+not+found', APP_URL));
    }

    if (payment.status === 'completed') {
      return NextResponse.redirect(new URL('/my-events?payment=success', APP_URL));
    }

    // Mark completed
    await Payment.findByIdAndUpdate(payment._id, {
      status: 'completed',
      transactionId: transaction_code || transaction_uuid,
      metadata: esewaData,
    });

    await completeRegistration(
      payment._id.toString(),
      payment.userId.toString(),
      payment.eventId.toString()
    );

    return NextResponse.redirect(new URL('/my-events?payment=success', APP_URL));
  } catch (err) {
    console.error('[eSewa callback]', err);
    return NextResponse.redirect(new URL('/payment/failed?reason=Server+error', APP_URL));
  }
}
