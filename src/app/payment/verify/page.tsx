'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { HiCheckCircle, HiArrowRight, HiXCircle } from 'react-icons/hi'

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const eventName = searchParams.get('event')
  
  useEffect(() => {
    const pidx = searchParams.get('pidx')
    let provider = searchParams.get('provider') || (pidx ? 'khalti' : searchParams.get('data') ? 'esewa' : null)
    let data = searchParams.get('data')
    const status = searchParams.get('status')
    const purchase_order_id = searchParams.get('purchase_order_id')
    const transaction_id = searchParams.get('transaction_id')
    const tidx = searchParams.get('tidx')

    // Workaround for eSewa broken query params (e.g. ?provider=esewa?data=...)
    if (provider && provider.includes('esewa?data=')) {
      data = provider.split('esewa?data=')[1];
      provider = 'esewa';
    } else if (provider && provider.includes('?data=')) {
      data = provider.split('?data=')[1];
      provider = 'esewa';
    }

    if (!provider) {
      if (searchParams.get('payment') === 'success') {
        setSuccess(true)
        setLoading(false)
      } else {
        setErrorMsg('Invalid payment verification parameters.')
        setLoading(false)
      }
      return
    }

    const payload = provider === 'khalti' 
      ? { provider, pidx, status, purchase_order_id, transaction_id, tidx }
      : { provider, data }

    fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
         setSuccess(true)
      } else {
         setErrorMsg(resData.error || 'Payment verification failed.')
      }
    })
    .catch(err => {
      setErrorMsg('An error occurred during verification.')
      console.error(err)
    })
    .finally(() => {
      setLoading(false)
    })

  }, [searchParams])

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
          
          {success ? (
            <>
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
            </>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <HiXCircle className="w-20 h-20 text-red-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Payment Failed</h1>
              <p className="text-gray-400 mb-8">
                {errorMsg || 'We could not verify your payment. Please try again.'}
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 bg-slate-600 hover:bg-slate-500"
              >
                Try Again <HiArrowRight />
              </Link>
            </>
          )}

          <div className="mt-6">
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
