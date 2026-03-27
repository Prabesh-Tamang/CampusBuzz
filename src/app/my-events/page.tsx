'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { HiCalendar, HiLocationMarker, HiCheckCircle, HiClock } from 'react-icons/hi'

export default function MyEventsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
    if (status === 'authenticated') {
      fetch('/api/registrations')
        .then(r => r.json())
        .then(d => { setRegistrations(d.registrations || []); setLoading(false) })
    }
  }, [status])

  return (
    <div className="min-h-screen mesh-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display font-extrabold text-4xl mb-2">
            My <span className="gradient-text">Events</span>
          </h1>
          <p className="text-gray-400 mb-8">Your registered events and tickets</p>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 glass rounded-2xl animate-pulse" />)}
            </div>
          ) : registrations.length === 0 ? (
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
                          Registered {format(new Date(reg.registeredAt), 'MMM d')}
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
                        <div className="w-48 h-48 flex items-center justify-center text-gray-800 text-xs text-center p-4">
                          <div>
                            <div className="text-4xl mb-2">📱</div>
                            QR Token: {reg.qrCode?.slice(0, 16)}...
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
