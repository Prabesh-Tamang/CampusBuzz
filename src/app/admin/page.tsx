'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  HiCalendar, HiUserGroup, HiClipboardCheck, HiTrendingUp,
  HiPlus, HiQrcode, HiCollection
} from 'react-icons/hi'

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="gradient-border p-6"
  >
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
      <Icon className="text-2xl text-white" />
    </div>
    <div className="font-display font-extrabold text-3xl text-white mb-1">{value}</div>
    <div className="text-gray-400 text-sm">{label}</div>
  </motion.div>
)

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [recentEvents, setRecentEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return }
    if (status === 'authenticated') {
      if ((session?.user as any)?.role !== 'admin') { router.push('/events'); return }
      fetch('/api/admin/stats')
        .then(r => r.json())
        .then(d => {
          setStats(d.stats)
          setRecentEvents(d.recentEvents || [])
          setLoading(false)
        })
    }
  }, [status])

  if (loading) return (
    <div className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-pulse-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen mesh-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-4xl mb-1">
              Admin <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-gray-400">Welcome back, {session?.user?.name} 👋</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/scanner" className="flex items-center gap-2 px-4 py-2.5 glass hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-all">
              <HiQrcode /> QR Scanner
            </Link>
            <Link href="/admin/events/new" className="flex items-center gap-2 px-4 py-2.5 bg-pulse-600 hover:bg-pulse-500 text-white rounded-xl text-sm font-semibold transition-all">
              <HiPlus /> New Event
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          <StatCard icon={HiCalendar} label="Total Events" value={stats?.totalEvents || 0} color="bg-pulse-600" />
          <StatCard icon={HiTrendingUp} label="Upcoming" value={stats?.upcomingEvents || 0} color="bg-green-600" />
          <StatCard icon={HiUserGroup} label="Students" value={stats?.totalUsers || 0} color="bg-purple-600" />
          <StatCard icon={HiCollection} label="Registrations" value={stats?.totalRegistrations || 0} color="bg-orange-600" />
          <StatCard icon={HiClipboardCheck} label="Checked In" value={stats?.checkedIn || 0} color="bg-teal-600" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { href: '/admin/events/new', icon: HiPlus, title: 'Create Event', desc: 'Add a new campus event', color: 'from-pulse-600 to-pulse-800' },
            { href: '/admin/scanner', icon: HiQrcode, title: 'QR Check-in', desc: 'Scan attendee QR codes', color: 'from-green-600 to-green-800' },
            { href: '/events', icon: HiCalendar, title: 'View Events', desc: 'Browse all events', color: 'from-purple-600 to-purple-800' },
          ].map(action => (
            <Link key={action.href} href={action.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`p-6 rounded-2xl bg-gradient-to-br ${action.color} cursor-pointer`}
              >
                <action.icon className="text-3xl text-white/80 mb-3" />
                <h3 className="font-display font-bold text-white text-lg">{action.title}</h3>
                <p className="text-white/60 text-sm">{action.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Recent Events */}
        <div className="gradient-border p-6">
          <h2 className="font-display font-bold text-xl mb-4">Recent Events</h2>
          {recentEvents.length === 0 ? (
            <p className="text-gray-400">No events yet. <Link href="/admin/events/new" className="text-pulse-400">Create one!</Link></p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event: any, i) => (
                <motion.div
                  key={event._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between p-4 bg-dark-card rounded-xl hover:bg-dark-border transition-colors"
                >
                  <div>
                    <h4 className="font-semibold text-white">{event.title}</h4>
                    <p className="text-sm text-gray-400">
                      {event.category} · {event.registeredCount}/{event.capacity} registered ·{' '}
                      {event.date ? format(new Date(event.date), 'MMM d') : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge text-xs ${
                      event.status === 'upcoming' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>{event.status}</span>
                    <Link href={`/events/${event._id}`} className="text-pulse-400 text-sm hover:text-pulse-300">
                      View →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
