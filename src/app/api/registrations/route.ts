import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Registration from '@/models/Registration'
import Event from '@/models/Event'
import { sendRegistrationEmail } from '@/lib/email'
import QRCode from 'qrcode'
import { format } from 'date-fns'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Login required' }, { status: 401 })

    const { eventId } = await req.json()
    await connectDB()

    const event = await Event.findById(eventId)
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    if (event.registeredCount >= event.capacity) {
      return NextResponse.json({ error: 'Event is full' }, { status: 400 })
    }

    const existing = await Registration.findOne({
      event: eventId,
      user: (session.user as any).id,
    })
    if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 409 })

    // Generate unique QR token
    const qrToken = crypto.randomBytes(32).toString('hex')
    const qrData = JSON.stringify({
      token: qrToken,
      eventId,
      userId: (session.user as any).id,
    })

    // Generate QR code image (data URL)
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: { dark: '#0a0f1e', light: '#ffffff' },
    })

    const registration = await Registration.create({
      event: eventId,
      user: (session.user as any).id,
      qrCode: qrToken,
    })

    // Update event count
    await Event.findByIdAndUpdate(eventId, { $inc: { registeredCount: 1 } })

    // Send confirmation email (non-blocking)
    sendRegistrationEmail({
      to: session.user!.email!,
      name: session.user!.name!,
      eventName: event.title,
      eventDate: format(new Date(event.date), 'PPP p'),
      eventVenue: event.venue,
      qrCodeDataUrl: qrCodeImage,
      registrationId: qrToken,
    }).catch(console.error)

    return NextResponse.json({
      message: 'Registered successfully!',
      qrCode: qrCodeImage,
      registrationId: registration._id,
    }, { status: 201 })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const registrations = await Registration.find({ user: (session.user as any).id })
      .populate('event')
      .sort({ registeredAt: -1 })

    return NextResponse.json({ registrations })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
