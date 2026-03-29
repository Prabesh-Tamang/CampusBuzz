import Payment from '@/models/Payment';
import User from '@/models/User';
import Event from '@/models/Event';
import Registration from '@/models/Registration';
import mongoose from 'mongoose';
import crypto from 'crypto';

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || '';
const KHALTI_API_URL = process.env.KHALTI_API_URL || 'https://dev.khalti.com/api/v2';
const KHALTI_VERIFY_URL = 'https://dev.khalti.com/api/v2/epayment/lookup/';

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '';
const ESEWA_MERCHANT_ID = process.env.ESEWA_MERCHANT_ID || '';
const ESEWA_API_URL = process.env.ESEWA_API_URL || 'https://uat.esewa.com.np';

export interface PaymentInitResult {
  success: boolean;
  paymentId: string;
  amount: number;
  productIdentity: string;
  productName: string;
  provider: 'esewa' | 'khalti';
  khaltiConfig?: {
    publicKey: string;
    amount: number;
    productIdentity: string;
    productName: string;
    productUrl: string;
    additionalData: Record<string, any>;
  };
  esewaConfig?: {
    amount: number;
    taxAmount: number;
    totalAmount: number;
    productIdentity: string;
    productName: string;
    merchantId: string;
    merchantSecret: string;
    merchantCallbackUrl: string;
  };
}

export async function initializePayment(
  userId: string,
  eventId: string,
  provider: 'esewa' | 'khalti'
): Promise<PaymentInitResult> {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');
  
  if (event.feeType !== 'paid') throw new Error('Event is free');
  
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const amount = event.feeAmount;
  const purchaseOrderId = `PO-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const purchaseOrderName = `Registration: ${event.title}`;

  const payment = await Payment.create({
    userId,
    eventId,
    amount,
    provider,
    transactionId: '',
    status: 'pending',
    purchaseOrderId,
    purchaseOrderName,
    metadata: { userEmail: user.email },
  });

  if (provider === 'khalti') {
    return {
      success: true,
      paymentId: payment._id.toString(),
      amount,
      productIdentity: purchaseOrderId,
      productName: purchaseOrderName,
      provider: 'khalti',
      khaltiConfig: {
        publicKey: process.env.KHALTI_PUBLIC_KEY || '',
        amount: amount * 100,
        productIdentity: purchaseOrderId,
        productName: purchaseOrderName,
        productUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${eventId}`,
        additionalData: {
          productDetails: {
            identity: purchaseOrderId,
            name: purchaseOrderName,
            total_amount: amount * 100,
          },
        },
      },
    };
  } else {
    const totalAmount = amount;
    const taxAmount = 0;
    const serviceCharge = 0;
    const productAmount = totalAmount - taxAmount - serviceCharge;
    const signature = generateEsewaSignature(productAmount.toString(), purchaseOrderId);

    return {
      success: true,
      paymentId: payment._id.toString(),
      amount,
      productIdentity: purchaseOrderId,
      productName: purchaseOrderName,
      provider: 'esewa',
      esewaConfig: {
        amount: productAmount,
        taxAmount,
        totalAmount,
        productIdentity: purchaseOrderId,
        productName: purchaseOrderName,
        merchantId: ESEWA_MERCHANT_ID,
        merchantSecret: ESEWA_SECRET_KEY,
        merchantCallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/esewa/callback`,
      },
    };
  }
}

function generateEsewaSignature(amount: string, productIdentity: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(`${ESEWA_MERCHANT_ID}|${productIdentity}|${amount}|${ESEWA_SECRET_KEY}|${ESEWA_SECRET_KEY}`);
  return hash.digest('base64');
}

export async function verifyKhaltiPayment(pidx: string, transactionId: string, amount: number): Promise<boolean> {
  try {
    const response = await fetch(KHALTI_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idx: pidx,
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    
    if (data.status !== 'Completed') return false;
    if (data.amount !== amount) return false;

    await Payment.findOneAndUpdate(
      { purchaseOrderId: data.purchase_order_id },
      {
        status: 'completed',
        transactionId: data.idx,
        metadata: data,
      }
    );

    return true;
  } catch (error) {
    console.error('[Payment] Khalti verification failed:', error);
    return false;
  }
}

export async function verifyEsewaPayment(
  refId: string,
  purchaseOrderId: string,
  amount: string
): Promise<boolean> {
  try {
    const response = await fetch(`${ESEWA_API_URL}/epay/transaction/status/?`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const params = new URLSearchParams({
      merchantId: ESEWA_MERCHANT_ID,
      scd: 'EPAYTEST',
      rid: refId,
      prn: purchaseOrderId,
    });

    const verifyResponse = await fetch(`${ESEWA_API_URL}/epay/transaction/status/?${params}`);
    const data = await verifyResponse.json();

    if (data.status !== 'Complete') return false;

    await Payment.findOneAndUpdate(
      { purchaseOrderId },
      {
        status: 'completed',
        transactionId: data.refId,
        metadata: data,
      }
    );

    return true;
  } catch (error) {
    console.error('[Payment] eSewa verification failed:', error);
    return false;
  }
}

export async function completeRegistration(paymentId: string, userId: string, eventId: string): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== 'completed') {
      throw new Error('Payment not completed');
    }

    const event = await Event.findById(eventId).session(session);
    if (!event || event.registeredCount >= event.capacity) {
      throw new Error('Event is full');
    }

    const registrationId = `CP-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const QRCode = await import('qrcode');
    const qrData = JSON.stringify({ registrationId, eventId, userId });
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    const registration = await Registration.create([{
      userId,
      eventId,
      registrationId,
      qrCode,
      checkedIn: false,
      paymentId: payment._id,
    }], { session });

    await Event.findByIdAndUpdate(
      eventId,
      { $inc: { registeredCount: 1 } },
      { session }
    );

    await Payment.findByIdAndUpdate(paymentId, {
      registrationId: registration[0]._id,
    }, { session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function getPaymentHistory(userId: string) {
  return Payment.find({ userId })
    .populate('eventId', 'title date venue')
    .sort({ createdAt: -1 })
    .lean();
}

export async function getPaymentById(paymentId: string) {
  return Payment.findById(paymentId)
    .populate('eventId', 'title date venue')
    .populate('userId', 'name email');
}
