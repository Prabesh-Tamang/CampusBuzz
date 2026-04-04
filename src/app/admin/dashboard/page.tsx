'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Calendar, QrCode, Plus, AlertTriangle, Edit2, Trash2, Eye, 
  Users, CheckCircle, TrendingUp, Clock, DollarSign, IndianRupeeIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import DeleteModal from '@/components/DeleteModal'

const CHART_COLORS = ['#14b8a6', '#f43f5e', '#f59e0b', '#a78bfa', '#3b82f6', '#ef4444', '#6b7280']

interface Stats {
  totalEvents: number
  upcomingEvents: number
  totalUsers: number
  totalRegistrations: number
  checkedInCount: number
  recentEvents: any[]
}

interface Analytics {
  registrationsTrend: any[]
  categoryBreakdown: any[]
  checkinsByCategory: any[]
  popularEvents: any[]
  recentRegistrations: number
  recentCheckins: number
  checkinRate: number
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [stats, setStats] = useState<Stats | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [flaggedCount, setFlaggedCount] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; title: string; itemId: string; itemName: string }>({
    isOpen: false,
    title: 'Delete Event',
    itemId: '',
    itemName: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return }
    if (status === 'authenticated') {
      if ((session?.user as any)?.role !== 'admin') { router.push('/events'); return }
      fetchStats()
      fetchAnalytics()
      fetchFlaggedCount()
    }
  }, [status, session])

  useEffect(() => {
    if (pathname === '/admin/dashboard') {
      fetchFlaggedCount()
    }
  }, [pathname])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const d = await res.json()
      setStats(d)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics')
      if (res.ok) {
        const d = await res.json()
        setAnalytics(d)
      }
    } catch {}
  }

  const fetchFlaggedCount = async () => {
    try {
      const res = await fetch('/api/admin/flagged')
      const d = await res.json()
      setFlaggedCount(d.total || 0)
    } catch {}
  }

  const runConfirmations = async (force = false) => {
    try {
      const res = await fetch('/api/admin/run-confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const d = await res.json()
      if (d.message) {
        toast(d.message, { icon: 'ℹ️' })
      } else {
        toast.success(`${force ? '[Force] ' : ''}Emails: ${d.confirmEmailsSent} sent, ${d.cancelledCount} cancelled, ${d.promotedCount} promoted`)
      }
    } catch {
      toast.error('Failed to run confirmations')
    }
  }

  const openDeleteModal = (eventId: string, eventTitle: string) => {
    setDeleteModal({ isOpen: true, title: 'Delete Event', itemId: eventId, itemName: eventTitle })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, title: 'Delete Event', itemId: '', itemName: '' })
  }

  const handleDelete = async () => {
    if (!deleteModal.itemId) return
    setDeletingId(deleteModal.itemId)
    try {
      const res = await fetch(`/api/events/${deleteModal.itemId}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(d.softDeleted ? 'Event hidden from users' : 'Event deleted')
      closeDeleteModal()
      fetchStats()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const checkinRate = stats?.totalRegistrations 
    ? Math.round((stats.checkedInCount / stats.totalRegistrations) * 100) 
    : 0

  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-tighter text-white">
              Admin <span className="text-accent">Dashboard</span>
            </h1>
            <p className="text-muted-foreground mt-1">Welcome back, {session?.user?.name}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/events/new" className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New Event
            </Link>
            <Link href="/admin/scanner" className="btn-ghost flex items-center gap-2">
              <QrCode size={16} /> Scanner
            </Link>
            <Link href="/admin/flagged" className="btn-ghost flex items-center gap-2 relative">
              <AlertTriangle size={16} /> Flagged
              {flaggedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{flaggedCount}</span>
              )}
            </Link>
            <button onClick={runConfirmations} className="btn-ghost flex items-center gap-2 text-amber-400 hover:text-amber-300">
              <Clock size={16} /> Run Confirmations
            </button>
            <button onClick={() => runConfirmations(true)} className="btn-ghost flex items-center gap-2 text-orange-400 hover:text-orange-300 text-xs">
              <Clock size={14} /> Force Send All
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          <div className="card p-5 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <Calendar size={18} className="text-teal-400" />
              </div>
              <span className="text-sm text-muted-foreground">Total Events</span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-auto">{stats?.totalEvents || 0}</div>
          </div>
          <div className="card p-5 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Clock size={18} className="text-green-400" />
              </div>
              <span className="text-sm text-muted-foreground">Upcoming</span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-auto">{stats?.upcomingEvents || 0}</div>
          </div>
          <div className="card p-5 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Users size={18} className="text-purple-400" />
              </div>
              <span className="text-sm text-muted-foreground">Students</span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-auto">{stats?.totalUsers || 0}</div>
          </div>
          <div className="card p-5 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Edit2 size={18} className="text-amber-400" />
              </div>
              <span className="text-sm text-muted-foreground">Registrations</span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-auto">{stats?.totalRegistrations || 0}</div>
          </div>
          <div className="card p-5 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={18} className="text-emerald-400" />
              </div>
              <span className="text-sm text-muted-foreground">Checked In</span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-auto">{stats?.checkedInCount || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">{checkinRate}% rate</div>
          </div>
        </div>

        {/* Charts */}
        {analytics && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Registration Trend */}
              <div className="card p-6">
                <h3 className="font-bold text-white mb-4">Registrations (Last 30 Days)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.registrationsTrend}>
                      <defs>
                        <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="registrations" stroke="#14b8a6" fill="url(#colorReg)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="card p-6">
                <h3 className="font-bold text-white mb-4">Events by Category</h3>
                <div className="h-64 flex items-center">
                  <ResponsiveContainer width="60%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="category"
                      >
                        {analytics.categoryBreakdown.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-[40%] space-y-2">
                    {analytics.categoryBreakdown.map((cat: any, i: number) => (
                      <div key={cat.category} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.fill || CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-muted-foreground flex-1">{cat.category}</span>
                        <span className="text-white">{cat.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Check-ins by Category */}
              <div className="card p-6">
                <h3 className="font-bold text-white mb-4">Check-ins by Category</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.checkinsByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis type="number" stroke="#6b7280" fontSize={11} />
                      <YAxis dataKey="category" type="category" stroke="#6b7280" fontSize={11} width={70} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {analytics.checkinsByCategory.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Events */}
              <div className="card p-6">
                <h3 className="font-bold text-white mb-4">Top Events by Registrations</h3>
                <div className="h-56 space-y-4">
                  {analytics.popularEvents.map((event: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div className="flex-1">
                        <div className="text-sm text-white truncate">{event.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-500 rounded-full"
                              style={{ width: `${event.fillRate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{event.registrations}/{event.capacity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {analytics.popularEvents.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-8">No events yet</p>
                  )}
                </div>
              </div>

              {/* Quick Stats & Check-in Rate */}
              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="font-bold text-white mb-4">Activity (Last 7 Days)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-surface2 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Users size={16} className="text-purple-400" />
                        </div>
                        <span className="text-sm text-muted-foreground">New Registrations</span>
                      </div>
                      <span className="text-xl font-bold text-white">{analytics.recentRegistrations}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface2 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <CheckCircle size={16} className="text-green-400" />
                        </div>
                        <span className="text-sm text-muted-foreground">Check-ins</span>
                      </div>
                      <span className="text-xl font-bold text-white">{analytics.recentCheckins}</span>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="font-bold text-white mb-4 text-center">Overall Check-in Rate</h3>
                  <div className="flex items-center justify-center h-32">
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="56" cy="56" r="48" stroke="#1f2937" strokeWidth="8" fill="none" />
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          stroke="#14b8a6"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${analytics.checkinRate * 3.02} 302`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">{analytics.checkinRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* All Events Table */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">All Events</h2>
            <span className="text-sm text-muted-foreground">{stats?.recentEvents?.length || 0} events</span>
          </div>
          {!stats?.recentEvents?.length ? (
            <div className="text-center py-12">
              <Calendar size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No events yet.</p>
              <Link href="/admin/events/new" className="btn-primary inline-flex items-center gap-2">
                <Plus size={16} /> Create Event
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[13px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="pb-3">Event</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Fee</th>
                    <th className="pb-3">Registrations</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recentEvents.map((event: any) => (
                    <tr key={event._id} className="text-muted-foreground hover:bg-surface2 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          {event.imageUrl ? (
                            <img src={event.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                              <Calendar size={18} className="text-teal-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white">{event.title}</p>
                            <p className="text-sm">{event.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm">
                        {event.date ? format(new Date(event.date), 'MMM d, yyyy') : 'N/A'}
                      </td>
                      <td className="py-4">
                        {event.feeType === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            Rs. {event.feeAmount} 
                          </span>
                        ) : (
                          <span className="text-green-400">Free</span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-surface2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                event.registeredCount >= event.capacity ? 'bg-red-500' :
                                event.registeredCount >= event.capacity * 0.8 ? 'bg-amber-500' :
                                'bg-teal-500'
                              }`}
                              style={{ width: `${Math.min((event.registeredCount / event.capacity) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">
                            {event.registeredCount}/{event.capacity}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          event.isActive === false ? 'bg-gray-500/20 text-gray-400' :
                          new Date(event.date) > new Date() ? 'bg-green-500/20 text-green-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {event.isActive === false ? 'Hidden' :
                           new Date(event.date) > new Date() ? 'Upcoming' : 'Past'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/events/${event._id}/view`}
                            className="p-2 text-muted-foreground hover:text-white hover:bg-surface rounded-lg transition-all"
                            title="View"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            href={`/admin/events/${event._id}/edit`}
                            className="p-2 text-muted-foreground hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </Link>
                          <button
                            onClick={() => openDeleteModal(event._id, event.title)}
                            disabled={deletingId === event._id}
                            className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={deleteModal.title}
        itemName={deleteModal.itemName}
        loading={deletingId === deleteModal.itemId}
      />
    </div>
  )
}
