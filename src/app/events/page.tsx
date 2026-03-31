'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Navbar from '@/components/Navbar'
import { Search, Calendar, MapPin, Users, DollarSign, Filter, Ticket, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const categories = ['All', 'Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other']

interface Event {
  _id: string
  title: string
  description: string
  category: string
  date: string
  venue: string
  capacity: number
  registeredCount: number
  feeType: 'free' | 'paid'
  feeAmount: number
}

interface Registration {
  _id: string
  eventId: Event
  registrationId: string
  checkedIn: boolean
  createdAt: string
}

interface Recommendation {
  event: Event
  score: number
  reason: string
}

export default function EventsPage() {
  const { data: session } = useSession()
  const [events, setEvents] = useState<Event[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [feeFilter, setFeeFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [showEnded, setShowEnded] = useState(false)

  useEffect(() => {
    fetchEvents()
    if (session) {
      fetch('/api/recommendations')
        .then(r => r.json())
        .then(d => {
          if (d.recommendations) setRecommendations(d.recommendations)
        })
        .catch(() => {})
      fetchRegistrations()
    }
  }, [session, search, category, feeFilter, showEnded])

  async function fetchRegistrations() {
    try {
      const res = await fetch('/api/registrations')
      const data = await res.json()
      if (data.registrations && Array.isArray(data.registrations)) {
        setRegistrations(data.registrations)
      }
    } catch {}
  }

  async function fetchEvents() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category !== 'All') params.set('category', category)

    const res = await fetch(`/api/events?${params}`)
    const data = await res.json()
    const allEvents: Event[] = Array.isArray(data) ? data : []
    
    const now = new Date()
    let filtered = allEvents
    
    if (!showEnded) {
      filtered = filtered.filter(e => new Date(e.date) >= now)
    }
    
    if (feeFilter === 'free') {
      filtered = filtered.filter(e => e.feeType === 'free')
    } else if (feeFilter === 'paid') {
      filtered = filtered.filter(e => e.feeType === 'paid')
    }
    
    const sorted = filtered
      .sort((a, b) => {
        const aEnded = new Date(a.date) < now
        const bEnded = new Date(b.date) < now
        if (aEnded !== bEnded) return aEnded ? 1 : -1
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })
    
    setEvents(sorted)
    setLoading(false)
  }

  const getSpots = (e: Event) => e.capacity - e.registeredCount
  const isEnded = (e: Event) => new Date(e.date) < new Date()

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-[clamp(32px,5vw,48px)] font-extrabold tracking-tighter text-white mb-3">
                All Events
              </h1>
              <p className="text-muted-foreground">
                Browse and register for upcoming campus activities.
              </p>
            </div>

            {/* Recommendations Strip */}
            {session && (session.user as { role?: string })?.role !== 'admin' && recommendations.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                  Recommended for you
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {recommendations.map(({ event: recEvent, reason }) => (
                    <Link
                      key={recEvent._id}
                      href={`/events/${recEvent._id}`}
                      className="card flex-shrink-0 w-72 p-5 cursor-pointer relative"
                      data-testid="event-card"
                    >
                      <div className="absolute top-3 right-3 opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-xs bg-black/60 text-white px-2 py-1 rounded">
                          {reason}
                        </span>
                      </div>
                      <div className="mb-3">
                        <span className={`badge cat-${recEvent.category}`}>
                          {recEvent.category}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mb-3 line-clamp-2">
                        {recEvent.title}
                      </h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-accent" />
                          {format(new Date(recEvent.date), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-accent" />
                          {recEvent.venue}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, venue or description..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-4 mb-8">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter size={14} />
                  <span>Category:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                        category === cat
                          ? 'bg-accent text-[#042f2e] border-accent'
                          : 'text-gray-400 border-border hover:text-white hover:border-gray-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign size={14} />
                  <span>Fee:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFeeFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                      feeFilter === 'all'
                        ? 'bg-gray-600 text-white border-gray-600'
                        : 'text-gray-400 border-border hover:text-white hover:border-gray-400'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFeeFilter('free')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                      feeFilter === 'free'
                        ? 'bg-green-500/20 text-green-400 border-green-500'
                        : 'text-gray-400 border-border hover:text-white hover:border-gray-400'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    onClick={() => setFeeFilter('paid')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                      feeFilter === 'paid'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                        : 'text-gray-400 border-border hover:text-white hover:border-gray-400'
                    }`}
                  >
                    Paid
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEnded(!showEnded)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                      showEnded
                        ? 'bg-gray-600 text-white border-gray-600'
                        : 'text-gray-400 border-border hover:text-white hover:border-gray-400'
                    }`}
                  >
                    Show Ended
                  </button>
                </div>
              </div>
            </div>

            {/* Events Grid */}
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="card overflow-hidden animate-pulse">
                    <div className="h-36 bg-surface2" />
                    <div className="p-5">
                      <div className="h-6 w-3/4 bg-surface2 rounded mb-3" />
                      <div className="h-4 w-full bg-surface2 rounded mb-2" />
                      <div className="h-4 w-2/3 bg-surface2 rounded mb-4" />
                      <div className="h-4 w-1/2 bg-surface2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-muted-foreground">No events found.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {events.map(event => (
                  <Link key={event._id} href={`/events/${event._id}`} className="flex">
                    <div className="card p-0 cursor-pointer overflow-hidden group flex flex-col w-full">
                      {/* Header Banner */}
                      <div 
                        className="h-36 relative flex-shrink-0"
                        style={{
                          background: event.category === 'Technical' ? 'linear-gradient(135deg, #14b8a6, #0d9488)' :
                                     event.category === 'Cultural' ? 'linear-gradient(135deg, #f43f5e, #e11d48)' :
                                     event.category === 'Sports' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                                     event.category === 'Workshop' ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' :
                                     event.category === 'Seminar' ? 'linear-gradient(135deg, #fb923c, #ea580c)' :
                                     event.category === 'Hackathon' ? 'linear-gradient(135deg, #ec4899, #db2777)' :
                                     'linear-gradient(135deg, #60a5fa, #2563eb)'
                        }}
                      >
                        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                          <span className="badge bg-white/20 text-white backdrop-blur-sm">
                            {event.category}
                          </span>
                          {event.feeType === 'paid' ? (
                            <span className="badge bg-amber-500/40 text-amber-300 backdrop-blur-sm">
                              Rs. {event.feeAmount}
                            </span>
                          ) : (
                            <span className="badge bg-green-500/40 text-green-300 backdrop-blur-sm">
                              Free
                            </span>
                          )}
                        </div>
                        <div className="absolute top-3 right-3 flex gap-2 flex-wrap">
                          {isEnded(event) && (
                            <span className="badge bg-gray-500/40 text-gray-300 backdrop-blur-sm">ENDED</span>
                          )}
                          {getSpots(event) <= 10 && getSpots(event) > 0 && (
                            <span className="badge bg-amber-500/20 text-amber-400 backdrop-blur-sm">
                              {getSpots(event)} left!
                            </span>
                          )}
                          {getSpots(event) <= 0 && (
                            <span className="badge bg-gray-500/20 text-gray-300 backdrop-blur-sm">FULL</span>
                          )}
                        </div>
                      </div>

                      {/* Content — flex-1 so all cards stretch to same height */}
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent transition-colors line-clamp-2 min-h-[3.5rem]">
                          {event.title}
                        </h3>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                          {event.description}
                        </p>

                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-accent flex-shrink-0" />
                            <span className="truncate">{format(new Date(event.date), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-accent flex-shrink-0" />
                            <span className="truncate">{event.venue}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-accent flex-shrink-0" />
                            <span>{event.registeredCount}/{event.capacity} registered</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                getSpots(event) <= 0 ? 'bg-red-500' :
                                (event.registeredCount / event.capacity) > 0.8 ? 'bg-amber-500' : 'bg-accent'
                              }`}
                              style={{ width: `${Math.min((event.registeredCount / event.capacity) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - User Registration History */}
          {session && (session.user as { role?: string })?.role !== 'admin' && (
            <aside className="w-full lg:w-80 flex-shrink-0">
              <div className="card p-5 sticky top-24">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                      <Ticket size={18} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">My Registrations</h3>
                      <p className="text-xs text-muted-foreground">{registrations.length} events</p>
                    </div>
                  </div>
                </div>

                {registrations.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket size={32} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">No registrations yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Browse events to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {registrations.slice(0, 10).map(reg => (
                      <Link
                        key={reg._id}
                        href={`/events/${reg.eventId?._id}`}
                        className="block p-3 bg-surface2 rounded-lg hover:bg-dark-border transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate group-hover:text-accent transition-colors">
                              {reg.eventId?.title || 'Event'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                reg.checkedIn 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {reg.checkedIn ? 'Checked In' : 'Registered'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(reg.eventId?.date || reg.createdAt), 'MMM d')}
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-muted-foreground mt-1 flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                    
                    {registrations.length > 10 && (
                      <Link
                        href="/my-registrations"
                        className="block text-center py-2 text-sm text-accent hover:text-accent/80 transition-colors"
                      >
                        View all {registrations.length} registrations
                      </Link>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-border">
                  <Link
                    href="/my-payments"
                    className="flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-white transition-colors"
                  >
                    <DollarSign size={14} />
                    View Payment History
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>

      </div>
    </div>
  )
}