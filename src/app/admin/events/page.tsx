'use client'
import { useState, useEffect, useLayoutEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, Plus, Edit2, Trash2, Eye, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import DeleteModal from '@/components/DeleteModal'
import { cacheGet, cacheSet } from '@/lib/client-cache'

export default function AdminEventsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDate, setFilterDate] = useState('all')
  const [filterFee, setFilterFee] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, itemId: '', itemName: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterDate, filterFee, filterStatus])

  // Hydrate from cache on mount
  useLayoutEffect(() => {
    const cached = cacheGet<any[]>('admin_events')
    if (cached) { setEvents(cached); setLoading(false) }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/admin/login'); return }
    if (status === 'authenticated') {
      if ((session?.user as any)?.role !== 'admin') { router.push('/events'); return }
      fetchEvents()
    }
  }, [status, session])

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const d = await res.json()
      const data = d.recentEvents || []
      setEvents(data)
      cacheSet('admin_events', data, 30_000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (cancelReason?: string) => {
    if (!deleteModal.itemId) return
    setDeletingId(deleteModal.itemId)
    try {
      const res = await fetch(`/api/events/${deleteModal.itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Event cancelled successfully')
      setDeleteModal({ isOpen: false, itemId: '', itemName: '' })
      fetchEvents()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = events.filter(e => {
    const q = search.toLowerCase()
    return (
      e.title?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.venue?.toLowerCase().includes(q)
    )
  }).filter(e => {
    if (filterDate !== 'all') {
      const isPast = new Date(e.date) < new Date()
      if (filterDate === 'upcoming' && isPast) return false
      if (filterDate === 'past' && !isPast) return false
    }
    if (filterFee !== 'all') {
      if (filterFee === 'free' && e.feeType !== 'free') return false
      if (filterFee === 'paid' && e.feeType !== 'paid') return false
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'cancelled' && !e.isCancelled) return false
      if (filterStatus === 'hidden' && e.isActive !== false) return false
      if (filterStatus === 'active' && (e.isCancelled || e.isActive === false)) return false
    }
    return true
  })

  if (loading) return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-9 bg-surface2 animate-pulse rounded-lg" />
              <div className="w-20 h-9 bg-surface2/50 animate-pulse rounded-lg" />
            </div>
            <div className="w-28 h-4 bg-surface2 animate-pulse rounded mt-2" />
          </div>
          <div className="w-28 h-10 bg-surface2 animate-pulse rounded-lg" />
        </div>
        <div className="w-full max-w-sm h-11 bg-surface2 animate-pulse rounded-xl mb-6" />
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="w-24 h-8 bg-surface2/50 animate-pulse rounded-lg" />
          <div className="w-24 h-8 bg-surface2/50 animate-pulse rounded-lg" />
          <div className="w-24 h-8 bg-surface2/50 animate-pulse rounded-lg" />
        </div>
        <div className="bg-[#0d1f1e] rounded-2xl overflow-hidden">
          <div className="h-[52px] bg-[#142826] flex items-center px-6 gap-6">
            <div className="w-20 h-4 bg-surface2/50 animate-pulse rounded" />
            <div className="w-16 h-4 bg-surface2/50 animate-pulse rounded" />
            <div className="w-20 h-4 bg-surface2/50 animate-pulse rounded" />
            <div className="w-12 h-4 bg-surface2/50 animate-pulse rounded" />
            <div className="w-24 h-4 bg-surface2/50 animate-pulse rounded" />
            <div className="w-14 h-4 bg-surface2/50 animate-pulse rounded" />
            <div className="w-14 h-4 bg-surface2/50 animate-pulse rounded ml-auto" />
          </div>
          {[1,2,3,4].map(i => (
            <div key={i} className="px-6 py-4 flex items-center gap-6 border-t border-[#1e3a38]">
              <div className="flex items-center gap-3 w-[200px] flex-shrink-0">
                <div className="w-9 h-9 rounded-lg bg-surface2/60 animate-pulse flex-shrink-0" />
                <div className="space-y-2">
                  <div className="w-28 h-3.5 bg-surface2/50 animate-pulse rounded" />
                  <div className="w-16 h-3 bg-surface2/30 animate-pulse rounded" />
                </div>
              </div>
              <div className="w-20 h-3.5 bg-surface2/50 animate-pulse rounded" />
              <div className="w-24 h-3.5 bg-surface2/50 animate-pulse rounded" />
              <div className="w-14 h-5 bg-surface2/50 animate-pulse rounded-full" />
              <div className="w-20 h-3.5 bg-surface2/50 animate-pulse rounded" />
              <div className="w-16 h-5 bg-surface2/50 animate-pulse rounded-full" />
              <div className="flex gap-2 ml-auto">
                <div className="w-8 h-8 bg-surface2/50 animate-pulse rounded-lg" />
                <div className="w-8 h-8 bg-surface2/50 animate-pulse rounded-lg" />
                <div className="w-8 h-8 bg-surface2/50 animate-pulse rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentEvents = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[clamp(24px,4vw,36px)] font-extrabold tracking-tighter text-white">
              All <span className="text-accent">Events</span>
            </h1>
            <p className="text-muted-foreground mt-1">{events.length} total events</p>
          </div>
          <Link href="/admin/events/new" className="btn-primary flex items-center gap-2 self-start sm:self-auto">
            <Plus size={16} /> New Event
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full max-w-sm pl-11"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-surface border border-border rounded-lg p-2 mb-6">
          <div className="flex items-center gap-2 pl-2 border-r border-border pr-3">
            <Filter size={16} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">Filters</span>
          </div>
          <select
            className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
            value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
          >
            <option value="all" className="bg-surface">All Dates</option>
            <option value="upcoming" className="bg-surface">Upcoming</option>
            <option value="past" className="bg-surface">Past</option>
          </select>
          <select
            className="bg-transparent text-sm text-white focus:outline-none cursor-pointer border-l border-border pl-3"
            value={filterFee} onChange={(e) => setFilterFee(e.target.value)}
          >
            <option value="all" className="bg-surface">Any Fee</option>
            <option value="free" className="bg-surface">Free</option>
            <option value="paid" className="bg-surface">Paid</option>
          </select>
          <select
            className="bg-transparent text-sm text-white focus:outline-none cursor-pointer border-l border-border pl-3"
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all" className="bg-surface">Any Status</option>
            <option value="active" className="bg-surface">Active</option>
            <option value="cancelled" className="bg-surface">Cancelled</option>
            <option value="hidden" className="bg-surface">Hidden</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-left text-[13px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Venue</th>
                  <th className="px-6 py-4">Fee</th>
                  <th className="px-6 py-4">Registrations</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Calendar size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="text-muted-foreground">No events found</p>
                      <Link href="/admin/events/new" className="btn-primary inline-flex items-center gap-2 mt-4">
                        <Plus size={16} /> Create Event
                      </Link>
                    </td>
                  </tr>
                ) : (
                  currentEvents.map((event: any) => (
                    <tr key={event._id} className="hover:bg-surface2 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                            <Calendar size={16} className="text-teal-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{event.title}</p>
                            <p className="text-sm text-muted-foreground">{event.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {event.date ? format(new Date(event.date), 'MMM d, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground max-w-[160px] truncate">
                        {event.venue || '—'}
                      </td>
                      <td className="px-6 py-4">
                        {event.feeType === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-sm">
                            Rs. {event.feeAmount}
                            {/* <DollarSign size={13} /> {event.feeAmount} */}
                          </span>
                        ) : (
                          <span className="text-green-400 text-sm">Free</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-surface2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                event.registeredCount >= event.capacity ? 'bg-red-500' :
                                event.registeredCount >= event.capacity * 0.8 ? 'bg-amber-500' : 'bg-teal-500'
                              }`}
                              style={{ width: `${Math.min((event.registeredCount / event.capacity) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{event.registeredCount}/{event.capacity}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          event.isCancelled ? 'bg-red-500/20 text-red-400' :
                          event.isActive === false ? 'bg-gray-500/20 text-gray-400' :
                          new Date(event.date) > new Date() ? 'bg-green-500/20 text-green-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {event.isCancelled ? 'Cancelled' : event.isActive === false ? 'Hidden' :
                           new Date(event.date) > new Date() ? 'Upcoming' : 'Past'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/events/${event._id}/view`}
                            className="p-2 text-muted-foreground hover:text-white hover:bg-surface rounded-lg transition-all" title="View">
                            <Eye size={16} />
                          </Link>
                          <Link href={`/admin/events/${event._id}/edit`}
                            className="p-2 text-muted-foreground hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-all" title="Edit">
                            <Edit2 size={16} />
                          </Link>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, itemId: event._id, itemName: event.title })}
                            disabled={deletingId === event._id}
                            className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50" title="Cancel">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-6 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} events
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-surface border border-border text-white hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${
                        currentPage === i + 1 
                          ? 'bg-teal-500 text-[#042f2e]' 
                          : 'text-muted-foreground hover:bg-surface2 hover:text-white'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-surface border border-border text-white hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, itemId: '', itemName: '' })}
        onConfirm={handleDelete}
        title="Cancel Event"
        itemName={deleteModal.itemName}
        loading={deletingId === deleteModal.itemId}
        deleteText="Cancel Event"
        showReasonInput
      />
    </div>
  )
}
