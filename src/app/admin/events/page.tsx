'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, Plus, Edit2, Trash2, Eye, DollarSign, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import DeleteModal from '@/components/DeleteModal'

export default function AdminEventsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, itemId: '', itemName: '' })

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
      setEvents(d.recentEvents || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.itemId) return
    setDeletingId(deleteModal.itemId)
    try {
      const res = await fetch(`/api/events/${deleteModal.itemId}`, { method: 'DELETE' })
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

  const filtered = events.filter(e =>
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

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
            className="input pl-10 w-full max-w-sm"
          />
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[13px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Fee</th>
                  <th className="px-6 py-4">Registrations</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <Calendar size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="text-muted-foreground">No events found</p>
                      <Link href="/admin/events/new" className="btn-primary inline-flex items-center gap-2 mt-4">
                        <Plus size={16} /> Create Event
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filtered.map((event: any) => (
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
                      <td className="px-6 py-4">
                        {event.feeType === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-sm">
                            <DollarSign size={13} /> {event.feeAmount}
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
      />
    </div>
  )
}
