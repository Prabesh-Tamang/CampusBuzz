'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { HiCalendar, HiLocationMarker, HiCheckCircle, HiClock } from 'react-icons/hi'
import toast from 'react-hot-toast'

export default function MyEventsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MyEventsContent />
    </Suspense>
  )
}

function MyEventsContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    const confirm = searchParams.get('confirm')
    if (confirm === 'success') toast.success('Attendance confirmed! Your QR code has been sent to your email.')
    else if (confirm === 'invalid') toast.error('Invalid or expired confirmation link.')
    else if (confirm === 'already') toast('Already confirmed!', { icon: '✅' })
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return }
    if (status === 'authenticated') {
      fetch('/api/registrations')
        .then(r => r.json())
        .then(d => { setRegistrations(d.registrations || []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [status])

  // Confirm attendance directly from the dashboard
  async function handleConfirm(registrationId: string, regDbId: string) {
    setConfirming(regDbId)
    try {
      const res = await fetch('/api/confirm-attendance/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Update local state — mark as confirmed and set QR
      setRegistrations(prev => prev.map(r =>
        r._id === regDbId ? { ...r, confirmed: true, qrCode: data.qrCode } : r
      ))
      toast.success('Attendance confirmed! Your QR code is ready.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm')
    } finally {
      setConfirming(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen grid-bg">
        <Navbar />
        <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 card rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-display font-extrabold text-4xl">
              My <span className="text-accent">Events</span>
            </h1>
            <span className="text-sm text-gray-500">{registrations.length} registration{registrations.length !== 1 ? 's' : ''}</span>
          </div>
          <p className="text-gray-400 mb-8">Your registered events and entry tickets</p>

          {registrations.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎫</div>
              <h3 className="font-display font-bold text-2xl mb-2">No registrations yet</h3>
              <p className="text-gray-400 mb-6">Browse events and register to see them here</p>
              <button onClick={() => router.push('/events')} className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold transition-colors">
                Browse Events
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {registrations.map((reg: any, i: number) => {
                const isPending = !reg.confirmed && !reg.checkedIn && !reg.paymentId
                const hasConfirmToken = !!reg.confirmToken // token was sent = confirmation window is open

                return (
                  <motion.div
                    key={reg._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="card p-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Title + badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-bold text-xl text-white">{reg.eventId?.title || 'Event'}</h3>
                          {reg.checkedIn && (
                            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                              <HiCheckCircle /> Checked In
                            </span>
                          )}
                          {isPending && (
                            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full">
                              <HiClock /> Pending Confirmation
                            </span>
                          )}
                          {reg.confirmed && !reg.checkedIn && (
                            <span className="flex items-center gap-1 text-xs text-teal-400 bg-teal-500/20 px-2 py-1 rounded-full">
                              <HiCheckCircle /> Confirmed
                            </span>
                          )}
                          {reg.paymentId && !reg.checkedIn && (
                            <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
                              💳 Paid
                            </span>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <HiCalendar className="text-teal-400" />
                            {reg.eventId?.date ? format(new Date(reg.eventId.date), 'MMM d, yyyy') : 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <HiLocationMarker className="text-teal-400" />
                            {reg.eventId?.venue || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <HiClock className="text-teal-400" />
                            Registered {format(new Date(reg.createdAt), 'MMM d')}
                          </span>
                        </div>

                        {/* Registration ID */}
                        {reg.registrationId && (
                          <div className="mt-2">
                            <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: 'rgba(20,184,166,0.1)', color: '#14b8a6', border: '1px solid rgba(20,184,166,0.2)' }}>
                              🎫 {reg.registrationId}
                            </span>
                          </div>
                        )}

                        {/* Consequence warning for pending confirmation */}
                        {isPending && (
                          <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <p className="text-amber-400 font-semibold mb-1">⚠️ Confirmation required</p>
                            <p className="text-gray-400">
                              You must confirm your attendance before the event. If you don't confirm, your spot will be automatically released to the next student on the waitlist 2 hours before the event starts.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {reg.qrCode ? (
                          <button
                            onClick={() => setShowQR(showQR === reg._id ? null : reg._id)}
                            className="px-5 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-xl text-sm font-semibold transition-all"
                          >
                            {showQR === reg._id ? 'Hide QR' : '📱 Show QR'}
                          </button>
                        ) : isPending ? (
                          <button
                            onClick={() => handleConfirm(reg.registrationId, reg._id)}
                            disabled={confirming === reg._id}
                            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                          >
                            {confirming === reg._id ? (
                              <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Confirming...</>
                            ) : (
                              <>✅ Confirm Attendance</>
                            )}
                          </button>
                        ) : (
                          <span className="px-4 py-2 text-xs text-gray-500 bg-gray-500/10 border border-gray-500/20 rounded-xl block text-center">
                            QR after confirmation
                          </span>
                        )}
                      </div>
                    </div>

                    {/* QR expanded */}
                    {showQR === reg._id && reg.qrCode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-4 border-t border-border flex flex-col items-center"
                      >
                        <p className="text-gray-400 text-sm mb-4">Show this QR code at the event entrance</p>
                        <div className="bg-white rounded-2xl p-4 inline-block">
                          <img src={reg.qrCode} alt="QR Code" className="w-48 h-48" />
                        </div>
                        <p className="text-xs text-gray-500 mt-3">Registration ID: {reg.registrationId}</p>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
