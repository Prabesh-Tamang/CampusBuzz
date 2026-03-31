'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { HiCheckCircle, HiArrowRight } from 'react-icons/hi'

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)

  const eventName = searchParams.get('event')
  const payment = searchParams.get('payment')

  useEffect(() => {
    // eSewa redirects here with ?payment=success after server-side verification
    // Khalti is verified client-side via the PaymentModal before redirect
    const timer = setTimeout(() => {
      if (payment === 'success') {
        setSuccess(true)
      }
      setLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [payment])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: '#14b8a6', borderTopColor: 'transparent' }} />
          <p className="text-gray-400 text-lg">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f172a' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full text-center"
      >
        <div className="rounded-2xl p-8 border"
          style={{ background: '#1e293b', borderColor: '#334155' }}>
          <div className="flex justify-center mb-6">
            <HiCheckCircle className="w-20 h-20" style={{ color: '#14b8a6' }} />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>

          {eventName && (
            <p className="text-gray-300 mb-2">
              You&apos;re registered for <span className="font-semibold" style={{ color: '#14b8a6' }}>{eventName}</span>
            </p>
          )}

          <p className="text-gray-400 mb-8">
            Your registration is confirmed. Check your email for the QR code ticket.
          </p>

          <Link
            href="/my-events"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
            style={{ background: '#14b8a6' }}
          >
            View My Events <HiArrowRight />
          </Link>

          <div className="mt-4">
            <Link href="/events" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">
              Browse more events
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#14b8a6', borderTopColor: 'transparent' }} />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
