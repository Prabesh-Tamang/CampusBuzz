'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { HiCalendar, HiLocationMarker, HiCheckCircle, HiClock } from 'react-icons/hi'
import toast from 'react-hot-toast'

interface WaitlistEntry {
  eventId: string;
  position: number;
  queueLength: number;
  event?: {
    title: string;
    date: string;
    venue: string;
  };
}

export default function MyEventsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [registrations, setRegistrations] = useState([])
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'registered' | 'waitlisted'>('registered')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
    if (status === 'authenticated') {
      fetch('/api/registrations')
        .then(r => r.json())
        .then(d => { setRegistrations(d.registrations || []); setLoading(false) })
    }
  }, [status])

  useEffect(() => {
    if (status === 'authenticated' && activeTab === 'waitlisted') {
      fetch('/api/registrations')
        .then(r => r.json())
        .then(async (d) => {
          const regs = d.registrations || []
          const waitlistPromises = regs
            .filter((r: any) => {
              const ev = r.eventId
              return ev && ev.registeredCount >= ev.capacity
            })
            .map(async (r: any) => {
              const eventId = typeof r.eventId === 'object' ? r.eventId._id : r.eventId
              const posRes = await fetch(`/api/waitlist?eventId=${eventId}`)
              if (posRes.ok) {
                const posData = await posRes.json()
                return {
                  eventId,
                  position: posData.position,
                  queueLength: posData.queueLength,
                  event: typeof r.eventId === 'object' ? r.eventId : null,
                }
              }
              return null
            })
          const results = await Promise.all(waitlistPromises)
          setWaitlistEntries(results.filter(Boolean))
        })
    }
  }, [status, activeTab])

  async function handleLeaveWaitlist(eventId: string) {
    try {
      const res = await fetch('/api/waitlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setWaitlistEntries(prev => prev.filter(w => w.eventId !== eventId))
      toast.success('Left the waitlist')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to leave waitlist')
    }
  }

  return (
    <div className="min-h-screen grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display font-extrabold text-4xl mb-2">
            My <span className="gradient-text">Events</span>
          </h1>
          <p className="text-gray-400 mb-8">Your registered events and tickets</p>

          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab('registered')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'registered'
                  ? 'bg-pulse-600 text-white'
                  : 'glass hover:bg-pulse-600/20 text-gray-400'
              }`}
            >
              Registered ({registrations.length})
            </button>
            <button
              onClick={() => setActiveTab('waitlisted')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'waitlisted'
                  ? 'bg-pulse-600 text-white'
                  : 'glass hover:bg-pulse-600/20 text-gray-400'
              }`}
            >
              Waitlisted ({waitlistEntries.length})
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 glass rounded-2xl animate-pulse" />)}
            </div>
          ) : activeTab === 'registered' ? (
            registrations.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎫</div>
                <h3 className="font-display font-bold text-2xl mb-2">No registrations yet</h3>
                <p className="text-gray-400 mb-6">Browse events and register to see them here</p>
                <button onClick={() => router.push('/events')} className="px-6 py-3 bg-pulse-600 text-white rounded-xl font-semibold">
                  Browse Events
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {registrations.map((reg: any, i) => (
                  <motion.div
                    key={reg._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="gradient-border p-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-display font-bold text-xl text-white">{reg.event?.title}</h3>
                          {reg.checkedIn && (
                            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                              <HiCheckCircle /> Checked In
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <HiCalendar className="text-pulse-400" />
                            {reg.event?.date ? format(new Date(reg.event.date), 'MMM d, yyyy') : 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <HiLocationMarker className="text-pulse-400" />
                            {reg.event?.venue}
                          </span>
                          <span className="flex items-center gap-1">
                            <HiClock className="text-pulse-400" />
                            Registered {format(new Date(reg.createdAt), 'MMM d')}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowQR(showQR === reg._id ? null : reg._id)}
                        className="px-5 py-2.5 glass hover:bg-pulse-600/20 text-pulse-300 rounded-xl text-sm font-semibold transition-all border border-pulse-800/50 flex-shrink-0"
                      >
                        {showQR === reg._id ? 'Hide' : '📱 Show QR'}
                      </button>
                    </div>

                    {showQR === reg._id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-4 border-t border-dark-border flex flex-col items-center"
                      >
                        <p className="text-gray-400 text-sm mb-4">Show this QR code at the event entrance</p>
                        <div className="bg-white rounded-2xl p-4">
                          <img src={reg.qrCode} alt="QR Code" className="w-48 h-48" />
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {waitlistEntries.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">⏳</div>
                  <h3 className="font-display font-bold text-2xl mb-2">No waitlist entries</h3>
                  <p className="text-gray-400 mb-6">Join a waitlist when events are full</p>
                </div>
              ) : (
                waitlistEntries.map((entry: WaitlistEntry, i) => (
                  <motion.div
                    key={entry.eventId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="gradient-border p-6"
                    data-testid="waitlisted-event"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-display font-bold text-xl text-white">{entry.event?.title || 'Event'}</h3>
                          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full">
                            <HiClock /> Waitlisted
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                          {entry.event?.date && (
                            <span className="flex items-center gap-1">
                              <HiCalendar className="text-pulse-400" />
                              {format(new Date(entry.event.date), 'MMM d, yyyy')}
                            </span>
                          )}
                          {entry.event?.venue && (
                            <span className="flex items-center gap-1">
                              <HiLocationMarker className="text-pulse-400" />
                              {entry.event.venue}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <HiClock className="text-pulse-400" />
                            #{entry.position} of {entry.queueLength} in waitlist
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleLeaveWaitlist(entry.eventId)}
                        className="px-5 py-2.5 glass hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold transition-all border border-red-800/50 flex-shrink-0"
                      >
                        Leave Waitlist
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
